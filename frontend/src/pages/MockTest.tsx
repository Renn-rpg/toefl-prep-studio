import { useState } from 'react'
import { api } from '@/lib/api'
import type { MockTestResult } from '@/types'
import { useTimer } from '@/hooks/useTimer'
import { Timer, CheckCircle } from 'lucide-react'

type Phase = 'idle' | 'reading' | 'listening' | 'speaking' | 'writing' | 'complete'
const SECTIONS: Phase[] = ['reading', 'listening', 'speaking', 'writing']
const DURATIONS: Record<string, number> = { reading: 54 * 60, listening: 41 * 60, speaking: 17 * 60, writing: 50 * 60 }
const SECTION_LABELS: Record<string, string> = { reading: '阅读', listening: '听力', speaking: '口语', writing: '写作' }

function TimerDisplay({ formatted, running }: { formatted: string; running: boolean }) {
  return (
    <div className={`flex items-center gap-2 font-mono text-lg font-bold ${running ? 'text-stone-800' : 'text-stone-400'}`}>
      <Timer className="h-5 w-5" />
      {formatted}
    </div>
  )
}

export function MockTest() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [mockId, setMockId] = useState<number | null>(null)
  const [result, setResult] = useState<MockTestResult | null>(null)
  const currentDuration = phase !== 'idle' && phase !== 'complete' ? (DURATIONS[phase] ?? 0) : 0
  const timer = useTimer(currentDuration)

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

  if (phase === 'idle') return (
    <div className="max-w-2xl space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-bold text-stone-800">模拟考试</h1>
        <p className="text-stone-500 mt-1 text-sm">完整 TOEFL 模拟，四节计时测试</p>
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5">
        <div className="space-y-3">
          {[['阅读 Reading', '54 分钟', 'bg-teal-50 text-teal-600'],
            ['听力 Listening', '41 分钟', 'bg-emerald-50 text-emerald-600'],
            ['口语 Speaking', '17 分钟', 'bg-violet-50 text-violet-600'],
            ['写作 Writing', '50 分钟', 'bg-amber-50 text-amber-600'],
          ].map(([label, time, color]) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${color.split(' ')[0]}`} />
                <span className="font-medium text-stone-700">{label}</span>
              </div>
              <span className="font-mono text-sm text-stone-500">{time}</span>
            </div>
          ))}
        </div>
        <div className="pt-2 flex items-center justify-between text-sm text-stone-400 border-t border-stone-100">
          <span>总时长约 162 分钟</span>
          <span>可随时提交进入下一节</span>
        </div>
        <button onClick={startTest} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-3 font-medium transition-colors">
          开始模拟考试
        </button>
      </div>
    </div>
  )

  if (phase === 'complete' && result) return (
    <div className="max-w-2xl space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-8 w-8 text-emerald-500" />
        <h1 className="font-display text-3xl font-bold text-stone-800">考试完成</h1>
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm text-center">
        <div className="font-mono text-6xl font-bold text-teal-600 mb-1">{result.total_score ?? '--'}</div>
        <div className="text-stone-400 text-sm mb-8">总分 / 120</div>
        <div className="grid grid-cols-2 gap-4">
          {(['reading', 'listening', 'speaking', 'writing'] as const).map(s => (
            <div key={s} className="bg-stone-50 rounded-xl p-4">
              <div className="font-mono text-2xl font-bold text-stone-800">{result[`${s}_score` as keyof MockTestResult] ?? '--'}</div>
              <div className="text-xs text-stone-400 mt-1 capitalize">{SECTION_LABELS[s]} / 30</div>
            </div>
          ))}
        </div>
        <button onClick={() => { setPhase('idle'); setResult(null); setMockId(null) }}
          className="mt-6 border border-stone-200 rounded-xl px-5 py-2 text-sm hover:bg-stone-50 transition-colors">
          再来一次
        </button>
      </div>
    </div>
  )

  const sectionIdx = SECTIONS.indexOf(phase)

  return (
    <div className="max-w-2xl space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-stone-800">
          {SECTION_LABELS[phase]} 部分
        </h1>
        <div className="flex items-center gap-4">
          <TimerDisplay formatted={timer.formatted} running={timer.running} />
          <button onClick={nextSection} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors">
            {sectionIdx < SECTIONS.length - 1 ? '下一节 →' : '提交完成'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-2">
        {SECTIONS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-all ${i < sectionIdx ? 'bg-teal-500' : i === sectionIdx ? 'bg-teal-300' : 'bg-stone-200'}`} />
            <div className="text-[10px] text-stone-400 mt-1 text-center">{SECTION_LABELS[s]}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <p className="text-sm text-stone-500 mb-4">
          {phase === 'reading' && '阅读文章并回答题目。实际考试中，请专注阅读考卷内容。'}
          {phase === 'listening' && '听取音频材料并回答题目。实际考试中，请认真听取音频。'}
          {phase === 'speaking' && '完成口语任务。实际考试中，请在规定时间内录音作答。'}
          {phase === 'writing' && '完成写作任务。实际考试中，请在时间内完成作文。'}
        </p>
        <div className="bg-stone-50 rounded-xl p-5 border border-dashed border-stone-200 text-center text-stone-400 text-sm">
          实际考试内容区域 — 请结合配套练习材料使用
        </div>
      </div>
    </div>
  )
}
