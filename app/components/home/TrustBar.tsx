// components/home/TrustBar.tsx
const TRUST_ITEMS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    label: 'SSL Secured',
    sub: 'Safe & encrypted',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    label: 'bKash Accepted',
    sub: 'Instant payment',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    label: '7-Day Returns',
    sub: 'No questions asked',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    label: 'Fast Delivery',
    sub: 'Across Bangladesh',
  },
]

export default function TrustBar() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
      {TRUST_ITEMS.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 bg-bushal-surface border border-bushal-border rounded-xl px-4 py-3.5 shadow-card"
        >
          <div className="w-9 h-9 rounded-lg bg-bushal-forest/10 text-bushal-forest flex items-center justify-center flex-shrink-0">
            {item.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-bushal-ink leading-tight">{item.label}</p>
            <p className="text-[11px] text-bushal-inkSoft">{item.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}