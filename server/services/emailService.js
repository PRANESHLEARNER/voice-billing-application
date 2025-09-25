const nodemailer = require('nodemailer');
const { generateBillPDF } = require('./pdfService');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send low stock notification
const sendLowStockNotification = async (products) => {
  try {
    const transporter = createTransporter();
    
    const productDetails = products.map(product => {
      const urgencyLevel = product.stock <= 3 ? 'Critical' : product.stock <= 6 ? 'High' : 'Medium';
      const urgencyColor = product.stock <= 3 ? '#dc3545' : product.stock <= 6 ? '#fd7e14' : '#ffc107';
      
      const displayName = product.type === 'variant' ? `${product.name} (${product.size})` : product.name;
      const displayCode = product.type === 'variant' ? product.code : product.code;
      
      // Generate variants information
      let variantsHtml = '';
      if (product.variants && product.variants.length > 0) {
        variantsHtml = `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 8px;">All Variants:</div>
            ${product.variants.map(variant => {
              const variantStatus = variant.stock === 0 ? '🚨' : variant.stock < 10 ? '⚠️' : '✅';
              const variantColor = variant.stock === 0 ? '#dc3545' : variant.stock < 10 ? '#fd7e14' : '#10b981';
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 11px;">
                  <span style="color: #6b7280;">${variant.size}g</span>
                  <span style="font-family: monospace; background-color: #f8f9fa; padding: 2px 6px; border-radius: 4px;">${variant.sku}</span>
                  <span style="color: ${variantColor}; font-weight: bold;">${variantStatus} ${variant.stock}</span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
      
      return `
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 12px; border-right: 1px solid #dee2e6; font-weight: 600;">${displayName}${variantsHtml}</td>
          <td style="padding: 12px; border-right: 1px solid #dee2e6; font-family: monospace; background-color: #f8f9fa;">${displayCode}</td>
          <td style="padding: 12px; border-right: 1px solid #dee2e6; text-align: center;">
            <span style="background-color: ${urgencyColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">${product.stock}</span>
          </td>
          <td style="padding: 12px; text-align: center;">
            <span style="color: ${urgencyColor}; font-weight: bold;">${urgencyLevel}</span>
          </td>
        </tr>
      `;
    }).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL,
      subject: `🔔 Low Stock Alert - ${products.length} Product${products.length > 1 ? 's' : ''} Require Reordering - Supermarket Billing System`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <div style="background-color: #f8fafc; padding: 32px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
            <div style="font-size: 32px; margin-bottom: 12px;">📦</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">Low Stock Alert</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">Inventory Management System</p>
          </div>
          
          <!-- Alert Banner -->
          <div style="padding: 20px 24px; background-color: #fef3c7; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: flex-start;">
              <div style="font-size: 20px; margin-right: 12px; color: #d97706; margin-top: 2px;">⚠️</div>
              <div>
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #92400e;">Inventory Alert</h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #78350f;">The following ${products.length} product${products.length > 1 ? 's' : ''} have low stock levels and require attention. Stock levels are below the minimum threshold.</p>
              </div>
            </div>
          </div>
          
          <!-- Summary Stats -->
          <div style="padding: 24px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; text-align: center;">
              <div style="background-color: white; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="font-size: 20px; font-weight: 600; color: #1f2937;">${products.length}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Total Products</div>
              </div>
              <div style="background-color: white; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="font-size: 20px; font-weight: 600; color: #dc2626;">${products.filter(p => p.stock <= 3).length}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Critical (≤3)</div>
              </div>
              <div style="background-color: white; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="font-size: 20px; font-weight: 600; color: #ea580c;">${products.filter(p => p.stock > 3 && p.stock <= 6).length}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">High (4-6)</div>
              </div>
              <div style="background-color: white; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="font-size: 20px; font-weight: 600; color: #d97706;">${products.filter(p => p.stock > 6 && p.stock < 10).length}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Medium (7-9)</div>
              </div>
            </div>
          </div>
          
          <!-- Product Details Table -->
          <div style="padding: 24px;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #374151;">Product Details</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                <thead style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                  <tr>
                    <th style="padding: 12px 16px; text-align: left; font-size: 14px; font-weight: 600; color: #374151;">Product Name</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 14px; font-weight: 600; color: #374151;">Product Code</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 14px; font-weight: 600; color: #374151;">Stock</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 14px; font-weight: 600; color: #374151;">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  ${productDetails}
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
              Generated on ${new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric'
              })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style="font-size: 14px; font-weight: 500; color: #374151;">
              Supermarket Billing System
            </div>
            <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">
              Inventory Management
            </div>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Low stock notification sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending low stock notification:', error);
    throw error;
  }
};

// Send out of stock notification
const sendOutOfStockNotification = async (products) => {
  try {
    const transporter = createTransporter();
    
    const productDetails = products.map(product => {
      const daysSinceStockout = Math.floor((Date.now() - new Date(product.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      const urgencyLevel = daysSinceStockout >= 7 ? 'URGENT' : daysSinceStockout >= 3 ? 'HIGH' : 'MEDIUM';
      const urgencyColor = daysSinceStockout >= 7 ? '#721c24' : daysSinceStockout >= 3 ? '#dc3545' : '#fd7e14';
      
      const displayName = product.type === 'variant' ? `${product.name} (${product.size})` : product.name;
      const displayCode = product.type === 'variant' ? product.code : product.code;
      
      // Generate variants information
      let variantsHtml = '';
      if (product.variants && product.variants.length > 0) {
        variantsHtml = `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 8px;">All Variants:</div>
            ${product.variants.map(variant => {
              const variantStatus = variant.stock === 0 ? '🚨' : variant.stock < 10 ? '⚠️' : '✅';
              const variantColor = variant.stock === 0 ? '#dc3545' : variant.stock < 10 ? '#fd7e14' : '#10b981';
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 11px;">
                  <span style="color: #6b7280;">${variant.size}g</span>
                  <span style="font-family: monospace; background-color: #f8f9fa; padding: 2px 6px; border-radius: 4px;">${variant.sku}</span>
                  <span style="color: ${variantColor}; font-weight: bold;">${variantStatus} ${variant.stock}</span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
      
      return `
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 12px; border-right: 1px solid #dee2e6; font-weight: 600;">${displayName}${variantsHtml}</td>
          <td style="padding: 12px; border-right: 1px solid #dee2e6; font-family: monospace; background-color: #f8f9fa;">${displayCode}</td>
          <td style="padding: 12px; border-right: 1px solid #dee2e6; text-align: center;">
            <span style="background-color: #dc3545; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">${product.stock}</span>
          </td>
          <td style="padding: 12px; border-right: 1px solid #dee2e6; text-align: center; font-size: 12px;">
            ${daysSinceStockout > 0 ? `${daysSinceStockout}d` : 'Today'}
          </td>
          <td style="padding: 12px; text-align: center;">
            <span style="color: ${urgencyColor}; font-weight: bold; font-size: 12px;">${urgencyLevel}</span>
          </td>
        </tr>
      `;
    }).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL,
      subject: `🚨 CRITICAL: ${products.length} Product${products.length > 1 ? 's' : ''} Out of Stock - Immediate Action Required - Supermarket Billing System`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <div style="background-color: #fef2f2; padding: 32px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
            <div style="font-size: 32px; margin-bottom: 12px;">⚠️</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #991b1b;">Out of Stock Alert</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #7f1d1d;">Inventory Management System</p>
          </div>
          
          <!-- Alert Banner -->
          <div style="padding: 20px 24px; background-color: #fee2e2; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: flex-start;">
              <div style="font-size: 20px; margin-right: 12px; color: #dc2626; margin-top: 2px;">🚨</div>
              <div>
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #991b1b;">Inventory Alert</h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #7f1d1d;">${products.length} product${products.length > 1 ? 's are' : ' is'} completely out of stock. These items are unavailable for purchase until stock is replenished.</p>
              </div>
            </div>
          </div>
          
          
          <!-- Product Details Table -->
          <div style="padding: 24px;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #374151;">Out of Stock Products</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                <thead style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                  <tr>
                    <th style="padding: 12px 16px; text-align: left; font-size: 14px; font-weight: 600; color: #374151;">Product Name</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 14px; font-weight: 600; color: #374151;">Product Code</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 14px; font-weight: 600; color: #374151;">Stock</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 14px; font-weight: 600; color: #374151;">Days Out</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 14px; font-weight: 600; color: #374151;">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  ${productDetails}
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
              Generated on ${new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric'
              })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style="font-size: 14px; font-weight: 500; color: #374151;">
              Supermarket Billing System
            </div>
            <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">
              Inventory Management
            </div>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Out of stock notification sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending out of stock notification:', error);
    throw error;
  }
};

// Test email configuration
const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL,
      subject: '✅ Test Email - Supermarket Billing System',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <div style="background-color: #f0f9ff; padding: 32px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
            <div style="font-size: 32px; margin-bottom: 12px;">✅</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #0369a1;">Test Email</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #075985;">Supermarket Billing System</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 24px;">
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">Hello,</p>
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">This is a test email to verify that the email configuration is working correctly for the Supermarket Billing System.</p>
            <div style="background-color: #f0f9ff; padding: 16px; border-radius: 6px; border-left: 4px solid #0ea5e9;">
              <p style="margin: 0; font-size: 14px; color: #075985; font-weight: 600;">✅ Email configuration is working properly!</p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Sent at: ${new Date().toLocaleString()}</p>
            </div>
            <p style="margin: 16px 0 0 0; font-size: 14px; color: #6b7280;">You will receive stock notifications when products are low or out of stock.</p>
          </div>
          
          <!-- Footer -->
          <div style="padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">Supermarket Billing System - Automated Notification</p>
          </div>
        </div>
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Error sending test email:', error);
    throw error;
  }
};

// Send end-of-day stock summary email
const sendEndOfDayStockSummary = async (lowStockProducts, outOfStockProducts) => {
  try {
    const transporter = createTransporter();
    
    // Generate low stock product details
    const lowStockDetails = lowStockProducts.map(product => {
      const urgencyLevel = product.stock <= 3 ? 'Critical' : product.stock <= 6 ? 'High' : 'Medium';
      const urgencyColor = product.stock <= 3 ? '#dc3545' : product.stock <= 6 ? '#fd7e14' : '#ffc107';
      const displayName = product.type === 'variant' ? `${product.name} (${product.size})` : product.name;
      const displayCode = product.type === 'variant' ? product.code : product.code;
      
      // Generate variants information
      let variantsHtml = '';
      if (product.variants && product.variants.length > 0) {
        variantsHtml = `
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 6px;">All Variants:</div>
            ${product.variants.map(variant => {
              const variantStatus = variant.stock === 0 ? '🚨' : variant.stock < 10 ? '⚠️' : '✅';
              const variantColor = variant.stock === 0 ? '#dc3545' : variant.stock < 10 ? '#fd7e14' : '#10b981';
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; font-size: 10px;">
                  <span style="color: #6b7280;">${variant.size}g</span>
                  <span style="font-family: monospace; background-color: #f8f9fa; padding: 1px 4px; border-radius: 3px;">${variant.sku}</span>
                  <span style="color: ${variantColor}; font-weight: bold;">${variantStatus} ${variant.stock}</span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
      
      return `
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 10px; border-right: 1px solid #dee2e6; font-weight: 600;">${displayName}${variantsHtml}</td>
          <td style="padding: 10px; border-right: 1px solid #dee2e6; font-family: monospace; background-color: #f8f9fa;">${displayCode}</td>
          <td style="padding: 10px; border-right: 1px solid #dee2e6; text-align: center;">
            <span style="background-color: ${urgencyColor}; color: white; padding: 3px 6px; border-radius: 10px; font-size: 11px; font-weight: bold;">${product.stock}</span>
          </td>
          <td style="padding: 10px; text-align: center;">
            <span style="color: ${urgencyColor}; font-weight: bold; font-size: 12px;">${urgencyLevel}</span>
          </td>
        </tr>
      `;
    }).join('');
    
    // Generate out of stock product details
    const outOfStockDetails = outOfStockProducts.map(product => {
      const displayName = product.type === 'variant' ? `${product.name} (${product.size})` : product.name;
      const displayCode = product.type === 'variant' ? product.code : product.code;
      
      // Generate variants information
      let variantsHtml = '';
      if (product.variants && product.variants.length > 0) {
        variantsHtml = `
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 6px;">All Variants:</div>
            ${product.variants.map(variant => {
              const variantStatus = variant.stock === 0 ? '🚨' : variant.stock < 10 ? '⚠️' : '✅';
              const variantColor = variant.stock === 0 ? '#dc3545' : variant.stock < 10 ? '#fd7e14' : '#10b981';
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; font-size: 10px;">
                  <span style="color: #6b7280;">${variant.size}g</span>
                  <span style="font-family: monospace; background-color: #f8f9fa; padding: 1px 4px; border-radius: 3px;">${variant.sku}</span>
                  <span style="color: ${variantColor}; font-weight: bold;">${variantStatus} ${variant.stock}</span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
      
      return `
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 10px; border-right: 1px solid #dee2e6; font-weight: 600;">${displayName}${variantsHtml}</td>
          <td style="padding: 10px; border-right: 1px solid #dee2e6; font-family: monospace; background-color: #f8f9fa;">${displayCode}</td>
          <td style="padding: 10px; border-right: 1px solid #dee2e6; text-align: center;">
            <span style="background-color: #dc3545; color: white; padding: 3px 6px; border-radius: 10px; font-size: 11px; font-weight: bold;">${product.stock}</span>
          </td>
          <td style="padding: 10px; text-align: center;">
            <span style="color: #dc3545; font-weight: bold; font-size: 12px;">Out of Stock</span>
          </td>
        </tr>
      `;
    }).join('');
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL,
      subject: `📊 End of Day Stock Summary - ${lowStockProducts.length + outOfStockProducts.length} Items Need Attention - Supermarket Billing System`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <div style="background-color: #1f2937; padding: 32px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
            <div style="font-size: 32px; margin-bottom: 12px;">📊</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff;">End of Day Stock Summary</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #d1d5db;">Inventory Management System</p>
          </div>
          
          <!-- Summary Stats -->
          <div style="padding: 24px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center;">
              <div style="background-color: white; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="font-size: 24px; font-weight: 600; color: #dc2626;">${outOfStockProducts.length}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Out of Stock</div>
              </div>
              <div style="background-color: white; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="font-size: 24px; font-weight: 600; color: #d97706;">${lowStockProducts.length}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Low Stock</div>
              </div>
              <div style="background-color: white; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="font-size: 24px; font-weight: 600; color: #059669;">${new Date().toLocaleDateString()}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Report Date</div>
              </div>
            </div>
          </div>
          
          <!-- Out of Stock Section -->
          ${outOfStockProducts.length > 0 ? `
          <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #dc2626;">🚨 Out of Stock Products</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                <thead style="background-color: #fef2f2; border-bottom: 1px solid #e5e7eb;">
                  <tr>
                    <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #991b1b;">Product Name</th>
                    <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #991b1b;">Code/SKU</th>
                    <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #991b1b;">Stock</th>
                    <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #991b1b;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${outOfStockDetails}
                </tbody>
              </table>
            </div>
          </div>
          ` : ''}
          
          <!-- Low Stock Section -->
          ${lowStockProducts.length > 0 ? `
          <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #d97706;">⚠️ Low Stock Products</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                <thead style="background-color: #fffbeb; border-bottom: 1px solid #e5e7eb;">
                  <tr>
                    <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #92400e;">Product Name</th>
                    <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #92400e;">Code/SKU</th>
                    <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #92400e;">Stock</th>
                    <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #92400e;">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  ${lowStockDetails}
                </tbody>
              </table>
            </div>
          </div>
          ` : ''}
          
          <!-- No Issues Message -->
          ${outOfStockProducts.length === 0 && lowStockProducts.length === 0 ? `
          <div style="padding: 24px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
            <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #059669;">All Products Have Sufficient Stock</h3>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">No stock issues reported today. Great job managing inventory!</p>
          </div>
          ` : ''}
          
          <!-- Action Items -->
          ${(outOfStockProducts.length > 0 || lowStockProducts.length > 0) ? `
          <div style="padding: 24px; background-color: #f0f9ff; border-bottom: 1px solid #e5e7eb;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #0369a1;">📋 Action Items</h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #374151; line-height: 1.5;">
              ${outOfStockProducts.length > 0 ? '<li style="margin-bottom: 8px;">🚨 <strong>Urgent:</strong> Restock out of stock items immediately</li>' : ''}
              ${lowStockProducts.length > 0 ? '<li style="margin-bottom: 8px;">⚠️ <strong>Priority:</strong> Order more inventory for low stock items</li>' : ''}
              <li style="margin-bottom: 8px;">📊 <strong>Review:</strong> Update stock thresholds if needed</li>
              <li style="margin-bottom: 8px;">📧 <strong>Monitor:</strong> Check for new notifications tomorrow</li>
            </ul>
          </div>
          ` : ''}
          
          <!-- Footer -->
          <div style="padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">Supermarket Billing System - End of Day Stock Summary</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">Generated at ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ End of day stock summary sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Error sending end of day stock summary:', error);
    throw error;
  }
};

// Send restock notification
const sendRestockNotification = async (products) => {
  try {
    const transporter = createTransporter();
    
    const productDetails = products.map(product => {
      const displayName = product.type === 'variant' ? `${product.name} (${product.size})` : product.name;
      const displayCode = product.type === 'variant' ? product.code : product.code;
      
      // Generate variants information
      let variantsHtml = '';
      if (product.variants && product.variants.length > 0) {
        variantsHtml = `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 8px;">All Variants:</div>
            ${product.variants.map(variant => {
              const variantStatus = variant.stock === 0 ? '🚨' : variant.stock < 10 ? '⚠️' : '✅';
              const variantColor = variant.stock === 0 ? '#dc3545' : variant.stock < 10 ? '#fd7e14' : '#10b981';
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 11px;">
                  <span style="color: #6b7280;">${variant.size}g</span>
                  <span style="font-family: monospace; background-color: #f8f9fa; padding: 2px 6px; border-radius: 4px;">${variant.sku}</span>
                  <span style="color: ${variantColor}; font-weight: bold;">${variantStatus} ${variant.stock}</span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
      
      return `
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 12px; border-right: 1px solid #dee2e6; font-weight: 600;">${displayName}${variantsHtml}</td>
          <td style="padding: 12px; border-right: 1px solid #dee2e6; font-family: monospace; background-color: #f8f9fa;">${displayCode}</td>
          <td style="padding: 12px; border-right: 1px solid #dee2e6; text-align: center;">
            <span style="background-color: #10b981; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">${product.stock}</span>
          </td>
          <td style="padding: 12px; text-align: center;">
            <span style="color: #10b981; font-weight: bold; font-size: 12px;">✅ Restocked</span>
          </td>
        </tr>
      `;
    }).join('');
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL,
      subject: `✅ Products Restocked - ${products.length} Items Back in Stock - Supermarket Billing System`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <div style="background-color: #10b981; padding: 32px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
            <div style="font-size: 32px; margin-bottom: 12px;">✅</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff;">Products Restocked</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #f0fdf4;">Inventory Management System</p>
          </div>
          
          <!-- Summary Stats -->
          <div style="padding: 24px; background-color: #f0fdf4; border-bottom: 1px solid #e5e7eb;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; text-align: center;">
              <div style="background-color: white; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="font-size: 24px; font-weight: 600; color: #10b981;">${products.length}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Products Restocked</div>
              </div>
              <div style="background-color: white; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="font-size: 24px; font-weight: 600; color: #059669;">${new Date().toLocaleDateString()}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Restock Date</div>
              </div>
            </div>
          </div>
          
          <!-- Restocked Products Table -->
          <div style="padding: 24px;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #059669;">✅ Successfully Restocked Products</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                <thead style="background-color: #f0fdf4; border-bottom: 1px solid #e5e7eb;">
                  <tr>
                    <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #059669;">Product Name</th>
                    <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #059669;">Code/SKU</th>
                    <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #059669;">Stock</th>
                    <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #059669;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${productDetails}
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Success Message -->
          <div style="padding: 24px; background-color: #f0fdf4; border-top: 1px solid #e5e7eb; text-align: center;">
            <div style="background-color: #10b981; color: white; padding: 16px; border-radius: 6px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">🎉 Great Job!</h3>
              <p style="margin: 0; font-size: 14px;">${products.length} product${products.length > 1 ? 's have' : ' has'} been successfully restocked and are now available for customers.</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">Supermarket Billing System - Automated Restock Notification</p>
          </div>
        </div>
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Restock notification sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Error sending restock notification:', error);
    throw error;
  }
};

// Send low stock notification with both email and WhatsApp
const sendLowStockNotificationWithWhatsApp = async (products) => {
  try {
    console.log('📧📱 Sending low stock notification via Email and WhatsApp...');
    
    // Send email notification
    await sendLowStockNotification(products);
    
    // Send WhatsApp notification
    console.log('✅ Low stock notification sent successfully via Email');
    
  } catch (error) {
    console.error('❌ Error sending low stock notification with WhatsApp:', error);
    throw error;
  }
};

// Send out of stock notification with both email and WhatsApp
const sendOutOfStockNotificationWithWhatsApp = async (products) => {
  try {
    console.log('📧📱 Sending out of stock notification via Email and WhatsApp...');
    
    // Send email notification
    await sendOutOfStockNotification(products);
    
    // Send WhatsApp notification
    console.log('✅ Out of stock notification sent successfully via Email');
    
  } catch (error) {
    console.error('❌ Error sending out of stock notification with WhatsApp:', error);
    throw error;
  }
};

// Send bill by email
const sendBillByEmail = async (bill, customerEmail) => {
  try {
    console.log('📧 Starting email bill sending process...');
    
    const transporter = createTransporter();
    
    // Generate PDF bill
    console.log('📄 Generating PDF bill...');
    const pdfBuffer = await generateBillPDF(bill);
    console.log('✅ PDF bill generated successfully');
    
    // No HTML content needed - only PDF attachment will be sent
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Supermarket Purchase Bill`,
      text: `Dear Customer,

Thank you for shopping at Supermarket Store!

Your bill for ₹${bill.grandTotal.toFixed(2)} is attached to this email as a PDF file.

Bill Details:
- Bill Number: ${bill.billNumber}
- Date: ${new Date(bill.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
- Total Amount: ₹${bill.grandTotal.toFixed(2)}
- Payment Method: ${bill.paymentMethod.toUpperCase()}

Please find the detailed bill attached. For any queries, feel free to contact us.

Thank you for your purchase!

Supermarket Store
Phone: +1 234 567 8900`,
      attachments: [
        {
          filename: `Bill_${bill.billNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Bill #${bill.billNumber} sent successfully to ${customerEmail}:`, result.messageId);
    return result;
  } catch (error) {
    console.error(`❌ Error sending bill #${bill.billNumber} to ${customerEmail}:`, error);
    throw error;
  }
};

module.exports = {
  sendLowStockNotification,
  sendOutOfStockNotification,
  sendRestockNotification,
  testEmailConfiguration,
  sendEndOfDayStockSummary,
  sendLowStockNotificationWithWhatsApp,
  sendOutOfStockNotificationWithWhatsApp,
  sendBillByEmail
};
