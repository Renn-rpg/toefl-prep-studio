/**
 * Canvas 星空粒子系统
 *
 * 150-200 个微小粒子漂浮在整个视口上
 * requestAnimationFrame 渲染循环 + GSAP 控制整体透明度/缩放
 */

import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'

// ═══════════════════════════════════
// 粒子类型
// ═══════════════════════════════════

interface Particle {
  x: number
  y: number
  size: number
  opacity: number
  baseOpacity: number
  speedX: number
  speedY: number
  pulsePhase: number
  color: string
}

const COLORS = [
  'rgba(99,102,241,',   // indigo
  'rgba(139,92,246,',   // violet
  'rgba(236,72,153,',   // pink
  'rgba(129,140,248,',  // light indigo
  'rgba(192,132,252,',  // light violet
]

interface ParticlesProps {
  intensity?: number   // 0-1, 控制粒子数量和不透明度倍率
  count?: number       // 粒子数量 (默认 180)
  className?: string
}

export function Particles({ intensity = 1, count = 180 }: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)
  const ctxRef = useRef<gsap.Context | null>(null)

  // 创建粒子
  const initParticles = useCallback((w: number, h: number) => {
    const particles: Particle[] = []
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2.5 + 0.8,
        opacity: Math.random() * 0.5 + 0.1,
        baseOpacity: Math.random() * 0.5 + 0.1,
        speedX: (Math.random() - 0.5) * 0.35,
        speedY: (Math.random() - 0.5) * 0.35 - 0.15, // 微微上浮
        pulsePhase: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      })
    }
    particlesRef.current = particles
  }, [count])

  // 渲染循环
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 尺寸适配
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.scale(dpr, dpr)
      initParticles(window.innerWidth, window.innerHeight)
    }

    resize()
    window.addEventListener('resize', resize)

    // 动画循环
    let lastTime = performance.now()
    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1) // 防止大帧间隔
      lastTime = now

      const w = window.innerWidth
      const h = window.innerHeight
      const particles = particlesRef.current
      const alphaMultiplier = intensity

      ctx.clearRect(0, 0, w, h)

      for (const p of particles) {
        // 更新位置
        p.x += p.speedX * dt * 60
        p.y += p.speedY * dt * 60

        // 循环边界
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10

        // 脉冲透明度
        p.pulsePhase += dt * 0.8
        const pulse = Math.sin(p.pulsePhase) * 0.15
        const alpha = Math.max(0, (p.baseOpacity + pulse) * alphaMultiplier)

        // 绘制
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color + `${alpha})`
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [initParticles, intensity])

  // GSAP 控制整体 canvas 透明度/缩放
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    ctxRef.current = gsap.context(() => {
      // 为 AppEntrance 预留: canvas 初始透明度由父组件控制
    })

    return () => ctxRef.current?.revert()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: intensity }}
    />
  )
}
