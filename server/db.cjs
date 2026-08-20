const mongoose = require('mongoose')

async function connectDatabase() {
  if (!process.env.MONGODB_URI) return false
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  return true
}

module.exports = { mongoose, connectDatabase }
