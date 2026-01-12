"use client"

import { Mic, Pause, Play, Square, Waves } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { useVoiceBilling } from "@/hooks/use-voice-billing"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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
  const { supported, status, error, transcripts, start, pause, resume, stop } = useVoiceBilling({
    language,
    onTranscript,
  })

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
