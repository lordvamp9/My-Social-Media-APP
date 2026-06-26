import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { answerCall, startScreenShare } from '../lib/webrtc';
import { PhoneOff, MonitorUp, PhoneCall, Video, Mic, MicOff, VideoOff } from 'lucide-react';

export default function CallModal() {
  const { call, incomingCall, localStream, remoteStream, endCall, isScreenSharing, users, callError, myPfp } = useStore();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  // 1. Error state (Nobody in room)
  if (callError) {
    return (
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-[#1e1e1e] border border-gray-700 w-80 p-6 rounded-2xl flex flex-col items-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <PhoneOff className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-white text-center">Nadie en la sala</h2>
          <p className="text-gray-400 text-center mb-6">No hay nadie disponible para llamar.</p>
          <button onClick={() => useStore.getState().setStore({ callError: null })} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
            Aceptar
          </button>
        </div>
      </div>
    );
  }

  // 2. Incoming call
  if (incomingCall && !call) {
    const callerId = incomingCall.peer;
    const callerName = users[callerId]?.username || 'Alguien';
    const callerPfp = users[callerId]?.pfp || 'https://ui-avatars.com/api/?name=User';
    return (
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-[#1e1e1e] border border-gray-700 w-80 p-6 rounded-2xl flex flex-col items-center animate-bounce shadow-2xl">
          <img src={callerPfp} alt="Caller" className="w-24 h-24 rounded-full border-4 border-green-500 mb-4 animate-pulse shadow-lg shadow-green-500/50 object-cover" />
          <h2 className="text-xl font-bold mb-2 text-white text-center">{callerName} te llama...</h2>
          
          <div className="flex space-x-4 mt-6 w-full">
            <button onClick={() => answerCall(incomingCall, true)} className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl flex justify-center items-center gap-2 font-semibold shadow-lg shadow-green-500/30 transition-transform hover:scale-105">
              <PhoneCall className="w-5 h-5" /> Contestar
            </button>
            <button onClick={() => { incomingCall.close(); useStore.getState().setStore({ incomingCall: null, ringtone: null }); }} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl flex justify-center items-center gap-2 font-semibold shadow-lg shadow-red-500/30 transition-transform hover:scale-105">
              <PhoneOff className="w-5 h-5" /> Rechazar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Active Call or Calling
  if (!call && !useStore.getState().ringtone) return null;

  const callerId = call?.peer || Object.keys(users)[0];
  const callerName = users[callerId]?.username || 'Usuario';
  const callerPfp = users[callerId]?.pfp || 'https://ui-avatars.com/api/?name=User';

  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().length > 0;
  
  return (
    <div className="absolute inset-0 bg-[#000000] flex flex-col z-50">
      {/* Video / Avatars Area */}
      <div className="flex-1 relative p-4 flex items-center justify-center overflow-hidden">
        {hasRemoteVideo ? (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            className="w-full h-full object-contain rounded-xl"
          />
        ) : (
          <div className="flex items-center justify-center space-x-12">
            <div className="relative">
              <img src={myPfp} alt="Me" className="w-40 h-40 rounded-full border-4 border-gray-700 shadow-2xl object-cover" />
              {isMuted && (
                <div className="absolute bottom-1 right-1 bg-red-600 rounded-full p-2 border-4 border-black">
                  <MicOff className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <div className="relative">
              <img src={callerPfp} alt="Them" className={`w-40 h-40 rounded-full border-4 border-gray-700 shadow-2xl object-cover ${!remoteStream ? 'animate-pulse opacity-60' : ''}`} />
              {!remoteStream && (
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-gray-400 font-medium whitespace-nowrap bg-black/50 px-3 py-1 rounded-full">
                  Llamando...
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Local Video Mini */}
        {localStream && !isVideoOff && hasRemoteVideo && (
          <div className="absolute bottom-24 right-6 w-48 aspect-video bg-black rounded-lg overflow-hidden border-2 border-gray-700 shadow-2xl z-10">
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="h-28 bg-gradient-to-t from-black to-transparent flex items-end pb-8 justify-center gap-6">
        <button 
          onClick={toggleMute}
          className={`p-4 rounded-full transition-colors shadow-lg ${isMuted ? 'bg-white text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
          title={isMuted ? "Activar micrófono" : "Silenciar"}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        
        <button 
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-colors shadow-lg ${isVideoOff ? 'bg-white text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
          title={isVideoOff ? "Encender cámara" : "Apagar cámara"}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>

        <button 
          onClick={startScreenShare}
          className={`p-4 rounded-full transition-colors shadow-lg ${isScreenSharing ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
          title="Compartir Pantalla"
        >
          <MonitorUp className="w-6 h-6" />
        </button>

        <button 
          onClick={() => {
            if (useStore.getState().ringtone) {
              useStore.getState().ringtone.pause();
              useStore.getState().setStore({ ringtone: null });
            }
            endCall();
          }}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition-transform hover:scale-110 ml-6"
          title="Colgar"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
