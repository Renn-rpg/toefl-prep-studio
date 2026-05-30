/**
 * Toast 通知系统
 * 使用 GSAP 驱动进入/退出动画,Portal 渲染
 *
 * 用法:
 *   const { addToast } = useToast()
 *   addToast('操作成功！', 'success')
 */

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { CheckCircle, XCircle, AlertTriangle, Info, Sparkles, X } from 'lucide-react'

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'achievement'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

// ═══════════════════════════════════════
// Variant config
// ═══════════════════════════════════════

const variantConfig: Record<ToastVariant, { icon: typeof CheckCircle; bg: string; border: string; text: string }> = {
  success:      { icon: CheckCircle,    bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400' },
  error:        { icon: XCircle,        bg: 'bg-red-500/10',      border: 'border-red-500/25',      text: 'text-red-400' },
  warning:      { icon: AlertTriangle,  bg: 'bg-amber-500/10',     border: 'border-amber-500/25',     text: 'text-amber-400' },
  info:         { icon: Info,           bg: 'bg-brand-500/10',     border: 'border-brand-500/25',     text: 'text-brand-400' },
  achievement:  { icon: Sparkles,       bg: 'bg-gradient-to-r from-indigo-500/10 to-pink-500/10', border: 'border-pink-500/25', text: 'text-pink-400' },
}

// ═══════════════════════════════════════
// Provider
// ═══════════════════════════════════════

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idCounter = useRef(0)

  const removeToast = useCallback((id: string) => {
    const el = document.getElementById(`toast-${id}`)
    if (el) {
      gsap.to(el, {
        x: 60,
        opacity: 0,
        scale: 0.9,
        duration: 0.3,
        ease: 'power3.in',
        onComplete: () => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        },
      })
    } else {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }
  }, [])

  const addToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 3500) => {
      const id = `t${++idCounter.current}`
      setToasts((prev) => [...prev.slice(-4), { id, message, variant }]) // 最多5个

      // GSAP 入场动画 — 在下一次微任务中执行(等待 DOM 渲染)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.getElementById(`toast-${id}`)
          if (el) {
            gsap.fromTo(
              el,
              { x: 60, opacity: 0, scale: 0.92 },
              { x: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' },
            )
          }
        })
      })

      // 自动消失
      if (duration > 0) {
        gsap.delayedCall(duration / 1000, () => removeToast(id))
      }
    },
    [removeToast],
  )

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 pointer-events-none">
          {toasts.map((toast) => {
            const cfg = variantConfig[toast.variant]
            const Icon = cfg.icon
            return (
              <div
                key={toast.id}
                id={`toast-${toast.id}`}
                className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl ${cfg.bg} ${cfg.border} shadow-2xl min-w-[280px] max-w-[420px]`}
                style={{ visibility: 'hidden' }}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${cfg.text}`} />
                <span className="text-sm text-slate-200 flex-1 font-medium">{toast.message}</span>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 p-1 rounded-md hover:bg-white/[0.08] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
