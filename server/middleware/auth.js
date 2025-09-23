const jwt = require("jsonwebtoken")
const User = require("../models/User")

const auth = async (req, res, next) => {
  try {
    console.log('🔐 Auth middleware - Checking authentication...');
    console.log('Headers:', req.headers);
    
    const token = req.header("Authorization")?.replace("Bearer ", "")
    
    console.log('Token found:', !!token);
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ message: "No token, authorization denied" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret")
    console.log('✅ Token decoded successfully:', decoded.id);
    
    const user = await User.findById(decoded.id).select("-password")
    
    console.log('User found:', !!user);
    console.log('User active:', user?.isActive);
    
    if (!user || !user.isActive) {
      console.log('❌ User not found or inactive');
      return res.status(401).json({ message: "Token is not valid" })
    }

    req.user = user
    console.log('✅ Authentication successful for user:', user.email);
    next()
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
    res.status(401).json({ message: "Token is not valid" })
  }
}

const adminAuth = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" })
  }
  next()
}

module.exports = { auth, adminAuth }
