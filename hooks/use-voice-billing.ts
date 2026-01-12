"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Language } from "@/contexts/language-context"

type SpeechRecognitionAlternative = {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResult[]
}

interface SpeechRecognitionErrorEvent {
  error: string
}

interface SpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognition

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor
    SpeechRecognition?: SpeechRecognitionConstructor
  }
}

export type VoiceSessionStatus = "idle" | "listening" | "paused" | "processing" | "error"

export interface TranscriptSegment {
  id: string
  text: string
  confidence: number
  isFinal: boolean
  timestamp: number
}

interface UseVoiceBillingOptions {
  language: Language
  onTranscript?: (transcript: string, confidence: number) => void
}

interface UseVoiceBillingResult {
  supported: boolean
  status: VoiceSessionStatus
  error: string | null
  transcripts: TranscriptSegment[]
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
}

const LANGUAGE_TO_LOCALE: Record<Language, string> = {
  en: "en-IN",
  ta: "ta-IN",
  bilingual: "en-IN",
}

export function useVoiceBilling({ language, onTranscript }: UseVoiceBillingOptions): UseVoiceBillingResult {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [supported, setSupported] = useState<boolean>(false)
  const [status, setStatus] = useState<VoiceSessionStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([])
  const pausedRef = useRef(false)

  const locale = useMemo(() => LANGUAGE_TO_LOCALE[language] ?? "en-IN", [language])

  const ensureRecognitionInstance = useCallback(() => {
    if (typeof window === "undefined") return null
    if (recognitionRef.current) return recognitionRef.current

    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionConstructor) {
      setSupported(false)
      return null
    }

    const recognition = new SpeechRecognitionConstructor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const newSegments: TranscriptSegment[] = []
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const alternative = result[0]
        const text = alternative.transcript.trim()
        if (!text) continue
        const segment: TranscriptSegment = {
          id: `${Date.now()}-${i}`,
          text,
          confidence: alternative.confidence,
          isFinal: result.isFinal,
          timestamp: Date.now(),
        }
        newSegments.unshift(segment)
        if (result.isFinal) {
          onTranscript?.(text, alternative.confidence)
        }
      }

      if (newSegments.length > 0) {
        setTranscripts((prev) => {
          const updated = [...newSegments, ...prev]
          return updated.slice(0, 10)
        })
      }

      if (newSegments.some((segment) => segment.isFinal)) {
        setStatus("processing")
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Voice billing error", event)
      setError(event.error || "Voice recognition error")
      setStatus("error")
    }

    recognition.onend = () => {
      if (pausedRef.current) {
        setStatus("paused")
        return
      }
      setStatus("idle")
    }

    recognitionRef.current = recognition
    setSupported(true)
    return recognition
  }, [onTranscript])

  useEffect(() => {
    const recognition = ensureRecognitionInstance()
    if (recognition) {
      recognition.lang = locale
    }
    return () => {
      recognition?.stop()
      recognitionRef.current = null
    }
  }, [ensureRecognitionInstance, locale])

  const start = useCallback(() => {
    const recognition = ensureRecognitionInstance()
    if (!recognition) {
      setError("Voice recognition is not supported in this browser")
      return
    }
    try {
      pausedRef.current = false
      recognition.lang = locale
      recognition.start()
      setError(null)
      setStatus("listening")
    } catch (err) {
      console.error("Failed to start voice recognition", err)
      setError("Unable to start microphone. Check permissions and try again.")
      setStatus("error")
    }
  }, [ensureRecognitionInstance, locale])

  const stop = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return
    pausedRef.current = false
    recognition.stop()
    setStatus("idle")
  }, [])

  const pause = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return
    pausedRef.current = true
    recognition.stop()
    setStatus("paused")
  }, [])

  const resume = useCallback(() => {
    if (!pausedRef.current) {
      start()
      return
    }
    pausedRef.current = false
    start()
  }, [start])

  return {
    supported,
    status,
    error,
    transcripts,
    start,
    pause,
    resume,
    stop,
  }
}
