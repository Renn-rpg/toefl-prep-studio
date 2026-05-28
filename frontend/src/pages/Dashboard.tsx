import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { MEDIA } from '@/lib/media'
import type { DashboardData } from '@/types'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer
} from 'recharts'
import { Flame, Clock, TrendingUp, BookOpen, Mic, PenLine, Headphones } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import { StaggerContainer } from '@/components/motion/StaggerContainer'
import { StaggerItem } from '@/components/motion/StaggerItem'

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number
  color: 'cyan' | 'violet' | 'amber' | 'emerald'
}) {
  const palettes = {
    cyan:    { iconBg: 'bg-gradient-to-br from-cyan-500 to-cyan-400', accent: 'from-cyan-500 to-cyan-400' },
    violet:  { iconBg: 'bg-gradient-to-br from-violet-500 to-violet-400', accent: 'from-violet-400 to-violet-300' },
    amber:   { iconBg: 'bg-gradient-to-br from-amber-500 to-amber-400', accent: 'from-amber-400 to-amber-300' },
    emerald: { iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-400', accent: 'from-emerald-400 to-emerald-300' },
  }
  const p = palettes[color]

  return (
    <div className="glass-card relative overflow-hidden p-5 group">
      <div className={`absolute top-0 left-6 right-6 h-[3px] rounded-b-full bg-gradient-to-r ${p.accent} opacity-30 group-hover:opacity-60 transition-opacity duration-300`} />
      <div className="mt-1.5">
        <div className={`inline-flex p-2.5 rounded-xl mb-3 ${p.iconBg} shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="font-mono text-[2rem] font-bold text-slate-100 leading-none">{value}</div>
        <div className="text-[13px] text-slate-400 mt-1.5 font-medium">{label}</div>
      </div>
    </div>
  )
}

function HeatmapCalendar({ data }: { data: { date: string; minutes: number }[] }) {
  const map = Object.fromEntries(data.map(d => [d.date, d.minutes]))
  const days: { date: string; minutes: number }[] = []
  const today = new Date()
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().split('T')[0]
    days.push({ date: key, minutes: map[key] ?? 0 })
  }

  function intensity(mins: number) {
    if (mins === 0) return 'bg-white/[0.04]'
    if (mins < 20) return 'bg-indigo-900/40'
    if (mins < 40) return 'bg-indigo-700/50'
    if (mins < 60) return 'bg-indigo-500/60'
    return 'bg-indigo-400/70'
  }

  return (
    <div className="flex flex-wrap gap-[3px]">
      {days.map(d => (
        <div key={d.date} title={`${d.date}: ${d.minutes} 分钟`}
          className={`w-[13px] h-[13px] rounded-[3px] ${intensity(d.minutes)} transition-all duration-150 hover:scale-[1.6] cursor-default`} />
      ))}
    </div>
  )
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    api.get<DashboardData>('/progress/dashboard').then(setData).catch(() => {})
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 6 ? '夜深了，注意休息' : hour < 12 ? '早安，新的一天' : hour < 18 ? '下午好，继续加油' : '晚上好，高效学习'
  const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  const radarData = data ? [
    { subject: '听力', score: data.radar.listening },
    { subject: '阅读', score: data.radar.reading },
    { subject: '口语', score: data.radar.speaking },
    { subject: '写作', score: data.radar.writing },
  ] : []

  const hasRadarData = radarData.some(d => d.score > 0)

  const stats = [
    { icon: Flame, label: '连续学习天数', value: data?.streak_days ?? 0, color: 'amber' as const },
    { icon: Clock, label: '总学习时间 (分钟)', value: data?.total_minutes ?? 0, color: 'cyan' as const },
    { icon: Headphones, label: '听力均分', value: data?.section_averages.listening ?? 0, color: 'emerald' as const },
    { icon: TrendingUp, label: '口语均分', value: data?.section_averages.speaking ?? 0, color: 'violet' as const },
  ]

  return (
    <PageTransition>
      <div className="max-w-full lg:max-w-5xl space-y-10">
        {/* Hero banner */}
        <div className="hero-image-overlay rounded-2xl -mx-2 overflow-hidden">
          <img src={MEDIA.dashboard.hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div className="relative z-[2] p-8 md:p-10">
            <p className="text-[13px] text-slate-400 mb-1 font-medium">{dateStr}</p>
            <h1 className="font-display text-[2rem] font-bold text-slate-100 tracking-tight leading-tight">
              {greeting}
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-[3px] w-12 bg-gradient-to-r from-brand-400 to-brand-400/0 rounded-full" />
              <span className="text-xs text-slate-500 uppercase tracking-[0.15em] font-medium">Learning Dashboard</span>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <StaggerItem key={s.label}>
              <StatCard {...s} />
            </StaggerItem>
          ))}
        </StaggerContainer>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar chart */}
          <div className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-brand-400 to-brand-300" />
              <h2 className="font-display text-lg font-semibold text-slate-100">四项技能分布</h2>
            </div>
            <p className="text-xs text-slate-500 mb-5">听力 · 阅读 · 口语 · 写作</p>

            {hasRadarData ? (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#2A2A3A" strokeWidth={0.8} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13, fill: '#94A3B8', fontWeight: 500 }} />
                  <Radar name="Score" dataKey="score" stroke="#818CF8" fill="#818CF8" fillOpacity={0.12} strokeWidth={2} dot={{ r: 5, fill: '#818CF8', strokeWidth: 2, stroke: '#16161E' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-slate-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-400 font-medium">暂无技能数据</p>
                  <p className="text-xs text-slate-500 mt-1">完成各模块练习后自动生成</p>
                </div>
              </div>
            )}
          </div>

          {/* Section averages */}
          <div className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-brand-400 to-brand-300" />
              <h2 className="font-display text-lg font-semibold text-slate-100">各科均分详情</h2>
            </div>
            <p className="text-xs text-slate-500 mb-6">满分均为 30 分</p>

            <div className="space-y-6">
              {[
                { label: '听力 Listening', score: data?.section_averages.listening ?? 0, bar: 'bg-gradient-to-r from-cyan-500 to-cyan-400', text: 'text-cyan-400', icon: Headphones },
                { label: '阅读 Reading', score: data?.section_averages.reading ?? 0, bar: 'bg-gradient-to-r from-emerald-500 to-emerald-400', text: 'text-emerald-400', icon: BookOpen },
                { label: '口语 Speaking', score: data?.section_averages.speaking ?? 0, bar: 'bg-gradient-to-r from-violet-500 to-violet-400', text: 'text-violet-400', icon: Mic },
                { label: '写作 Writing', score: data?.section_averages.writing ?? 0, bar: 'bg-gradient-to-r from-amber-500 to-amber-400', text: 'text-amber-400', icon: PenLine },
              ].map(({ label, score, bar, text, icon: Icon }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300 font-medium flex items-center gap-2">
                      <Icon className="h-4 w-4 text-slate-500" />
                      {label}
                    </span>
                    <span className={`font-mono font-bold ${text}`}>
                      {score}<span className="text-slate-500 font-normal text-xs">/30</span>
                    </span>
                  </div>
                  <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={`h-full ${bar} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${Math.min((score / 30) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="glass-card-static p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-brand-400 to-brand-300" />
            <h2 className="font-display text-lg font-semibold text-slate-100">学习热力图</h2>
          </div>
          <p className="text-xs text-slate-500 mb-5">近 90 天学习活跃度分布</p>

          <HeatmapCalendar data={data?.heatmap ?? []} />
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-slate-500">
            <span>少</span>
            {['bg-white/[0.04]', 'bg-indigo-900/40', 'bg-indigo-700/50', 'bg-indigo-500/60', 'bg-indigo-400/70'].map(c => (
              <div key={c} className={`w-[13px] h-[13px] rounded-[3px] ${c}`} />
            ))}
            <span>多</span>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
