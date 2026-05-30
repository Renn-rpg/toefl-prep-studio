/**
 * 可复用 GSAP Hooks
 *
 * useGsapEnter     — 元素入场动画 (fade + slide)
 * useGsapScroll    — ScrollTrigger 驱动的滚动揭示
 * useGsapCounter   — 数字平滑计数动画
 * useGsapTimeline  — GSAP timeline 序列动画
 * useGsapFloat     — 装饰性悬浮动画
 */

import { useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// ═══════════════════════════════════════
// useGsapEnter — 入场动画
// ═══════════════════════════════════════

interface EnterOptions {
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  delay?: number
  triggerOnce?: boolean // 是否仅触发一次(scroll场景)
}

export function useGsapEnter<T extends HTMLElement = HTMLDivElement>(options: EnterOptions = {}) {
  const ref = useRef<T>(null)
  const ctx = useRef<gsap.Context | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const { from = {}, to = {}, delay = 0 } = options

    const defaultFrom: gsap.TweenVars = { opacity: 0, y: 24 }
    const defaultTo: gsap.TweenVars = { opacity: 1, y: 0, duration: 0.7, delay }

    ctx.current = gsap.context(() => {
      gsap.fromTo(el, { ...defaultFrom, ...from }, { ...defaultTo, ...to })
    })

    return () => ctx.current?.revert()
  }, [])

  return { ref }
}

// ═══════════════════════════════════════
// useGsapScroll — 滚动触发揭示
// ═══════════════════════════════════════

interface ScrollRevealOptions {
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  trigger?: Element | string
  start?: string
  markers?: boolean
}

export function useGsapScroll<T extends HTMLElement = HTMLDivElement>(options: ScrollRevealOptions = {}) {
  const ref = useRef<T>(null)
  const st = useRef<ScrollTrigger | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const {
      from = { opacity: 0, y: 40 },
      to = { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
      trigger,
      start = 'top 85%',
    } = options

    st.current = ScrollTrigger.create({
      trigger: trigger ?? el,
      start,
      onEnter: () => {
        gsap.fromTo(el, from as gsap.TweenVars, to as gsap.TweenVars)
      },
      once: true,
    })

    return () => st.current?.kill()
  }, [])

  return { ref }
}

// ═══════════════════════════════════════
// useGsapCounter — 数字计数动画
// ═══════════════════════════════════════

interface CounterOptions {
  duration?: number
  ease?: string
  delay?: number
  decimals?: number
}

export function useGsapCounter<T extends HTMLElement = HTMLSpanElement>(
  targetValue: number,
  options: CounterOptions = {},
) {
  const ref = useRef<T>(null)
  const ctx = useRef<gsap.Context | null>(null)
  const currentValue = useRef(0)

  const { duration = 1.5, ease = 'power3.out', delay = 0, decimals = 0 } = options

  useEffect(() => {
    const el = ref.current
    if (!el) return

    ctx.current?.revert()

    ctx.current = gsap.context(() => {
      gsap.fromTo(
        { val: currentValue.current },
        { val: targetValue },
        {
          val: targetValue,
          duration,
          ease,
          delay,
          snap: { val: decimals === 0 ? 1 : Number(`0.${'0'.repeat(decimals - 1)}1`) },
          onUpdate: function () {
            if (el) {
              const v = this.targets()[0]?.val ?? 0
              el.textContent = decimals > 0 ? v.toFixed(decimals) : String(Math.round(v))
            }
          },
          onComplete: () => {
            currentValue.current = targetValue
          },
        },
      )
    })

    return () => ctx.current?.revert()
  }, [targetValue, duration, ease, delay, decimals])

  return { ref }
}

// ═══════════════════════════════════════
// useGsapTimeline — Timeline 序列
// ═══════════════════════════════════════

type TimelineStep = (tl: gsap.core.Timeline) => void

export function useGsapTimeline(steps: TimelineStep[], deps: unknown[] = []) {
  const ctx = useRef<gsap.Context | null>(null)

  useEffect(() => {
    ctx.current?.revert()

    ctx.current = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      steps.forEach((step) => step(tl))
    })

    return () => ctx.current?.revert()
  }, deps)

  const exec = useCallback((callback: (ctx: gsap.Context) => void) => {
    ctx.current = gsap.context(callback)
  }, [])

  return { exec }
}

// ═══════════════════════════════════════
// useGsapFloat — 装饰性悬浮动画
// ═══════════════════════════════════════

interface FloatOptions {
  y?: number
  duration?: number
  ease?: string
}

export function useGsapFloat<T extends HTMLElement = HTMLDivElement>(options: FloatOptions = {}) {
  const ref = useRef<T>(null)
  const ctx = useRef<gsap.Context | null>(null)

  const { y = 8, duration = 3, ease = 'sine.inOut' } = options

  useEffect(() => {
    const el = ref.current
    if (!el) return

    ctx.current = gsap.context(() => {
      gsap.to(el, {
        y,
        duration,
        ease,
        repeat: -1,
        yoyo: true,
      })
    })

    return () => ctx.current?.revert()
  }, [y, duration, ease])

  return { ref }
}

// ═══════════════════════════════════════
// useGsapShake — 震动动画
// ═══════════════════════════════════════

export function useGsapShake<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const ctx = useRef<gsap.Context | null>(null)

  const shake = useCallback((intensity = 8, duration = 0.5) => {
    const el = ref.current
    if (!el) return

    ctx.current?.revert()
    ctx.current = gsap.context(() => {
      gsap.to(el, {
        x: [0, -intensity, intensity, -intensity * 0.75, intensity * 0.75, -intensity * 0.4, intensity * 0.4, 0] as unknown as gsap.TweenValue,
        duration,
        ease: 'power4.out',
      })
    })
  }, [])

  useEffect(() => {
    return () => ctx.current?.revert()
  }, [])

  return { ref, shake }
}
