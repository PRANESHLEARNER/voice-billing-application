const Product = require('../models/Product');
const { sendLowStockNotification, sendOutOfStockNotification, sendRestockNotification } = require('./emailService');
const { shouldSendNotification, updateLastNotificationTime } = require('./notificationTracker');

// Track previously low/out of stock products for restock detection
const previouslyLowStock = new Set();
const previouslyOutOfStock = new Set();

// Monitor stock levels and send notifications
const monitorStockLevels = async () => {
  try {
    console.log('🔍 Starting stock level monitoring...');
    
    // Get all active products
    const products = await Product.find({ isActive: true });
    
    const lowStockProducts = [];
    const outOfStockProducts = [];
    const restockedProducts = [];
    
    // Current low/out of stock products for this run
    const currentLowStock = new Set();
    const currentOutOfStock = new Set();
    
    // Treat each variant as a separate product for stock monitoring
    for (const product of products) {
      const hasVariants = product.variants && product.variants.length > 0;
      
      if (!hasVariants) {
        // For products without variants, treat as individual product
        if (product.stock < 5) {
          outOfStockProducts.push({
            _id: product._id,
            name: product.name,
            code: product.code,
            stock: product.stock,
            type: 'main',
            size: 'N/A',
            variants: []
          });
          currentOutOfStock.add(product._id.toString());
          console.log(`🚨 Out of Stock: ${product.name} (Code: ${product.code}) - Stock: ${product.stock}`);
        } else if (product.stock < 20) {
          lowStockProducts.push({
            _id: product._id,
            name: product.name,
            code: product.code,
            stock: product.stock,
            type: 'main',
            size: 'N/A',
            variants: []
          });
          currentLowStock.add(product._id.toString());
          console.log(`⚠️ Low Stock: ${product.name} (Code: ${product.code}) - Stock: ${product.stock}`);
        }
      } else {
        // For products with variants, treat each variant as a separate product
        for (const variant of product.variants) {
          // Each variant is evaluated independently as its own "product"
          if (variant.stock < 5) {
            outOfStockProducts.push({
              _id: variant._id || product._id,
              name: `${product.name} (${variant.size})`, // Treat variant as separate product name
              code: variant.sku,
              stock: variant.stock,
              type: 'variant',
              size: variant.size,
              parentCode: product.code,
              variants: [] // No sub-variants
            });
            currentOutOfStock.add((variant._id || product._id).toString());
            console.log(`🚨 Out of Stock: ${product.name} (${variant.size}) (SKU: ${variant.sku}) - Stock: ${variant.stock}`);
          } else if (variant.stock < 20) {
            lowStockProducts.push({
              _id: variant._id || product._id,
              name: `${product.name} (${variant.size})`, // Treat variant as separate product name
              code: variant.sku,
              stock: variant.stock,
              type: 'variant',
              size: variant.size,
              parentCode: product.code,
              variants: [] // No sub-variants
            });
            currentLowStock.add((variant._id || product._id).toString());
            console.log(`⚠️ Low Stock: ${product.name} (${variant.size}) (SKU: ${variant.sku}) - Stock: ${variant.stock}`);
          }
        }
      }
    }
    
    // Check for restocked products
    // Check products that were previously out of stock but now have stock
    for (const productId of previouslyOutOfStock) {
      if (!currentOutOfStock.has(productId)) {
        // Find the product that was restocked
        const restockedProduct = products.find(p => 
          p._id.toString() === productId || 
          (p.variants && p.variants.some(v => (v._id || p._id).toString() === productId))
        );
        
        if (restockedProduct) {
          const isVariant = restockedProduct.variants && restockedProduct.variants.some(v => (v._id || restockedProduct._id).toString() === productId);
          const variant = isVariant ? restockedProduct.variants.find(v => (v._id || restockedProduct._id).toString() === productId) : null;
          
          restockedProducts.push({
            _id: productId,
            name: isVariant ? `${restockedProduct.name} (${variant.size})` : restockedProduct.name, // Treat variant as separate product name
            code: isVariant ? variant.sku : restockedProduct.code,
            stock: isVariant ? variant.stock : restockedProduct.stock,
            type: isVariant ? 'variant' : 'main',
            size: isVariant ? variant.size : 'N/A',
            parentCode: isVariant ? restockedProduct.code : null,
            variants: isVariant ? [] : restockedProduct.variants || []
          });
          
          console.log(`✅ Restocked: ${isVariant ? `${restockedProduct.name} (${variant.size})` : restockedProduct.name}`);
        }
      }
    }
    
    // Check products that were previously low stock but now have sufficient stock
    for (const productId of previouslyLowStock) {
      if (!currentLowStock.has(productId) && !currentOutOfStock.has(productId)) {
        // Find the product that was restocked
        const restockedProduct = products.find(p => 
          p._id.toString() === productId || 
          (p.variants && p.variants.some(v => (v._id || p._id).toString() === productId))
        );
        
        if (restockedProduct) {
          const isVariant = restockedProduct.variants && restockedProduct.variants.some(v => (v._id || restockedProduct._id).toString() === productId);
          const variant = isVariant ? restockedProduct.variants.find(v => (v._id || restockedProduct._id).toString() === productId) : null;
          
          // Check if this product is already in restockedProducts (to avoid duplicates)
          const alreadyAdded = restockedProducts.some(p => p._id.toString() === productId);
          
          if (!alreadyAdded) {
            restockedProducts.push({
              _id: productId,
              name: isVariant ? `${restockedProduct.name} (${variant.size})` : restockedProduct.name, // Treat variant as separate product name
              code: isVariant ? variant.sku : restockedProduct.code,
              stock: isVariant ? variant.stock : restockedProduct.stock,
              type: isVariant ? 'variant' : 'main',
              size: isVariant ? variant.size : 'N/A',
              parentCode: isVariant ? restockedProduct.code : null,
              variants: isVariant ? [] : restockedProduct.variants || []
            });
            
            console.log(`✅ Restocked: ${isVariant ? `${restockedProduct.name} (${variant.size})` : restockedProduct.name}`);
          }
        }
      }
    }
    
    // Update previously low/out of stock sets for next run
    previouslyLowStock.clear();
    previouslyOutOfStock.clear();
    
    currentLowStock.forEach(id => previouslyLowStock.add(id));
    currentOutOfStock.forEach(id => previouslyOutOfStock.add(id));
    
    // Send notifications for out of stock products
    if (outOfStockProducts.length > 0) {
      const productsToNotify = outOfStockProducts.filter(product => 
        shouldSendNotification(product._id.toString(), 'outOfStock')
      );
      
      if (productsToNotify.length > 0) {
        console.log(`📧 Sending out of stock notification for ${productsToNotify.length} products...`);
        await sendOutOfStockNotification(productsToNotify);
        console.log('✅ Out of stock notification sent successfully via Email');
        
        // Update notification times
        productsToNotify.forEach(product => {
          updateLastNotificationTime(product._id.toString(), 'outOfStock');
        });
      } else {
        console.log(`📧 Out of stock notifications already sent recently for ${outOfStockProducts.length} products`);
      }
    }
    
    // Send notifications for low stock products
    if (lowStockProducts.length > 0) {
      const productsToNotify = lowStockProducts.filter(product => 
        shouldSendNotification(product._id.toString(), 'lowStock')
      );
      
      if (productsToNotify.length > 0) {
        console.log(`📧 Sending low stock notification for ${productsToNotify.length} products...`);
        await sendLowStockNotification(productsToNotify);
        console.log('✅ Low stock notification sent successfully via Email');
        
        // Update notification times
        productsToNotify.forEach(product => {
          updateLastNotificationTime(product._id.toString(), 'lowStock');
        });
      } else {
        console.log(`📧 Low stock notifications already sent recently for ${lowStockProducts.length} products`);
      }
    }
    
    // Send notifications for restocked products
    if (restockedProducts.length > 0) {
      const productsToNotify = restockedProducts.filter(product => 
        shouldSendNotification(product._id.toString(), 'restock')
      );
      
      if (productsToNotify.length > 0) {
        console.log(`📧 Sending restock notification for ${productsToNotify.length} products...`);
        await sendRestockNotification(productsToNotify);
        
        // Update notification times
        productsToNotify.forEach(product => {
          updateLastNotificationTime(product._id.toString(), 'restock');
        });
      } else {
        console.log(`📧 Restock notifications already sent recently for ${restockedProducts.length} products`);
      }
    }
    
    if (outOfStockProducts.length === 0 && lowStockProducts.length === 0 && restockedProducts.length === 0) {
      console.log('✅ All products have sufficient stock levels');
    } else if (restockedProducts.length > 0) {
      console.log(`✅ ${restockedProducts.length} products have been restocked`);
    }
    
    return {
      outOfStock: outOfStockProducts.length,
      lowStock: lowStockProducts.length,
      restocked: restockedProducts.length,
      totalProducts: products.length
    };
    
  } catch (error) {
    console.error('❌ Error monitoring stock levels:', error);
    throw error;
  }
};

