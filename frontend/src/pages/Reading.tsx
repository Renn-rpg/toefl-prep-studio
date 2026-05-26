import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { ReadingPassage, ReadingPassageDetail, Question, VocabHighlight } from '@/types'
import { ChevronLeft, BookOpen } from 'lucide-react'

export function Reading() {
  const [passages, setPassages] = useState<ReadingPassage[]>([])
  const [selected, setSelected] = useState<ReadingPassageDetail | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ score: number; total_questions: number } | null>(null)
  const [activeWord, setActiveWord] = useState<VocabHighlight | null>(null)

  useEffect(() => { api.get<ReadingPassage[]>('/reading/passages').then(setPassages) }, [])

  async function selectPassage(id: number) {
    setResult(null); setAnswers({}); setActiveWord(null)
    const d = await api.get<ReadingPassageDetail>(`/reading/passages/${id}`)
    setSelected(d)
  }

  async function submit() {
    if (!selected) return
    const r = await api.post<{ score: number; total_questions: number }>('/reading/answer', {
      passage_id: selected.id, answers_json: JSON.stringify(answers), duration_seconds: 900
    })
    setResult(r)
    await api.post('/progress/activity', {
      activity_date: new Date().toISOString().split('T')[0], minutes_studied: 20,
      modules_practiced: JSON.stringify(['reading'])
    })
  }

  function renderContent(content: string, highlights: VocabHighlight[]) {
    return content.split(' ').map((word, i) => {
      const clean = word.replace(/[^a-zA-Z]/g, '').toLowerCase()
      const match = highlights.find(h => h.word.toLowerCase() === clean)
      if (match) return (
        <span key={i}>
          <button onClick={() => setActiveWord(activeWord?.word === match.word ? null : match)}
            className="text-blue-600 border-b border-dotted border-blue-400 hover:bg-blue-50 transition-colors">
            {word}
          </button>{' '}
        </span>
      )
      return <span key={i}>{word} </span>
    })
  }

  if (!selected) return (
    <div className="max-w-3xl space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-800">阅读练习</h1>
        <p className="text-slate-500 mt-1 text-sm">点击蓝色单词查看释义，完成后提交答案</p>
      </div>
      <div className="space-y-3">
        {passages.map(p => (
          <button key={p.id} onClick={() => selectPassage(p.id)}
            className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-400 hover:shadow-sm transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <BookOpen className="h-5 w-5 text-emerald-500" />
                </div>
                <span className="font-semibold text-slate-800">{p.title}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                p.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>{p.difficulty}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6 animate-fade-up">
      <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700">
        <ChevronLeft className="h-4 w-4" /> 返回列表
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-display text-xl font-semibold text-slate-800 mb-4">{selected.title}</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          {renderContent(selected.content, selected.vocab_highlights)}
        </p>
      </div>

      {activeWord && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start justify-between">
          <div>
            <span className="font-semibold text-blue-800 font-display">{activeWord.word}</span>
            <span className="text-slate-600 text-sm ml-2">— {activeWord.definition}</span>
          </div>
          <button onClick={() => setActiveWord(null)} className="text-slate-400 hover:text-slate-600 ml-3">✕</button>
        </div>
      )}

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
          <div className="text-sm text-slate-500 mt-1">答对题数</div>
        </div>
      )}
    </div>
  )
}
