import { createContext, useContext, useEffect, useState } from 'react';
import { getSocket, initSocket } from '../socket.js';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      setConnected(false);
      setOnlineUsers([]);
      return;
    }

    const token = localStorage.getItem('token');
    const s = initSocket(token);
    setSocket(s);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onUsers = (users) => setOnlineUsers(users);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('online_users', onUsers);

    if (s.connected) setConnected(true);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('online_users', onUsers);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
};
