import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { DashboardData } from '@/types'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer
} from 'recharts'
import { Flame, Clock, BookOpen, TrendingUp } from 'lucide-react'

function StatCard({ icon: Icon, label, value, bgColor, iconColor, glowColor, idx }: {
  icon: React.ElementType; label: string; value: string | number
  bgColor: string; iconColor: string; glowColor: string; idx: number
}) {
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl p-5 shadow-card card-hover animate-fade-up border border-stone-100"
      style={{ animationDelay: `${60 + idx * 60}ms` }}>
      <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full ${glowColor} opacity-[0.15] blur-2xl`} />
      <div className={`inline-flex p-2.5 rounded-xl mb-3 ${bgColor}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="font-mono text-3xl font-bold text-stone-800">{value}</div>
      <div className="text-sm text-stone-500 mt-1">{label}</div>
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
    if (mins === 0) return 'bg-stone-100'
    if (mins < 20) return 'bg-teal-100'
    if (mins < 40) return 'bg-teal-300'
    if (mins < 60) return 'bg-teal-500'
    return 'bg-teal-700'
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

  const radarData = data ? [
    { subject: '听力', score: data.radar.listening },
    { subject: '阅读', score: data.radar.reading },
    { subject: '口语', score: data.radar.speaking },
    { subject: '写作', score: data.radar.writing },
  ] : []

  const stats = [
    { icon: Flame, label: '连续学习天数', value: data?.streak_days ?? 0, bgColor: 'bg-orange-50', iconColor: 'text-orange-500', glowColor: 'bg-orange-400' },
    { icon: Clock, label: '总学习时间 (分钟)', value: data?.total_minutes ?? 0, bgColor: 'bg-cyan-50', iconColor: 'text-cyan-600', glowColor: 'bg-cyan-400' },
    { icon: BookOpen, label: '听力均分', value: data?.section_averages.listening ?? 0, bgColor: 'bg-emerald-50', iconColor: 'text-emerald-600', glowColor: 'bg-emerald-400' },
    { icon: TrendingUp, label: '口语均分', value: data?.section_averages.speaking ?? 0, bgColor: 'bg-violet-50', iconColor: 'text-violet-600', glowColor: 'bg-violet-400' },
  ]

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <p className="text-sm text-stone-400 mb-1">{greeting}</p>
        <h1 className="font-display text-3xl font-bold text-stone-800">学习总览</h1>
        <div className="mt-3 h-[2px] w-24 bg-gradient-to-r from-teal-500 to-teal-500/0 rounded-full" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={s.label} {...s} idx={i} />)}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Radar chart */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-stone-100 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <h2 className="font-display text-lg font-semibold text-stone-800 mb-4">四项技能分布</h2>
          {radarData.length > 0 && radarData.some(d => d.score > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E7E5E4" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13, fill: '#78716C', fontWeight: 500 }} />
                <Radar name="Score" dataKey="score" stroke="#0F766E" fill="#0F766E" fillOpacity={0.12} strokeWidth={2} dot={{ r: 4, fill: '#0F766E' }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-stone-300" />
              </div>
              <p className="text-sm text-stone-400">完成练习后数据将在此显示</p>
            </div>
          )}
        </div>

        {/* Section averages */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-stone-100 animate-fade-up" style={{ animationDelay: '360ms' }}>
          <h2 className="font-display text-lg font-semibold text-stone-800 mb-5">各科均分详情</h2>
          <div className="space-y-5">
            {[
              { label: '听力 Listening', score: data?.section_averages.listening ?? 0, bar: 'bg-teal-500', text: 'text-teal-700' },
              { label: '阅读 Reading', score: data?.section_averages.reading ?? 0, bar: 'bg-emerald-500', text: 'text-emerald-700' },
              { label: '口语 Speaking', score: data?.section_averages.speaking ?? 0, bar: 'bg-violet-500', text: 'text-violet-700' },
              { label: '写作 Writing', score: data?.section_averages.writing ?? 0, bar: 'bg-amber-500', text: 'text-amber-700' },
            ].map(({ label, score, bar, text }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-stone-600 font-medium">{label}</span>
                  <span className={`font-mono font-bold ${text}`}>{score}<span className="text-stone-400 font-normal text-xs">/30</span></span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className={`h-full ${bar} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min((score / 30) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-stone-100 animate-fade-up" style={{ animationDelay: '420ms' }}>
        <div className="flex items-baseline gap-2 mb-4">
          <h2 className="font-display text-lg font-semibold text-stone-800">学习热力图</h2>
          <span className="text-xs text-stone-400">近 90 天</span>
        </div>
        <HeatmapCalendar data={data?.heatmap ?? []} />
        <div className="flex items-center gap-1.5 mt-3 text-[11px] text-stone-400">
          <span>少</span>
          {['bg-stone-100', 'bg-teal-100', 'bg-teal-300', 'bg-teal-500', 'bg-teal-700'].map(c => (
            <div key={c} className={`w-[13px] h-[13px] rounded-[3px] ${c}`} />
          ))}
          <span>多</span>
        </div>
      </div>
    </div>
  )
}
