import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import gsap from 'gsap'
import { useGsapShake } from '@/hooks/useGsap'
import type { QuizSession, QuizResult } from '@/types'
import { ChevronLeft, Star, Check, X, Zap, Trophy, RotateCcw, BookOpen, FileSearch } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import { motion, AnimatePresence } from 'motion/react'

type Phase = 'config' | 'active' | 'reviewing' | 'finished'

export function VocabQuiz() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('config')
  const [mode, setMode] = useState<string>('word_to_def')
  const [count, setCount] = useState(10)
  const [session, setSession] = useState<QuizSession | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [answers, setAnswers] = useState<{ word_id: number; selected: string }[]>([])
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set())
  const [elapsed, setElapsed] = useState(0)

  // GSAP refs
  const questionContainerRef = useRef<HTMLDivElement>(null)
  const optionGridRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const { ref: shakeRef } = useGsapShake<HTMLDivElement>()
  const ctxRef = useRef<gsap.Context | null>(null)

  useEffect(() => {
    if (phase !== 'active') return
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  // Cleanup GSAP context
  useEffect(() => {
    return () => ctxRef.current?.revert()
  }, [])

  // Animate option buttons on each new question
  useEffect(() => {
    if (phase !== 'active' || !optionGridRef.current) return

    ctxRef.current?.revert()
    const ctx = gsap.context(() => {
      const buttons = optionGridRef.current?.querySelectorAll('button')
      if (buttons && buttons.length > 0) {
        gsap.from(buttons, {
          opacity: 0,
          y: 12,
          duration: 0.4,
          stagger: 0.06,
          ease: 'power3.out',
        })
      }
    })
    ctxRef.current = ctx
  }, [currentIndex, phase])

  async function startQuiz() {
    setElapsed(0)
    setAnswers([])
    setCurrentIndex(0)
    setSelected(null)
    setResult(null)
    const data = await api.get<QuizSession>(`/vocab/quiz?mode=${mode}&count=${count}`)
    setSession(data)
    setPhase('active')
  }

  function selectOption(key: string) {
    if (selected) return
    setSelected(key)
    const q = session!.questions[currentIndex]
    setAnswers(prev => [...prev, { word_id: q.word_id, selected: key }])

    // GSAP: shake on incorrect, pulse+glow on correct
    const selectedBtn = optionRefs.current.get(key)
    const correctKey = q.correct_key

    if (key !== correctKey && selectedBtn) {
      // Shake the wrong option
      gsap.to(selectedBtn, {
        x: [0, -8, 8, -6, 6, -3, 3, 0] as unknown as gsap.TweenValue,
        duration: 0.5,
        ease: 'power4.out',
      })
    }

    // Pulse + glow on correct answer
    const correctBtn = optionRefs.current.get(correctKey)
    if (correctBtn) {
      const tl = gsap.timeline()
      tl.to(correctBtn, {
        scale: 1.04,
        duration: 0.15,
        ease: 'power2.out',
      })
      tl.to(correctBtn, {
        boxShadow: '0 0 30px rgba(16,185,129,0.5), inset 0 0 10px rgba(16,185,129,0.08)',
        duration: 0.3,
        ease: 'power2.out',
      }, '<')
      tl.to(correctBtn, {
        scale: 1,
        boxShadow: 'none',
        duration: 0.4,
        ease: 'power3.in',
      })
    }

    setPhase('reviewing')
  }

  function advance() {
    if (currentIndex + 1 < (session?.questions.length ?? 0)) {
      setCurrentIndex(i => i + 1)
      setSelected(null)
      setPhase('active')
    } else {
      submitQuiz()
    }
  }

  async function submitQuiz() {
    if (!session) return
    const res = await api.post<QuizResult>('/vocab/quiz/submit', {
      quiz_id: session.quiz_id,
      answers,
    })
    setResult(res)
    setPhase('finished')
  }

  async function toggleBookmark(word_id: number) {
    if (bookmarkedIds.has(word_id)) {
      await api.delete(`/vocab/bookmark/${word_id}`)
      setBookmarkedIds(prev => { const n = new Set(prev); n.delete(word_id); return n })
    } else {
      await api.post(`/vocab/bookmark/${word_id}`, {})
      setBookmarkedIds(prev => new Set(prev).add(word_id))
    }
  }

  const setOptionRef = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) {
      optionRefs.current.set(key, el)
    } else {
      optionRefs.current.delete(key)
    }
  }

  // ── Config ──
  if (phase === 'config') return (
    <PageTransition>
      <div className="max-w-lg mx-auto space-y-8 py-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
            <FileSearch className="h-8 w-8 text-pink-400" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-100 mb-1">选择题模式</h1>
          <p className="text-slate-400 text-sm">看词选释义 或 看释义选词，4选1</p>
        </div>

        <div className="glass-card-static p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">模式</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode('word_to_def')}
                className={`p-4 rounded-xl border text-sm font-medium transition-all ${
                  mode === 'word_to_def'
                    ? 'bg-pink-500/10 border-pink-500/30 text-pink-400'
                    : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                }`}>
                <BookOpen className="h-5 w-5 mx-auto mb-1.5" /> 看词选释义
              </button>
              <button onClick={() => setMode('def_to_word')}
                className={`p-4 rounded-xl border text-sm font-medium transition-all ${
                  mode === 'def_to_word'
                    ? 'bg-pink-500/10 border-pink-500/30 text-pink-400'
                    : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                }`}>
                <FileSearch className="h-5 w-5 mx-auto mb-1.5" /> 看释义选词
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">题目数量：{count}</label>
            <input type="range" min={5} max={20} value={count} onChange={e => setCount(Number(e.target.value))}
              className="w-full accent-pink-500" />
            <div className="flex justify-between text-xs text-slate-500 mt-1"><span>5</span><span>20</span></div>
          </div>

          <button onClick={startQuiz}
            className="btn-gradient w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            <Zap className="h-4 w-4" /> 开始答题
          </button>
        </div>

        <button onClick={() => navigate('/vocab')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mx-auto font-medium">
          <ChevronLeft className="h-4 w-4" /> 返回词汇总览
        </button>
      </div>
    </PageTransition>
  )

  // ── Finished ──
  if (phase === 'finished' && result) {
    const pct = Math.round((result.score / result.total) * 100)
    return (
      <PageTransition>
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="w-28 h-28 rounded-3xl overflow-hidden mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-violet-500/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy className="h-12 w-12 text-pink-400 drop-shadow-lg" />
            </div>
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-100 mb-1">答题完成</h2>
          <p className="text-slate-400 text-sm mb-8">
            {pct >= 80 ? '太棒了！掌握得很好' : pct >= 60 ? '还不错，继续加油' : '多练习会更好'}
          </p>

          <div className="glass-card-static p-6 mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="font-mono text-3xl font-bold text-pink-400">{result.score}<span className="text-lg text-slate-500">/{result.total}</span></div>
                <div className="text-xs text-slate-500 mt-1 font-medium">正确</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-3xl font-bold text-emerald-400">{pct}%</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">正确率</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-3xl font-bold text-violet-400">
                  {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">用时</div>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-8 text-left">
            {result.results.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
                r.is_correct ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-rose-500/5 border border-rose-500/10'
              }`}>
                {r.is_correct ? <Check className="h-4 w-4 text-emerald-400 shrink-0" /> : <X className="h-4 w-4 text-rose-400 shrink-0" />}
                <span className="text-slate-200 font-medium">{r.word}</span>
                {!r.is_correct && <span className="text-slate-500 ml-auto text-xs">正确答案：{r.correct_answer_text || r.correct_answer}</span>}
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={startQuiz}
              className="flex items-center gap-2 btn-gradient px-6 py-3 rounded-xl text-sm font-semibold">
              <RotateCcw className="h-4 w-4" /> 再来一轮
            </button>
            <button onClick={() => navigate('/vocab')}
              className="px-6 py-3 rounded-xl text-sm font-medium border border-white/[0.08] text-slate-300 hover:bg-white/[0.04] transition-colors">
              返回总览
            </button>
          </div>
        </div>
      </PageTransition>
    )
  }

  // ── Active / Reviewing ──
  if (!session) return null
  const q = session.questions[currentIndex]
  const correctKey = q.correct_key

  return (
    <PageTransition>
      <div ref={shakeRef} className="max-w-2xl mx-auto space-y-6 py-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/vocab')}
            className="flex items-center gap-1.5 text-sm text-pink-400 hover:text-pink-300 transition-colors font-medium">
            <ChevronLeft className="h-4 w-4" /> 返回
          </button>
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm text-slate-400">
              {currentIndex + 1}<span className="text-slate-600">/{session.questions.length}</span>
            </span>
            <span className="font-mono text-sm text-slate-500 tabular-nums">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + (phase === 'reviewing' ? 1 : 0)) / session.questions.length) * 100}%` }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentIndex}
            ref={questionContainerRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="text-center py-6">
              <p className="text-[11px] tracking-wider text-slate-500 mb-3 font-medium">
                {session.mode === 'word_to_def' ? '选择正确的中文释义' : '选择正确的英文单词'}
              </p>
              <h2 className="font-display text-[2.75rem] font-bold text-slate-100 mb-2 tracking-tight leading-tight">
                {q.prompt}
              </h2>
              <p className="font-mono text-base text-slate-500">{q.prompt_sub}</p>
            </div>

            <div ref={optionGridRef} className="grid grid-cols-2 gap-3">
              {q.options.map(opt => {
                let cls = 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.03]'
                if (phase === 'reviewing') {
                  if (opt.key === correctKey) cls = 'border-emerald-500/40 bg-emerald-500/10'
                  else if (opt.key === selected) cls = 'border-rose-500/40 bg-rose-500/10'
                  else cls = 'border-white/[0.04] bg-white/[0.01] opacity-50'
                }
                return (
                  <motion.button key={opt.key}
                    ref={setOptionRef(opt.key)}
                    whileHover={phase === 'active' ? { scale: 1.02 } : {}}
                    whileTap={phase === 'active' ? { scale: 0.98 } : {}}
                    onClick={() => phase === 'active' && selectOption(opt.key)}
                    className={`relative p-5 rounded-xl border text-left transition-all ${cls}`}
                    disabled={phase === 'reviewing'}>
                    <span className="text-[10px] font-mono text-slate-500 absolute top-2 right-3">{opt.key}</span>
                    <p className="text-sm font-medium text-slate-200 pr-5">{opt.text}</p>
                    {phase === 'reviewing' && opt.key === correctKey && <Check className="h-5 w-5 text-emerald-400 absolute bottom-3 right-3" />}
                    {phase === 'reviewing' && opt.key === selected && opt.key !== correctKey && <X className="h-5 w-5 text-rose-400 absolute bottom-3 right-3" />}
                  </motion.button>
                )
              })}
            </div>

            {phase === 'reviewing' && (
              <div className="flex items-center justify-between pt-2">
                <button onClick={() => toggleBookmark(q.word_id)}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    bookmarkedIds.has(q.word_id) ? 'text-pink-400' : 'text-slate-500 hover:text-pink-400'
                  }`}>
                  <Star className={`h-4 w-4 ${bookmarkedIds.has(q.word_id) ? 'fill-pink-400' : ''}`} />
                  {bookmarkedIds.has(q.word_id) ? '已收藏' : '加入生词本'}
                </button>
                <button onClick={advance}
                  className="btn-gradient px-8 py-2.5 rounded-xl text-sm font-semibold">
                  {currentIndex + 1 < session.questions.length ? '下一题' : '查看结果'}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
