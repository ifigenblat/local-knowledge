const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function fixUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/local-knowledge');
    console.log('Connected to MongoDB');
    
    // Delete existing test user
    await User.deleteOne({ email: 'test@example.com' });
    console.log('Deleted existing test user');
    
    // Create new test user with correct password
    const hashedPassword = await bcrypt.hash('password', 10);
    const newUser = new User({
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User'
    });
    
    await newUser.save();
    console.log('✅ Test user created with correct password');
    
    // Verify the password works
    const savedUser = await User.findOne({ email: 'test@example.com' });
    const isValid = await bcrypt.compare('password', savedUser.password);
    console.log('Password verification test:', isValid ? '✅ PASS' : '❌ FAIL');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixUser();


