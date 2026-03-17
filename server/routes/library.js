const express = require('express');
const router = express.Router();
const { Library } = require('../db');
const auth = require('../middleware/auth');

// @route   GET /api/library
// @desc    Get user's library entries
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Lean query for performance optimizations
    const entries = await Library.find({ userId: req.user.id })
                                 .sort({ createdAt: -1 })
                                 .lean();
    res.json(entries);
  } catch (error) {
    console.error('Fetch library error:', error);
    res.status(500).json({ error: 'Server error while fetching library' });
  }
});

// @route   POST /api/library
// @desc    Add new entry to library
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const newEntry = new Library({
      userId: req.user.id,
      content
    });

    const savedEntry = await newEntry.save();
    // Return lean object format
    res.status(201).json(savedEntry.toObject());
  } catch (error) {
    console.error('Save to library error:', error);
    res.status(500).json({ error: 'Server error while saving to library' });
  }
});

module.exports = router;
