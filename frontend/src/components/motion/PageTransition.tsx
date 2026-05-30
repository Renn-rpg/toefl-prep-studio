/**
 * 方向感知页面过渡
 *
 * 根据导航深度判断方向:
 *   - 前进 (更深): 从右侧滑入 + 微缩放
 *   - 后退 (返回): 从左侧滑入 + 微缩放
 *
 * motion AnimatePresence 处理 exit 动画
 */

import { motion } from 'motion/react'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

// 路由深度映射 — 用于判断导航方向
const routeDepth: Record<string, number> = {
  '/': 0,
  '/plan': 0,
  '/vocab': 1,
  '/vocab/study': 2,
  '/vocab/quiz': 2,
  '/vocab/bookmarks': 2,
  '/vocab/mastery': 2,
  '/listening': 1,
  '/reading': 1,
  '/speaking': 1,
  '/writing': 1,
  '/mock': 1,
  '/evaluation': 1,
  '/translation': 1,
}

// 记录上一次路径深度
let prevDepth = 0

export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const currentDepth = routeDepth[pathname] ?? 0
  const isForward = currentDepth >= prevDepth

  // 更新历史
  prevDepth = currentDepth

  const xEnter = isForward ? 24 : -20
  const xExit = isForward ? -14 : 14

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, x: xEnter, scaleX: 0.98 }}
      animate={{
        opacity: 1,
        y: 0,
        x: 0,
        scaleX: 1,
        transition: {
          type: 'spring',
          stiffness: 280,
          damping: 28,
          mass: 0.7,
        },
      }}
      exit={{
        opacity: 0,
        y: -6,
        x: xExit,
        scaleX: 0.99,
        transition: {
          duration: 0.25,
          ease: 'easeInOut',
        },
      }}
    >
      {children}
    </motion.div>
  )
}
