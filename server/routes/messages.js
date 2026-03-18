const express = require('express');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/messages/:room
// @desc    Get messages for a room (paginated, most recent last)
// @access  Private
router.get('/:room', protect, async (req, res) => {
  try {
    const { room } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ room })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username')
      .lean();

    // Reverse to display oldest-first
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
