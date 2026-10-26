import { useCallback, useEffect, useRef, useState } from 'react'

export type SpeechState = 'idle' | 'playing' | 'paused'

/** Read-aloud using the browser's built-in speech synthesis. */
export function useSpeech(speechLang: string) {
  const [supported, setSupported] = useState(false)
  const [hasVoice, setHasVoice] = useState(true)
  const [state, setState] = useState<SpeechState>('idle')
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setSupported(true)
    const prefix = speechLang.split('-')[0]
    const pick = () => {
      const voices = window.speechSynthesis.getVoices()
      const voice =
        voices.find((v) => v.lang === speechLang) ?? voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null
      voiceRef.current = voice
      setHasVoice(voices.length === 0 || !!voice)
    }
    pick()
    window.speechSynthesis.addEventListener('voiceschanged', pick)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', pick)
      window.speechSynthesis.cancel()
      setState('idle')
    }
  }, [speechLang])

  const play = useCallback(
    (text: string) => {
      if (!supported) return
      const synth = window.speechSynthesis
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = speechLang
      if (voiceRef.current) utterance.voice = voiceRef.current
      utterance.rate = 0.92
      utterance.onend = () => setState('idle')
      utterance.onerror = () => setState('idle')
      synth.speak(utterance)
      setState('playing')
    },
    [supported, speechLang],
  )

  const pause = useCallback(() => {
    window.speechSynthesis.pause()
    setState('paused')
  }, [])
  const resume = useCallback(() => {
    window.speechSynthesis.resume()
    setState('playing')
  }, [])
  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setState('idle')
  }, [])

  return { supported, hasVoice, state, play, pause, resume, stop }
}
