const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      "mongodb+srv://praneshs616_db_user:Praneshise@super-market.6ggio21.mongodb.net/"
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn; // Return the connection object
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
