import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { MEDIA } from '@/lib/media'
import type { SpeakingPrompt, SpeakingResult, SpeakingFeedback } from '@/types'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { Mic, RotateCcw, ChevronLeft, Loader2 } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import { StaggerContainer } from '@/components/motion/StaggerContainer'
import { StaggerItem } from '@/components/motion/StaggerItem'

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const pct = (score / 30) * 100
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[4.5rem] h-[4.5rem]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 32}`}
            strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
            strokeLinecap="round" className="transition-all duration-700" />
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

        <StaggerContainer className="space-y-3">
          {prompts.map((p) => (
            <StaggerItem key={p.id}>
              <button onClick={() => setSelected(p)}
                className="w-full text-left glass-card p-5">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${
                    p.task_type === 'independent'
                      ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  }`}>{p.task_type === 'independent' ? '独立题' : '综合题'}</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{p.prompt}</p>
              </button>
            </StaggerItem>
          ))}
        </StaggerContainer>
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
            <div className="flex items-center gap-3">
              {state === 'idle' && (
                <button onClick={start} className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white rounded-full px-5 py-2.5 text-sm font-medium transition-all shadow-lg shadow-rose-500/25">
                  <Mic className="h-4 w-4" /> 开始录音
                </button>
              )}
              {state === 'recording' && (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
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
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                转录文本 <span className="font-normal text-slate-500">（填写你说的内容，用于 AI 评分）</span>
              </label>
              <textarea rows={5} value={transcript} onChange={e => setTranscript(e.target.value)}
                className="w-full input-dark px-4 py-3 text-sm resize-none leading-relaxed rounded-xl"
                placeholder="在此输入或粘贴你的口语回答..." />
            </div>
            <button onClick={evaluate} disabled={loading || !transcript.trim()}
              className="flex items-center gap-2 btn-gradient px-6 py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> AI 评分中...</> : '获取 AI 评分反馈'}
            </button>
          </div>
        ) : feedback && (
          <div className="glass-card-static p-6 space-y-6">
            <div>
              <h3 className="font-display text-xl font-semibold text-slate-100">评分结果</h3>
              <p className="text-sm text-slate-500 mt-1">{feedback.band_descriptor}</p>
            </div>

            <div className="flex justify-around py-2">
              <ScoreRing score={result.pronunciation_score} label="发音" color="#8B5CF6" />
              <ScoreRing score={result.fluency_score} label="流利度" color="#06B6D4" />
              <ScoreRing score={result.content_score} label="内容" color="#F59E0B" />
            </div>

            <div className="text-center py-3 bg-violet-500/[0.08] rounded-xl border border-violet-500/15">
              <div className="font-mono text-3xl font-bold text-violet-400">{result.total_score}</div>
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
