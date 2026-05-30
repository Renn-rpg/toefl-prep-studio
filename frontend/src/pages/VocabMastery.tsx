import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useTTS } from '@/hooks/useTTS'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useMasterySession } from '@/hooks/useMasterySession'
import gsap from 'gsap'
import type { VocabSettings, MasteryWord } from '@/types'
import {
  ChevronLeft, Volume2, Eye, Lightbulb, Check, X,
  Trophy, RotateCcw, Brain,
} from 'lucide-react'
import { TierBadge } from '@/components/TierBadge'
import { PageTransition } from '@/components/motion/PageTransition'
import { motion, AnimatePresence } from 'motion/react'

function MasteryDots({ filled }: { filled: number }) {
  const dotsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = dotsRef.current
    if (!container) return
    const dots = container.querySelectorAll<HTMLElement>('[data-dot]')
    if (!dots.length) return

    const ctx = gsap.context(() => {
      dots.forEach((dot, i) => {
        const shouldFill = [3, 2, 1][i] <= filled
        if (shouldFill) {
          gsap.fromTo(dot, {
            scale: 0.5,
            backgroundColor: 'rgb(255 255 255 / 0.1)',
            boxShadow: 'none',
          }, {
            scale: 1,
            backgroundColor: 'rgb(52 211 153)',
            boxShadow: '0 0 6px rgba(52,211,153,0.4)',
            duration: 0.35,
            delay: i * 0.08,
            ease: 'back.out(1.7)',
          })
        }
      })
    })
    return () => ctx.revert()
  }, [filled])

  return (
    <div ref={dotsRef} className="flex flex-col items-center gap-1">
      {[3, 2, 1].map(n => (
        <div
          key={n}
          data-dot={n}
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: n <= filled ? 'rgb(52 211 153)' : 'rgb(255 255 255 / 0.1)',
            boxShadow: n <= filled ? '0 0 6px rgba(52,211,153,0.4)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

function PhoneticDisplay({
  phoneticUk,
  phoneticUs,
  accent,
  onSpeak,
}: {
  word: string
  phoneticUk: string
  phoneticUs: string
  accent: 'us' | 'uk'
  onToggle: () => void
  onSpeak: (a: 'us' | 'uk') => void
}) {
  return (
    <div className="flex items-center gap-3 justify-center">
      <button
        onClick={() => onSpeak('uk')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
          accent === 'uk'
            ? 'bg-violet-500/15 text-violet-400 border border-violet-500/25'
            : 'bg-white/[0.04] text-slate-500 hover:text-slate-300 border border-transparent'
        }`}
      >
        <span className="font-semibold">英</span>
        <Volume2 className="h-3 w-3" />
        <span className="font-mono text-[11px]">{phoneticUk}</span>
      </button>
      <button
        onClick={() => onSpeak('us')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
          accent === 'us'
            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
            : 'bg-white/[0.04] text-slate-500 hover:text-slate-300 border border-transparent'
        }`}
      >
        <span className="font-semibold">美</span>
        <Volume2 className="h-3 w-3" />
        <span className="font-mono text-[11px]">{phoneticUs}</span>
      </button>
    </div>
  )
}

function HintDisplay({
  showHint,
  examples,
  word,
}: {
  showHint: boolean
  examples: MasteryWord['example_sentences']
  word: string
}) {
  const hintRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = hintRef.current
    if (!el) return

    const ctx = gsap.context(() => {
      if (showHint) {
        gsap.fromTo(el, {
          height: 0,
          opacity: 0,
          marginBottom: 0,
        }, {
          height: 'auto',
          opacity: 1,
          marginBottom: 16,
          duration: 0.35,
          ease: 'power3.out',
        })
      } else {
        gsap.to(el, {
          height: 0,
          opacity: 0,
          marginBottom: 0,
          duration: 0.25,
          ease: 'power3.in',
        })
      }
    })
    return () => ctx.revert()
  }, [showHint])

  if (showHint && examples.length > 0) {
    return (
      <div ref={hintRef} className="overflow-hidden">
        <div className="bg-amber-500/[0.05] rounded-xl p-3.5 border border-amber-500/15 text-sm text-slate-300">
          <p className="text-[10px] text-amber-400 font-semibold mb-1">提示 — 例句</p>
          <p>{examples[0].en.replace(new RegExp(`\\b${word}\\b`, 'gi'), '______')}</p>
          <p className="text-xs text-slate-500 mt-0.5">{examples[0].cn}</p>
        </div>
      </div>
    )
  }
  return null
}

function InfoScreen({
  word,
  isCorrect,
  currentStage,
  accent,
  onSpeak,
  onContinue,
}: {
  word: MasteryWord
  isCorrect: boolean | null
  currentStage: number
  accent: 'us' | 'uk'
  onSpeak: (text: string, a: 'us' | 'uk') => void
  onContinue: () => void
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const collocations: string[] = word.collocations ?? []
  const derivatives = word.derivatives ?? []
  const root = word.word_root ?? {}

  // GSAP entrance animation for info screen
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.from(el, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: 'power3.out',
      })
    })
    return () => ctx.revert()
  }, [word.word_id, currentStage])

  return (
    <div ref={contentRef} className="space-y-5">
      {/* Result indicator */}
      <div className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold ${
        isCorrect
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      }`}>
        {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        {isCorrect ? '回答正确！' : '答错了，这个词会重新出现'}
      </div>

      {/* Word header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <h2 className="font-display text-3xl font-bold text-slate-100 tracking-tight">
            {word.syllables || word.word}
          </h2>
          <TierBadge frequencyRank={word.frequency_rank} tags={word.tags} />
        </div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => onSpeak(word.word, 'uk')}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
            <Volume2 className="h-3 w-3" /> 英 <span className="font-mono">{word.phonetic_uk}</span>
          </button>
          <button onClick={() => onSpeak(word.word, 'us')}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
            <Volume2 className="h-3 w-3" /> 美 <span className="font-mono">{word.phonetic_us}</span>
          </button>
        </div>
        <p className="text-sm text-slate-300">
          <span className="text-slate-500 italic mr-1.5">{word.part_of_speech}</span>
          {word.definition_cn}
        </p>
        <p className="text-xs text-slate-500">{word.definition_en}</p>
      </div>

      {/* Example sentences */}
      {word.example_sentences.length > 0 && (
        <div className="space-y-2">
          {word.example_sentences.slice(0, 2).map((ex, i) => (
            <div key={i} className="bg-pink-500/[0.04] rounded-xl p-4 border border-pink-500/10">
              <div className="flex items-start gap-2">
                <button onClick={() => onSpeak(ex.en, accent)}
                  className="mt-0.5 text-pink-400 hover:text-pink-300 transition-colors shrink-0">
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
                <div>
                  <p className="text-sm text-slate-200 leading-relaxed"
                     dangerouslySetInnerHTML={{
                       __html: ex.en.replace(
                         new RegExp(`\\b(${word.word})\\b`, 'gi'),
                         '<strong class="text-pink-400">$1</strong>'
                       )
                     }}
                  />
                  <p className="text-xs text-slate-500 mt-1">{ex.cn}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collocations */}
      {collocations.length > 0 && (
        <div>
          <p className="text-[10px] tracking-wider text-slate-500 font-semibold mb-2 uppercase">词组搭配</p>
          <div className="flex flex-wrap gap-2">
            {collocations.map((c, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-300">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Derivatives */}
      {derivatives.length > 0 && (
        <div>
          <p className="text-[10px] tracking-wider text-slate-500 font-semibold mb-2 uppercase">派生词</p>
          <div className="grid grid-cols-2 gap-2">
            {derivatives.map((d, i) => (
              <div key={i} className="bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.06]">
                <span className="text-sm text-slate-200 font-medium">{d.word}</span>
                <span className="text-[10px] text-slate-500 italic ml-1.5">{d.pos}</span>
                <p className="text-xs text-slate-400 mt-0.5">{d.cn}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Word root */}
      {root.root && (
        <div>
          <p className="text-[10px] tracking-wider text-slate-500 font-semibold mb-2 uppercase">词根词缀</p>
          <div className="bg-violet-500/[0.05] rounded-xl p-3.5 border border-violet-500/10">
            <p className="text-sm text-violet-300 font-mono">{root.root}</p>
            <p className="text-xs text-slate-400 mt-1">{root.meaning}</p>
            {root.origin && <p className="text-[10px] text-slate-500 mt-0.5">语源: {root.origin}</p>}
          </div>
        </div>
      )}

      {/* Continue button */}
      <button onClick={onContinue}
        className="w-full btn-gradient py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
        继续
      </button>
    </div>
  )
}

export function VocabMastery() {
  const navigate = useNavigate()
  const tts = useTTS()
  const sfx = useSoundEffects()
  const m = useMasterySession()

  const [settings, setSettings] = useState<VocabSettings | null>(null)
  const [accent, setAccent] = useState<'us' | 'uk'>('us')
  const [elapsed, setElapsed] = useState(0)

  // GSAP refs
  const correctOptionRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const optionGridRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<gsap.Context | null>(null)

  useEffect(() => {
    api.get<VocabSettings>('/vocab/settings').then(s => {
      setSettings(s)
      setAccent(s.preferred_accent ?? 'us')
      if (s.sound_effects === false) sfx.toggleMute()
    })
    m.fetchSession(20)
  }, [])

  useEffect(() => {
    if (m.phase === 'question' || m.phase === 'info') {
      const t = setInterval(() => setElapsed(e => e + 1), 1000)
      return () => clearInterval(t)
    }
  }, [m.phase])

  // Cleanup GSAP context
  useEffect(() => {
    return () => ctxRef.current?.revert()
  }, [])

  // Auto-pronounce on new question (NOT for stage 2 — would reveal the answer)
  useEffect(() => {
    if (m.phase === 'question' && m.currentWord && settings?.auto_pronounce && m.currentStage !== 2) {
      tts.speak(m.currentWord.word, 0.85, accent)
    }
  }, [m.phase, m.currentWord?.word_id, m.currentStage])

  // Sound effect on correct answer
  useEffect(() => {
    if (m.isCorrect === true) sfx.playCorrect()
  }, [m.isCorrect])

  // GSAP: correct option pulse + glow when answer is revealed
  useEffect(() => {
    if (!m.selectedKey || !m.currentWord) return

    ctxRef.current?.revert()
    const ctx = gsap.context(() => {
      const correctKey = m.currentWord!.stage1_correct_key || m.currentWord!.stage2_correct_key
      const correctBtn = correctOptionRefs.current.get(correctKey)
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
    })
    ctxRef.current = ctx
  }, [m.selectedKey, m.currentWord?.word_id])

  // GSAP: stage transition entrance
  useEffect(() => {
    if (!optionGridRef.current) return

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
    return () => ctx.revert()
  }, [m.currentStage, m.currentWord?.word_id, m.phase])

  const speakWord = (a: 'us' | 'uk') => {
    if (m.currentWord) {
      setAccent(a)
      tts.speak(m.currentWord.word, 0.85, a)
    }
  }

  const speakText = (text: string, a: 'us' | 'uk') => {
    tts.speak(text, 0.85, a)
  }

  const setOptionRef = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) {
      correctOptionRefs.current.set(key, el)
    } else {
      correctOptionRefs.current.delete(key)
    }
  }

  // ── Loading ──
  if (m.phase === 'loading') return (
    <PageTransition>
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Brain className="h-8 w-8 text-pink-400" />
        </div>
        <p className="text-sm text-slate-400">加载词汇数据…</p>
      </div>
    </PageTransition>
  )

  // ── Finished ──
  if (m.phase === 'finished') {
    const total = m.stats.correct + m.stats.wrong
    const pct = total > 0 ? Math.round((m.stats.correct / total) * 100) : 0
    return (
      <PageTransition>
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="w-28 h-28 rounded-3xl overflow-hidden mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-violet-500/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy className="h-12 w-12 text-pink-400 drop-shadow-lg" />
            </div>
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-100 mb-1">学习完成</h2>
          <p className="text-slate-400 text-sm mb-8">
            {pct >= 80 ? '太棒了！掌握得很好' : pct >= 60 ? '还不错，继续加油' : '多练习会更好'}
          </p>

          <div className="glass-card-static p-6 mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="font-mono text-3xl font-bold text-pink-400">
                  {m.stats.mastered}<span className="text-lg text-slate-500">/{m.stats.total}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">已掌握</div>
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

          <div className="flex gap-3 justify-center">
            <button onClick={() => { setElapsed(0); m.fetchSession(20) }}
              className="flex items-center gap-2 btn-gradient px-6 py-3 rounded-xl text-sm font-semibold">
              <RotateCcw className="h-4 w-4" /> 继续学习
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

  // ── Question / Info ──
  if (!m.currentWord) return null
  const word = m.currentWord

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-5 py-3">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/vocab')}
            className="flex items-center gap-1.5 text-sm text-pink-400 hover:text-pink-300 transition-colors font-medium">
            <ChevronLeft className="h-4 w-4" /> 返回
          </button>
          <span />
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-slate-400">
              {m.stats.mastered}<span className="text-slate-600">/{m.stats.total}</span>
            </span>
            <span className="font-mono text-sm text-slate-500 tabular-nums">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${m.stats.total > 0 ? (m.stats.mastered / m.stats.total) * 100 : 0}%` }} />
        </div>

        <AnimatePresence mode="wait">
          {m.phase === 'question' && (
            <motion.div key={`q-${word.word_id}-${m.currentStage}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }} className="space-y-6"
            >
              {/* Stage 1: word → definition */}
              {m.currentStage === 1 && (
                <>
                  <div className="text-center py-4 space-y-3">
                    <div className="flex items-start justify-center gap-3">
                      <MasteryDots filled={m.currentProgress} />
                      <h2 className="font-display text-[2.75rem] font-bold text-slate-100 tracking-tight leading-tight">
                        {word.word}
                      </h2>
                    </div>
                    <PhoneticDisplay
                      word={word.word}
                      phoneticUk={word.phonetic_uk}
                      phoneticUs={word.phonetic_us}
                      accent={accent}
                      onToggle={() => setAccent(a => a === 'us' ? 'uk' : 'us')}
                      onSpeak={speakWord}
                    />
                    <p className="text-xs text-slate-500">先回想词义再选择，想不起来「看答案」</p>
                  </div>

                  {/* Hint with GSAP height animation */}
                  <HintDisplay
                    showHint={m.showHint}
                    examples={word.example_sentences}
                    word={word.word}
                  />

                  {/* Options */}
                  <div ref={optionGridRef} className="grid grid-cols-2 gap-3">
                    {word.stage1_options.map(opt => {
                      let cls = 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.03]'
                      if (m.selectedKey !== null) {
                        if (opt.key === word.stage1_correct_key) cls = 'border-emerald-500/40 bg-emerald-500/10'
                        else if (opt.key === m.selectedKey) cls = 'border-rose-500/40 bg-rose-500/10'
                        else cls = 'border-white/[0.04] bg-white/[0.01] opacity-50'
                      }
                      return (
                        <motion.button key={opt.key}
                          ref={setOptionRef(opt.key)}
                          whileHover={m.selectedKey === null ? { scale: 1.02 } : {}}
                          whileTap={m.selectedKey === null ? { scale: 0.98 } : {}}
                          onClick={() => m.answerOption(opt.key)}
                          className={`relative p-5 rounded-xl border text-left transition-all ${cls}`}
                          disabled={m.selectedKey !== null}
                        >
                          <span className="text-[10px] font-mono text-slate-500 absolute top-2 right-3">{opt.key}</span>
                          <p className="text-sm text-slate-200 pr-5">{opt.text}</p>
                          {m.selectedKey !== null && opt.key === word.stage1_correct_key && (
                            <Check className="h-4 w-4 text-emerald-400 absolute bottom-3 right-3" />
                          )}
                          {m.selectedKey !== null && opt.key === m.selectedKey && opt.key !== word.stage1_correct_key && (
                            <X className="h-4 w-4 text-rose-400 absolute bottom-3 right-3" />
                          )}
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Bottom actions */}
                  <div className="flex items-center justify-between">
                    <button onClick={m.toggleHint}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                        m.showHint ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'
                      }`}>
                      <Lightbulb className="h-3.5 w-3.5" />
                      {m.showHint ? '隐藏提示' : '提示'}
                    </button>
                    <button onClick={m.showAnswer}
                      disabled={m.selectedKey !== null}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors disabled:opacity-30">
                      <Eye className="h-3.5 w-3.5" /> 看答案
                    </button>
                  </div>
                </>
              )}

              {/* Stage 2: definition → word */}
              {m.currentStage === 2 && (
                <>
                  <div className="text-center py-4 space-y-3">
                    <div className="flex items-start justify-center gap-3">
                      <MasteryDots filled={m.currentProgress} />
                      <div>
                        <h2 className="font-display text-2xl font-bold text-slate-100 tracking-tight leading-tight">
                      <span className="text-slate-500 italic text-lg mr-2">{word.part_of_speech}</span>
                      {word.definition_cn}
                    </h2>
                    <p className="text-xs text-slate-500">{word.definition_en}</p>
                      </div>
                    </div>
                  </div>

                  <HintDisplay
                    showHint={m.showHint}
                    examples={word.example_sentences}
                    word={word.word}
                  />

                  <div ref={optionGridRef} className="grid grid-cols-2 gap-3">
                    {word.stage2_options.map(opt => {
                      let cls = 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.03]'
                      if (m.selectedKey !== null) {
                        if (opt.key === word.stage2_correct_key) cls = 'border-emerald-500/40 bg-emerald-500/10'
                        else if (opt.key === m.selectedKey) cls = 'border-rose-500/40 bg-rose-500/10'
                        else cls = 'border-white/[0.04] bg-white/[0.01] opacity-50'
                      }
                      return (
                        <motion.button key={opt.key}
                          ref={setOptionRef(opt.key)}
                          whileHover={m.selectedKey === null ? { scale: 1.02 } : {}}
                          whileTap={m.selectedKey === null ? { scale: 0.98 } : {}}
                          onClick={() => m.answerOption(opt.key)}
                          className={`relative p-5 rounded-xl border text-left transition-all ${cls}`}
                          disabled={m.selectedKey !== null}
                        >
                          <span className="text-[10px] font-mono text-slate-500 absolute top-2 right-3">{opt.key}</span>
                          <p className="text-base font-semibold text-slate-200 font-display">{opt.text}</p>
                          {m.selectedKey !== null && opt.key === word.stage2_correct_key && (
                            <Check className="h-4 w-4 text-emerald-400 absolute bottom-3 right-3" />
                          )}
                          {m.selectedKey !== null && opt.key === m.selectedKey && opt.key !== word.stage2_correct_key && (
                            <X className="h-4 w-4 text-rose-400 absolute bottom-3 right-3" />
                          )}
                        </motion.button>
                      )
                    })}
                  </div>

                  <div className="flex items-center justify-between">
                    <button onClick={m.toggleHint}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                        m.showHint ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'
                      }`}>
                      <Lightbulb className="h-3.5 w-3.5" />
                      {m.showHint ? '隐藏提示' : '提示'}
                    </button>
                    <button onClick={m.showAnswer}
                      disabled={m.selectedKey !== null}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors disabled:opacity-30">
                      <Eye className="h-3.5 w-3.5" /> 看答案
                    </button>
                  </div>
                </>
              )}

              {/* Stage 3: free recall */}
              {m.currentStage === 3 && (
                <>
                  <div className="text-center py-8 space-y-4">
                    <div className="flex items-start justify-center gap-3">
                      <MasteryDots filled={m.currentProgress} />
                      <h2 className="font-display text-[2.75rem] font-bold text-slate-100 tracking-tight leading-tight">
                        {word.word}
                      </h2>
                    </div>
                    <PhoneticDisplay
                      word={word.word}
                      phoneticUk={word.phonetic_uk}
                      phoneticUs={word.phonetic_us}
                      accent={accent}
                      onToggle={() => setAccent(a => a === 'us' ? 'uk' : 'us')}
                      onSpeak={speakWord}
                    />
                    <p className="text-sm text-slate-500 mt-6">请在心中回忆这个词的含义</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => m.selfEvaluate(false)}
                      className="p-5 rounded-xl border border-rose-500/20 bg-rose-500/[0.05] hover:bg-rose-500/10 text-center transition-all"
                    >
                      <X className="h-6 w-6 text-rose-400 mx-auto mb-1.5" />
                      <p className="text-sm font-semibold text-rose-400">不认识</p>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => m.selfEvaluate(true)}
                      className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] hover:bg-emerald-500/10 text-center transition-all"
                    >
                      <Check className="h-6 w-6 text-emerald-400 mx-auto mb-1.5" />
                      <p className="text-sm font-semibold text-emerald-400">认识</p>
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Info screen */}
          {m.phase === 'info' && (
            <InfoScreen
              key={`info-${word.word_id}-${m.currentStage}`}
              word={word}
              isCorrect={m.isCorrect}
              currentStage={m.currentStage}
              accent={accent}
              onSpeak={speakText}
              onContinue={m.advanceFromInfo}
            />
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
