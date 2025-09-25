const { generateBillPDF } = require('./pdfService');
const fs = require('fs');
const path = require('path');

/**
 * Generate a WhatsApp URL for sending a bill message
 * @param {Object} bill - The bill object
 * @param {string} phoneNumber - The customer's phone number
 * @returns {Promise<Object>} - Result containing WhatsApp URL and phone number
 */
const sendBillViaWhatsApp = async (bill, phoneNumber) => {
  try {
    console.log('📱 Starting WhatsApp service for bill:', bill.billNumber);
    
    // Clean and format phone number
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
    console.log('📞 Cleaned phone number:', cleanPhoneNumber);
    
    // Create WhatsApp message first (this is the core functionality)
    const message = createWhatsAppMessage(bill);
    console.log('💬 WhatsApp message created');
    
    // Generate WhatsApp URL
    const whatsappUrl = generateWhatsAppURL(cleanPhoneNumber, message, null);
    console.log('🔗 WhatsApp URL generated:', whatsappUrl);
    
    // Try to generate PDF, but don't fail if it doesn't work
    let pdfGenerated = false;
    try {
      const pdfBuffer = await generateBillPDF(bill);
      console.log('📄 PDF generated successfully, size:', pdfBuffer.length, 'bytes');
      
      // Create a temporary file for the PDF
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log('📁 Created temp directory:', tempDir);
      }
      
      const pdfFileName = `bill_${bill.billNumber}_${Date.now()}.pdf`;
      const pdfPath = path.join(tempDir, pdfFileName);
      
      // Write PDF to temporary file
      fs.writeFileSync(pdfPath, pdfBuffer);
      console.log('💾 PDF saved to:', pdfPath);
      
      // Clean up temporary file after a delay
      setTimeout(() => {
        try {
          if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
            console.log('🗑️ Temporary PDF file cleaned up');
          }
        } catch (cleanupError) {
          console.error('Error cleaning up temporary PDF file:', cleanupError);
        }
      }, 30000); // Clean up after 30 seconds
      
      pdfGenerated = true;
    } catch (pdfError) {
      console.error('⚠️ PDF generation failed, but continuing with WhatsApp URL:', pdfError.message);
      // Don't throw the error - we'll still provide the WhatsApp URL
    }
    
    return {
      success: true,
      whatsappUrl,
      phoneNumber: cleanPhoneNumber,
      billNumber: bill.billNumber,
      pdfGenerated: pdfGenerated,
      message: pdfGenerated ? 'Bill prepared for WhatsApp with PDF' : 'Bill prepared for WhatsApp (PDF generation failed, but message is ready)'
    };
    
  } catch (error) {
    console.error('❌ Error in WhatsApp service:', error);
    throw new Error(`Failed to prepare bill for WhatsApp: ${error.message}`);
  }
};

/**
 * Create a formatted WhatsApp message for the bill
 * @param {Object} bill - The bill object
 * @returns {string} - Formatted message
 */
const createWhatsAppMessage = (bill) => {
  const customerName = bill.customer?.name || 'Customer';
  const billNumber = bill.billNumber;
  const date = new Date(bill.createdAt).toLocaleDateString();
  const time = new Date(bill.createdAt).toLocaleTimeString();
  
  let message = `🧾 *BILL RECEIPT* 🧾\n\n`;
  message += `📋 *Bill Number:* ${billNumber}\n`;
  message += `📅 *Date:* ${date}\n`;
  message += `⏰ *Time:* ${time}\n`;
  message += `👤 *Customer:* ${customerName}\n\n`;
  
  if (bill.customer?.phone) {
    message += `📞 *Phone:* ${bill.customer.phone}\n`;
  }
  
  message += `🛍️ *ITEMS:* \n`;
  message += `${'─'.repeat(30)}\n`;
  
  bill.items.forEach((item, index) => {
    const itemName = item.productName || item.product?.name || 'Item';
    const size = item.size || '';
    const quantity = item.quantity;
    const rate = item.rate;
    const amount = item.amount;
    
    message += `${index + 1}. ${itemName}`;
    if (size) {
      message += ` (${size})`;
    }
    message += `\n`;
    message += `   Qty: ${quantity} × ₹${rate} = ₹${amount}\n`;
  });
  
  message += `${'─'.repeat(30)}\n\n`;
  
  // Add totals
  message += `💰 *PAYMENT SUMMARY:*\n`;
  message += `Subtotal: ₹${bill.subtotal}\n`;
  
  if (bill.totalDiscount > 0) {
    message += `Discount: -₹${bill.totalDiscount}\n`;
  }
  
  if (bill.totalTax > 0) {
    message += `Tax: +₹${bill.totalTax}\n`;
  }
  
  if (bill.roundOff !== 0) {
    message += `Round Off: ${bill.roundOff > 0 ? '+' : ''}₹${bill.roundOff}\n`;
  }
  
  message += `${'─'.repeat(20)}\n`;
  message += `*Total: ₹${bill.grandTotal}*\n\n`;
  
  if (bill.cashTendered && bill.cashTendered > 0) {
    message += `💵 *Cash Tendered:* ₹${bill.cashTendered}\n`;
    message += `💸 *Change:* ₹${bill.changeDue}\n`;
  }
  
  message += `\n🙏 *Thank you for your purchase!* 🙏\n`;
  message += `📱 *Powered by FortuMars SuperMarket*`;
  
  return message;
};

/**
 * Generate WhatsApp URL for sending message
 * @param {string} phoneNumber - The recipient's phone number
 * @param {string} message - The message to send
 * @param {string} filePath - Path to the PDF file (for reference)
 * @returns {string} - WhatsApp URL
 */
const generateWhatsAppURL = (phoneNumber, message, filePath) => {
  // Ensure phone number starts with country code (default to India if not specified)
  let formattedPhone = phoneNumber;
  if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
    formattedPhone = `91${formattedPhone}`;
  }
  
  // Remove any leading + or 00
  formattedPhone = formattedPhone.replace(/^[\+00]+/, '');
  
  // Encode the message
  const encodedMessage = encodeURIComponent(message);
  
  // Use the specific WhatsApp API number provided: 9360648801
  // This will open WhatsApp with the message pre-filled
  // Note: File attachment needs to be done manually by the user
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
};

module.exports = {
  sendBillViaWhatsApp,
  createWhatsAppMessage,
  generateWhatsAppURL
};
