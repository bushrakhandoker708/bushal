//app/components/home/HeroBanner.tsx

'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

export default function HeroBanner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const float1Ref = useRef<HTMLDivElement>(null)
  const float2Ref = useRef<HTMLDivElement>(null)
  const glow1Ref = useRef<HTMLDivElement>(null)
  const glow2Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    const card = cardRef.current
    const float1 = float1Ref.current
    const float2 = float2Ref.current
    const glow1 = glow1Ref.current
    const glow2 = glow2Ref.current

    if (!el) return

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      
      const rotateX = (y - 0.5) * -12
      const rotateY = (x - 0.5) * 12

      if (card) {
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0px)`
      }
      if (float1) {
        float1.style.transform = `translate3d(${(x - 0.5) * -20}px, ${(y - 0.5) * -20}px, 40px)`
      }
      if (float2) {
        float2.style.transform = `translate3d(${(x - 0.5) * 25}px, ${(y - 0.5) * 25}px, 60px)`
      }
      if (glow1) {
        glow1.style.transform = `translate3d(${(x - 0.5) * -40}px, ${(y - 0.5) * -40}px, 0px)`
      }
      if (glow2) {
        glow2.style.transform = `translate3d(${(x - 0.5) * 30}px, ${(y - 0.5) * 30}px, 0px)`
      }
    }

    const onLeave = () => {
      if (card) card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)`
      if (float1) float1.style.transform = `translate3d(0px, 0px, 40px)`
      if (float2) float2.style.transform = `translate3d(0px, 0px, 60px)`
      if (glow1) glow1.style.transform = `translate3d(0px, 0px, 0px)`
      if (glow2) glow2.style.transform = `translate3d(0px, 0px, 0px)`
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-3xl bg-bushal-forest min-h-[450px] md:min-h-[550px] flex items-center mb-12 border border-bushal-forestMid/30 shadow-2xl shadow-bushal-forest/20"
    >
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F0B96A" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>

      <div 
        ref={glow1Ref}
        className="absolute w-[500px] h-[500px] rounded-full bg-bushal-copper/10 blur-[100px] transition-transform duration-700 ease-out pointer-events-none"
        style={{ top: '30%', right: '10%' }}
      />
      <div 
        ref={glow2Ref}
        className="absolute w-[300px] h-[300px] rounded-full bg-bushal-forestLight/20 blur-[80px] transition-transform duration-700 ease-out pointer-events-none"
        style={{ bottom: '10%', left: '20%' }}
      />

      <div className="relative z-10 px-8 md:px-14 py-12 md:py-16 max-w-2xl">
        <div className="flex items-center gap-3 mb-6 animate-fade-up">
          <div className="h-px w-8 bg-bushal-copper" />
          <p className="text-bushal-copperGlow text-[11px] font-semibold uppercase tracking-[0.2em] font-body">
            The Bushal Collection
          </p>
        </div>
        
        <h1 className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <span className="block text-bushal-ivory/80 text-lg md:text-xl font-body font-medium tracking-wide mb-2">
            Discover the
          </span>
          <span 
            className="block text-5xl md:text-7xl font-heading font-semibold text-bushal-ivory leading-[1.1] tracking-tight"
          >
            Extraordinary.
          </span>
        </h1>

        <p className="text-bushal-ivory/50 text-base md:text-lg leading-relaxed mt-6 mb-10 max-w-md font-body animate-fade-up" style={{ animationDelay: '200ms' }}>
          Handpicked, heritage-quality goods delivered across Bangladesh. 
          Experience transparent pricing and genuine care in every detail.
        </p>

        <div className="flex flex-wrap items-center gap-4 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <Link
            href="#products"
            className="group relative inline-flex items-center gap-2 bg-bushal-copper text-bushal-ivory text-sm font-semibold font-body px-7 py-3.5 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-bushal-copper/30 hover:-translate-y-0.5 active:scale-95"
          >
            <span className="relative z-10">Explore Collection</span>
            <svg className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-r from-bushal-copperLight to-bushal-copper opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          
          <Link
            href="/orders"
            className="group inline-flex items-center gap-2 text-bushal-ivory/70 hover:text-bushal-ivory text-sm font-medium font-body px-5 py-3.5 rounded-xl border border-bushal-ivory/10 hover:border-bushal-ivory/30 hover:bg-bushal-ivory/5 transition-all duration-300"
          >
            Track Order
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:flex items-center justify-center pr-16 pointer-events-none">
        <div 
          ref={cardRef}
          className="relative w-72 h-96 transition-transform duration-200 ease-out will-change-transform"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="absolute inset-0 bg-bushal-ivory rounded-2xl shadow-2xl shadow-black/40 overflow-hidden border border-bushal-copper/20">
            <div className="absolute inset-0 bg-ivory-grain opacity-40 mix-blend-multiply pointer-events-none" />
            
            <div className="relative h-full flex flex-col items-center justify-between p-8 text-center">
              <div className="mt-4">
                <svg width="60" height="60" viewBox="0 0 100 100" className="text-bushal-copper">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1" />
                  <path d="M50 25 L55 40 L70 40 L58 50 L62 65 L50 55 L38 65 L42 50 L30 40 L45 40 Z" fill="currentColor" />
                </svg>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-4 -mt-8">
                <div className="h-px w-12 bg-bushal-copper/40" />
                <h2 className="text-3xl font-heading font-bold text-bushal-forest leading-tight">
                  Curated <br/> with Care
                </h2>
                <p className="text-xs text-bushal-inkSoft font-body uppercase tracking-widest">
                  Est. 2026 · Dhaka
                </p>
                <div className="h-px w-12 bg-bushal-copper/40" />
              </div>

              <div className="mb-2 px-4 py-2 bg-bushal-forest/5 rounded-full border border-bushal-forest/10">
                <p className="text-[10px] font-bold text-bushal-forest uppercase tracking-wider font-body">
                  No. 001
                </p>
              </div>
            </div>
          </div>

          <div 
            ref={float1Ref}
            className="absolute -top-6 -left-6 w-24 h-24 bg-bushal-ivory/90 backdrop-blur-md rounded-2xl border border-bushal-copper/30 flex items-center justify-center shadow-lg transition-transform duration-300 ease-out"
            style={{ transform: 'translate3d(0px, 0px, 40px)' }}
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-bushal-forest font-heading">4.9</p>
              <p className="text-[9px] text-bushal-inkSoft uppercase tracking-wider font-body">Rating</p>
            </div>
          </div>

          <div 
            ref={float2Ref}
            className="absolute -bottom-4 -right-8 w-28 h-16 bg-bushal-forest backdrop-blur-md rounded-xl border border-bushal-copper/40 flex items-center justify-center shadow-lg transition-transform duration-300 ease-out"
            style={{ transform: 'translate3d(0px, 0px, 60px)' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-bushal-copperGlow animate-pulse" />
              <p className="text-[10px] font-bold text-bushal-ivory uppercase tracking-wider font-body">Live</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}