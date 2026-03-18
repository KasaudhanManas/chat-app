import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/index.js';
import { initSocket, disconnectSocket } from '../socket.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      initSocket(data.token);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username, password) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', { username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      initSocket(data.token);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    disconnectSocket();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError('');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, setError, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
