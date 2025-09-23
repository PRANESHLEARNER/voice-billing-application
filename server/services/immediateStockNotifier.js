const Product = require('../models/Product');
const { sendLowStockNotification, sendOutOfStockNotification } = require('./emailService');
const { shouldSendNotification, updateLastNotificationTime, NOTIFICATION_COOLDOWN } = require('./notificationTracker');

// Track previous stock levels to detect changes
let previousStockLevels = new Map();

// Initialize stock levels tracking
const initializeStockTracking = async () => {
  try {
    const products = await Product.find({ isActive: true });
    previousStockLevels.clear();
    
    products.forEach(product => {
      // Track main product stock
      previousStockLevels.set(product._id.toString(), {
        name: product.name,
        code: product.code,
        stock: product.stock,
        type: 'main',
        variants: []
      });
      
      // Track variant stocks
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          const variantId = (variant._id || product._id).toString();
          previousStockLevels.set(variantId, {
            name: product.name,
            code: variant.sku,
            stock: variant.stock,
            type: 'variant',
            size: variant.size,
            parentCode: product.code,
            parentName: product.name
          });
        });
      }
    });
    
    console.log('✅ Stock tracking initialized for', previousStockLevels.size, 'items');
  } catch (error) {
    console.error('❌ Error initializing stock tracking:', error);
  }
};

// Check for stock changes and send immediate notifications
const checkStockChanges = async () => {
  try {
    const products = await Product.find({ isActive: true });
    const lowStockProducts = [];
    const outOfStockProducts = [];
    
    for (const product of products) {
      const productId = product._id.toString();
      const previousStock = previousStockLevels.get(productId);
      const hasVariants = product.variants && product.variants.length > 0;
      
      // Check main product stock changes only when no variants exist
      if (!hasVariants && previousStock) {
        const wasAboveThreshold = previousStock.stock >= 20;
        const isNowLow = product.stock < 20 && product.stock >= 5;
        const isNowOutOfStock = product.stock < 5;
        
        console.log(`🔍 DEBUG: ${product.name} (Code: ${product.code}) - Previous: ${previousStock.stock}, Current: ${product.stock}, WasAbove: ${wasAboveThreshold}, IsLow: ${isNowLow}, IsOutOfStock: ${isNowOutOfStock}`);
        
        // Detect transition to low stock
        if (wasAboveThreshold && isNowLow) {
          if (shouldSendNotification(productId, 'lowStock')) {
            console.log(`🚨 IMMEDIATE: ${product.name} (Code: ${product.code}) stock went low - ${product.stock} units`);
            lowStockProducts.push({
              _id: product._id,
              name: product.name,
              code: product.code,
              stock: product.stock,
              type: 'main',
              size: 'N/A',
              variants: []
            });
            updateLastNotificationTime(productId, 'lowStock');
          } else {
            console.log(`⏰ COOLDOWN: ${product.name} (Code: ${product.code}) low stock notification skipped (24h cooldown)`);
          }
        }
        
        // Detect transition to out of stock
        if (previousStock.stock > 0 && isNowOutOfStock) {
          if (shouldSendNotification(productId, 'outOfStock')) {
            console.log(`🚨 IMMEDIATE: ${product.name} (Code: ${product.code}) went out of stock`);
            outOfStockProducts.push({
              _id: product._id,
              name: product.name,
              code: product.code,
              stock: product.stock,
              type: 'main',
              size: 'N/A',
              variants: []
            });
            updateLastNotificationTime(productId, 'outOfStock');
          } else {
            console.log(`⏰ COOLDOWN: ${product.name} (Code: ${product.code}) out of stock notification skipped (24h cooldown)`);
          }
        }
      }
      
      // Check variant stock changes (only if variants exist)
      if (hasVariants) {
        for (const variant of product.variants) {
          const variantId = (variant._id || product._id).toString();
          const previousVariantStock = previousStockLevels.get(variantId);
          
          if (previousVariantStock) {
            const wasAboveThreshold = previousVariantStock.stock >= 20;
            const isNowLow = variant.stock < 20 && variant.stock >= 5;
            const isNowOutOfStock = variant.stock < 5;
            
            console.log(`🔍 DEBUG: ${product.name} (${variant.size}) (SKU: ${variant.sku}) - Previous: ${previousVariantStock.stock}, Current: ${variant.stock}, WasAbove: ${wasAboveThreshold}, IsLow: ${isNowLow}, IsOutOfStock: ${isNowOutOfStock}`);
            
            // Detect transition to low stock
            if (wasAboveThreshold && isNowLow) {
              if (shouldSendNotification(variantId, 'lowStock')) {
                console.log(`🚨 IMMEDIATE: ${product.name} (${variant.size}) (SKU: ${variant.sku}) stock went low - ${variant.stock} units`);
                lowStockProducts.push({
                  _id: variant._id || product._id,
                  name: product.name,
                  code: variant.sku,
                  stock: variant.stock,
                  type: 'variant',
                  size: variant.size,
                  parentCode: product.code,
                  variants: [] // Variants don't have sub-variants
                });
                updateLastNotificationTime(variantId, 'lowStock');
              } else {
                console.log(`⏰ COOLDOWN: ${product.name} (${variant.size}) (SKU: ${variant.sku}) low stock notification skipped (24h cooldown)`);
              }
            }
            
            // Detect transition to out of stock
            if (previousVariantStock.stock > 0 && isNowOutOfStock) {
              if (shouldSendNotification(variantId, 'outOfStock')) {
                console.log(`🚨 IMMEDIATE: ${product.name} (${variant.size}) (SKU: ${variant.sku}) went out of stock`);
                outOfStockProducts.push({
                  _id: variant._id || product._id,
                  name: product.name,
                  code: variant.sku,
                  stock: variant.stock,
                  type: 'variant',
                  size: variant.size,
                  parentCode: product.code,
                  variants: [] // Variants don't have sub-variants
                });
                updateLastNotificationTime(variantId, 'outOfStock');
              } else {
                console.log(`⏰ COOLDOWN: ${product.name} (${variant.size}) (SKU: ${variant.sku}) out of stock notification skipped (24h cooldown)`);
              }
            }
          }
        }
      }
    }
    
    // Send immediate notifications
    if (lowStockProducts.length > 0) {
      console.log(`📧 Sending immediate low stock notifications for ${lowStockProducts.length} products`);
      try {
        await sendLowStockNotification(lowStockProducts);
        console.log('✅ Immediate low stock notifications sent successfully');
      } catch (error) {
        console.error('❌ Error sending immediate low stock notifications:', error);
      }
    }
    
    if (outOfStockProducts.length > 0) {
      console.log(`📧 Sending immediate out of stock notifications for ${outOfStockProducts.length} products`);
      try {
        await sendOutOfStockNotification(outOfStockProducts);
        console.log('✅ Immediate out of stock notifications sent successfully');
      } catch (error) {
        console.error('❌ Error sending immediate out of stock notifications:', error);
      }
    }
    
    // Update previous stock levels for next check
    await updateStockLevels();
    
  } catch (error) {
    console.error('❌ Error checking stock changes:', error);
  }
};

