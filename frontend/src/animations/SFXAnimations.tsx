/**
 * 音效配对视觉动画
 *
 * 正确回答 → 绿色发光脉冲
 * 错误回答 → 红色边框闪烁
 */

import { useCallback, useRef } from 'react'
import gsap from 'gsap'

export function useSFXAnimations() {
  const ctx = useRef<gsap.Context | null>(null)

  const flashCorrect = useCallback((element: HTMLElement) => {
    ctx.current?.revert()
    ctx.current = gsap.context(() => {
      const tl = gsap.timeline()
      // 发光脉冲
      tl.to(element, {
        boxShadow: '0 0 40px rgba(16,185,129,0.5), inset 0 0 20px rgba(16,185,129,0.15)',
        borderColor: 'rgba(16,185,129,0.6)',
        duration: 0.15,
        ease: 'power2.out',
      })
      tl.to(element, {
        boxShadow: '0 0 0px rgba(16,185,129,0), inset 0 0 0px rgba(16,185,129,0)',
        borderColor: 'rgba(255,255,255,0.07)',
        duration: 0.5,
        ease: 'power3.out',
      })
    })
  }, [])

  const flashError = useCallback((element: HTMLElement) => {
    ctx.current?.revert()
    ctx.current = gsap.context(() => {
      const tl = gsap.timeline()
      tl.to(element, {
        boxShadow: '0 0 30px rgba(239,68,68,0.4), inset 0 0 15px rgba(239,68,68,0.1)',
        borderColor: 'rgba(239,68,68,0.5)',
        duration: 0.12,
        ease: 'power2.out',
      })
      tl.to(element, {
        boxShadow: '0 0 0px rgba(239,68,68,0), inset 0 0 0px rgba(239,68,68,0)',
        borderColor: 'rgba(255,255,255,0.07)',
        duration: 0.45,
        ease: 'power3.out',
      })
    })
  }, [])

  return { flashCorrect, flashError }
}
