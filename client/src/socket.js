import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket = null;

export const getSocket = () => socket;

export const initSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }
  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
