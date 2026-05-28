import { useRef, useCallback } from 'react'
import { useMotionValue, useSpring } from 'motion/react'

const MAX_TILT = 4

export function useCardTilt() {
  const ref = useRef<HTMLDivElement>(null)
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)

  const springRotateX = useSpring(rotateX, { stiffness: 200, damping: 20, mass: 0.5 })
  const springRotateY = useSpring(rotateY, { stiffness: 200, damping: 20, mass: 0.5 })

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    rotateY.set(x * MAX_TILT * 2)
    rotateX.set(-y * MAX_TILT * 2)
  }, [rotateX, rotateY])

  const handleMouseLeave = useCallback(() => {
    rotateX.set(0)
    rotateY.set(0)
  }, [rotateX, rotateY])

  return {
    ref,
    style: { rotateX: springRotateX, rotateY: springRotateY },
    handlers: { onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave },
  }
}
