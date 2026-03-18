const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

// Track online users: { socketId -> { userId, username, room } }
const onlineUsers = new Map();

const registerSocketHandlers = (io) => {
  // Middleware: authenticate socket connection via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error: No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('Authentication error: User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`🔌 Socket connected: ${user.username} (${socket.id})`);

    // Mark user as online
    await User.findByIdAndUpdate(user._id, { isOnline: true });
    onlineUsers.set(socket.id, { userId: user._id, username: user.username, room: null });

    // Broadcast updated online users list
    const broadcastOnlineUsers = () => {
      const users = Array.from(onlineUsers.values()).map((u) => ({
        userId: u.userId,
        username: u.username,
        room: u.room,
      }));
      io.emit('online_users', users);
    };

    broadcastOnlineUsers();

    // ── join_room ──────────────────────────────────────────────
    socket.on('join_room', async ({ room }) => {
      if (!room) return;

      // Leave previous room
      const prevData = onlineUsers.get(socket.id);
      if (prevData?.room) {
        socket.leave(prevData.room);
        socket.to(prevData.room).emit('user_left', {
          username: user.username,
          room: prevData.room,
          message: `${user.username} left the room`,
        });
      }

      socket.join(room);
      onlineUsers.set(socket.id, { userId: user._id, username: user.username, room });
      broadcastOnlineUsers();

      // Notify room members
      socket.to(room).emit('user_joined', {
        username: user.username,
        room,
        message: `${user.username} joined the room`,
      });

      // Confirm join to sender
      socket.emit('room_joined', { room });
      console.log(`👥 ${user.username} joined room: ${room}`);
    });

    // ── send_message ───────────────────────────────────────────
    socket.on('send_message', async ({ room, content }) => {
      if (!room || !content?.trim()) return;

      try {
        // Persist to MongoDB
        const message = await Message.create({
          room,
          sender: user._id,
          content: content.trim(),
        });

        const populated = await message.populate('sender', 'username');

        const payload = {
          _id: populated._id,
          room: populated.room,
          sender: { _id: populated.sender._id, username: populated.sender.username },
          content: populated.content,
          createdAt: populated.createdAt,
        };

        // Broadcast to everyone in the room (including sender)
        io.to(room).emit('receive_message', payload);
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
        console.error('Message error:', err.message);
      }
    });

    // ── typing indicators ──────────────────────────────────────
    socket.on('typing_start', ({ room }) => {
      if (!room) return;
      socket.to(room).emit('user_typing', { username: user.username });
    });

    socket.on('typing_stop', ({ room }) => {
      if (!room) return;
      socket.to(room).emit('user_stop_typing', { username: user.username });
    });

    // ── disconnect ─────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const data = onlineUsers.get(socket.id);
      console.log(`🔴 Socket disconnected: ${user.username} (${socket.id})`);

      if (data?.room) {
        socket.to(data.room).emit('user_left', {
          username: user.username,
          room: data.room,
          message: `${user.username} left the room`,
        });
      }

      onlineUsers.delete(socket.id);

      // If user has no other active sockets, mark offline
      const stillOnline = Array.from(onlineUsers.values()).some(
        (u) => u.userId.toString() === user._id.toString()
      );

      if (!stillOnline) {
        await User.findByIdAndUpdate(user._id, {
          isOnline: false,
          lastSeen: new Date(),
        });
      }

      broadcastOnlineUsers();
    });
  });
};

module.exports = registerSocketHandlers;
