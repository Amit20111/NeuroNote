const path = require('node:path');
const mongoose = require(require.resolve('mongoose', { paths: [__dirname, path.join(__dirname, '..', '..', 'backend')] }));

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: false
  },
  googleId: {
    type: String,
    sparse: true
  },
  authProvider: {
    type: String,
    default: 'local'
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  gender: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
