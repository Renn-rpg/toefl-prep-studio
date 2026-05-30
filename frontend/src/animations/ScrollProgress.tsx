/**
 * 全局滚动进度条
 * 使用 GSAP ScrollTrigger 驱动，品牌渐变色
 */

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    const st = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        gsap.set(bar, { scaleX: self.progress })
      },
    })

    return () => st.kill()
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[3px] pointer-events-none">
      <div
        ref={barRef}
        className="h-full origin-left"
        style={{
          transform: 'scaleX(0)',
          background: 'linear-gradient(90deg, #6366F1, #A78BFA, #EC4899)',
          boxShadow: '0 0 12px rgba(99,102,241,0.5), 0 0 4px rgba(236,72,153,0.3)',
        }}
      />
    </div>
  )
}
