const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: String,
      required: true,
      trim: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      enum: ['message', 'system'],
      default: 'message',
    },
  },
  { timestamps: true }
);

// Index for efficient room-based queries
messageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
