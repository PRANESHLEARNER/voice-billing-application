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
  deviceId?: string
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
  inputLevel: number
}

const LANGUAGE_TO_LOCALE: Record<Language, string> = {
  en: "en-IN",
  ta: "ta-IN",
  bilingual: "ta-IN",
}

export function useVoiceBilling({
  language,
  onTranscript,
  deviceId,
}: UseVoiceBillingOptions): UseVoiceBillingResult {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number>()
  const [supported, setSupported] = useState<boolean>(false)
  const [status, setStatus] = useState<VoiceSessionStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([])
  const [inputLevel, setInputLevel] = useState(0)
  const pausedRef = useRef(false)

  const locale = useMemo(() => LANGUAGE_TO_LOCALE[language] ?? "en-IN", [language])
  const deviceConstraint = useMemo(() => {
    if (!deviceId || deviceId === "default") return undefined
    return { exact: deviceId }
  }, [deviceId])

  const teardownAudioGraph = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = undefined
    }
    analyserRef.current?.disconnect()
    analyserRef.current = null
    audioContextRef.current?.close().catch(() => void 0)
    audioContextRef.current = null
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
    setInputLevel(0)
  }, [])

  const pumpInputLevel = useCallback(() => {
    if (!analyserRef.current) return
    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.fftSize)

    const updateLevel = () => {
      analyser.getByteTimeDomainData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i] / 128 - 1
        sum += value * value
      }
      const rms = Math.sqrt(sum / dataArray.length)
      setInputLevel(Number.isFinite(rms) ? Math.min(1, rms * 2.5) : 0)
      rafRef.current = requestAnimationFrame(updateLevel)
    }

    rafRef.current = requestAnimationFrame(updateLevel)
  }, [])

  const ensureAudioStream = useCallback(async () => {
    if (mediaStreamRef.current) return mediaStreamRef.current
    if (!navigator.mediaDevices?.getUserMedia) return null

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceConstraint,
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: false,
        },
        video: false,
      })
      mediaStreamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      source.connect(analyser)
      pumpInputLevel()

      return stream
    } catch (err) {
      console.error("Unable to access microphone", err)
      setError("Unable to access microphone. Check device permissions or selection.")
      setStatus("error")
      return null
    }
  }, [deviceConstraint, pumpInputLevel])

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

      // Auto-restart if we are supposed to be listening
      if (status === "listening" || status === "processing") {
        try {
          recognition.start()
          return
        } catch (err) {
          console.warn("Auto-restart failed", err)
        }
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
      teardownAudioGraph()
    }
  }, [ensureRecognitionInstance, locale, teardownAudioGraph])

  useEffect(() => {
    if (status !== "listening") return
    // When device changes mid-session, restart capture to honor new selection
    teardownAudioGraph()
    void ensureAudioStream()
  }, [deviceConstraint, ensureAudioStream, status, teardownAudioGraph])

  const start = useCallback(async () => {
    const recognition = ensureRecognitionInstance()
    if (!recognition) {
      setError("Voice recognition is not supported in this browser")
      return
    }
    try {
      const stream = await ensureAudioStream()
      if (!stream) return
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
  }, [ensureAudioStream, ensureRecognitionInstance, locale])

  const stop = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return
    pausedRef.current = false
    recognition.stop()
    setStatus("idle")
    teardownAudioGraph()
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
    void start()
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
    inputLevel,
  }
}
