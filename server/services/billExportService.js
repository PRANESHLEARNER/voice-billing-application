const JSZip = require('jszip');
const Bill = require('../models/Bill');
const fs = require('fs');
const path = require('path');

/**
 * Create a CSV string from bill data
 * @param {Array} bills - Array of bill objects
 * @returns {string} CSV content
 */
function createBillCSV(bills) {
  const headers = [
    'Bill ID',
    'Date',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Payment Method',
    'Subtotal',
    'Tax',
    'Discount',
    'Total Amount',
    'Cash Tendered',
    'Change Due',
    'Items Count',
    'Cashier Name',
    'Cashier Email'
  ];

  const rows = bills.map(bill => [
    bill._id.toString(),
    new Date(bill.createdAt).toLocaleString(),
    bill.customer?.name || '',
    bill.customer?.email || '',
    bill.customer?.phone || '',
    bill.paymentMethod || '',
    bill.subtotal || 0,
    bill.totalTax || 0,
    bill.totalDiscount || 0,
    bill.finalTotal || 0,
    bill.cashTendered || 0,
    bill.changeDue || 0,
    bill.items?.length || 0,
    bill.cashier?.name || '',
    bill.cashier?.email || ''
  ]);

  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
}

/**
 * Create a detailed JSON file with bill data
 * @param {Array} bills - Array of bill objects
 * @returns {string} JSON content
 */
function createBillJSON(bills) {
  const exportData = {
    exportDate: new Date().toISOString(),
    totalBills: bills.length,
    bills: bills.map(bill => ({
      id: bill._id,
      date: bill.createdAt,
      customer: bill.customer,
      paymentMethod: bill.paymentMethod,
      paymentDetails: bill.paymentDetails,
      paymentBreakdown: bill.paymentBreakdown,
      subtotal: bill.subtotal,
      totalTax: bill.totalTax,
      totalDiscount: bill.totalDiscount,
      finalTotal: bill.finalTotal,
      cashTendered: bill.cashTendered,
      changeDue: bill.changeDue,
      items: bill.items,
      cashier: {
        id: bill.cashier?._id,
        name: bill.cashier?.name,
        email: bill.cashier?.email
      },
      shift: bill.shift
    }))
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Create a detailed text file with bill information
 * @param {Array} bills - Array of bill objects
 * @returns {string} Text content
 */
function createBillText(bills) {
  let content = `BILL EXPORT REPORT\n`;
  content += `==================\n\n`;
  content += `Export Date: ${new Date().toLocaleString()}\n`;
  content += `Total Bills: ${bills.length}\n\n`;
  content += `SUMMARY\n-------\n`;
  
  const totals = bills.reduce((acc, bill) => {
    acc.subtotal += bill.subtotal || 0;
    acc.tax += bill.totalTax || 0;
    acc.discount += bill.totalDiscount || 0;
    acc.total += bill.finalTotal || 0;
    return acc;
  }, { subtotal: 0, tax: 0, discount: 0, total: 0 });

  content += `Total Subtotal: ₹${totals.subtotal.toFixed(2)}\n`;
  content += `Total Tax: ₹${totals.tax.toFixed(2)}\n`;
  content += `Total Discount: ₹${totals.discount.toFixed(2)}\n`;
  content += `Total Amount: ₹${totals.total.toFixed(2)}\n\n`;

  content += `DETAILED BILLS\n==============\n\n`;

  bills.forEach((bill, index) => {
    content += `Bill #${index + 1}\n`;
    content += `-----------\n`;
    content += `ID: ${bill._id}\n`;
    content += `Date: ${new Date(bill.createdAt).toLocaleString()}\n`;
    content += `Customer: ${bill.customer?.name || 'Walk-in'}\n`;
    content += `Payment Method: ${bill.paymentMethod}\n`;
    content += `Total Amount: ₹${bill.finalTotal?.toFixed(2) || '0.00'}\n`;
    content += `Items: ${bill.items?.length || 0}\n`;
    content += `Cashier: ${bill.cashier?.name || 'Unknown'}\n\n`;

    if (bill.items && bill.items.length > 0) {
      content += `Items:\n`;
      bill.items.forEach((item, itemIndex) => {
        content += `  ${itemIndex + 1}. ${item.productName || item.product}`;
        if (item.size) content += ` (${item.size})`;
        content += ` - Qty: ${item.quantity}, Rate: ₹${item.rate?.toFixed(2) || '0.00'}`;
        if (item.discount) content += `, Discount: ₹${item.discount?.discountAmount?.toFixed(2) || '0.00'}`;
        content += `\n`;
      });
      content += `\n`;
    }

    content += `---\n\n`;
  });

  return content;
}

/**
 * Export all bills to a ZIP file
 * @returns {Promise<Buffer>} ZIP file buffer
 */
async function exportBillsToZip() {
  try {
    // Fetch all bills with populated data
    const bills = await Bill.find({})
      .populate('cashier', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    if (!bills || bills.length === 0) {
      throw new Error('No bills found to export');
    }

    const zip = new JSZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filenamePrefix = `bills_export_${timestamp}`;

    // Add CSV file
    const csvContent = createBillCSV(bills);
    zip.file(`${filenamePrefix}.csv`, csvContent);

    // Add JSON file
    const jsonContent = createBillJSON(bills);
    zip.file(`${filenamePrefix}.json`, jsonContent);

    // Add text file
    const textContent = createBillText(bills);
    zip.file(`${filenamePrefix}.txt`, textContent);

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return {
      buffer: zipBuffer,
      filename: `${filenamePrefix}.zip`,
      billCount: bills.length,
      summary: {
        totalBills: bills.length,
        totalAmount: bills.reduce((sum, bill) => sum + (bill.finalTotal || 0), 0),
        exportDate: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Error exporting bills to ZIP:', error);
    throw error;
  }
}

module.exports = {
  exportBillsToZip,
  createBillCSV,
  createBillJSON,
  createBillText
};
