// ✅ Load environment variables FIRST
require("dotenv").config({ path: ".env.local" });

const mongoose = require("mongoose");
const User = require("../models/User");
const Employee = require("../models/Employee");
const connectDB = require("../config/database");

const createSampleEmployees = async () => {
  try {
    await connectDB();

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    // Clear existing employees
    await Employee.deleteMany({});
    console.log("Cleared existing employees");

    // Create employee records for each user
    const employees = [];
    
    for (const user of users) {
      const employeeData = {
        user: user._id,
        personalDetails: {
          firstName: user.name.split(' ')[0] || 'First',
          lastName: user.name.split(' ')[1] || 'Last',
          dateOfBirth: new Date('1990-01-01'),
          gender: user.role === 'admin' ? 'male' : 'female',
          bloodGroup: 'O+'
        },
        contactDetails: {
          phone: '9876543210',
          emergencyPhone: '9876543211',
          address: {
            street: '123 Main Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            country: 'India'
          }
        },
        identification: {
          aadhaarNumber: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
          panNumber: String.fromCharCode(65 + Math.floor(Math.random() * 26)) + 
                     String.fromCharCode(65 + Math.floor(Math.random() * 26)) + 
                     String.fromCharCode(65 + Math.floor(Math.random() * 26)) + 
                     String.fromCharCode(65 + Math.floor(Math.random() * 26)) + 
                     String.fromCharCode(65 + Math.floor(Math.random() * 26)) + 
                     Math.floor(1000 + Math.random() * 9000) + 
                     String.fromCharCode(65 + Math.floor(Math.random() * 26))
        },
        employmentDetails: {
          department: user.role === 'admin' ? 'manager' : 'cashier',
          position: user.role === 'admin' ? 'Store Manager' : 'Cashier',
          dateOfJoining: new Date('2023-01-01'),
          salary: user.role === 'admin' ? 50000 : 25000,
          bankAccount: {
            accountNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
            bankName: 'State Bank of India',
            ifscCode: 'SBIN' + Math.floor(1000 + Math.random() * 9000),
            branchName: 'Main Branch'
          }
        },
        status: 'active',
        leaveBalance: {
          casual: 12,
          sick: 12,
          earned: 0
        }
      };

      employees.push(employeeData);
    }

    // Insert employees
    await Employee.insertMany(employees);
    console.log(`✅ Created ${employees.length} employee records successfully!`);
    
    // Display created employees
    const createdEmployees = await Employee.find().populate('user', 'name email role');
    console.log('\n📋 Created Employees:');
    createdEmployees.forEach(emp => {
      console.log(`- ${emp.personalDetails.firstName} ${emp.personalDetails.lastName} (${emp.user.role}) - ${emp.employmentDetails.position}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating sample employees:", err);
    process.exit(1);
  }
};

createSampleEmployees();
