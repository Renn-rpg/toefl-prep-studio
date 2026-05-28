import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { MEDIA } from '@/lib/media'
import type { DashboardData } from '@/types'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer
} from 'recharts'
import { Flame, Clock, TrendingUp, BookOpen, Mic, PenLine, Headphones, BookA, FileText, BarChart3, ClipboardCheck, ChevronRight } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import { RevealSection } from '@/components/motion/RevealSection'
import { motion } from 'motion/react'

function BentoStatCard({ icon: Icon, label, value, gradient, delay }: {
  icon: React.ElementType; label: string; value: string | number
  gradient: string; delay: number
}) {
  return (
    <motion.div
      className="card-glow p-6 group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24, delay }}
    >
      <div className={`inline-flex p-2.5 rounded-xl mb-4 bg-gradient-to-br ${gradient} shadow-lg`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="font-mono text-[2.5rem] font-bold text-slate-100 leading-none tracking-tight">{value}</div>
      <div className="text-[13px] text-slate-400 mt-2 font-medium">{label}</div>
    </motion.div>
  )
}

function HeatmapCalendar({ data }: { data: { date: string; minutes: number }[] }) {
  const days = useMemo(() => {
    const map = Object.fromEntries(data.map(d => [d.date, d.minutes]))
    const result: { date: string; minutes: number }[] = []
    const today = new Date()
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().split('T')[0]
      result.push({ date: key, minutes: map[key] ?? 0 })
    }
    return result
  }, [data])

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

const modules = [
  { to: '/plan', icon: ClipboardCheck, label: '备考计划', color: 'from-indigo-500 to-violet-500', desc: 'AI 定制学习路径' },
  { to: '/vocab', icon: BookA, label: '词汇背诵', color: 'from-pink-500 to-rose-400', desc: '400 核心词 SRS' },
  { to: '/listening', icon: Headphones, label: '听力练习', color: 'from-cyan-500 to-cyan-400', desc: 'TTS 语音训练' },
  { to: '/reading', icon: BookOpen, label: '阅读练习', color: 'from-emerald-500 to-emerald-400', desc: '文章精读答题' },
  { to: '/speaking', icon: Mic, label: '口语练习', color: 'from-violet-500 to-violet-400', desc: 'AI 三维评分' },
  { to: '/writing', icon: PenLine, label: '写作练习', color: 'from-amber-500 to-amber-400', desc: 'AI 批改反馈' },
  { to: '/mock', icon: FileText, label: '模拟考试', color: 'from-red-500 to-rose-400', desc: '四节计时模考' },
  { to: '/evaluation', icon: BarChart3, label: '阶段评估', color: 'from-teal-500 to-teal-400', desc: '趋势追踪' },
]

function ModuleMarquee() {
  const navigate = useNavigate()
  const items = [...modules, ...modules]

  return (
    <div className="marquee">
      <div className="marquee-inner">
        {items.map(({ to, icon: Icon, label, color, desc }, i) => (
          <button key={`${to}-${i}`} onClick={() => navigate(to)}
            className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group flex-shrink-0 cursor-pointer">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{label}</div>
              <div className="text-[11px] text-slate-500">{desc}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors ml-2" />
          </button>
        ))}
      </div>
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

  return (
    <PageTransition>
      <div className="max-w-full lg:max-w-5xl space-y-10">
        {/* Hero banner */}
        <div className="hero-image-overlay rounded-2xl -mx-2 overflow-hidden">
          <img src={MEDIA.dashboard.hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
          <div className="relative z-[2] p-8 md:p-12">
            <p className="text-[13px] text-slate-400 mb-2 font-medium tracking-wide">{dateStr}</p>
            <h1 className="font-display text-[2.5rem] md:text-[3rem] font-bold tracking-tight leading-[1.1]">
              <span className="text-slate-100">{greeting}</span>
            </h1>
            <div className="mt-3">
              <span className="text-gradient-flow font-display text-lg font-semibold">TOEFL Prep Studio</span>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-[3px] w-16 bg-gradient-to-r from-indigo-500 via-violet-500 to-transparent rounded-full" />
              <span className="text-xs text-slate-500 uppercase tracking-[0.2em] font-medium">Learning Dashboard</span>
            </div>
          </div>
        </div>

        {/* Module marquee */}
        <RevealSection delay={0.1}>
          <ModuleMarquee />
        </RevealSection>

        {/* Bento stat grid */}
        <div className="bento-grid">
          <BentoStatCard icon={Flame} label="连续学习天数" value={data?.streak_days ?? 0}
            gradient="from-amber-500 to-amber-400" delay={0.05} />
          <BentoStatCard icon={Clock} label="总学习分钟" value={data?.total_minutes ?? 0}
            gradient="from-cyan-500 to-cyan-400" delay={0.1} />
          <BentoStatCard icon={Headphones} label="听力均分" value={data?.section_averages.listening ?? 0}
            gradient="from-emerald-500 to-emerald-400" delay={0.15} />

          {/* Radar chart — spans 2 cols */}
          <div className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-brand-400 to-brand-300" />
              <h2 className="font-display text-lg font-semibold text-slate-100">四项技能</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">听力 · 阅读 · 口语 · 写作</p>
            {hasRadarData ? (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#2A2A3A" strokeWidth={0.8} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13, fill: '#94A3B8', fontWeight: 500 }} />
                  <Radar name="Score" dataKey="score" stroke="#818CF8" fill="#818CF8" fillOpacity={0.12} strokeWidth={2} dot={{ r: 5, fill: '#818CF8', strokeWidth: 2, stroke: '#16161E' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-slate-600" />
                </div>
                <p className="text-sm text-slate-400">完成练习后自动生成</p>
              </div>
            )}
          </div>

          {/* Section averages — spans 2 cols */}
          <div className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-brand-400 to-brand-300" />
              <h2 className="font-display text-lg font-semibold text-slate-100">各科均分</h2>
            </div>
            <p className="text-xs text-slate-500 mb-5">满分均为 30 分</p>
            <div className="space-y-5">
              {[
                { label: '听力', score: data?.section_averages.listening ?? 0, bar: 'bg-gradient-to-r from-cyan-500 to-cyan-400', text: 'text-cyan-400', icon: Headphones },
                { label: '阅读', score: data?.section_averages.reading ?? 0, bar: 'bg-gradient-to-r from-emerald-500 to-emerald-400', text: 'text-emerald-400', icon: BookOpen },
                { label: '口语', score: data?.section_averages.speaking ?? 0, bar: 'bg-gradient-to-r from-violet-500 to-violet-400', text: 'text-violet-400', icon: Mic },
                { label: '写作', score: data?.section_averages.writing ?? 0, bar: 'bg-gradient-to-r from-amber-500 to-amber-400', text: 'text-amber-400', icon: PenLine },
              ].map(({ label, score, bar, text, icon: Icon }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300 font-medium flex items-center gap-2">
                      <Icon className="h-4 w-4 text-slate-500" />{label}
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

        {/* Heatmap — scroll reveal */}
        <RevealSection delay={0.05}>
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
        </RevealSection>
      </div>
    </PageTransition>
  )
}
