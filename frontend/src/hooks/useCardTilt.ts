/**
 * 增强 3D 卡片倾斜 Hook (GSAP 驱动)
 *
 * 鼠标悬停时卡片跟随倾斜 + z 轴推入 + 眩光跟随
 * 离开时 GSAP 弹性回弹
 */

import { useRef, useCallback, useEffect } from 'react'
import gsap from 'gsap'

const MAX_TILT = 5

export function useCardTilt() {
  const ref = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement | null>(null)
  const ctxRef = useRef<gsap.Context | null>(null)
  const currentRotate = useRef({ x: 0, y: 0 })

  useEffect(() => {
    return () => ctxRef.current?.revert()
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5

    const rotX = -y * MAX_TILT * 2
    const rotY = x * MAX_TILT * 2

    currentRotate.current = { x: rotX, y: rotY }

    ctxRef.current?.revert()
    ctxRef.current = gsap.context(() => {
      // 卡片倾斜
      gsap.to(el, {
        rotateX: rotX,
        rotateY: rotY,
        z: 8, // z 轴推入
        duration: 0.5,
        ease: 'power2.out',
        overwrite: 'auto',
      })

      // 眩光跟随
      if (glareRef.current) {
        const glareX = (x + 0.5) * 100
        const glareY = (y + 0.5) * 100
        gsap.to(glareRef.current, {
          left: `${glareX}%`,
          top: `${glareY}%`,
          opacity: 0.12,
          duration: 0.4,
          ease: 'power2.out',
          overwrite: 'auto',
        })
      }
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return

    ctxRef.current?.revert()
    ctxRef.current = gsap.context(() => {
      // 弹性回弹
      gsap.to(el, {
        rotateX: 0,
        rotateY: 0,
        z: 0,
        duration: 0.8,
        ease: 'elastic.out(1, 0.35)',
        overwrite: 'auto',
      })

      if (glareRef.current) {
        gsap.to(glareRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        })
      }
    })

    currentRotate.current = { x: 0, y: 0 }
  }, [])

  // 注册眩光元素
  const setGlareRef = useCallback((el: HTMLDivElement | null) => {
    glareRef.current = el
  }, [])

  return {
    ref,
    glareRef: setGlareRef,
    style: {
      transformStyle: 'preserve-3d' as const,
      perspective: '1200px',
      transition: 'none', // GSAP 接管所有过渡
    },
    handlers: { onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave },
  }
}
