import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { MEDIA } from '@/lib/media'
import type { StudyPlan, PlanWeek } from '@/types'
import { Sparkles, ChevronDown, ChevronUp, Loader2, ClipboardCheck } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'

function WeekCard({ week, index }: { week: PlanWeek; index: number }) {
  const [open, setOpen] = useState(week.week === 1)
  const cardRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<gsap.Context | null>(null)

  useEffect(() => {
    return () => ctxRef.current?.revert()
  }, [])

  const toggle = () => {
    if (!cardRef.current || !contentRef.current) {
      setOpen(!open)
      return
    }

    // GSAP Flip 实现平滑手风琴动画
    const state = Flip.getState(contentRef.current, { props: 'height,opacity' })

    setOpen(!open)

    ctxRef.current?.revert()
    ctxRef.current = gsap.context(() => {
      Flip.from(state, {
        duration: 0.45,
        ease: 'power3.inOut',
        absolute: true,
        onEnter: (els) => {
          gsap.fromTo(els, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.03 })
        },
      })
    })
  }

  // 入场动画
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    gsap.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.1 + index * 0.08, ease: 'power3.out' })
    // 初始状态记录
    ctxRef.current?.revert()
    ctxRef.current = gsap.context(() => {}, el)
  }, [])

  return (
    <div ref={cardRef} className="glass-card-static overflow-hidden" style={{ opacity: 0 }}>
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-500 text-white rounded-xl flex items-center justify-center text-sm font-mono font-bold shadow-md shadow-indigo-500/25">
            {week.week}
          </div>
          <div className="text-left">
            <div className="font-semibold text-slate-100">{week.focus}</div>
            <div className="text-xs text-slate-500 mt-0.5">{week.weekly_goal}</div>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>
      {open && (
        <div ref={contentRef} className="border-t border-white/[0.06] px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {week.daily_tasks.map((dt) => (
            <div key={dt.day} className="bg-white/[0.03] rounded-lg p-3">
              <div className="text-xs font-semibold text-indigo-400 mb-2">{dt.day}</div>
              <ul className="space-y-1">
                {dt.tasks.map((task, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="text-indigo-500 mt-0.5 flex-shrink-0">·</span>{task}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Plan() {
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ current_level: 'intermediate', target_score: 100, exam_date: '', weekly_hours: 10 })
  const formRef = useRef<HTMLDivElement>(null)
  const planRef = useRef<HTMLDivElement>(null)
  const tipsRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const ctxRef = useRef<gsap.Context | null>(null)

  useEffect(() => {
    api.get<StudyPlan>('/plan/latest').then(p => { if (p.plan) setPlan(p as StudyPlan) }).catch(() => {})
    return () => ctxRef.current?.revert()
  }, [])

  // 计划生成后触发的入场动画
  useEffect(() => {
    if (!plan?.plan || !planRef.current) return

    ctxRef.current?.revert()
    ctxRef.current = gsap.context(() => {
      const tl = gsap.timeline()

      // 标题
      tl.fromTo(planRef.current!.querySelector('h2')!, { opacity: 0, x: -10 }, {
        opacity: 1, x: 0, duration: 0.4, ease: 'power3.out',
      }, 0)

      // 提示卡
      if (tipsRef.current) {
        tl.fromTo(tipsRef.current, { opacity: 0, y: 16, rotateX: 8 }, {
          opacity: 1, y: 0, rotateX: 0, duration: 0.5, ease: 'back.out(1.4)',
        }, 0.1)
      }

      // 周卡片已在 WeekCard 组件内各自入场
    })
  }, [plan?.plan])

  // Loading 按钮脉冲
  useEffect(() => {
    if (!btnRef.current) return
    if (loading) {
      gsap.to(btnRef.current, {
        scale: 1.03,
        duration: 0.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
    } else {
      gsap.to(btnRef.current, { scale: 1, duration: 0.2, overwrite: 'auto' })
    }
  }, [loading])

  async function generate() {
    if (!form.exam_date) return
    setLoading(true)
    try {
      const result = await api.post<StudyPlan>('/plan/generate', form)
      setPlan(result)
      // 成功后滚动到计划区域
      setTimeout(() => {
        planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    } finally { setLoading(false) }
  }

  return (
    <PageTransition>
      <div className="max-w-full lg:max-w-3xl space-y-8">
        {/* Header with image */}
        <div className="hero-image-overlay rounded-2xl -mx-2 overflow-hidden">
          <img src={MEDIA.plan.header} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
          <div className="relative z-[2] p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <ClipboardCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-[1.75rem] font-bold text-slate-100 tracking-tight">个性化备考计划</h1>
                <p className="text-slate-400 text-sm">基于你的水平和目标 · <span className="text-gradient-flow font-medium">AI 定制专属学习路径</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div ref={formRef} className="glass-card-static p-6">
          <h2 className="font-display text-lg font-semibold text-slate-100 mb-5">生成新计划</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">当前水平</label>
              <select
                className="w-full input-dark px-3 py-2.5 text-sm"
                value={form.current_level}
                onChange={e => setForm({ ...form, current_level: e.target.value })}
              >
                <option value="beginner">初级 (Beginner)</option>
                <option value="intermediate">中级 (Intermediate)</option>
                <option value="advanced">高级 (Advanced)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">目标分数 (满分 120)</label>
              <input type="number" min={60} max={120}
                className="w-full input-dark px-3 py-2.5 text-sm"
                value={form.target_score}
                onChange={e => setForm({ ...form, target_score: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">考试日期</label>
              <input type="date"
                className="w-full input-dark px-3 py-2.5 text-sm"
                value={form.exam_date}
                onChange={e => setForm({ ...form, exam_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">每周可用时间 (小时)</label>
              <input type="number" min={1} max={40}
                className="w-full input-dark px-3 py-2.5 text-sm"
                value={form.weekly_hours}
                onChange={e => setForm({ ...form, weekly_hours: Number(e.target.value) })} />
            </div>
          </div>
          <button ref={btnRef} onClick={generate} disabled={loading || !form.exam_date}
            className="flex items-center gap-2 btn-gradient px-6 py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'AI 正在生成计划...' : '生成个性化计划'}
          </button>
        </div>

        {/* Plan display */}
        {plan?.plan && (
          <div ref={planRef} className="space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
              <h2 className="font-display text-xl font-semibold text-slate-100">
                你的学习计划 · <span className="text-brand-400">{plan.plan.total_weeks} 周</span>
              </h2>
            </div>

            {plan.plan.study_tips?.length > 0 && (
              <div ref={tipsRef} className="glass-card-static px-5 py-4 border-indigo-500/20" style={{ opacity: 0 }}>
                <div className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wide">备考小贴士</div>
                <ul className="space-y-1">
                  {plan.plan.study_tips.map((tip, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5 flex-shrink-0">✦</span>{tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3">
              {plan.plan.weeks?.map((week, i) => <WeekCard key={week.week} week={week} index={i} />)}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
