import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { DashboardData } from '@/types'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer
} from 'recharts'
import { Flame, Clock, BookOpen, TrendingUp } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`inline-flex p-2.5 rounded-xl mb-3 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-mono text-3xl font-semibold text-slate-800">{value}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
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
    if (mins === 0) return 'bg-slate-100'
    if (mins < 20) return 'bg-blue-100'
    if (mins < 40) return 'bg-blue-300'
    if (mins < 60) return 'bg-blue-500'
    return 'bg-blue-700'
  }

  return (
    <div className="flex flex-wrap gap-1">
      {days.map(d => (
        <div
          key={d.date}
          title={`${d.date}: ${d.minutes}min`}
          className={`w-3 h-3 rounded-sm ${intensity(d.minutes)} transition-all hover:scale-125`}
        />
      ))}
    </div>
  )
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    api.get<DashboardData>('/progress/dashboard').then(setData).catch(() => {})
  }, [])

  const radarData = data ? [
    { subject: 'Listening', score: data.radar.listening },
    { subject: 'Reading', score: data.radar.reading },
    { subject: 'Speaking', score: data.radar.speaking },
    { subject: 'Writing', score: data.radar.writing },
  ] : []

  return (
    <div className="max-w-5xl space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-800">学习总览</h1>
        <p className="text-slate-500 mt-1 text-sm">追踪你的 TOEFL 备考进度</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Flame} label="连续学习天数" value={data?.streak_days ?? 0} color="bg-orange-100 text-orange-600" />
        <StatCard icon={Clock} label="总学习时间 (分钟)" value={data?.total_minutes ?? 0} color="bg-blue-100 text-blue-600" />
        <StatCard icon={BookOpen} label="听力均分" value={data?.section_averages.listening ?? 0} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={TrendingUp} label="口语均分" value={data?.section_averages.speaking ?? 0} color="bg-violet-100 text-violet-600" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Radar chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-slate-800 mb-4">四项技能分布</h2>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#64748b' }} />
                <Radar name="Score" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
              完成练习后数据将在此显示
            </div>
          )}
        </div>

        {/* Section averages */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-slate-800 mb-4">各科均分详情</h2>
          <div className="space-y-4">
            {[
              { label: 'Listening 听力', score: data?.section_averages.listening ?? 0, color: 'bg-blue-500' },
              { label: 'Reading 阅读', score: data?.section_averages.reading ?? 0, color: 'bg-emerald-500' },
              { label: 'Speaking 口语', score: data?.section_averages.speaking ?? 0, color: 'bg-violet-500' },
              { label: 'Writing 写作', score: data?.section_averages.writing ?? 0, color: 'bg-amber-500' },
            ].map(({ label, score, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-mono font-semibold text-slate-800">{score}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min((score / 30) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-slate-800 mb-4">学习热力图 (近90天)</h2>
        <HeatmapCalendar data={data?.heatmap ?? []} />
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
          <span>少</span>
          {['bg-slate-100', 'bg-blue-100', 'bg-blue-300', 'bg-blue-500', 'bg-blue-700'].map(c => (
            <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span>多</span>
        </div>
      </div>
    </div>
  )
}
