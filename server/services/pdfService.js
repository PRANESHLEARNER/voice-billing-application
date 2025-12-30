const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Generate PDF bill from HTML template
const generateBillPDF = async (bill, language = 'en') => {
  try {
    console.log('📄 Starting PDF generation for bill:', bill.billNumber, 'Language:', language);
    console.log('🌍 Language parameter received:', language);
    console.log('🔍 Language type:', typeof language);
    console.log('📋 Bill data structure:', JSON.stringify({
      billNumber: bill.billNumber,
      hasDiscount: !!bill.discount,
      discountAmount: bill.discount?.discountAmount,
      hasLoyaltyDiscount: !!bill.loyaltyDiscount,
      loyaltyDiscountAmount: bill.loyaltyDiscount?.amount,
      subtotal: bill.subtotal,
      totalTax: bill.totalTax,
      grandTotal: bill.grandTotal
    }, null, 2));
    
    // Generate HTML template for the bill
    const htmlTemplate = generateBillHTML(bill, language);
    
    // Launch Puppeteer browser with new headless mode and additional args for font support
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-font-subpixel-positioning',
        '--disable-gpu',
        '--font-render-hinting=none',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set HTML content and wait for fonts to load
    await page.setContent(htmlTemplate, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });
    
    // Wait a bit more for fonts to load properly
    await page.waitForTimeout(2000);
    
    // Generate PDF with thermal receipt dimensions
    const pdfBuffer = await page.pdf({
      width: '80mm', // Thermal printer width
      height: '297mm', // Maximum height (will be auto-sized)
      printBackground: true,
      margin: {
        top: '2px',
        bottom: '2px',
        left: '2px',
        right: '2px'
      },
      preferCSSPageSize: true
    });
    
    await browser.close();
    
    console.log('✅ PDF generated successfully for bill:', bill.billNumber);
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw new Error('Failed to generate PDF: ' + error.message);
  }
};

