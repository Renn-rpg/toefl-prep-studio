/**
 * GSAP 统一注册模块
 * 所有 GSAP 插件在此集中注册一次，其他模块直接导入 gsap 即可使用
 */

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Flip } from 'gsap/Flip'
import { TextPlugin } from 'gsap/TextPlugin'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { CustomEase } from 'gsap/CustomEase'
import { CustomBounce } from 'gsap/CustomBounce'
import { CustomWiggle } from 'gsap/CustomWiggle'

// ═══════════════════════════════════
// 注册所有免费插件
// ═══════════════════════════════════

gsap.registerPlugin(ScrollTrigger, Flip, TextPlugin, ScrollToPlugin, CustomEase, CustomBounce, CustomWiggle)

// ═══════════════════════════════════
// 默认配置
// ═══════════════════════════════════

gsap.defaults({
  overwrite: 'auto',
  ease: 'power3.out',
})

// ═══════════════════════════════════
// 无障碍: 尊重用户动效偏好
// 使用 matchMedia 安全地响应系统动效设置
// ═══════════════════════════════════

gsap.matchMedia().add('(prefers-reduced-motion: reduce)', (ctx) => {
  const prefersReduced = ctx.conditions?.['(prefers-reduced-motion: reduce)'] ?? false
  if (prefersReduced) {
    // 仅设置全局速度倍率为极低而非完全冻结,避免阻塞 onComplete 回调链
    gsap.globalTimeline.timeScale(0.001)
  }
})

/**
 * 创建一个自动清理的 GSAP context
 * 主要用于非 React 场景,React 组件中请使用 useGSAP hook
 */
export function gsapContext(callback: (ctx: gsap.Context) => void, scope?: Element | string) {
  return gsap.context(callback, scope)
}

export { gsap, ScrollTrigger, Flip, TextPlugin, ScrollToPlugin }
export default gsap
