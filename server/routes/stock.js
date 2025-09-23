const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const { monitorStockLevels, getStockStatusSummary } = require('../services/stockMonitor');
const { testEmailConfiguration } = require('../services/emailService');
const { triggerStockChangeCheck, getCurrentStockLevels } = require('../services/immediateStockNotifier');
const { getNotificationStatus, clearNotificationCooldown } = require('../services/notificationTracker');

const router = express.Router();

// Get stock status summary
router.get('/status', auth, async (req, res) => {
  try {
    const summary = await getStockStatusSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error getting stock status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Manually trigger stock monitoring (Admin only)
router.post('/monitor', auth, adminAuth, async (req, res) => {
  try {
    const result = await monitorStockLevels();
    res.json({ 
      message: 'Stock monitoring completed successfully',
      result 
    });
  } catch (error) {
    console.error('Error monitoring stock levels:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test email configuration (Admin only)
router.post('/test-email', auth, adminAuth, async (req, res) => {
  try {
    const result = await testEmailConfiguration();
    res.json({ 
      message: 'Test email sent successfully',
      result 
    });
  } catch (error) {
    console.error('Error testing email configuration:', error);
    res.status(500).json({ 
      message: 'Failed to send test email', 
      error: error.message 
    });
  }
});

// Manually trigger immediate stock change check (Admin only)
router.post('/trigger-check', auth, adminAuth, async (req, res) => {
  try {
    const result = await triggerStockChangeCheck();
    res.json({ 
      message: 'Immediate stock change check completed successfully',
      result 
    });
  } catch (error) {
    console.error('Error triggering stock change check:', error);
    res.status(500).json({ 
      message: 'Failed to trigger stock change check', 
      error: error.message 
    });
  }
});

// Get current stock levels for debugging (Admin only)
router.get('/current-levels', auth, adminAuth, async (req, res) => {
  try {
    const levels = getCurrentStockLevels();
    res.json({ 
      message: 'Current stock levels retrieved successfully',
      levels,
      count: levels.length
    });
  } catch (error) {
    console.error('Error getting current stock levels:', error);
    res.status(500).json({ 
      message: 'Failed to get current stock levels', 
      error: error.message 
    });
  }
});

// Get notification cooldown status (Admin only)
router.get('/cooldown-status', auth, adminAuth, async (req, res) => {
  try {
    const status = getNotificationStatus();
    // Flatten the status object for easier frontend consumption
    const flattenedStatus = [];
    for (const [type, notifications] of Object.entries(status)) {
      notifications.forEach(notification => {
        flattenedStatus.push({
          ...notification,
          type
        });
      });
    }
    res.json({ 
      message: 'Notification cooldown status retrieved successfully',
      status: flattenedStatus,
      count: flattenedStatus.length
    });
  } catch (error) {
    console.error('Error getting notification cooldown status:', error);
    res.status(500).json({ 
      message: 'Failed to get notification cooldown status', 
      error: error.message 
    });
  }
});

// Clear notification cooldown (Admin only)
router.post('/clear-cooldown', auth, adminAuth, async (req, res) => {
  try {
    const { productId, notificationType } = req.body;
    
    clearNotificationCooldown(productId, notificationType);
    
    res.json({ 
      message: productId 
        ? `Cleared cooldown for product ${productId}${notificationType ? ` (${notificationType})` : ''}`
        : 'Cleared all notification cooldowns',
      productId,
      notificationType
    });
  } catch (error) {
    console.error('Error clearing notification cooldown:', error);
    res.status(500).json({ 
      message: 'Failed to clear notification cooldown', 
      error: error.message 
    });
  }
});

module.exports = router;
