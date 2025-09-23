const mongoose = require('mongoose');
const User = require('./server/models/User');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const puppeteer = require('puppeteer');
require('dotenv').config();

async function generateBillPDF(bill, outputPath) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Create HTML content for the bill
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bill #${bill.billNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .bill-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .customer-info { margin-bottom: 20px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .totals { text-align: right; margin-top: 20px; }
        .payment-info { margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>Supermarket Billing System</h2>
        <h3>Bill #${bill.billNumber}</h3>
        <p>Date: ${new Date(bill.createdAt).toLocaleDateString()}</p>
      </div>
      
      <div class="bill-info">
        <div>
          <strong>Cashier:</strong> ${bill.cashierName || 'N/A'}<br>
          <strong>Bill Number:</strong> ${bill.billNumber}
        </div>
        <div>
          <strong>Date:</strong> ${new Date(bill.createdAt).toLocaleString()}<br>
          <strong>Status:</strong> ${bill.status || 'Completed'}
        </div>
      </div>
      
      ${bill.customerInfo ? `
      <div class="customer-info">
        <h4>Customer Information</h4>
        <p><strong>Name:</strong> ${bill.customerInfo.name || 'N/A'}</p>
        <p><strong>Phone:</strong> ${bill.customerInfo.phone || 'N/A'}</p>
        <p><strong>Email:</strong> ${bill.customerInfo.email || 'N/A'}</p>
        ${bill.customerInfo.address ? `<p><strong>Address:</strong> ${bill.customerInfo.address}</p>` : ''}
        ${bill.customerInfo.gst ? `<p><strong>GST:</strong> ${bill.customerInfo.gst}</p>` : ''}
      </div>
      ` : ''}
      
      <table class="items-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Discount</th>
            <th>Tax</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${bill.items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.name}${item.size ? ` (${item.size})` : ''}</td>
              <td>${item.quantity}</td>
              <td>₹${item.rate.toFixed(2)}</td>
              <td>₹${item.discount.toFixed(2)}</td>
              <td>₹${item.tax.toFixed(2)}</td>
              <td>₹${item.amount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="totals">
        <p><strong>Subtotal:</strong> ₹${bill.subtotal.toFixed(2)}</p>
        <p><strong>Tax Amount:</strong> ₹${bill.taxAmount.toFixed(2)}</p>
        <p><strong>Discount Amount:</strong> ₹${bill.discountAmount.toFixed(2)}</p>
        <p><strong><u>Total Amount:</u></strong> ₹${bill.totalAmount.toFixed(2)}</p>
      </div>
      
      ${bill.paymentDetails ? `
      <div class="payment-info">
        <h4>Payment Information</h4>
        <p><strong>Payment Method:</strong> ${bill.paymentDetails.method || 'N/A'}</p>
        <p><strong>Payment Status:</strong> ${bill.paymentDetails.status || 'Completed'}</p>
        ${bill.paymentDetails.cashTendered ? `<p><strong>Cash Tendered:</strong> ₹${bill.paymentDetails.cashTendered.toFixed(2)}</p>` : ''}
        ${bill.paymentDetails.changeDue ? `<p><strong>Change Due:</strong> ₹${bill.paymentDetails.changeDue.toFixed(2)}</p>` : ''}
      </div>
      ` : ''}
    </body>
    </html>
  `;
  
  await page.setContent(htmlContent);
  await page.pdf({ 
    path: outputPath, 
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      bottom: '20px',
      left: '20px',
      right: '20px'
    }
  });
  
  await browser.close();
  return outputPath;
}

async function createZipBackup(bills, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log(`Zip file created: ${zipPath} (${archive.pointer()} total bytes)`);
      resolve(zipPath);
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    
    // Add each PDF file to the zip
    bills.forEach(bill => {
      const pdfPath = path.join(path.dirname(zipPath), `bill_${bill.billNumber}.pdf`);
      if (fs.existsSync(pdfPath)) {
        archive.file(pdfPath, { name: `bill_${bill.billNumber}.pdf` });
      }
    });
    
    archive.finalize();
  });
}

async function backupBillsToPDF(bills, backupDir) {
  console.log(`Starting PDF backup for ${bills.length} bills...`);
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const pdfPaths = [];
  
  for (let i = 0; i < bills.length; i++) {
    const bill = bills[i];
    const pdfPath = path.join(backupDir, `bill_${bill.billNumber}.pdf`);
    
    try {
      console.log(`Generating PDF for bill #${bill.billNumber} (${i + 1}/${bills.length})...`);
      await generateBillPDF(bill, pdfPath);
      pdfPaths.push(pdfPath);
    } catch (error) {
      console.error(`Error generating PDF for bill #${bill.billNumber}:`, error.message);
    }
  }
  
  console.log(`PDF backup completed. Generated ${pdfPaths.length} PDF files.`);
  return pdfPaths;
}

async function backupAllBills() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/supermarket-billing', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Find an admin user
    const adminUser = await User.findOne({ isAdmin: true });
    
    if (!adminUser) {
      console.log('No admin user found. Please create an admin user first.');
      process.exit(1);
    }
    
    console.log(`Found admin user: ${adminUser.name}`);
    
    // Import the Bill model
    const Bill = require('./server/models/Bill');
    
    // Get all bills before deletion
    const bills = await Bill.find({}).sort({ createdAt: -1 });
    console.log(`Found ${bills.length} bills to process`);
    
    if (bills.length === 0) {
      console.log('No bills to delete.');
      process.exit(0);
    }
    
    // Create backup directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = path.join(__dirname, `bills_backup_${timestamp}`);
    const zipPath = path.join(__dirname, `bills_backup_${timestamp}.zip`);
    
    console.log(`Creating backup in directory: ${backupDir}`);
    
    // Step 1: Generate PDF backups
    console.log('\n=== Step 1: Generating PDF backups ===');
    const pdfPaths = await backupBillsToPDF(bills, backupDir);
    
    if (pdfPaths.length === 0) {
      console.log('No PDF files were generated. Aborting deletion.');
      process.exit(1);
    }
    
    // Step 2: Create zip file
    console.log('\n=== Step 2: Creating zip archive ===');
    await createZipBackup(bills, zipPath);
    
    // Step 3: Clean up individual PDF files (optional - keep them if you want)
    console.log('\n=== Step 3: Cleaning up temporary PDF files ===');
    pdfPaths.forEach(pdfPath => {
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
        console.log(`Deleted temporary PDF: ${pdfPath}`);
      }
    });
    
    // Remove the backup directory if empty
    if (fs.existsSync(backupDir)) {
      fs.rmdirSync(backupDir);
      console.log(`Removed temporary directory: ${backupDir}`);
    }
    
    // Final summary
    console.log('\n=== Backup Process Completed Successfully ===');
    console.log(`✅ Backup created: ${zipPath}`);
    console.log(`✅ Bills backed up: ${pdfPaths.length}`);
    console.log(`\nBackup file location: ${zipPath}`);
    console.log('No bills were deleted from the database.');
    console.log('Please store this backup file safely for future reference.');
    
    // Close the connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error in backupAllBills process:', error);
    process.exit(1);
  }
}

// Run the function
backupAllBills();