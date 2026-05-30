import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import { MEDIA } from '@/lib/media'
import type { SpeakingPrompt, SpeakingResult, SpeakingFeedback } from '@/types'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { useGsapCounter } from '@/hooks/useGsap'
import { Mic, RotateCcw, ChevronLeft, Loader2 } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import gsap from 'gsap'

// ═══════════════════════════════════════
// AudioVisualizer — canvas + AnalyserNode + GSAP 柱状频谱
// ═══════════════════════════════════════
function AudioVisualizer({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const barHeightsRef = useRef<number[]>(Array(32).fill(0))
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!active) {
      // 停止动画和流
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      analyserRef.current = null
      // 将所有柱状高度归零
      barHeightsRef.current = Array(32).fill(0)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const BAR_COUNT = 32

    // 初始化音频分析器
    async function initAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        const audioCtx = new AudioContext()
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 128
        analyser.smoothingTimeConstant = 0.8
        source.connect(analyser)
        analyserRef.current = analyser
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
      } catch {
        // 静默处理 — 没有麦克风权限时仅不显示频谱
      }
    }

    initAudio()

    // 渲染循环
    function draw() {
      const c = canvas
      if (!c) return
      const cx = c.getContext('2d')
      if (!cx) return

      const w = c.width
      const h = c.height
      const analyser = analyserRef.current
      const dataArray = dataArrayRef.current

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray as Uint8Array<ArrayBuffer>)
        // 使用前半部分频率数据
        const step = Math.floor(dataArray.length / BAR_COUNT)
        for (let i = 0; i < BAR_COUNT; i++) {
          const value = dataArray[i * step] / 255 // 0..1
          const targetHeight = Math.max(2, value * h * 0.9)
          // 使用 GSAP 平滑过渡柱状高度
          gsap.to(barHeightsRef.current, {
            [i]: targetHeight,
            duration: 0.15,
            ease: 'power2.out',
            overwrite: 'auto',
          })
        }
      } else {
        // 无麦克风时显示微弱的静态基线
        for (let i = 0; i < BAR_COUNT; i++) {
          barHeightsRef.current[i] = 2
        }
      }

      // 绘制
      cx.clearRect(0, 0, w, h)
      const barGap = 3
      const barWidth = (w - barGap * (BAR_COUNT - 1)) / BAR_COUNT

      for (let i = 0; i < BAR_COUNT; i++) {
        const height = barHeightsRef.current[i]
        const x = i * (barWidth + barGap)
        const y = h - height

        // 渐变色彩：底部紫色 -> 顶部青色
        const gradient = cx.createLinearGradient(x, y, x, h)
        gradient.addColorStop(0, 'rgba(6,182,212,0.9)')
        gradient.addColorStop(1, 'rgba(139,92,246,0.6)')
        cx.fillStyle = gradient

        cx.beginPath()
        const r = barWidth * 0.5
        cx.moveTo(x + r, h)
        cx.lineTo(x + r, y + r)
        cx.arcTo(x, y, x, y + r, r)
        cx.lineTo(x, y + r)
        cx.lineTo(x, h)
        cx.closePath()
        cx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      analyserRef.current = null
    }
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={80}
      className="w-full h-20 rounded-xl bg-white/[0.03] border border-white/[0.06]"
      style={{ imageRendering: 'auto' }}
    />
  )
}

// ═══════════════════════════════════════
// ScoreRing — GSAP 动画环形分数
// ═══════════════════════════════════════
function ScoreRing({ score, label, color, delay }: { score: number; label: string; color: string; delay: number }) {
  const circleRef = useRef<SVGCircleElement>(null)
  const circumference = 2 * Math.PI * 32
  const pct = (score / 30) * 100
  const targetOffset = circumference * (1 - pct / 100)

  useEffect(() => {
    const el = circleRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { strokeDashoffset: circumference },
        {
          strokeDashoffset: targetOffset,
          duration: 1.0,
          delay,
          ease: 'power3.out',
        },
      )
    })
    return () => ctx.revert()
  }, [score, targetOffset, circumference, delay])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[4.5rem] h-[4.5rem]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            ref={circleRef}
            cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono font-bold text-lg text-slate-100">{score}</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
  )
}

