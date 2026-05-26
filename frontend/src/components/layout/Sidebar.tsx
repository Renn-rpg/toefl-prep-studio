import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, BookOpen, Headphones, Mic, PenLine,
  FileText, ClipboardCheck, BarChart3
} from 'lucide-react'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
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
  return (
    <div className="text-center px-4 py-3 border-t border-navy-700">
      <div className="font-mono text-2xl text-accent-blue tracking-widest">
        {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-xs text-slate-400 mt-0.5">
        {time.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-navy-900 flex flex-col z-40 border-r border-navy-700">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-navy-700">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-accent-blue flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">T</span>
          </div>
          <div>
            <div className="font-display font-bold text-white text-base leading-tight">TOEFL</div>
            <div className="text-[10px] text-slate-400 tracking-widest uppercase">Prep Studio</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group ${
                isActive
                  ? 'bg-accent-blue/15 text-accent-blue'
                  : 'text-slate-400 hover:text-white hover:bg-navy-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-accent-blue' : ''}`} />
                <span className="font-medium">{label}</span>
                {isActive && (
                  <div className="ml-auto w-1 h-4 bg-accent-blue rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Live Clock */}
      <Clock />
    </aside>
  )
}
