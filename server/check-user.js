const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/local-knowledge');
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email: 'test@example.com' });
    if (user) {
      console.log('✅ Test user found:');
      console.log('Email:', user.email);
      console.log('Created:', user.createdAt);
      console.log('Has password hash:', !!user.password);
    } else {
      console.log('❌ Test user not found');
      console.log('Creating test user...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password', 10);
      
      const newUser = new User({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User'
      });
      
      await newUser.save();
      console.log('✅ Test user created successfully');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUser();


