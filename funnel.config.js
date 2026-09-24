/* Tax Scholarship quiz configuration. */
window.FUNNEL = {
  brand: {
    name: 'College Funding Secrets',
    title: 'Is the Tax Scholarship a Fit for Your Family?',
    description: 'Five quick steps to see whether a free strategy call makes sense for your family.',
    logo: 'assets/cfs-logo.png',
    theme: {
      ink:       '#072B53',
      paper:     '#FFFFFF',
      accent:    '#FCB903',
      accentInk: '#072B53',
      muted:     '#475467',
      line:      '#E4E7EC',
      band:      '#F5F7FA',
      heroInk:   '#FFFFFF',
      heroWashRgb: '7,43,83'
    }
  },
  webhook: {
    url: '',
    platform: 'Facebook'
  },
  routes: {
    qualified: 'https://realestatecollegefundingsecrets.com/li-old',
    dq:        'https://collegefundingsecrets.com/RightPrice',
    dqDelay: 7
  },
  qualify: function (a) {
    return (a.household_income_value || 0) >= 200000 ||
           (a.invest_capacity_value  || 0) >= 80000;
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
    intro: '5 quick steps. About 30 seconds.',
    slides: [
      {
        q: 'students',
        type: 'choice',
        title: 'How many students are you planning college for?',
        note: 'Children or grandchildren.',
        options: [
          { label: '1 student' },
          { label: '2 students' },
          { label: '3 or more' }
        ]
      },
      {
        q: 'grad_year',
        type: 'choice',
        title: 'When does your oldest student finish high school?',
        options: [
          { label: 'Already in college' },
          { label: '2027' },
          { label: '2028 or 2029' },
          { label: '2030 or later' }
        ]
      },
      {
        q: 'household_income',
        type: 'choice',
        title: 'What is your approximate household income?',
        note: 'A range is fine. It helps us point you to the right next step.',
        options: [
          { label: 'Under $200,000',         value: 0 },
          { label: '$200,000 to $249,999',   value: 200000 },
          { label: '$250,000 to $499,999',   value: 250000 },
          { label: '$500,000 or more',       value: 500000 }
        ]
      },
      {
        q: 'invest_capacity',
        type: 'choice',
        title: 'If the numbers made sense, could your family put $80,000 or more toward a short-term rental you would own?',
        options: [
          { label: 'Yes, $80,000 or more',  value: 80000 },
          { label: 'Not sure yet',          value: 0 },
          { label: 'No, not right now',     value: 0 }
        ]
      },
      {
        q: 'contact',
        type: 'contact',
        title: 'Last step. Where should we send your next step?',
        note: 'Your details carry over, so you will not need to type them again.',
        submitLabel: 'See My Next Step'
      }
    ]
  },
  results: {
    qualified: {
      h: 'Good news, {first}. Your answers line up.',
      p: 'Taking you to the calendar now to pick a time for your free strategy call.',
      link: 'Continue to the calendar'
    },
    dq: {
      h: 'Thanks, {first}.',
      p: 'Based on your answers, a one-on-one strategy call is not the best next step for your family right now. ' +
         'Lance recorded a free session with college-planning expert Cori Murphy, Right College, Right Price. ' +
         'It covers finding schools that fit your student, comparing what different colleges could actually cost, ' +
         'and where scholarships and financial aid fit into the picture.',
      link: 'Watch Right College, Right Price'
    }
  },
  variants: {
    _default: {
      h1: 'Is the Tax Scholarship a Fit for Your Family?',
      sub: 'Smart families are pointing the tax savings from a short-term rental they own at tuition. ' +
           'Answer a few quick questions to see your next step.',
      img: 'assets/hero.jpg'
    }
  },
  sections: [
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
      ],
      cards: [
        { src: 'assets/press/card-american-reporter.jpg', alt: 'The American Reporter: Retirement-Proofing College' },
        { src: 'assets/press/card-enterprise-radio.jpg', alt: 'Enterprise Radio: College Funding Secrets founder on taxes, real estate, and tuition planning' },
        { src: 'assets/press/card-parenting-teens-today.jpg', alt: 'Parenting Teens Today podcast with Lance Morgan' },
        { src: 'assets/press/card-reverse-your-thinking.jpg', alt: 'abc News Radio KMET: Reverse Your Thinking, guest Lance Morgan' }
      ]
    },
    {
      type: 'covers',
      title: 'What the free strategy call covers',
      items: [
        { title: 'Your college cost picture',
          body: 'A projected cost of attendance for each student, built around the schools your family is actually considering.' },
        { title: 'Your tax picture',
          body: 'Where a short-term rental you own could create deductions, and what that could mean for your family. Consult your CPA. Results vary.' },
        { title: 'The Scholarship House plan',
          body: 'How the cash flow and tax savings from one house can be pointed at tuition while your retirement keeps working.' }
      ]
    },
    {
      type: 'faq',
      title: 'Questions families ask',
      items: [
        { q: 'How long is the call?', a: 'About 30 minutes, one on one with a member of our advisory team.' },
        { q: 'What does the call cost?', a: 'Nothing. The strategy call is free.' },
        { q: 'Do I need real estate experience?', a: 'No real estate experience needed. We will walk you through it or handle it for you.' },
        { q: 'Should my spouse join?', a: 'Yes, if you make financial decisions together. Most families find it easier when both of you hear the plan at the same time.' }
      ]
    },
    {
      type: 'finalcta',
      title: 'See your next step',
      body: 'Five quick steps, then you will know whether a strategy call makes sense for your family.',
      cta: 'Start the Quiz'
    }
  ],
  footer: 'Educational content only. Not tax, legal, or investment advice. Consult your CPA. Results vary.'
};
