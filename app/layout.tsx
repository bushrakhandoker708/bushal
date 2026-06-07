// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/app/components/ui/Toast'


export const metadata: Metadata = {
  metadataBase: new URL('https://bushal.vercel.app'),
  title: {
    default: 'Bushal — Premium Curated Products in Bangladesh',
    template: '%s | Bushal',
  },
  description: 'Discover heritage-quality, handpicked products delivered across Bangladesh. Transparent pricing, fast delivery, and secure bKash payments at Bushal.',
  keywords: ['Bushal', 'e-commerce Bangladesh', 'online shopping BD', 'bKash payment', 'premium products Dhaka', 'Bushra Khandoker', 'buy online Bangladesh'],
  authors: [{ name: 'Bushra Khandoker', url: 'https://github.com/Bushraabir' }],
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
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Bushal E-commerce Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bushal — Premium Curated Products in Bangladesh',
    description: 'Discover heritage-quality, handpicked products delivered across Bangladesh.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: { canonical: 'https://bushal.vercel.app' },
}

// Global JSON-LD for Google Knowledge Graph
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'Bushal',
  alternateName: 'Bushal E-commerce',
  url: 'https://bushal.vercel.app',
  logo: 'https://bushal.vercel.app/logo.png',
  description: 'Curated products, transparent pricing, fast delivery across Bangladesh.',
  founder: { '@type': 'Person', name: 'Bushra Khandoker', url: 'https://github.com/Bushraabir' },
  sameAs: ['https://github.com/Bushraabir/bushal'],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    areaServed: 'BD',
    availableLanguage: ['English', 'Bengali'],
  },
  address: { '@type': 'PostalAddress', addressCountry: 'BD', addressLocality: 'Dhaka' },
}

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" rel="stylesheet" />
        
        {/* Inject Global Structured Data */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}