export function Speaking() {
  const [prompts, setPrompts] = useState<SpeakingPrompt[]>([])
  const [selected, setSelected] = useState<SpeakingPrompt | null>(null)
  const [transcript, setTranscript] = useState('')
  const [result, setResult] = useState<SpeakingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const { state, audioUrl, start, stop, reset } = useMediaRecorder()
  const promptListRef = useRef<HTMLDivElement>(null)
  const pulseRingRef = useRef<HTMLSpanElement>(null)

  // useGsapCounter for total score
  const totalScoreValue = result?.total_score ?? 0
  const { ref: totalScoreRef } = useGsapCounter<HTMLDivElement>(totalScoreValue, { duration: 1.5, delay: 0.6 })

  useEffect(() => { api.get<SpeakingPrompt[]>('/speaking/prompts').then(setPrompts) }, [])

  // GSAP stagger 入场 — 题目列表
  useEffect(() => {
    if (prompts.length === 0) return
    const el = promptListRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.from('.prompt-item', {
        opacity: 0,
        y: 20,
        duration: 0.55,
        stagger: 0.06,
        ease: 'power3.out',
      })
    }, el)
    return () => ctx.revert()
  }, [prompts])

  // GSAP 录音脉冲环 — 替换 animate-ping
  useEffect(() => {
    const el = pulseRingRef.current
    if (!el || state !== 'recording') return
    const ctx = gsap.context(() => {
      gsap.to(el, {
        scale: 1.3,
        opacity: 0,
        duration: 1.2,
        repeat: -1,
        ease: 'power2.out',
      })
    })
    return () => ctx.revert()
  }, [state])

  // GSAP 提交按钮脉冲
  const submitBtnRef = useRef<HTMLButtonElement>(null)
  const pulseSubmit = useCallback(() => {
    const el = submitBtnRef.current
    if (!el) return
    gsap.to(el, {
      scale: 0.96,
      duration: 0.1,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(el, { scale: 1, duration: 0.25, ease: 'elastic.out(1, 0.4)' })
      },
    })
  }, [])

  async function evaluate() {
    if (!selected || !transcript.trim()) return
    pulseSubmit()
    setLoading(true)
    try {
      const r = await api.post<SpeakingResult>('/speaking/evaluate', {
        task_type: selected.task_type, prompt: selected.prompt, transcript
      })
      setResult(r)
      await api.post('/progress/activity', {
        activity_date: new Date().toISOString().split('T')[0], minutes_studied: 10,
        modules_practiced: JSON.stringify(['speaking'])
      })
    } finally { setLoading(false) }
  }

  function resetAll() { setResult(null); setTranscript(''); reset(); setSelected(null) }

  if (!selected) return (
    <PageTransition>
      <div className="max-w-full lg:max-w-2xl space-y-8">
        <div className="hero-image-overlay rounded-2xl -mx-2 overflow-hidden">
          <img src={MEDIA.speaking.header} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
          <div className="relative z-[2] p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-400 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Mic className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-[1.75rem] font-bold text-slate-100 tracking-tight">口语练习</h1>
                <p className="text-slate-400 text-sm">录制回答，获取 AI 三维评分与反馈</p>
              </div>
            </div>
          </div>
        </div>

        {/* GSAP stagger 替换 StaggerContainer/StaggerItem */}
        <div ref={promptListRef} className="space-y-3">
          {prompts.map((p) => (
            <div key={p.id} className="prompt-item">
              <button onClick={() => setSelected(p)}
                className="w-full text-left card-glow p-5">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${
                    p.task_type === 'independent'
                      ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  }`}>{p.task_type === 'independent' ? '独立题' : '综合题'}</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{p.prompt}</p>
              </button>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  )

  const feedback: SpeakingFeedback | null = result ? JSON.parse(result.feedback_json) : null

  return (
    <PageTransition>
      <div className="max-w-full lg:max-w-2xl space-y-6">
        <button onClick={resetAll} className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium">
          <ChevronLeft className="h-4 w-4" /> 返回列表
        </button>

        <div className="glass-card-static p-6">
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${
            selected.task_type === 'independent'
              ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
          }`}>{selected.task_type === 'independent' ? '独立题' : '综合题'}</span>
          <p className="mt-3 font-medium text-slate-100 leading-relaxed">{selected.prompt}</p>
        </div>

        {!result ? (
          <div className="glass-card-static p-6 space-y-5">
            {/* 录音控件 */}
            <div className="flex items-center gap-3">
              {state === 'idle' && (
                <button onClick={start} className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white rounded-full px-5 py-2.5 text-sm font-medium transition-all shadow-lg shadow-rose-500/25">
                  <Mic className="h-4 w-4" /> 开始录音
                </button>
              )}
              {state === 'recording' && (
                <div className="flex items-center gap-2">
                  {/* GSAP 脉冲环 — 替换 animate-ping */}
                  <span className="relative flex items-center justify-center">
                    <span
                      ref={pulseRingRef}
                      className="absolute inline-flex h-3 w-3 rounded-full bg-rose-400/60"
                      style={{ opacity: 0.6, transform: 'scale(1)' }}
                    />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                  </span>
                  <button onClick={stop} className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] text-slate-200 rounded-full px-5 py-2.5 text-sm font-medium transition-all">
                    <Mic className="h-4 w-4" /> 停止录音
                  </button>
                </div>
              )}
              {state === 'stopped' && (
                <button onClick={reset} className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 rounded-full px-4 py-2.5 text-sm border border-white/[0.08] transition-colors">
                  <RotateCcw className="h-4 w-4" /> 重录
                </button>
              )}
              {audioUrl && <audio controls src={audioUrl} className="flex-1 h-9 rounded-lg" />}
            </div>

            {/* 音频可视化 — 仅录音时显示 */}
            <AudioVisualizer active={state === 'recording'} />

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                转录文本 <span className="font-normal text-slate-500">（填写你说的内容，用于 AI 评分）</span>
              </label>
              <textarea rows={5} value={transcript} onChange={e => setTranscript(e.target.value)}
                className="w-full input-dark px-4 py-3 text-sm resize-none leading-relaxed rounded-xl"
                placeholder="在此输入或粘贴你的口语回答..." />
            </div>
            <button
              ref={submitBtnRef}
              onClick={evaluate}
              disabled={loading || !transcript.trim()}
              className="flex items-center gap-2 btn-gradient px-6 py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> AI 评分中...</> : '获取 AI 评分反馈'}
            </button>
          </div>
        ) : feedback && (
          <div className="glass-card-static p-6 space-y-6">
            <div>
              <h3 className="font-display text-xl font-semibold text-slate-100">评分结果</h3>
              <p className="text-sm text-slate-500 mt-1">{feedback.band_descriptor}</p>
            </div>

            {/* GSAP 动画环形分数 — 延迟错开 3 个环 */}
            <div className="flex justify-around py-2" data-score-rings>
              <ScoreRing score={result.pronunciation_score} label="发音" color="#8B5CF6" delay={0} />
              <ScoreRing score={result.fluency_score} label="流利度" color="#06B6D4" delay={0.2} />
              <ScoreRing score={result.content_score} label="内容" color="#F59E0B" delay={0.4} />
            </div>

            {/* 总分 — useGsapCounter 数字动画 */}
            <div className="text-center py-3 bg-violet-500/[0.08] rounded-xl border border-violet-500/15">
              <div ref={totalScoreRef} className="font-mono text-3xl font-bold text-violet-400">0</div>
              <div className="text-xs text-slate-500 mt-0.5">总分 / 90</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-500/[0.06] rounded-xl p-4 border border-emerald-500/10">
                <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wide">优点</p>
                <ul className="space-y-1.5">
                  {feedback.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5 flex-shrink-0">+</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-amber-500/[0.06] rounded-xl p-4 border border-amber-500/10">
                <p className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wide">改进建议</p>
                <ul className="space-y-1.5">
                  {feedback.improvements.map((s, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5 flex-shrink-0">→</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button onClick={resetAll} className="text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors">
              重新练习
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
