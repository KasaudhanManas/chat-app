const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Room name must be at least 2 characters'],
      maxlength: [30, 'Room name cannot exceed 30 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [100, 'Description cannot exceed 100 characters'],
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
