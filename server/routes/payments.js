const express = require("express")
const router = express.Router()
const razorpayService = require("../services/razorpayService")
const { auth } = require("../middleware/auth")

/**
 * @route   POST /api/payments/create-order
 * @desc    Create a Razorpay payment order
 * @access  Private (authenticated users)
 */
router.post("/create-order", auth, async (req, res) => {
  try {
    const { amount, currency = "INR", paymentMethod = "card" } = req.body

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      })
    }

    if (!["card", "upi"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method. Must be 'card' or 'upi'",
      })
    }

    console.log('🔍 Creating payment order:', {
      amount,
      currency,
      paymentMethod,
      userId: req.user.id,
    })

    // Create Razorpay order
    const order = await razorpayService.createOrder(amount, currency, paymentMethod)

    res.json({
      success: true,
      message: "Payment order created successfully",
      data: order,
    })
  } catch (error) {
    console.error("❌ Create order error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment order",
    })
  }
})

/**
 * @route   POST /api/payments/verify
 * @desc    Verify Razorpay payment
 * @access  Private (authenticated users)
 */
router.post("/verify", auth, async (req, res) => {
  try {
    const { paymentId, orderId, signature } = req.body

    // Validate required parameters
    if (!paymentId || !orderId) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment verification parameters (orderId and paymentId are required)",
      })
    }

    console.log('🔍 Verifying payment:', {
      orderId,
      paymentId: paymentId ? `${paymentId.substring(0, 10)}...` : 'missing',
      signature: signature ? `${signature.substring(0, 10)}...` : 'missing',
      userId: req.user.id,
    })

    // Verify payment with Razorpay
    const verificationResult = await razorpayService.verifyPayment(orderId, paymentId, signature)

    res.json({
      success: true,
      message: "Payment verified successfully",
      data: verificationResult,
    })
  } catch (error) {
    console.error("❌ Payment verification error:", error)
    
    // Return appropriate error response
    res.status(400).json({
      success: false,
      message: error.message || "Payment verification failed",
    })
  }
})

/**
 * @route   GET /api/payments/test-credentials
 * @desc    Get test credentials for Razorpay (development only)
 * @access  Private (authenticated users)
 */
router.get("/test-credentials", auth, async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Test credentials not available in production",
      })
    }

    const credentials = razorpayService.getTestCredentials()

    res.json({
      success: true,
      message: "Test credentials retrieved",
      data: credentials,
    })
  } catch (error) {
    console.error("❌ Test credentials error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get test credentials",
    })
  }
})

/**
 * @route   GET /api/payments/payment/:paymentId
 * @desc    Get payment details by payment ID
 * @access  Private (authenticated users)
 */
router.get("/payment/:paymentId", auth, async (req, res) => {
  try {
    const { paymentId } = req.params

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      })
    }

    console.log('🔍 Fetching payment details:', {
      paymentId: paymentId ? `${paymentId.substring(0, 10)}...` : 'missing',
      userId: req.user.id,
    })

    const paymentDetails = await razorpayService.getPaymentDetails(paymentId)

    res.json({
      success: true,
      message: "Payment details retrieved",
      data: paymentDetails,
    })
  } catch (error) {
    console.error("❌ Get payment details error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get payment details",
    })
  }
})

/**
 * @route   GET /api/payments/order/:orderId
 * @desc    Get order details by order ID
 * @access  Private (authenticated users)
 */
router.get("/order/:orderId", auth, async (req, res) => {
  try {
    const { orderId } = req.params

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      })
    }

    console.log('🔍 Fetching order details:', {
      orderId: orderId ? `${orderId.substring(0, 10)}...` : 'missing',
      userId: req.user.id,
    })

    const orderDetails = await razorpayService.getOrderDetails(orderId)

    res.json({
      success: true,
      message: "Order details retrieved",
      data: orderDetails,
    })
  } catch (error) {
    console.error("❌ Get order details error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get order details",
    })
  }
})

/**
 * @route   POST /api/payments/refund
 * @desc    Process a refund (admin only)
 * @access  Private (admin users)
 */
router.post("/refund", auth, async (req, res) => {
  try {
    const { paymentId, amount, notes } = req.body

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      })
    }

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required for refunds",
      })
    }

    console.log('🔍 Processing refund:', {
      paymentId: paymentId ? `${paymentId.substring(0, 10)}...` : 'missing',
      amount,
      notes,
      adminId: req.user.id,
    })

    const refundResult = await razorpayService.processRefund(paymentId, amount, notes)

    res.json({
      success: true,
      message: "Refund processed successfully",
      data: refundResult,
    })
  } catch (error) {
    console.error("❌ Refund processing error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process refund",
    })
  }
})

module.exports = router
