/**
 * 回到顶部浮动按钮
 * 滚动超过 300px 后出现，GSAP bounce 动画
 */

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ArrowUp } from 'lucide-react'

export function ScrollToTopButton() {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [visible, setVisible] = useState(false)
  const ticking = useRef(false)

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const show = window.scrollY > 300
        setVisible((prev) => {
          if (prev !== show) return show
          return prev
        })
        ticking.current = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const btn = btnRef.current
    if (!btn) return

    if (visible) {
      gsap.to(btn, {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        ease: 'back.out(2)',
        pointerEvents: 'auto',
        overwrite: 'auto',
      })
    } else {
      gsap.to(btn, {
        opacity: 0,
        scale: 0.7,
        duration: 0.25,
        ease: 'power2.in',
        pointerEvents: 'none',
        overwrite: 'auto',
      })
    }
  }, [visible])

  const scrollToTop = () => {
    gsap.to(window, {
      scrollTo: { y: 0, autoKill: false },
      duration: 0.9,
      ease: 'power3.inOut',
    })
  }

  return (
    <button
      ref={btnRef}
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.1] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.14] shadow-lg hover:shadow-xl transition-colors"
      style={{ opacity: 0, scale: 0.7, pointerEvents: 'none' }}
      aria-label="回到顶部"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}
