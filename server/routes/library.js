const express = require('express');
const auth = require('../middleware/auth');

function createLibraryRouter(Library = require('../db').Library) {
const router = express.Router();

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

    const savedEntry = await Library.create({
      userId: req.user.id,
      content
    });
    // Return lean object format
    res.status(201).json(savedEntry.toObject());
  } catch (error) {
    console.error('Save to library error:', error);
    res.status(500).json({ error: 'Server error while saving to library' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await Library.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (!result.deletedCount) return res.status(404).json({ error: 'Study set not found' });
    res.json({ deleted: true });
  } catch (error) {
    console.error('Delete library error:', error);
    res.status(500).json({ error: 'Unable to delete study set' });
  }
});

return router;
}
module.exports = createLibraryRouter();
module.exports.createLibraryRouter = createLibraryRouter;
