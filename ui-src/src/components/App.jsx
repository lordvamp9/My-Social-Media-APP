import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import Login from './Login';
import ChatLayout from './ChatLayout';
import CallModal from './CallModal';

export default function App() {
  const { peer, incomingCall } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="h-full w-full flex items-center justify-center relative">
      {!peer ? <Login /> : <ChatLayout />}
      
      {/* WebRTC Modals */}
      {(useStore.getState().call || incomingCall || useStore.getState().callError) && <CallModal />}
    </div>
  );
}
