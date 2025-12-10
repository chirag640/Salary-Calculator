import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://salary-calculator-five-zeta.vercel.app'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-otp', '/link-account'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
