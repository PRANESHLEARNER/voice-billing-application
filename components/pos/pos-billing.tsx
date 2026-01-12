"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, RefreshCw, FileText, Wallet, Gift, Star, Loader2, Check, Sparkles } from "lucide-react"
import { ProductSearch } from "./product-search"
import { BillingTable, type BillItem } from "./billing-table"
import { BillingSummary } from "./billing-summary"
import { PaymentSection } from "./payment-section"
import { CustomerInfo } from "./customer-info"
import { VoiceControls } from "./voice-controls"
import { LanguageSelector } from "@/components/ui/language-selector"
import { apiClient, type Product, type ProductVariant, type CustomerInfo as CustomerInfoType } from "@/lib/api"
import { featureFlags } from "@/lib/feature-flags"
import { parseVoiceCommand, type VoiceAction } from "@/lib/voice-parser"
import { useToast } from "@/hooks/use-toast"

const VOICE_CONFIDENCE_THRESHOLD = 0.55
const MAX_VOICE_SUGGESTIONS = 3
const AUTO_APPLY_SUGGESTION_SCORE = 0.65
const MIN_SUGGESTION_SCORE = 0.3
const MIN_REMOVE_MATCH_SCORE = 0.35

function normalizeVoiceText(value?: string) {
  if (!value) return ""
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function computeVoiceMatchScore(product: Product, variant: ProductVariant, normalizedTerms: string) {
  if (!normalizedTerms) return 0
  const termTokens = normalizedTerms.split(" ").filter(Boolean)
  if (termTokens.length === 0) return 0

  const candidates = [
    product.name,
    product.code,
    product.category,
    variant.size,
    variant.sku,
    variant.barcode,
  ]

  let bestScore = 0
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeVoiceText(candidate)
    if (!normalizedCandidate) continue

    if (normalizedCandidate === normalizedTerms) {
      bestScore = Math.max(bestScore, 1)
      continue
    }
    if (normalizedCandidate.includes(normalizedTerms) || normalizedTerms.includes(normalizedCandidate)) {
      bestScore = Math.max(bestScore, 0.85)
      continue
    }

    const overlap =
      termTokens.filter((token) => normalizedCandidate.includes(token)).length / termTokens.length
    if (overlap > 0) {
      bestScore = Math.max(bestScore, overlap * 0.8)
    }
  }

  return bestScore
}

function computeBillItemMatch(item: BillItem, normalizedTerms: string) {
  return computeVoiceMatchScore(item.product, item.variant, normalizedTerms)
}

interface VoiceSuggestion {
  id: string
  product: Product
  variant: ProductVariant
  quantity: number
  action: VoiceAction
  transcript: string
  score: number
}

