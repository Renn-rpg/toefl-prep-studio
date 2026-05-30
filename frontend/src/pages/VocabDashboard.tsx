import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { MEDIA } from '@/lib/media'
import type { VocabStats, VocabSettings, FrequencyTier } from '@/types'
import { BookA, Flame, Target, Clock, Zap, Settings, ChevronRight, FileSearch, Star, Brain, Volume2 } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGsapCounter } from '@/hooks/useGsap'

gsap.registerPlugin(ScrollTrigger)

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
  const numValue = typeof value === 'number' ? value : Number(value)
  const counter = useGsapCounter(Number.isNaN(numValue) ? 0 : numValue)

  return (
    <div className="card-glow relative overflow-hidden p-5 group">
      <div className={`absolute top-0 left-6 right-6 h-[3px] rounded-b-full bg-gradient-to-r ${p.accent} opacity-30 group-hover:opacity-60 transition-opacity duration-300`} />
      <div className="mt-1.5">
        <div className={`inline-flex p-2.5 rounded-xl mb-3 ${p.iconBg} shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="font-mono text-[2rem] font-bold text-slate-100 leading-none">
          <span ref={counter.ref}>0</span>
        </div>
        <div className="text-[13px] text-slate-400 mt-1.5 font-medium">{label}</div>
      </div>
    </div>
  )
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (barRef.current) {
      gsap.fromTo(barRef.current,
        { width: '0%' },
        { width: `${Math.max(pct, 4)}%`, duration: 1.2, ease: 'power3.out', delay: 0.3 }
      )
    }
  }, [pct])

  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="font-mono text-slate-400 text-xs">{count}</span>
      </div>
      <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div ref={barRef} className={`h-full ${color} rounded-full`} style={{ width: '0%' }} />
      </div>
    </div>
  )
}

export function VocabDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<VocabStats | null>(null)
  const [settings, setSettings] = useState<VocabSettings | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [bookmarkCount, setBookmarkCount] = useState(0)

  // GSAP refs
  const statCardsRef = useRef<HTMLDivElement>(null)
  const quickActionsRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get<VocabStats>('/vocab/stats').then(setStats).catch(() => {})
    api.get<VocabSettings>('/vocab/settings').then(setSettings).catch(() => {})
    api.get<{ total: number }>('/vocab/bookmarks?page=1&per_page=1').then(r => setBookmarkCount(r.total)).catch(() => {})
  }, [])

  async function updateSettings(patch: Partial<VocabSettings>) {
    if (!settings) return
    const updated = { ...settings, ...patch }
    setSettings(updated)
    await api.put('/vocab/settings', updated).catch(() => {})
  }

  // GSAP: stagger entrance for stat cards
  useEffect(() => {
    if (!statCardsRef.current || !stats) return
    const ctx = gsap.context(() => {
      gsap.from(statCardsRef.current!.children, {
        opacity: 0,
        y: 24,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power3.out',
      })
    }, statCardsRef)
    return () => ctx.revert()
  }, [stats])

  // GSAP: stagger entrance for quick action buttons
  useEffect(() => {
    if (!quickActionsRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(quickActionsRef.current!.children, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        stagger: 0.1,
        ease: 'power3.out',
        delay: 0.2,
      })
    }, quickActionsRef)
    return () => ctx.revert()
  }, [])

  // GSAP: slide down for settings panel
  useEffect(() => {
    if (showSettings && settingsRef.current) {
      gsap.from(settingsRef.current, {
        opacity: 0,
        y: -24,
        duration: 0.5,
        ease: 'power3.out',
      })
    }
  }, [showSettings])

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
                <p className="text-slate-400 text-sm">{total} 个 TOEFL 词汇 · 基于真题词频，重点突破</p>
              </div>
            </div>
          </div>
        </div>

        {/* Today stats */}
        <div ref={statCardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Zap} label="今日新词" value={stats?.today.new_words ?? 0} color="pink" />
          <StatCard icon={Target} label="今日复习" value={stats?.today.reviewed_words ?? 0} color="violet" />
          <StatCard icon={Flame} label="连续天数" value={stats?.streak_days ?? 0} color="amber" />
          <StatCard icon={Clock} label="待复习" value={stats?.words_due_today ?? 0} color="cyan" />
        </div>

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
              <button onClick={() => navigate('/vocab/mastery')}
                className="w-full btn-gradient py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                <Brain className="h-4 w-4" /> 精背模式 <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={() => navigate('/vocab/study')}
                className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-200 py-2.5 rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition-all font-medium">
                翻牌学习
              </button>
              <button onClick={() => setShowSettings(!showSettings)}
                className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-200 py-2 transition-colors font-medium">
                <Settings className="h-4 w-4" /> 学习设置
              </button>
            </div>
          </div>
        </div>

        {/* Frequency tier distribution */}
        {stats?.frequency_tiers && (
          <div className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-rose-500 to-rose-300" />
              <h2 className="font-display text-lg font-semibold text-slate-100">考频分布</h2>
              <span className="text-[11px] text-slate-500 ml-2">基于托福真题 + AWL 学术词表</span>
            </div>
            <p className="text-xs text-slate-500 mb-6">高频词优先推荐学习，提高备考效率</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {(['high', 'medium', 'low'] as FrequencyTier[]).map(tier => {
                const data = stats.frequency_tiers![tier]
                const config = {
                  high:   { label: '高频核心词', bar: 'bg-gradient-to-r from-rose-500 to-rose-400', dot: 'bg-rose-500', desc: '真题出现 ≥30次 或 AWL 1-3级' },
                  medium: { label: '中频词', bar: 'bg-gradient-to-r from-amber-500 to-amber-400', dot: 'bg-amber-500', desc: '真题出现 10-29次 或 AWL 4-7级' },
                  low:    { label: '低频词', bar: 'bg-gradient-to-r from-slate-500 to-slate-400', dot: 'bg-slate-500', desc: '其他词汇' },
                }[tier]
                const masteredPct = data.total > 0 ? Math.round(data.mastered / data.total * 100) : 0
                return (
                  <div key={tier} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                      <span className="text-sm font-semibold text-slate-200">{config.label}</span>
                      <span className="font-mono text-xs text-slate-500">{data.total} 词</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={`h-full ${config.bar} rounded-full transition-all duration-1000`}
                        style={{ width: `${masteredPct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>已掌握 {data.mastered}</span>
                      <span>{masteredPct}%</span>
                    </div>
                    <p className="text-[11px] text-slate-600">{config.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick modes */}
        <div ref={quickActionsRef} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => navigate('/vocab/mastery')}
            className="glass-card-static p-5 text-left hover:border-violet-500/20 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                <Brain className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">精背模式</p>
                <p className="text-xs text-slate-500 mt-0.5">3阶段渐进掌握</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 ml-auto group-hover:text-violet-400 transition-colors" />
            </div>
          </button>
          <button onClick={() => navigate('/vocab/quiz')}
            className="glass-card-static p-5 text-left hover:border-pink-500/20 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                <FileSearch className="h-5 w-5 text-pink-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">选择题模式</p>
                <p className="text-xs text-slate-500 mt-0.5">看词选释义 / 看释义选词，4选1</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 ml-auto group-hover:text-pink-400 transition-colors" />
            </div>
          </button>
          <button onClick={() => navigate('/vocab/bookmarks')}
            className="glass-card-static p-5 text-left hover:border-pink-500/20 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <Star className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">生词本</p>
                <p className="text-xs text-slate-500 mt-0.5">{bookmarkCount > 0 ? `${bookmarkCount} 个已收藏词汇` : '暂无收藏'}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 ml-auto group-hover:text-amber-400 transition-colors" />
            </div>
          </button>
        </div>

        {/* Settings panel */}
        {showSettings && settings && (
          <div ref={settingsRef} className="glass-card-static p-6">
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
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.sound_effects ?? true}
                  onChange={e => updateSettings({ sound_effects: e.target.checked })}
                  className="w-4 h-4 accent-pink-500 rounded" />
                <span className="text-sm text-slate-300 font-medium">答题音效</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Volume2 className="h-3.5 w-3.5 inline mr-1.5" />发音偏好
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateSettings({ preferred_accent: 'us' })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      (settings.preferred_accent ?? 'us') === 'us'
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                        : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.06]'
                    }`}>美式</button>
                  <button
                    onClick={() => updateSettings({ preferred_accent: 'uk' })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      (settings.preferred_accent ?? 'us') === 'uk'
                        ? 'bg-violet-500/15 text-violet-400 border border-violet-500/25'
                        : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.06]'
                    }`}>英式</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
