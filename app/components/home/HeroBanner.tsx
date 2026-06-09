// app/components/home/HeroBanner.tsx
'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

interface Product {
  id: string
  name: string
  image_url: string | null
  images: string[]
}

interface OrderItem {
  product_id: string
  quantity: number
  products: Product | null
}

interface TopProduct {
  id: string
  name: string
  image_url: string | null
  images: string[]
  total_sold: number
}

const HEADLINES = [
  { eyebrow: 'Curated for', word: 'Bangladesh.' },
  { eyebrow: 'Heritage in', word: 'Every Detail.' },
  { eyebrow: 'Shop with', word: 'Transparency.' },
]

// Particle positions are deterministic so SSR/CSR don't mismatch
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  cx: ((i * 137.508) % 100),
  cy: ((i * 97.3) % 100),
  r: 1 + (i % 3) * 0.8,
  delay: (i * 0.4) % 6,
  duration: 3 + (i % 4),
  opacity: 0.12 + (i % 5) * 0.06,
}))

export default function HeroBanner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const [isHovering, setIsHovering] = useState(false)
  const [topProduct, setTopProduct] = useState<TopProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [headlineIndex, setHeadlineIndex] = useState(0)
  const [prevHeadlineIndex, setPrevHeadlineIndex] = useState<number | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [imageError, setImageError] = useState(false)
  const rafRef = useRef<number>()
  const targetPos = useRef({ x: 0.5, y: 0.5 })
  const currentPos = useRef({ x: 0.5, y: 0.5 })

  // Smooth cursor interpolation
  const animateMouse = useCallback(() => {
    const dx = targetPos.current.x - currentPos.current.x
    const dy = targetPos.current.y - currentPos.current.y
    if (Math.abs(dx) > 0.0005 || Math.abs(dy) > 0.0005) {
      currentPos.current.x += dx * 0.08
      currentPos.current.y += dy * 0.08
      setMousePos({ x: currentPos.current.x, y: currentPos.current.y })
    }
    rafRef.current = requestAnimationFrame(animateMouse)
  }, [])

  useEffect(() => {
    setMounted(true)
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  useEffect(() => {
    if (isTouchDevice) return
    rafRef.current = requestAnimationFrame(animateMouse)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isTouchDevice, animateMouse])

  useEffect(() => {
    const fetchTopProduct = async () => {
      const supabase = createBrowserClient()
      try {
        // Try RPC first (if it exists)
        const { data, error } = await supabase.rpc('get_top_selling_product')
        
        if (error || !data || data.length === 0) {
          // Fallback: query order_items directly
          const { data: ordersData, error: ordersError } = await supabase
            .from('order_items')
            .select(`product_id, quantity, products (id, name, image_url, images)`)
            .order('created_at', { ascending: false })
            .limit(500)
          
          if (ordersError) {
            console.error('Failed to fetch order items:', ordersError)
            setLoading(false)
            return
          }

          if (ordersData && ordersData.length > 0) {
            const productSales: Record<string, { sold: number; product: Product }> = {}
            
            ordersData.forEach((item) => {
              const productId = item.product_id
              if (!productSales[productId] && item.products) {
                productSales[productId] = { 
                  sold: 0, 
                  product: item.products[0] 
                }
              }
              if (productSales[productId]) {
                productSales[productId].sold += (item.quantity ?? 0)
              }
            })
            
            const sorted = Object.values(productSales).sort((a, b) => b.sold - a.sold)
            
            if (sorted.length > 0) {
              const top = sorted[0]
              setTopProduct({
                id: top.product.id,
                name: top.product.name,
                image_url: top.product.image_url,
                images: top.product.images || [],
                total_sold: top.sold,
              })
            }
          }
        } else if (data && data.length > 0) {
          setTopProduct(data[0])
        }
      } catch (err) {
        console.error('Failed to fetch top product:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchTopProduct()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setPrevHeadlineIndex(headlineIndex)
      setHeadlineIndex(prev => (prev + 1) % HEADLINES.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [headlineIndex])

  useEffect(() => {
    if (isTouchDevice) return
    
    const el = containerRef.current
    if (!el) return
    
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      targetPos.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      }
      setIsHovering(true)
    }
    
    const handleLeave = () => {
      targetPos.current = { x: 0.5, y: 0.5 }
      setIsHovering(false)
    }
    
    el.addEventListener('mousemove', handleMove)
    el.addEventListener('mouseleave', handleLeave)
    
    return () => {
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('mouseleave', handleLeave)
    }
  }, [isTouchDevice])

  const rotateX = (mousePos.y - 0.5) * -8
  const rotateY = (mousePos.x - 0.5) * 8
  const tx = (mousePos.x - 0.5) * 24
  const ty = (mousePos.y - 0.5) * 24
  
  const productImage = topProduct && !imageError 
    ? (topProduct.images?.[0] || topProduct.image_url) 
    : null

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden mb-12"
      style={{
        background: 'linear-gradient(135deg, #0d1f0f 0%, #0f2312 40%, #122815 70%, #0d1f0f 100%)',
        minHeight: 'clamp(520px, 65vh, 720px)',
        perspective: '1800px',
        boxShadow: '0 32px 80px rgba(10,30,12,0.7), 0 0 0 1px rgba(184,115,51,0.12)',
      }}
    >
      {/* ── Grain Texture Overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* ── Mesh Gradient Background ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute rounded-full blur-[160px]"
          style={{
            width: '70%', height: '80%',
            top: '-20%', right: '-10%',
            background: 'radial-gradient(ellipse, rgba(184,115,51,0.13) 0%, transparent 70%)',
            transform: isTouchDevice ? 'none' : `translate(${tx * -0.3}px, ${ty * -0.3}px)`,
            transition: 'transform 0.1s linear',
          }}
        />
        <div
          className="absolute rounded-full blur-[120px]"
          style={{
            width: '50%', height: '60%',
            bottom: '-10%', left: '-5%',
            background: 'radial-gradient(ellipse, rgba(56,143,60,0.1) 0%, transparent 70%)',
            transform: isTouchDevice ? 'none' : `translate(${tx * 0.2}px, ${ty * 0.2}px)`,
            transition: 'transform 0.1s linear',
          }}
        />
        <div
          className="absolute rounded-full blur-[200px]"
          style={{
            width: '40%', height: '40%',
            top: '30%', left: '30%',
            background: 'radial-gradient(ellipse, rgba(240,185,106,0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ── Grid Lines ── */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          opacity: 0.025,
          backgroundImage: `linear-gradient(rgba(240,185,106,1) 1px, transparent 1px), linear-gradient(90deg, rgba(240,185,106,1) 1px, transparent 1px)`,
          backgroundSize: '72px 72px',
        }}
      />

      {/* ── Dual Cursor Spotlight ── */}
      {!isTouchDevice && mounted && (
        <>
          <div
            className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-700"
            style={{
              opacity: isHovering ? 1 : 0,
              background: `radial-gradient(480px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(184,115,51,0.11), transparent 50%)`,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000"
            style={{
              opacity: isHovering ? 0.6 : 0,
              background: `radial-gradient(240px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(240,185,106,0.07), transparent 60%)`,
            }}
          />
        </>
      )}

      {/* ════════════════════════════════════════
          LEFT — Copy Column
      ════════════════════════════════════════ */}
      <div className="relative z-10 flex h-full items-center">
        <div className="px-6 md:px-12 lg:px-16 py-12 md:py-16 lg:py-20 w-full md:w-[52%] flex flex-col justify-center">

          {/* Eyebrow Tag */}
          <div
            className="inline-flex items-center gap-2.5 mb-6 md:mb-8"
            style={{ 
              animation: mounted ? 'heroFadeUp 0.7s ease both' : 'none', 
              animationDelay: '0ms' 
            }}
          >
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-[#B87333] animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#F0B96A]" />
              <div className="w-1 h-1 rounded-full bg-[#B87333] animate-pulse" style={{ animationDelay: '0.3s' }} />
            </div>
            <span
              className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.3em] font-sans"
              style={{ color: '#D4954A' }}
            >
              The Bushal Collection
            </span>
            <div className="h-px flex-1 max-w-[40px]" style={{ background: 'linear-gradient(to right, rgba(184,115,51,0.8), transparent)' }} />
          </div>

          {/* Headline — crossfade between states */}
          <div
            className="mb-6 md:mb-8 lg:mb-10"
            style={{ 
              animation: mounted ? 'heroFadeUp 0.7s ease both' : 'none', 
              animationDelay: '80ms' 
            }}
          >
            {/* Eyebrow line */}
            <div className="relative overflow-visible h-[1.6em] mb-1">
              {HEADLINES.map((h, i) => (
                <p
                  key={i}
                  className="absolute inset-0 text-base md:text-xl lg:text-2xl font-sans font-light tracking-wide transition-all duration-700 ease-in-out"
                  style={{
                    color: 'rgba(240,232,210,0.6)',
                    opacity: i === headlineIndex ? 1 : 0,
                    transform: i === headlineIndex ? 'translateY(0)' : i === prevHeadlineIndex ? 'translateY(-100%)' : 'translateY(100%)',
                  }}
                >
                  {h.eyebrow}
                </p>
              ))}
            </div>

            {/* Hero word — large, dramatic */}
            <div
              className="overflow-visible relative"
              style={{ lineHeight: 1.2, paddingTop: '.08em' }}
            >
              {HEADLINES.map((h, i) => (
                <h1
                  key={i}
                  className="absolute left-0 top-0 font-serif font-bold transition-all duration-700 ease-in-out whitespace-nowrap"
                  style={{
                    fontSize: 'clamp(3rem, 7vw, 6.5rem)',
                    letterSpacing: '-0.02em',
                    background: 'linear-gradient(135deg, #F0B96A 0%, #D4954A 40%, #F0E8D2 80%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    opacity: i === headlineIndex ? 1 : 0,
                    transform: i === headlineIndex ? 'translateY(0) skewX(0deg)' : i === prevHeadlineIndex ? 'translateY(-110%)' : 'translateY(110%)',
                  }}
                >
                  {h.word}
                </h1>
              ))}
              {/* Spacer to hold height */}
              <h1
                className="font-serif font-bold invisible"
                style={{ fontSize: 'clamp(3rem, 7vw, 6.5rem)', letterSpacing: '-0.02em' }}
                aria-hidden
              >
                {HEADLINES[0].word}
              </h1>
            </div>
          </div>

          {/* Description */}
          <p
            className="text-sm md:text-base leading-relaxed max-w-[420px] mb-8 md:mb-10 font-sans"
            style={{
              color: 'rgba(240,232,210,0.5)',
              animation: mounted ? 'heroFadeUp 0.7s ease both' : 'none',
              animationDelay: '160ms',
            }}
          >
            Handpicked, heritage-quality goods delivered across Bangladesh. Transparent pricing. Genuine care. Every single detail.
          </p>

          {/* CTA Row */}
          <div
            className="flex flex-wrap items-center gap-3 md:gap-4 mb-10 md:mb-12"
            style={{ 
              animation: mounted ? 'heroFadeUp 0.7s ease both' : 'none', 
              animationDelay: '240ms' 
            }}
          >
            <Link
              href="#products"
              className="group/p relative inline-flex items-center gap-2.5 overflow-visible rounded-xl font-semibold font-sans text-sm px-6 md:px-8 py-3.5 md:py-4"
              style={{
                background: 'linear-gradient(135deg, #C07840 0%, #A0622E 100%)',
                color: '#F0E8D2',
                boxShadow: '0 8px 32px rgba(184,115,51,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              {/* Shine sweep */}
              <span
                className="absolute inset-0 -translate-x-full group-hover/p:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
              />
              <span className="relative z-10">Explore Collection</span>
              <svg
                className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover/p:translate-x-1"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>

            <Link
              href="/orders"
              className="group/t inline-flex items-center gap-2 rounded-xl font-medium font-sans text-sm px-5 md:px-6 py-3.5 md:py-4 backdrop-blur-sm transition-all duration-300"
              style={{
                color: 'rgba(240,232,210,0.7)',
                border: '1px solid rgba(240,232,210,0.15)',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(240,232,210,0.06)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(240,232,210,0.3)'
                ;(e.currentTarget as HTMLElement).style.color = 'rgba(240,232,210,0.9)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(240,232,210,0.15)'
                ;(e.currentTarget as HTMLElement).style.color = 'rgba(240,232,210,0.7)'
              }}
            >
              <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover/t:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Track Order
            </Link>
          </div>

          {/* Trust Strip */}
          <div
            className="flex flex-wrap items-center gap-5 md:gap-8 pt-6 md:pt-8"
            style={{
              borderTop: '1px solid rgba(240,232,210,0.08)',
              animation: mounted ? 'heroFadeUp 0.7s ease both' : 'none',
              animationDelay: '320ms',
            }}
          >
            {[
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                ),
                label: 'Secure bKash',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                ),
                label: 'Free Delivery ৳1000+',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                ),
                label: '4.9 / 5 Rating',
              },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#D4954A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {icon}
                </svg>
                <span className="text-[10px] md:text-[11px] font-medium font-sans" style={{ color: 'rgba(240,232,210,0.45)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════
            RIGHT — Product Visual Column (desktop)
        ════════════════════════════════════════ */}
        <div className="absolute right-0 top-0 bottom-0 w-[52%] hidden md:flex items-center justify-center pointer-events-none">
          <div
            className="relative transition-transform duration-300 ease-out"
            style={{
              width: 'clamp(340px, 38vw, 520px)',
              height: 'clamp(340px, 38vw, 520px)',
              transform: isTouchDevice ? 'none' : `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* ── Particle Field (SVG, behind everything) ── */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: 'translateZ(-60px)', opacity: 0.7 }}
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
            >
              {PARTICLES.map(p => (
                <circle
                  key={p.id}
                  cx={p.cx}
                  cy={p.cy}
                  r={p.r * 0.4}
                  fill="#F0B96A"
                  opacity={p.opacity}
                  style={{
                    animation: `particlePulse ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
                  }}
                />
              ))}
            </svg>

            {/* ── Orbit Ring 3 — outermost, slow ── */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: '1px solid rgba(184,115,51,0.12)',
                transform: 'translateZ(-30px)',
                animation: 'orbitSpin 60s linear infinite',
              }}
            >
              <div
                className="absolute"
                style={{
                  top: '4%', left: '50%', transform: 'translate(-50%,-50%)',
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'radial-gradient(circle, #F0B96A, #C07840)',
                  boxShadow: '0 0 12px 4px rgba(240,185,106,0.5)',
                }}
              />
              <div
                className="absolute"
                style={{
                  bottom: '4%', left: '50%', transform: 'translate(-50%,50%)',
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'rgba(184,115,51,0.6)',
                }}
              />
            </div>

            {/* ── Orbit Ring 2 — mid, reverse ── */}
            <div
              className="absolute inset-[6%] rounded-full"
              style={{
                border: '1px dashed rgba(240,185,106,0.1)',
                transform: 'translateZ(-10px)',
                animation: 'orbitSpin 40s linear infinite reverse',
              }}
            >
              <div
                className="absolute"
                style={{
                  top: '2%', right: '12%',
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'rgba(240,185,106,0.45)',
                  boxShadow: '0 0 6px 2px rgba(240,185,106,0.3)',
                }}
              />
            </div>

            {/* ── Central Image Frame ── */}
            <div
              className="absolute inset-[13%] rounded-full overflow-hidden"
              style={{
                transform: 'translateZ(50px)',
                background: 'rgba(13,31,15,0.6)',
                backdropFilter: 'blur(2px)',
                boxShadow: `
                  0 0 0 1px rgba(184,115,51,0.25),
                  0 0 0 8px rgba(13,31,15,0.4),
                  0 0 0 9px rgba(184,115,51,0.08),
                  0 32px 80px rgba(0,0,0,0.6),
                  inset 0 1px 0 rgba(240,185,106,0.15)
                `,
              }}
            >
              {/* Lens flare arc at top */}
              <div
                className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none z-10"
                style={{
                  background: 'linear-gradient(180deg, rgba(240,185,106,0.08) 0%, transparent 100%)',
                  borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
                }}
              />

              {productImage ? (
                <Link
                  href={`/product/${topProduct!.id}`}
                  className="block w-full h-full relative group/img pointer-events-auto"
                >
                  <img
                    src={productImage}
                    alt={topProduct!.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/img:scale-110"
                    style={{ filter: 'brightness(0.95) contrast(1.05) saturate(1.1)' }}
                    onError={() => setImageError(true)}
                  />
                  {/* Vignette */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(circle at 50% 50%, transparent 50%, rgba(10,24,12,0.5) 100%)' }}
                  />
                  {/* Best seller badge */}
                  <div
                    className="absolute bottom-[14%] left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                  >
                    <div
                      className="flex items-center gap-1.5 rounded-full px-3 py-1"
                      style={{
                        background: 'rgba(10,24,12,0.75)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(184,115,51,0.35)',
                      }}
                    >
                      <svg className="w-3 h-3" style={{ color: '#F0B96A' }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] font-sans" style={{ color: '#F0B96A' }}>
                        Best Seller
                      </span>
                      <span className="text-[9px] font-sans" style={{ color: 'rgba(240,232,210,0.5)' }}>
                        · {topProduct!.total_sold} sold
                      </span>
                    </div>
                  </div>
                </Link>
              ) : loading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div
                    className="w-12 h-12 rounded-full animate-spin"
                    style={{ border: '2px solid rgba(184,115,51,0.2)', borderTopColor: '#C07840' }}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span
                    className="font-serif font-bold"
                    style={{
                      fontSize: '5rem',
                      background: 'linear-gradient(135deg, #F0B96A, #D4954A)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    B
                  </span>
                </div>
              )}
            </div>

            {/* ── Floating Cards ── */}

            {/* Card A — top-left: Premium Quality */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: '6%', left: '-4%',
                transform: isTouchDevice ? 'translateZ(90px)' : `translateZ(90px) translate(${tx * -1.8}px, ${ty * -1.8}px)`,
                transition: 'transform 0.1s linear',
                animation: mounted ? 'floatA 6s ease-in-out infinite' : 'none',
              }}
            >
              <div
                className="rounded-2xl px-3 py-2.5 md:px-4 md:py-3"
                style={{
                  background: 'rgba(13,31,15,0.8)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(184,115,51,0.25)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
                  minWidth: 120,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(184,115,51,0.2)' }}
                  >
                    <svg className="w-3.5 h-3.5" style={{ color: '#F0B96A' }} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider font-sans" style={{ color: 'rgba(240,232,210,0.85)' }}>
                    Premium
                  </span>
                </div>
                <p className="text-[10px] leading-snug font-sans" style={{ color: 'rgba(240,232,210,0.45)' }}>
                  Heritage-grade goods
                </p>
              </div>
            </div>

            {/* Card B — bottom-right: Live Status */}
            <div
              className="absolute pointer-events-none"
              style={{
                bottom: '4%', right: '-6%',
                transform: isTouchDevice ? 'translateZ(70px)' : `translateZ(70px) translate(${tx * 1.6}px, ${ty * 1.6}px)`,
                transition: 'transform 0.1s linear',
                animation: mounted ? 'floatB 7s ease-in-out infinite' : 'none',
              }}
            >
              <div
                className="rounded-2xl px-3 py-2.5 md:px-4 md:py-3"
                style={{
                  background: 'rgba(13,31,15,0.85)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(184,115,51,0.2)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
                  minWidth: 130,
                }}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-sans" style={{ color: '#D4954A' }}>
                    Live Status
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[8px] font-bold font-sans text-emerald-400">ONLINE</span>
                  </div>
                </div>
                <p className="text-[10px] font-sans" style={{ color: 'rgba(240,232,210,0.4)' }}>
                  Orders shipping now
                </p>
              </div>
            </div>

            {/* Card C — top-right: bKash */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: '18%', right: '-8%',
                transform: isTouchDevice ? 'translateZ(110px)' : `translateZ(110px) translate(${tx * 2.2}px, ${ty * 2.2}px)`,
                transition: 'transform 0.1s linear',
                animation: mounted ? 'floatC 5s ease-in-out infinite' : 'none',
              }}
            >
              <div
                className="rounded-xl px-2.5 py-2"
                style={{
                  background: 'rgba(200,0,80,0.15)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(200,0,80,0.25)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                }}
              >
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] font-sans text-center" style={{ color: '#F48FB1' }}>
                  bKash
                </p>
                <p className="text-[8px] font-sans text-center mt-0.5" style={{ color: 'rgba(240,232,210,0.5)' }}>
                  Secure Pay
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          MOBILE — Product Visual (≤md)
      ════════════════════════════════════════ */}
      <div className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 160, height: 160 }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{ border: '1px solid rgba(184,115,51,0.15)', animation: 'orbitSpin 60s linear infinite' }}
        />
        <div
          className="absolute inset-[12%] rounded-full overflow-hidden"
          style={{
            boxShadow: '0 0 0 1px rgba(184,115,51,0.2), 0 16px 40px rgba(0,0,0,0.5)',
          }}
        >
          {productImage ? (
            <Link href={`/product/${topProduct!.id}`} className="block w-full h-full pointer-events-auto">
              <img 
                src={productImage} 
                alt={topProduct!.name} 
                className="w-full h-full object-cover" 
                onError={() => setImageError(true)}
              />
              <div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(circle at 50% 50%, transparent 50%, rgba(10,24,12,0.45) 100%)' }}
              />
            </Link>
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: '#0d1f0f' }}>
              <span className="font-serif font-bold text-3xl" style={{ color: '#D4954A' }}>B</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Keyframe injector ── */}
      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes orbitSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes particlePulse {
          from { opacity: 0.12; r: 0.4; }
          to   { opacity: 0.36; r: 0.7; }
        }
        @keyframes floatA {
          0%, 100% { margin-top: 0px; }
          50%       { margin-top: -8px; }
        }
        @keyframes floatB {
          0%, 100% { margin-bottom: 0px; }
          50%       { margin-bottom: -10px; }
        }
        @keyframes floatC {
          0%, 100% { margin-top: 0px; }
          50%       { margin-top: 6px; }
        }
      `}</style>
    </div>
  )
}