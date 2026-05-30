import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import { MEDIA } from '@/lib/media'
import type { WritingPrompt, WritingResult, WritingFeedback } from '@/types'
import { useGsapCounter } from '@/hooks/useGsap'
import { ChevronLeft, Loader2, PenLine } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import gsap from 'gsap'

export function Writing() {
  const [prompts, setPrompts] = useState<WritingPrompt[]>([])
  const [selected, setSelected] = useState<WritingPrompt | null>(null)
  const [essay, setEssay] = useState('')
  const [result, setResult] = useState<WritingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length
  const minWords = selected?.task_type === 'independent' ? 300 : 150

  // Refs for GSAP
  const promptListRef = useRef<HTMLDivElement>(null)
  const scoreGridRef = useRef<HTMLDivElement>(null)
  const submitBtnRef = useRef<HTMLButtonElement>(null)
  const wordCountLabelRef = useRef<HTMLSpanElement>(null)

  // useGsapCounter for word count — 词数数字动画
  const { ref: wordNumberRef } = useGsapCounter<HTMLSpanElement>(wordCount, { duration: 0.5, ease: 'power2.out' })

  // useGsapCounter for total score
  const totalScoreValue = result?.total_score ?? 0
  const { ref: totalScoreRef } = useGsapCounter<HTMLDivElement>(totalScoreValue, { duration: 1.2, delay: 0.3 })

  useEffect(() => { api.get<WritingPrompt[]>('/writing/prompts').then(setPrompts) }, [])

  // GSAP stagger 入场 — 题目列表 (替换 StaggerContainer/StaggerItem)
  useEffect(() => {
    if (prompts.length === 0) return
    const el = promptListRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.from('.writing-prompt-item', {
        opacity: 0,
        y: 24,
        duration: 0.6,
        stagger: 0.07,
        ease: 'power3.out',
      })
    }, el)
    return () => ctx.revert()
  }, [prompts])

  // GSAP staggered from() for 3 score categories on result load
  useEffect(() => {
    if (!result) return
    const el = scoreGridRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.from('.score-category', {
        opacity: 0,
        y: 16,
        scale: 0.9,
        duration: 0.55,
        stagger: 0.1,
        ease: 'power3.out',
        delay: 0.1,
      })
    }, el)
    return () => ctx.revert()
  }, [result])

  // GSAP 词数颜色过渡 — 词数超过最低要求时从红色过渡到白色
  useEffect(() => {
    const el = wordCountLabelRef.current
    if (!el) return
    const meetsMin = wordCount >= minWords
    gsap.to(el, {
      color: meetsMin ? 'rgb(52,211,153)' : 'rgb(251,113,133)', // emerald-400 : rose-400
      duration: 0.4,
      ease: 'power2.out',
    })
  }, [wordCount, minWords])

  // GSAP 提交按钮脉冲缩放
  const pulseSubmit = useCallback(() => {
    const el = submitBtnRef.current
    if (!el) return
    gsap.fromTo(
      el,
      { scale: 1 },
      {
        scale: 0.95,
        duration: 0.1,
        ease: 'power2.in',
        onComplete: () => {
          gsap.to(el, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.4)' })
        },
      },
    )
  }, [])

  async function submit() {
    if (!selected) return
    pulseSubmit()
    setLoading(true)
    try {
      const r = await api.post<WritingResult>('/writing/submit', {
        task_type: selected.task_type, prompt: selected.prompt, essay_text: essay
      })
      setResult(r)
      await api.post('/progress/activity', {
        activity_date: new Date().toISOString().split('T')[0], minutes_studied: 25,
        modules_practiced: JSON.stringify(['writing'])
      })
    } finally { setLoading(false) }
  }

  if (!selected) return (
    <PageTransition>
      <div className="max-w-full lg:max-w-3xl space-y-8">
        <div className="hero-image-overlay rounded-2xl -mx-2 overflow-hidden">
          <img src={MEDIA.writing.header} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
          <div className="relative z-[2] p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <PenLine className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-[1.75rem] font-bold text-slate-100 tracking-tight">写作练习</h1>
                <p className="text-slate-400 text-sm">AI 从任务达成、连贯性、语言三个维度评分</p>
              </div>
            </div>
          </div>
        </div>

        {/* GSAP stagger 入场 — 题目卡片 */}
        <div ref={promptListRef} className="space-y-3">
          {prompts.map((p) => (
            <div key={p.id} className="writing-prompt-item">
              <button onClick={() => { setSelected(p); setResult(null); setEssay('') }}
                className="w-full text-left card-glow p-5">
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${
                  p.task_type === 'independent'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                }`}>{p.task_type === 'independent' ? '独立写作' : '综合写作'}</span>
                <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">{p.prompt}</p>
              </button>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  )

  const feedback: WritingFeedback | null = result ? JSON.parse(result.feedback_json) : null

  return (
    <PageTransition>
      <div className="max-w-full lg:max-w-3xl space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors font-medium">
          <ChevronLeft className="h-4 w-4" /> 返回列表
        </button>

        <div className="glass-card-static p-6 border-l-[3px] border-l-amber-500/40">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${
              selected.task_type === 'independent'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
            }`}>{selected.task_type === 'independent' ? '独立写作' : '综合写作'}</span>
          </div>
          <p className="text-sm text-slate-100 font-medium leading-relaxed">{selected.prompt}</p>
        </div>

        {!result ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-400">你的作文</label>
                {/* GSAP 词数 — 数字动画 + 颜色过渡 */}
                <span ref={wordCountLabelRef} className="text-xs font-mono font-medium">
                  <span ref={wordNumberRef} className="font-mono">0</span> 词
                  {wordCount < minWords ? ` (建议至少 ${minWords} 词)` : ' ✓ 达标'}
                </span>
              </div>
              <textarea rows={14} value={essay} onChange={e => setEssay(e.target.value)}
                className="w-full input-dark rounded-2xl px-5 py-4 text-sm resize-none leading-relaxed"
                placeholder="在此开始写作..." />
            </div>
            <button
              ref={submitBtnRef}
              onClick={submit}
              disabled={loading || wordCount < 50}
              className="flex items-center gap-2 btn-gradient px-6 py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> AI 评分中...</> : '提交获取 AI 反馈'}
            </button>
          </div>
        ) : feedback && (
          <div className="space-y-5">
            <div className="glass-card-static p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display text-xl font-semibold text-slate-100">评分结果</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{feedback.band_descriptor}</p>
                </div>
                <div className="text-right">
                  {/* GSAP 总分计数动画 */}
                  <div ref={totalScoreRef} className="font-mono text-4xl font-bold text-amber-400">0</div>
                  <div className="text-xs text-slate-500">/ 90 分</div>
                </div>
              </div>

              {/* GSAP staggered from() 评分分类 */}
              <div ref={scoreGridRef} className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: '任务达成', value: result.task_achievement_score, color: 'text-amber-400', bg: 'bg-amber-500/[0.08]' },
                  { label: '连贯性', value: result.coherence_score, color: 'text-violet-400', bg: 'bg-violet-500/[0.08]' },
                  { label: '语言质量', value: result.language_score, color: 'text-emerald-400', bg: 'bg-emerald-500/[0.08]' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`score-category ${bg} rounded-xl p-4 text-center`}>
                    <div className={`font-mono text-2xl font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">{label}</div>
                    <div className="text-[10px] text-slate-500">/ 30</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-emerald-500/[0.06] rounded-xl p-4 border border-emerald-500/10">
                  <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wide">优点</p>
                  <ul className="space-y-1">
                    {feedback.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-slate-300 flex gap-2">
                        <span className="text-emerald-400 flex-shrink-0">+</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-amber-500/[0.06] rounded-xl p-4 border border-amber-500/10">
                  <p className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wide">改进建议</p>
                  <ul className="space-y-1">
                    {feedback.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-slate-300 flex gap-2">
                        <span className="text-amber-400 flex-shrink-0">→</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {feedback.corrected_excerpt && (
                <div className="bg-indigo-500/[0.06] border border-indigo-500/10 rounded-xl p-4">
                  <p className="text-xs font-semibold text-indigo-400 mb-1.5 uppercase tracking-wide">修改示例</p>
                  <p className="text-sm text-slate-300 italic leading-relaxed">"{feedback.corrected_excerpt}"</p>
                </div>
              )}
            </div>
            <button onClick={() => setResult(null)} className="text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors">
              修改文章
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
