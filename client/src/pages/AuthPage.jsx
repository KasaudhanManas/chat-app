import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage() {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, register, loading, error, setError } = useAuth();

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    if (tab === 'login') {
      await login(username, password);
    } else {
      await register(username, password);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">💬</div>
          <div className="auth-logo-text">ChatFlow</div>
        </div>

        <p className="auth-subtitle">
          {tab === 'login'
            ? 'Welcome back! Sign in to continue chatting.'
            : 'Create your account and start chatting in real-time.'}
        </p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => switchTab('login')}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => switchTab('register')}
          >
            Register
          </button>
        </div>

        {error && <div className="error-banner">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="form-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              minLength={3}
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? (
              <span className="spinner" />
            ) : tab === 'login' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
