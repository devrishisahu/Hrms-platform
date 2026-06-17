require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const users = await User.find({ email: 'himanshi1109@gmail.com' }).select('+password');
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
}).catch(console.error);
