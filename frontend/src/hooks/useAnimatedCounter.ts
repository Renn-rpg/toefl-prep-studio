import { useEffect, useState } from 'react'
import { useSpring as useMotionSpring } from 'motion/react'

export function useAnimatedCounter(target: number) {
  const [display, setDisplay] = useState(0)
  const spring = useMotionSpring(0, { stiffness: 100, damping: 30, mass: 1 })

  useEffect(() => {
    spring.set(target)
  }, [target, spring])

  useEffect(() => {
    const unsub = spring.on('change', (v) => {
      setDisplay(Math.round(v))
    })
    return unsub
  }, [spring])

  return display
}
