"use client"

import { useEffect, useRef, useState } from "react"
import { Mic, Pause, Play, RefreshCw, Square, Waves } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { useVoiceBilling } from "@/hooks/use-voice-billing"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAudioDevices } from "@/hooks/use-audio-devices"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface VoiceControlsProps {
  onTranscript?: (text: string, confidence: number) => void
}

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-slate-100 text-slate-700",
  listening: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  error: "bg-destructive/10 text-destructive",
}

export function VoiceControls({ onTranscript }: VoiceControlsProps) {
  const { language } = useLanguage()
  const {
    devices,
    selectedDeviceId,
    selectDevice,
    permissionState,
    ensurePermission,
    refreshDevices,
    isEnumerating,
    supportsDeviceSelection,
    deviceChangePending,
    acknowledgeDeviceChange,
  } = useAudioDevices()
  const {
    supported,
    status,
    error,
    transcripts,
    start,
    pause,
    resume,
    stop,
    inputLevel,
  } = useVoiceBilling({
    language,
    onTranscript,
    deviceId: selectedDeviceId,
  })
  const [noiseBaseline, setNoiseBaseline] = useState<number | null>(null)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [noiseStatus, setNoiseStatus] = useState<"ok" | "warning" | "autopaused">("ok")
  const calibrationIntervalRef = useRef<number | null>(null)
  const highNoiseStartRef = useRef<number | null>(null)
  const autoPausedRef = useRef(false)

  useEffect(() => {
    if (permissionState === "prompt") {
      void ensurePermission()
    }
  }, [permissionState, ensurePermission])

  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem("voiceNoiseBaseline")
    if (saved) {
      const parsed = Number(saved)
      if (!Number.isNaN(parsed)) {
        setNoiseBaseline(parsed)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (noiseBaseline !== null) {
      window.localStorage.setItem("voiceNoiseBaseline", noiseBaseline.toString())
    }
  }, [noiseBaseline])

  useEffect(
    () => () => {
      if (calibrationIntervalRef.current) {
        window.clearInterval(calibrationIntervalRef.current)
        calibrationIntervalRef.current = null
      }
    },
    [],
  )

  useEffect(() => {
    if (noiseBaseline === null) return
    if (status !== "listening") {
      highNoiseStartRef.current = null
      if (noiseStatus !== "autopaused") {
        setNoiseStatus("ok")
      }
      return
    }

    const excess = inputLevel - noiseBaseline
    if (excess > 0.35) {
      if (!highNoiseStartRef.current) {
        highNoiseStartRef.current = Date.now()
        if (noiseStatus === "ok") setNoiseStatus("warning")
      } else if (Date.now() - highNoiseStartRef.current > 2500 && !autoPausedRef.current) {
        autoPausedRef.current = true
        setNoiseStatus("autopaused")
        pause()
      }
    } else {
      highNoiseStartRef.current = null
      if (noiseStatus !== "autopaused" && noiseStatus !== "ok") {
        setNoiseStatus("ok")
      }
      if (noiseStatus === "autopaused" && status !== "paused") {
        autoPausedRef.current = false
        setNoiseStatus("ok")
      }
      if (noiseStatus === "warning") {
        setNoiseStatus("ok")
      }
    }
  }, [inputLevel, noiseBaseline, pause, status, noiseStatus])

  const startCalibration = () => {
    if (isCalibrating) return
    setIsCalibrating(true)
    const samples: number[] = []
    const startedAt = Date.now()

    const collect = () => {
      samples.push(inputLevel)
      if (Date.now() - startedAt >= 3000) {
        if (calibrationIntervalRef.current) {
          window.clearInterval(calibrationIntervalRef.current)
          calibrationIntervalRef.current = null
        }
        const avg = samples.length
          ? samples.reduce((sum, value) => sum + value, 0) / samples.length
          : inputLevel
        const clamped = Math.min(0.8, Math.max(0.05, avg))
        setNoiseBaseline(clamped)
        setIsCalibrating(false)
      }
    }

    calibrationIntervalRef.current = window.setInterval(collect, 150)
  }

  const handleStart = () => {
    autoPausedRef.current = false
    setNoiseStatus("ok")
    start()
  }

  const handlePause = () => {
    autoPausedRef.current = false
    pause()
  }

  const handleResume = () => {
    autoPausedRef.current = false
    setNoiseStatus("ok")
    resume()
  }

  const handleStop = () => {
    autoPausedRef.current = false
    setNoiseStatus("ok")
    stop()
  }

  if (!supported) {
    return (
      <div className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Mic className="h-4 w-4" />
          Browser voice APIs unavailable. Please use Chrome/Edge or enable the feature flag backend stack.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Voice Billing</p>
            <p className="text-xs text-muted-foreground">Tap start and speak product commands</p>
          </div>
        </div>
        <Badge className={cn("text-xs capitalize", STATUS_COLORS[status])}>{status}</Badge>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Input level</span>
          <span>{Math.round(inputLevel * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full bg-primary transition-all duration-200", {
              "bg-amber-500": inputLevel > 0.65,
              "bg-green-500": inputLevel <= 0.65 && inputLevel > 0.25,
              "bg-red-500": inputLevel <= 0.25,
            })}
            style={{ width: `${Math.min(100, Math.round(inputLevel * 100))}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          Baseline:{" "}
          {noiseBaseline !== null ? `${Math.round(noiseBaseline * 100)}%` : "Not calibrated"}
        </span>
        <Button size="sm" variant="outline" onClick={startCalibration} disabled={isCalibrating}>
          {isCalibrating ? "Calibrating..." : "Calibrate Noise"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {supportsDeviceSelection && (
          <Select value={selectedDeviceId} onValueChange={selectDevice}>
            <SelectTrigger className="flex-1 min-w-[160px]">
              <SelectValue placeholder="Select microphone" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.deviceId || device.label} value={device.deviceId || "default"}>
                  {device.label || "System default"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => ensurePermission()}
          disabled={permissionState === "granted"}
        >
          Grant Mic Access
        </Button>
        <Button size="sm" variant="ghost" onClick={() => refreshDevices()} disabled={isEnumerating}>
          <RefreshCw className={cn("h-4 w-4 mr-1", { "animate-spin": isEnumerating })} />
          Rescan
        </Button>
      </div>

      {permissionState === "denied" && (
        <Alert variant="destructive" className="text-xs">
          <AlertDescription>
            Microphone access denied. Please allow access in your browser settings and click “Grant Mic Access”.
          </AlertDescription>
        </Alert>
      )}

      {deviceChangePending && (
        <Alert className="text-xs">
          <AlertDescription className="flex items-center justify-between gap-2">
            New audio device detected. Select it above or continue with the current microphone.
            <Button size="sm" variant="outline" onClick={acknowledgeDeviceChange}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {permissionState === "denied" && (
        <Alert variant="destructive" className="text-xs">
          <AlertDescription>
            Microphone access denied. Please allow access in your browser settings and click “Grant Mic Access”.
          </AlertDescription>
        </Alert>
      )}

      {noiseBaseline === null && (
        <Alert className="text-xs border-amber-200 bg-amber-50">
          <AlertDescription>
            Calibrate the noise baseline to improve accuracy in busy environments.
          </AlertDescription>
        </Alert>
      )}

      {noiseStatus === "warning" && (
        <Alert className="text-xs border-amber-200 bg-amber-50">
          <AlertDescription>
            High ambient noise detected. Voice capture sensitivity has been reduced; consider pausing or recalibrating.
          </AlertDescription>
        </Alert>
      )}

      {noiseStatus === "autopaused" && (
        <Alert variant="destructive" className="text-xs">
          <AlertDescription className="flex flex-col gap-2">
            Voice billing was paused because of sustained noise. Resume once the environment is quieter or recalibrate
            with the current noise level.
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleResume}>
                Resume anyway
              </Button>
              <Button size="sm" variant="outline" onClick={startCalibration} disabled={isCalibrating}>
                Recalibrate
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={handleStart} disabled={status === "listening"}>
          <Play className="h-4 w-4 mr-1" /> Start
        </Button>
        <Button variant="outline" size="sm" onClick={handlePause} disabled={status !== "listening"}>
          <Pause className="h-4 w-4 mr-1" /> Pause
        </Button>
        <Button variant="outline" size="sm" onClick={handleResume} disabled={status !== "paused"}>
          <Waves className="h-4 w-4 mr-1" /> Resume
        </Button>
        <Button variant="ghost" size="sm" onClick={handleStop}>
          <Square className="h-4 w-4 mr-1" /> Stop
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {transcripts.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded-md bg-background border text-xs divide-y">
          {transcripts.map((segment) => (
            <div key={segment.id} className="p-2 flex items-center justify-between gap-2">
              <span className="truncate">{segment.text}</span>
              <span className="text-muted-foreground">{Math.round(segment.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
