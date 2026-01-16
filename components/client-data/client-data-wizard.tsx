"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCcw, Loader2, Upload, CheckCircle2, AlertTriangle } from "lucide-react"
import { useClientData } from "@/hooks/use-client-data"
import type { ClientDataFile } from "@/lib/api"
import { cn } from "@/lib/utils"

const steps = [
  { id: "business", title: "Business Profile", description: "Tell us about the store" },
  { id: "tax", title: "Tax & Pricing", description: "Configure taxes and rounding" },
  { id: "items", title: "Item Master", description: "Upload SKU list" },
  { id: "receipt", title: "Receipt Sample", description: "Share printed bill format" },
  { id: "review", title: "Review & Submit", description: "Confirm and submit" },
] as const

type Step = (typeof steps)[number]["id"]

const regimeOptions = [
  { value: "gst", label: "GST" },
  { value: "vat", label: "VAT" },
  { value: "none", label: "No Tax" },
  { value: "other", label: "Other" },
]

const roundingOptions = [
  { value: "nearest_1", label: "Nearest ₹1" },
  { value: "nearest_0_5", label: "Nearest ₹0.50" },
  { value: "none", label: "No rounding" },
]

export function ClientDataWizard() {
  const {
    data,
    status,
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

  const [currentStep, setCurrentStep] = useState<Step>("business")
  const [businessProfile, setBusinessProfile] = useState({
    storeName: "",
    storeAddress: "",
    taxId: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
  })
  const [taxConfig, setTaxConfig] = useState({
    currency: "INR",
    regime: "gst",
    roundingPreference: "nearest_1",
    notes: "",
  })
  const [receiptSample, setReceiptSample] = useState({
    provided: false,
    useSystemDefault: true,
    notes: "",
  })
  const [totalSkuCount, setTotalSkuCount] = useState<string>("")

  useEffect(() => {
    if (!data) return
    setBusinessProfile((prev) => ({ ...prev, ...data.businessProfile }))
    setTaxConfig((prev) => ({ ...prev, ...data.taxConfig }))
    setReceiptSample((prev) => ({ ...prev, ...data.receiptSample }))
    if (data.itemMasterSummary?.totalItems) {
      setTotalSkuCount(data.itemMasterSummary.totalItems.toString())
    }
  }, [data])

  const progress = useMemo(() => {
    const index = steps.findIndex((step) => step.id === currentStep)
    return ((index + 1) / steps.length) * 100
  }, [currentStep])

  const filesByType = useMemo(() => {
    const grouping: Record<"SKU_LIST" | "TAX_PROOF" | "BILL_SAMPLE", ClientDataFile[]> = {
      SKU_LIST: [],
      TAX_PROOF: [],
      BILL_SAMPLE: [],
    }
    data?.files?.forEach((file) => {
      grouping[file.type as keyof typeof grouping].push(file)
    })
    return grouping
  }, [data])

  const handleSaveBusiness = useCallback(async () => {
    await saveDraft({ businessProfile })
    setCurrentStep("tax")
  }, [businessProfile, saveDraft])

  const handleSaveTax = useCallback(async () => {
    await saveDraft({ taxConfig })
    setCurrentStep("items")
  }, [taxConfig, saveDraft])

  const handleSaveReceipt = useCallback(async () => {
    await saveDraft({ receiptSample })
    setCurrentStep("review")
  }, [receiptSample, saveDraft])

  const handleUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>, type: ClientDataFile["type"]) => {
      const file = event.target.files?.[0]
      if (!file) return
      await uploadFile({
        file,
        type,
        totalItems: type === "SKU_LIST" && totalSkuCount ? Number(totalSkuCount) : undefined,
      })
      event.target.value = ""
    },
    [uploadFile, totalSkuCount],
  )

  const renderStep = () => {
    switch (currentStep) {
      case "business":
        return (
          <SectionCard title="Business Details" description="We’ll use this information on bills and reports">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Store Name">
                <Input value={businessProfile.storeName} onChange={(e) => setBusinessProfile((prev) => ({ ...prev, storeName: e.target.value }))} />
              </Field>
              <Field label="GST / Tax ID">
                <Input value={businessProfile.taxId} onChange={(e) => setBusinessProfile((prev) => ({ ...prev, taxId: e.target.value }))} />
              </Field>
              <Field label="Contact Name">
                <Input value={businessProfile.contactName} onChange={(e) => setBusinessProfile((prev) => ({ ...prev, contactName: e.target.value }))} />
              </Field>
              <Field label="Contact Phone">
                <Input value={businessProfile.contactPhone} onChange={(e) => setBusinessProfile((prev) => ({ ...prev, contactPhone: e.target.value }))} />
              </Field>
              <Field label="Contact Email">
                <Input value={businessProfile.contactEmail} onChange={(e) => setBusinessProfile((prev) => ({ ...prev, contactEmail: e.target.value }))} />
              </Field>
              <Field label="Store Address" className="md:col-span-2">
                <Textarea rows={3} value={businessProfile.storeAddress} onChange={(e) => setBusinessProfile((prev) => ({ ...prev, storeAddress: e.target.value }))} />
              </Field>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => refresh()} disabled={isSaving}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
              <Button onClick={handleSaveBusiness} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save & Continue
              </Button>
            </div>
          </SectionCard>
        )
      case "tax":
        return (
          <SectionCard title="Tax Configuration" description="Tell us how you charge taxes">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Currency">
                <Input value={taxConfig.currency} onChange={(e) => setTaxConfig((prev) => ({ ...prev, currency: e.target.value }))} />
              </Field>
              <Field label="Tax Regime">
                <Select value={taxConfig.regime} onValueChange={(value) => setTaxConfig((prev) => ({ ...prev, regime: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select regime" />
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
              <Field label="Rounding Preference">
                <Select value={taxConfig.roundingPreference} onValueChange={(value) => setTaxConfig((prev) => ({ ...prev, roundingPreference: value }))}>
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
              <Field label="Notes">
                <Textarea rows={3} value={taxConfig.notes ?? ""} onChange={(e) => setTaxConfig((prev) => ({ ...prev, notes: e.target.value }))} />
              </Field>
            </div>
            <Alert className="bg-muted">
              <AlertDescription className="text-sm">Upload supporting documents (GST registration, tax letters) in the next step.</AlertDescription>
            </Alert>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("business")}>Back</Button>
              <Button onClick={handleSaveTax} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save & Continue
              </Button>
            </div>
          </SectionCard>
        )
      case "items":
        return (
          <SectionCard title="Upload SKU List" description="Provide the final item master with prices">
            <div className="space-y-4">
              <Field label="Total SKUs in file">
                <Input type="number" min={0} value={totalSkuCount} onChange={(e) => setTotalSkuCount(e.target.value)} />
              </Field>
              <UploadZone
                label="Final Item Master (.csv/.xlsx/.xls)"
                description="Download template from Docs > Client Intake"
                files={filesByType.SKU_LIST}
                isUploading={isUploading}
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleUpload(e, "SKU_LIST")}
              />
              <UploadZone
                label="Applicable Tax Details (PDF/Image)"
                description="Invoices, tax letters, or GST certificate"
                files={filesByType.TAX_PROOF}
                isUploading={isUploading}
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => handleUpload(e, "TAX_PROOF")}
              />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep("tax")}>Back</Button>
                <Button onClick={() => setCurrentStep("receipt")}>Continue</Button>
              </div>
            </div>
          </SectionCard>
        )
      case "receipt":
        return (
          <SectionCard title="Receipt Sample" description="Help us match your branding">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Use system default?">
                  <Select
                    value={receiptSample.useSystemDefault ? "yes" : "no"}
                    onValueChange={(value) =>
                      setReceiptSample((prev) => ({
                        ...prev,
                        useSystemDefault: value === "yes",
                        provided: value !== "yes",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No, I'll upload a sample</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
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
            </div>
          </SectionCard>
        )
      case "review":
        return (
          <SectionCard title="Review" description="Double-check everything before submitting">
            <div className="space-y-4">
              <SummaryRow label="Store Name" value={businessProfile.storeName || "-"} />
              <SummaryRow label="Contact" value={`${businessProfile.contactName || "-"} (${businessProfile.contactPhone || "N/A"})`} />
              <SummaryRow label="Tax Regime" value={regimeOptions.find((opt) => opt.value === taxConfig.regime)?.label ?? taxConfig.regime} />
              <SummaryRow label="Rounding" value={roundingOptions.find((opt) => opt.value === taxConfig.roundingPreference)?.label ?? taxConfig.roundingPreference} />
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
                <Button onClick={() => submit()} disabled={isSubmitting || status === "pending_review" || status === "complete"}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {status === "pending_review" || status === "complete" ? "Awaiting Approval" : "Submit for Review"}
                </Button>
              </div>
            </div>
            {status === "pending_review" && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Your data is pending admin approval. You'll be notified once it's marked complete.</AlertDescription>
              </Alert>
            )}
            {status === "complete" && (
              <Alert className="mt-4" variant="default">
                <AlertDescription>All set! Billing and voice workflows are unlocked.</AlertDescription>
              </Alert>
            )}
          </SectionCard>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Client Data Intake</h1>
          <p className="text-sm text-muted-foreground">Complete the steps to unlock billing & voice workflows.</p>
        </div>
        <Badge variant={status === "complete" ? "default" : status === "pending_review" ? "secondary" : "outline"}>Status: {status.replace("_", " ")}</Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">{steps.find((s) => s.id === currentStep)?.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{steps.find((s) => s.id === currentStep)?.description}</p>
            </div>
            <div className="w-48">
              <Progress value={progress} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Stepper currentStep={currentStep} onStepChange={setCurrentStep} />
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading intake data...
            </div>
          ) : (
            renderStep()
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper components

interface SectionCardProps {
  title: string
  description: string
  children: React.ReactNode
}

function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

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
            onClick={() => onStepChange(step.id)}
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
  files: ClientDataFile[]
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
          <>
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground mt-2">Drag & drop or click to browse</p>
            <input type="file" accept={accept} onChange={onChange} className="hidden" id={label} />
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <label htmlFor={label}>Choose File</label>
            </Button>
          </>
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

