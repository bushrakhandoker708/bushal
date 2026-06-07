// components/layout/Footer.tsx
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-bushal-forest text-white/50 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">

          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-bushal-copper flex items-center justify-center shadow-copper">
                <span className="text-white font-heading font-bold text-sm leading-none">B</span>
              </div>
              <h2
                className="text-xl font-semibold text-white tracking-wide"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Bushal
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-white/40 max-w-xs">
              Curated products, honest pricing, delivered across Bangladesh with care.
            </p>
          </div>

          <div>
            <h3 className="text-white/80 font-semibold mb-4 text-sm tracking-wide uppercase text-xs">Shop</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/dashboard" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link href="/cart" className="hover:text-white transition-colors">My Cart</Link></li>
              <li><Link href="/orders" className="hover:text-white transition-colors">My Orders</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white/80 font-semibold mb-4 text-sm tracking-wide uppercase text-xs">Account</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Register</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white/80 font-semibold mb-4 text-sm tracking-wide uppercase text-xs">Support</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="mailto:hello@bushal.com" className="hover:text-white transition-colors">
                  hello@bushal.com
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-bushal-copper flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>bKash Accepted</span>
              </li>
              <li className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-bushal-copper flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>SSL Encrypted</span>
              </li>
              <li className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-bushal-copper flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>7-Day Returns</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <span>© {new Date().getFullYear()} Bushal. All rights reserved.</span>
          <span>Made with care in Bangladesh</span>
        </div>
      </div>
    </footer>
  )
}