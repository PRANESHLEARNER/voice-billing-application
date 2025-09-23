const express = require("express")
const Shift = require("../models/Shift")
const Bill = require("../models/Bill")
const Employee = require("../models/Employee")
const { auth } = require("../middleware/auth")

const router = express.Router()

// Start new shift
router.post("/start", auth, async (req, res) => {
  try {
    const { openingCash } = req.body

    // Check if user has active shift
    const activeShift = await Shift.findOne({
      cashier: req.user._id,
      status: "active",
    })

    if (activeShift) {
      return res.status(400).json({ message: "You already have an active shift" })
    }

    const shift = new Shift({
      cashier: req.user._id,
      cashierName: req.user.name,
      openingCash: openingCash || 0,
    })

    await shift.save()
    res.status(201).json(shift)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// End shift
router.post("/end", auth, async (req, res) => {
  try {
    const { closingCash, notes } = req.body

    const shift = await Shift.findOne({
      cashier: req.user._id,
      status: "active",
    })

    if (!shift) {
      return res.status(404).json({ message: "No active shift found" })
    }

    shift.endTime = new Date()
    shift.closingCash = closingCash
    shift.notes = notes
    shift.status = "closed"

    await shift.save()
    res.json(shift)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Get current active shift
router.get("/current", auth, async (req, res) => {
  try {
    const shift = await Shift.findOne({
      cashier: req.user._id,
      status: "active",
    }).populate("cashier", "name employeeId")

    res.json(shift)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Get shift history
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query
    const query = {}

    if (req.user.role !== "admin") {
      query.cashier = req.user._id
    }

    if (startDate || endDate) {
      query.startTime = {}
      if (startDate) query.startTime.$gte = new Date(startDate)
      if (endDate) query.startTime.$lte = new Date(endDate)
    }

    const shifts = await Shift.find(query)
      .populate("cashier", "name employeeId")
      .sort({ startTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Shift.countDocuments(query)

    res.json({
      shifts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Admin: Get all active shifts across all cashiers
router.get("/active", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    const activeShifts = await Shift.find({ status: "active" })
      .populate("cashier", "name employeeId")
      .sort({ startTime: -1 })

    res.json(activeShifts)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Admin: Get shift summary for a specific date range
router.get("/summary", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    const { startDate, endDate } = req.query
    const query = {}

    if (startDate || endDate) {
      query.startTime = {}
      if (startDate) {
        try {
          query.startTime.$gte = new Date(startDate)
        } catch (e) {
          console.error("Invalid startDate:", startDate, e)
          return res.status(400).json({ message: "Invalid startDate format" })
        }
      }
      if (endDate) {
        try {
          query.startTime.$lte = new Date(endDate)
        } catch (e) {
          console.error("Invalid endDate:", endDate, e)
          return res.status(400).json({ message: "Invalid endDate format" })
        }
      }
    }

    console.log("Shift query:", query)
    const shifts = await Shift.find(query).populate("cashier", "name employeeId")
    console.log("Found shifts:", shifts.length)
    
    // Calculate enhanced metrics
    const closedShifts = shifts.filter(s => s.status === "closed")
    const activeShifts = shifts.filter(s => s.status === "active")
    
    console.log("Closed shifts:", closedShifts.length, "Active shifts:", activeShifts.length)
    
    // Calculate shift durations
    const shiftDurations = closedShifts.map(shift => {
      try {
        const duration = shift.endTime && shift.startTime ? shift.endTime - shift.startTime : 0
        return {
          duration: duration / (1000 * 60 * 60), // Convert to hours
          cashier: shift.cashierName,
          startTime: shift.startTime,
          endTime: shift.endTime
        }
      } catch (e) {
        console.error("Error calculating duration for shift:", shift._id, e)
        return {
          duration: 0,
          cashier: shift.cashierName,
          startTime: shift.startTime,
          endTime: shift.endTime
        }
      }
    })
    
    const avgShiftDuration = shiftDurations.length > 0 
      ? shiftDurations.reduce((sum, s) => sum + s.duration, 0) / shiftDurations.length 
      : 0
    
    // Calculate cash variance
    const cashVariance = closedShifts.map(shift => {
      try {
        const expectedCash = (shift.openingCash || 0) + (shift.totalSales || 0)
        const variance = (shift.closingCash || 0) - expectedCash
        return {
          variance,
          openingCash: shift.openingCash || 0,
          closingCash: shift.closingCash || 0,
          totalSales: shift.totalSales || 0,
          cashier: shift.cashierName
        }
      } catch (e) {
        console.error("Error calculating variance for shift:", shift._id, e)
        return {
          variance: 0,
          openingCash: 0,
          closingCash: 0,
          totalSales: 0,
          cashier: shift.cashierName
        }
      }
    })
    
    const totalCashVariance = cashVariance.reduce((sum, cv) => sum + cv.variance, 0)
    const averageCashVariance = cashVariance.length > 0 ? totalCashVariance / cashVariance.length : 0
    
    // Peak hours analysis
    const hourlySales = {}
    closedShifts.forEach(shift => {
      try {
        if (shift.startTime) {
          const hour = new Date(shift.startTime).getHours()
          const hourKey = `${hour}:00-${hour + 1}:00`
          if (!hourlySales[hourKey]) {
            hourlySales[hourKey] = { totalSales: 0, shiftCount: 0 }
          }
          hourlySales[hourKey].totalSales += shift.totalSales || 0
          hourlySales[hourKey].shiftCount++
        }
      } catch (e) {
        console.error("Error processing peak hours for shift:", shift._id, e)
      }
    })
    
    const peakHours = Object.entries(hourlySales)
      .sort(([,a], [,b]) => b.totalSales - a.totalSales)
      .slice(0, 3)
      .map(([hour, data]) => ({ hour, ...data }))
    
    const summary = {
      // Basic metrics
      totalShifts: shifts.length,
      activeShifts: activeShifts.length,
      closedShifts: closedShifts.length,
      totalSales: shifts.reduce((sum, s) => sum + (s.totalSales || 0), 0),
      totalBills: shifts.reduce((sum, s) => sum + (s.totalBills || 0), 0),
      averageSalesPerShift: shifts.length > 0 ? shifts.reduce((sum, s) => sum + (s.totalSales || 0), 0) / shifts.length : 0,
      
      // Enhanced metrics
      averageShiftDuration: avgShiftDuration,
      totalCashVariance,
      averageCashVariance,
      peakHours,
      
      // Cash handling summary
      totalOpeningCash: closedShifts.reduce((sum, s) => sum + (s.openingCash || 0), 0),
      totalClosingCash: closedShifts.reduce((sum, s) => sum + (s.closingCash || 0), 0),
      
      shiftsByCashier: {}
    }

    // Group shifts by cashier with enhanced metrics
    shifts.forEach(shift => {
      try {
        const cashierName = shift.cashier?.name || shift.cashierName || "Unknown"
        if (!summary.shiftsByCashier[cashierName]) {
          summary.shiftsByCashier[cashierName] = {
            totalShifts: 0,
            activeShifts: 0,
            closedShifts: 0,
            totalSales: 0,
            totalBills: 0,
            totalDuration: 0,
            cashVariance: 0,
            totalOpeningCash: 0,
            totalClosingCash: 0,
            averageBillsPerShift: 0,
            averageSalesPerShift: 0,
            averageDuration: 0
          }
        }
        
        const cashierData = summary.shiftsByCashier[cashierName]
        cashierData.totalShifts++
        cashierData.totalSales += shift.totalSales || 0
        cashierData.totalBills += shift.totalBills || 0
        
        if (shift.status === "active") {
          cashierData.activeShifts++
        } else {
          cashierData.closedShifts++
          cashierData.totalOpeningCash += shift.openingCash || 0
          cashierData.totalClosingCash += shift.closingCash || 0
          
          // Calculate duration for closed shifts
          if (shift.endTime && shift.startTime) {
            try {
              const duration = (shift.endTime - shift.startTime) / (1000 * 60 * 60) // hours
              cashierData.totalDuration += duration
            } catch (e) {
              console.error("Error calculating duration for cashier:", cashierName, e)
            }
          }
          
          // Calculate cash variance
          try {
            const expectedCash = (shift.openingCash || 0) + (shift.totalSales || 0)
            const variance = (shift.closingCash || 0) - expectedCash
            cashierData.cashVariance += variance
          } catch (e) {
            console.error("Error calculating variance for cashier:", cashierName, e)
          }
        }
      } catch (e) {
        console.error("Error processing shift for cashier grouping:", shift._id, e)
      }
    })
    
    // Calculate averages for each cashier
    Object.keys(summary.shiftsByCashier).forEach(cashierName => {
      try {
        const data = summary.shiftsByCashier[cashierName]
        data.averageBillsPerShift = data.totalShifts > 0 ? data.totalBills / data.totalShifts : 0
        data.averageSalesPerShift = data.totalShifts > 0 ? data.totalSales / data.totalShifts : 0
        data.averageDuration = data.closedShifts > 0 ? data.totalDuration / data.closedShifts : 0
      } catch (e) {
        console.error("Error calculating averages for cashier:", cashierName, e)
      }
    })

    console.log("Summary generated successfully")
    res.json(summary)
  } catch (error) {
    console.error("Detailed error in summary endpoint:", error)
    res.status(500).json({ message: "Server error", error: error.message, stack: error.stack })
  }
})

// Admin: Force end a shift (for emergency situations)
router.post("/:shiftId/end", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    const { closingCash, notes } = req.body
    const { shiftId } = req.params

    const shift = await Shift.findById(shiftId)

    if (!shift) {
      return res.status(404).json({ message: "Shift not found" })
    }

    if (shift.status === "closed") {
      return res.status(400).json({ message: "Shift is already closed" })
    }

    shift.endTime = new Date()
    shift.closingCash = closingCash || shift.openingCash + shift.totalSales
    shift.notes = notes || `Force ended by admin: ${req.user.name}`
    shift.status = "closed"

    await shift.save()
    res.json(shift)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Admin: Get available cashiers for shift assignment
router.get("/available-cashiers", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    console.log('🔍 Getting available cashiers...')

    // Get all active employees with cashier role
    const cashiers = await Employee.find({
      status: "active"
    }).populate("user", "name email employeeId role")
    
    // Filter for cashier role after population (more reliable)
    const cashierRoleEmployees = cashiers.filter(employee => 
      employee.user && employee.user.role === "cashier"
    )
    
    console.log('🔍 All active employees:', cashiers.length)
    console.log('🔍 Employees with cashier role:', cashierRoleEmployees.length)
    console.log('🔍 All employees details:', cashiers.map(c => ({
      id: c._id,
      name: c.user?.name,
      email: c.user?.email,
      employeeId: c.user?.employeeId,
      role: c.user?.role,
      department: c.employmentDetails?.department,
      status: c.status,
      userExists: !!c.user
    })))
    console.log('🔍 Cashier role employees details:', cashierRoleEmployees.map(c => ({
      id: c._id,
      name: c.user?.name,
      email: c.user?.email,
      employeeId: c.user?.employeeId,
      role: c.user?.role,
      department: c.employmentDetails?.department,
      status: c.status
    })))

    console.log('🔍 All cashiers found:', cashiers.length, cashiers)
    console.log('🔍 Cashier details:', cashiers.map(c => ({
      id: c._id,
      name: c.user?.name,
      email: c.user?.email,
      employeeId: c.user?.employeeId,
      department: c.employmentDetails?.department,
      status: c.status
    })))

    // Get cashiers with active shifts
    const activeShiftCashiers = await Shift.find({
      status: "active"
    }).select("cashier")

    console.log('🔍 Active shifts found:', activeShiftCashiers.length, activeShiftCashiers)
    console.log('🔍 Active shift cashier IDs:', activeShiftCashiers.map(s => s.cashier))

    const activeCashierIds = activeShiftCashiers.map(s => s.cashier.toString())
    console.log('🔍 Active cashier IDs (string):', activeCashierIds)

    const availableCashiers = cashierRoleEmployees.filter(cashier => {
      const cashierUserId = cashier.user._id.toString()
      const isAvailable = !activeCashierIds.includes(cashierUserId)
      console.log(`🔍 Cashier ${cashier.user.name} (${cashierUserId}): ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'} (activeCashierIds includes: ${activeCashierIds.includes(cashierUserId)})`)
      return isAvailable
    })

    console.log('🔍 Available cashiers:', availableCashiers.length, availableCashiers)
    console.log('🔍 Available cashier details:', availableCashiers.map(c => ({
      id: c._id,
      name: c.user?.name,
      email: c.user?.email,
      employeeId: c.user?.employeeId,
      department: c.employmentDetails?.department
    })))

    const responseData = {
      allCashiers: cashierRoleEmployees,
      availableCashiers: availableCashiers,
      activeShiftCashiers: activeCashierIds.length
    }

    console.log('🔍 Sending response:', responseData)
    res.json(responseData)
  } catch (error) {
    console.error('❌ Error in available-cashiers endpoint:', error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})


module.exports = router
