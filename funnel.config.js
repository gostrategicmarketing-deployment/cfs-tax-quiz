/* Quiz configuration. */
window.FUNNEL = {
  brand: {
    name: 'Legetty',
    title: '3 Steps to Pay for College Without Sacrificing Your Financial Future',
    description: 'Answer 6 quick questions to see whether a free 30-minute review call makes sense for your family.'
  },
  webhook: {
    url: '',
    platform: 'Facebook'
  },
  routes: {
    qualified: 'book/',
    dq:        'https://collegefundingsecrets.com/RightPrice',
    dqDelay: 7
  },
  qualify: function (a) {
    var yesAidOrTaxes = a.aid_concern_value === 1 || a.taxes_vs_college_value === 1;
    return yesAidOrTaxes && a.real_estate_value !== 0;
  },
  tags: {
    all: 'tax-quiz',
    qualified: 'tax-quiz-qualified',
    dq: 'tax-quiz-dq'
  },
  tracking: {
    ga4: 'G-EQ0WC0MR3F',
    gtm: '',
    clarity: 'vwrgzndnow',
    metaPixel: '527818004038067',
    events: { qualified: 'QuizQualified', dq: 'QuizDQ' },
    googleAds: { id: '', lead: '', booking: '' }
  },
  quiz: {
    intro: '6 quick steps. Under a minute.',
    slides: [
      {
        q: 'has_529',
        type: 'choice',
        title: "Do you currently have a 529 account for your kids' college?",
        note: 'Children or grandchildren both count.',
        options: [
          { label: 'Yes, we have a 529' },
          { label: 'No, we are saving another way' },
          { label: 'No, we have not started saving yet' }
        ]
      },
      {
        q: 'aid_concern',
        type: 'choice',
        title: 'Are you concerned that you make too much money to get financial aid?',
        note: 'Step 1 of the framework looks at what college may really cost your family, including financial aid eligibility.',
        options: [
          { label: 'Yes, I doubt we will get much aid',     value: 1 },
          { label: 'I am not sure where we stand',          value: 0 },
          { label: 'No, I expect we will qualify for aid',  value: 0 }
        ]
      },
      {
        q: 'full_price_worry',
        type: 'choice',
        title: 'Are you worried that paying full price for college will hurt your financial future?',
        note: 'Step 3 is about paying for college without draining the savings and retirement money that should keep compounding for you.',
        options: [
          { label: 'Yes, that worries me' },
          { label: 'Somewhat' },
          { label: 'No, we have it covered' }
        ]
      },
      {
        q: 'taxes_vs_college',
        type: 'choice',
        title: 'On top of that, are you paying more in taxes every year than it costs to send your child to college?',
        note: "Compare your yearly income tax bill with one year of college for one student. Your best guess is fine. Step 2 looks at how tax planning could cover more of the cost, even if you're a W-2 earner.",
        options: [
          { label: 'Yes, our tax bill is bigger',  value: 1 },
          { label: 'No, our tax bill is smaller',  value: 0 },
          { label: 'I am not sure',                value: 0 }
        ]
      },
      {
        q: 'real_estate',
        type: 'choice',
        title: "Would you like the idea of investing in real estate if it could lower your taxes and help pay for college, and you didn't have to find it, analyze it, design it, or manage it yourself?",
        note: 'For some families, Step 2 includes real estate they own.',
        options: [
          { label: 'Yes, I have always wanted to. I just do not have the time.', value: 1 },
          { label: 'Maybe. I would want to learn more first.',                   value: 1 },
          { label: 'No, real estate is not for me.',                             value: 0 }
        ]
      },
      {
        q: 'contact',
        type: 'contact',
        title: 'Last step. Where should we send your next step?',
        note: 'Your details carry over, so you will not need to type them again.',
        submitLabel: 'See My Next Step',
        privacyUrl: 'https://collegefundingsecrets.com/privacy-policy'
      }
    ]
  },
  results: {
    qualified: {
      h: 'Good news, {first}. Your answers line up.',
      p: 'Taking you to the calendar now to pick a time for your free Tax & College Opportunity Review Call.',
      link: 'Continue to the calendar'
    },
    dq: {
      h: 'Thanks for taking the quiz.',
      p: 'Based on your answers, a one-on-one review call is not the best next step for your family right now. ' +
         'Lance recorded a free session with college-planning expert Cori Murphy, Right College, Right Price. ' +
         'It covers finding schools that fit your student, comparing what different colleges could actually cost, ' +
         'and where scholarships and financial aid fit into the picture. Taking you there in a few seconds.',
      link: 'Watch Right College, Right Price'
    }
  },
  variants: {
    _default: {
      h1: '<span class="lead-in">3 Steps to Pay for College</span> <span class="deep">Without Sacrificing Your Financial Future</span>',
      sub: 'Answer 6 quick questions to see whether a free 30-minute review call makes sense for your family.'
    }
  },
  kicker: 'Free 6-question quiz',
  qualifier: 'This review is for families earning about $250,000+ or paying $30,000+ a year in federal taxes.',
  sections: [
    {
      type: 'steps',
      title: 'The 3 steps',
      items: [
        { title: 'Reduce',
          body: 'Understand what college may really cost your family, including school choice and financial aid eligibility, before you decide how to pay.' },
        { title: 'Offset',
          body: "See how strategic tax planning could cover more of what's left, even if you're a W-2 earner. For some families, that includes real estate they own." },
        { title: 'Fund',
          body: 'Pay the balance without draining the savings and retirement money that should keep compounding for you.' }
      ]
    },
    {
      type: 'press',
      title: 'Lance Morgan, as featured in',
      logos: [
        { src: 'assets/press/yahoo-finance.png', alt: 'Yahoo Finance' },
        { src: 'assets/press/marketwatch.png', alt: 'MarketWatch' },
        { src: 'assets/press/realtor.png', alt: 'realtor.com' },
        { src: 'assets/press/cnet.png', alt: 'CNET' },
        { src: 'assets/press/gobankingrates.png', alt: 'GOBankingRates' },
        { src: 'assets/press/wbz.png', alt: 'WBZ NewsRadio 1030' },
        { src: 'assets/press/california-business-journal.png', alt: 'California Business Journal' }
      ]
    },
    {
      type: 'covers',
      title: 'What the free review call covers',
      items: [
        { title: 'Your college cost picture',
          body: 'What college could cost for each student, based on the schools your family is considering.' },
        { title: 'Your tax picture',
          body: 'Your income and tax bill side by side, and which strategies may be worth a closer look.' },
        { title: 'Whether a deeper conversation makes sense',
          body: 'You decide together with our team. There is no need to choose a strategy on the call.' }
      ],
      note: 'This is an exploratory conversation. No tax, legal, investment, or financial outcome is promised.'
    },
    {
      type: 'faq',
      title: 'Questions families ask',
      items: [
        { q: 'How long is the call?', a: 'About 30 minutes, one on one with a member of our advisory team.' },
        { q: 'What does the call cost?', a: 'Nothing. The review call is free.' },
        { q: "I'm a W-2 employee. Does this still apply?", a: 'It can. The framework includes tax-planning concepts that may apply to W-2 employees, 1099 earners, and business owners. Whether a strategy fits depends on your situation and the rules involved.' },
        { q: 'Should my spouse join?', a: 'Yes, if you make financial decisions together. Most families find it easier when both of you hear the same information at the same time.' }
      ]
    },
    {
      type: 'finalcta',
      title: 'See your next step',
      body: 'Six quick steps, then you will know whether a review call makes sense for your family.',
      cta: 'Start the Quiz'
    }
  ]
};
