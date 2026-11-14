const path = require('node:path');
const mongoose = require(require.resolve('mongoose', { paths: [__dirname, path.join(__dirname, '..', '..', 'backend')] }));

const librarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: Object,
    required: true
  }
}, { timestamps: true });

// Add index on createdAt
librarySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Library', librarySchema);
