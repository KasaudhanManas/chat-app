require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const messageRoutes = require('./routes/messages');
const registerSocketHandlers = require('./socket/index');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io server with CORS
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ── REST API Routes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Socket.io Event Handlers ────────────────────────────────
registerSocketHandlers(io);

// ── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
