const mongoose = require('mongoose');

const connectDB = async () => {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hrms');
  console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;
