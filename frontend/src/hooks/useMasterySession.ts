import { useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import type { MasteryWord, MasterySession, MasteryAnswerResponse } from '@/types'

export type MasteryPhase = 'loading' | 'question' | 'info' | 'finished'

export interface MasteryStats {
  mastered: number
  total: number
  correct: number
  wrong: number
}

const MAX_RETRIES = 3
const STAGES = [1, 2, 3] as const

export function useMasterySession() {
  const [words, setWords] = useState<MasteryWord[]>([])
  const [phase, setPhase] = useState<MasteryPhase>('loading')
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3>(1)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [stats, setStats] = useState<MasteryStats>({ mastered: 0, total: 0, correct: 0, wrong: 0 })

  // Per-word state (by word index)
  const completedStagesRef = useRef<Map<number, Set<number>>>(new Map())
  const retriesRef = useRef<Map<number, number>>(new Map())
  const poolRef = useRef<number[]>([])     // word indices still in play
  const currentIdxRef = useRef(0)
  const lastIdxRef = useRef(-1)
  const stageStartRef = useRef(Date.now())

  const currentWord = words.length > 0 && currentIdxRef.current < words.length
    ? words[currentIdxRef.current]
    : null

  /** Count completed stages for a word (from local tracking, falls back to server mastery_stage) */
  function getCompletedCount(idx: number): number {
    return completedStagesRef.current.get(idx)?.size ?? words[idx]?.mastery_stage ?? 0
  }

  function _randomStage(idx: number): 1 | 2 | 3 {
    const done = completedStagesRef.current.get(idx) ?? new Set()
    const remaining = STAGES.filter(s => !done.has(s))
    if (remaining.length === 0) return 1 // shouldn't happen
    return remaining[Math.floor(Math.random() * remaining.length)] as 1 | 2 | 3
  }

  function _pickNext(): boolean {
    // Filter pool: exclude the word just shown (if there are other options)
    let candidates = poolRef.current
    if (candidates.length > 1 && lastIdxRef.current >= 0) {
      candidates = candidates.filter(i => i !== lastIdxRef.current)
    }
    if (candidates.length === 0 && poolRef.current.length > 0) {
      // Only one word left in pool, use it even if same as last
      candidates = poolRef.current
    }
    if (candidates.length === 0) return false

    const picked = candidates[Math.floor(Math.random() * candidates.length)]
    currentIdxRef.current = picked
    lastIdxRef.current = picked
    const stage = _randomStage(picked)
    setCurrentStage(stage)
    setSelectedKey(null)
    setIsCorrect(null)
    setShowHint(false)
    stageStartRef.current = Date.now()
    return true
  }

  const fetchSession = useCallback(async (limit = 20) => {
    setPhase('loading')
    const data = await api.get<MasterySession>(`/vocab/mastery/session?limit=${limit}`)
    setWords(data.words)
    setStats({ mastered: 0, total: data.total, correct: 0, wrong: 0 })

    completedStagesRef.current = new Map()
    retriesRef.current = new Map()
    poolRef.current = data.words.map((_, i) => i)
    lastIdxRef.current = -1

    if (data.words.length === 0) {
      setPhase('finished')
      return
    }

    if (!_pickNext()) {
      setPhase('finished')
      return
    }
    setPhase('question')
  }, [])

  const _submitAnswer = useCallback(async (correct: boolean, action: 'answer' | 'show_answer') => {
    if (!currentWord) return
    const duration = Date.now() - stageStartRef.current
    try {
      const res = await api.post<MasteryAnswerResponse>('/vocab/mastery/answer', {
        word_id: currentWord.word_id,
        stage: currentStage,
        correct,
        action,
        duration_ms: duration,
      })
      setWords(prev => prev.map(w =>
        w.word_id === currentWord.word_id
          ? { ...w, mastery_stage: res.mastery_stage, status: res.progress.status }
          : w
      ))
      if (res.session_mastered) {
        setStats(s => ({ ...s, mastered: s.mastered + 1 }))
      }
    } catch {
      // Continue even if server update fails
    }
  }, [currentWord, currentStage])

  const answerOption = useCallback(async (key: string) => {
    if (!currentWord || selectedKey !== null) return
    setSelectedKey(key)

    const correctKey = currentStage === 1
      ? currentWord.stage1_correct_key
      : currentWord.stage2_correct_key
    const correct = key === correctKey
    setIsCorrect(correct)

    if (correct) {
      setStats(s => ({ ...s, correct: s.correct + 1 }))
    } else {
      setStats(s => ({ ...s, wrong: s.wrong + 1 }))
    }

    await _submitAnswer(correct, 'answer')

    setTimeout(() => setPhase('info'), 600)
  }, [currentWord, selectedKey, currentStage, _submitAnswer])

  const showAnswer = useCallback(async () => {
    if (!currentWord || selectedKey !== null) return
    setSelectedKey('__revealed__')
    setIsCorrect(false)
    setStats(s => ({ ...s, wrong: s.wrong + 1 }))
    await _submitAnswer(false, 'show_answer')
    setTimeout(() => setPhase('info'), 300)
  }, [currentWord, selectedKey, _submitAnswer])

  const selfEvaluate = useCallback(async (correct: boolean) => {
    if (!currentWord) return
    setIsCorrect(correct)
    if (correct) {
      setStats(s => ({ ...s, correct: s.correct + 1 }))
    } else {
      setStats(s => ({ ...s, wrong: s.wrong + 1 }))
    }
    await _submitAnswer(correct, 'answer')
    setPhase('info')
  }, [currentWord, _submitAnswer])

  const advanceFromInfo = useCallback(() => {
    if (!currentWord) return
    const idx = currentIdxRef.current

    if (isCorrect) {
      // Mark this stage as completed for this word
      const done = completedStagesRef.current.get(idx) ?? new Set()
      done.add(currentStage)
      completedStagesRef.current.set(idx, done)

      if (done.size >= 3) {
        // Word fully mastered — remove from pool
        poolRef.current = poolRef.current.filter(i => i !== idx)
        completedStagesRef.current.delete(idx)
        retriesRef.current.delete(idx)
      }
    } else {
      // Wrong — clear completed stages, reset count
      completedStagesRef.current.delete(idx)
      const retries = (retriesRef.current.get(idx) ?? 0) + 1
      retriesRef.current.set(idx, retries)
      if (retries >= MAX_RETRIES) {
        poolRef.current = poolRef.current.filter(i => i !== idx)
      }
    }

    if (poolRef.current.length === 0) {
      setPhase('finished')
      return
    }

    if (!_pickNext()) {
      setPhase('finished')
      return
    }
    setPhase('question')
  }, [currentWord, isCorrect, currentStage])

  const toggleHint = useCallback(() => {
    if (currentStage < 3) setShowHint(h => !h)
  }, [currentStage])

  /** Count of completed stages for current word (0–3) */
  const currentProgress = currentIdxRef.current >= 0
    ? getCompletedCount(currentIdxRef.current)
    : 0

  return {
    words,
    currentWord,
    currentStage,
    currentProgress,
    phase,
    selectedKey,
    isCorrect,
    showHint,
    stats,
    fetchSession,
    answerOption,
    showAnswer,
    selfEvaluate,
    advanceFromInfo,
    toggleHint,
  }
}
