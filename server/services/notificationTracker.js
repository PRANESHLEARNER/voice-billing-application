// Unified notification tracking system to prevent duplicate emails
// Shared between stockMonitor.js and immediateStockNotifier.js

// Track last notification times to avoid spam
const lastNotifications = {
  lowStock: new Map(),
  outOfStock: new Map(),
  restock: new Map()
};

// Minimum time between notifications for the same product (in milliseconds)
const NOTIFICATION_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

// Check if enough time has passed since last notification
const shouldSendNotification = (productId, type) => {
  const lastTime = lastNotifications[type].get(productId);
  if (!lastTime) return true;
  
  const timeSinceLastNotification = Date.now() - lastTime;
  return timeSinceLastNotification >= NOTIFICATION_COOLDOWN;
};

// Update last notification time
const updateLastNotificationTime = (productId, type) => {
  lastNotifications[type].set(productId, Date.now());
};

// Get notification status for debugging
const getNotificationStatus = () => {
  const status = {};
  const now = Date.now();
  
  for (const [type, notificationMap] of Object.entries(lastNotifications)) {
    status[type] = [];
    
    for (const [productId, timestamp] of notificationMap.entries()) {
      const timeSinceNotification = now - timestamp;
      const timeRemaining = Math.max(0, NOTIFICATION_COOLDOWN - timeSinceNotification);
      const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000));
      
      status[type].push({
        productId,
        lastNotification: new Date(timestamp).toISOString(),
        timeSinceNotification: `${Math.floor(timeSinceNotification / (60 * 60 * 1000))} hours ago`,
        cooldownRemaining: `${hoursRemaining} hours`,
        isExpired: timeSinceNotification >= NOTIFICATION_COOLDOWN
      });
    }
  }
  
  return status;
};

// Clear notification cooldown (for testing/admin use)
const clearNotificationCooldown = (productId = null, type = null) => {
  if (productId && type) {
    // Clear specific notification
    lastNotifications[type].delete(productId);
    console.log(`🗑️ Cleared cooldown for ${type} notification of product ${productId}`);
  } else if (productId) {
    // Clear all notifications for a specific product
    for (const type of Object.keys(lastNotifications)) {
      lastNotifications[type].delete(productId);
    }
    console.log(`🗑️ Cleared all cooldowns for product ${productId}`);
  } else if (type) {
    // Clear all notifications of a specific type
    lastNotifications[type].clear();
    console.log(`🗑️ Cleared all ${type} notification cooldowns`);
  } else {
    // Clear all notifications
    for (const type of Object.keys(lastNotifications)) {
      lastNotifications[type].clear();
    }
    console.log('🗑️ Cleared all notification cooldowns');
  }
};

// Get cooldown time remaining for a specific product and type
const getCooldownRemaining = (productId, type) => {
  const lastTime = lastNotifications[type].get(productId);
  if (!lastTime) return 0;
  
  const timeSinceNotification = Date.now() - lastTime;
  const timeRemaining = Math.max(0, NOTIFICATION_COOLDOWN - timeSinceNotification);
  return timeRemaining;
};

module.exports = {
  shouldSendNotification,
  updateLastNotificationTime,
  getNotificationStatus,
  clearNotificationCooldown,
  getCooldownRemaining,
  NOTIFICATION_COOLDOWN
};
