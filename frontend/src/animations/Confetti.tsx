/**
 * Canvas 庆祝撒花系统
 *
 * 80-120 彩色粒子从中心爆发，受重力影响下落
 * 成绩 > 80% 或完成测验时触发
 *
 * 用法:
 *   import { fireConfetti } from './animations/Confetti'
 *   fireConfetti()  // 从视口中心
 *   fireConfetti({ x: 300, y: 200 })  // 从指定位置
 */

// ═══════════════════════════════════
// 纸屑粒子
// ═══════════════════════════════════

interface ConfettiParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  rotationSpeed: number
  color: string
  shape: 'rect' | 'circle'
  opacity: number
}

const CONFETTI_COLORS = [
  '#6366F1', '#818CF8', '#A78BFA', '#C084FC',
  '#EC4899', '#F472B6', '#06B6D4', '#22D3EE',
  '#10B981', '#34D399', '#F59E0B', '#FBBF24',
]

interface FireOptions {
  x?: number
  y?: number
  count?: number
  spread?: number
}

export function fireConfetti(options: FireOptions = {}) {
  const { x, y, count = 100 } = options

  // 创建 canvas
  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.inset = '0'
  canvas.style.zIndex = '9999'
  canvas.style.pointerEvents = 'none'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    document.body.removeChild(canvas)
    return
  }

  // 爆发中心
  const cx = x ?? window.innerWidth / 2
  const cy = y ?? window.innerHeight / 2

  // 创建粒子
  const particles: ConfettiParticle[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 400 + 200
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed * (0.5 + Math.random() * 0.5),
      vy: Math.sin(angle) * speed * (0.5 + Math.random() * 0.5) - 100,
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 720,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      opacity: 1,
    })
  }

  // GSAP 驱动整体生命周期
  const startTime = performance.now()
  const duration = 3.0 // 秒

  // 动画循环
  const animate = (now: number) => {
    const elapsed = (now - startTime) / 1000
    if (elapsed > duration) {
      document.body.removeChild(canvas)
      return
    }

    const dt = Math.min(0.05, elapsed) // simplified dt
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const p of particles) {
      // 物理
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 350 * dt // 重力
      p.rotation += p.rotationSpeed * dt
      p.vx *= 0.995 // 空气阻力

      // 渐隐
      const fadeStart = duration * 0.6
      if (elapsed > fadeStart) {
        p.opacity = Math.max(0, 1 - (elapsed - fadeStart) / (duration - fadeStart))
      }

      // 绘制
      ctx.save()
      ctx.globalAlpha = p.opacity
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)

      if (p.shape === 'rect') {
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      } else {
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }

    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
}
