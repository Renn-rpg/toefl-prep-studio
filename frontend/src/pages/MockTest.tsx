import { useState, useEffect, useRef, forwardRef } from 'react'
import { api } from '@/lib/api'
import { MEDIA } from '@/lib/media'
import type { MockTestResult } from '@/types'
import { useTimer } from '@/hooks/useTimer'
import { Timer, CheckCircle, FileText } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGsapCounter } from '@/hooks/useGsap'

gsap.registerPlugin(ScrollTrigger)

type Phase = 'idle' | 'reading' | 'listening' | 'speaking' | 'writing' | 'complete'
const SECTIONS: Phase[] = ['reading', 'listening', 'speaking', 'writing']
const DURATIONS: Record<string, number> = { reading: 54 * 60, listening: 41 * 60, speaking: 17 * 60, writing: 50 * 60 }
const SECTION_LABELS: Record<string, string> = { reading: '阅读', listening: '听力', speaking: '口语', writing: '写作' }
const SECTION_COLORS: Record<string, string> = { reading: 'from-emerald-500 to-emerald-400', listening: 'from-cyan-500 to-cyan-400', speaking: 'from-violet-500 to-violet-400', writing: 'from-amber-500 to-amber-400' }
const SECTION_BG: Record<string, string> = { reading: 'bg-emerald-500/[0.08] border-emerald-500/15', listening: 'bg-cyan-500/[0.08] border-cyan-500/15', speaking: 'bg-violet-500/[0.08] border-violet-500/15', writing: 'bg-amber-500/[0.08] border-amber-500/15' }

const TimerDisplay = forwardRef<HTMLDivElement, { formatted: string; running: boolean; danger: boolean }>(
  ({ formatted, running, danger }, ref) => (
    <div ref={ref} className={`flex items-center gap-2 font-mono text-lg font-bold tabular-nums ${danger ? 'text-red-400' : running ? 'text-slate-100' : 'text-slate-500'}`}>
      <Timer className="h-5 w-5" />
      {formatted}
    </div>
  )
)

function AnimatedScore({ value, label }: { value: number | string | undefined; label: string }) {
  const num = typeof value === 'number' ? value : 0
  const counter = useGsapCounter(num)
  return (
    <div>
      <div className="font-mono text-2xl font-bold text-slate-100">
        <span ref={counter.ref}>0</span>
      </div>
      <div className="text-xs text-slate-400 mt-1 font-medium">{label}</div>
    </div>
  )
}

