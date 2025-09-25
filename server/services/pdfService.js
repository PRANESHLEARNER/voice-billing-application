const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Generate PDF bill from HTML template
const generateBillPDF = async (bill) => {
  try {
    console.log('📄 Starting PDF generation for bill:', bill.billNumber);
    
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
     *************************************
     *${centerText('SUPERMARKET STORE', 35)}*
     *${centerText('123 Main Street, City', 35)}*
     *${centerText('State, Country - 123456', 35)}*
     *${centerText('Phone: +1 234 567 8900', 35)}*
     *************************************

BILL #: ${bill.billNumber}
DATE:  ${formatDate(bill.createdAt)}
CASHIER: ${bill.cashierName}
-------------------------------------
  `;

  if (bill.customer || bill.customerInfo) {
    const customerName = bill.customer?.name || bill.customerInfo?.name || 'Walk-in Customer';
    const customerPhone = bill.customer?.phone || bill.customerInfo?.phone || '';
    const customerEmail = bill.customer?.email || bill.customerInfo?.email || '';
    
    receiptContent += `
CUSTOMER: ${customerName}
${customerPhone ? `PHONE: ${customerPhone}` : ''}
${customerEmail ? `EMAIL: ${customerEmail}` : ''}
-------------------------------------
    `;
  }

  // Add items section header
  receiptContent += `ITEMS\n`;
  
  // Add items
  bill.items.forEach(item => {
    const itemName = `${item.product?.name || item.productName || 'Unknown Item'} ${item.size || item.variantSize ? `(${item.size || item.variantSize})` : ''}`;
    const itemTotal = formatCurrency(item.totalAmount || (item.rate * item.quantity));
    const qtyRate = `${item.quantity}x${formatCurrency(item.rate)}`;
    
    // Item name and total (40 characters total)
    receiptContent += `${padRight(itemName, 25)}${padLeft(itemTotal, 11)}\n`;
    // Quantity and rate (indented, 40 characters total)
    receiptContent += `  ${padRight(qtyRate, 23)}\n`;
    
  });

  // Summary section
  receiptContent += `
-------------------------------------
${padRight('SUBTOTAL:', 25)}${padLeft(formatCurrency(bill.subtotal), 12)}
`;

  receiptContent += `${padRight('TOTAL TAX:', 25)}${padLeft(formatCurrency(bill.totalTax), 12)}\n`;

  if (Math.abs(bill.roundOff) > 0.01) {
    receiptContent += `${padRight('ROUND OFF:', 25)}${padLeft((bill.roundOff > 0 ? '+' : '') + formatCurrency(bill.roundOff), 12)}\n`;
  }

  receiptContent += `
======================================
${padRight('TOTAL:', 25)}${padLeft(formatCurrency(bill.grandTotal), 12)}
======================================

PAYMENT METHOD: ${bill.paymentMethod.toUpperCase()}
`;

  if (bill.paymentMethod === 'cash') {
    receiptContent += `
${padRight('CASH TENDERED:', 25)}${padLeft(formatCurrency(bill.cashTendered), 12)}
${padRight('CHANGE:', 25)}${padLeft(formatCurrency(bill.changeDue), 12)}
`;
  }

  receiptContent += `
--------------------------------------
   THANK YOU FOR YOUR PURCHASE!
       PLEASE VISIT AGAIN
         ${bill.status === 'completed' ? '  *** PAID ***' : ''}
**************************************
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
