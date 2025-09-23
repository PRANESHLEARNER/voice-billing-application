"use client"

import { useState, useEffect } from "react"

// Add Razorpay type declaration
declare global {
  interface Window {
    Razorpay: any
  }
}
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Smartphone, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { apiClient } from "@/lib/api"

interface RazorpayPaymentDialogProps {
  isOpen: boolean
  onClose: () => void
  amount: number
  paymentMethod: "card" | "upi"
  onSuccess: (paymentDetails: {
    paymentId: string
    orderId: string
    signature: string
    method: "card" | "upi"
  }) => void
  onError: (error: string) => void
}

interface RazorpayOrder {
  id: string
  amount: number
  currency: string
}

interface RazorpayResponse {
  razorpay_payment_id?: string
  razorpay_order_id?: string
  razorpay_signature?: string
}

export function RazorpayPaymentDialog({
  isOpen,
  onClose,
  amount,
  paymentMethod,
  onSuccess,
  onError,
}: RazorpayPaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)

  // Load Razorpay script dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.async = true
      script.onload = () => setRazorpayLoaded(true)
      script.onerror = () => {
        setError("Failed to load Razorpay. Please refresh the page and try again.")
      }
      document.body.appendChild(script)
    } else if (window.Razorpay) {
      setRazorpayLoaded(true)
    }

    return () => {
      // Cleanup script if component unmounts
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
      if (existingScript) {
        document.body.removeChild(existingScript)
      }
    }
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const createPaymentOrder = async (): Promise<RazorpayOrder> => {
    try {
      const response = await apiClient.createPaymentOrder({
        amount: Math.round(amount * 100), // Convert to paise
        currency: "INR",
        paymentMethod,
      })
      return response
    } catch (err) {
      throw new Error(`Failed to create payment order: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  const verifyPayment = async (paymentData: {
    paymentId: string
    orderId: string
    signature: string
  }) => {
    try {
      const response = await apiClient.verifyPayment(paymentData)
      return response
    } catch (err) {
      throw new Error(`Payment verification failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  const handleCardPayment = async () => {
    if (!razorpayLoaded) {
      setError("Razorpay is still loading. Please wait...")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const orderData = await createPaymentOrder()
      const razorpayOrderId = orderData.id
      console.log('🔍 Created Razorpay order:', { orderId: razorpayOrderId })
      
      // Validate that we have a valid order ID
      if (!razorpayOrderId || razorpayOrderId.trim() === '') {
        throw new Error('Failed to create valid Razorpay order: Order ID is empty')
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_1DP5mmOlF5G5ag",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SuperMarket Billing",
        description: "Payment for purchase",
        order_id: razorpayOrderId,
        prefill: {
          name: "Customer",
          email: "customer@example.com",
          contact: "9999999999",
        },
        theme: {
          color: "#3399cc",
        },
        modal: {
          amount_editable: false,
          ondismiss: () => {
            setIsLoading(false)
            onError("Payment was cancelled by user")
          },
        },
        handler: async (response: RazorpayResponse) => {
          console.log('🔍 Razorpay response received:', response)
          
          setIsProcessing(true)
          setError("")

          try {
            // Extract parameters safely with fallbacks
            const paymentId = response.razorpay_payment_id ? response.razorpay_payment_id.trim() : ''
            const orderId = (response.razorpay_order_id || razorpayOrderId || '') ? (response.razorpay_order_id || razorpayOrderId || '').trim() : ''
            const signature = (response.razorpay_signature || 'pending') ? (response.razorpay_signature || 'pending').trim() : 'pending'

            console.log('🔍 Extracted payment parameters:', {
              paymentId: paymentId ? `${paymentId.substring(0, 10)}...` : 'empty',
              orderId: orderId ? `${orderId.substring(0, 10)}...` : 'empty',
              signature: signature ? `${signature.substring(0, 10)}...` : 'empty',
              razorpayOrderId: razorpayOrderId ? `${razorpayOrderId.substring(0, 10)}...` : 'empty',
              responseOrderId: response.razorpay_order_id ? `${response.razorpay_order_id.substring(0, 10)}...` : 'missing'
            })

            // Validate parameters before verification
            if (!paymentId || !orderId) {
              throw new Error(`Invalid payment parameters: { orderId: "${orderId}", paymentId: "${paymentId}" }`)
            }

            const verificationResult = await verifyPayment({
              paymentId,
              orderId,
              signature,
            })

            console.log('✅ Payment verification successful:', verificationResult)

            onSuccess({
              paymentId,
              orderId,
              signature,
              method: "card",
            })
            
            onClose()
          } catch (err) {
            console.error('❌ Payment verification failed:', err)
            const errorMessage = err instanceof Error ? err.message : "Payment verification failed"
            setError(errorMessage)
            onError(errorMessage)
          } finally {
            setIsProcessing(false)
          }
        },
      }

      const razorpay = new (window as any).Razorpay(options)
      razorpay.open()
    } catch (err) {
      console.error('❌ Card payment failed:', err)
      const errorMessage = err instanceof Error ? err.message : "Card payment failed"
      setError(errorMessage)
      onError(errorMessage)
      setIsLoading(false)
    }
  }

  const handleUPIPayment = async () => {
    if (!razorpayLoaded) {
      setError("Razorpay is still loading. Please wait...")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const orderData = await createPaymentOrder()
      const razorpayOrderId = orderData.id
      console.log('🔍 Created Razorpay order:', { 
        orderId: razorpayOrderId, 
        fullOrderData: orderData,
        orderDataId: orderData?.id,
        orderDataExists: !!orderData
      })
      
      // Validate that we have a valid order ID
      if (!razorpayOrderId || razorpayOrderId.trim() === '') {
        throw new Error('Failed to create valid Razorpay order: Order ID is empty')
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_1DP5mmOlF5G5ag",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SuperMarket Billing",
        description: "Payment for purchase",
        order_id: razorpayOrderId,
        prefill: {
          contact: "9999999999",
          email: "customer@example.com",
        },
        theme: {
          color: "#3399cc",
        },
        config: {
          display: {
            hide: [
              {
                method: "card"
              },
              {
                method: "netbanking"
              },
              {
                method: "wallet"
              },
              {
                method: "emi"
              },
              {
                method: "paylater"
              }
            ]
          }
        },
        modal: {
          amount_editable: false,
          ondismiss: () => {
            setIsLoading(false)
            onError("UPI payment was cancelled by user")
          },
        },
        handler: async (response: RazorpayResponse) => {
          console.log('🔍 Razorpay UPI response received:', response)
          
          setIsProcessing(true)
          setError("")

          try {
            // Extract parameters safely with fallbacks
            const paymentId = response.razorpay_payment_id ? response.razorpay_payment_id.trim() : ''
            const orderId = (response.razorpay_order_id || razorpayOrderId || '') ? (response.razorpay_order_id || razorpayOrderId || '').trim() : ''
            const signature = (response.razorpay_signature || 'pending') ? (response.razorpay_signature || 'pending').trim() : 'pending'

            console.log('🔍 Extracted UPI payment parameters:', {
              paymentId: paymentId ? `${paymentId.substring(0, 10)}...` : 'empty',
              orderId: orderId ? `${orderId.substring(0, 10)}...` : 'empty',
              signature: signature ? `${signature.substring(0, 10)}...` : 'empty',
              rawResponse: response,
              razorpayOrderId: razorpayOrderId ? `${razorpayOrderId.substring(0, 10)}...` : 'empty',
              responseOrderId: response.razorpay_order_id ? `${response.razorpay_order_id.substring(0, 10)}...` : 'missing'
            })

            // Validate parameters before verification
            if (!paymentId || !orderId) {
              throw new Error(`Invalid UPI payment parameters: { orderId: "${orderId}", paymentId: "${paymentId}" }`)
            }

            const verificationResult = await verifyPayment({
              paymentId,
              orderId,
              signature,
            })

            console.log('✅ UPI payment verification successful:', verificationResult)

            onSuccess({
              paymentId,
              orderId,
              signature,
              method: "upi",
            })
            
            onClose()
          } catch (err) {
            console.error('❌ UPI payment verification failed:', err)
            const errorMessage = err instanceof Error ? err.message : "UPI payment verification failed"
            setError(errorMessage)
            onError(errorMessage)
          } finally {
            setIsProcessing(false)
          }
        },
      }

      const razorpay = new (window as any).Razorpay(options)
      razorpay.open()
    } catch (err) {
      console.error('❌ UPI payment failed:', err)
      const errorMessage = err instanceof Error ? err.message : "UPI payment failed"
      setError(errorMessage)
      onError(errorMessage)
      setIsLoading(false)
    }
  }

  const handlePayment = () => {
    if (paymentMethod === "card") {
      handleCardPayment()
    } else {
      handleUPIPayment()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {paymentMethod === "card" ? (
              <CreditCard className="h-5 w-5" />
            ) : (
              <Smartphone className="h-5 w-5" />
            )}
            {paymentMethod === "card" ? "Card Payment" : "UPI Payment"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-bold text-lg">{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <Badge variant={paymentMethod === "card" ? "default" : "secondary"}>
                    {paymentMethod === "card" ? "Card" : "UPI"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
              <span className="text-sm text-green-700">Processing payment...</span>
            </div>
          )}

          <Separator />

          {/* Payment Instructions */}
          <div className="space-y-2">
            <h4 className="font-medium">Payment Instructions:</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              {paymentMethod === "card" ? (
                <>
                  <p>• Click "Proceed to Payment" to open Razorpay checkout</p>
                  <p>• Enter your card details securely</p>
                  <p>• Complete the payment using OTP if required</p>
                  <p>• Wait for payment verification</p>
                </>
              ) : (
                <>
                  <p>• Click "Proceed to Payment" to open Razorpay checkout</p>
                  <p>• Select your preferred UPI app</p>
                  <p>• Approve the payment request in your UPI app</p>
                  <p>• Wait for payment verification</p>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading || isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isLoading || isProcessing || !razorpayLoaded}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                `Proceed to ${formatCurrency(amount)}`
              )}
            </Button>
          </div>

          {!razorpayLoaded && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
              <span className="text-sm text-yellow-700">Loading Razorpay...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
