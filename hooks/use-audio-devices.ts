"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type MicrophonePermissionState = PermissionState | "prompt" | "unsupported"

const isBrowser = typeof window !== "undefined"

export function useAudioDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("default")
  const [permissionState, setPermissionState] = useState<MicrophonePermissionState>("prompt")
  const [isEnumerating, setIsEnumerating] = useState(false)
  const [deviceChangePending, setDeviceChangePending] = useState(false)
  const supportsDeviceApi = isBrowser && !!navigator.mediaDevices
  const abortPermissionListenerRef = useRef<(() => void) | null>(null)

  const refreshDevices = useCallback(async () => {
    if (!supportsDeviceApi || !navigator.mediaDevices?.enumerateDevices) return
    setIsEnumerating(true)
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = allDevices.filter((device) => device.kind === "audioinput")
      setDevices(audioInputs)

      if (audioInputs.length === 0) {
        setSelectedDeviceId("default")
        return
      }

      if (
        selectedDeviceId !== "default" &&
        !audioInputs.some((device) => device.deviceId === selectedDeviceId)
      ) {
        setSelectedDeviceId(audioInputs[0].deviceId || "default")
      }
    } catch (error) {
      console.error("Failed to enumerate audio devices", error)
    } finally {
      setIsEnumerating(false)
    }
  }, [selectedDeviceId, supportsDeviceApi])

  const ensurePermission = useCallback(async () => {
    if (!supportsDeviceApi || !navigator.mediaDevices?.getUserMedia) {
      setPermissionState("unsupported")
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setPermissionState("granted")
      await refreshDevices()
      return true
    } catch (error) {
      console.error("Microphone permission denied", error)
      setPermissionState("denied")
      return false
    }
  }, [refreshDevices, supportsDeviceApi])

  const selectDevice = useCallback((deviceId: string) => {
    setDeviceChangePending(false)
    setSelectedDeviceId(deviceId)
  }, [])

  const acknowledgeDeviceChange = useCallback(() => {
    setDeviceChangePending(false)
  }, [])

  useEffect(() => {
    if (!supportsDeviceApi) {
      setPermissionState("unsupported")
      return
    }

    void refreshDevices()

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((status) => {
          setPermissionState(status.state)
          const handleChange = () => setPermissionState(status.state)
          status.addEventListener?.("change", handleChange)
          status.onchange = handleChange
          abortPermissionListenerRef.current = () => {
            status.removeEventListener?.("change", handleChange)
            status.onchange = null
          }
        })
        .catch(() => {
          // Some browsers block querying microphone permission; keep default state
        })
    }

    const handleDeviceChange = () => {
      setDeviceChangePending(true)
      void refreshDevices()
    }

    navigator.mediaDevices?.addEventListener("devicechange", handleDeviceChange)

    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", handleDeviceChange)
      abortPermissionListenerRef.current?.()
    }
  }, [refreshDevices, supportsDeviceApi])

  const supportsDeviceSelection = useMemo(() => devices.length > 1, [devices.length])

  return {
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
  }
}
