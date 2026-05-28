import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { MEDIA } from '@/lib/media'
import type { ReadingPassage, ReadingPassageDetail, Question, VocabHighlight } from '@/types'
import { ChevronLeft, BookOpen } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import { StaggerContainer } from '@/components/motion/StaggerContainer'
import { StaggerItem } from '@/components/motion/StaggerItem'

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
            className="text-emerald-400 border-b border-dashed border-emerald-500/30 hover:bg-emerald-500/10 px-0.5 rounded transition-colors">
            {word}
          </button>{' '}
        </span>
      )
      return <span key={i}>{word} </span>
    })
  }

  if (!selected) return (
    <PageTransition>
      <div className="max-w-full lg:max-w-3xl space-y-8">
        {/* Header with image */}
        <div className="hero-image-overlay rounded-2xl -mx-2 overflow-hidden">
          <img src={MEDIA.reading.header} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
          <div className="relative z-[2] p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-[1.75rem] font-bold text-slate-100 tracking-tight">阅读练习</h1>
                <p className="text-slate-400 text-sm">点击绿色单词查看释义，完成后提交答案</p>
              </div>
            </div>
          </div>
        </div>

        <StaggerContainer className="space-y-3">
          {passages.map((p) => (
            <StaggerItem key={p.id}>
              <button onClick={() => selectPassage(p.id)}
                className="w-full text-left card-glow p-5 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/15 transition-colors">
                      <BookOpen className="h-5 w-5 text-emerald-400" />
                    </div>
                    <span className="font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">{p.title}</span>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium border capitalize ${
                    p.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : p.difficulty === 'hard' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>{p.difficulty === 'easy' ? '简单' : p.difficulty === 'hard' ? '困难' : '中等'}</span>
                </div>
              </button>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </PageTransition>
  )

  return (
    <PageTransition>
      <div className="max-w-full lg:max-w-3xl space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
          <ChevronLeft className="h-4 w-4" /> 返回列表
        </button>

        <div className="glass-card-static p-6">
          <h2 className="font-display text-xl font-semibold text-slate-100 mb-5">{selected.title}</h2>
          <div className="text-sm leading-[1.8] text-slate-300">
            {renderContent(selected.content, selected.vocab_highlights)}
          </div>
        </div>

        {activeWord && (
          <div className="glass-card-elevated p-4 flex items-start justify-between border-emerald-500/20">
            <div>
              <span className="font-semibold text-emerald-400 font-display text-lg">{activeWord.word}</span>
              <span className="text-slate-300 text-sm ml-3">— {activeWord.definition}</span>
            </div>
            <button onClick={() => setActiveWord(null)} className="text-slate-500 hover:text-slate-300 ml-3 text-sm">✕</button>
          </div>
        )}

        <div className="space-y-4">
          {selected.questions.map((q: Question, i: number) => (
            <div key={q.id} className="glass-card-static p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-mono font-bold text-emerald-400">{i + 1}</span>
                </div>
                <p className="font-medium text-slate-100">{q.question}</p>
              </div>
              <div className="space-y-2 ml-9">
                {q.options.map(opt => (
                  <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    answers[String(q.id)] === opt
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'hover:bg-white/[0.03] border border-transparent'
                  }`}>
                    <input type="radio" name={`q-${q.id}`} value={opt}
                      checked={answers[String(q.id)] === opt}
                      onChange={() => setAnswers({ ...answers, [String(q.id)]: opt })}
                      className="accent-emerald-500 w-4 h-4" />
                    <span className="text-sm text-slate-300">{opt}</span>
                  </label>
                ))}
              </div>
              {result && (
                <div className={`ml-9 mt-3 text-xs font-medium px-3 py-2 rounded-lg ${
                  answers[String(q.id)] === q.answer
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {answers[String(q.id)] === q.answer ? '正确' : `错误 — 正确答案: ${q.answer}`}
                  {q.explanation && <span className="block text-slate-500 mt-0.5">{q.explanation}</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        {!result ? (
          <button onClick={submit}
            disabled={Object.keys(answers).length < selected.questions.length}
            className="btn-gradient px-6 py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
            提交答案 ({Object.keys(answers).length}/{selected.questions.length})
          </button>
        ) : (
          <div className="glass-card-static p-6 text-center">
            <div className="font-mono text-5xl font-bold text-emerald-400 mb-1">
              {result.score}<span className="text-2xl text-slate-500">/{result.total_questions}</span>
            </div>
            <div className="text-sm text-slate-400 font-medium">正确率 {Math.round((result.score / result.total_questions) * 100)}%</div>
            <button onClick={() => setSelected(null)} className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
              返回列表，继续练习
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
