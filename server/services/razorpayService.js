const Razorpay = require("razorpay")
const crypto = require("crypto")

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_1DP5mmOlF5G5ag",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "your_test_secret",
})

class RazorpayService {
  /**
   * Create a Razorpay order
   * @param {number} amount - Amount in paise (smallest currency unit)
   * @param {string} currency - Currency code (default: INR)
   * @param {string} paymentMethod - Payment method type (card/upi)
   * @returns {Promise<Object>} Razorpay order object
   */
  async createOrder(amount, currency = "INR", paymentMethod = "card") {
    try {
      console.log('🔍 Creating Razorpay order:', { amount, currency, paymentMethod })

      const options = {
        amount: amount,
        currency: currency,
        receipt: `receipt_${Date.now()}`,
        payment_capture: 1, // Auto capture payment
        notes: {
          payment_method: paymentMethod,
          created_at: new Date().toISOString(),
        },
      }

      const order = await razorpay.orders.create(options)
      
      console.log('✅ Razorpay order created:', {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      })

      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
      }
    } catch (error) {
      console.error('❌ Razorpay order creation failed:', error)
      throw new Error(`Failed to create Razorpay order: ${error.message}`)
    }
  }

  /**
   * Verify Razorpay payment signature
   * @param {string} orderId - Razorpay order ID
   * @param {string} paymentId - Razorpay payment ID
   * @param {string} signature - Razorpay signature
   * @returns {Promise<Object>} Verification result
   */
  async verifyPayment(orderId, paymentId, signature) {
    try {
      console.log('🔍 Verifying Razorpay payment:', {
        orderId,
        paymentId: paymentId ? `${paymentId.substring(0, 10)}...` : 'missing',
        signature: signature ? `${signature.substring(0, 10)}...` : 'missing',
      })

      // If signature is missing or 'pending', verify payment directly from Razorpay
      if (!signature || signature === 'pending') {
        console.log('🔍 Signature missing, verifying payment directly from Razorpay...')
        return await this.verifyPaymentDirectly(orderId, paymentId)
      }

      // Generate signature for verification
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "your_test_secret")
        .update(`${orderId}|${paymentId}`)
        .digest("hex")

      console.log('🔍 Signature verification:', {
        received: signature ? `${signature.substring(0, 10)}...` : 'missing',
        generated: generatedSignature ? `${generatedSignature.substring(0, 10)}...` : 'missing',
        matches: generatedSignature === signature,
      })

      const isSignatureValid = generatedSignature === signature

      if (!isSignatureValid) {
        throw new Error("Invalid payment signature")
      }

      // Fetch payment details to confirm status
      const payment = await razorpay.payments.fetch(paymentId)
      
      if (payment.status !== "captured" && payment.status !== "authorized") {
        throw new Error(`Payment not successful. Status: ${payment.status}`)
      }

      // Verify that the payment belongs to the correct order
      if (payment.order_id !== orderId) {
        throw new Error("Payment order mismatch")
      }

      console.log('✅ Payment verification successful:', {
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
      })

      return {
        success: true,
        message: "Payment verified successfully",
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
      }
    } catch (error) {
      console.error('❌ Payment verification failed:', error)
      throw new Error(`Payment verification failed: ${error.message}`)
    }
  }

  /**
   * Verify payment directly from Razorpay API (fallback when signature is missing)
   * @param {string} orderId - Razorpay order ID
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Promise<Object>} Verification result
   */
  async verifyPaymentDirectly(orderId, paymentId) {
    try {
      console.log('🔍 Direct payment verification for:', {
        orderId,
        paymentId: paymentId ? `${paymentId.substring(0, 10)}...` : 'missing',
      })

      // Fetch payment details
      const payment = await razorpay.payments.fetch(paymentId)
      
      console.log('🔍 Payment details retrieved:', {
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
      })

      // Check payment status
      if (payment.status !== "captured" && payment.status !== "authorized") {
        throw new Error(`Payment not successful. Status: ${payment.status}`)
      }

      // Verify that the payment belongs to the correct order
      if (payment.order_id !== orderId) {
        throw new Error("Payment order mismatch")
      }

      console.log('✅ Direct payment verification successful:', {
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
      })

      return {
        success: true,
        message: "Payment verified successfully (direct verification)",
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
      }
    } catch (error) {
      console.error('❌ Direct payment verification failed:', error)
      throw new Error(`Direct payment verification failed: ${error.message}`)
    }
  }

  /**
   * Get payment details by payment ID
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Promise<Object>} Payment details
   */
  async getPaymentDetails(paymentId) {
    try {
      const payment = await razorpay.payments.fetch(paymentId)
      return payment
    } catch (error) {
      console.error('❌ Failed to fetch payment details:', error)
      throw new Error(`Failed to fetch payment details: ${error.message}`)
    }
  }

  /**
   * Get order details by order ID
   * @param {string} orderId - Razorpay order ID
   * @returns {Promise<Object>} Order details
   */
  async getOrderDetails(orderId) {
    try {
      const order = await razorpay.orders.fetch(orderId)
      return order
    } catch (error) {
      console.error('❌ Failed to fetch order details:', error)
      throw new Error(`Failed to fetch order details: ${error.message}`)
    }
  }

  /**
   * Process a refund
   * @param {string} paymentId - Razorpay payment ID
   * @param {number} amount - Refund amount in paise (optional, full refund if not provided)
   * @param {string} notes - Refund notes (optional)
   * @returns {Promise<Object>} Refund details
   */
  async processRefund(paymentId, amount, notes = "") {
    try {
      const refundOptions = {
        payment_id: paymentId,
        notes: {
          reason: notes || "Customer refund",
          processed_at: new Date().toISOString(),
        },
      }

      if (amount) {
        refundOptions.amount = amount
      }

      const refund = await razorpay.refunds.create(refundOptions)
      return refund
    } catch (error) {
      console.error('❌ Refund processing failed:', error)
      throw new Error(`Failed to process refund: ${error.message}`)
    }
  }

  /**
   * Get test credentials (for development/testing)
   * @returns {Object} Test credentials
   */
  getTestCredentials() {
    return {
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_1DP5mmOlF5G5ag",
      mode: process.env.NODE_ENV === "production" ? "live" : "test",
    }
  }
}

module.exports = new RazorpayService()