export function MockTest() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [mockId, setMockId] = useState<number | null>(null)
  const [result, setResult] = useState<MockTestResult | null>(null)
  const currentDuration = phase !== 'idle' && phase !== 'complete' ? (DURATIONS[phase] ?? 0) : 0
  const timer = useTimer(currentDuration)

  // GSAP refs
  const timerRef = useRef<HTMLDivElement>(null)
  const sectionContentRef = useRef<HTMLDivElement>(null)
  const dotsContainerRef = useRef<HTMLDivElement>(null)
  const resultCardRef = useRef<HTMLDivElement>(null)
  const totalScoreCounter = useGsapCounter(result?.total_score ?? 0)

  async function startTest() {
    const r = await api.post<{ mock_test_id: number }>('/mock/start', {})
    setMockId(r.mock_test_id)
    setPhase('reading')
    timer.reset(); timer.start()
  }

  async function nextSection() {
    if (!mockId || phase === 'idle' || phase === 'complete') return
    timer.pause()
    await api.put('/mock/submit', { mock_test_id: mockId, section: phase, answers_json: '{}', duration_seconds: currentDuration - timer.seconds, score: 0 })
    const idx = SECTIONS.indexOf(phase)
    if (idx < SECTIONS.length - 1) {
      setPhase(SECTIONS[idx + 1])
      timer.reset(); timer.start()
    } else {
      setPhase('complete')
      const res = await api.get<MockTestResult>(`/mock/results/${mockId}`)
      setResult(res)
    }
  }

  // GSAP: pulse animation when timer < 5 minutes
  useEffect(() => {
    const el = timerRef.current
    if (!el) return

    if (timer.seconds < 300 && timer.seconds > 0 && timer.running) {
      const pulse = gsap.to(el, {
        scale: 1.05,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
        overwrite: 'auto',
      })
      return () => { pulse.kill() }
    } else {
      gsap.set(el, { scale: 1 })
      return undefined
    }
  }, [timer.seconds < 300, timer.running])

  // GSAP: section content transition on phase change
  useEffect(() => {
    if (sectionContentRef.current) {
      gsap.from(sectionContentRef.current, {
        opacity: 0,
        y: 30,
        duration: 0.5,
        ease: 'power3.out',
      })
    }
  }, [phase])

  // GSAP: progress dots stagger entrance
  useEffect(() => {
    if (!dotsContainerRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(dotsContainerRef.current!.children,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.5, stagger: 0.15, ease: 'power3.out', transformOrigin: 'left center' },
      )
    }, dotsContainerRef)
    return () => ctx.revert()
  }, [])

  // GSAP: result card entrance
  useEffect(() => {
    if (phase === 'complete' && result && resultCardRef.current) {
      const timeout = setTimeout(() => {
        gsap.from(resultCardRef.current, {
          opacity: 0,
          y: 40,
          duration: 0.8,
          ease: 'power3.out',
        })
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [phase, result])

  const sectionIdx = SECTIONS.indexOf(phase)

  if (phase === 'idle') return (
    <PageTransition>
      <div className="max-w-full lg:max-w-2xl space-y-8">
        {/* Hero with image */}
        <div className="hero-image-overlay rounded-2xl -mx-2 overflow-hidden">
          <img src={MEDIA.mock.hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
          <div className="relative z-[2] p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center shadow-lg shadow-red-500/25">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-[1.75rem] font-bold text-slate-100 tracking-tight">模拟考试</h1>
                <p className="text-slate-400 text-sm">完整 TOEFL 模拟 · <span className="text-gradient-flow font-medium">四节计时测试</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card-static p-6 space-y-5">
          <div className="space-y-1">
            {[
              { label: '阅读 Reading', time: '54 分钟', color: 'bg-emerald-500' },
              { label: '听力 Listening', time: '41 分钟', color: 'bg-cyan-500' },
              { label: '口语 Speaking', time: '17 分钟', color: 'bg-violet-500' },
              { label: '写作 Writing', time: '50 分钟', color: 'bg-amber-500' },
            ].map(({ label, time, color }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full ${color}`} />
                  <span className="font-medium text-slate-200 text-sm">{label}</span>
                </div>
                <span className="font-mono text-sm text-slate-400">{time}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 flex items-center justify-between text-sm text-slate-500 border-t border-white/[0.06]">
            <span>总时长约 162 分钟</span>
            <span>可随时提交进入下一节</span>
          </div>
          <button onClick={startTest} className="w-full btn-gradient py-3.5 text-sm font-semibold">
            开始模拟考试
          </button>
        </div>
      </div>
    </PageTransition>
  )

  if (phase === 'complete' && result) return (
    <PageTransition>
      <div className="max-w-full lg:max-w-2xl space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
          <h1 className="font-display text-[1.75rem] font-bold text-slate-100">考试完成</h1>
        </div>

        <div ref={resultCardRef} className="glass-card-static p-8 text-center">
          <div className="font-mono text-7xl font-bold mb-2">
            <span className="text-gradient-brand" ref={totalScoreCounter.ref}>0</span>
          </div>
          <div className="text-slate-500 text-sm mb-8 font-medium">总分 / 120</div>

          <div className="grid grid-cols-2 gap-4">
            {(['reading', 'listening', 'speaking', 'writing'] as const).map(s => (
              <div key={s} className={`rounded-xl p-4 border ${SECTION_BG[s]}`}>
                <AnimatedScore value={result[`${s}_score` as keyof MockTestResult] as number | undefined} label={`${SECTION_LABELS[s]} / 30`} />
              </div>
            ))}
          </div>

          <button onClick={() => { setPhase('idle'); setResult(null); setMockId(null) }}
            className="mt-8 btn-gradient px-6 py-3 text-sm font-semibold">
            再来一次
          </button>
        </div>
      </div>
    </PageTransition>
  )

  return (
    <PageTransition>
      <div className="max-w-full lg:max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-slate-100">
            {SECTION_LABELS[phase]} 部分
          </h1>
          <div className="flex items-center gap-4">
            <TimerDisplay ref={timerRef} formatted={timer.formatted} running={timer.running} danger={timer.seconds < 300} />
            <button onClick={nextSection} className="btn-gradient px-5 py-2.5 text-sm font-semibold">
              {sectionIdx < SECTIONS.length - 1 ? '下一节 →' : '提交完成'}
            </button>
          </div>
        </div>

        <div ref={dotsContainerRef} className="flex gap-2">
          {SECTIONS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all ${
                i < sectionIdx
                  ? `bg-gradient-to-r ${SECTION_COLORS[s]}`
                  : i === sectionIdx
                  ? 'bg-indigo-400 animate-pulse'
                  : 'bg-white/[0.06]'
              }`} />
              <div className="text-[10px] text-slate-500 mt-1 text-center font-medium">{SECTION_LABELS[s]}</div>
            </div>
          ))}
        </div>

        <div ref={sectionContentRef} className="glass-card-static p-6">
          <p className="text-sm text-slate-400 mb-5">
            {phase === 'reading' && '阅读文章并回答题目。请专注阅读考卷内容。'}
            {phase === 'listening' && '听取音频材料并回答题目。请认真听取音频。'}
            {phase === 'speaking' && '完成口语任务。请在规定时间内录音作答。'}
            {phase === 'writing' && '完成写作任务。请在规定时间内完成作文。'}
          </p>
          <div className="bg-white/[0.03] rounded-xl p-8 border border-dashed border-white/[0.08] text-center">
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
              <FileText className="h-5 w-5 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm">实际考试内容区域</p>
            <p className="text-slate-500 text-xs mt-1">请结合配套练习材料使用</p>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
