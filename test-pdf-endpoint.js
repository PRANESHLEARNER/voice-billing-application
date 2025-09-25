const mongoose = require('mongoose');
const Bill = require('./server/models/Bill');
const Product = require('./server/models/Product');
const express = require('express');
const cors = require('cors');
const { generateBillPDF } = require('./server/services/pdfService');
require('dotenv').config({ path: '.env.local' });

// Test PDF generation with a sample bill
async function testPDFGeneration() {
  try {
    console.log('🧪 Testing PDF generation...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://deepan09112004:deepan@billing-software.9ovfewp.mongodb.net/");
    console.log('✅ Connected to database');
    
    // Check if there are any bills
    const bills = await Bill.find().populate('items.product').limit(1);
    
    if (bills.length === 0) {
      console.log('❌ No bills found in database. Creating a test bill...');
      
      // Check if there are any products
      const products = await Product.find().limit(1);
      
      if (products.length === 0) {
        console.log('❌ No products found. Cannot create test bill.');
        return;
      }
      
      // Create a test bill
      const testBill = new Bill({
        billNumber: 'TEST-001',
        cashierName: 'Test Cashier',
        customerInfo: {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '1234567890'
        },
        items: [{
          product: products[0]._id,
          productName: products[0].name,
          quantity: 1,
          rate: products[0].price,
          taxRate: 0,
          amount: products[0].price,
          taxAmount: 0,
          totalAmount: products[0].price
        }],
        subtotal: products[0].price,
        totalTax: 0,
        totalDiscount: 0,
        grandTotal: products[0].price,
        paymentMethod: 'cash',
        status: 'completed'
      });
      
      await testBill.save();
      console.log('✅ Created test bill:', testBill.billNumber);
      
      // Generate PDF
      const pdfBuffer = await generateBillPDF(testBill);
      console.log('✅ PDF generated successfully!');
      console.log('📄 PDF size:', pdfBuffer.length, 'bytes');
      
      // Clean up
      await Bill.findByIdAndDelete(testBill._id);
      console.log('🧹 Cleaned up test bill');
      
    } else {
      console.log('✅ Found bill:', bills[0].billNumber);
      
      // Generate PDF
      const pdfBuffer = await generateBillPDF(bills[0]);
      console.log('✅ PDF generated successfully!');
      console.log('📄 PDF size:', pdfBuffer.length, 'bytes');
    }
    
    console.log('🎉 PDF generation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing PDF generation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the test
testPDFGeneration();
