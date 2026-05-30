import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useGsapShake, useGsapCounter } from '@/hooks/useGsap'
import type { TranslationSet } from '@/types'
import { ChevronLeft, Sparkles, ArrowLeftRight, Check, X, Zap, Trophy, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '@/components/motion/PageTransition'
import gsap from 'gsap'

type Phase = 'config' | 'active' | 'feedback' | 'finished'
type Mode = 'cn_to_en' | 'en_to_cn'

interface CheckResult {
  score: number
  total: number
  results: {
    target: string
    blanks: {
      position: string
      hint: string
      correct_answer: string
      user_answer: string
      is_correct: boolean
    }[]
  }[]
}

function UnderlineInput({
  value, onChange, disabled, isCorrect, placeholderLen, blankIndex,
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
  isCorrect: boolean | null
  placeholderLen: number
  blankIndex: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const width = Math.max(placeholderLen * 1.1 + 1, 5)

  let lineColor = 'border-slate-500/40'
  let textColor = 'text-slate-200'
  if (isCorrect === true) {
    lineColor = 'border-emerald-400/60'
    textColor = 'text-emerald-300'
  } else if (isCorrect === false) {
    lineColor = 'border-rose-400/60'
    textColor = 'text-rose-300'
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      disabled={disabled}
      data-blank-index={blankIndex}
      onChange={e => onChange(e.target.value)}
      className={`border-b-2 ${lineColor} bg-transparent text-center text-sm font-medium ${textColor} placeholder:text-transparent focus:outline-none focus:border-blue-400/60 transition-colors mx-0.5`}
      style={{ width: `${width}ch` }}
      autoComplete="off"
      spellCheck={false}
    />
  )
}

export function Translation() {
  const navigate = useNavigate()
  const sfx = useSoundEffects()
  const [phase, setPhase] = useState<Phase>('config')
  const [mode, setMode] = useState<Mode>('cn_to_en')
  const [difficulty, setDifficulty] = useState('medium')
  const [count, setCount] = useState(5)
  const [topic, setTopic] = useState('')
  const [data, setData] = useState<TranslationSet | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [sentenceResult, setSentenceResult] = useState<CheckResult | null>(null)
  const [allResults, setAllResults] = useState<CheckResult[]>([])
  const [loading, setLoading] = useState(false)

  // GSAP hooks
  const { ref: shakeRef, shake } = useGsapShake<HTMLDivElement>()
  const sentenceContentRef = useRef<HTMLDivElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const trophyRef = useRef<HTMLDivElement>(null)

  async function generate() {
    setLoading(true)
    setAnswers({})
    setSentenceResult(null)
    setAllResults([])
    setCurrentIdx(0)
    try {
      const res = await api.post<TranslationSet>('/translation/generate', {
        mode, difficulty, count, topic: topic.trim() || null,
      })
      setData(res)
      setPhase('active')
    } finally {
      setLoading(false)
    }
  }

  function answerKey(si: number, position: string) {
    return `${si}::${position}`
  }

  const sentence = data?.sentences[currentIdx]
  const currentBlanks = sentence?.blanks?.length ?? 0
  const filledCurrent = sentence?.blanks?.filter(b => answers[answerKey(currentIdx, b.position)]?.trim()).length ?? 0

  // GSAP timeline 句子过渡 — 替代 AnimatePresence
  // 过渡辅助：先滑出旧句子，再更新状态，新句子自动滑入
  const transitionAndUpdate = useCallback((updateFn: () => void) => {
    const el = sentenceContentRef.current
    if (!el) { updateFn(); return }
    gsap.to(el, {
      opacity: 0,
      y: -12,
      duration: 0.15,
      ease: 'power2.in',
      onComplete: () => {
        updateFn()
      },
    })
  }, [])

  // GSAP 入场动画 — 句子内容挂载后从下方滑入
  useEffect(() => {
    const el = sentenceContentRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.from(el, {
        opacity: 0,
        y: 16,
        duration: 0.35,
        ease: 'power3.out',
        delay: 0.05,
      })
    })
    return () => ctx.revert()
  }, [currentIdx])

  // GSAP 反馈入场动画 — correct/incorrect 反馈条
  useEffect(() => {
    if (phase !== 'feedback') return
    const el = feedbackRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.from(el, {
        opacity: 0,
        scale: 0.9,
        duration: 0.4,
        ease: 'back.out(1.5)',
      })
    })
    return () => ctx.revert()
  }, [phase])

  // GSAP 奖杯入场动画 — finished screen
  useEffect(() => {
    if (phase !== 'finished') return
    const el = trophyRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.from(el, {
        scale: 0,
        opacity: 0,
        duration: 0.8,
        ease: 'elastic.out(1, 0.5)',
        delay: 0.2,
      })
    })
    return () => ctx.revert()
  }, [phase])

  async function checkCurrent() {
    if (!data || !sentence) return
    const userAnswers = sentence.blanks.map(b => ({
      position: b.position,
      answer: answers[answerKey(currentIdx, b.position)] || '',
    }))
    const res = await api.post<CheckResult>('/translation/check', {
      sentences: [sentence],
      user_answers: userAnswers,
    })
    setSentenceResult(res)
    setAllResults(prev => [...prev, res])
    setPhase('feedback')

    const allCorrect = res.results[0]?.blanks.every(b => b.is_correct)
    if (allCorrect) {
      sfx.playCorrect()
    } else {
      // GSAP shake — 替换 motion.div 抖动
      shake(8, 0.5)
      if (navigator.vibrate) navigator.vibrate([80, 60, 80])
    }
  }

  function nextSentence() {
    if (!data) return
    if (currentIdx + 1 < data.sentences.length) {
      transitionAndUpdate(() => {
        setCurrentIdx(i => i + 1)
        setSentenceResult(null)
        setPhase('active')
      })
    } else {
      transitionAndUpdate(() => {
        setPhase('finished')
      })
    }
  }

  // Enter key shortcut for immersive typing flow
  const checkRef = useRef(checkCurrent)
  checkRef.current = checkCurrent
  const nextRef = useRef(nextSentence)
  nextRef.current = nextSentence

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const inBlank = target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text'

      // Arrow keys: navigate between blanks
      if (e.key === 'ArrowLeft' && inBlank) {
        const prev = document.querySelector<HTMLInputElement>(`[data-blank-index="${Number(target.dataset.blankIndex) - 1}"]`)
        if (prev) { e.preventDefault(); prev.focus() }
        return
      }
      if (e.key === 'ArrowRight' && inBlank) {
        const next = document.querySelector<HTMLInputElement>(`[data-blank-index="${Number(target.dataset.blankIndex) + 1}"]`)
        if (next) { e.preventDefault(); next.focus() }
        return
      }

      // Enter: submit / advance
      if (e.key === 'Enter') {
        if (phase === 'feedback') {
          e.preventDefault()
          nextRef.current()
        } else if (phase === 'active' && inBlank) {
          e.preventDefault()
          checkRef.current()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase])

  function computeOverall() {
    let score = 0
    let total = 0
    for (const r of allResults) {
      for (const s of r.results) {
        for (const b of s.blanks) {
          total++
          if (b.is_correct) score++
        }
      }
    }
    return { score, total }
  }

  // ── Config ──
  if (phase === 'config') return (
    <PageTransition>
      <div className="max-w-lg mx-auto space-y-8 py-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <ArrowLeftRight className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-100 mb-1">句法互译</h1>
          <p className="text-slate-400 text-sm">AI 生成中英互译挖空练习，强化句法结构</p>
        </div>

        <div className="glass-card-static p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">模式</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode('cn_to_en')}
                className={`p-4 rounded-xl border text-sm font-medium transition-all ${
                  mode === 'cn_to_en'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                }`}>
                中译英
              </button>
              <button onClick={() => setMode('en_to_cn')}
                className={`p-4 rounded-xl border text-sm font-medium transition-all ${
                  mode === 'en_to_cn'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                }`}>
                英译中
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">难度</label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as const).map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    difficulty === d
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                  }`}>
                  {d === 'easy' ? '简单' : d === 'medium' ? '中等' : '困难'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">题目数量：{count}</label>
            <input type="range" min={3} max={10} value={count} onChange={e => setCount(Number(e.target.value))}
              className="w-full accent-blue-500" />
            <div className="flex justify-between text-xs text-slate-500 mt-1"><span>3</span><span>10</span></div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">话题（可选）</label>
            <input type="text" placeholder="如：科技、环境、教育…" value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 px-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/30" />
          </div>

          <button onClick={generate} disabled={loading}
            className="btn-gradient w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            {loading ? '生成中…' : <><Sparkles className="h-4 w-4" /> 生成题目</>}
          </button>
        </div>

        <button onClick={() => navigate('/vocab')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mx-auto font-medium">
          <ChevronLeft className="h-4 w-4" /> 返回
        </button>
      </div>
    </PageTransition>
  )

  // ── Finished ──
  if (phase === 'finished') {
    const { score, total } = computeOverall()
    const pct = total > 0 ? Math.round((score / total) * 100) : 0
    return (
      <PageTransition>
        <FinishedScreen score={score} total={total} pct={pct} trophyRef={trophyRef}
          onRestart={generate}
          onBackToSettings={() => { setPhase('config'); setData(null) }}
        />
      </PageTransition>
    )
  }

  // ── Active / Feedback ──
  if (!sentence) return null
  const sourceText = mode === 'cn_to_en' ? sentence.chinese : sentence.english
  const targetText = mode === 'cn_to_en' ? sentence.english : sentence.chinese
  const sortedBlanks = [...(sentence.blanks ?? [])].sort((a, b) => targetText.indexOf(a.position) - targetText.indexOf(b.position))
  const allCorrect = sentenceResult?.results[0]?.blanks.every(b => b.is_correct)

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6 py-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button onClick={() => { setPhase('config'); setData(null) }}
            className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
            <ChevronLeft className="h-4 w-4" /> 返回
          </button>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-slate-400">
              {currentIdx + 1}<span className="text-slate-600">/{data?.sentences.length}</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {mode === 'cn_to_en' ? '中→英' : '英→中'}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${((currentIdx + (phase === 'feedback' ? 1 : 0)) / (data?.sentences.length ?? 1)) * 100}%` }} />
        </div>

        {/* 句子内容 — 使用 key 触发 GSAP 过渡 */}
        <div key={currentIdx} ref={sentenceContentRef}>
          {/* Source sentence */}
          <div className="glass-card-static p-5 mb-4">
            <p className="text-[10px] tracking-wider text-slate-500 font-semibold mb-2 uppercase">
              {mode === 'cn_to_en' ? '中文' : '英文'}
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">{sourceText}</p>
          </div>

          {/* Target with blanks — GSAP shake on incorrect (替代 motion.div) */}
          <div ref={shakeRef} className="glass-card-static p-6 mb-4">
            <p className="text-[10px] tracking-wider text-slate-500 font-semibold mb-4 uppercase">
              {mode === 'cn_to_en' ? '填入英文' : '填入中文'}
            </p>

            <p className="text-base leading-relaxed text-slate-200">
              {renderTargetWithUnderlines(
                targetText, sortedBlanks, currentIdx, answers,
                setAnswers, sentenceResult, phase, answerKey,
              )}
            </p>

            {/* Hints */}
            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/[0.06]">
              {sortedBlanks.map((b, bi) => (
                <span key={bi} className="bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.06] text-[11px] text-slate-500">
                  提示{currentBlanks > 1 ? `${bi + 1}` : ''}：{b.hint}
                </span>
              ))}
            </div>
          </div>

          {/* Feedback — GSAP scale bounce for correct, border flash handled by CSS + GSAP entrance */}
          {phase === 'feedback' && sentenceResult && (
            <div
              ref={feedbackRef}
              className={`p-4 rounded-xl border text-sm text-center font-semibold mb-4 ${
                allCorrect
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {allCorrect ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" /> 正确！
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <X className="h-4 w-4" /> 有错误，查看正确答案
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          {phase === 'active' ? (
            <button
              onClick={checkCurrent}
              disabled={filledCurrent < currentBlanks}
              className="btn-gradient w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <Zap className="h-4 w-4" />
              确认 ({filledCurrent}/{currentBlanks})
            </button>
          ) : (
            <button onClick={nextSentence}
              className="btn-gradient w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
              {currentIdx + 1 < (data?.sentences.length ?? 0) ? '下一题' : '查看结果'}
            </button>
          )}
        </div>
      </div>
    </PageTransition>
  )
}

// ═══════════════════════════════════════
// FinishedScreen — GSAP 增强完成界面
// ═══════════════════════════════════════
function FinishedScreen({
  score, total, pct, trophyRef,
  onRestart, onBackToSettings,
}: {
  score: number
  total: number
  pct: number
  trophyRef: React.RefObject<HTMLDivElement | null>
  onRestart: () => void
  onBackToSettings: () => void
}) {
  // useGsapCounter for score number animation
  const { ref: scoreRef } = useGsapCounter<HTMLSpanElement>(score, { duration: 1.2, delay: 0.5 })
  const { ref: pctRef } = useGsapCounter<HTMLSpanElement>(pct, { duration: 1.0, delay: 0.6 })

  return (
    <div className="max-w-lg mx-auto text-center py-12">
      {/* Trophy icon — GSAP elastic scale bounce entrance */}
      <div ref={trophyRef} className="w-28 h-28 rounded-3xl overflow-hidden mx-auto mb-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Trophy className="h-12 w-12 text-blue-400 drop-shadow-lg" />
        </div>
      </div>
      <h2 className="font-display text-2xl font-bold text-slate-100 mb-1">练习完成</h2>
      <p className="text-slate-400 text-sm mb-8">
        {pct >= 80 ? '太棒了！' : pct >= 60 ? '还不错，继续加油' : '多练习会更好'}
      </p>

      <div className="glass-card-static p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="font-mono text-3xl font-bold text-blue-400">
              <span ref={scoreRef}>0</span><span className="text-lg text-slate-500">/{total}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">正确</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-3xl font-bold text-emerald-400">
              <span ref={pctRef}>0</span>%
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">正确率</div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <button onClick={onRestart}
          className="flex items-center gap-2 btn-gradient px-6 py-3 rounded-xl text-sm font-semibold">
          <RotateCcw className="h-4 w-4" /> 再来一轮
        </button>
        <button onClick={onBackToSettings}
          className="px-6 py-3 rounded-xl text-sm font-medium border border-white/[0.08] text-slate-300 hover:bg-white/[0.04] transition-colors">
          返回设置
        </button>
      </div>
    </div>
  )
}

function renderTargetWithUnderlines(
  text: string,
  blanks: { position: string; hint: string }[],
  sentenceIdx: number,
  answers: Record<string, string>,
  setAnswers: (a: Record<string, string>) => void,
  checkResult: CheckResult | null,
  phase: Phase,
  answerKey: (si: number, pos: string) => string,
) {
  if (blanks.length === 0) return text

  const parts: (string | { position: string; hint: string })[] = []
  let remaining = text

  for (const blank of blanks) {
    const idx = remaining.indexOf(blank.position)
    if (idx === -1) continue
    if (idx > 0) parts.push(remaining.slice(0, idx))
    parts.push(blank)
    remaining = remaining.slice(idx + blank.position.length)
  }
  if (remaining) parts.push(remaining)

  let blankIdx = 0

  return (
    <span className="leading-8">
      {parts.map((part, i) => {
        if (typeof part === 'string') return <span key={i}>{part}</span>
        const key = answerKey(sentenceIdx, part.position)
        const result = checkResult?.results[0]?.blanks.find(b => b.position === part.position)
        const bi = blankIdx++

        if (phase === 'feedback' && result) {
          return (
            <span key={i} className="inline-flex flex-col items-center mx-1 align-bottom">
              <span className={`text-sm font-medium ${result.is_correct ? 'text-emerald-300' : 'text-rose-300 line-through'}`}>
                {result.user_answer || '…'}
              </span>
              <span className="border-b-2 border-slate-500/30 min-w-[3ch]" />
              {!result.is_correct && (
                <span className="text-[11px] text-emerald-400 font-medium">{result.correct_answer}</span>
              )}
            </span>
          )
        }

        return (
          <UnderlineInput
            key={i}
            value={answers[key] || ''}
            onChange={v => setAnswers({ ...answers, [key]: v })}
            disabled={phase === 'feedback'}
            isCorrect={null}
            placeholderLen={part.position.length}
            blankIndex={bi}
          />
        )
      })}
    </span>
  )
}
