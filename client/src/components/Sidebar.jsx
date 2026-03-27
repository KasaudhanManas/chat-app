import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import api from '../api/index.js';

const getInitial = (name) => (name || '?')[0].toUpperCase();

/* ── Create Room Modal ──────────────────────────────────────────── */
function CreateRoomModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Room name is required'); return; }
    setCreating(true);
    setError('');
    try {
      const { data } = await api.post('/rooms', { name: trimmed, description: description.trim() });
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-title-icon">🏠</span>
            Create a Room
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p className="modal-desc">Rooms are where conversations happen. Give it a clear, memorable name.</p>

        {error && <div className="modal-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            <label className="modal-label">Room Name <span className="required">*</span></label>
            <div className="modal-input-wrap">
              <span className="modal-input-prefix">#</span>
              <input
                ref={inputRef}
                className="modal-input"
                type="text"
                placeholder="e.g. general, dev-chat, random"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                maxLength={30}
              />
              <span className="modal-char-count">{30 - name.length}</span>
            </div>
          </div>

          <div className="modal-field">
            <label className="modal-label">
              Description <span className="optional">(optional)</span>
            </label>
            <textarea
              className="modal-textarea"
              placeholder="What is this room about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              rows={2}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn-create" disabled={creating || !name.trim()}>
              {creating ? <span className="spinner" /> : '✦ Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Sidebar ────────────────────────────────────────────────────── */
export default function Sidebar({ activeRoom, onRoomSelect }) {
  const { user, logout } = useAuth();
  const { socket, connected, onlineUsers } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data } = await api.get('/rooms');
        setRooms(data);
      } catch (err) {
        console.error('Failed to fetch rooms:', err.message);
      }
    };
    fetchRooms();
  }, []);

  const handleRoomSelect = (roomName) => {
    if (!socket || roomName === activeRoom) return;
    socket.emit('join_room', { room: roomName });
    onRoomSelect(roomName);
  };

  const handleRoomCreated = (room) => {
    setRooms((prev) => [...prev, room]);
    handleRoomSelect(room.name);
  };

  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {showModal && (
        <CreateRoomModal
          onClose={() => setShowModal(false)}
          onCreated={handleRoomCreated}
        />
      )}

      <div className="sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">💬</div>
          <div className="sidebar-title">ChatFlow</div>
          <div className="sidebar-conn" title={connected ? 'Connected to server' : 'Disconnected'}>
            <div className={`conn-dot ${connected ? 'connected' : ''}`} />
            <span>{connected ? 'Live' : 'Offline'}</span>
          </div>
        </div>

        {/* Search */}
        <div className="sidebar-search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="sidebar-search"
            type="text"
            placeholder="Search rooms…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="sidebar-scroll">
          {/* Rooms Section */}
          <div className="sidebar-section-header">
            <span>Channels</span>
            <button
              className="sidebar-new-room-btn"
              onClick={() => setShowModal(true)}
              title="Create new room"
            >
              +
            </button>
          </div>

          {filteredRooms.length === 0 && (
            <div className="sidebar-empty">
              {search ? `No rooms matching "${search}"` : 'No rooms yet — create one!'}
            </div>
          )}

          {filteredRooms.map((room) => (
            <div
              key={room._id}
              className={`room-item ${activeRoom === room.name ? 'active' : ''}`}
              onClick={() => handleRoomSelect(room.name)}
            >
              <div className="room-hash">#</div>
              <div className="room-info">
                <div className="room-name">{room.name}</div>
                {room.description && (
                  <div className="room-desc">{room.description}</div>
                )}
              </div>
              {activeRoom === room.name && <div className="room-active-dot" />}
            </div>
          ))}

          {/* Online Users */}
          <div className="sidebar-section-header" style={{ marginTop: 16 }}>
            <span>Online</span>
            <span className="online-count-badge">{onlineUsers.length}</span>
          </div>

          {onlineUsers.map((u, idx) => (
            <div key={idx} className="online-user-item">
              <div className="presence-avatar">
                <div className="avatar">{getInitial(u.username)}</div>
                <div className="presence-dot online" />
              </div>
              <div className={`online-user-name ${u.username === user?.username ? 'you' : ''}`}>
                {u.username}
                {u.username === user?.username && <span className="you-tag">you</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="footer-avatar">{getInitial(user?.username)}</div>
          <div className="user-info">
            <div className="user-info-name">{user?.username}</div>
            <div className="user-info-status">Online</div>
          </div>
          <button className="btn-logout" onClick={logout} title="Sign out">
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
