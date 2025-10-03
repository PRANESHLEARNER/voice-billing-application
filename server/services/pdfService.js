const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Generate PDF bill from HTML template
const generateBillPDF = async (bill) => {
  try {
    console.log('📄 Starting PDF generation for bill:', bill.billNumber);
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
    const htmlTemplate = generateBillHTML(bill);
    
    // Launch Puppeteer browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set HTML content
    await page.setContent(htmlTemplate, {
      waitUntil: 'networkidle0'
    });
    
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
const generateBillHTML = (bill) => {
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
${centerText('SUPERMARKET STORE', 32)}
${centerText('123 Main Street, City', 32)}
${centerText('State, Country - 123456', 32)}
${centerText('Phone: +1 234 567 8900', 32)}
${'='.repeat(32)}

BILL #: ${bill.billNumber}
DATE:  ${formatDate(bill.createdAt)}
CASHIER: ${bill.cashierName}
${'-'.repeat(32)}
  `;

  if (bill.customer || bill.customerInfo) {
    const customerName = bill.customer?.name || bill.customerInfo?.name || 'Walk-in Customer';
    const customerPhone = bill.customer?.phone || bill.customerInfo?.phone || '';
    const customerEmail = bill.customer?.email || bill.customerInfo?.email || '';
    
    receiptContent += `
CUSTOMER: ${customerName}
${customerPhone ? `PHONE: ${customerPhone}` : ''}
${customerEmail ? `EMAIL: ${customerEmail}` : ''}
${'-'.repeat(32)}
    `;
  }

  // Add items section header
  receiptContent += `ITEMS\n${'-'.repeat(32)}\n`;
  
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
${padRight('SUBTOTAL:', labelWidth)}${padLeft(formatCurrency(bill.subtotal), valueWidth)}
`;

  // Add loyalty discount if it exists
  if (bill.loyaltyDiscount && bill.loyaltyDiscount.discountAmount > 0) {
    receiptContent += `${padRight('LOYALTY DISCOUNT:', labelWidth)}${padLeft('-' + formatCurrency(bill.loyaltyDiscount.discountAmount), valueWidth)}\n`;
  }

  receiptContent += `${padRight('TOTAL TAX:', labelWidth)}${padLeft(formatCurrency(bill.totalTax), valueWidth)}\n`;

  if (Math.abs(bill.roundOff) > 0.01) {
    receiptContent += `${padRight('ROUND OFF:', labelWidth)}${padLeft((bill.roundOff > 0 ? '+' : '') + formatCurrency(bill.roundOff), valueWidth)}\n`;
  }

  receiptContent += `
${'='.repeat(32)}
${padRight('TOTAL:', labelWidth)}${padLeft(formatCurrency(bill.grandTotal), valueWidth)}
${'='.repeat(32)}

PAYMENT METHOD: ${bill.paymentMethod.toUpperCase()}
`;

  if (bill.paymentMethod === 'cash') {
    receiptContent += `
${padRight('CASH TENDERED:', labelWidth)}${padLeft(formatCurrency(bill.cashTendered), valueWidth)}
${padRight('CHANGE:', labelWidth)}${padLeft(formatCurrency(bill.changeDue), valueWidth)}
`;
  }

  receiptContent += `
${'-'.repeat(32)}
${centerText('THANK YOU FOR YOUR PURCHASE!', 32)}
${centerText('PLEASE VISIT AGAIN', 32)}
${bill.status === 'completed' ? centerText('*** PAID ***', 32) : ''}
${'='.repeat(32)}
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bill ${bill.billNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', monospace;
          font-size: 9px;
          line-height: 1.2;
          background: white;
          color: black;
          padding: 2px;
          max-width: 288px;
          margin: 0 auto;
          white-space: pre;
          letter-spacing: 0.2px;
          font-weight: normal;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
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
