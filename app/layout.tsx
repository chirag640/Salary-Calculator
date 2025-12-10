import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AppShell } from '@/components/app-shell'
import { ThemeProvider } from '@/components/theme-provider'
import { SystemThemeAdapter } from '@/components/system-theme-adapter'
import { Toaster } from '@/components/ui/toaster'
import { MobileNav } from '@/components/mobile-nav'
import { LayoutWrapper } from '@/components/layout-wrapper'

export const metadata: Metadata = {
  title: 'Time Tracker - Salary Calculator',
  description: 'Track your work hours and calculate earnings in real-time',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TimeTracker',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Time Tracker',
    title: 'Time Tracker - Salary Calculator',
    description: 'Track your work hours and calculate earnings in real-time',
  },
  twitter: {
    card: 'summary',
    title: 'Time Tracker',
    description: 'Track your work hours and calculate earnings in real-time',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem
          disableTransitionOnChange
        >
          <SystemThemeAdapter />
          <AppShell>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </AppShell>
          <MobileNav />
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
