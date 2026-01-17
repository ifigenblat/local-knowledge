const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetPassword() {
  try {
    // Use the MongoDB URI from .env or default
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/local-knowledge';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Find the user
    const user = await User.findOne({ email: 'test@example.com' });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // Set new password (change 'password' to your desired password)
    const newPassword = 'password'; // Change this to your desired password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.password = hashedPassword;
    await user.save();
    
    console.log('✅ Password reset successfully');
    console.log('New password:', newPassword);
    
    // Verify
    const isValid = await bcrypt.compare(newPassword, user.password);
    console.log('Password verification:', isValid ? '✅ PASS' : '❌ FAIL');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

resetPassword();
