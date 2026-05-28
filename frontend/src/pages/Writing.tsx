import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { MEDIA } from '@/lib/media'
import type { WritingPrompt, WritingResult, WritingFeedback } from '@/types'
import { ChevronLeft, Loader2, PenLine } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import { StaggerContainer } from '@/components/motion/StaggerContainer'
import { StaggerItem } from '@/components/motion/StaggerItem'

export function Writing() {
  const [prompts, setPrompts] = useState<WritingPrompt[]>([])
  const [selected, setSelected] = useState<WritingPrompt | null>(null)
  const [essay, setEssay] = useState('')
  const [result, setResult] = useState<WritingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length
  const minWords = selected?.task_type === 'independent' ? 300 : 150

  useEffect(() => { api.get<WritingPrompt[]>('/writing/prompts').then(setPrompts) }, [])

  async function submit() {
    if (!selected) return
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

        <StaggerContainer className="space-y-3">
          {prompts.map((p) => (
            <StaggerItem key={p.id}>
              <button onClick={() => { setSelected(p); setResult(null); setEssay('') }}
                className="w-full text-left glass-card p-5">
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${
                  p.task_type === 'independent'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                }`}>{p.task_type === 'independent' ? '独立写作' : '综合写作'}</span>
                <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">{p.prompt}</p>
              </button>
            </StaggerItem>
          ))}
        </StaggerContainer>
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
                <span className={`text-xs font-mono font-medium ${
                  wordCount >= minWords ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {wordCount} 词 {wordCount < minWords ? `(建议至少 ${minWords} 词)` : '✓ 达标'}
                </span>
              </div>
              <textarea rows={14} value={essay} onChange={e => setEssay(e.target.value)}
                className="w-full input-dark rounded-2xl px-5 py-4 text-sm resize-none leading-relaxed"
                placeholder="在此开始写作..." />
            </div>
            <button onClick={submit} disabled={loading || wordCount < 50}
              className="flex items-center gap-2 btn-gradient px-6 py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
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
                  <div className="font-mono text-4xl font-bold text-amber-400">
                    {result.total_score}
                  </div>
                  <div className="text-xs text-slate-500">/ 90 分</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: '任务达成', value: result.task_achievement_score, color: 'text-amber-400', bg: 'bg-amber-500/[0.08]' },
                  { label: '连贯性', value: result.coherence_score, color: 'text-violet-400', bg: 'bg-violet-500/[0.08]' },
                  { label: '语言质量', value: result.language_score, color: 'text-emerald-400', bg: 'bg-emerald-500/[0.08]' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
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
