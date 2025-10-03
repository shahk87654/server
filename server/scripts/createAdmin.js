const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aramco-reviews');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ isAdmin: true });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Create admin user
    const adminEmail = 'admin@aramco.com';
    const adminPassword = 'admin123';
    
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const admin = new User({
      email: adminEmail,
      password: hashedPassword,
      isAdmin: true
    });

    await admin.save();
    console.log('Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('Please change the password after first login.');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
