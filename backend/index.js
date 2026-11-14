const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.JWT_SECRET) throw new Error('Set JWT_SECRET in .env before starting the server.');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
const { setMongoConnected } = require('../database/db');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/neuronote';
const databaseReady = mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 2000
}).then(() => {
  console.log('Connected to MongoDB');
  setMongoConnected(true);
}).catch(() => {
  console.log('MongoDB not running, falling back to local JSON file storage.');
  setMongoConnected(false);
});

// Middleware
app.use(cors());
app.use('/api/generate', express.json({ limit: '4mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(compression()); // Gzip compression

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Routes
const authRoutes = require('./routes/auth');
const libraryRoutes = require('./routes/library');

app.use('/api/auth', authRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/generate', require('../ai/generate').createGenerationRouter());

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(error.status || 500).json({ error: error.status === 413 ? 'Request is too large' : 'Unable to process request' });
});

databaseReady.then(() => app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.send) process.send({ type: 'ready' });
}));

// Avoid leaving an orphan API process if the combined development runner exits.
if (process.send) process.on('disconnect', () => process.exit(0));
