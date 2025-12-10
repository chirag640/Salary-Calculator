// SEO Configuration
export const siteConfig = {
  name: 'Salary Calculator',
  description: 'Track your work hours and calculate your salary in real-time. Free online tool for hourly wage calculations, time tracking, and earnings estimation.',
  url: 'https://salary-calculator-five-zeta.vercel.app',
  ogImage: 'https://salary-calculator-five-zeta.vercel.app/logo.png',
  author: 'Salary Calculator Team',
  keywords: [
    'salary calculator',
    'hourly rate calculator',
    'wage calculator',
    'work hours tracker',
    'time tracking',
    'payroll calculator',
    'earnings calculator',
    'hourly to salary',
    'salary counter',
    'work time calculator',
    'calculate salary from hours',
    'track work hours',
    'salary estimator',
    'online salary calculator',
    'free salary calculator'
  ],
  creator: '@SalaryCalc',
  twitterHandle: '@SalaryCalc',
}

export const jsonLdSchemas = {
  webApplication: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Salary Calculator',
    description: 'Track your work hours and calculate your salary in real-time',
    url: 'https://salary-calculator-five-zeta.vercel.app',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Real-time salary calculation',
      'Work hours tracking',
      'Hourly rate calculator',
      'Time entry management',
      'Earnings history',
      'Export functionality',
      'Offline support'
    ],
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    screenshot: 'https://salary-calculator-five-zeta.vercel.app/logo.png',
  },
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Salary Calculator',
    url: 'https://salary-calculator-five-zeta.vercel.app',
    logo: 'https://salary-calculator-five-zeta.vercel.app/logo.png',
    description: 'Free online salary and wage calculator for tracking work hours and calculating earnings',
    sameAs: [
      // Add social media links when available
    ],
  },
  breadcrumb: {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://salary-calculator-five-zeta.vercel.app',
      },
    ],
  },
  softwareApplication: {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Salary Calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web Browser, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '100',
    },
  },
}
