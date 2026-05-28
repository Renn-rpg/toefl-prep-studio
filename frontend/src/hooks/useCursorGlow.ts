import { useEffect } from 'react'
import { useMotionValue, useSpring } from 'motion/react'

export function useCursorGlow() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springX = useSpring(mouseX, { stiffness: 150, damping: 15, mass: 0.1 })
  const springY = useSpring(mouseY, { stiffness: 150, damping: 15, mass: 0.1 })

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }

    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [mouseX, mouseY])

  useEffect(() => {
    const unsubX = springX.on('change', (v) => {
      document.documentElement.style.setProperty('--glow-x', `${v}px`)
    })
    const unsubY = springY.on('change', (v) => {
      document.documentElement.style.setProperty('--glow-y', `${v}px`)
    })
    return () => { unsubX(); unsubY() }
  }, [springX, springY])
}
