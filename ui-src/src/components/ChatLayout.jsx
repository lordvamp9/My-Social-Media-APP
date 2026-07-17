import { useStore } from '../lib/store';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import CallPanel from './CallPanel';

export default function ChatLayout() {
  const { isNudging, call } = useStore();

  return (
    <div className={`w-full h-full flex bg-msn-bg relative overflow-hidden ${isNudging ? 'nudge-shake' : ''}`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main content — splits vertically when in a call */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-msn-chat border-l border-msn-border">
        {/* Discord-style embedded call panel (40% / 65% top) */}
        {call && <CallPanel />}

        {/* Chat takes remaining space — min-h-0 is critical for overflow-y-auto inside */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatArea />
        </div>
      </div>
    </div>
  );
}
