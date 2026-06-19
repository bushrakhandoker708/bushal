// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/app/components/ui/Toast'
import PageTransition from '@/app/components/layout/PageTransition'
import CompareDrawer from '@/app/components/layout/CompareDrawer'

export const metadata: Metadata = {
  metadataBase: new URL('https://bushal.vercel.app'),
  title: {
    default: 'Bushal — Premium Curated Products & Online Shopping in Bangladesh',
    template: '%s | Bushal',
  },
  description: 'Discover heritage-quality, handpicked products delivered across Bangladesh. Shop premium goods with transparent pricing, fast delivery, and secure bKash payments at Bushal.',
  keywords: [
    'Bushal', 'Bushal e-commerce', 'online shopping Bangladesh', 'buy products online BD',
    'bKash payment shopping', 'premium products Dhaka', 'Bushra Khandoker',
    'curated goods Bangladesh', 'fast delivery e-commerce BD'
  ],
  authors: [{ name: 'Bushra Khandoker', url: 'https://github.com/bushrakhandoker708' }],
  creator: 'Bushra Khandoker',
  publisher: 'Bushal',
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: 'website',
    locale: 'en_BD',
    url: 'https://bushal.vercel.app',
    siteName: 'Bushal',
    title: 'Bushal — Premium Curated Products in Bangladesh',
    description: 'Discover heritage-quality, handpicked products delivered across Bangladesh. Transparent pricing & secure bKash payments.',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'Bushal E-commerce Platform - Premium Products in Bangladesh' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bushal — Premium Curated Products in Bangladesh',
    description: 'Discover heritage-quality, handpicked products delivered across Bangladesh.',
    images: ['/logo.png'],
    creator: '@BushalBD',
  },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: { canonical: 'https://bushal.vercel.app' },
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png', type: 'image/png' },
    ],
  },
}

// Global JSON-LD for Google Knowledge Graph (Organization/Store)
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'Bushal',
  alternateName: 'Bushal E-commerce Bangladesh',
  url: 'https://bushal.vercel.app',
  logo: 'https://bushal.vercel.app/logo.png',
  description: 'Curated premium products, transparent pricing, and fast delivery across Bangladesh.',
  founder: { '@type': 'Person', name: 'Bushra Khandoker', url: 'https://github.com/bushrakhandoker708' },
  sameAs: ['https://github.com/bushrakhandoker708/bushal'],
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', areaServed: 'BD', availableLanguage: ['English', 'Bengali'] },
  address: { '@type': 'PostalAddress', addressCountry: 'BD', addressLocality: 'Dhaka' },
}

// Global JSON-LD for Sitelinks Searchbox
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Bushal',
  url: 'https://bushal.vercel.app',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: 'https://bushal.vercel.app/dashboard?q={search_term_string}' },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-BD" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" rel="stylesheet" />
        {/* Favicon */}
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        {/* Inject Global Structured Data for Maximum SEO Impact */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      {/* Added suppressHydrationWarning to prevent Grammarly/Extension errors */}
      <body className="antialiased" suppressHydrationWarning>
        <ToastProvider>
          {/* NEW: Wrapped children with PageTransition for smooth page transitions */}
          <PageTransition>
            {children}
            {/* NEW: Integrated CompareDrawer globally so it's available on all pages */}
            <CompareDrawer />
          </PageTransition>
        </ToastProvider>
      </body>
    </html>
  )
}