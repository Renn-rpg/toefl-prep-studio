import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import type { ListeningPassage, ListeningPassageDetail, Question } from '@/types'
import { Headphones, ChevronLeft, Play, Pause, RotateCcw, Volume2 } from 'lucide-react'

function DifficultyBadge({ level }: { level: string }) {
  const color = level === 'easy' ? 'bg-emerald-100 text-emerald-700'
    : level === 'medium' ? 'bg-amber-100 text-amber-700'
    : 'bg-rose-100 text-rose-700'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${color}`}>{level}</span>
}

function useTTS() {
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<number>(0)

  const speak = useCallback((text: string, rate = 0.9) => {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'en-US'
    utter.rate = rate
    utter.pitch = 1

    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.lang === 'en-US' && v.name.includes('Female'))
      ?? voices.find(v => v.lang === 'en-US')
    if (preferred) utter.voice = preferred

    const totalLen = text.length
    const estimatedDuration = (totalLen / 15) * (1 / rate)

    utter.onstart = () => {
      setSpeaking(true)
      setProgress(0)
      const startTime = Date.now()
      intervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000
        setProgress(Math.min(elapsed / estimatedDuration, 0.99))
      }, 100)
    }
    utter.onend = () => {
      setSpeaking(false)
      setProgress(1)
      clearInterval(intervalRef.current)
    }
    utter.onerror = () => {
      setSpeaking(false)
      clearInterval(intervalRef.current)
    }
    utterRef.current = utter
    window.speechSynthesis.speak(utter)
  }, [])

  const pause = useCallback(() => {
    window.speechSynthesis.pause()
    setSpeaking(false)
    clearInterval(intervalRef.current)
  }, [])

  const resume = useCallback(() => {
    window.speechSynthesis.resume()
    setSpeaking(true)
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
    setProgress(0)
    clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
      clearInterval(intervalRef.current)
    }
  }, [])

  return { speak, pause, resume, stop, speaking, progress }
}

export function Listening() {
  const [passages, setPassages] = useState<ListeningPassage[]>([])
  const [selected, setSelected] = useState<ListeningPassageDetail | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ score: number; total_questions: number } | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(0.9)
  const tts = useTTS()

  useEffect(() => { api.get<ListeningPassage[]>('/listening/passages').then(setPassages) }, [])

  async function selectPassage(id: number) {
    tts.stop()
    setResult(null); setAnswers({}); setShowTranscript(false)
    const detail = await api.get<ListeningPassageDetail>(`/listening/passages/${id}`)
    setSelected(detail)
  }

  function handleBack() {
    tts.stop()
    setSelected(null)
  }

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

  if (!selected) return (
    <div className="max-w-3xl space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-bold text-stone-800">听力练习</h1>
        <p className="text-stone-500 mt-1 text-sm">选择一段听力材料，点击播放按钮开始听力训练</p>
      </div>
      <div className="space-y-3">
        {passages.map(p => (
          <button key={p.id} onClick={() => selectPassage(p.id)}
            className="w-full text-left bg-white rounded-xl border border-stone-200 p-5 hover:border-teal-400 hover:shadow-sm transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                  <Headphones className="h-5 w-5 text-teal-500" />
                </div>
                <div>
                  <div className="font-semibold text-stone-800">{p.title}</div>
                  <div className="text-xs text-stone-400 capitalize mt-0.5">{p.passage_type}</div>
                </div>
              </div>
              <DifficultyBadge level={p.difficulty} />
            </div>
          </button>
        ))}
        {passages.length === 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-400 text-sm">
            暂无题目，请先运行 <code className="bg-stone-100 px-1 rounded">python seed_db.py</code>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6 animate-fade-up">
      <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700">
        <ChevronLeft className="h-4 w-4" /> 返回列表
      </button>

      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-stone-800">{selected.title}</h2>
          <DifficultyBadge level={selected.difficulty} />
        </div>

        {/* Audio player */}
        <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
          <div className="flex items-center gap-3 mb-3">
            <Volume2 className="h-5 w-5 text-teal-600" />
            <span className="text-sm font-medium text-stone-700">语音朗读</span>
            <span className="text-xs text-stone-400">（浏览器 TTS）</span>
          </div>
          <div className="flex items-center gap-3">
            {!tts.speaking ? (
              <button onClick={() => tts.speak(selected.transcript, playbackRate)}
                className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                <Play className="h-4 w-4" /> 播放
              </button>
            ) : (
              <button onClick={tts.pause}
                className="flex items-center gap-1.5 bg-stone-700 hover:bg-stone-800 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                <Pause className="h-4 w-4" /> 暂停
              </button>
            )}
            <button onClick={() => tts.stop()}
              className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg px-3 py-2 text-sm transition-colors">
              <RotateCcw className="h-4 w-4" /> 重播
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-stone-500">语速</span>
              {[0.7, 0.9, 1.0, 1.2].map(rate => (
                <button key={rate} onClick={() => setPlaybackRate(rate)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    playbackRate === rate ? 'bg-teal-100 text-teal-700 font-semibold' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}>
                  {rate}x
                </button>
              ))}
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all duration-200"
              style={{ width: `${tts.progress * 100}%` }} />
          </div>
        </div>

        {/* Transcript toggle */}
        <button onClick={() => setShowTranscript(!showTranscript)}
          className="text-xs text-teal-600 hover:underline mt-4 block">
          {showTranscript ? '隐藏文本' : '显示文本（跟读练习）'}
        </button>
        {showTranscript && (
          <div className="bg-amber-50 rounded-xl p-4 mt-3 text-sm text-stone-700 leading-relaxed border border-amber-100">
            {selected.transcript}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {selected.questions.map((q: Question) => (
          <div key={q.id} className="bg-white rounded-xl border border-stone-200 p-5">
            <p className="font-medium text-stone-800 mb-3">{q.question}</p>
            <div className="space-y-2">
              {q.options.map(opt => (
                <label key={opt} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                  answers[String(q.id)] === opt ? 'bg-teal-50 border border-teal-200' : 'hover:bg-stone-50'
                }`}>
                  <input type="radio" name={`q-${q.id}`} value={opt}
                    checked={answers[String(q.id)] === opt}
                    onChange={() => setAnswers({ ...answers, [String(q.id)]: opt })}
                    className="accent-teal-600" />
                  <span className="text-sm text-stone-700">{opt}</span>
                </label>
              ))}
            </div>
            {result && (
              <div className={`mt-3 text-xs font-medium px-3 py-1.5 rounded-lg ${
                answers[String(q.id)] === q.answer ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {answers[String(q.id)] === q.answer ? '✓ 正确' : `✗ 错误 — 正确答案: ${q.answer}`}
                {q.explanation && ` · ${q.explanation}`}
              </div>
            )}
          </div>
        ))}
      </div>

      {!result ? (
        <button onClick={submit}
          disabled={Object.keys(answers).length < selected.questions.length}
          className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-6 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors">
          提交答案
        </button>
      ) : (
        <div className="bg-white rounded-xl border border-emerald-200 p-5 text-center">
          <div className="font-mono text-4xl font-bold text-teal-600">{result.score}<span className="text-xl text-stone-400">/{result.total_questions}</span></div>
          <div className="text-sm text-stone-500 mt-1">得分</div>
        </div>
      )}
    </div>
  )
}
