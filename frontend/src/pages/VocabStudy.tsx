import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVocabSession } from '@/hooks/useVocabSession'
import { useTTS } from '@/hooks/useTTS'
import { api } from '@/lib/api'
import { MEDIA } from '@/lib/media'
import gsap from 'gsap'
import type { VocabSettings } from '@/types'
import { ChevronLeft, Volume2, RotateCcw, Trophy, Zap, CheckCircle } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import { motion } from 'motion/react'

const RATING_BUTTONS = [
  { rating: 0, label: '忘了', color: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-500/25', hotkey: '1' },
  { rating: 1, label: '困难', color: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/25', hotkey: '2' },
  { rating: 2, label: '记住了', color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/25', hotkey: '3' },
  { rating: 3, label: '太简单', color: 'from-sky-500 to-sky-600', shadow: 'shadow-sky-500/25', hotkey: '4' },
]

function ProgressBar({ current, total }: { current: number; total: number }) {
  const barRef = useRef<HTMLDivElement>(null)
  const pct = total > 0 ? (current / total) * 100 : 0

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.to(el, {
        width: `${pct}%`,
        duration: 0.5,
        ease: 'power3.out',
      })
    })
    return () => ctx.revert()
  }, [pct])

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          ref={barRef}
          className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full"
          style={{ width: '0%' }}
        />
      </div>
      <span className="font-mono text-sm text-slate-400 whitespace-nowrap font-medium">
        {current}<span className="text-slate-600">/{total}</span>
      </span>
    </div>
  )
}

