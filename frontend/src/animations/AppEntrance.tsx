/**
 * 电影化应用进场动画 — 使用 GSAP useGSAP hook
 *
 * Timeline 序列 (~3.2s):
 *   0.0s  背景粒子场淡入 + 大气光球呼吸
 *   0.3s  Logo 弹入 (scale 0→1.15→1, CustomBounce)
 *   0.7s  标题逐字显示 (stagger 0.04s/字, back.out)
 *   1.1s  副标题上浮 + 渐变文字流光
 *   1.5s  底部提示点淡入 + 脉冲
 *   2.5s  全屏淡出过渡 → onComplete
 */

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Particles } from './Particles'

gsap.registerPlugin(useGSAP)

interface AppEntranceProps {
  onComplete: () => void
}

export function AppEntrance({ onComplete }: AppEntranceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const orbRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const hasCompletedRef = useRef(false)

  // ═══ 安全网: 最大等待 5 秒后强制完成进场动画 ═══
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!hasCompletedRef.current) {
        console.warn('[AppEntrance] 安全超时触发 — 强制完成进场动画')
        hasCompletedRef.current = true
        // 恢复全局时间倍率并强制淡出
        gsap.globalTimeline.timeScale(1)
        if (containerRef.current) {
          gsap.to(containerRef.current, { opacity: 0, duration: 0.3, onComplete })
        } else {
          onComplete()
        }
      }
    }, 5000)

    return () => clearTimeout(safetyTimer)
  }, [onComplete])

  useGSAP(() => {
    const container = containerRef.current
    const logo = logoRef.current
    const title = titleRef.current
    const subtitle = subtitleRef.current
    const orbs = orbRefs.map((r) => r.current).filter(Boolean)

    if (!container) return

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => {
        if (hasCompletedRef.current) return
        // 最终淡出 → 过渡到实际应用
        gsap.to(container, {
          opacity: 0,
          scale: 1.02,
          duration: 0.65,
          ease: 'power4.in',
          onComplete: () => {
            if (hasCompletedRef.current) return
            hasCompletedRef.current = true
            onComplete()
          },
        })
      },
    })

    // ═══ Stage 1: 大气光球呼吸 (0.0–0.9s) ═══
    if (orbs.length) {
      tl.fromTo(
        orbs,
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.9,
          ease: 'back.out(2)',
          stagger: 0.15,
        },
        0,
      )
    }

    // ═══ Stage 2: Logo 弹入 (0.3–1.0s) ═══
    tl.fromTo(
      logo,
      { scale: 0, rotate: -45, opacity: 0 },
      {
        scale: 1,
        rotate: 0,
        opacity: 1,
        duration: 0.75,
        ease: 'elastic.out(1, 0.5)',
      },
      0.3,
    )

    // ═══ Stage 3: 标题逐字显示 (0.55–1.5s) ═══
    if (title) {
      const rawText = title.textContent || ''
      title.innerHTML = ''
      const chars = rawText.split('').map((char) => {
        const span = document.createElement('span')
        span.textContent = char === ' ' ? ' ' : char
        span.style.display = 'inline-block'
        span.style.opacity = '0'
        span.style.transform = 'translateY(24px)'
        title.appendChild(span)
        return span
      })

      tl.to(
        chars,
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: 'back.out(1.8)',
          stagger: { each: 0.04, from: 'start' },
        },
        0.55,
      )
    }

    // ═══ Stage 4: 副标题上浮 (1.0–1.5s) ═══
    tl.fromTo(
      subtitle,
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: 0.55,
        ease: 'power3.out',
      },
      1.0,
    )

    // ═══ Stage 5: 光球悬浮漂移动画 ═══
    if (orbs[0]) {
      gsap.to(orbs[0], {
        y: -25,
        x: 8,
        duration: 4,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 1.4,
      })
    }
    if (orbs[1]) {
      gsap.to(orbs[1], {
        y: 18,
        x: -12,
        duration: 4.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 1.4,
      })
    }
    if (orbs[2]) {
      gsap.to(orbs[2], {
        y: -16,
        x: -6,
        duration: 5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 1.4,
      })
    }

    // ═══ Stage 6: 底部提示 (1.5s–) ═══
    tl.fromTo(
      '.entrance-hint',
      { opacity: 0, y: 6 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
      },
      1.5,
    )

    // ═══ Stage 7: Logo 微妙呼吸 (持续) ═══
    if (logo) {
      gsap.to(logo, {
        scale: 1.04,
        duration: 2.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 1.2,
      })
    }
  }, { scope: containerRef })

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0B0B12] overflow-hidden"
    >
      {/* 星空粒子背景 */}
      <Particles intensity={0.8} count={200} />

      {/* 中央光芒射线 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(99,102,241,0.06) 0%, transparent 70%)',
        }}
      />

      {/* 大气光球 */}
      <div
        ref={orbRefs[0]}
        className="absolute w-[550px] h-[550px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0.04) 30%, transparent 65%)',
          top: '12%',
          left: '58%',
          transform: 'translate(-50%, -50%)',
          filter: 'blur(2px)',
        }}
      />
      <div
        ref={orbRefs[1]}
        className="absolute w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.11) 0%, rgba(139,92,246,0.03) 30%, transparent 65%)',
          bottom: '18%',
          left: '28%',
          transform: 'translate(-50%, 50%)',
          filter: 'blur(2px)',
        }}
      />
      <div
        ref={orbRefs[2]}
        className="absolute w-[380px] h-[380px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(236,72,153,0.09) 0%, rgba(236,72,153,0.03) 30%, transparent 65%)',
          top: '55%',
          right: '12%',
          transform: 'translate(50%, -50%)',
          filter: 'blur(2px)',
        }}
      />

      {/* 中心 Logo + 标题 */}
      <div className="relative z-10 text-center flex flex-col items-center select-none">
        {/* Logo — 渐变图标 */}
        <div
          ref={logoRef}
          className="w-24 h-24 rounded-[1.75rem] bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 mb-8"
        >
          <span
            className="text-white font-display font-bold text-[3rem] leading-none"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
          >
            T
          </span>
        </div>

        {/* 标题 — 逐字动画 */}
        <h1
          ref={titleRef}
          className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-4 tracking-tight"
        >
          TOEFL Prep Studio
        </h1>

        {/* 副标题 */}
        <p ref={subtitleRef} className="text-slate-400 text-base md:text-lg font-medium mb-2">
          AI 驱动的托福备考助手
        </p>
        <p className="text-slate-500 text-sm">从这里开始你的提分之旅</p>

        {/* 底部加载提示 — 三个脉冲点 */}
        <div className="entrance-hint mt-12 flex items-center gap-3 text-slate-500 text-sm opacity-0">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-indigo-400/60"
                style={{
                  animation: `pulse-slow 1.5s ease-in-out ${i * 0.22}s infinite`,
                }}
              />
            ))}
          </div>
          <span className="tracking-wide">正在准备学习空间</span>
        </div>
      </div>
    </div>
  )
}
