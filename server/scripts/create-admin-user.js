const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
require('dotenv').config({ path: '.env' });

async function createAdminUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get superadmin role (immutable, full access)
    const superAdminRole = await Role.findOne({ name: 'superadmin' });
    if (!superAdminRole) {
      console.error('Superadmin role not found. Please run init-roles.js first.');
      process.exit(1);
    }

    // Check if superadmin user already exists
    const existingSuperAdmin = await User.findOne({ role: superAdminRole._id });
    if (existingSuperAdmin) {
      console.log(`✓ Superadmin user already exists: ${existingSuperAdmin.email}`);
      process.exit(0);
    }

    // Default admin credentials
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@localknowledge.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Administrator';

    // Check if user with this email exists
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (adminUser) {
      // User exists but doesn't have superadmin role - assign it
      adminUser.role = superAdminRole._id;
      adminUser.mustChangePassword = true; // Force password change
      await adminUser.save();
      console.log(`✓ Superadmin role assigned to existing user: ${adminEmail}`);
      console.log(`  ⚠️  Password change will be required on next login!`);
    } else {
      // Create new superadmin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      adminUser = new User({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: superAdminRole._id,
        mustChangePassword: true // Force password change on first login
      });

      await adminUser.save();
      console.log(`✓ Superadmin user created successfully!`);
      console.log(`  Email: ${adminEmail}`);
      console.log(`  Password: ${adminPassword}`);
      console.log(`  ⚠️  Password change will be required on first login!`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