export function VocabStudy() {
  const navigate = useNavigate()
  const { cards, currentCard, currentIndex, flipped, loading, finished, fetchCards, flip, rate, stats } = useVocabSession()
  const tts = useTTS()
  const [settings, setSettings] = useState<VocabSettings | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [animating, setAnimating] = useState(false)

  // Refs for GSAP
  const cardWrapperRef = useRef<HTMLDivElement>(null)
  const frontFaceRef = useRef<HTMLDivElement>(null)
  const backFaceRef = useRef<HTMLDivElement>(null)
  const ratingButtonsRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<gsap.Context | null>(null)

  useEffect(() => {
    api.get<VocabSettings>('/vocab/settings').then(setSettings).catch(() => {})
    fetchCards(20)
  }, [fetchCards])

  useEffect(() => {
    if (finished) return
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [finished])

  useEffect(() => {
    if (currentCard && settings?.auto_pronounce && !flipped) {
      tts.speak(currentCard.word, 0.85)
    }
  }, [currentCard?.word_id, settings?.auto_pronounce])

  // Cleanup GSAP context on unmount
  useEffect(() => {
    return () => ctxRef.current?.revert()
  }, [])

  // GSAP-driven card flip
  useEffect(() => {
    const cardEl = cardWrapperRef.current
    if (!cardEl) return

    ctxRef.current?.revert()
    const ctx = gsap.context(() => {
      if (flipped) {
        // Pulse scale-up before flip, then flip
        const tl = gsap.timeline()
        tl.to(cardEl, {
          scale: 1.03,
          duration: 0.15,
          ease: 'power2.out',
        })
        tl.to(cardEl, {
          rotationY: 180,
          duration: 0.6,
          ease: 'power2.inOut',
          onStart: () => setAnimating(true),
          onComplete: () => setAnimating(false),
        }, '>')

        // Bounce entrance for rating buttons when back is revealed
        const ratingBtns = ratingButtonsRef.current?.querySelectorAll('button')
        if (ratingBtns && ratingBtns.length > 0) {
          tl.from(ratingBtns, {
            opacity: 0,
            y: 20,
            scale: 0.9,
            duration: 0.4,
            stagger: 0.05,
            ease: 'back.out(1.7)',
            onStart: () => setAnimating(true),
          }, '-=0.3')
        }
      } else {
        // Flip back to front
        const tl = gsap.timeline()
        tl.to(cardEl, {
          rotationY: 0,
          duration: 0.6,
          ease: 'power2.inOut',
          onStart: () => setAnimating(true),
          onComplete: () => setAnimating(false),
        })
      }
    })
    ctxRef.current = ctx

    return () => ctx.revert()
  }, [flipped])

  // Wrap flip() to prevent double-clicks during animation
  const handleFlip = useCallback(() => {
    if (animating) return
    flip()
  }, [animating, flip])

  // Wrap rate() similarly
  const handleRate = useCallback((rating: number) => {
    if (animating) return
    rate(rating)
  }, [animating, rate])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === ' ' && !flipped) { e.preventDefault(); handleFlip(); return }
      if (flipped) {
        const idx = ['1', '2', '3', '4'].indexOf(e.key)
        if (idx >= 0) handleRate(idx)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [flipped, handleFlip, handleRate])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-5 animate-pulse-slow">
          <Zap className="h-10 w-10 text-pink-400" />
        </div>
        <p className="text-slate-400 text-sm font-medium">加载词卡中...</p>
      </div>
    </div>
  )

  if (cards.length === 0) return (
    <PageTransition>
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-emerald-400" />
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-100 mb-2">今日学习已完成</h2>
        <p className="text-slate-400 text-sm mb-8">所有词汇已复习完毕，明天再来继续学习吧</p>
        <button onClick={() => navigate('/vocab')}
          className="btn-gradient px-6 py-3 rounded-xl text-sm font-semibold">
          返回词汇总览
        </button>
      </div>
    </PageTransition>
  )

  if (finished) return (
    <PageTransition>
      <div className="max-w-lg mx-auto text-center py-12">
        {/* Completion image */}
        <div className="w-28 h-28 rounded-3xl overflow-hidden mx-auto mb-6 relative">
          <img src={MEDIA.vocab.completion} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-transparent to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Trophy className="h-12 w-12 text-pink-400 drop-shadow-lg" />
          </div>
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-100 mb-1">本轮学习完成</h2>
        <p className="text-slate-400 text-sm mb-8">坚持就是胜利，继续加油</p>

        <div className="glass-card-static p-6 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="font-mono text-3xl font-bold text-pink-400">{stats.reviewed}</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">已复习</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-3xl font-bold text-emerald-400">{stats.accuracy}%</div>
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
          <button onClick={() => fetchCards(20)}
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

  const card = currentCard!
  const examples = card.example_sentences ?? []

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/vocab')}
            className="flex items-center gap-1.5 text-sm text-pink-400 hover:text-pink-300 transition-colors font-medium">
            <ChevronLeft className="h-4 w-4" /> 返回
          </button>
          <div className="font-mono text-sm text-slate-500 tabular-nums">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </div>
        </div>

        <ProgressBar current={currentIndex + 1} total={cards.length} />

        {/* Card with GSAP-driven 3D flip */}
        <div className="flex justify-center">
          <div
            ref={cardWrapperRef}
            className="relative preserve-3d"
            style={{
              width: '100%',
              maxWidth: '560px',
              minHeight: 380,
              transformStyle: 'preserve-3d',
              perspective: '1000px',
            }}
          >
            {/* FRONT */}
            <div
              ref={frontFaceRef}
              className="absolute inset-0 backface-hidden"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="glass-card-elevated p-10 h-full flex flex-col items-center justify-center text-center">
                <div className="mb-3">
                  <span className={`text-[11px] px-3 py-1 rounded-full font-medium border ${
                    card.status === 'new' ? 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
                    : card.status === 'learning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : card.status === 'reviewing' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {card.status === 'new' ? '新词'
                      : card.status === 'learning' ? '学习中'
                      : card.status === 'reviewing' ? '复习中'
                      : '已掌握'}
                  </span>
                </div>

                <h2 className="font-display text-[3.25rem] font-bold text-slate-100 mb-3 tracking-tight leading-none">
                  {card.word}
                </h2>
                <p className="font-mono text-lg text-slate-500 mb-8">{card.phonetic}</p>

                <button onClick={() => tts.speak(card.word, 0.8)}
                  className="w-14 h-14 rounded-full bg-pink-500/10 hover:bg-pink-500/20 flex items-center justify-center transition-all mb-8">
                  <Volume2 className={`h-6 w-6 ${tts.speaking ? 'text-pink-400 animate-pulse' : 'text-pink-500'}`} />
                </button>

                <button onClick={handleFlip}
                  className="btn-gradient px-10 py-3.5 rounded-xl text-sm font-semibold">
                  显示释义
                </button>
                <p className="text-[11px] text-slate-500 mt-4">按 <kbd className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[10px] font-mono text-slate-400">空格</kbd> 翻转卡片</p>
              </div>
            </div>

            {/* BACK */}
            <div
              ref={backFaceRef}
              className="absolute inset-0 backface-hidden"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <div className="glass-card-elevated p-8 h-full flex flex-col">
                <div className="text-center mb-6">
                  <h2 className="font-display text-3xl font-bold text-slate-100 mb-1">{card.word}</h2>
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                    <span className="font-mono">{card.phonetic}</span>
                    <span className="text-slate-600">·</span>
                    <span className="italic">{card.part_of_speech}</span>
                    <button onClick={() => tts.speak(card.word, 0.8)} className="ml-1">
                      <Volume2 className="h-4 w-4 text-pink-400 hover:text-pink-300 transition-colors" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-sm text-slate-200 leading-relaxed">{card.definition_en}</p>
                    {settings?.show_cn_definition !== false && (
                      <p className="text-sm text-slate-400 mt-2">{card.definition_cn}</p>
                    )}
                  </div>

                  {examples.length > 0 && (
                    <div className="space-y-2.5">
                      {examples.map((ex, i) => (
                        <div key={i} className="bg-pink-500/[0.04] rounded-lg p-3.5 border border-pink-500/10">
                          <p className="text-sm text-slate-200 leading-relaxed">{ex.en}</p>
                          <p className="text-xs text-slate-500 mt-1">{ex.cn}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div ref={ratingButtonsRef} className="grid grid-cols-4 gap-2.5 mt-6 pt-4 border-t border-white/[0.06]">
                  {RATING_BUTTONS.map(({ rating: r, label, color, shadow, hotkey }) => (
                    <motion.button key={r} onClick={() => handleRate(r)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className={`bg-gradient-to-b ${color} text-white rounded-xl py-3 text-sm font-semibold shadow-lg ${shadow}`}>
                      {label}
                      <span className="block text-[10px] opacity-60 mt-0.5 font-mono">{hotkey}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