// Update stock levels tracking
const updateStockLevels = async () => {
  try {
    const products = await Product.find({ isActive: true });
    previousStockLevels.clear();
    
    products.forEach(product => {
      // Track main product stock
      previousStockLevels.set(product._id.toString(), {
        name: product.name,
        code: product.code,
        stock: product.stock,
        type: 'main',
        variants: []
      });
      
      // Track variant stocks
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          const variantId = (variant._id || product._id).toString();
          previousStockLevels.set(variantId, {
            name: product.name,
            code: variant.sku,
            stock: variant.stock,
            type: 'variant',
            size: variant.size,
            parentCode: product.code,
            parentName: product.name
          });
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating stock levels:', error);
  }
};

// Manual trigger for stock change check (can be called after any stock update)
const triggerStockChangeCheck = async () => {
  try {
    console.log('🔄 Manual stock change check triggered');
    await checkStockChanges();
    console.log('✅ Stock change check completed');
  } catch (error) {
    console.error('❌ Stock change check failed:', error.message);
    // Don't throw the error - this is a background process
    // Just log it and continue
  }
};

// Get current stock levels for debugging
const getCurrentStockLevels = () => {
  const levels = [];
  previousStockLevels.forEach((data, id) => {
    levels.push({ id, ...data });
  });
  return levels;
};

// Get current notification cooldown status (for debugging) - delegates to unified tracker
const getNotificationCooldownStatus = () => {
  const { getNotificationStatus } = require('./notificationTracker');
  return getNotificationStatus();
};

// Clear notification cooldown (for testing) - delegates to unified tracker
const clearNotificationCooldown = (productId = null, notificationType = null) => {
  const { clearNotificationCooldown: clearUnifiedCooldown } = require('./notificationTracker');
  return clearUnifiedCooldown(productId, notificationType);
};

module.exports = {
  initializeStockTracking,
  triggerStockChangeCheck,
  checkStockChanges,
  getCurrentStockLevels,
  getNotificationCooldownStatus,
  clearNotificationCooldown,
  updateStockLevels
};
