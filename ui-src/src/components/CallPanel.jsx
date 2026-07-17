import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { startScreenShare } from '../lib/webrtc';
import {
  PhoneOff, MonitorUp, Mic, MicOff, Video, VideoOff,
  Maximize2, Minimize2, Maximize
} from 'lucide-react';

// Creates a tiny 2x2 black canvas track so replaceTrack always works for screen share
function createBlankVideoTrack() {
  const canvas = Object.assign(document.createElement('canvas'), { width: 2, height: 2 });
  canvas.getContext('2d').fillRect(0, 0, 2, 2);
  const track = canvas.captureStream(1).getVideoTracks()[0];
  track.enabled = false; // Hidden until screen share activates it
  return track;
}

export default function CallPanel() {
  const {
    call, localStream, remoteStream, endCall, isScreenSharing,
    users, myPfp, setStore
  } = useStore();

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const containerRef   = useRef(null);

  const [isMuted,       setIsMuted]       = useState(false);
  const [isVideoOff,    setIsVideoOff]    = useState(false);
  const [isExpanded,    setIsExpanded]    = useState(false);
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  // Detects real video content via metadata dimensions (avoids blank 2x2 canvas)
  const [hasRealRemoteVideo, setHasRealRemoteVideo] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      setHasRealRemoteVideo(false); // Reset until metadata confirms real content
    }
  }, [remoteStream]);

  // Track native fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Detect real video content once loaded (width > 10 means it's not the 2×2 blank canvas)
  const handleRemoteVideoMeta = () => {
    const video = remoteVideoRef.current;
    if (video && video.videoWidth > 10) {
      setHasRealRemoteVideo(true);
    }
  };

  // Re-check on resize (e.g., when screen share ends and track reverts)
  const handleRemoteVideoResize = () => {
    const video = remoteVideoRef.current;
    if (video) setHasRealRemoteVideo(video.videoWidth > 10);
  };

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  };

  const toggleVideo = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOff(v => !v);
  };

  const toggleExpanded = () => setIsExpanded(e => !e);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const hangUp = () => {
    const state = useStore.getState();
    if (state.ringtone) { state.ringtone.pause(); setStore({ ringtone: null }); }
    endCall();
  };

  const callerId   = call?.peer || Object.keys(users)[0];
  const callerName = users[callerId]?.username || 'Usuario';
  const callerPfp  = users[callerId]?.pfp || 'https://ui-avatars.com/api/?name=User';

  const hasLocalVideo = localStream?.getVideoTracks().some(t => t.enabled);
  const showVideo     = hasRealRemoteVideo || isScreenSharing;

  // Panel height: 40% normal, 65% expanded
  const panelH = isExpanded ? 'h-[65%]' : 'h-[40%]';

  return (
    <div
      ref={containerRef}
      className={`${panelH} flex-shrink-0 flex flex-col bg-[#111827] border-b border-gray-700/50
        transition-all duration-300 ease-in-out overflow-hidden`}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white text-xs font-semibold truncate">
            En llamada con <span className="text-green-300">{callerName}</span>
          </span>
          {isScreenSharing && (
            <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
              Compartiendo
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {/* Expand / Shrink within the split layout */}
          <button
            onClick={toggleExpanded}
            className="p-1 text-gray-400 hover:text-white rounded transition-colors"
            title={isExpanded ? 'Reducir panel' : 'Ampliar panel'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {/* Native OS fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1 text-gray-400 hover:text-white rounded transition-colors"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Video / Avatars ── */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#111827] min-h-0">

        {/* Remote video — hidden if no real content */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-contain transition-opacity duration-300 ${showVideo ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'}`}
          onLoadedMetadata={handleRemoteVideoMeta}
          onResize={handleRemoteVideoResize}
        />

        {/* Avatar fallback — shown while no real video */}
        {!showVideo && (
          <div className="flex items-center justify-center gap-10 px-4">
            {/* Me */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <img src={myPfp} alt="Tú"
                  className="w-16 h-16 rounded-full border-2 border-gray-600 object-cover shadow-xl ring-2 ring-gray-700" />
                {isMuted && (
                  <span className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-1 border-2 border-[#111827]">
                    <MicOff className="w-3 h-3 text-white" />
                  </span>
                )}
              </div>
              <span className="text-gray-300 text-[11px] font-medium">Tú</span>
            </div>
            {/* Remote */}
            <div className="flex flex-col items-center gap-1.5">
              <img src={callerPfp} alt={callerName}
                className={`w-16 h-16 rounded-full border-2 border-gray-600 object-cover shadow-xl ring-2 ring-gray-700
                  ${!remoteStream ? 'animate-pulse opacity-50' : ''}`} />
              <span className="text-gray-300 text-[11px] font-medium">{callerName}</span>
              {!remoteStream && (
                <span className="text-gray-500 text-[10px]">Llamando...</span>
              )}
            </div>
          </div>
        )}

        {/* Local PIP — bottom-right corner */}
        {hasLocalVideo && !isVideoOff && (
          <div className="absolute bottom-2 right-2 w-28 aspect-video bg-black rounded-lg overflow-hidden
            border border-gray-600 shadow-xl z-10 ring-1 ring-white/10">
            <video ref={localVideoRef} autoPlay playsInline muted
              className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* ── Controls toolbar ── */}
      <div className="flex items-center justify-center gap-2.5 py-2 px-4 bg-black/50 flex-shrink-0">
        {/* Mute */}
        <button onClick={toggleMute} title={isMuted ? 'Activar micrófono' : 'Silenciar'}
          className={`p-2.5 rounded-full transition-all shadow ${
            isMuted ? 'bg-white text-black' : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}>
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Camera */}
        <button onClick={toggleVideo} title={isVideoOff ? 'Encender cámara' : 'Apagar cámara'}
          className={`p-2.5 rounded-full transition-all shadow ${
            isVideoOff ? 'bg-white text-black' : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}>
          {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        </button>

        {/* Screen share */}
        <button onClick={startScreenShare} title={isScreenSharing ? 'Dejar de compartir' : 'Compartir pantalla'}
          className={`p-2.5 rounded-full transition-all shadow ${
            isScreenSharing ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-400/50' : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}>
          <MonitorUp className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-600 mx-1" />

        {/* Hang up */}
        <button onClick={hangUp} title="Colgar"
          className="p-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition-all hover:scale-105">
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
