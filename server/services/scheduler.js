const { monitorStockLevels } = require('./stockMonitor');
const { sendEndOfDayStockSummary } = require('./emailService');
const Product = require('../models/Product');

let stockMonitorInterval;
let endOfDaySummaryInterval;

// Start stock monitoring scheduler
const startStockMonitoring = (intervalMinutes = 60) => {
  if (stockMonitorInterval) {
    console.log('⏰ Stock monitoring scheduler is already running');
    return;
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  
  console.log(`🕐 Starting stock monitoring scheduler (runs every ${intervalMinutes} minutes)`);
  
  // Run immediately on start
  monitorStockLevels().catch(error => {
    console.error('❌ Error in initial stock monitoring:', error);
  });
  
  // Set up periodic monitoring
  stockMonitorInterval = setInterval(async () => {
    try {
      await monitorStockLevels();
    } catch (error) {
      console.error('❌ Error in scheduled stock monitoring:', error);
    }
  }, intervalMs);
};

// Stop stock monitoring scheduler
const stopStockMonitoring = () => {
  if (stockMonitorInterval) {
    clearInterval(stockMonitorInterval);
    stockMonitorInterval = null;
    console.log('⏹️ Stock monitoring scheduler stopped');
  } else {
    console.log('⏹️ Stock monitoring scheduler is not running');
  }
};

// Get scheduler status
const getSchedulerStatus = () => {
  return {
    isRunning: !!stockMonitorInterval,
    interval: stockMonitorInterval ? '60 minutes' : null,
    endOfDaySummaryRunning: !!endOfDaySummaryInterval
  };
};

// Send end-of-day stock summary
const sendEndOfDaySummary = async () => {
  try {
    console.log('📊 Starting end-of-day stock summary...');
    
    // Get all active products
    const products = await Product.find({ active: true });
    
    const lowStockProducts = [];
    const outOfStockProducts = [];
    
    // Check main products
    for (const product of products) {
      if (product.stock === 0) {
        outOfStockProducts.push({
          name: product.name,
          code: product.code,
          stock: 0,
          type: 'main',
          size: '',
          updatedAt: product.updatedAt
        });
      } else if (product.stock <= 10) {
        lowStockProducts.push({
          name: product.name,
          code: product.code,
          stock: product.stock,
          type: 'main',
          size: '',
          updatedAt: product.updatedAt
        });
      }
      
      // Check variants
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          if (variant.active && variant.stock === 0) {
            outOfStockProducts.push({
              name: product.name,
              code: variant.sku || `${product.code}-${variant.size}`,
              stock: 0,
              type: 'variant',
              size: variant.size,
              updatedAt: variant.updatedAt || product.updatedAt
            });
          } else if (variant.active && variant.stock <= 10) {
            lowStockProducts.push({
              name: product.name,
              code: variant.sku || `${product.code}-${variant.size}`,
              stock: variant.stock,
              type: 'variant',
              size: variant.size,
              updatedAt: variant.updatedAt || product.updatedAt
            });
          }
        }
      }
    }
    
    console.log(`📊 Found ${outOfStockProducts.length} out of stock and ${lowStockProducts.length} low stock items`);
    
    // Send the summary email
    await sendEndOfDayStockSummary(lowStockProducts, outOfStockProducts);
    
    console.log('✅ End-of-day stock summary completed successfully');
  } catch (error) {
    console.error('❌ Error sending end-of-day stock summary:', error);
  }
};

// Start end-of-day summary scheduler
const startEndOfDaySummary = () => {
  if (endOfDaySummaryInterval) {
    console.log('📊 End-of-day summary scheduler is already running');
    return;
  }
  
  console.log('📊 Starting end-of-day summary scheduler (runs daily at 11:59 PM)');
  
  // Schedule to run daily at 11:59 PM
  const scheduleDailyRun = () => {
    const now = new Date();
    const targetTime = new Date(now);
    targetTime.setHours(23, 59, 0, 0); // 11:59 PM
    
    // If we've passed 11:59 PM today, schedule for tomorrow
    if (now >= targetTime) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    const msUntilTarget = targetTime.getTime() - now.getTime();
    
    console.log(`📊 Next end-of-day summary scheduled for: ${targetTime.toLocaleString()}`);
    
    // Set timeout for the next run
    setTimeout(async () => {
      try {
        await sendEndOfDaySummary();
      } catch (error) {
        console.error('❌ Error in scheduled end-of-day summary:', error);
      }
      
      // Schedule the next daily run
      scheduleDailyRun();
    }, msUntilTarget);
  };
  
  // Start the scheduling
  scheduleDailyRun();
  
  // Set a flag to indicate the scheduler is running
  endOfDaySummaryInterval = true;
};

// Stop end-of-day summary scheduler
const stopEndOfDaySummary = () => {
  if (endOfDaySummaryInterval) {
    // Note: Since we're using setTimeout, we can't directly clear it
    // This is a simple flag-based approach
    endOfDaySummaryInterval = null;
    console.log('⏹️ End-of-day summary scheduler stopped');
  } else {
    console.log('⏹️ End-of-day summary scheduler is not running');
  }
};

module.exports = {
  startStockMonitoring,
  stopStockMonitoring,
  getSchedulerStatus,
  startEndOfDaySummary,
  stopEndOfDaySummary,
  sendEndOfDaySummary
};
