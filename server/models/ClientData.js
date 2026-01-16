const mongoose = require("mongoose")

const fileSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["SKU_LIST", "TAX_PROOF", "BILL_SAMPLE"],
      required: true,
    },
    originalName: String,
    filename: String,
    path: String,
    mimeType: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    meta: {
      totalItems: Number,
      notes: String,
    },
  },
  { _id: false },
)

const clientDataSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["missing", "draft", "pending_review", "complete", "reopened"],
      default: "missing",
    },
    businessProfile: {
      storeName: String,
      storeAddress: String,
      taxId: String,
      contactName: String,
      contactPhone: String,
      contactEmail: String,
    },
    taxConfig: {
      currency: { type: String, default: "INR" },
      regime: {
        type: String,
        enum: ["gst", "vat", "none", "other"],
        default: "gst",
      },
      roundingPreference: {
        type: String,
        enum: ["nearest_1", "nearest_0_5", "none"],
        default: "nearest_1",
      },
      notes: String,
    },
    itemMasterSummary: {
      totalItems: Number,
      lastUploadedAt: Date,
      templateVersion: String,
    },
    receiptSample: {
      provided: {
        type: Boolean,
        default: false,
      },
      useSystemDefault: {
        type: Boolean,
        default: true,
      },
      notes: String,
    },
    files: [fileSchema],
    audit: {
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      submittedAt: Date,
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvedAt: Date,
      lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      lastUpdatedAt: Date,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model("ClientData", clientDataSchema)
