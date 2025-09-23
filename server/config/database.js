const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb+srv://deepan09112004:deepan@billing-software.9ovfewp.mongodb.net/"
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn; // Return the connection object
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
