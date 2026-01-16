const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const ClientData = require("../models/ClientData")
const { auth, adminAuth } = require("../middleware/auth")

const router = express.Router()

const uploadDir = path.join(__dirname, "../uploads/client-data")
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".csv", ".xlsx", ".xls", ".pdf", ".jpeg", ".jpg", ".png"]
    const allowedMimePatterns = [
      /^text\/csv$/,
      /spreadsheetml\.sheet$/,
      /ms-excel$/,
      /^application\/pdf$/,
      /^image\/jpeg$/,
      /^image\/png$/,
    ]

    const extname = allowedExtensions.includes(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedMimePatterns.some((pattern) => pattern.test(file.mimetype))

    if (extname || mimetype) {
      return cb(null, true)
    }
    cb(new Error("Unsupported file format"))
  },
})

async function ensureClientData(userId) {
  let clientData = await ClientData.findOne({ user: userId })
  if (!clientData) {
    clientData = await ClientData.create({ user: userId })
  }
  return clientData
}

router.get("/me", auth, async (req, res) => {
  try {
    const clientData = await ensureClientData(req.user._id)
    res.json(clientData)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.patch("/me", auth, async (req, res) => {
  try {
    const clientData = await ensureClientData(req.user._id)
    const { businessProfile, taxConfig, itemMasterSummary, receiptSample, status } = req.body

    if (businessProfile) {
      clientData.businessProfile = {
        ...clientData.businessProfile?.toObject?.() || clientData.businessProfile,
        ...businessProfile,
      }
    }

    if (taxConfig) {
      clientData.taxConfig = {
        ...clientData.taxConfig?.toObject?.() || clientData.taxConfig,
        ...taxConfig,
      }
    }

    if (itemMasterSummary) {
      clientData.itemMasterSummary = {
        ...clientData.itemMasterSummary?.toObject?.() || clientData.itemMasterSummary,
        ...itemMasterSummary,
      }
    }

    if (receiptSample) {
      clientData.receiptSample = {
        ...clientData.receiptSample?.toObject?.() || clientData.receiptSample,
        ...receiptSample,
      }
    }

    if (status) {
      clientData.status = status
    } else if (clientData.status === "missing") {
      clientData.status = "draft"
    }

    clientData.audit.lastUpdatedBy = req.user._id
    clientData.audit.lastUpdatedAt = new Date()

    await clientData.save()
    res.json(clientData)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post("/me/submit", auth, async (req, res) => {
  try {
    const { autoApprove } = req.body || {}
    const clientData = await ensureClientData(req.user._id)

    clientData.status = autoApprove ? "complete" : "pending_review"
    clientData.audit.submittedBy = req.user._id
    clientData.audit.submittedAt = new Date()

    await clientData.save()
    res.json(clientData)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" })
    }
    const { type, totalItems, notes } = req.body

    if (!type) {
      return res.status(400).json({ message: "File type is required" })
    }

    const clientData = await ensureClientData(req.user._id)

    const fileMeta = {
      type,
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
      meta: {
        totalItems: totalItems ? Number(totalItems) : undefined,
        notes,
      },
    }

    clientData.files.push(fileMeta)
    clientData.audit.lastUpdatedBy = req.user._id
    clientData.audit.lastUpdatedAt = new Date()
    clientData.status = clientData.status === "missing" ? "draft" : clientData.status

    if (type === "SKU_LIST") {
      clientData.itemMasterSummary = {
        ...clientData.itemMasterSummary,
        totalItems: totalItems ? Number(totalItems) : clientData.itemMasterSummary?.totalItems,
        lastUploadedAt: new Date(),
      }
    }

    if (type === "TAX_PROOF") {
      clientData.taxConfig = {
        ...clientData.taxConfig,
        notes,
      }
    }

    if (type === "BILL_SAMPLE") {
      clientData.receiptSample = {
        provided: true,
        useSystemDefault: false,
        notes,
      }
    }

    await clientData.save()
    res.json(clientData)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get("/", auth, adminAuth, async (req, res) => {
  try {
    const submissions = await ClientData.find().populate("user", "name email role")
    res.json(submissions)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get("/:id", auth, adminAuth, async (req, res) => {
  try {
    const submission = await ClientData.findById(req.params.id).populate("user", "name email role")
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" })
    }
    res.json(submission)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.patch("/:id/status", auth, adminAuth, async (req, res) => {
  try {
    const { status, notes } = req.body
    const submission = await ClientData.findById(req.params.id)
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" })
    }

    submission.status = status
    submission.audit.approvedBy = req.user._id
    submission.audit.approvedAt = new Date()
    if (notes) {
      submission.audit.notes = notes
    }

    await submission.save()
    res.json(submission)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
