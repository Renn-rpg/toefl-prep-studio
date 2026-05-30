import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'motion/react'
import {
  LayoutDashboard, BookOpen, Headphones, Mic, PenLine,
  FileText, ClipboardCheck, BarChart3, BookA, Menu, X, ArrowLeftRight
} from 'lucide-react'
import gsap from 'gsap'

const nav = [
  { to: '/', icon: LayoutDashboard, label: '学习总览', color: 'text-brand-400' },
  { to: '/plan', icon: ClipboardCheck, label: '备考计划', color: 'text-indigo-400' },
  { to: '/vocab', icon: BookA, label: '词汇背诵', color: 'text-pink-400' },
  { to: '/translation', icon: ArrowLeftRight, label: '句法互译', color: 'text-blue-400' },
  { to: '/listening', icon: Headphones, label: '听力练习', color: 'text-cyan-400' },
  { to: '/reading', icon: BookOpen, label: '阅读练习', color: 'text-emerald-400' },
  { to: '/speaking', icon: Mic, label: '口语练习', color: 'text-violet-400' },
  { to: '/writing', icon: PenLine, label: '写作练习', color: 'text-amber-400' },
  { to: '/mock', icon: FileText, label: '模拟考试', color: 'text-red-400' },
  { to: '/evaluation', icon: BarChart3, label: '阶段评估', color: 'text-teal-400' },
]

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const hour = time.getHours()
  const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

  return (
    <div className="px-4 py-4">
      <div className="text-[11px] text-slate-500 mb-1 font-medium">{greeting}</div>
      <div className="font-mono text-lg text-brand-400 tracking-widest tabular-nums">
        {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-[10px] text-slate-600 mt-0.5">
        {time.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
      </div>
    </div>
  )
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation()

  return (
    <>
      {/* Logo */}
      <div className="px-5 pt-7 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-white font-display font-bold text-base">T</span>
            </div>
            <div>
              <div className="font-display font-bold text-slate-100 text-[15px] leading-tight tracking-wide">TOEFL</div>
              <div className="text-[10px] text-slate-500 tracking-[0.2em] uppercase font-medium">Prep Studio</div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="mx-5 mb-3">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-1 px-2.5 overflow-y-auto space-y-0.5">
        {nav.map(({ to, icon: Icon, label, color }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={`sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-colors duration-200 group relative ${
                isActive
                  ? 'bg-brand-500/[0.12] text-brand-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-indigo-400 to-violet-400 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className={`h-[18px] w-[18px] flex-shrink-0 transition-colors duration-200 ${
                isActive ? 'text-brand-400' : color + '/50 group-hover:' + color
              }`} />
              <span className="font-medium">{label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="mx-5">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      <Clock />
    </>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const asideRef = useRef<HTMLElement>(null)
  const ctxRef = useRef<gsap.Context | null>(null)
  const isAnimating = useRef(false)

  // 清理 GSAP context
  useEffect(() => {
    return () => ctxRef.current?.revert()
  }, [])

  // 移动端打开动画
  const openMobile = useCallback(() => {
    if (isAnimating.current) return
    isAnimating.current = true
    setMobileOpen(true)
  }, [])

  // 移动端关闭动画
  const closeMobile = useCallback(() => {
    if (isAnimating.current || !overlayRef.current || !asideRef.current) {
      setMobileOpen(false)
      return
    }
    isAnimating.current = true

    ctxRef.current?.revert()
    ctxRef.current = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          setMobileOpen(false)
          isAnimating.current = false
        },
      })

      tl.to(asideRef.current, {
        x: -60,
        opacity: 0,
        duration: 0.25,
        ease: 'power3.in',
      }, 0)

      tl.to(overlayRef.current, {
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
      }, 0.05)
    })
  }, [])

  // 打开后触发的入场动画
  useEffect(() => {
    if (!mobileOpen || !overlayRef.current || !asideRef.current) return

    // 初始状态
    gsap.set(overlayRef.current, { opacity: 0 })
    gsap.set(asideRef.current, { x: -60, opacity: 0 })

    ctxRef.current?.revert()
    ctxRef.current = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          isAnimating.current = false
        },
      })

      // 覆盖层淡入
      tl.to(overlayRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      }, 0)

      // 侧边栏滑入
      tl.to(asideRef.current, {
        x: 0,
        opacity: 1,
        duration: 0.4,
        ease: 'power3.out',
      }, 0.05)

      // 导航项交错滑入
      const navItems = asideRef.current?.querySelectorAll('.sidebar-nav-item')
      if (navItems?.length) {
        tl.fromTo(
          navItems,
        { x: -16, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
          stagger: 0.025,
        },
        0.15,
      )
      }
    })
  }, [mobileOpen])

  return (
    <>
      {/* Mobile hamburger */}
      <div className="fixed top-0 left-0 right-0 h-14 glass-sidebar flex items-center px-4 lg:hidden z-50">
        <button onClick={openMobile} className="p-2 rounded-lg hover:bg-white/[0.06] text-slate-400">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center">
            <span className="text-white font-display font-bold text-xs">T</span>
          </div>
          <span className="font-display font-bold text-slate-100 text-sm">TOEFL Prep</span>
        </div>
      </div>

      {/* Mobile overlay — 使用 GSAP 动画控制 */}
      {mobileOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
          onClick={closeMobile}
        >
          <aside
            ref={asideRef}
            className="w-60 h-full glass-sidebar flex flex-col shadow-glass-lg"
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent onClose={closeMobile} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-60 glass-sidebar flex-col z-40 hidden lg:flex">
        <SidebarContent />
      </aside>
    </>
  )
}
