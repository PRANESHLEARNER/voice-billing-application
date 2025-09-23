"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShoppingCart, RefreshCw, FileText } from "lucide-react"
import { ProductSearch } from "./product-search"
import { BillingTable, type BillItem } from "./billing-table"
import { BillingSummary } from "./billing-summary"
import { PaymentSection } from "./payment-section"
import { CustomerInfo } from "./customer-info"
import { apiClient, type Product, type ProductVariant } from "@/lib/api"

export function POSBilling() {
  const [billItems, setBillItems] = useState<BillItem[]>([])
  const [customerInfo, setCustomerInfo] = useState({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

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

  const addProduct = async (product: Product, variant: ProductVariant) => {
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
        quantity: existingItem.quantity + 1,
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
        quantity: 1,
        rate: variant.price,
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
    setCustomerInfo({})
    setError("")
    setSuccess("")
  }

  const grandTotal = billItems.reduce((total, item) => total + item.totalAmount, 0)

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
          amount: paymentData.cashTendered || grandTotal
        })
      } else if (paymentData.paymentMethod === "card") {
        paymentBreakdown.push({
          method: "card",
          amount: grandTotal,
          details: paymentData.razorpayDetails ? {
            razorpayPaymentId: paymentData.razorpayDetails.paymentId,
            razorpayOrderId: paymentData.razorpayDetails.orderId,
            razorpaySignature: paymentData.razorpayDetails.signature
          } : undefined
        })
      } else if (paymentData.paymentMethod === "upi") {
        paymentBreakdown.push({
          method: "upi",
          amount: grandTotal,
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
      }

      const bill = await apiClient.createBill(billData)
      setSuccess(`Bill ${bill.billNumber} created successfully!`)
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
            <div className="flex-shrink-0">
              <div className="flex gap-3">
                <div className="flex-1">
                  <ProductSearch onProductSelect={addProduct} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearBill} disabled={billItems.length === 0}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Clear All
                  </Button>
                  <Button variant="outline" disabled={billItems.length === 0}>
                    <FileText className="mr-2 h-4 w-4" />
                    Hold Bill
                  </Button>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="flex-shrink-0">
              <CustomerInfo customerInfo={customerInfo} onCustomerInfoChange={setCustomerInfo} />
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
            {/* Fixed Top Section - Summary and Payment */}
            <div className="flex-shrink-0 p-4 space-y-4 border-b">
              {/* Billing Summary - Fixed */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Bill Summary</h3>
                <BillingSummary items={billItems} />
              </div>
              
              {/* Payment Section - Fixed */}
              {billItems.length > 0 && (
                <div className="space-y-2">
                  {/* <h3 className="text-sm font-semibold text-gray-700">Payment</h3> */}
                  <PaymentSection grandTotal={Math.round(grandTotal)} onPayment={handlePayment} isProcessing={isProcessing} />
                </div>
              )}
            </div>
            
            {/* Scrollable Content Area (if needed in future) */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Additional content can go here if needed */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
