const mongoose = require("mongoose")

const discountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["percentage", "fixed"],
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    targetType: {
      type: String,
      required: true,
      enum: ["all", "category", "product"],
    },
    targetCategory: {
      type: String,
      trim: true,
    },
    targetProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    minPurchaseAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
    },
    usageLimit: {
      type: Number,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for better query performance
discountSchema.index({ targetType: 1, targetCategory: 1 })
discountSchema.index({ targetType: 1, targetProduct: 1 })
discountSchema.index({ isActive: 1, startDate: 1, endDate: 1 })

// Virtual for checking if discount is currently valid
discountSchema.virtual("isValid").get(function () {
  const now = new Date()
  return this.isActive && now >= this.startDate && now <= this.endDate
})

// Virtual for checking if discount has usage limit remaining
discountSchema.virtual("hasUsageLimitRemaining").get(function () {
  return !this.usageLimit || this.usedCount < this.usageLimit
})

// Method to check if discount applies to a specific product
discountSchema.methods.appliesToProduct = function (product) {
  if (!this.isValid || !this.hasUsageLimitRemaining) {
    return false
  }

  switch (this.targetType) {
    case "all":
      return true
    case "category":
      return product.category === this.targetCategory
    case "product":
      return product._id.toString() === this.targetProduct.toString()
    default:
      return false
  }
}

// Method to calculate discount amount for a product
discountSchema.methods.calculateDiscount = function (product, quantity) {
  if (!this.appliesToProduct(product)) {
    return 0
  }

  const itemTotal = product.price * quantity

  // Check minimum purchase amount
  if (itemTotal < this.minPurchaseAmount) {
    return 0
  }

  let discountAmount = 0

  if (this.type === "percentage") {
    discountAmount = (itemTotal * this.value) / 100
  } else if (this.type === "fixed") {
    discountAmount = this.value
  }

  // Apply maximum discount limit if specified
  if (this.maxDiscountAmount && discountAmount > this.maxDiscountAmount) {
    discountAmount = this.maxDiscountAmount
  }

  return Math.max(0, discountAmount)
}

// Static method to find applicable discounts for a product
discountSchema.statics.findApplicableDiscounts = async function (product) {
  try {
    const now = new Date()
    
    // First, get all discounts that match basic criteria
    const baseQuery = {
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { targetType: "all" },
        { targetType: "category", targetCategory: product.category },
        { targetType: "product", targetProduct: product._id },
      ],
    }
    
    console.log("Applicable discounts query:", JSON.stringify(baseQuery, null, 2))
    
    // Get all matching discounts
    const discounts = await this.find(baseQuery).populate("targetProduct")
    console.log("Base query executed successfully, found", discounts.length, "discounts")
    
    // Filter out discounts that have reached their usage limit
    const applicableDiscounts = discounts.filter(discount => {
      if (!discount.usageLimit) {
        return true // No usage limit, so it's applicable
      }
      return (discount.usedCount || 0) < discount.usageLimit
    })
    
    console.log("After usage limit filtering, found", applicableDiscounts.length, "applicable discounts")
    
    return applicableDiscounts
  } catch (error) {
    console.error("Error in findApplicableDiscounts:", error)
    console.error("Error stack:", error.stack)
    // Return empty array instead of throwing error to prevent POS from breaking
    return []
  }
}

// Static method to find best discount for a product (takes product object)
discountSchema.statics.findBestDiscount = async function (product, quantity = 1) {
  const applicableDiscounts = await this.findApplicableDiscounts(product)
  
  if (applicableDiscounts.length === 0) {
    return null
  }

  let bestDiscount = null
  let maxDiscountAmount = 0

  for (const discount of applicableDiscounts) {
    const discountAmount = discount.calculateDiscount(product, quantity)
    if (discountAmount > maxDiscountAmount) {
      maxDiscountAmount = discountAmount
      bestDiscount = {
        discount,
        discountAmount,
      }
    }
  }

  return bestDiscount
}

// Static method to find best discount for a product by ID (takes product ID)
discountSchema.statics.findBestDiscountForProduct = async function (productId, quantity = 1) {
  const Product = require("./Product")
  
  // Find the product by ID
  const product = await Product.findById(productId)
  if (!product) {
    return null
  }
  
  // Use the existing findBestDiscount method
  return await this.findBestDiscount(product, quantity)
}

// Static method to record discount usage
discountSchema.statics.recordUsage = async function (discountId, usageCount = 1) {
  return await this.findByIdAndUpdate(
    discountId,
    { $inc: { usedCount: usageCount } },
    { new: true }
  )
}

// Pre-save validation
// Only run validation when relevant fields are modified, not for simple status toggles
discountSchema.pre("save", function (next) {
  // Skip validation if only isActive field is being modified
  const modifiedFields = this.modifiedPaths()
  const isOnlyStatusChange = modifiedFields.length === 1 && modifiedFields.includes("isActive")
  
  if (isOnlyStatusChange) {
    return next()
  }
  
  // Validate that targetCategory is provided when targetType is "category"
  if (this.targetType === "category" && !this.targetCategory) {
    this.invalidate("targetCategory", "Target category is required when target type is 'category'")
  }

  // Validate that targetProduct is provided when targetType is "product"
  if (this.targetType === "product" && !this.targetProduct) {
    this.invalidate("targetProduct", "Target product is required when target type is 'product'")
  }

  // Validate that endDate is after startDate
  if (this.endDate <= this.startDate) {
    this.invalidate("endDate", "End date must be after start date")
  }

  // Validate percentage discounts
  if (this.type === "percentage" && this.value > 100) {
    this.invalidate("value", "Percentage discount cannot exceed 100%")
  }

  next()
})

module.exports = mongoose.model("Discount", discountSchema)
