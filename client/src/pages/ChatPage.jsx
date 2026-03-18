import { useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import ChatPanel from '../components/ChatPanel.jsx';

export default function ChatPage() {
  const [activeRoom, setActiveRoom] = useState(null);

  return (
    <div className="app-layout">
      <Sidebar activeRoom={activeRoom} onRoomSelect={setActiveRoom} />
      <ChatPanel activeRoom={activeRoom} />
    </div>
  );
}
