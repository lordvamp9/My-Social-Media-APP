import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import Login from './Login';
import ChatLayout from './ChatLayout';
import CallModal from './CallModal';
import Toast from './Toast';

export default function App() {
  const { peer, incomingCall, callError } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="h-full w-full flex items-center justify-center relative">
      {!peer ? <Login /> : <ChatLayout />}

      {/* Overlays: incoming call + error only (active call is embedded in ChatLayout > CallPanel) */}
      {(incomingCall || callError) && <CallModal />}

      {/* Global toast notifications */}
      <Toast />
    </div>
  );
}
