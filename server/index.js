const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: '../.env' }); // Load .env from parent dir

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
const { setMongoConnected } = require('./db');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/neuronote';
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 2000
}).then(() => {
  console.log('Connected to MongoDB');
  setMongoConnected(true);
}).catch(err => {
  console.log('MongoDB not running, falling back to local JSON file storage.');
  setMongoConnected(false);
});

// Middleware
app.use(cors());
app.use(express.json());
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

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
