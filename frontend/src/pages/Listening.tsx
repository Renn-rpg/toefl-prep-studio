import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { ListeningPassage, ListeningPassageDetail, Question } from '@/types'
import { Headphones, ChevronLeft } from 'lucide-react'

function DifficultyBadge({ level }: { level: string }) {
  const color = level === 'easy' ? 'bg-emerald-100 text-emerald-700'
    : level === 'medium' ? 'bg-amber-100 text-amber-700'
    : 'bg-rose-100 text-rose-700'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${color}`}>{level}</span>
}

export function Listening() {
  const [passages, setPassages] = useState<ListeningPassage[]>([])
  const [selected, setSelected] = useState<ListeningPassageDetail | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ score: number; total_questions: number } | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)

  useEffect(() => { api.get<ListeningPassage[]>('/listening/passages').then(setPassages) }, [])

  async function selectPassage(id: number) {
    setResult(null); setAnswers({}); setShowTranscript(false)
    const detail = await api.get<ListeningPassageDetail>(`/listening/passages/${id}`)
    setSelected(detail)
  }

  async function submit() {
    if (!selected) return
    const r = await api.post<{ score: number; total_questions: number }>('/listening/answer', {
      passage_id: selected.id, answers_json: JSON.stringify(answers), duration_seconds: 600
    })
    setResult(r)
    await api.post('/progress/activity', {
      activity_date: new Date().toISOString().split('T')[0], minutes_studied: 15,
      modules_practiced: JSON.stringify(['listening'])
    })
  }

  if (!selected) return (
    <div className="max-w-3xl space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-800">听力练习</h1>
        <p className="text-slate-500 mt-1 text-sm">选择一段听力材料开始练习</p>
      </div>
      <div className="space-y-3">
        {passages.map(p => (
          <button key={p.id} onClick={() => selectPassage(p.id)}
            className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-400 hover:shadow-sm transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Headphones className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{p.title}</div>
                  <div className="text-xs text-slate-400 capitalize mt-0.5">{p.passage_type}</div>
                </div>
              </div>
              <DifficultyBadge level={p.difficulty} />
            </div>
          </button>
        ))}
        {passages.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            暂无题目，请先运行 <code className="bg-slate-100 px-1 rounded">python seed_db.py</code>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6 animate-fade-up">
      <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700">
        <ChevronLeft className="h-4 w-4" /> 返回列表
      </button>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-slate-800">{selected.title}</h2>
          <DifficultyBadge level={selected.difficulty} />
        </div>
        {/* Transcript toggle */}
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="text-xs text-blue-600 hover:underline mb-3"
        >
          {showTranscript ? '隐藏文本' : '显示文本（跟读练习）'}
        </button>
        {showTranscript && (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm text-slate-600 leading-relaxed border border-slate-100">
            {selected.transcript}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {selected.questions.map((q: Question) => (
          <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="font-medium text-slate-800 mb-3">{q.question}</p>
            <div className="space-y-2">
              {q.options.map(opt => (
                <label key={opt} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                  answers[String(q.id)] === opt ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
                }`}>
                  <input type="radio" name={`q-${q.id}`} value={opt}
                    checked={answers[String(q.id)] === opt}
                    onChange={() => setAnswers({ ...answers, [String(q.id)]: opt })}
                    className="accent-blue-600" />
                  <span className="text-sm text-slate-700">{opt}</span>
                </label>
              ))}
            </div>
            {result && (
              <div className={`mt-3 text-xs font-medium px-3 py-1.5 rounded-lg ${
                answers[String(q.id)] === q.answer ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {answers[String(q.id)] === q.answer ? '✓ 正确' : `✗ 错误 — 正确答案: ${q.answer}`}
                {q.explanation && ` · ${q.explanation}`}
              </div>
            )}
          </div>
        ))}
      </div>

      {!result ? (
        <button onClick={submit}
          disabled={Object.keys(answers).length < selected.questions.length}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors">
          提交答案
        </button>
      ) : (
        <div className="bg-white rounded-xl border border-emerald-200 p-5 text-center">
          <div className="font-mono text-4xl font-bold text-blue-600">{result.score}<span className="text-xl text-slate-400">/{result.total_questions}</span></div>
          <div className="text-sm text-slate-500 mt-1">得分</div>
        </div>
      )}
    </div>
  )
}
