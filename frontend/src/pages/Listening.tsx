import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import { MEDIA } from '@/lib/media'
import { useTTS } from '@/hooks/useTTS'
import type { ListeningPassage, ListeningPassageDetail, Question } from '@/types'
import { Headphones, ChevronLeft, Play, Pause, RotateCcw, Volume2, SkipBack, SkipForward, Sparkles } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGsapCounter } from '@/hooks/useGsap'

gsap.registerPlugin(ScrollTrigger)

function DifficultyBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    hard: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  }
  return (
    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium capitalize border ${map[level] ?? map.medium}`}>
      {level === 'easy' ? '简单' : level === 'medium' ? '中等' : '困难'}
    </span>
  )
}

export function Listening() {
  const [passages, setPassages] = useState<ListeningPassage[]>([])
  const [selected, setSelected] = useState<ListeningPassageDetail | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ score: number; total_questions: number } | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(0.9)
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const tts = useTTS()

  // GSAP refs
  const passageListRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const audioSectionRef = useRef<HTMLDivElement>(null)
  const questionsSectionRef = useRef<HTMLDivElement>(null)
  const resultSectionRef = useRef<HTMLDivElement>(null)
  const transcriptSectionRef = useRef<HTMLDivElement>(null)

  // Score counter
  const scoreCounter = useGsapCounter(result?.score ?? 0)

  useEffect(() => { api.get<ListeningPassage[]>('/listening/passages').then(setPassages) }, [])

  async function selectPassage(id: number) {
    tts.stop()
    setResult(null); setAnswers({}); setShowTranscript(false)
    const detail = await api.get<ListeningPassageDetail>(`/listening/passages/${id}`)
    setSelected(detail)
  }

  function handleBack() { tts.stop(); setSelected(null) }

  const hasAudio = selected?.audio_url && selected.audio_url.length > 0

  async function generateAudio() {
    if (!selected) return
    setGeneratingAudio(true)
    try {
      const res = await api.post<{ audio_url: string }>(`/listening/generate-audio/${selected.id}`, {})
      setSelected({ ...selected, audio_url: res.audio_url })
    } finally {
      setGeneratingAudio(false)
    }
  }

  const skipBack = useCallback(() => {
    if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10)
  }, [])

  const skipForward = useCallback(() => {
    if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration || Infinity, audioRef.current.currentTime + 10)
  }, [])

  async function submit() {
    if (!selected) return
    tts.stop()
    const r = await api.post<{ score: number; total_questions: number }>('/listening/answer', {
      passage_id: selected.id, answers_json: JSON.stringify(answers), duration_seconds: 600
    })
    setResult(r)
    await api.post('/progress/activity', {
      activity_date: new Date().toISOString().split('T')[0], minutes_studied: 15,
      modules_practiced: JSON.stringify(['listening'])
    })
  }

  // GSAP: stagger entrance for passage list
  useEffect(() => {
    if (!passageListRef.current || passages.length === 0) return
    const ctx = gsap.context(() => {
      gsap.from(passageListRef.current!.children, {
        opacity: 0,
        y: 24,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power3.out',
      })
    }, passageListRef)
    return () => ctx.revert()
  }, [passages])

  // GSAP: smooth progress bar width transition
  useEffect(() => {
    if (progressBarRef.current) {
      gsap.to(progressBarRef.current, {
        width: `${tts.progress * 100}%`,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }
  }, [tts.progress])

  // GSAP: ScrollTrigger for content sections
  useEffect(() => {
    if (!selected) return
    const sections = [
      audioSectionRef,
      transcriptSectionRef,
      questionsSectionRef,
      resultSectionRef,
    ]
    const triggers: ScrollTrigger[] = []

    // Delay to let DOM paint refs
    const timeout = setTimeout(() => {
      sections.forEach((ref) => {
        if (!ref.current) return
        const st = ScrollTrigger.create({
          trigger: ref.current,
          start: 'top 85%',
          onEnter: () => {
            gsap.fromTo(ref.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
          },
          once: true,
        })
        triggers.push(st)
      })
    }, 100)

    return () => {
      clearTimeout(timeout)
      triggers.forEach((st) => st.kill())
    }
  }, [selected])

  if (!selected) return (
    <PageTransition>
      <div className="max-w-full lg:max-w-3xl space-y-8">
        {/* Header with image */}
        <div className="hero-image-overlay rounded-2xl -mx-2 overflow-hidden">
          <img src={MEDIA.listening.header} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
          <div className="relative z-[2] p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Headphones className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-[1.75rem] font-bold text-slate-100 tracking-tight">听力练习</h1>
                <p className="text-slate-400 text-sm">选择一段听力材料开始训练</p>
              </div>
            </div>
          </div>
        </div>

        <div ref={passageListRef} className="space-y-3">
          {passages.map((p) => (
            <div key={p.id}>
              <button
                onClick={() => selectPassage(p.id)}
                className="w-full text-left card-glow p-5 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-cyan-500/10 rounded-xl flex items-center justify-center group-hover:bg-cyan-500/15 transition-colors">
                      <Headphones className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">{p.title}</div>
                      <div className="text-xs text-slate-500 capitalize mt-0.5">{p.passage_type === 'lecture' ? '讲座' : '对话'}</div>
                    </div>
                  </div>
                  <DifficultyBadge level={p.difficulty} />
                </div>
              </button>
            </div>
          ))}
          {passages.length === 0 && (
            <div className="glass-card-static p-10 text-center">
              <img src={MEDIA.listening.emptyState} alt="" className="w-24 h-24 rounded-2xl object-cover opacity-30 mx-auto mb-4" />
              <p className="text-sm text-slate-400 font-medium">暂无听力题目</p>
              <p className="text-xs text-slate-500 mt-1">请先运行 <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-xs font-mono text-slate-400">python seed_db.py</code> 初始化数据</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )

  return (
    <PageTransition>
      <div className="max-w-full lg:max-w-3xl space-y-6">
        <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
          <ChevronLeft className="h-4 w-4" /> 返回列表
        </button>

        <div ref={audioSectionRef} className="glass-card-static p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold text-slate-100">{selected.title}</h2>
            <DifficultyBadge level={selected.difficulty} />
          </div>

          {/* Audio player */}
          <div className="bg-cyan-500/[0.06] rounded-xl p-5 border border-cyan-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-slate-200">语音朗读</span>
              <span className="text-[11px] text-slate-500">
                {hasAudio ? '（Edge TTS / 真人音频）' : '（浏览器 TTS）'}
              </span>
            </div>

            {hasAudio ? (
              <div className="space-y-3">
                <audio
                  ref={audioRef}
                  src={`http://localhost:8000${selected.audio_url}`}
                  controls
                  className="w-full h-9 [&::-webkit-media-controls-panel]:bg-white/[0.06] [&::-webkit-media-controls-current-time-display]:text-slate-300 [&::-webkit-media-controls-time-remaining-display]:text-slate-500"
                />
                <div className="flex items-center gap-2">
                  <button onClick={skipBack}
                    className="flex items-center gap-1 bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 rounded-lg px-3 py-1.5 text-xs transition-colors border border-white/[0.08]">
                    <SkipBack className="h-3.5 w-3.5" /> 后退10s
                  </button>
                  <button onClick={skipForward}
                    className="flex items-center gap-1 bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 rounded-lg px-3 py-1.5 text-xs transition-colors border border-white/[0.08]">
                    <SkipForward className="h-3.5 w-3.5" /> 快进10s
                  </button>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-[11px] text-slate-500">速率</span>
                    {[0.75, 1.0, 1.25, 1.5].map(rate => (
                      <button key={rate} onClick={() => { if (audioRef.current) audioRef.current.playbackRate = rate }}
                        className={`text-[11px] px-2 py-1 rounded-lg transition-all font-medium ${
                          audioRef.current?.playbackRate === rate
                            ? 'bg-cyan-500/15 text-cyan-400'
                            : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.06] border border-white/[0.06]'
                        }`}>
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {!tts.speaking ? (
                    <button onClick={() => tts.speak(selected.transcript, playbackRate)}
                      className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all shadow-lg shadow-cyan-500/25">
                      <Play className="h-4 w-4" /> TTS 播放
                    </button>
                  ) : (
                    <button onClick={tts.pause}
                      className="flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-slate-200 rounded-lg px-4 py-2 text-sm font-medium transition-all">
                      <Pause className="h-4 w-4" /> 暂停
                    </button>
                  )}
                  <button onClick={() => tts.stop()}
                    className="flex items-center gap-1.5 bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 rounded-lg px-3 py-2 text-sm transition-colors border border-white/[0.08]">
                    <RotateCcw className="h-4 w-4" /> 重播
                  </button>
                  <button onClick={generateAudio} disabled={generatingAudio}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500/20 to-cyan-400/10 hover:from-cyan-500/30 hover:to-cyan-400/20 text-cyan-400 rounded-lg px-3 py-2 text-xs font-medium transition-all border border-cyan-500/20 ml-auto disabled:opacity-50">
                    <Sparkles className="h-3.5 w-3.5" />
                    {generatingAudio ? '生成中…' : '生成自然语音'}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">语速</span>
                    {[0.7, 0.9, 1.0, 1.2].map(rate => (
                      <button key={rate} onClick={() => setPlaybackRate(rate)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg transition-all font-medium ${
                          playbackRate === rate
                            ? 'bg-cyan-500/15 text-cyan-400'
                            : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.06] border border-white/[0.06]'
                        }`}>
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
                {tts.speaking && (
                  <div className="mt-3 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div ref={progressBarRef} className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full" style={{ width: '0%' }} />
                  </div>
                )}
              </>
            )}
          </div>

          <button onClick={() => setShowTranscript(!showTranscript)}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium mt-4 transition-colors">
            {showTranscript ? '隐藏原文' : '显示原文（跟读练习）'}
          </button>
          {showTranscript && (
            <div ref={transcriptSectionRef} className="bg-white/[0.03] rounded-xl p-5 mt-3 text-sm text-slate-300 leading-relaxed border border-white/[0.06]">
              {selected.transcript}
            </div>
          )}
        </div>

        {/* Questions */}
        <div ref={questionsSectionRef} className="space-y-4">
          {selected.questions.map((q: Question, i: number) => (
            <div key={q.id} className="glass-card-static p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-mono font-bold text-cyan-400">{i + 1}</span>
                </div>
                <p className="font-medium text-slate-100">{q.question}</p>
              </div>
              <div className="space-y-2 ml-9">
                {q.options.map(opt => (
                  <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    answers[String(q.id)] === opt
                      ? 'bg-cyan-500/10 border border-cyan-500/20'
                      : 'hover:bg-white/[0.03] border border-transparent'
                  }`}>
                    <input type="radio" name={`q-${q.id}`} value={opt}
                      checked={answers[String(q.id)] === opt}
                      onChange={() => setAnswers({ ...answers, [String(q.id)]: opt })}
                      className="accent-cyan-500 w-4 h-4" />
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
          <div ref={resultSectionRef} className="glass-card-static p-6 text-center">
            <div className="font-mono text-5xl font-bold text-cyan-400 mb-1">
              <span ref={scoreCounter.ref}>0</span><span className="text-2xl text-slate-500">/{result.total_questions}</span>
            </div>
            <div className="text-sm text-slate-400 font-medium">正确率 {Math.round((result.score / result.total_questions) * 100)}%</div>
            <button onClick={handleBack} className="mt-4 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              返回列表，继续练习
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
