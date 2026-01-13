"use client"

import { useEffect } from "react"
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
  const { supported, status, error, transcripts, start, pause, resume, stop, inputLevel } = useVoiceBilling({
    language,
    onTranscript,
    deviceId: selectedDeviceId,
  })

  useEffect(() => {
    if (permissionState === "prompt") {
      void ensurePermission()
    }
  }, [permissionState, ensurePermission])

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

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={start} disabled={status === "listening"}>
          <Play className="h-4 w-4 mr-1" /> Start
        </Button>
        <Button variant="outline" size="sm" onClick={pause} disabled={status !== "listening"}>
          <Pause className="h-4 w-4 mr-1" /> Pause
        </Button>
        <Button variant="outline" size="sm" onClick={resume} disabled={status !== "paused"}>
          <Waves className="h-4 w-4 mr-1" /> Resume
        </Button>
        <Button variant="ghost" size="sm" onClick={stop}>
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
