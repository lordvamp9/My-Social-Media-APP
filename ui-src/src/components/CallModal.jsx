import { useStore } from '../lib/store';
import { answerCall } from '../lib/webrtc';
import { PhoneOff, PhoneCall } from 'lucide-react';

export default function CallModal() {
  const { call, incomingCall, users, callError, setStore } = useStore();

  // ── 1. Error state ──
  if (callError) {
    return (
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-[#1e1e1e] border border-gray-700 w-80 p-6 rounded-2xl flex flex-col items-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <PhoneOff className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-white text-center">Nadie en la sala</h2>
          <p className="text-gray-400 text-center mb-6">No hay nadie disponible para llamar.</p>
          <button
            onClick={() => setStore({ callError: null })}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Aceptar
          </button>
        </div>
      </div>
    );
  }

  // ── 2. Incoming call overlay ──
  if (incomingCall && !call) {
    const callerId  = incomingCall.peer;
    const callerName = users[callerId]?.username || 'Alguien';
    const callerPfp  = users[callerId]?.pfp || 'https://ui-avatars.com/api/?name=User';

    const reject = () => {
      const state = useStore.getState();
      const conn = state.connections[incomingCall.peer];
      if (conn) conn.send({ type: 'CALL_REJECTED' });
      if (state.ringtone) { state.ringtone.pause(); }
      incomingCall.close();
      state.setStore({ incomingCall: null, ringtone: null });
    };

    return (
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-[#1e1e1e] border border-gray-700 w-80 p-6 rounded-2xl flex flex-col items-center shadow-2xl">
          <img
            src={callerPfp}
            alt="Llamada entrante"
            className="w-24 h-24 rounded-full border-4 border-green-500 mb-4 animate-pulse shadow-lg shadow-green-500/40 object-cover"
          />
          <h2 className="text-xl font-bold mb-1 text-white text-center">{callerName} te llama...</h2>
          <p className="text-gray-400 text-sm mb-6">Llamada entrante</p>
          <div className="flex gap-4 w-full">
            <button
              onClick={() => answerCall(incomingCall, true)}
              className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl flex justify-center items-center gap-2 font-semibold shadow-lg shadow-green-500/30 transition-all hover:scale-105"
            >
              <PhoneCall className="w-5 h-5" /> Contestar
            </button>
            <button
              onClick={reject}
              className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl flex justify-center items-center gap-2 font-semibold shadow-lg shadow-red-500/30 transition-all hover:scale-105"
            >
              <PhoneOff className="w-5 h-5" /> Rechazar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
