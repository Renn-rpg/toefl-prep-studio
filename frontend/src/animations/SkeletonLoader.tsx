/**
 * 可复用骨架屏加载组件
 *
 * 用法:
 *   <SkeletonLoader variant="card" />
 *   <SkeletonLoader variant="text" lines={4} />
 *   <SkeletonLoader variant="list" count={3} />
 */

import type { ReactNode } from 'react'

interface SkeletonProps {
  variant?: 'card' | 'text' | 'list' | 'chart' | 'circle'
  lines?: number
  count?: number
  className?: string
  height?: string | number
  width?: string | number
}

function SkeletonBlock({ className = '', height, width }: { className?: string; height?: string | number; width?: string | number }) {
  return (
    <div
      className={`shimmer rounded-xl ${className}`}
      style={{ height, width }}
    />
  )
}

export function SkeletonLoader({ variant = 'text', lines = 3, count = 1, className = '', height, width }: SkeletonProps) {
  const items: ReactNode[] = []

  if (variant === 'card') {
    for (let i = 0; i < count; i++) {
      items.push(
        <div key={i} className={`glass-card-static p-5 space-y-3 ${className}`}>
          <SkeletonBlock height={20} width="60%" />
          <SkeletonBlock height={14} width="80%" />
          <SkeletonBlock height={14} width="40%" />
        </div>,
      )
    }
  } else if (variant === 'text') {
    items.push(
      <div key="text" className={`space-y-2.5 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBlock
            key={i}
            height={height ?? 14}
            width={i === lines - 1 ? '60%' : '100%'}
          />
        ))}
      </div>,
    )
  } else if (variant === 'list') {
    for (let i = 0; i < count; i++) {
      items.push(
        <div key={i} className={`flex items-center gap-3 py-3 ${className}`}>
          <SkeletonBlock height={40} width={40} className="rounded-lg" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock height={14} width="50%" />
            <SkeletonBlock height={10} width="30%" />
          </div>
        </div>,
      )
    }
  } else if (variant === 'chart') {
    items.push(
      <div key="chart" className={`glass-card-static p-5 space-y-4 ${className}`}>
        <SkeletonBlock height={20} width="40%" />
        <SkeletonBlock height={height ?? 200} className="rounded-lg" />
      </div>,
    )
  } else if (variant === 'circle') {
    items.push(
      <SkeletonBlock
        key="circle"
        height={height ?? 80}
        width={width ?? 80}
        className="rounded-full"
      />,
    )
  }

  return <>{items}</>
}
