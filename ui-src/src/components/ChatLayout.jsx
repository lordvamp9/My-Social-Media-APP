import { useStore } from '../lib/store';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';

export default function ChatLayout() {
  const { isHost } = useStore();

  return (
    <div className="w-full h-full flex bg-msn-bg relative overflow-hidden">
      {/* Discord-style Sidebar with MSN colors */}
      <Sidebar />
      
      {/* Discord-style Main Area */}
      <div className="flex-1 flex flex-col h-full bg-msn-chat border-l border-msn-border">
        <ChatArea />
      </div>
    </div>
  );
}
