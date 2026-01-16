"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Upload, CheckCircle2, Loader2, AlertTriangle, RefreshCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useClientData } from "@/hooks/use-client-data"
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
  const [skuStats, setSkuStats] = useState({ totalItems: "" })

  useEffect(() => {
    if (!data) return
    setBusinessProfile((prev) => ({ ...prev, ...data.businessProfile }))
    setTaxConfig((prev) => ({ ...prev, ...data.taxConfig }))
    setReceiptSample((prev) => ({ ...prev, ...data.receiptSample }))
    if (data.itemMasterSummary?.totalItems) {
      setSkuStats({ totalItems: data.itemMasterSummary.totalItems.toString() })
    }
  }, [data])

  const progress = useMemo(() => {
    const index = steps.findIndex((step) => step.id === currentStep)
    return ((index + 1) / steps.length) * 100
  }, [currentStep])

  const handleSaveBusiness = async () => {
    await saveDraft({ businessProfile })
    setCurrentStep("tax")
  }

  const handleSaveTax = async () => {
    await saveDraft({ taxConfig })
    setCurrentStep("items")
  }

  const handleSaveReceipt = async () => {
    await saveDraft({ receiptSample })
    setCurrentStep("review")
  }

  const handleUpload = useCallback(
    async (
      event: React.ChangeEvent<HTMLInputElement>,
      fileType: "SKU_LIST" | "TAX_PROOF" | "BILL_SAMPLE",
    ) => {
      const file = event.target.files?.[0]
      if (!file) return
      await uploadFile({
        file,
        type: fileType,
        totalItems:
          fileType === "SKU_LIST" && skuStats.totalItems ? Number(skuStats.totalItems) : undefined,
      })
      event.target.value = ""
    },
    [uploadFile, skuStats.totalItems],
  )

  const filesByType = useMemo(() => {
    const mapping: Record<string, typeof data?.files> = {
      SKU_LIST: [],
      TAX_PROOF: [],
      BILL_SAMPLE: [],
    }
    data?.files?.forEach((file) => {
      if (!mapping[file.type]) mapping[file.type] = []
      mapping[file.type]!.push(file)
    })
    return mapping
  }, [data])

  const isComplete = status === "complete"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Client Data Intake</h1>
          <p className="text-sm text-muted-foreground">
            Complete the steps to unlock billing & voice workflows.
          </p>
        </div>
        <Badge
          variant={
            isComplete ? "default" : status === "pending_review" ? "secondary" : "outline"
          }
        >
          Status: {status.replace("_", " ")}
        </Badge>
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
              <CardTitle className="text-lg">
                {steps.find((s) => s.id === currentStep)?.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {steps.find((s) => s.id === currentStep)?.description}
              </p>
            </div>
            <div className="w-48">
              <Progress value={progress} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Stepper currentStep={currentStep} onStepChange={(step) => setCurrentStep(step)} />

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading intake data...
            </div>
          ) : (
            <div className="space-y-6">
              {currentStep === "business" && (
                <SectionCard
                  title="Business Details"
                  description="We’ll use this information on bills and reports"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Store Name">
                      <Input
                        value={businessProfile.storeName}
                        onChange={(e) =>
                          setBusinessProfile((prev) => ({ ...prev, storeName: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="GST / Tax ID">
                      <Input
                        value={businessProfile.taxId}
                        onChange={(e) =>
                          setBusinessProfile((prev) => ({ ...prev, taxId: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Contact Name">
                      <Input
                        value={businessProfile.contactName}
                        onChange={(e) =>
                          setBusinessProfile((prev) => ({ ...prev, contactName: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Contact Phone">
                      <Input
                        value={businessProfile.contactPhone}
                        onChange={(e) =>
                          setBusinessProfile((prev) => ({ ...prev, contactPhone: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Contact Email">
                      <Input
                        value={businessProfile.contactEmail}
                        onChange={(e) =>
                          setBusinessProfile((prev) => ({ ...prev, contactEmail: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Store Address" className="md:col-span-2">
                      <Textarea
                        rows={3}
                        value={businessProfile.storeAddress}
                        onChange={(e) =>
                          setBusinessProfile((prev) => ({ ...prev, storeAddress: e.target.value }))
                        }
                      />
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
              )}

              {currentStep === "tax" && (
                <SectionCard
                  title="Tax Configuration"
                  description="Tell us how you charge taxes"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Currency">
                      <Input
                        value={taxConfig.currency}
                        onChange={(e) =>
                          setTaxConfig((prev) => ({ ...prev, currency: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Tax Regime">
                      <Select
                        value={taxConfig.regime}
                        onValueChange={(value) =>
                          setTaxConfig((prev) => ({ ...prev, regime: value }))
                        }
                      >
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
                      <Select
                        value={taxConfig.roundingPreference}
                        onValueChange={(value) =>
                          setTaxConfig((prev) => ({ ...prev, roundingPreference: value }))
                        }
                      >
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
                      <Textarea
                        rows={3}
                        value={taxConfig.notes ?? ""}
                        onChange={(e) =>
                          setTaxConfig((prev) => ({ ...prev, notes: e.target.value }))
                        }
                      />
                    </Field>
                  </div>
                  <Alert className="bg-muted">
                    <AlertDescription className="text-sm">
                      Upload supporting documents (GST registration, tax letters) in the next
                      step.
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-between gap-3">
                    <Button variant="outline" onClick={() => setCurrentStep("business")}>
                      Back
                    </Button>
                    <Button onClick={handleSaveTax} disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save & Continue
                    </Button>
                  </div>
                </SectionCard>
              )}

              {currentStep === "items" && (
                <SectionCard
                  title="Upload SKU List"
                  description="Provide the final item master with prices"
                >
                  <div className="space-y-4">
                    <Field label="Total SKUs in file">
                      <Input
                        type="number"
                        min={0}
                        value={skuStats.totalItems}
                        onChange={(e) => setSkuStats({ totalItems: e.target.value })}
                      />
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
                    <div className="flex justify-between gap-3">
                      <Button variant="outline" onClick={() => setCurrentStep("tax")}>Back</Button>
                      <Button onClick={() => setCurrentStep("receipt")}>Continue</Button>
                    </div>
                  </div>
                </SectionCard>
              )}

              {currentStep === "receipt" and   0  }
***
