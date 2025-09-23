const mongoose = require("mongoose")

const variantSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  cost: {
    type: Number,
    required: true,
    min: 0,
  },
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  barcode: {
    type: String,
    sparse: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  _id: true,
  timestamps: false,
})

const productSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
    },
    category: {
      type: String,
      required: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    baseCost: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      default: "pcs",
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    variants: [variantSchema],
  },
  {
    timestamps: true,
  },
)

// Pre-save hook for immediate stock notifications
productSchema.pre('save', async function(next) {
  try {
    // Only trigger for existing documents (not new ones)
    if (this.isNew) {
      return next();
    }
    
    // Check if stock has changed
    if (this.isModified('stock') || this.isModified('variants')) {
      const { triggerStockChangeCheck } = require('../services/immediateStockNotifier');
      
      // Trigger immediate stock change check
      setTimeout(async () => {
        try {
          await triggerStockChangeCheck();
        } catch (error) {
          console.error('❌ Error in immediate stock notification hook:', error);
        }
      }, 100); // Small delay to ensure save completes
    }
    
    next();
  } catch (error) {
    console.error('❌ Error in pre-save hook:', error);
    next();
  }
});

// Static method to find existing product or create new one
productSchema.statics.findOrCreateProduct = async function(productData) {
  const { name, variants, code, barcode } = productData;
  
  // Try to find existing product by code or barcode first
  let existingProduct = await this.findOne({
    $or: [
      { code: code?.toUpperCase() },
      { barcode }
    ]
  });
  
  // If not found by code/barcode, try to find by name (for restocking)
  if (!existingProduct && name) {
    existingProduct = await this.findOne({ name });
  }
  
  if (existingProduct) {
    // Product exists - update variants if provided
    if (variants && variants.length > 0) {
      variants.forEach(variantData => {
        const existingVariantIndex = existingProduct.variants.findIndex(
          v => v.size === variantData.size || v.sku === variantData.sku
        );
        
        if (existingVariantIndex >= 0) {
          // Update existing variant
          const existingVariant = existingProduct.variants[existingVariantIndex];
          existingVariant.stock += variantData.stock || 0;
          existingVariant.price = variantData.price || existingVariant.price;
          existingVariant.cost = variantData.cost || existingVariant.cost;
          existingVariant.isActive = true;
        } else {
          // Add new variant
          existingProduct.variants.push(variantData);
        }
      });
      
      await existingProduct.save();
      return {
        product: existingProduct,
        action: 'variants_updated',
        message: 'Product variants updated successfully'
      };
    } else {
      // Product already exists
      return {
        product: existingProduct,
        action: 'exists',
        message: 'Product already exists'
      };
    }
  } else {
    // Create new product with variants
    const newProduct = new this(productData);
    await newProduct.save();
    return {
      product: newProduct,
      action: 'created',
      message: 'Product created successfully'
    };
  }
};

// Static method to check for duplicate products
productSchema.statics.findDuplicateProducts = async function(name, size = null) {
  const searchQuery = { name };
  
  if (size) {
    searchQuery['variants.size'] = size;
  }
  
  return await this.find(searchQuery).select('name variants code barcode');
};

// Static method to find product by SKU
productSchema.statics.findBySKU = async function(sku) {
  return await this.findOne({ 'variants.sku': sku.toUpperCase() });
};

// Static method to get all active variants across all products
productSchema.statics.getAllActiveVariants = async function() {
  return await this.find({ 
    isActive: true,
    'variants.isActive': true 
  }).populate('variants');
};

module.exports = mongoose.model("Product", productSchema)
