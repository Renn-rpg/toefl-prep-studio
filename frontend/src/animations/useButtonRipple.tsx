/**
 * 按钮点击波纹效果 Hook
 *
 * 用法:
 *   const { rippleProps, RippleContainer } = useButtonRipple()
 *   <button {...rippleProps} className="relative overflow-hidden">
 *     {RippleContainer}
 *     点击我
 *   </button>
 */

import { useCallback, useState, useRef, type ReactNode, type MouseEvent } from 'react'
import gsap from 'gsap'

interface RippleDot {
  id: number
  x: number
  y: number
  size: number
}

export function useButtonRipple() {
  const [ripples, setRipples] = useState<RippleDot[]>([])
  const idRef = useRef(0)
  const ctxRef = useRef<gsap.Context | null>(null)

  const handleClick = useCallback((e: MouseEvent<HTMLElement>) => {
    const btn = e.currentTarget
    const rect = btn.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    const id = ++idRef.current

    setRipples((prev) => [...prev.slice(-2), { id, x, y, size }])

    // GSAP 动画
    requestAnimationFrame(() => {
      const el = btn.querySelector(`[data-ripple-id="${id}"]`)
      if (el) {
        ctxRef.current = gsap.context(() => {
          gsap.fromTo(
            el,
            { scale: 0, opacity: 0.5 },
            {
              scale: 1,
              opacity: 0,
              duration: 0.7,
              ease: 'power3.out',
              onComplete: () => {
                setRipples((prev) => prev.filter((r) => r.id !== id))
              },
            },
          )
        })
      }
    })
  }, [])

  const RippleContainer: ReactNode = ripples.map((r) => (
    <span
      key={r.id}
      data-ripple-id={r.id}
      className="absolute rounded-full bg-white/20 pointer-events-none"
      style={{
        left: r.x,
        top: r.y,
        width: r.size,
        height: r.size,
      }}
    />
  ))

  return {
    rippleHandlers: { onClick: handleClick },
    RippleContainer,
  }
}
