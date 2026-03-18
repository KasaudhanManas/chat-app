# Chat App

A full-stack **real-time chat application** built with:

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Auth | JWT (jsonwebtoken) |
| Database | MongoDB (Mongoose) |

## Project Structure

```
chat-app/
├── server/               # Backend
│   ├── config/db.js      # MongoDB connection
│   ├── models/           # User, Message, Room schemas
│   ├── routes/           # auth, rooms, messages REST API
│   ├── middleware/auth.js # JWT protect middleware
│   ├── socket/index.js   # Socket.io event lifecycle
│   └── index.js          # Entry point
└── client/               # Frontend (Vite + React)
    └── src/
        ├── context/      # AuthContext, SocketContext
        ├── pages/        # AuthPage, ChatPage
        ├── components/   # Sidebar, ChatPanel
        ├── api/index.js  # Axios with JWT interceptor
        └── socket.js     # Socket.io singleton client
```

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running on `mongodb://localhost:27017`

### Run Backend
```bash
cd server
npm install
npm run dev
```
Server starts at `http://localhost:5000`

### Run Frontend
```bash
cd client
npm install
npm run dev
```
App opens at `http://localhost:5173`

## Features

- ✅ Real-time bi-directional messaging (Socket.io)
- ✅ Socket rooms and full event lifecycle
- ✅ Persistent message storage (MongoDB)
- ✅ User presence tracking (online/offline)
- ✅ Typing indicators
- ✅ Timestamped messages
- ✅ JWT authentication
- ✅ Separated socket vs REST API logic
- ✅ Dark glassmorphism UI

## Environment Variables (server/.env)

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_secret_key
```
