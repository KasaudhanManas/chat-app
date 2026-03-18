import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/index.js';

const formatTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (ts) => {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getInitial = (name) => (name || '?')[0].toUpperCase();

const highlight = (text, query) => {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
};

const MessageBubble = ({ msg, isOwn, searchQuery }) => (
  <div className={`msg-row ${isOwn ? 'own' : ''}`}>
    {!isOwn && <div className="msg-avatar">{getInitial(msg.sender?.username)}</div>}
    <div className="msg-content">
      {!isOwn && <div className="msg-sender">{msg.sender?.username}</div>}
      <div className={`msg-bubble ${isOwn ? 'own' : 'theirs'}`}>
        {highlight(msg.content, searchQuery)}
      </div>
      <div className="msg-time">{formatTime(msg.createdAt)}</div>
    </div>
    {isOwn && <div className="msg-avatar">{getInitial(msg.sender?.username)}</div>}
  </div>
);

export default function ChatPanel({ activeRoom }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const searchInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load message history
  useEffect(() => {
    if (!activeRoom) { setMessages([]); return; }
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/messages/${activeRoom}`);
        setMessages(data);
      } catch (err) {
        console.error('Failed to load messages:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
    setSearchQuery('');
    setSearchOpen(false);
  }, [activeRoom]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Open search with keyboard shortcut Ctrl+F
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && activeRoom) {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeRoom]);

  // Socket events
  useEffect(() => {
    if (!socket || !activeRoom) return;

    const onReceive = (msg) => setMessages((prev) => [...prev, msg]);

    const onUserJoined = ({ message }) =>
      setMessages((prev) => [...prev, { _id: Date.now(), type: 'system', content: message, createdAt: new Date() }]);

    const onUserLeft = ({ message }) =>
      setMessages((prev) => [...prev, { _id: Date.now() + 1, type: 'system', content: message, createdAt: new Date() }]);

    const onTyping = ({ username }) => {
      if (username === user?.username) return;
      setTypingUsers((prev) => prev.includes(username) ? prev : [...prev, username]);
    };

    const onStopTyping = ({ username }) =>
      setTypingUsers((prev) => prev.filter((u) => u !== username));

    socket.on('receive_message', onReceive);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('user_typing', onTyping);
    socket.on('user_stop_typing', onStopTyping);

    return () => {
      socket.off('receive_message', onReceive);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('user_typing', onTyping);
      socket.off('user_stop_typing', onStopTyping);
    };
  }, [socket, activeRoom, user?.username]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!socket || !activeRoom) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing_start', { room: activeRoom });
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing_stop', { room: activeRoom });
    }, 1500);
  };

  const sendMessage = () => {
    const content = input.trim();
    if (!content || !socket || !activeRoom) return;
    socket.emit('send_message', { room: activeRoom, content });
    setInput('');
    clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    socket.emit('typing_stop', { room: activeRoom });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Filter + group by date
  const filtered = messages.filter((m) =>
    m.type === 'system' ? true :
    !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group messages by date
  const grouped = filtered.reduce((acc, msg) => {
    const label = msg.type === 'system' ? null : formatDate(msg.createdAt);
    const last = acc[acc.length - 1];
    if (!last || last.label !== label) {
      acc.push({ label, messages: [msg] });
    } else {
      last.messages.push(msg);
    }
    return acc;
  }, []);

  const matchCount = searchQuery
    ? messages.filter((m) => m.type !== 'system' && m.content.toLowerCase().includes(searchQuery.toLowerCase())).length
    : 0;

  if (!activeRoom) {
    return (
      <div className="no-room">
        <div className="no-room-icon">💬</div>
        <h2>Welcome to ChatFlow</h2>
        <p>Select a room from the sidebar or create a new one to start chatting</p>
        <div className="no-room-hint">💡 Press <kbd>Ctrl+F</kbd> in any room to search messages</div>
      </div>
    );
  }

  const typingLabel =
    typingUsers.length === 1 ? `${typingUsers[0]} is typing`
    : typingUsers.length > 1 ? `${typingUsers.join(', ')} are typing`
    : '';

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <span className="chat-header-hash">#</span>
          <span className="chat-header-title">{activeRoom}</span>
          <span className="chat-header-badge">Live</span>
        </div>

        <div className="chat-header-actions">
          {/* Search toggle */}
          <button
            className={`chat-action-btn ${searchOpen ? 'active' : ''}`}
            onClick={() => {
              setSearchOpen((v) => !v);
              if (!searchOpen) {
                setTimeout(() => searchInputRef.current?.focus(), 50);
              } else {
                setSearchQuery('');
              }
            }}
            title="Search messages (Ctrl+F)"
          >
            🔍
          </button>

          <span className="chat-header-desc">{messages.filter(m => m.type !== 'system').length} messages</span>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="chat-search-bar">
          <span className="chat-search-icon">🔍</span>
          <input
            ref={searchInputRef}
            className="chat-search-input"
            type="text"
            placeholder="Search messages in this room…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <span className="chat-search-count">
              {matchCount} result{matchCount !== 1 ? 's' : ''}
            </span>
          )}
          <button
            className="chat-search-close"
            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="messages-container">
        {loading && (
          <div className="messages-empty">
            <div className="spinner" style={{ width: 32, height: 32 }} />
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>Loading messages…</div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="messages-empty">
            {searchQuery ? (
              <>
                <div className="messages-empty-icon">🔎</div>
                <div className="messages-empty-text">No results for "{searchQuery}"</div>
                <div className="messages-empty-sub">Try a different search term</div>
              </>
            ) : (
              <>
                <div className="messages-empty-icon">📭</div>
                <div className="messages-empty-text">No messages yet</div>
                <div className="messages-empty-sub">Be the first to say something in #{activeRoom}!</div>
              </>
            )}
          </div>
        )}

        {grouped.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="date-separator">
                <div className="date-separator-line" />
                <div className="date-separator-label">{group.label}</div>
                <div className="date-separator-line" />
              </div>
            )}
            {group.messages.map((msg) =>
              msg.type === 'system' ? (
                <div key={msg._id} className="msg-system">
                  <span className="msg-system-dot" />
                  {msg.content}
                </div>
              ) : (
                <MessageBubble
                  key={msg._id}
                  msg={msg}
                  isOwn={msg.sender?._id === user?._id || msg.sender?.username === user?.username}
                  searchQuery={searchQuery}
                />
              )
            )}
          </div>
        ))}

        <div className="typing-indicator">
          {typingLabel && (
            <>
              <div className="typing-dots"><span /><span /><span /></div>
              <span>{typingLabel}…</span>
            </>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="message-input-area">
        <div className="message-input-wrapper">
          <textarea
            className="message-input"
            rows={1}
            placeholder={`Message #${activeRoom}  •  Shift+Enter for new line`}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          className="btn-send"
          onClick={sendMessage}
          disabled={!input.trim()}
          title="Send (Enter)"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
