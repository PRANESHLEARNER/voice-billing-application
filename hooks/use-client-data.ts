import { useState, useEffect } from "react"
import { apiClient, ClientData } from "@/lib/api"

interface UseClientDataReturn {
  data: ClientData | null
  isLoading: boolean
  error: string | null
  isSaving: boolean
  isUploading: boolean
  isSubmitting: boolean
  saveDraft: (data: Partial<ClientData>) => Promise<void>
  uploadFile: (file: File, type: "SKU_LIST" | "TAX_PROOF" | "BILL_SAMPLE") => Promise<void>
  submit: () => Promise<void>
  refresh: () => Promise<void>
}

export function useClientData(): UseClientDataReturn {
  const [data, setData] = useState<ClientData | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const clientData = await apiClient.getClientData()
      setData(clientData)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load client data")
    } finally {
      setLoading(false)
    }
  }

  const saveDraft = async (draftData: Partial<ClientData>) => {
    try {
      setIsSaving(true)
      const updatedData = await apiClient.updateClientData(draftData)
      setData(updatedData)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to save draft")
    } finally {
      setIsSaving(false)
    }
  }

  const uploadFile = async (file: File, type: "SKU_LIST" | "TAX_PROOF" | "BILL_SAMPLE") => {
    try {
      setIsUploading(true)
      const uploadedFile = await apiClient.uploadClientDataFile(file, type)
      
      // Update local data with new file
      if (data) {
        const updatedFiles = [...(data.files || []), uploadedFile]
        setData({
          ...data,
          files: updatedFiles
        })
        
        // Update item master count if SKU list
        if (type === "SKU_LIST") {
          setData({
            ...data,
            files: updatedFiles,
            itemMaster: {
              ...data.itemMaster,
              totalSkuCount: (data.itemMaster?.totalSkuCount || 0) + 1,
              completed: true
            }
          })
        }
        
        // Update receipt sample completion
        if (type === "BILL_SAMPLE") {
          setData({
            ...data,
            files: updatedFiles,
            receiptSample: {
              ...data.receiptSample,
              completed: true
            }
          })
        }
        
        // Update tax config completion
        if (type === "TAX_PROOF") {
          setData({
            ...data,
            files: updatedFiles,
            taxConfig: {
              ...data.taxConfig,
              completed: true
            }
          })
        }
      }
      
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to upload file")
    } finally {
      setIsUploading(false)
    }
  }

  const submit = async () => {
    try {
      setIsSubmitting(true)
      await apiClient.submitClientData()
      
      // Update status to pending_review
      if (data) {
        setData({
          ...data,
          status: "pending_review"
        })
      }
      
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to submit data")
    } finally {
      setIsSubmitting(false)
    }
  }

  const refresh = async () => {
    await loadData()
  }

  useEffect(() => {
    loadData()
  }, [])

  return {
    data,
    isLoading,
    error,
    isSaving,
    isUploading,
    isSubmitting,
    saveDraft,
    uploadFile,
    submit,
    refresh,
  }
}
