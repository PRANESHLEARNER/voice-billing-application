"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCcw, Loader2, Upload, CheckCircle2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

// Inline useClientData implementation to avoid import issues
interface UseClientDataReturn {
  data: any
  isLoading: boolean
  error: string | null
  isSaving: boolean
  isUploading: boolean
  isSubmitting: boolean
  saveDraft: (data: any) => Promise<void>
  uploadFile: (file: File, type: string) => Promise<void>
  submit: () => Promise<void>
  refresh: () => Promise<void>
}

const useClientData = (): UseClientDataReturn => {
  const [data, setData] = useState<any>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const saveDraft = useCallback(async (draftData: any) => {
    setIsSaving(true)
    try {
      // API call would go here
      console.log('Saving draft:', draftData)
      setData((prev: any) => ({ ...prev, ...draftData }))
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to save draft")
    } finally {
      setIsSaving(false)
    }
  }, [])

  const uploadFile = useCallback(async (file: File, type: string) => {
    setIsUploading(true)
    try {
      // API call would go here
      console.log('Uploading file:', file, type)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to upload file")
    } finally {
      setIsUploading(false)
    }
  }, [])

  const submit = useCallback(async () => {
    setIsSubmitting(true)
    try {
      // API call would go here
      console.log('Submitting data')
      setData((prev: any) => ({ ...prev, status: 'pending_review' }))
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to submit")
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      // API call would go here
      console.log('Refreshing data')
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to refresh")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Simulate initial data load
    setTimeout(() => {
      setLoading(false)
    }, 1000)
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

type Step = "business" | "tax" | "items" | "receipt" | "review"

interface BusinessProfile {
  storeName?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
}

interface TaxConfig {
  regime?: string
  gstin?: string
  roundingPreference?: string
}

interface ReceiptSample {
  useSystemDefault?: boolean
  notes?: string
}

interface ValidationErrors {
  businessProfile?: {
    storeName?: string
    contactName?: string
    contactPhone?: string
    contactEmail?: string
  }
  taxConfig?: {
    regime?: string
    gstin?: string
    roundingPreference?: string
  }
  receiptSample?: {
    notes?: string
  }
}

const steps = [
  { id: "business", title: "Business Profile", description: "Store information" },
  { id: "tax", title: "Tax & Pricing", description: "Tax configuration" },
  { id: "items", title: "Item Master", description: "Product catalog" },
  { id: "receipt", title: "Receipt Sample", description: "Bill format" },
  { id: "review", title: "Review", description: "Submit for approval" },
]

const regimeOptions = [
  { value: "gst", label: "GST (India)" },
  { value: "vat", label: "VAT" },
  { value: "sales_tax", label: "Sales Tax" },
  { value: "none", label: "No Tax" },
]

const roundingOptions = [
  { value: "nearest", label: "Nearest" },
  { value: "up", label: "Always Up" },
  { value: "down", label: "Always Down" },
  { value: "none", label: "No Rounding" },
]

interface FieldProps {
  label: string
  children: React.ReactNode
  className?: string
}

function Field({ label, children, className }: FieldProps) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

interface StepperProps {
  currentStep: Step
  onStepChange: (step: Step) => void
}

function Stepper({ currentStep, onStepChange }: StepperProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {steps.map((step, index) => {
        const active = step.id === currentStep
        const completed = steps.findIndex((s) => s.id === currentStep) > index
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepChange(step.id as Step)}
            className={cn(
              "flex flex-col items-start rounded-lg border px-4 py-2 text-left",
              active && "border-primary bg-primary/5",
              completed && "border-green-500 bg-green-50",
            )}
          >
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Step {index + 1}</span>
            <span className="text-sm font-semibold flex items-center gap-2">
              {step.title}
              {completed && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface UploadZoneProps {
  label: string
  description: string
  files: any[]
  isUploading: boolean
  accept: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function UploadZone({ label, description, files, isUploading, accept, onChange }: UploadZoneProps) {
  return (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
          </div>
        ) : (
          <div>
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground mt-2">Drag & drop or click to browse</p>
            <input type="file" accept={accept} onChange={onChange} className="hidden" id={label} />
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <label htmlFor={label}>Choose File</label>
            </Button>
          </div>
        )}
      </div>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((file, idx) => (
            <li key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              {file.originalName}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface SummaryRowProps {
  label: string
  value: string
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex justify-between py-2 border-b border-muted">
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  )
}

interface SectionCardProps {
  title: string
  description: string
  children: React.ReactNode
}

function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  )
}

export default function ClientDataWizard() {
  const [currentStep, setCurrentStep] = useState<Step>("business")
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({})
  const [taxConfig, setTaxConfig] = useState<TaxConfig>({})
  const [receiptSample, setReceiptSample] = useState<ReceiptSample>({})
  const [totalSkuCount, setTotalSkuCount] = useState(0)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  const {
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
  } = useClientData()

  useEffect(() => {
    if (data) {
      setBusinessProfile(data.businessProfile || {})
      setTaxConfig(data.taxConfig || {})
      setReceiptSample(data.receiptSample || {})
      setTotalSkuCount(data.itemMaster?.totalSkuCount || 0)
    }
  }, [data])

  const progress = useMemo(() => {
    const stepIndex = steps.findIndex((s) => s.id === currentStep)
    return ((stepIndex + 1) / steps.length) * 100
  }, [currentStep])

  const filesByType = useMemo(() => {
    if (!data?.files) return { SKU_LIST: [], TAX_PROOF: [], BILL_SAMPLE: [] }
    
    return {
      SKU_LIST: data.files.filter((f: any) => f.type === "SKU_LIST"),
      TAX_PROOF: data.files.filter((f: any) => f.type === "TAX_PROOF"),
      BILL_SAMPLE: data.files.filter((f: any) => f.type === "BILL_SAMPLE"),
    }
  }, [data?.files])

  const validateBusinessProfile = (): boolean => {
    const errors: ValidationErrors['businessProfile'] = {}
    
    if (!businessProfile.storeName?.trim()) {
      errors.storeName = "Store name is required"
    }
    
    if (!businessProfile.contactName?.trim()) {
      errors.contactName = "Contact name is required"
    }
    
    if (!businessProfile.contactPhone?.trim()) {
      errors.contactPhone = "Contact phone is required"
    } else if (!/^\+?[0-9]{10,15}$/.test(businessProfile.contactPhone.replace(/\s/g, ""))) {
      errors.contactPhone = "Please enter a valid phone number"
    }
    
    if (!businessProfile.contactEmail?.trim()) {
      errors.contactEmail = "Contact email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessProfile.contactEmail)) {
      errors.contactEmail = "Please enter a valid email address"
    }
    
    setValidationErrors(prev => ({ ...prev, businessProfile: Object.keys(errors).length > 0 ? errors : undefined }))
    return Object.keys(errors).length === 0
  }

  const validateTaxConfig = (): boolean => {
    const errors: ValidationErrors['taxConfig'] = {}
    
    if (!taxConfig.regime) {
      errors.regime = "Tax regime is required"
    }
    
    if (taxConfig.regime === "gst" && !taxConfig.gstin?.trim()) {
      errors.gstin = "GSTIN is required for GST regime"
    } else if (taxConfig.gstin && !/^[0-9A-Z]{5}[0-9A-Z]{4}[0-9A-Z]{1}[0-9A-Z]{1}[0-9A-Z]{3}$/.test(taxConfig.gstin)) {
      errors.gstin = "Please enter a valid GSTIN format"
    }
    
    if (!taxConfig.roundingPreference) {
      errors.roundingPreference = "Rounding preference is required"
    }
    
    setValidationErrors(prev => ({ ...prev, taxConfig: Object.keys(errors).length > 0 ? errors : undefined }))
    return Object.keys(errors).length === 0
  }

  const validateReceiptSample = (): boolean => {
    const errors: ValidationErrors['receiptSample'] = {}
    
    if (!receiptSample.useSystemDefault && !receiptSample.notes?.trim()) {
      errors.notes = "Notes are required when using custom receipt format"
    }
    
    setValidationErrors(prev => ({ ...prev, receiptSample: Object.keys(errors).length > 0 ? errors : undefined }))
    return Object.keys(errors).length === 0
  }

  const handleSaveBusiness = useCallback(async () => {
    if (!validateBusinessProfile()) return
    
    await saveDraft({ businessProfile })
    setCurrentStep("tax")
  }, [businessProfile, saveDraft, validationErrors])

  const handleSaveTax = useCallback(async () => {
    if (!validateTaxConfig()) return
    
    await saveDraft({ taxConfig })
    setCurrentStep("items")
  }, [taxConfig, saveDraft, validationErrors])

  const handleSaveReceipt = useCallback(async () => {
    if (!validateReceiptSample()) return
    
    await saveDraft({ receiptSample })
    setCurrentStep("review")
  }, [receiptSample, saveDraft, validationErrors])

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: "SKU_LIST" | "TAX_PROOF" | "BILL_SAMPLE") => {
    const file = e.target.files?.[0]
    if (file) {
      await uploadFile(file, type)
    }
  }, [uploadFile])

  const renderStep = () => {
    switch (currentStep) {
      case "business":
        return (
          <SectionCard title="Business Profile" description="Store information and contact details">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Store Name">
                <Input
                  value={businessProfile.storeName || ""}
                  onChange={(e) => setBusinessProfile((prev) => ({ ...prev, storeName: e.target.value }))}
                  placeholder="Your store name"
                />
              </Field>
              <Field label="Contact Name">
                <Input
                  value={businessProfile.contactName || ""}
                  onChange={(e) => setBusinessProfile((prev) => ({ ...prev, contactName: e.target.value }))}
                  placeholder="Primary contact person"
                />
              </Field>
              <Field label="Contact Phone">
                <Input
                  value={businessProfile.contactPhone || ""}
                  onChange={(e) => setBusinessProfile((prev) => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </Field>
              <Field label="Contact Email">
                <Input
                  type="email"
                  value={businessProfile.contactEmail || ""}
                  onChange={(e) => setBusinessProfile((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="contact@store.com"
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveBusiness} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save & Continue
              </Button>
            </div>
          </SectionCard>
        )

      case "tax":
        return (
          <SectionCard title="Tax Configuration" description="Tax settings and pricing preferences">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tax Regime">
                <Select value={taxConfig.regime || ""} onValueChange={(value) => setTaxConfig((prev) => ({ ...prev, regime: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tax regime" />
                  </SelectTrigger>
                  <SelectContent>
                    {regimeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="GSTIN (Optional)">
                <Input
                  value={taxConfig.gstin || ""}
                  onChange={(e) => setTaxConfig((prev) => ({ ...prev, gstin: e.target.value }))}
                  placeholder="29ABCDE1234F1ZV"
                />
              </Field>
              <Field label="Rounding Preference">
                <Select value={taxConfig.roundingPreference || ""} onValueChange={(value) => setTaxConfig((prev) => ({ ...prev, roundingPreference: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rounding" />
                  </SelectTrigger>
                  <SelectContent>
                    {roundingOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveTax} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save & Continue
              </Button>
            </div>
          </SectionCard>
        )

      case "items":
        return (
          <SectionCard title="Item Master Upload" description="Upload your product catalog with pricing">
            <div className="space-y-4">
              <UploadZone
                label="SKU List (CSV/Excel)"
                description="Upload your complete product catalog with SKU codes, names, and prices"
                files={filesByType.SKU_LIST}
                isUploading={isUploading}
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleUpload(e, "SKU_LIST")}
              />
              {totalSkuCount > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Total SKUs:</strong> {totalSkuCount}
                  </p>
                </div>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep("tax")}>Back</Button>
                <Button onClick={() => setCurrentStep("receipt")} disabled={filesByType.SKU_LIST.length === 0}>
                  Continue
                </Button>
              </div>
            </div>
          </SectionCard>
        )

      case "receipt":
        return (
          <SectionCard title="Receipt Sample" description="Bill format and layout preferences">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Receipt Format">
                  <Select 
                    value={receiptSample.useSystemDefault !== false ? "system" : "custom"} 
                    onValueChange={(value) => setReceiptSample((prev) => ({ ...prev, useSystemDefault: value === "system" }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System Default</SelectItem>
                      <SelectItem value="custom">Custom Format</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Notes">
                <Textarea rows={3} value={receiptSample.notes ?? ""} onChange={(e) => setReceiptSample((prev) => ({ ...prev, notes: e.target.value }))} />
              </Field>
            </div>
            {!receiptSample.useSystemDefault && (
              <UploadZone
                label="Sample Printed Bill (PDF/Image)"
                description="Photos from your receipt printer work too"
                files={filesByType.BILL_SAMPLE}
                isUploading={isUploading}
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => handleUpload(e, "BILL_SAMPLE")}
              />
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("items")}>Back</Button>
              <Button onClick={handleSaveReceipt} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save & Continue
              </Button>
            </div>
          </SectionCard>
        )

      case "review":
        return (
          <SectionCard title="Review" description="Double-check everything before submitting">
            <div className="space-y-4">
              <SummaryRow label="Store Name" value={businessProfile.storeName || "-"} />
              <SummaryRow label="Contact" value={`${businessProfile.contactName || "-"} (${businessProfile.contactPhone || "N/A"})`} />
              <SummaryRow label="Tax Regime" value={regimeOptions.find((opt) => opt.value === taxConfig.regime)?.label || taxConfig.regime || "-"} />
              <SummaryRow label="Rounding" value={roundingOptions.find((opt) => opt.value === taxConfig.roundingPreference)?.label || taxConfig.roundingPreference || "-"} />
              <SummaryRow label="SKU File" value={filesByType.SKU_LIST.length ? `${filesByType.SKU_LIST.length} file(s)` : "Not uploaded"} />
              <SummaryRow label="Tax Documents" value={filesByType.TAX_PROOF.length ? `${filesByType.TAX_PROOF.length} file(s)` : "Not uploaded"} />
              <SummaryRow label="Receipt Sample" value={receiptSample.useSystemDefault ? "Using default" : filesByType.BILL_SAMPLE.length ? "Uploaded" : "Pending"} />
            </div>
            <div className="flex flex-wrap gap-3 justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("receipt")}>Back</Button>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => refresh()} disabled={isSubmitting}>
                  Refresh
                </Button>
                <Button onClick={() => submit()} disabled={isSubmitting || data?.status === "pending_review" || data?.status === "complete"}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {data?.status === "pending_review" || data?.status === "complete" ? "Awaiting Approval" : "Submit for Review"}
                </Button>
              </div>
            </div>
            {data?.status === "pending_review" && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Your data is pending admin approval. You'll be notified once it's marked complete.</AlertDescription>
              </Alert>
            )}
            {data?.status === "complete" && (
              <Alert className="mt-4" variant="default">
                <AlertDescription>All set! Billing and voice workflows are unlocked.</AlertDescription>
              </Alert>
            )}
          </SectionCard>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading client data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Data Intake</h1>
          <p className="text-muted-foreground">
            Complete your business setup to unlock billing features
          </p>
        </div>
        <Button variant="outline" onClick={() => refresh()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {data?.status === "pending_review" && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your data is currently under review. You can still make changes, but you'll need to resubmit.
          </AlertDescription>
        </Alert>
      )}

      {data?.status === "complete" && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Your client data has been approved. All features are now available.
          </AlertDescription>
        </Alert>
      )}

      {Object.keys(validationErrors).length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please fix the following errors before proceeding:
            <ul className="list-disc list-inside mt-2">
              {Object.entries(validationErrors).map(([section, errors]) => (
                <li key={section}>
                  <strong>{section}:</strong>
                  <ul className="list-disc list-inside ml-4">
                    {Object.entries(errors).map(([field, message]) => (
                      <li key={field}>{String(message)}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <Stepper currentStep={currentStep} onStepChange={setCurrentStep} />
        <Progress value={progress} className="w-full" />
      </div>

      {renderStep()}
    </div>
  )
}
