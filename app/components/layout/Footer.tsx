// components/layout/Footer.tsx

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h2 className="text-2xl font-extrabold text-orange-400 mb-3">
              Sagitus
            </h2>
            <p className="text-sm leading-relaxed">
              Your trusted online store. Quality products, delivered fast.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/dashboard" className="hover:text-white transition">
                  All Products
                </a>
              </li>
              <li>
                <a href="/cart" className="hover:text-white transition">
                  My Cart
                </a>
              </li>
              <li>
                <a href="/login" className="hover:text-white transition">
                  Sign In
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-3">Contact</h3>
            <p className="text-sm">support@sagitus.com</p>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs">
          © {new Date().getFullYear()} Sagitus. All rights reserved.
        </div>
      </div>
    </footer>
  )
}