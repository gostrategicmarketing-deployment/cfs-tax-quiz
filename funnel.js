/* ============================================================================
 * FUNNEL ENGINE
 *
 * Renders itself from window.FUNNEL (funnel.config.js). Nothing client-specific
 * belongs in this file. If you are editing here to change a headline, a question,
 * or a destination, it belongs in the config instead.
 *
 * Adapted 2026-09-24 from the quiz-booking-funnel template for a qualify-and-
 * redirect flow: the template's inline Calendly embed and rep-routing layer are
 * gone (GHL's round-robin calendar on the destination page does the routing).
 * On submit the engine scores the answers with CFG.qualify, posts the lead to a
 * GHL Inbound Webhook, then sends the visitor to one of two pages.
 *
 * Load order: funnel.config.js, then this.
 * ==========================================================================*/
(function () {
  'use strict';

  var CFG = window.FUNNEL;
  if (!CFG) { console.error('[funnel] funnel.config.js did not load.'); return; }

  var answers = {};        // flat, keyed by question `q` plus a few derived keys
  var at = 0;              // current slide index
  var slides = [];         // static snapshot, see show()
  var submitted = false;   // one-way latch, set AFTER validation passes

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function V(id) { var e = $(id); return e ? (e.value || '').trim() : ''; }

  /* ==========================================================================
   * 1. TRACKING PARAMETERS
   *
   * Captured once on the landing hit and mirrored into sessionStorage, because a
   * visitor who bounces to a second page and comes back has lost the query string
   * but has not lost the click that paid for them.
   *
   * Two layers:
   *   T         the named keys the payload reports on
   *   LANDING_Q the WHOLE landing query string, forwarded verbatim to the next
   *             page. CFS ads carry h_ad_id and fbc_id (the live Hyros macros)
   *             alongside utm_*, and dropping any of them on the hop to /li-old
   *             would orphan the booking from its ad.
   * ======================================================================== */
  var TRACK_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
                    'utm_term', 'utm_id', 'h_ad_id', 'fbc_id', 'fbclid', 'gclid',
                    'gbraid', 'wbraid', 'ttclid', 'msclkid'];
  /* Never forwarded from the landing URL: these are set fresh from the form, and
   * a stale or spoofed value in the ad URL must not overwrite what they typed. */
  var PII_KEYS = ['first_name', 'last_name', 'full_name', 'name', 'email', 'phone'];
  var T = {};
  var LANDING_Q = '';
  (function captureParams() {
    var qs = new URLSearchParams(location.search);
    /* A fresh ad click replaces the stored set wholesale. Topping up only the
     * missing keys would stitch one ad's h_ad_id onto another ad's utm_campaign
     * when someone clicks two different ads in the same tab. */
    var fresh = TRACK_KEYS.some(function (k) { return qs.get(k); });
    if (fresh) {
      try {
        TRACK_KEYS.forEach(function (k) { sessionStorage.removeItem('fnl_' + k); });
        sessionStorage.removeItem('fnl_landing_url');
      } catch (e) {}
    }
    TRACK_KEYS.forEach(function (k) {
      var v = qs.get(k) || '';
      if (v) { try { sessionStorage.setItem('fnl_' + k, v); } catch (e) {} }
      else { try { v = sessionStorage.getItem('fnl_' + k) || ''; } catch (e) {} }
      T[k] = v;
    });
    try {
      if (location.search.length > 1) sessionStorage.setItem('fnl_qs', location.search.slice(1));
      LANDING_Q = sessionStorage.getItem('fnl_qs') || '';
      if (!sessionStorage.getItem('fnl_landing_url')) {
        sessionStorage.setItem('fnl_landing_url', location.href);
      }
      window.LANDING_URL = sessionStorage.getItem('fnl_landing_url') || location.href;
    } catch (e) {
      LANDING_Q = location.search.slice(1);
      window.LANDING_URL = location.href;
    }
  })();

  /* ==========================================================================
   * 2. TRACKING
   *
   * Every destination is optional. An empty id in the config means that pipe is
   * skipped, silently and with nothing logged. A tracking failure must never be
   * able to block a submit, so everything here is wrapped.
   * ======================================================================== */
  var STANDARD = ['Lead', 'Schedule', 'ViewContent', 'Purchase', 'Contact',
                  'CompleteRegistration', 'InitiateCheckout', 'Subscribe'];
  var GA4_NAME = { Lead: 'generate_lead', Schedule: 'schedule' };

  function eventId() {
    return 'fnl-' + Math.random().toString(36).slice(2) + '-' + (+new Date());
  }

  function ga4(name, data) {
    if (!CFG.tracking.ga4 || typeof gtag !== 'function') return;
    var mapped = GA4_NAME.hasOwnProperty(name) ? GA4_NAME[name] : name;
    if (!mapped) return;
    var p = {};
    ['step', 'question', 'outcome', 'variant'].forEach(function (k) { if (data && data[k]) p[k] = data[k]; });
    try { gtag('event', mapped, p); } catch (e) {}
  }

  function clarityTag(k, v) {
    if (!CFG.tracking.clarity || typeof clarity !== 'function' || !v) return;
    try { clarity('set', k, String(v)); } catch (e) {}
  }

  function track(name, data, ids) {
    data = data || {};
    data.variant = window.VARIANT || 'A';

    window.dataLayer = window.dataLayer || [];
    try { window.dataLayer.push(Object.assign({ event: name }, data)); } catch (e) {}

    ga4(name, data);
    clarityTag('last_event', name);
    if (data.step) clarityTag('furthest_step', data.step);
    if (data.outcome) {
      clarityTag('quiz_outcome', data.outcome);
      /* Keep every finished session, qualified or not: the DQ recordings are how
       * you find out whether the questions are filtering the right people. */
      try { if (typeof clarity === 'function') clarity('upgrade', name); } catch (e) {}
    }

    if (!CFG.tracking.metaPixel || typeof fbq !== 'function') return null;
    var id = (ids && ids.eventID) || eventId();
    try {
      fbq(STANDARD.indexOf(name) > -1 ? 'track' : 'trackCustom', name, data, { eventID: id });
    } catch (e) {}
    return id;
  }

  /* ==========================================================================
   * 3. VARIANTS
   *
   * One page, many campaigns. The path segment (or ?v=) is looked up in
   * CFG.variants and swaps the hero. `prefill` answers questions on the visitor's
   * behalf and removes those slides from the flow.
   * ======================================================================== */
  var VARIANT = (function () {
    var qs = new URLSearchParams(location.search).get('v');
    var seg = location.pathname.replace(/^\/|\/$/g, '').replace(/\.html$/, '').toLowerCase();
    var key = (qs || seg || '').toLowerCase().replace(/^(google|bing|tiktok)-?/, '');
    return (CFG.variants && CFG.variants[key]) || (CFG.variants && CFG.variants._default) || {};
  })();

  /* ==========================================================================
   * 4. QUIZ RENDERING
   * ======================================================================== */
  function buildSlide(s) {
    var d = el('div', 'qslide');
    d.dataset.q = s.q;
    d.dataset.type = s.type;
    d.appendChild(el('h3', 'qtitle', esc(s.title)));
    if (s.note) d.appendChild(el('p', 'qnote', esc(s.note)));

    if (s.type === 'contact') {
      /* First and last name as separate fields, because that is exactly how the
       * GHL calendar form on /li-old asks for them, and it reads first_name /
       * last_name straight off the URL. Splitting one "full name" box on the
       * first space gets "Mary Ann Smith" wrong. No phone: the brief is name and
       * email only, and the calendar collects the phone at booking. */
      var wrap = el('div', 'qcontact');
      wrap.innerHTML =
        '<div class="qrow">' +
          '<input type="text" id="qfirst" autocomplete="given-name"  placeholder="First name" aria-label="First name">' +
          '<input type="text" id="qlast"  autocomplete="family-name" placeholder="Last name"  aria-label="Last name">' +
        '</div>' +
        '<input type="email" id="qemail" autocomplete="email" inputmode="email" placeholder="Email address" aria-label="Email address">' +
        '<p class="qerr" id="qerr" role="alert"></p>' +
        '<button class="qgo" id="qgo" type="button">' + esc(s.submitLabel || 'Continue') + '</button>' +
        (s.privacyUrl ? '<p class="qprivacy"><a href="' + esc(s.privacyUrl) + '" target="_blank" rel="noopener">Privacy Policy</a></p>' : '');
      d.appendChild(wrap);
      return d;
    }

    if (s.type === 'text') {
      var t = el('div', 'qtext');
      t.innerHTML = '<input type="text" class="qinput" data-for="' + esc(s.q) + '" placeholder="' +
        esc(s.placeholder || 'Type your answer') + '">' +
        '<button class="qnext" data-go="1" type="button">Continue</button>';
      d.appendChild(t);
      return d;
    }

    if (s.type === 'scale') {
      var row = el('div', 'qscale');
      var lo = s.min || 1, hi = s.max || 5;
      for (var i = lo; i <= hi; i++) {
        var b = el('button', 'qpill', String(i));
        b.type = 'button';
        b.dataset.v = String(i);
        row.appendChild(b);
      }
      d.appendChild(row);
      if (s.labels) {
        d.appendChild(el('div', 'qscalelab',
          '<span>' + esc(s.labels[0]) + '</span><span>' + esc(s.labels[1]) + '</span>'));
      }
      return d;
    }

    /* choice and multi. Stacked full-width options rather than pills: several
     * answers here are long ("Yes, $80,000 or more") and pills wrap raggedly on
     * a phone, which is where most of this traffic lands. */
    var opts = el('div', 'qopts');
    (s.options || []).forEach(function (o) {
      var b = el('button', 'qopt');
      b.type = 'button';
      b.dataset.v = o.label;
      if (o.value != null) b.dataset.value = String(o.value);
      if (o.skip) b.dataset.skip = o.skip.join(',');
      b.innerHTML = '<span>' + esc(o.label) + '</span>';
      opts.appendChild(b);
    });
    d.appendChild(opts);
    if (s.type === 'multi') {
      d.appendChild(el('button', 'qnext', 'Continue')).setAttribute('data-go', '1');
    }
    return d;
  }

  function renderQuiz() {
    var host = $('quiz');
    if (!host) return;
    host.innerHTML = '';

    var prog = el('div', 'qzprog');
    prog.innerHTML = '<div class="qzmeta"><span id="qzstep"></span></div>' +
                     '<div class="qztrack"><div class="qzbar" id="qzbar"></div></div>';
    host.appendChild(prog);

    (CFG.quiz.slides || []).forEach(function (s) { host.appendChild(buildSlide(s)); });

    var nav = el('div', 'qnav');
    nav.innerHTML = '<button id="qup" type="button" class="qback">&larr; Back</button>';
    host.appendChild(nav);

    slides = [].slice.call(host.querySelectorAll('.qslide'));
  }

  /* ==========================================================================
   * 5. THE ENGINE
   * ======================================================================== */
  function skipped(i) { return !!slides[i] && slides[i].dataset.skip === '1'; }

  function setSkip(q, on) {
    var s = slides.filter(function (x) { return x.dataset.q === q; })[0];
    if (s) s.dataset.skip = on ? '1' : '0';
  }

  function liveSlides() {
    return slides.filter(function (s) { return s.dataset.skip !== '1'; });
  }

  /* Free-text lives in inputs, and the keyboard bypasses the per-slide handlers,
   * so this is the only universal capture point. Called before every move. */
  function captureCurrent() {
    var s = slides[at];
    if (!s) return;
    var input = s.querySelector('.qinput');
    if (input) answers[s.dataset.q] = input.value.trim();
  }

  function canLeave(i) {
    var s = slides[i];
    if (!s) return false;
    if (s.dataset.type === 'contact') return false;   // only #qgo leaves the last slide
    if (s.dataset.type === 'multi') return !!s.querySelectorAll('.sel').length;
    return !!answers[s.dataset.q];
  }

  function show(i) {
    captureCurrent();
    i = Math.max(0, Math.min(i, slides.length - 1));

    /* Walk past skipped slides in whichever direction we were already moving. If
     * we run off the end, reverse: the alternative is landing on a hidden slide
     * and showing the visitor a blank quiz. */
    var dir = (i >= at) ? 1 : -1;
    while (skipped(i) && i > 0 && i < slides.length - 1) i += dir;
    if (skipped(i)) { dir = -dir; while (skipped(i) && i > 0 && i < slides.length - 1) i += dir; }

    at = i;
    slides.forEach(function (s, n) { s.classList.toggle('on', n === at); });

    var live = liveSlides();
    var pos = live.indexOf(slides[at]) + 1;
    var bar = $('qzbar');
    /* scaleX rather than width, so the bar animates on the compositor and never
     * triggers layout mid-quiz. */
    if (bar) bar.style.transform = 'scaleX(' + (pos / live.length) + ')';
    var step = $('qzstep');
    if (step) step.textContent = 'Step ' + pos + ' of ' + live.length;

    var up = $('qup');
    if (up) up.hidden = slides[at] === live[0];

    if (at > 0) {
      var q = $('quiz');
      var r = q.getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight * 0.4) q.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (slides[at].dataset.type === 'contact') {
      /* Focus the first box on desktop only. On a phone it throws the keyboard
       * up over the heading before they have read what they are giving us. */
      if (window.matchMedia('(min-width: 700px)').matches) {
        setTimeout(function () { var f = $('qfirst'); if (f) f.focus(); }, 260);
      }
    }
    track('quiz_step', { step: pos, question: slides[at].dataset.q });
  }

  function record(q, val, opt) {
    answers[q] = val;

    /* An option can remove later questions from the flow. */
    if (opt && opt.dataset.skip) {
      opt.dataset.skip.split(',').forEach(function (k) { setSkip(k.trim(), true); });
    }
    /* The numeric value is what CFG.qualify reads. Kept separate from the label
     * so GHL gets readable text and the qualification rule gets a number. */
    if (opt && opt.dataset.value != null) {
      answers[q + '_value'] = Number(opt.dataset.value);
    } else {
      delete answers[q + '_value'];
    }
  }

  /* ==========================================================================
   * 6. VALIDATION
   *
   * The junk gate. Every rule here exists because a real lead form collected the
   * thing it rejects. Read references/quiz-engine.md in the template before
   * loosening any of it. (Phone rules removed along with the phone field.)
   * ======================================================================== */
  var E_JUNK = ['test', 'tester', 'testing', 'asdf', 'asdfasdf', 'qwerty', 'abc',
                'abcd', 'xyz', 'none', 'noemail', 'nomail', 'noreply', 'fake',
                'email', 'nope', 'na'];

  function badEmail(email) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return true;
    var local = email.split('@')[0].toLowerCase();
    /* Two characters, not three. jo@ and ed@ are real people. */
    if (local.length < 2) return true;
    if (/^(.)\1+$/.test(local)) return true;
    return E_JUNK.indexOf(local) > -1;
  }

  /* A name box holding an email, a URL or digits is a bot or a mis-tap. */
  function badName(n) {
    return n.length < 1 || /[@\d]|https?:|www\./i.test(n);
  }

  function titleCase(n) {
    /* Only fix names typed entirely in one case. "McDonald" and "de la Cruz"
     * are left exactly as typed. */
    if (n !== n.toLowerCase() && n !== n.toUpperCase()) return n;
    return n.toLowerCase().replace(/(^|[\s'-])([a-z])/g, function (m, p, c) { return p + c.toUpperCase(); });
  }

  /* ==========================================================================
   * 7. OUTCOME + PAYLOAD
   * ======================================================================== */
  function qualified() {
    try { return !!CFG.qualify(answers); } catch (e) {
      /* A broken rule must not strand the visitor. Fail toward the call: a
       * setter can DQ a real person on the phone, but a qualified family
       * bounced to a webinar replay is gone. */
      console.error('[funnel] qualify() threw; routing as qualified.', e);
      return true;
    }
  }

  function buildPayload(first, last, email, ok) {
    var tg = CFG.tags || {};
    var outcomeTag = ok ? tg.qualified : tg.dq;
    var p = {
      first_name: first,
      last_name: last,
      full_name: (first + ' ' + last).trim(),
      email: email,
      qualified: ok ? 'yes' : 'no',
      quiz_outcome: ok ? 'qualified' : 'dq',
      tags: [tg.all, outcomeTag].filter(Boolean).join(','),
      tag_all: tg.all || '',
      tag_outcome: outcomeTag || '',
      next_page: ok ? CFG.routes.qualified : CFG.routes.dq,
      platform: (CFG.webhook && CFG.webhook.platform) || '',
      variant: window.VARIANT || 'A',
      page: location.hostname + location.pathname,
      landing_url: window.LANDING_URL || location.href,
      submitted_at: new Date().toISOString(),
      lead_event_id: answers.leadEventId || ''
    };

    /* Every quiz answer, under its own `q` key. The key IS the GHL field name. */
    (CFG.quiz.slides || []).forEach(function (s) {
      if (s.type === 'contact') return;
      p[s.q] = answers[s.q] || '';
    });

    if (VARIANT.prefill) {
      Object.keys(VARIANT.prefill).forEach(function (k) { p[k] = VARIANT.prefill[k]; });
    }

    TRACK_KEYS.forEach(function (k) { p[k] = T[k] || ''; });
    p.fbp = (document.cookie.match(/(?:^|;\s*)_fbp=([^;]*)/) || [])[1] || '';
    p.fbc = (document.cookie.match(/(?:^|;\s*)_fbc=([^;]*)/) || [])[1] || '';

    /* One readable block for a GHL contact note. Setters read this, not the
     * individual fields. */
    p.brief = ['Tax Scholarship quiz: ' + (ok ? 'QUALIFIED' : 'NOT A FIT (sent to Right College, Right Price)')]
      .concat((CFG.quiz.slides || [])
        .filter(function (s) { return s.type !== 'contact' && answers[s.q]; })
        .map(function (s) { return s.title.replace(/\?$/, '') + ': ' + answers[s.q]; }))
      .join('\n');

    return p;
  }

  /* Resolves when the post settles or after `ms`, whichever is first, so a slow
   * or dead webhook can never hold a visitor on the page. */
  function post(payload, ms) {
    var url = CFG.webhook && CFG.webhook.url;
    if (!url) {
      console.warn('[funnel] webhook.url is not set. Lead NOT posted to GHL:', payload);
      window.POST_RESULT = { ok: false, error: 'no webhook url' };
      return Promise.resolve();
    }
    var body = JSON.stringify(payload);

    /* application/json is safe here, unlike the template's Zapier default: GHL's
     * hook endpoint answers the preflight with allow-origin * and allow-headers *
     * (verified 2026-09-24), and GHL's inbound-webhook trigger only maps fields
     * out of a JSON body. Never use mode:'no-cors'; it hides every failure. */
    var sent = fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    })
      .then(function (r) {
        return r.text().then(function (txt) {
          window.POST_RESULT = { ok: r.ok, status: r.status, body: txt };
          if (!r.ok) throw new Error('webhook ' + r.status);
        });
      })
      .catch(function (err) {
        window.POST_RESULT = { ok: false, error: String(err) };
        /* Last resort, survives the page unloading. text/plain because sendBeacon
         * cannot send a preflighted content type. */
        try { navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' })); } catch (e) {}
      });

    return Promise.race([sent, new Promise(function (res) { setTimeout(res, ms); })]);
  }

  /* ==========================================================================
   * 8. REDIRECT
   * ======================================================================== */
  function nextUrl(base, withContact, first, last, email) {
    var q = new URLSearchParams(LANDING_Q);
    PII_KEYS.forEach(function (k) { q.delete(k); });
    q.delete('v');
    /* Named keys may have come from sessionStorage rather than this URL. */
    TRACK_KEYS.forEach(function (k) { if (T[k] && !q.get(k)) q.set(k, T[k]); });
    if (withContact) {
      /* The exact keys the GHL calendar form on /li-old prefills from. */
      q.set('first_name', first);
      q.set('last_name', last);
      q.set('email', email);
    }
    /* URLSearchParams encodes a space as '+', which some form readers show
     * literally ("Mary+Ann"). A real '+' in a value is already %2B, so this
     * swap only touches spaces. */
    var s = q.toString().replace(/\+/g, '%20');
    return base + (s ? (base.indexOf('?') > -1 ? '&' : '?') + s : '');
  }

  function showResult(kind, first, href) {
    var R = (CFG.results || {})[kind] || {};
    var box = $(kind === 'qualified' ? 'resOk' : 'resDq');
    if (!box) return;
    box.querySelector('h2').textContent = (R.h || '').replace('{first}', first);
    box.querySelector('p').textContent = (R.p || '').replace('{first}', first);
    var a = box.querySelector('a');
    a.textContent = R.link || 'Continue';
    a.href = href;
    $('quiz').hidden = true;
    var hd = $('heroHead'); if (hd) hd.hidden = true;
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function go(href) { window.location.assign(href); }

  /* ==========================================================================
   * 9. SUBMIT
   * ======================================================================== */
  function onSubmit() {
    var err = $('qerr');
    var first = titleCase(V('qfirst').replace(/\s+/g, ' '));
    var last = titleCase(V('qlast').replace(/\s+/g, ' '));
    var email = V('qemail').toLowerCase();

    function fail(m, focus) {
      err.textContent = m;
      err.classList.add('on');
      if (focus) $(focus).focus();
    }

    if (!first || !last || !email) return fail('Please fill in all three so your details carry over.');
    if (badName(first)) return fail('Please enter your first name.', 'qfirst');
    if (badName(last)) return fail('Please enter your last name.', 'qlast');
    if (badEmail(email)) return fail('That email address does not look right.', 'qemail');
    err.classList.remove('on');

    /* Latch AFTER validation. Latching before means a single typo locks the
     * visitor out for good. */
    if (submitted) return;
    submitted = true;
    var btn = $('qgo');
    btn.disabled = true;
    btn.textContent = 'One moment...';

    var ok = qualified();
    answers.leadEventId = eventId();
    /* Same-tab hand-off: the booking page lists which pieces to start with. */
    try { sessionStorage.setItem('fnl_answers', JSON.stringify(answers)); } catch (e) {}
    var ev = (CFG.tracking.events || {})[ok ? 'qualified' : 'dq'] || (ok ? 'QuizQualified' : 'QuizDQ');
    track(ev, { outcome: ok ? 'qualified' : 'dq' }, { eventID: answers.leadEventId });

    var payload = buildPayload(first, last, email, ok);

    if (ok) {
      var href = nextUrl(CFG.routes.qualified, true, first, last, email);
      showResult('qualified', first, href);
      /* Post first, then leave. 2.5s cap: past that the visitor would rather be
       * on the calendar, and the beacon fallback still gets the lead out. */
      post(payload, 2500).then(function () { go(href); });
    } else {
      var dqHref = nextUrl(CFG.routes.dq, false);
      showResult('dq', first, dqHref);
      post(payload, 4000);
      var left = Number(CFG.routes.dqDelay) || 7;
      setTimeout(function () { go(dqHref); }, left * 1000);
    }
  }

  /* ==========================================================================
   * 10. WIRING
   * ======================================================================== */
  function applyVariant() {
    if (VARIANT.h1 && $('heroH1')) $('heroH1').innerHTML = VARIANT.h1;
    if (VARIANT.sub && $('heroSub')) $('heroSub').textContent = VARIANT.sub;
    if (VARIANT.img) {
      var hero = document.querySelector('.hero');
      if (hero) hero.style.backgroundImage = "url('" + VARIANT.img + "')";
    }
    if (VARIANT.prefill) {
      Object.keys(VARIANT.prefill).forEach(function (k) {
        answers[k] = VARIANT.prefill[k];
        setSkip(k, true);
      });
    }
  }

  function wire() {
    var quiz = $('quiz');
    if (!quiz) return;

    quiz.addEventListener('click', function (e) {
      var go = e.target.closest('[data-go]');
      if (go) { show(at + 1); return; }

      var opt = e.target.closest('.qopt,.qpill');
      if (!opt) return;
      var slide = opt.closest('.qslide');
      var q = slide.dataset.q;

      if (slide.dataset.type === 'multi') {
        opt.classList.toggle('sel');
        answers[q] = [].slice.call(slide.querySelectorAll('.sel'))
          .map(function (o) { return o.dataset.v; }).join(', ');
        return;
      }

      slide.querySelectorAll('.qopt,.qpill').forEach(function (o) { o.classList.remove('sel'); });
      opt.classList.add('sel');
      record(q, opt.dataset.v, opt);
      /* Short pause so the selection is visibly registered before the slide moves.
       * Without it the advance reads as "did that even take?" */
      setTimeout(function () { show(at + 1); }, 220);
    });

    quiz.addEventListener('input', function (e) {
      if (e.target.classList.contains('qinput')) answers[e.target.dataset.for] = e.target.value.trim();
    });

    quiz.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (e.target.classList.contains('qinput')) { show(at + 1); return; }
      if (e.target.closest('.qcontact')) { e.preventDefault(); onSubmit(); }
    });

    $('qup').addEventListener('click', function () { show(at - 1); });
    $('qgo').addEventListener('click', onSubmit);

    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement || {}).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (/^[1-9]$/.test(e.key) && slides[at]) {
        var pick = slides[at].querySelectorAll('.qopt,.qpill')[Number(e.key) - 1];
        if (pick) pick.click();
      }
    });

    /* Anything that scrolls to the quiz. */
    document.querySelectorAll('[data-scroll="quiz"]').forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.preventDefault();
        $('top').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function init() {
    window.VARIANT = 'A';
    renderQuiz();
    applyVariant();
    wire();
    show(0);              // without this the quiz loads blank
    track('quiz_view', {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.FUNNEL_DEBUG = {
    answers: function () { return answers; },
    qualified: qualified,
    variant: function () { return VARIANT; },
    tracking: function () { return T; },
    landingQuery: function () { return LANDING_Q; },
    nextUrl: nextUrl
  };
})();
