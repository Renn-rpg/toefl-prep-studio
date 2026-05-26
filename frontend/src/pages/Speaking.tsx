import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { SpeakingPrompt, SpeakingResult, SpeakingFeedback } from '@/types'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { Mic, MicOff, RotateCcw, ChevronLeft, Loader2 } from 'lucide-react'

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const pct = (score / 30) * 100
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 32}`}
            strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
            strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono font-bold text-lg text-slate-800">{score}</span>
        </div>
      </div>
      <span className="text-xs text-slate-500">{label}</span>
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

  useEffect(() => { api.get<SpeakingPrompt[]>('/speaking/prompts').then(setPrompts) }, [])

  async function evaluate() {
    if (!selected || !transcript.trim()) return
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
    <div className="max-w-2xl space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-800">口语练习</h1>
        <p className="text-slate-500 mt-1 text-sm">录制回答，获取 AI 三维评分与详细反馈</p>
      </div>
      <div className="space-y-3">
        {prompts.map(p => (
          <button key={p.id} onClick={() => setSelected(p)}
            className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-400 hover:shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                p.task_type === 'independent' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
              }`}>{p.task_type === 'independent' ? '独立题' : '综合题'}</span>
            </div>
            <p className="text-sm text-slate-700">{p.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  )

  const feedback: SpeakingFeedback | null = result ? JSON.parse(result.feedback_json) : null

  return (
    <div className="max-w-2xl space-y-6 animate-fade-up">
      <button onClick={resetAll} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700">
        <ChevronLeft className="h-4 w-4" /> 返回列表
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          selected.task_type === 'independent' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
        }`}>{selected.task_type === 'independent' ? '独立题' : '综合题'}</span>
        <p className="mt-3 font-medium text-slate-800 leading-relaxed">{selected.prompt}</p>
      </div>

      {!result ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            {state === 'idle' && (
              <button onClick={start} className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full px-5 py-2 text-sm font-medium transition-colors">
                <Mic className="h-4 w-4" /> 开始录音
              </button>
            )}
            {state === 'recording' && (
              <button onClick={stop} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white rounded-full px-5 py-2 text-sm font-medium animate-pulse">
                <MicOff className="h-4 w-4" /> 停止录音
              </button>
            )}
            {state === 'stopped' && (
              <button onClick={reset} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full px-4 py-2 text-sm">
                <RotateCcw className="h-4 w-4" /> 重录
              </button>
            )}
            {audioUrl && <audio controls src={audioUrl} className="flex-1 h-8" />}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              转录文本 <span className="font-normal text-slate-400">（填写你说的内容，用于 AI 评分）</span>
            </label>
            <textarea rows={5} value={transcript} onChange={e => setTranscript(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="在此输入或粘贴你的口语回答..." />
          </div>
          <button onClick={evaluate} disabled={loading || !transcript.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> AI 评分中...</> : '获取 AI 评分反馈'}
          </button>
        </div>
      ) : feedback && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-display text-xl font-semibold text-slate-800">评分结果</h3>
            <p className="text-sm text-slate-400 mt-0.5">{feedback.band_descriptor}</p>
          </div>
          <div className="flex justify-around py-4">
            <ScoreRing score={result.pronunciation_score} label="发音" color="#3B82F6" />
            <ScoreRing score={result.fluency_score} label="流利度" color="#10B981" />
            <ScoreRing score={result.content_score} label="内容" color="#F59E0B" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-700 mb-2">优点</p>
              <ul className="space-y-1.5">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5">✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 mb-2">改进建议</p>
              <ul className="space-y-1.5">
                {feedback.improvements.map((s, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">→</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button onClick={resetAll} className="text-sm text-blue-600 hover:underline">重新练习</button>
        </div>
      )}
    </div>
  )
}
