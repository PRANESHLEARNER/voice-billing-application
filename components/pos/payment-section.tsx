"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Banknote, Loader2, CreditCard, Smartphone, Layers } from "lucide-react"
import { RazorpayPaymentDialog } from "@/components/pos/razorpay-payment-dialog"

interface PaymentSectionProps {
  grandTotal: number
  onPayment: (paymentData: {
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
  }) => Promise<void>
  isProcessing: boolean
}

export function PaymentSection({ grandTotal, onPayment, isProcessing }: PaymentSectionProps) {
  const [cashTendered, setCashTendered] = useState("")
  const [error, setError] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "mixed">("cash")
  const [cardAmount, setCardAmount] = useState("")
  const [upiAmount, setUpiAmount] = useState("")
  const [isRazorpayDialogOpen, setIsRazorpayDialogOpen] = useState(false)
  const [razorpayPaymentMethod, setRazorpayPaymentMethod] = useState<"card" | "upi">("card")
  const [razorpayAmount, setRazorpayAmount] = useState(0)
  const [paymentCompleted, setPaymentCompleted] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const cashAmount = Number.parseFloat(cashTendered) || 0
  const cardAmountNum = Number.parseFloat(cardAmount) || 0
  const upiAmountNum = Number.parseFloat(upiAmount) || 0
  const changeDue = Math.max(0, cashAmount - grandTotal)
  
  const totalPaid = cashAmount + cardAmountNum + upiAmountNum
  const remainingAmount = Math.max(0, grandTotal - totalPaid)

  const handleOpenRazorpayDialog = (method: "card" | "upi", amount: number) => {
    setRazorpayPaymentMethod(method)
    setRazorpayAmount(amount)
    setIsRazorpayDialogOpen(true)
  }

  const handleRazorpayPaymentSuccess = (paymentDetails: {
    paymentId: string
    orderId: string
    signature: string
    method: "card" | "upi"
  }) => {
    setIsRazorpayDialogOpen(false)
    
    if (paymentMethod === "mixed") {
      // For mixed payments, update the respective amount
      if (paymentDetails.method === "card") {
        setCardAmount(razorpayAmount.toString())
      } else {
        setUpiAmount(razorpayAmount.toString())
      }
    } else {
      // For single payment method, complete the payment automatically
      handleAutomaticBillCompletion(paymentDetails)
    }
  }

  const handleRazorpayPaymentError = (error: string) => {
    setIsRazorpayDialogOpen(false)
    setError(error)
  }

  const handleAutomaticBillCompletion = async (razorpayDetails?: {
    paymentId: string
    orderId: string
    signature: string
    method: "card" | "upi"
  }) => {
    try {
      let paymentData: any = {
        paymentMethod: razorpayDetails?.method || paymentMethod,
      }

      if (paymentMethod === "cash") {
        paymentData.cashTendered = cashAmount
      } else if (paymentMethod === "card") {
        paymentData.cardAmount = grandTotal
        paymentData.razorpayDetails = razorpayDetails
      } else if (paymentMethod === "upi") {
        paymentData.upiAmount = grandTotal
        paymentData.razorpayDetails = razorpayDetails
      } else if (paymentMethod === "mixed") {
        paymentData.cashTendered = cashAmount
        paymentData.cardAmount = cardAmountNum
        paymentData.upiAmount = upiAmountNum
        
        // Find the Razorpay payment details
        if (cardAmountNum > 0 && razorpayDetails?.method === "card") {
          paymentData.razorpayDetails = razorpayDetails
        } else if (upiAmountNum > 0 && razorpayDetails?.method === "upi") {
          paymentData.razorpayDetails = razorpayDetails
        }
      }

      await onPayment(paymentData)
      setPaymentCompleted(true)
      
      // Reset payment breakdown
      setCashTendered("")
      setCardAmount("")
      setUpiAmount("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed")
    }
  }

  const handlePayment = async () => {
    setError("")

    if (paymentMethod === "cash" && cashAmount < grandTotal) {
      setError("Cash tendered is less than the total amount")
      return
    }

    if (paymentMethod === "mixed" && totalPaid < grandTotal) {
      setError("Total payment is less than the grand total")
      return
    }

    try {
      await handleAutomaticBillCompletion()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed")
    }
  }

  const quickCashAmounts = [
    grandTotal,
    Math.ceil(grandTotal / 100) * 100,
    Math.ceil(grandTotal / 500) * 500,
    Math.ceil(grandTotal / 1000) * 1000,
  ].filter((amount, index, arr) => arr.indexOf(amount) === index && amount >= grandTotal)

  // Reset payment completed state when payment method or grand total changes
  useEffect(() => {
    setPaymentCompleted(false)
  }, [paymentMethod, grandTotal])

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Payment</h3>
        {/* Payment Method Selection */}
        <div className="grid grid-cols-4 gap-1 mt-2">
          <Button
            variant={paymentMethod === "cash" ? "default" : "outline"}
            size="sm"
            onClick={() => setPaymentMethod("cash")}
            className="flex flex-col items-center gap-1 p-2 h-auto min-h-[48px]"
          >
            <Banknote className="h-3 w-3" />
            <span className="text-xs font-medium">Cash</span>
          </Button>
          <Button
            variant={paymentMethod === "card" ? "default" : "outline"}
            size="sm"
            onClick={() => setPaymentMethod("card")}
            className="flex flex-col items-center gap-1 p-2 h-auto min-h-[48px]"
          >
            <CreditCard className="h-3 w-3" />
            <span className="text-xs font-medium">Card</span>
          </Button>
          <Button
            variant={paymentMethod === "upi" ? "default" : "outline"}
            size="sm"
            onClick={() => setPaymentMethod("upi")}
            className="flex flex-col items-center gap-1 p-2 h-auto min-h-[48px]"
          >
            <Smartphone className="h-3 w-3" />
            <span className="text-xs font-medium">UPI</span>
          </Button>
          <Button
            variant={paymentMethod === "mixed" ? "default" : "outline"}
            size="sm"
            onClick={() => setPaymentMethod("mixed")}
            className="flex flex-col items-center gap-1 p-2 h-auto min-h-[48px]"
          >
            <Layers className="h-3 w-3" />
            <span className="text-xs font-medium">Mixed</span>
          </Button>
        </div>
          <div className="flex justify-between text-sm font-bold">
            <span>Total Amount:</span>
            <span className="text-primary">{formatCurrency(grandTotal)}</span>
          </div>

          {/* Cash Payment Section */}
          {(paymentMethod === "cash" || paymentMethod === "mixed") && (
            <div className="space-y-1">
              <Label htmlFor="cashTendered" className="text-xs">Cash Tendered</Label>
              <Input
                id="cashTendered"
                type="number"
                step="0.01"
                min="0"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                placeholder="0.00"
                className="text-sm"
              />
            </div>
          )}

          {/* Card Payment Section */}
          {paymentMethod === "mixed" && (
            <Button
              onClick={() => handleOpenRazorpayDialog("card", remainingAmount)}
              disabled={isProcessing || remainingAmount <= 0}
              className="w-full h-8 text-sm"
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay Card - ${formatCurrency(remainingAmount)}`
              )}
            </Button>
          )}
          
          {paymentMethod === "card" && (
            <Button
              onClick={() => handleOpenRazorpayDialog("card", grandTotal)}
              disabled={isProcessing}
              className="w-full h-8 text-sm"
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ${formatCurrency(grandTotal)}`
              )}
            </Button>
          )}

          {/* UPI Payment Section */}
          {paymentMethod === "mixed" && (
            <Button
              onClick={() => handleOpenRazorpayDialog("upi", remainingAmount)}
              disabled={isProcessing || remainingAmount <= 0}
              className="w-full h-8 text-sm"
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay UPI - ${formatCurrency(remainingAmount)}`
              )}
            </Button>
          )}
          
          {paymentMethod === "upi" && (
            <Button
              onClick={() => handleOpenRazorpayDialog("upi", grandTotal)}
              disabled={isProcessing}
              className="w-full h-8 text-sm"
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ${formatCurrency(grandTotal)}`
              )}
            </Button>
          )}

          {/* Quick Cash Buttons - Only show for cash or mixed payments */}
          {(paymentMethod === "cash" || paymentMethod === "mixed") && (
            <div className="grid grid-cols-2 gap-1">
              {quickCashAmounts.slice(0, 4).map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setCashTendered(amount.toString())}
                  className="text-xs h-7"
                >
                  {formatCurrency(amount)}
                </Button>
              ))}
            </div>
          )}

          {/* Payment Breakdown */}
          {(cashAmount > 0 || cardAmountNum > 0 || upiAmountNum > 0) && (
            <>
              <Separator />
              <div className="space-y-1">
                {cashAmount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>Cash Tendered:</span>
                    <span className="font-medium">{formatCurrency(cashAmount)}</span>
                  </div>
                )}
                {cardAmountNum > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>Card Amount:</span>
                    <span className="font-medium">{formatCurrency(cardAmountNum)}</span>
                  </div>
                )}
                {upiAmountNum > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>UPI Amount:</span>
                    <span className="font-medium">{formatCurrency(upiAmountNum)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs">
                  <span>Total Paid:</span>
                  <span className="text-primary">{formatCurrency(totalPaid)}</span>
                </div>
                {paymentMethod === "cash" && cashAmount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>Change Due:</span>
                    <span className="font-medium text-green-600">{formatCurrency(changeDue)}</span>
                  </div>
                )}
                {paymentMethod === "mixed" && remainingAmount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>Remaining:</span>
                    <span className="font-medium text-orange-600">{formatCurrency(remainingAmount)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}

          {/* Complete Sale Button - Only show for cash or mixed payments */}
          {(paymentMethod === "cash" || paymentMethod === "mixed") && (
            <Button
              onClick={handlePayment}
              disabled={isProcessing || 
                (paymentMethod === "cash" && cashAmount < grandTotal) ||
                (paymentMethod === "mixed" && totalPaid < grandTotal)}
              className="w-full h-8 text-sm"
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Complete Sale - ${formatCurrency(grandTotal)}`
              )}
            </Button>
          )}
      </div>

      {/* Razorpay Payment Dialog */}
      <RazorpayPaymentDialog
        isOpen={isRazorpayDialogOpen}
        onClose={() => setIsRazorpayDialogOpen(false)}
        amount={razorpayAmount}
        paymentMethod={razorpayPaymentMethod}
        onSuccess={handleRazorpayPaymentSuccess}
        onError={handleRazorpayPaymentError}
      />
    </>
  )
}
