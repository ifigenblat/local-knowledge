const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
require('dotenv').config({ path: '.env' });

async function assignAdminRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get admin role
    const adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      console.error('Admin role not found. Please run init-roles.js first.');
      process.exit(1);
    }

    // Get email from command line argument
    const email = process.argv[2];
    if (!email) {
      console.error('Usage: node assign-admin-role.js <email>');
      console.error('Example: node assign-admin-role.js admin@example.com');
      process.exit(1);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }

    // Assign admin role
    user.role = adminRole._id;
    await user.save();

    console.log(`✓ Admin role assigned to ${user.email}`);
    process.exit(0);
  } catch (error) {
    console.error('Error assigning admin role:', error);
    process.exit(1);
  }
}

assignAdminRole();
