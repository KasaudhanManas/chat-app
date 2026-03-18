const express = require('express');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/rooms
// @desc    Get all rooms
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const rooms = await Room.find().sort({ name: 1 }).populate('createdBy', 'username');
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    const roomExists = await Room.findOne({ name: name.trim() });
    if (roomExists) {
      return res.status(400).json({ message: 'Room name already exists' });
    }

    const room = await Room.create({
      name: name.trim(),
      description: description || '',
      createdBy: req.user._id,
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
