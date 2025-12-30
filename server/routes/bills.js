const express = require("express");
const Bill = require("../models/Bill");
const Product = require("../models/Product");
const Shift = require("../models/Shift");
const Discount = require("../models/Discount");
const { auth } = require("../middleware/auth");
const { checkProductStock } = require("../services/stockMonitor");
const { sendBillByEmail } = require("../services/emailService");

const router = express.Router();

/**
 * POST /api/bills
 * Create a new bill
 */
router.post("/", auth, async (req, res) => {
  try {
    const { items, customer, cashTendered = 0, paymentMethod, paymentDetails, paymentBreakdown, applyLoyaltyDiscount = false } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided for the bill." });
    }

    // Totals
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    const discountUsageMap = new Map(); // Track discount usage for recording

    const processedItems = await Promise.all(
      items.map(async (item) => {
        if (!item.product) {
          throw new Error("Each item must include a product id");
        }

        const product = await Product.findById(item.product).lean();
        if (!product) {
          throw new Error(`Product not found: ${item.product}`);
        }

        // Handle variant selection
        let selectedVariant = null;
        let variantSize = item.size || "Default";
        let variantPrice = Number(item.rate);
        
        if (item.size && product.variants && product.variants.length > 0) {
          selectedVariant = product.variants.find(v => v.size === item.size);
          if (!selectedVariant) {
            throw new Error(`Variant not found: ${item.size} for product: ${product.name}`);
          }
          
          // Check if variant is active
          if (!selectedVariant.isActive) {
            throw new Error(`Variant ${item.size} is not active for product: ${product.name}`);
          }
          
          // Check stock
          if (selectedVariant.stock < item.quantity) {
            throw new Error(`Insufficient stock for variant ${item.size}. Available: ${selectedVariant.stock}, Required: ${item.quantity}`);
          }
          
          variantSize = selectedVariant.size;
          variantPrice = selectedVariant.price;
        } else {
          // Fallback for old product structure
          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for product: ${product.name}. Available: ${product.stock}, Required: ${item.quantity}`);
          }
        }

        // Use discount information from frontend if provided, otherwise find best applicable discount
        const amount = Number(item.quantity) * variantPrice;
        let discountAmount = 0;
        let discountInfo = null;
        
        if (item.discount && item.discount.discountId) {
          // Use the discount information sent from frontend
          discountAmount = item.discount.discountAmount || 0;
          discountInfo = {
            discountId: item.discount.discountId,
            discountName: item.discount.discountName,
            discountType: item.discount.discountType,
            discountValue: item.discount.discountValue,
            discountAmount: discountAmount
          };
          
          // Track discount usage
          const discountId = item.discount.discountId.toString();
          discountUsageMap.set(discountId, (discountUsageMap.get(discountId) || 0) + 1);
        } else {
          // Fallback: Find the best applicable discount for this product
          const bestDiscount = await Discount.findBestDiscountForProduct(
            product._id,
            item.quantity
          );
          
          if (bestDiscount) {
            discountAmount = bestDiscount.discountAmount;
            discountInfo = {
              discountId: bestDiscount.discount._id,
              discountName: bestDiscount.discount.name,
              discountType: bestDiscount.discount.type,
              discountValue: bestDiscount.discount.value,
              discountAmount: bestDiscount.discountAmount
            };
            
            // Track discount usage
            const discountId = bestDiscount.discount._id.toString();
            discountUsageMap.set(discountId, (discountUsageMap.get(discountId) || 0) + 1);
          }
        }

        const discountedAmount = amount - discountAmount;
        const taxAmount = discountedAmount * (Number(item.taxRate) / 100);
        const totalAmount = discountedAmount + taxAmount;

        subtotal += discountedAmount;
        totalTax += taxAmount;
        totalDiscount += discountAmount;

        return {
          ...item,
          productCode: product.code,
          productName: product.name,
          variantSize: variantSize,
          variantSku: selectedVariant ? selectedVariant.sku : null,
          amount: discountedAmount,
          taxAmount,
          totalAmount,
          discount: discountInfo
        };
      })
    );

    // Record discount usage
    for (const [discountId, usageCount] of discountUsageMap) {
      await Discount.recordUsage(discountId, usageCount);
    }

    // Apply loyalty discount if eligible
    let loyaltyDiscountAmount = 0;
    let loyaltyDiscountInfo = null;
    
    if (applyLoyaltyDiscount && customer && customer.phone) {
      // Clean phone number
      const cleanedPhone = customer.phone.replace(/[^\d]/g, '');
      
      // Count previous completed bills for this customer
      const previousPurchaseCount = await Bill.countDocuments({
        "customer.phone": cleanedPhone,
        status: "completed"
      });
      
      // Apply 2% discount after 10 purchases
      if (previousPurchaseCount >= 10) {
        loyaltyDiscountAmount = Math.round((subtotal + totalTax) * 0.02); // 2% discount
        loyaltyDiscountInfo = {
          discountId: "loyalty_discount",
          discountName: "Loyalty Discount (2%)",
          discountType: "percentage",
          discountValue: 2,
          discountAmount: loyaltyDiscountAmount
        };
        totalDiscount += loyaltyDiscountAmount;
      }
    }

    const grandTotal = subtotal + totalTax - loyaltyDiscountAmount;
    const roundOff = Math.round(grandTotal) - grandTotal;
    const finalTotal = Math.round(grandTotal);
    const changeDue = Math.max(0, cashTendered - finalTotal);

    // Active shift for the cashier, if any
    const activeShift = await Shift.findOne({
      cashier: req.user._id,
      status: "active",
    }).lean();

    const bill = new Bill({
      items: processedItems,
      customer,
      subtotal,
      totalDiscount,
      totalTax,
      roundOff,
      grandTotal: finalTotal,
      cashTendered,
      changeDue,
      paymentMethod,
      paymentDetails,
      paymentBreakdown,
      loyaltyDiscount: loyaltyDiscountInfo,
      cashier: req.user._id,
      cashierName: req.user.name,
      shift: activeShift?._id,
    });

    await bill.save();

    // Update shift totals if shift is active
    if (activeShift) {
      await Shift.findByIdAndUpdate(activeShift._id, {
        $inc: { totalSales: finalTotal, totalBills: 1 },
      });
    }

    // Decrement product stock and check for low/out of stock
    for (const item of processedItems) {
      if (item.variantSku) {
        // Update variant stock
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: item.product, "variants.sku": item.variantSku },
          { $inc: { "variants.$.stock": -item.quantity } },
          { new: true }
        );
        
        if (!updatedProduct) {
          throw new Error(`Failed to update stock for variant: ${item.variantSku}`);
        }
      } else {
        // Fallback for old product structure
        const updatedProduct = await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        }, { new: true });
        
        if (!updatedProduct) {
          throw new Error(`Failed to update stock for product: ${item.productName}`);
        }
      }
      
      // Check stock levels after update and send notifications if needed
      await checkProductStock(item.product);
    }

    await bill.populate("items.product");
    
    // Transform the bill items to map variantSize to size for frontend compatibility
    const transformedBill = {
      ...bill.toObject(),
      items: bill.items.map(item => ({
        ...item.toObject(),
        size: item.variantSize  // Map variantSize to size for frontend
      }))
    };
    
    res.status(201).json(transformedBill);
  } catch (error) {
    console.error("Error creating bill:", error);
    res.status(500).json({
      message: "Failed to create bill",
      error: error.message,
    });
  }
});

/**
 * GET /api/bills
 * List bills with search and pagination
 */
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, startDate, endDate, cashier, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { billNumber: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.phone": { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (cashier) query.cashier = cashier;
    if (status) query.status = status;

    const bills = await Bill.find(query)
      .populate("cashier", "name employeeId")
      .populate("items.product")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Bill.countDocuments(query);
    
    // Transform the bills to map variantSize to size for frontend compatibility
    const transformedBills = bills.map(bill => ({
      ...bill.toObject(),
      items: bill.items.map(item => ({
        ...item.toObject(),
        size: item.variantSize  // Map variantSize to size for frontend
      }))
    }));

    res.json({
      bills: transformedBills,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total,
    });
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).json({ message: "Failed to fetch bills", error: error.message });
  }
});

/**
 * GET /api/bills/:id
 * Retrieve a single bill by ID
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate("items.product")
      .populate("cashier", "name employeeId");

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    // Transform the bill to map variantSize to size for frontend compatibility
    const transformedBill = {
      ...bill.toObject(),
      items: bill.items.map(item => ({
        ...item.toObject(),
        size: item.variantSize  // Map variantSize to size for frontend
      }))
    };

    res.json(transformedBill);
  } catch (error) {
    console.error("Error fetching bill:", error);
    res.status(500).json({ message: "Failed to fetch bill", error: error.message });
  }

});


/**
 * DELETE /api/bills/:id
 * Delete a single bill by ID
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    await Bill.findByIdAndDelete(req.params.id);
    
    res.json({ message: "Bill deleted successfully" });
  } catch (error) {
    console.error("Error deleting bill:", error);
    res.status(500).json({ message: "Failed to delete bill", error: error.message });
  }
});


/**
 * POST /api/bills/:id/send-email
 * Send bill via email
 */
router.post("/:id/send-email", auth, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email address is required" });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    
    const bill = await Bill.findById(req.params.id).populate("items.product");
    
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    
    // Transform the bill items to map variantSize to size for email compatibility
    const transformedBill = {
      ...bill.toObject(),
      items: bill.items.map(item => ({
        ...item.toObject(),
        size: item.variantSize  // Map variantSize to size for email template
      }))
    };
    
    // Send the bill via email
    await sendBillByEmail(transformedBill, email);
    
    res.json({ message: "Bill sent successfully via email" });
  } catch (error) {
    console.error("Error sending bill via email:", error);
    res.status(500).json({ 
      message: "Failed to send bill via email", 
      error: error.message 
    });
  }
});


/**
 * GET /api/bills/:id/pdf
 * Generate and download PDF for a specific bill
 */
router.get("/:id/pdf", auth, async (req, res) => {
  try {
    const { language = 'en' } = req.query;
    const bill = await Bill.findById(req.params.id).populate("items.product");
    
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    
    // Import the PDF service
    const { generateBillPDF } = require("../services/pdfService");
    
    // Transform the bill for PDF compatibility
    const billObj = bill.toObject();
    const transformedBill = {
      ...billObj,
      // Include loyalty discount if it exists
      ...(billObj.loyaltyDiscount && { loyaltyDiscount: billObj.loyaltyDiscount }),
      // Map variantSize to size for PDF template
      items: bill.items.map(item => ({
        ...item.toObject(),
        size: item.variantSize
      }))
    };
    
    console.log('PDF Generation - Bill data:', JSON.stringify({
      billNumber: bill.billNumber,
      hasLoyaltyDiscount: !!bill.loyaltyDiscount,
      loyaltyDiscount: bill.loyaltyDiscount,
      subtotal: bill.subtotal,
      totalTax: bill.totalTax,
      grandTotal: bill.grandTotal,
      language: language
    }, null, 2));
    
    // Generate PDF with language
    const pdfBuffer = await generateBillPDF(transformedBill, language);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bill_${bill.billNumber}_${language}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send the PDF buffer
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ 
      message: "Failed to generate PDF", 
      error: error.message 
    });
  }
});


/**
 * POST /api/bills/:id/whatsapp
 * Send bill via WhatsApp
 */
router.post("/:id/whatsapp", auth, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required" });
    }
    
    const bill = await Bill.findById(req.params.id).populate("items.product");
    
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    
    // Transform the bill items to map variantSize to size for WhatsApp compatibility
    const transformedBill = {
      ...bill.toObject(),
      items: bill.items.map(item => ({
        ...item.toObject(),
        size: item.variantSize  // Map variantSize to size for message template
      }))
    };
    
    // Send bill via WhatsApp
    const { sendBillViaWhatsApp } = require("../services/whatsappService");
    const result = await sendBillViaWhatsApp(transformedBill, phoneNumber);
    
    res.json({
      success: true,
      message: "Bill prepared for WhatsApp sending",
      whatsappUrl: result.whatsappUrl,
      phoneNumber: result.phoneNumber,
      billNumber: bill.billNumber
    });
    
  } catch (error) {
    console.error("Error sending bill via WhatsApp:", error);
    res.status(500).json({ 
      message: "Failed to send bill via WhatsApp", 
      error: error.message 
    });
  }
});

/**
 * GET /api/bills/customer/:phone/purchase-count
 * Get customer purchase count for loyalty discount
 */
router.get("/customer/:phone/purchase-count", auth, async (req, res) => {
  try {
    const { phone } = req.params;
    
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }
    
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanedPhone = phone.replace(/[^\d]/g, '');
    
    // Count all completed bills for this customer
    const purchaseCount = await Bill.countDocuments({
      "customer.phone": cleanedPhone,
      status: "completed"
    });
    
    // Check if customer is eligible for loyalty discount (10th purchase)
    const isEligible = purchaseCount >= 9; // 9 previous purchases, current would be 10th
    
    res.json({
      phone: cleanedPhone,
      purchaseCount,
      isEligible,
      nextPurchaseForDiscount: 10 - purchaseCount
    });
    
  } catch (error) {
    console.error("Error getting customer purchase count:", error);
    res.status(500).json({ 
      message: "Failed to get customer purchase count", 
      error: error.message 
    });
  }
});

module.exports = router;
