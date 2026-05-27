import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, BookOpen, Headphones, Mic, PenLine,
  FileText, ClipboardCheck, BarChart3
} from 'lucide-react'

const nav = [
  { to: '/', icon: LayoutDashboard, label: '学习总览' },
  { to: '/plan', icon: ClipboardCheck, label: '备考计划' },
  { to: '/listening', icon: Headphones, label: '听力练习' },
  { to: '/reading', icon: BookOpen, label: '阅读练习' },
  { to: '/speaking', icon: Mic, label: '口语练习' },
  { to: '/writing', icon: PenLine, label: '写作练习' },
  { to: '/mock', icon: FileText, label: '模拟考试' },
  { to: '/evaluation', icon: BarChart3, label: '阶段评估' },
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
    <div className="px-4 py-4 border-t border-stone-700/40">
      <div className="text-[11px] text-stone-500 mb-1 font-medium">{greeting}</div>
      <div className="font-mono text-xl text-teal-400 tracking-widest tabular-nums">
        {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-[10px] text-stone-600 mt-0.5">
        {time.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-gradient-to-b from-stone-900 to-stone-950 flex flex-col z-40 border-r border-stone-800/40 shadow-2xl shadow-stone-950/50">
      {/* Logo */}
      <div className="px-5 pt-7 pb-5 border-b border-stone-800/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <span className="text-white font-display font-bold text-base">T</span>
          </div>
          <div>
            <div className="font-display font-bold text-stone-100 text-[15px] leading-tight tracking-wide">TOEFL</div>
            <div className="text-[10px] text-stone-500 tracking-[0.2em] uppercase font-medium">Prep Studio</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2.5 overflow-y-auto space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 group relative ${
                isActive
                  ? 'bg-teal-500/10 text-teal-400 shadow-sm shadow-teal-500/5'
                  : 'text-stone-500 hover:text-stone-200 hover:bg-stone-800/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-teal-400 rounded-r-full shadow-sm shadow-teal-400/50" />
                )}
                <Icon className={`h-[18px] w-[18px] flex-shrink-0 transition-colors duration-200 ${
                  isActive ? 'text-teal-400' : 'group-hover:text-stone-300'
                }`} />
                <span className="font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Decorative line */}
      <div className="mx-5">
        <div className="h-px bg-gradient-to-r from-transparent via-stone-700/60 to-transparent" />
      </div>

      {/* Clock */}
      <Clock />
    </aside>
  )
}
