"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { apiClient, type ClientData, type ClientDataFile, type ClientDataStatus } from "@/lib/api"

interface UploadOptions {
  file: File
  type: ClientDataFile["type"]
  totalItems?: number
  notes?: string
}

interface SubmitOptions {
  autoApprove?: boolean
}

export function useClientData() {
  const [data, setData] = useState<ClientData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.getClientData()
      setData(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load client data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const saveDraft = useCallback(async (payload: Partial<ClientData>) => {
    setIsSaving(true)
    setError(null)
    try {
      const response = await apiClient.updateClientData(payload)
      setData(response)
      return response
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save client data")
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [])

  const uploadFile = useCallback(async ({ file, type, totalItems, notes }: UploadOptions) => {
    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)
      if (totalItems !== undefined) {
        formData.append("totalItems", totalItems.toString())
      }
      if (notes) {
        formData.append("notes", notes)
      }
      const response = await apiClient.uploadClientDataFile(formData)
      setData(response)
      return response
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file")
      throw err
    } finally {
      setIsUploading(false)
    }
  }, [])

  const submit = useCallback(async (options?: SubmitOptions) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await apiClient.submitClientData(options)
      setData(response)
      return response
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit client data")
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    await load()
  }, [load])

  const status: ClientDataStatus = useMemo(() => data?.status ?? "missing", [data])

  return {
    data,
    status,
    isLoading,
    error,
    isSaving,
    isUploading,
    isSubmitting,
    refresh,
    saveDraft,
    uploadFile,
    submit,
  }
}
