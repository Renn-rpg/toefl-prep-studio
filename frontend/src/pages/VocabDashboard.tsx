import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { MEDIA } from '@/lib/media'
import type { VocabStats, VocabSettings } from '@/types'
import { BookA, Flame, Target, Clock, Zap, Settings, ChevronRight } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import { StaggerContainer } from '@/components/motion/StaggerContainer'
import { StaggerItem } from '@/components/motion/StaggerItem'

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: 'pink' | 'violet' | 'amber' | 'cyan'
}) {
  const palettes = {
    pink:   { iconBg: 'bg-gradient-to-br from-pink-500 to-pink-400', accent: 'from-pink-500 to-pink-400' },
    violet: { iconBg: 'bg-gradient-to-br from-violet-500 to-violet-400', accent: 'from-violet-400 to-violet-300' },
    amber:  { iconBg: 'bg-gradient-to-br from-amber-500 to-amber-400', accent: 'from-amber-400 to-amber-300' },
    cyan:   { iconBg: 'bg-gradient-to-br from-cyan-500 to-cyan-400', accent: 'from-cyan-400 to-cyan-300' },
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

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="font-mono text-slate-400 text-xs">{count}</span>
      </div>
      <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${Math.max(pct, 4)}%` }} />
      </div>
    </div>
  )
}

export function VocabDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<VocabStats | null>(null)
  const [settings, setSettings] = useState<VocabSettings | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    api.get<VocabStats>('/vocab/stats').then(setStats).catch(() => {})
    api.get<VocabSettings>('/vocab/settings').then(setSettings).catch(() => {})
  }, [])

  async function updateSettings(patch: Partial<VocabSettings>) {
    if (!settings) return
    const updated = { ...settings, ...patch }
    setSettings(updated)
    await api.put('/vocab/settings', updated).catch(() => {})
  }

  const total = stats?.all_time.total_words ?? 0

  return (
    <PageTransition>
      <div className="max-w-full lg:max-w-5xl space-y-10">
        {/* Header with image */}
        <div className="hero-image-overlay rounded-2xl -mx-2 overflow-hidden">
          <img src={MEDIA.vocab.header} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
          <div className="relative z-[2] p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center shadow-lg shadow-pink-500/25">
                <BookA className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-[1.75rem] font-bold text-slate-100 tracking-tight">词汇背诵</h1>
                <p className="text-slate-400 text-sm">间隔重复，科学记忆 400 个 TOEFL 核心词汇</p>
              </div>
            </div>
          </div>
        </div>

        {/* Today stats */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StaggerItem><StatCard icon={Zap} label="今日新词" value={stats?.today.new_words ?? 0} color="pink" /></StaggerItem>
          <StaggerItem><StatCard icon={Target} label="今日复习" value={stats?.today.reviewed_words ?? 0} color="violet" /></StaggerItem>
          <StaggerItem><StatCard icon={Flame} label="连续天数" value={stats?.streak_days ?? 0} color="amber" /></StaggerItem>
          <StaggerItem><StatCard icon={Clock} label="待复习" value={stats?.words_due_today ?? 0} color="cyan" /></StaggerItem>
        </StaggerContainer>

        {/* Status distribution + Start */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-pink-500 to-pink-300" />
              <h2 className="font-display text-lg font-semibold text-slate-100">词汇掌握分布</h2>
            </div>
            <p className="text-xs text-slate-500 mb-6">各阶段词汇数量统计</p>
            <div className="space-y-5">
              <StatusBar label="已掌握 Mastered" count={stats?.all_time.mastered ?? 0} total={total} color="bg-gradient-to-r from-emerald-500 to-emerald-400" />
              <StatusBar label="复习中 Reviewing" count={stats?.all_time.reviewing ?? 0} total={total} color="bg-gradient-to-r from-violet-500 to-violet-400" />
              <StatusBar label="学习中 Learning" count={stats?.all_time.learning ?? 0} total={total} color="bg-gradient-to-r from-amber-500 to-amber-400" />
              <StatusBar label="未学习 New" count={stats?.all_time.new ?? 0} total={total} color="bg-gradient-to-r from-slate-500 to-slate-400" />
            </div>
            <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-sm text-slate-400 font-medium">总词量</span>
              <span className="font-mono font-bold text-slate-100 text-lg">{total}</span>
            </div>
          </div>

          <div className="glass-card-static p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-pink-500 to-pink-300" />
                <h2 className="font-display text-lg font-semibold text-slate-100">今日学习</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                {stats?.words_due_today
                  ? `有 ${stats.words_due_today} 个词需要复习`
                  : '暂无待复习词汇，可以学习新词'}
              </p>
              {stats?.today.accuracy !== undefined && stats.today.accuracy > 0 && (
                <div className="mb-6 flex items-center gap-6">
                  <div className="text-center">
                    <div className="font-mono text-2xl font-bold text-pink-400">{stats.today.accuracy}%</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-medium">正确率</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-2xl font-bold text-slate-200">{stats.today.minutes_studied}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-medium">学习分钟</div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <button onClick={() => navigate('/vocab/study')}
                className="w-full btn-gradient py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                开始学习 <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={() => setShowSettings(!showSettings)}
                className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-200 py-2 transition-colors font-medium">
                <Settings className="h-4 w-4" /> 学习设置
              </button>
            </div>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && settings && (
          <div className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-pink-500 to-pink-300" />
              <h2 className="font-display text-lg font-semibold text-slate-100">学习设置</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  每日新词数量: <span className="font-mono text-pink-400 font-bold">{settings.daily_new_words}</span>
                </label>
                <input type="range" min={5} max={50} step={5}
                  value={settings.daily_new_words}
                  onChange={e => updateSettings({ daily_new_words: Number(e.target.value) })}
                  className="w-full accent-pink-500 h-2" />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-medium">
                  <span>5</span><span>50</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  每日复习上限: <span className="font-mono text-violet-400 font-bold">{settings.daily_review_limit}</span>
                </label>
                <input type="range" min={20} max={200} step={10}
                  value={settings.daily_review_limit}
                  onChange={e => updateSettings({ daily_review_limit: Number(e.target.value) })}
                  className="w-full accent-violet-500 h-2" />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-medium">
                  <span>20</span><span>200</span>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.auto_pronounce}
                  onChange={e => updateSettings({ auto_pronounce: e.target.checked })}
                  className="w-4 h-4 accent-pink-500 rounded" />
                <span className="text-sm text-slate-300 font-medium">自动朗读发音</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.show_cn_definition}
                  onChange={e => updateSettings({ show_cn_definition: e.target.checked })}
                  className="w-4 h-4 accent-pink-500 rounded" />
                <span className="text-sm text-slate-300 font-medium">显示中文释义</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
