import { motion } from 'motion/react'
import type { ReactNode } from 'react'

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 26,
        mass: 0.8,
      }}
    >
      {children}
    </motion.div>
  )
}