export function POSBilling() {
  const { toast } = useToast()
  const [billItems, setBillItems] = useState<BillItem[]>([])
  const [customerInfo, setCustomerInfo] = useState<CustomerInfoType>({ name: '', phone: '' })
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [heldBills, setHeldBills] = useState<Array<{
    id: string
    billItems: BillItem[]
    customerInfo: CustomerInfoType
    heldAt: string
    grandTotal: number
  }>>([])
  const [loyaltyStatus, setLoyaltyStatus] = useState<{
    purchaseCount: number
    isEligible: boolean
    nextPurchaseForDiscount: number
  } | null>(null)
  const [isCheckingLoyalty, setIsCheckingLoyalty] = useState(false)
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string>("")
  const [voiceSuggestions, setVoiceSuggestions] = useState<VoiceSuggestion[]>([])
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false)
  const voiceEnabled = featureFlags.voiceBilling

  const calculateItemTotals = useCallback((item: Omit<BillItem, "amount" | "taxAmount" | "totalAmount">) => {
    const baseAmount = item.quantity * item.rate
    let discountAmount = 0
    
    if (item.discount) {
      if (item.discount.discountType === 'percentage') {
        discountAmount = baseAmount * (item.discount.discountValue / 100)
      } else {
        // Fixed amount discount
        discountAmount = Math.min(item.discount.discountValue * item.quantity, baseAmount)
      }
    }
    
    const discountedAmount = baseAmount - discountAmount
    const taxAmount = discountedAmount * (item.product.taxRate / 100)
    const totalAmount = discountedAmount + taxAmount

    return {
      ...item,
      amount: discountedAmount,
      taxAmount,
      totalAmount,
      discount: item.discount ? {
        ...item.discount,
        discountAmount
      } : undefined
    }
  }, [])

  const addProduct = async (
    product: Product,
    variant: ProductVariant,
    options: { quantity?: number; source?: "manual" | "voice" } = {}
  ) => {
    const quantityToAdd = Math.max(1, options.quantity ?? 1)
    const source = options.source ?? "manual"
    // Fetch applicable discounts for this product
    let bestDiscount = null
    try {
      console.log("🔍 Fetching discounts for product:", product._id, product.name, "variant:", variant.size)
      const discounts = await apiClient.getApplicableDiscounts(product._id)
      console.log("📦 Found discounts:", discounts)
      
      if (discounts && discounts.length > 0) {
        // Sort discounts by discount amount (highest first)
        const sortedDiscounts = discounts.sort((a, b) => {
          const discountA = a.type === 'percentage' ? (variant.price * a.value / 100) : Math.min(a.value, variant.price)
          const discountB = b.type === 'percentage' ? (variant.price * b.value / 100) : Math.min(b.value, variant.price)
          return discountB - discountA
        })
        
        bestDiscount = sortedDiscounts[0]
        console.log("🏆 Best discount selected:", bestDiscount)
      } else {
        console.log("❌ No applicable discounts found for product:", product.name)
      }
    } catch (error) {
      console.error("❌ Error fetching discounts:", error)
      // Continue without discount if there's an error
    }

    const existingItemIndex = billItems.findIndex((item) => item.product._id === product._id && item.variant.size === variant.size)

    if (existingItemIndex >= 0) {
      // Update existing item quantity - preserve existing discount
      const existingItem = billItems[existingItemIndex]
      const updatedItem = calculateItemTotals({
        ...existingItem,
        quantity: existingItem.quantity + quantityToAdd,
        // Keep the existing discount, don't fetch new one
        discount: existingItem.discount
      })

      setBillItems((prev) => prev.map((item, index) => (index === existingItemIndex ? updatedItem : item)))
    } else {
      // Add new item with discount if applicable
      const newItem = calculateItemTotals({
        id: `${product._id}-${variant.sku || variant.size}-${Date.now()}`,
        product,
        variant,
        quantity: quantityToAdd,
        rate: variant.price,
        source,
        discount: bestDiscount ? {
          discountId: bestDiscount._id,
          discountName: bestDiscount.name,
          discountType: bestDiscount.type,
          discountValue: bestDiscount.value,
          discountAmount: 0 // This will be calculated in calculateItemTotals
        } : undefined
      })

      setBillItems((prev) => [...prev, newItem])
    }
  }

  const updateItem = (id: string, updates: Partial<BillItem>) => {
    setBillItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, ...updates }
          return calculateItemTotals(updatedItem)
        }
        return item
      }),
    )
  }

  const removeItem = (id: string) => {
    setBillItems((prev) => prev.filter((item) => item.id !== id))
  }

  const clearBill = () => {
    setBillItems([])
    setCustomerInfo({ name: '', phone: '', email: '', address: '', gstNumber: '' })
    setError("")
    setSuccess("")
  }


  const grandTotal = billItems.reduce((total, item) => total + item.totalAmount, 0)
  
  // Calculate loyalty discount for display (consistent with backend)
  const calculations = billItems.reduce(
    (acc, item) => {
      const baseAmount = item.quantity * item.rate
      acc.subtotal += baseAmount
      acc.totalTax += item.taxAmount
      acc.totalDiscount += item.discount?.discountAmount || 0
      return acc
    },
    { subtotal: 0, totalTax: 0, totalDiscount: 0 },
  )
  
  const loyaltyDiscountAmount = loyaltyStatus?.isEligible 
    ? Math.round((calculations.subtotal + calculations.totalTax) * 0.02)
    : 0
  
  // Calculate final total exactly like backend: (subtotal + totalTax) - loyaltyDiscount
  const backendGrandTotal = (calculations.subtotal + calculations.totalTax) - loyaltyDiscountAmount
  const roundOff = Math.round(backendGrandTotal) - backendGrandTotal
  const finalGrandTotal = Math.round(backendGrandTotal)

  // Check loyalty status when customer phone changes
  const checkLoyaltyStatus = useCallback(async (phone: string) => {
    if (!phone || phone.trim() === '') {
      setLoyaltyStatus(null)
      return
    }

    setIsCheckingLoyalty(true)
    try {
      const status = await apiClient.getCustomerLoyaltyStatus(phone)
      setLoyaltyStatus(status)
      console.log('🎯 Loyalty status checked:', status)
    } catch (error) {
      console.error('❌ Error checking loyalty status:', error)
      setLoyaltyStatus(null)
    } finally {
      setIsCheckingLoyalty(false)
    }
  }, [])

  // Check loyalty status when customer phone changes
  useEffect(() => {
    if (customerInfo.phone && customerInfo.phone.trim() !== '') {
      const timeoutId = setTimeout(() => {
        checkLoyaltyStatus(customerInfo.phone)
      }, 500) // Debounce to avoid too many API calls

      return () => clearTimeout(timeoutId)
    } else {
      setLoyaltyStatus(null)
    }
  }, [customerInfo.phone, checkLoyaltyStatus])

  // Load held bills from localStorage on component mount
  useEffect(() => {
    const savedHeldBills = localStorage.getItem('heldBills')
    console.log('🔍 Loading held bills from localStorage:', savedHeldBills)
    if (savedHeldBills) {
      try {
        const parsed = JSON.parse(savedHeldBills)
        console.log('✅ Parsed held bills:', parsed)
        setHeldBills(parsed)
      } catch (error) {
        console.error('❌ Error parsing held bills:', error)
      }
    } else {
      console.log('ℹ️ No held bills found in localStorage')
    }
  }, [])

  // Save held bills to localStorage whenever they change
  useEffect(() => {
    console.log('💾 Saving held bills to localStorage:', heldBills)
    localStorage.setItem('heldBills', JSON.stringify(heldBills))
  }, [heldBills])

  // Hold current bill
  const holdBill = () => {
    if (billItems.length === 0) {
      setError('No items to hold')
      return
    }

    const heldBill = {
      id: Date.now().toString(),
      billItems: [...billItems],
      customerInfo: { ...customerInfo },
      heldAt: new Date().toISOString(),
      grandTotal: Math.round(finalGrandTotal)
    }

    console.log('📋 Holding bill:', heldBill)
    setHeldBills(prev => {
      const newHeldBills = [heldBill, ...prev]
      console.log('📝 Updated held bills:', newHeldBills)
      return newHeldBills
    })
    setSuccess(`Bill held successfully! (${billItems.length} items, ₹${heldBill.grandTotal.toLocaleString('en-IN')})`)
    clearBill()
  }

  // Retrieve held bill
  const retrieveHeldBill = (heldBillId: string) => {
    const heldBill = heldBills.find(bill => bill.id === heldBillId)
    if (!heldBill) {
      setError('Held bill not found')
      return
    }

    setBillItems(heldBill.billItems)
    setCustomerInfo(heldBill.customerInfo)
    setHeldBills(prev => prev.filter(bill => bill.id !== heldBillId))
    setSuccess(`Held bill retrieved! (${heldBill.billItems.length} items, ₹${heldBill.grandTotal.toLocaleString('en-IN')})`)
  }

  // Delete held bill
  const deleteHeldBill = (heldBillId: string) => {
    setHeldBills(prev => prev.filter(bill => bill.id !== heldBillId))
  }

  const tryRemoveVoiceItem = useCallback(
    (terms?: string): boolean => {
      if (!terms) return false
      const normalizedTerms = normalizeVoiceText(terms)
      if (!normalizedTerms) return false

      let bestMatch: { item: BillItem; score: number } | null = null
      for (const item of billItems) {
        const score = computeBillItemMatch(item, normalizedTerms)
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { item, score }
        }
      }

      if (bestMatch && bestMatch.score >= MIN_REMOVE_MATCH_SCORE) {
        removeItem(bestMatch.item.id)
        toast({
          title: "Voice removal",
          description: `${bestMatch.item.product.name} (${bestMatch.item.variant.size}) removed`,
        })
        return true
      }

      return false
    },
    [billItems, removeItem, toast],
  )

  const applyVoiceSuggestion = useCallback(
    async (suggestion: VoiceSuggestion, options: { skipSpinner?: boolean } = {}) => {
      if (!options.skipSpinner) {
        setIsVoiceProcessing(true)
      }

      try {
        if (suggestion.action === "add") {
          await addProduct(suggestion.product, suggestion.variant, {
            quantity: suggestion.quantity,
            source: "voice",
          })
          toast({
            title: "Voice item added",
            description: `${suggestion.quantity} × ${suggestion.product.name} (${suggestion.variant.size})`,
          })
        }
        setVoiceSuggestions((prev) => prev.filter((entry) => entry.id !== suggestion.id))
      } catch (err) {
        console.error("Voice suggestion apply failed", err)
        toast({
          title: "Voice action failed",
          description: "Unable to apply the suggested product. Please try again.",
          variant: "destructive",
        })
      } finally {
        if (!options.skipSpinner) {
          setIsVoiceProcessing(false)
        }
      }
    },
    [addProduct, toast],
  )

  const handleVoiceTranscript = useCallback(
    async (text: string, confidence: number) => {
      if (!voiceEnabled) return
      const trimmed = text.trim()
      if (!trimmed) return

      setLastVoiceCommand(trimmed)

      if (confidence < VOICE_CONFIDENCE_THRESHOLD) {
        toast({
          title: "Voice confidence low",
          description: "Could not confidently detect the product. Please speak again clearly.",
        })
        return
      }

      setIsVoiceProcessing(true)
      setVoiceSuggestions([])

      try {
        const parsed = parseVoiceCommand(trimmed)
        const quantity = Math.max(1, parsed.quantity ?? 1)

        if (parsed.action === "hold") {
          holdBill()
          toast({
            title: "Bill held",
            description: "Current bill moved to held bills via voice command.",
          })
          return
        }

        if (parsed.action === "clear") {
          if (billItems.length === 0) {
            toast({
              title: "Nothing to clear",
              description: "No items in the bill currently.",
            })
          } else {
            clearBill()
            toast({
              title: "Bill cleared",
              description: "All items removed from the bill via voice.",
            })
          }
          return
        }

        if (parsed.action === "remove") {
          const removed = tryRemoveVoiceItem(parsed.terms)
          if (!removed) {
            toast({
              title: "No matching item",
              description: "Could not match a billed item to remove.",
              variant: "destructive",
            })
          }
          return
        }

        const terms = parsed.terms
        if (!terms) {
          toast({
            title: "Product not detected",
            description: "Please include the product name in your voice command.",
          })
          return
        }

        const normalizedTerms = normalizeVoiceText(terms)
        if (!normalizedTerms) {
          toast({
            title: "Product not detected",
            description: "Please include the product name in your voice command.",
          })
          return
        }

        let products: Product[] = []
        try {
          products = await apiClient.getProducts({ search: terms, active: true })
        } catch (err) {
          console.error("Voice lookup failed", err)
        }

        if (products.length === 0) {
          try {
            const fallbackProduct = await apiClient.getProductByIdentifier(terms)
            if (fallbackProduct) {
              products = [fallbackProduct]
            }
          } catch {
            // ignore - fallback best effort
          }
        }

        const suggestions: VoiceSuggestion[] = []
        for (const product of products) {
          const variants: ProductVariant[] =
            product.variants && product.variants.length > 0
              ? product.variants
              : [
                  {
                    size: "Default",
                    price: product.basePrice ?? 0,
                    cost: product.baseCost ?? 0,
                    stock: 0,
                    sku: product.code,
                    isActive: true,
                  },
                ]

          for (const variant of variants) {
            if (variant.isActive === false) continue
            const matchScore = computeVoiceMatchScore(product, variant, normalizedTerms)
            if (matchScore <= 0) continue

            const combinedScore = Math.min(1, matchScore * 0.7 + confidence * 0.3)
            if (combinedScore < MIN_SUGGESTION_SCORE) continue

            suggestions.push({
              id: `${product._id}-${variant.sku || variant.size}-${Date.now()}-${Math.random()}`,
              product,
              variant,
              quantity,
              action: parsed.action,
              transcript: trimmed,
              score: combinedScore,
            })
          }
        }

        suggestions.sort((a, b) => b.score - a.score)
        const limitedSuggestions = suggestions.slice(0, MAX_VOICE_SUGGESTIONS)

        if (limitedSuggestions.length === 0) {
          toast({
            title: "No similar products",
            description: "Could not find products matching your voice command.",
          })
          return
        }

        setVoiceSuggestions(limitedSuggestions)

        const topSuggestion = limitedSuggestions[0]
        if (topSuggestion.score >= AUTO_APPLY_SUGGESTION_SCORE) {
          await applyVoiceSuggestion(topSuggestion, { skipSpinner: true })
          toast({
            title: "Voice match added",
            description: `${topSuggestion.quantity} × ${topSuggestion.product.name} added automatically.`,
          })
        } else {
          toast({
            title: "Voice suggestions ready",
            description: "Review the suggested products below and tap apply.",
          })
        }
      } catch (err) {
        console.error("Voice transcript handling failed", err)
        toast({
          title: "Voice processing failed",
          description: "Could not process the voice command. Please retry.",
          variant: "destructive",
        })
      } finally {
        setIsVoiceProcessing(false)
      }
    },
    [voiceEnabled, toast, holdBill, billItems, clearBill, tryRemoveVoiceItem, applyVoiceSuggestion],
  )

  const handlePayment = async (paymentData: {
    cashTendered?: number
    paymentMethod: "cash" | "card" | "upi" | "mixed"
    cardAmount?: number
    upiAmount?: number
    razorpayDetails?: {
      paymentId: string
      orderId: string
      signature: string
      method: "card" | "upi"
    }
  }) => {
    if (billItems.length === 0) {
      setError("No items in the bill")
      return
    }

    setIsProcessing(true)
    setError("")

    try {
      // Prepare payment details for the bill
      let paymentDetails: any = {}
      let paymentBreakdown: any[] = []
      
      if (paymentData.razorpayDetails) {
        paymentDetails = {
          razorpayPaymentId: paymentData.razorpayDetails.paymentId,
          razorpayOrderId: paymentData.razorpayDetails.orderId,
          razorpaySignature: paymentData.razorpayDetails.signature,
          paymentStatus: "completed"
        }
        
        if (paymentData.razorpayDetails.method === "card") {
          paymentDetails.cardType = "Credit Card"
        } else if (paymentData.razorpayDetails.method === "upi") {
          paymentDetails.upiId = "customer@upi"
        }
      }
      
      // Build payment breakdown
      if (paymentData.paymentMethod === "cash") {
        paymentBreakdown.push({
          method: "cash",
          amount: paymentData.cashTendered || finalGrandTotal
        })
      } else if (paymentData.paymentMethod === "card") {
        paymentBreakdown.push({
          method: "card",
          amount: finalGrandTotal,
          details: paymentData.razorpayDetails ? {
            razorpayPaymentId: paymentData.razorpayDetails.paymentId,
            razorpayOrderId: paymentData.razorpayDetails.orderId,
            razorpaySignature: paymentData.razorpayDetails.signature
          } : undefined
        })
      } else if (paymentData.paymentMethod === "upi") {
        paymentBreakdown.push({
          method: "upi",
          amount: finalGrandTotal,
          details: paymentData.razorpayDetails ? {
            razorpayPaymentId: paymentData.razorpayDetails.paymentId,
            razorpayOrderId: paymentData.razorpayDetails.orderId,
            razorpaySignature: paymentData.razorpayDetails.signature
          } : undefined
        })
      } else if (paymentData.paymentMethod === "mixed") {
        if (paymentData.cashTendered && paymentData.cashTendered > 0) {
          paymentBreakdown.push({
            method: "cash",
            amount: paymentData.cashTendered
          })
        }
        if (paymentData.cardAmount && paymentData.cardAmount > 0) {
          paymentBreakdown.push({
            method: "card",
            amount: paymentData.cardAmount,
            details: paymentData.razorpayDetails?.method === "card" ? {
              razorpayPaymentId: paymentData.razorpayDetails.paymentId,
              razorpayOrderId: paymentData.razorpayDetails.orderId,
              razorpaySignature: paymentData.razorpayDetails.signature
            } : undefined
          })
        }
        if (paymentData.upiAmount && paymentData.upiAmount > 0) {
          paymentBreakdown.push({
            method: "upi",
            amount: paymentData.upiAmount,
            details: paymentData.razorpayDetails?.method === "upi" ? {
              razorpayPaymentId: paymentData.razorpayDetails.paymentId,
              razorpayOrderId: paymentData.razorpayDetails.orderId,
              razorpaySignature: paymentData.razorpayDetails.signature
            } : undefined
          })
        }
      }

      const billData = {
        items: billItems.map((item) => ({
          product: item.product._id,
          size: item.variant.size,
          quantity: item.quantity,
          rate: item.rate,
          taxRate: item.product.taxRate,
          discount: item.discount ? {
            discountId: item.discount.discountId,
            discountName: item.discount.discountName,
            discountType: item.discount.discountType,
            discountValue: item.discount.discountValue,
            discountAmount: item.discount.discountAmount
          } : undefined
        })),
        customer: customerInfo,
        cashTendered: paymentData.cashTendered,
        paymentMethod: paymentData.paymentMethod,
        paymentDetails: Object.keys(paymentDetails).length > 0 ? paymentDetails : undefined,
        paymentBreakdown: paymentBreakdown.length > 0 ? paymentBreakdown : undefined,
        applyLoyaltyDiscount: loyaltyStatus?.isEligible || false
      }

      const bill = await apiClient.createBill(billData)
      
      // Send bill via email if customer email is provided
      if (customerInfo.email && customerInfo.email.trim() !== '') {
        try {
          await apiClient.sendBillByEmail(bill._id, customerInfo.email)
          let successMessage = `Bill ${bill.billNumber} created successfully and sent via email to ${customerInfo.email}!`
          if (loyaltyStatus?.isEligible) {
            successMessage += ` 🎉 2% Loyalty discount applied!`
          }
          setSuccess(successMessage)
        } catch (emailError) {
          console.error('Failed to send email:', emailError)
          // Still show success for bill creation, but note email failure
          let successMessage = `Bill ${bill.billNumber} created successfully! (Email delivery failed)`
          if (loyaltyStatus?.isEligible) {
            successMessage += ` 🎉 2% Loyalty discount applied!`
          }
          setSuccess(successMessage)
        }
      } else {
        let successMessage = `Bill ${bill.billNumber} created successfully!`
        if (loyaltyStatus?.isEligible) {
          successMessage += ` 🎉 2% Loyalty discount applied!`
        }
        setSuccess(successMessage)
      }
      
      clearBill()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bill")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="h-full bg-background overflow-hidden">
      {/* Main Container Card */}
      <Card className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        {/* <CardHeader className="flex-shrink-0 border-b">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            POS Billing System
          </CardTitle>
        </CardHeader> */}

        <CardContent className="flex-1 p-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Side - Main Workspace */}
          <div className="flex-1 flex flex-col p-6 space-y-6 min-w-0 overflow-hidden">
            {/* Alerts */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800 mb-4">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Product Search with Action Buttons */}
            <div className="flex-shrink-0 space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <ProductSearch onProductSelect={addProduct} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearBill} disabled={billItems.length === 0}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Clear All
                  </Button>
                  <Button variant="outline" onClick={holdBill} disabled={billItems.length === 0}>
                    <FileText className="mr-2 h-4 w-4" />
                    Hold Bill
                  </Button>
                </div>
                <div className="flex-shrink-0">
                  <LanguageSelector />
                </div>
              </div>

              {voiceEnabled && (
                <VoiceControls onTranscript={handleVoiceTranscript} />
              )}
              {voiceEnabled && lastVoiceCommand && (
                <div className="text-xs text-muted-foreground">
                  Last voice command: <span className="font-medium text-foreground">{lastVoiceCommand}</span>
                </div>
              )}
            </div>

            {/* Customer Information */}
            <div className="flex-shrink-0">
              <CustomerInfo 
                customerInfo={{
                  name: customerInfo.name || '',
                  phone: customerInfo.phone || '',
                  email: customerInfo.email,
                  address: customerInfo.address,
                  gstNumber: customerInfo.gstNumber
                }} 
                onCustomerInfoChange={(newInfo) => {
                  setCustomerInfo({
                    name: newInfo.name || '',
                    phone: newInfo.phone || '',
                    email: newInfo.email,
                    address: newInfo.address,
                    gstNumber: newInfo.gstNumber
                  })
                }} 
              />
              
              {/* Loyalty Status Indicator */}
              {isCheckingLoyalty && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-blue-700">Checking loyalty status...</span>
                  </div>
                </div>
              )}
              
              {loyaltyStatus && !isCheckingLoyalty && (
                <div className={`mt-2 p-3 rounded-lg border ${
                  loyaltyStatus.isEligible 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {loyaltyStatus.isEligible ? (
                      <>
                        <Gift className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-800">🎉 Loyalty Discount Available!</p>
                          <p className="text-xs text-green-700">2% discount will be applied on this purchase</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4 text-amber-600" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">Loyalty Status</p>
                          <p className="text-xs text-amber-700">
                            {loyaltyStatus.purchaseCount} purchases made • 
                            {loyaltyStatus.nextPurchaseForDiscount > 0 
                              ? `${loyaltyStatus.nextPurchaseForDiscount} more purchase${loyaltyStatus.nextPurchaseForDiscount > 1 ? 's' : ''} for 2% discount`
                              : 'Next purchase eligible for discount!'
                            }
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Items Billing Table - Scrollable */}
            <div className="flex-1 min-h-0">
              <Card className="h-full flex flex-col overflow-hidden">
                <CardHeader className="flex-shrink-0 pb-3">
                  <CardTitle className="text-lg">Items ({billItems.length})</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-muted/20 hover:scrollbar-thumb-muted-foreground">
                    <div className="p-4">
                      <BillingTable items={billItems} onUpdateItem={updateItem} onRemoveItem={removeItem} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Side - Fixed Sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0 border-l bg-muted/50 flex flex-col">
            {/* Fixed Top Section - Summary Card */}
            <div className="flex-shrink-0 p-4 border-b">
              <Card className="bg-gradient-to-br from-background to-muted/30 shadow-sm">
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Bill Summary
                    {billItems.length > 0 && (
                      <span className="ml-auto text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {billItems.length} items
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <BillingSummary items={billItems} loyaltyStatus={loyaltyStatus} />
                </CardContent>
              </Card>
            </div>
            
            {/* Fixed Payment Section Card */}
            {billItems.length > 0 && (
              <div className="flex-shrink-0 p-4 border-b">
                <Card className="bg-gradient-to-br from-background to-muted/30 shadow-sm">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Payment
                      <span className="ml-auto text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                        ₹{Math.round(finalGrandTotal).toLocaleString('en-IN')}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <PaymentSection grandTotal={Math.round(finalGrandTotal)} onPayment={handlePayment} isProcessing={isProcessing} />
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Scrollable Content Area (if needed in future) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Held Bills Section - Only show when no items and no payment section */}
              {billItems.length === 0 && (
                <Card className="bg-gradient-to-br from-background to-muted/30 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Held Bills
                      <span className="ml-auto text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {heldBills.length} held
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {heldBills.length > 0 ? (
                      heldBills.map((heldBill) => (
                        <div key={heldBill.id} className="p-3 border rounded-lg bg-background/50 hover:bg-background transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{heldBill.billItems.length} items</span>
                              <span className="text-sm text-muted-foreground">•</span>
                              <span className="text-sm font-semibold text-primary">₹{heldBill.grandTotal.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => retrieveHeldBill(heldBill.id)}
                                className="h-7 px-2 text-xs"
                              >
                                Retrieve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteHeldBill(heldBill.id)}
                                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                          {heldBill.customerInfo.name && (
                            <div className="text-xs text-muted-foreground">
                              Customer: {heldBill.customerInfo.name}
                              {heldBill.customerInfo.phone && ` • ${heldBill.customerInfo.phone}`}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            Held: {new Date(heldBill.heldAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No held bills yet</p>
                        <p className="text-xs mt-1">Add items to a bill and click "Hold Bill" to save it here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