// Check stock for a specific product (useful after stock updates)
const checkProductStock = async (productId) => {
  try {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return null;
    }
    
    const hasVariants = product.variants && product.variants.length > 0;
    
    if (!hasVariants) {
      // For products without variants
      if (product.stock < 5) {
        if (shouldSendNotification(productId, 'outOfStock')) {
          console.log(`🚨 Product out of stock: ${product.name} (Code: ${product.code}) - Stock: ${product.stock}`);
          await sendOutOfStockNotification([{
            _id: product._id,
            name: product.name,
            code: product.code,
            stock: product.stock,
            type: 'main',
            size: 'N/A',
            variants: []
          }]);
          updateLastNotificationTime(productId, 'outOfStock');
          return { status: 'outOfStock', notified: true };
        }
        return { status: 'outOfStock', notified: false };
      }
      
      if (product.stock < 20) {
        if (shouldSendNotification(productId, 'lowStock')) {
          console.log(`⚠️ Product low stock: ${product.name} (Code: ${product.code}) - Stock: ${product.stock}`);
          await sendLowStockNotification([{
            _id: product._id,
            name: product.name,
            code: product.code,
            stock: product.stock,
            type: 'main',
            size: 'N/A',
            variants: []
          }]);
          updateLastNotificationTime(productId, 'lowStock');
          return { status: 'lowStock', notified: true };
        }
        return { status: 'lowStock', notified: false };
      }
    } else {
      // For products with variants, check each variant individually
      let hasLowStockVariant = false;
      let hasOutOfStockVariant = false;
      
      for (const variant of product.variants) {
        const variantId = (variant._id || product._id).toString();
        
        if (variant.stock < 5) {
          hasOutOfStockVariant = true;
          if (shouldSendNotification(variantId, 'outOfStock')) {
            console.log(`🚨 Product out of stock: ${product.name} (${variant.size}) (SKU: ${variant.sku}) - Stock: ${variant.stock}`);
            await sendOutOfStockNotification([{
              _id: variant._id || product._id,
              name: `${product.name} (${variant.size})`,
              code: variant.sku,
              stock: variant.stock,
              type: 'variant',
              size: variant.size,
              parentCode: product.code,
              variants: []
            }]);
            updateLastNotificationTime(variantId, 'outOfStock');
          }
        } else if (variant.stock < 20) {
          hasLowStockVariant = true;
          if (shouldSendNotification(variantId, 'lowStock')) {
            console.log(`⚠️ Product low stock: ${product.name} (${variant.size}) (SKU: ${variant.sku}) - Stock: ${variant.stock}`);
            await sendLowStockNotification([{
              _id: variant._id || product._id,
              name: `${product.name} (${variant.size})`,
              code: variant.sku,
              stock: variant.stock,
              type: 'variant',
              size: variant.size,
              parentCode: product.code,
              variants: []
            }]);
            updateLastNotificationTime(variantId, 'lowStock');
          }
        }
      }
      
      if (hasOutOfStockVariant) {
        return { status: 'outOfStock', notified: true };
      }
      if (hasLowStockVariant) {
        return { status: 'lowStock', notified: true };
      }
    }
    
    return { status: 'sufficient', notified: false };
    
  } catch (error) {
    console.error('❌ Error checking product stock:', error);
    throw error;
  }
};

// Get stock status summary
const getStockStatusSummary = async () => {
  try {
    const products = await Product.find({ isActive: true });
    
    const summary = {
      totalProducts: products.length,
      outOfStock: 0,
      lowStock: 0,
      sufficientStock: 0,
      outOfStockProducts: [],
      lowStockProducts: []
    };
    
    products.forEach(product => {
      if (product.stock === 0) {
        summary.outOfStock++;
        summary.outOfStockProducts.push({
          name: product.name,
          code: product.code,
          stock: product.stock
        });
      } else if (product.stock < 10) {
        summary.lowStock++;
        summary.lowStockProducts.push({
          name: product.name,
          code: product.code,
          stock: product.stock
        });
      } else {
        summary.sufficientStock++;
      }
    });
    
    return summary;
    
  } catch (error) {
    console.error('❌ Error getting stock status summary:', error);
    throw error;
  }
};

module.exports = {
  monitorStockLevels,
  checkProductStock,
  getStockStatusSummary
};
