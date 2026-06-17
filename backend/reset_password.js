require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.findOne({ email: 'himanshi1109@gmail.com' }).select('+password');
  if (user) {
    user.password = 'Password@123';
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    console.log('Password reset successfully');
  } else {
    console.log('User not found');
  }
  process.exit(0);
}).catch(console.error);
