import { useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import type { VocabCard } from '@/types'

interface SessionStats {
  total: number
  reviewed: number
  correct: number
  startTime: number
}

export function useVocabSession() {
  const [cards, setCards] = useState<VocabCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(false)
  const [finished, setFinished] = useState(false)
  const statsRef = useRef<SessionStats>({ total: 0, reviewed: 0, correct: 0, startTime: Date.now() })

  const fetchCards = useCallback(async (limit = 20) => {
    setLoading(true)
    try {
      const res = await api.get<{ cards: VocabCard[]; total: number }>(`/vocab/session/next?limit=${limit}`)
      const data = res.cards
      setCards(data)
      setCurrentIndex(0)
      setFlipped(false)
      setFinished(false)
      statsRef.current = { total: data.length, reviewed: 0, correct: 0, startTime: Date.now() }
    } finally {
      setLoading(false)
    }
  }, [])

  const currentCard = cards[currentIndex] ?? null

  const flip = useCallback(() => setFlipped(true), [])

  const rate = useCallback(async (rating: number) => {
    if (!currentCard) return
    setFlipped(false)

    statsRef.current.reviewed++
    if (rating >= 2) statsRef.current.correct++

    try {
      await api.post('/vocab/session/review', {
        word_id: currentCard.word_id,
        rating,
        session_duration_ms: Date.now() - statsRef.current.startTime
      })
    } catch {}

    if (currentIndex < cards.length - 1) {
      setTimeout(() => setCurrentIndex(i => i + 1), 200)
    } else {
      setFinished(true)
      await api.post('/progress/activity', {
        activity_date: new Date().toISOString().split('T')[0],
        minutes_studied: Math.max(1, Math.round((Date.now() - statsRef.current.startTime) / 60000)),
        modules_practiced: JSON.stringify(['vocab'])
      }).catch(() => {})
    }
  }, [currentCard, currentIndex, cards.length])

  const stats = {
    total: statsRef.current.total,
    reviewed: statsRef.current.reviewed,
    correct: statsRef.current.correct,
    duration: Math.round((Date.now() - statsRef.current.startTime) / 1000),
    accuracy: statsRef.current.reviewed > 0
      ? Math.round((statsRef.current.correct / statsRef.current.reviewed) * 100)
      : 0,
  }

  return {
    cards, currentCard, currentIndex, flipped, loading, finished,
    fetchCards, flip, rate, stats,
  }
}
