import { useCallback, useEffect, useRef, useState } from 'react'

export function useTTS() {
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<number>(0)

  const speak = useCallback((text: string, rate = 0.9, accent: 'us' | 'uk' = 'us') => {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    const lang = accent === 'uk' ? 'en-GB' : 'en-US'
    utter.lang = lang
    utter.rate = rate
    utter.pitch = 1

    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.lang === lang)
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
