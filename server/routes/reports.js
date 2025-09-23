const express = require("express")
const Bill = require("../models/Bill")
const Product = require("../models/Product")
const Shift = require("../models/Shift")
const { auth, adminAuth } = require("../middleware/auth")
const { sendLowStockNotification } = require("../services/emailService")

const router = express.Router()

// Sales Summary Report
router.get("/sales-summary", auth, async (req, res) => {
  try {
    const { startDate, endDate, period = "daily" } = req.query

    const matchStage = {
      status: "completed",
    }

    if (startDate || endDate) {
      matchStage.createdAt = {}
      if (startDate) matchStage.createdAt.$gte = new Date(startDate)
      if (endDate) matchStage.createdAt.$lte = new Date(endDate)
    }

    // Get date grouping format based on period
    let dateFormat
    switch (period) {
      case "hourly":
        dateFormat = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
          hour: { $hour: "$createdAt" },
        }
        break
      case "weekly":
        dateFormat = {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" },
        }
        break
      case "monthly":
        dateFormat = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        }
        break
      default: // daily
        dateFormat = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        }
    }

    const salesData = await Bill.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: dateFormat,
          totalSales: { $sum: "$grandTotal" },
          totalBills: { $count: {} },
          totalItems: { $sum: { $size: "$items" } },
          totalDiscount: { $sum: "$totalDiscount" },
          totalTax: { $sum: "$totalTax" },
          avgBillValue: { $avg: "$grandTotal" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
    ])

    // Get overall totals
    const totals = await Bill.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$grandTotal" },
          totalBills: { $count: {} },
          totalItems: { $sum: { $size: "$items" } },
          totalDiscount: { $sum: "$totalDiscount" },
          totalTax: { $sum: "$totalTax" },
          avgBillValue: { $avg: "$grandTotal" },
        },
      },
    ])

    res.json({
      salesData,
      totals: totals[0] || {
        totalSales: 0,
        totalBills: 0,
        totalItems: 0,
        totalDiscount: 0,
        totalTax: 0,
        avgBillValue: 0,
      },
    })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Top Products Report
router.get("/top-products", auth, async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query

    const matchStage = {
      status: "completed",
    }

    if (startDate || endDate) {
      matchStage.createdAt = {}
      if (startDate) matchStage.createdAt.$gte = new Date(startDate)
      if (endDate) matchStage.createdAt.$lte = new Date(endDate)
    }

    const topProducts = await Bill.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            productId: "$items.product",
            productName: "$items.productName",
            productCode: "$items.productCode",
          },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.totalAmount" },
          totalOrders: { $count: {} },
          avgPrice: { $avg: "$items.rate" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: Number.parseInt(limit) },
    ])

    res.json(topProducts)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Cashier Performance Report
router.get("/cashier-performance", auth, adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const matchStage = {
      status: "completed",
    }

    if (startDate || endDate) {
      matchStage.createdAt = {}
      if (startDate) matchStage.createdAt.$gte = new Date(startDate)
      if (endDate) matchStage.createdAt.$lte = new Date(endDate)
    }

    const cashierPerformance = await Bill.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            cashierId: "$cashier",
            cashierName: "$cashierName",
          },
          totalSales: { $sum: "$grandTotal" },
          totalBills: { $count: {} },
          totalItems: { $sum: { $size: "$items" } },
          avgBillValue: { $avg: "$grandTotal" },
          totalDiscount: { $sum: "$totalDiscount" },
        },
      },
      { $sort: { totalSales: -1 } },
    ])

    res.json(cashierPerformance)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Inventory Report
