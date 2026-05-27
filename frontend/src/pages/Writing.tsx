import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { WritingPrompt, WritingResult, WritingFeedback } from '@/types'
import { ChevronLeft, Loader2 } from 'lucide-react'

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
    <div className="max-w-3xl space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-bold text-stone-800">写作练习</h1>
        <p className="text-stone-500 mt-1 text-sm">AI 从任务达成、连贯性、语言三个维度进行评分</p>
      </div>
      <div className="space-y-3">
        {prompts.map(p => (
          <button key={p.id} onClick={() => { setSelected(p); setResult(null); setEssay('') }}
            className="w-full text-left bg-white rounded-xl border border-stone-200 p-5 hover:border-teal-400 hover:shadow-sm transition-all">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              p.task_type === 'independent' ? 'bg-teal-100 text-teal-700' : 'bg-violet-100 text-violet-700'
            }`}>{p.task_type === 'independent' ? '独立写作' : '综合写作'}</span>
            <p className="mt-2 text-sm text-stone-700">{p.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  )

  const feedback: WritingFeedback | null = result ? JSON.parse(result.feedback_json) : null

  return (
    <div className="max-w-3xl space-y-6 animate-fade-up">
      <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-teal-600">
        <ChevronLeft className="h-4 w-4" /> 返回列表
      </button>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            selected.task_type === 'independent' ? 'bg-teal-100 text-teal-700' : 'bg-violet-100 text-violet-700'
          }`}>{selected.task_type === 'independent' ? '独立写作' : '综合写作'}</span>
        </div>
        <p className="text-sm text-amber-900 font-medium leading-relaxed">{selected.prompt}</p>
      </div>

      {!result ? (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-stone-500">论文</label>
              <span className={`text-xs font-mono ${wordCount >= minWords ? 'text-emerald-600' : 'text-rose-500'}`}>
                {wordCount} 词 {wordCount < minWords ? `(至少 ${minWords} 词)` : '✓'}
              </span>
            </div>
            <textarea rows={14} value={essay} onChange={e => setEssay(e.target.value)}
              className="w-full border border-stone-200 rounded-2xl px-5 py-4 text-sm resize-none bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400 leading-relaxed"
              placeholder="在此开始写作..." />
          </div>
          <button onClick={submit} disabled={loading || wordCount < 50}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> AI 评分中...</> : '提交获取 AI 反馈'}
          </button>
        </div>
      ) : feedback && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-xl font-semibold text-stone-800">评分结果</h3>
                <p className="text-sm text-stone-400">{feedback.band_descriptor}</p>
              </div>
              <div className="font-mono text-4xl font-bold text-teal-600">
                {result.total_score}<span className="text-lg text-stone-400">/90</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: '任务达成', value: result.task_achievement_score, color: 'text-teal-600' },
                { label: '连贯性', value: result.coherence_score, color: 'text-violet-600' },
                { label: '语言', value: result.language_score, color: 'text-emerald-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-stone-50 rounded-xl p-3 text-center">
                  <div className={`font-mono text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-stone-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-emerald-700 mb-2">优点</p>
                <ul className="space-y-1">{feedback.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-stone-600 flex gap-1.5"><span className="text-emerald-500">✓</span>{s}</li>
                ))}</ul>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-2">改进建议</p>
                <ul className="space-y-1">{feedback.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-stone-600 flex gap-1.5"><span className="text-amber-500">→</span>{s}</li>
                ))}</ul>
              </div>
            </div>
            {feedback.corrected_excerpt && (
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-teal-700 mb-1">修改示例</p>
                <p className="text-sm text-stone-700 italic">"{feedback.corrected_excerpt}"</p>
              </div>
            )}
          </div>
          <button onClick={() => setResult(null)} className="text-sm text-teal-600 hover:underline">修改文章</button>
        </div>
      )}
    </div>
  )
}