// Generate HTML template for the bill
const generateBillHTML = (bill, language = 'en') => {
  // Translation function with bilingual support
  const t = (key) => {
    const translations = {
      en: {
        supermarket_store: "SUPERMARKET STORE",
        bill: "BILL",
        date: "DATE",
        cashier: "CASHIER",
        customer: "CUSTOMER",
        phone: "PHONE",
        email: "EMAIL",
        items: "ITEMS",
        subtotal: "SUBTOTAL",
        loyalty_discount: "LOYALTY DISCOUNT",
        total_tax: "TOTAL TAX",
        round_off: "ROUND OFF",
        total: "TOTAL",
        payment_method: "PAYMENT METHOD",
        cash_tendered: "CASH TENDERED",
        change: "CHANGE",
        thank_you: "THANK YOU FOR YOUR PURCHASE!",
        please_visit_again: "PLEASE VISIT AGAIN",
        paid: "*** PAID ***",
        walk_in_customer: "Walk-in Customer"
      },
      ta: {
        supermarket_store: "சூப்பர்மார்க்கெட் ஸ்டோர்",
        bill: "பில்",
        date: "தேதி",
        cashier: "பணம் வசூலிப்பவர்",
        customer: "வாடிக்கையாளர்",
        phone: "தொலைபேசி",
        email: "மின்னஞ்சல்",
        items: "பொருட்கள்",
        subtotal: "மொத்தம்",
        loyalty_discount: "விசுவாசத் தள்ளுபடி",
        total_tax: "மொத்த வரி",
        round_off: "சுற்றளவு",
        total: "மொத்தம்",
        payment_method: "கட்டண முறை",
        cash_tendered: "பணம் கொடுக்கப்பட்டது",
        change: "மாற்றுத் தொகை",
        thank_you: "உங்கள் கொள்முதலுக்கு நன்றி!",
        please_visit_again: "மீண்டும் வருகையிடுங்கள்",
        paid: "*** செலுத்தப்பட்டது ***",
        walk_in_customer: "நேரடி வாடிக்கையாளர்"
      }
    };
    
    const englishText = translations.en[key] || key;
    const tamilText = translations.ta[key] || key;
    
    if (language === 'bilingual') {
      // Return both English and Tamil
      return `<div class="bilingual">
        <div class="english">${englishText}</div>
        <div class="tamil">${tamilText}</div>
      </div>`;
    } else if (language === 'ta') {
      return tamilText;
    } else {
      return englishText;
    }
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to pad strings for receipt alignment
  const padRight = (str, length) => {
    return str + ' '.repeat(Math.max(0, length - str.length));
  };

  const padLeft = (str, length) => {
    return ' '.repeat(Math.max(0, length - str.length)) + str;
  };

  // Helper function to center text


  
  const centerText = (str, width) => {
    const padding = Math.max(0, width - str.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
  };

  // Generate receipt content as plain text with proper formatting
  let receiptContent = `
${centerText(t('supermarket_store'), 32)}
${centerText('123 Main Street, City', 32)}
${centerText('State, Country - 123456', 32)}
${centerText('Phone: +1 234 567 8900', 32)}
${'='.repeat(32)}

${t('bill')} #: ${bill.billNumber}
${t('date')}:  ${formatDate(bill.createdAt)}
${t('cashier')}: ${bill.cashierName}
${'-'.repeat(32)}
  `;

  if (bill.customer || bill.customerInfo) {
    const customerName = bill.customer?.name || bill.customerInfo?.name || t('walk_in_customer');
    const customerPhone = bill.customer?.phone || bill.customerInfo?.phone || '';
    const customerEmail = bill.customer?.email || bill.customerInfo?.email || '';
    
    receiptContent += `
${t('customer')}: ${customerName}
${customerPhone ? `${t('phone')}: ${customerPhone}` : ''}
${customerEmail ? `${t('email')}: ${customerEmail}` : ''}
${'-'.repeat(32)}
    `;
  }

  // Add items section header
  receiptContent += `${t('items')}\n${'-'.repeat(32)}\n`;
  
  // Add items
  bill.items.forEach(item => {
    const baseName = item.product?.name || item.productName || 'Unknown Item';
    const sizeInfo = item.size || item.variantSize ? `(${item.size || item.variantSize})` : '';
    const itemTotal = formatCurrency(item.totalAmount || (item.rate * item.quantity));
    const qtyRate = `${item.quantity}x${formatCurrency(item.rate)}`;
    
    // Handle long item names by wrapping them
    const maxNameLength = 20; // Reduced from 25 to leave more space for amounts
    const displayName = `${baseName} ${sizeInfo}`.trim();
    
    if (displayName.length <= maxNameLength) {
      // Short name - single line
      receiptContent += `${padRight(displayName, maxNameLength)}${padLeft(itemTotal, 12)}\n`;
      receiptContent += `  ${padRight(qtyRate, maxNameLength - 2)}\n`;
    } else {
      // Long name - wrap to multiple lines
      const firstLine = displayName.substring(0, maxNameLength);
      const remainingName = displayName.substring(maxNameLength);
      
      // First line with name start and total
      receiptContent += `${padRight(firstLine, maxNameLength)}${padLeft(itemTotal, 12)}\n`;
      
      // Second line with remaining name (if any)
      if (remainingName.length > 0) {
        const secondLine = remainingName.substring(0, maxNameLength);
        receiptContent += `${padRight(secondLine, maxNameLength)}\n`;
      }
      
      // Quantity and rate line
      receiptContent += `  ${padRight(qtyRate, maxNameLength - 2)}\n`;
    }
    
  });

  // Summary section
  const labelWidth = 20; // Consistent label width
  const valueWidth = 12; // Consistent value width
  
  receiptContent += `
${'-'.repeat(32)}
${padRight(t('subtotal') + ':', labelWidth)}${padLeft(formatCurrency(bill.subtotal), valueWidth)}
`;

  // Add loyalty discount if it exists
  if (bill.loyaltyDiscount && bill.loyaltyDiscount.discountAmount > 0) {
    receiptContent += `${padRight(t('loyalty_discount') + ':', labelWidth)}${padLeft('-' + formatCurrency(bill.loyaltyDiscount.discountAmount), valueWidth)}\n`;
  }

  receiptContent += `${padRight(t('total_tax') + ':', labelWidth)}${padLeft(formatCurrency(bill.totalTax), valueWidth)}\n`;

  if (Math.abs(bill.roundOff) > 0.01) {
    receiptContent += `${padRight(t('round_off') + ':', labelWidth)}${padLeft((bill.roundOff > 0 ? '+' : '') + formatCurrency(bill.roundOff), valueWidth)}\n`;
  }

  receiptContent += `
${'='.repeat(32)}
${padRight(t('total') + ':', labelWidth)}${padLeft(formatCurrency(bill.grandTotal), valueWidth)}
${'='.repeat(32)}

${t('payment_method')}: ${bill.paymentMethod.toUpperCase()}
`;

  if (bill.paymentMethod === 'cash') {
    receiptContent += `
${padRight(t('cash_tendered') + ':', labelWidth)}${padLeft(formatCurrency(bill.cashTendered), valueWidth)}
${padRight(t('change') + ':', labelWidth)}${padLeft(formatCurrency(bill.changeDue), valueWidth)}
`;
  }

  receiptContent += `
${'-'.repeat(32)}
${centerText(t('thank_you'), 32)}
${centerText(t('please_visit_again'), 32)}
${bill.status === 'completed' ? centerText(t('paid'), 32) : ''}
${'='.repeat(32)}
  `;

  return `
    <!DOCTYPE html>
    <html lang="${language === 'ta' ? 'ta' : 'en'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bill ${bill.billNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;700&family=Courier+New:wght@400;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: ${language === 'ta' ? "'Noto Sans Tamil', 'Courier New', monospace" : "'Courier New', monospace"};
          font-size: ${language === 'ta' ? '10px' : '9px'};
          line-height: 1.2;
          background: white;
          color: black;
          padding: 2px;
          max-width: 288px;
          margin: 0 auto;
          white-space: pre;
          letter-spacing: 0.2px;
          font-weight: normal;
          direction: ltr;
        }
        
        /* Bilingual support - show both English and Tamil */
        .bilingual {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }
        
        .tamil {
          font-family: 'Noto Sans Tamil', sans-serif;
          font-size: 9px;
          color: #333;
        }
        
        .english {
          font-family: 'Courier New', monospace;
          font-size: 8px;
          color: #666;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          .tamil {
            font-size: 8px;
          }
          
          .english {
            font-size: 7px;
          }
        }
      </style>
    </head>
    <body>
      ${receiptContent}
    </body>
    </html>
  `;
};

module.exports = {
  generateBillPDF
};
