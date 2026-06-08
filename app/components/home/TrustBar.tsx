export default function TrustBar() {
  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      title: 'Free Shipping',
      subtitle: 'On orders over ৳1,000',
      color: 'text-bushal-copper',
      bg: 'bg-bushal-copper/5',
      border: 'border-bushal-copper/10',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Secure Payments',
      subtitle: '100% secure bKash & Card',
      color: 'text-bushal-success',
      bg: 'bg-bushal-success/5',
      border: 'border-bushal-success/10',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      title: '7-Day Returns',
      subtitle: 'Hassle-free return policy',
      color: 'text-bushal-forest',
      bg: 'bg-bushal-forest/5',
      border: 'border-bushal-forest/10',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: 'Dedicated Support',
      subtitle: 'Fast & friendly customer care',
      color: 'text-bushal-copper',
      bg: 'bg-bushal-copper/5',
      border: 'border-bushal-copper/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-12 animate-fade-up" style={{ animationDelay: '100ms' }}>
      {features.map((feature, index) => (
        <div
          key={index}
          className={`flex flex-col items-center text-center p-4 md:p-5 rounded-2xl border ${feature.bg} ${feature.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-md group`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors duration-300 group-hover:scale-110 ${feature.bg} ${feature.color}`}>
            {feature.icon}
          </div>
          <h3 className="text-sm font-bold text-bushal-forest mb-1">{feature.title}</h3>
          <p className="text-xs text-bushal-inkSoft leading-relaxed">{feature.subtitle}</p>
        </div>
      ))}
    </div>
  )
}