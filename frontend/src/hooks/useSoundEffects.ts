import { useCallback, useRef, useState } from 'react'

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

export function useSoundEffects() {
  const [muted, setMuted] = useState(false)
  const lastPlay = useRef(0)

  const playCorrect = useCallback(() => {
    if (muted) return
    const now = Date.now()
    if (now - lastPlay.current < 150) return
    lastPlay.current = now

    const ctx = getCtx()
    const t = ctx.currentTime
    // Bright bell-like chime: two sine oscillators a major third apart at high octave
    const freqs = [1760, 2217]  // A6 + C#7 — bright, crisp
    freqs.forEach(freq => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.1, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
      osc.start(t)
      osc.stop(t + 0.35)
    })
  }, [muted])

  const playWrong = useCallback(() => {
    if (muted) return
    const now = Date.now()
    if (now - lastPlay.current < 150) return
    lastPlay.current = now

    const ctx = getCtx()
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()
    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)
    osc1.type = 'sine'
    osc1.frequency.value = 200
    osc2.type = 'sine'
    osc2.frequency.value = 250
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc1.start(ctx.currentTime)
    osc2.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.4)
    osc2.stop(ctx.currentTime + 0.4)
  }, [muted])

  const toggleMute = useCallback(() => setMuted(m => !m), [])

  return { playCorrect, playWrong, muted, toggleMute }
}