router.get("/inventory", auth, adminAuth, async (req, res) => {
  try {
    const { category, lowStock = false } = req.query

    // Get all active products with variants
    const matchStage = { isActive: true }
    if (category) matchStage.category = category
    
    const products = await Product.find(matchStage).sort({ name: 1 })
    
    // Process products to handle variants properly
    const processedProducts = []
    let totalInventoryValue = 0
    let lowStockCount = 0
    let outOfStockCount = 0
    
    for (const product of products) {
      const hasVariants = product.variants && product.variants.length > 0
      
      if (!hasVariants) {
        // Products without variants - treat as individual items
        const stockValue = product.stock * product.cost
        totalInventoryValue += stockValue
        
        // Apply new thresholds
        if (product.stock < 5) {
          outOfStockCount++
        } else if (product.stock < 20) {
          lowStockCount++
        }
        
        // Only include if not filtering by low stock, or if it meets low stock criteria
        if (lowStock !== "true" || product.stock < 20) {
          processedProducts.push({
            ...product.toObject(),
            stockValue,
            displayName: product.name,
            displayCode: product.code,
            isVariant: false
          })
        }
      } else {
        // Products with variants - treat each variant as separate item
        for (const variant of product.variants) {
          const stockValue = variant.stock * variant.cost
          totalInventoryValue += stockValue
          
          // Apply new thresholds to each variant
          if (variant.stock < 5) {
            outOfStockCount++
          } else if (variant.stock < 20) {
            lowStockCount++
          }
          
          // Only include if not filtering by low stock, or if it meets low stock criteria
          if (lowStock !== "true" || variant.stock < 20) {
            processedProducts.push({
              _id: variant._id || product._id,
              name: `${product.name} (${variant.size})`,
              code: variant.sku,
              category: product.category,
              stock: variant.stock,
              cost: variant.cost,
              price: variant.price,
              unit: product.unit,
              stockValue,
              displayName: `${product.name} (${variant.size})`,
              displayCode: variant.sku,
              isVariant: true,
              parentName: product.name,
              size: variant.size
            })
          }
        }
      }
    }
    
    // Sort by stock level (lowest first)
    processedProducts.sort((a, b) => a.stock - b.stock)

    res.json({
      products: processedProducts,
      summary: {
        totalProducts: processedProducts.length,
        inventoryValue: totalInventoryValue,
        lowStockCount,
        outOfStockCount,
      },
    })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Product Categories Performance Report
router.get("/categories-performance", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const matchStage = {
      status: "completed",
    }

    if (startDate || endDate) {
      matchStage.createdAt = {}
      if (startDate) matchStage.createdAt.$gte = new Date(startDate)
      if (endDate) matchStage.createdAt.$lte = new Date(endDate)
    }

    const categoryPerformance = await Bill.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.category",
          totalRevenue: { $sum: "$items.totalAmount" },
          totalQuantity: { $sum: "$items.quantity" },
          totalOrders: { $count: {} },
          avgOrderValue: { $avg: "$items.totalAmount" },
          uniqueProducts: { $addToSet: "$items.productName" },
        },
      },
      {
        $project: {
          category: "$_id",
          totalRevenue: 1,
          totalQuantity: 1,
          totalOrders: 1,
          avgOrderValue: 1,
          uniqueProductsCount: { $size: "$uniqueProducts" },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ])

    res.json(categoryPerformance)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Payment Methods Report
router.get("/payment-methods", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const matchStage = {
      status: "completed",
    }

    if (startDate || endDate) {
      matchStage.createdAt = {}
      if (startDate) matchStage.createdAt.$gte = new Date(startDate)
      if (endDate) matchStage.createdAt.$lte = new Date(endDate)
    }

    const paymentMethods = await Bill.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$paymentMethod",
          totalAmount: { $sum: "$grandTotal" },
          totalTransactions: { $count: {} },
          avgTransactionValue: { $avg: "$grandTotal" },
        },
      },
      { $sort: { totalAmount: -1 } },
    ])

    res.json(paymentMethods)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Send Low Stock Email
router.post("/send-low-stock-email", auth, adminAuth, async (req, res) => {
  try {
    // Get all active products with variants
    const products = await Product.find({ isActive: true }).sort({ name: 1 })
    
    // Collect all low stock products and variants
    const lowStockProducts = []
    
    for (const product of products) {
      const hasVariants = product.variants && product.variants.length > 0
      
      if (!hasVariants) {
        // Products without variants - check main product stock
        if (product.stock < 20 && product.stock >= 5) {
          lowStockProducts.push({
            _id: product._id,
            name: product.name,
            code: product.code,
            stock: product.stock,
            type: 'main',
            size: 'N/A',
            variants: []
          })
        }
      } else {
        // Products with variants - check each variant
        for (const variant of product.variants) {
          if (variant.stock < 20 && variant.stock >= 5) {
            lowStockProducts.push({
              _id: variant._id || product._id,
              name: `${product.name} (${variant.size})`,
              code: variant.sku,
              stock: variant.stock,
              type: 'variant',
              size: variant.size,
              parentCode: product.code,
              variants: []
            })
          }
        }
      }
    }
    
    if (lowStockProducts.length === 0) {
      return res.status(400).json({ 
        message: "No low stock products found", 
        count: 0 
      })
    }
    
    // Send email with low stock products
    await sendLowStockNotification(lowStockProducts)
    
    res.json({ 
      message: `Low stock email sent successfully for ${lowStockProducts.length} product${lowStockProducts.length > 1 ? 's' : ''}`,
      count: lowStockProducts.length,
      products: lowStockProducts.map(p => ({
        id: p._id,
        name: p.name,
        code: p.code,
        stock: p.stock
      }))
    })
  } catch (error) {
    console.error('Error sending low stock email:', error)
    res.status(500).json({ 
      message: "Failed to send low stock email", 
      error: error.message 
    })
  }
})

module.exports = router
