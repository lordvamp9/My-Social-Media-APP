import Peer from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import { useStore, TYPE } from './store';

// Helper for broadcasting to all connections
const broadcast = (data) => {
  const { connections } = useStore.getState();
  Object.values(connections).forEach(conn => {
    if (conn.open) conn.send(data);
  });
};

export const initPeer = (isHost, inputRoomId = '') => {
  const { username, myPfp, setStore, addMessage } = useStore.getState();
  
  // Create secure ID if host, else let PeerJS pick a random temporary ID for client
  const myId = isHost ? `msn-${uuidv4().substring(0, 8)}` : undefined;
  
  const peer = new Peer(myId, {
    secure: true,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    },
    debug: 2
  });

  peer.on('open', (id) => {
    setStore({ myId: id, peer });
    if (isHost) {
      addMessage({
        id: uuidv4(), type: TYPE.SYSTEM, text: `Sala creada. ID: ${id}`, timestamp: Date.now()
      });
    } else {
      if (inputRoomId) connectToHost(inputRoomId);
    }
  });

  peer.on('connection', (conn) => {
    handleConnection(conn);
  });

  peer.on('call', (call) => {
    // Automatically ring or show incoming call modal
    setStore({ incomingCall: call });
    
    // Play ringtone if possible (retro phone ring)
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1357/1357-preview.mp3');
    audio.loop = true;
    audio.play().catch(e => console.log('Autoplay blocked', e));
    setStore({ ringtone: audio });
  });

  peer.on('error', (err) => {
    console.error(err);
    alert(`Error WebRTC: ${err.type}`);
  });
};

const handleConnection = (conn) => {
  const { addConnection, removeConnection, addMessage, updateUser, username, myPfp } = useStore.getState();
  
  conn.on('open', () => {
    addConnection(conn);
    // Send my info to the new connection
    conn.send({ type: TYPE.UPDATE_PFP, senderId: useStore.getState().myId, username, pfp: myPfp });
  });

  conn.on('data', (data) => {
    const { type, senderId, text, pfp, username: senderName, fileData } = data;
    
    switch(type) {
      case TYPE.CHAT:
      case TYPE.FILE:
        addMessage({ id: uuidv4(), senderId, text, type, fileData, timestamp: Date.now() });
        // Play msg sound
        new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3').play().catch(e=>{});
        break;
      case TYPE.NUDGE:
        addMessage({ id: uuidv4(), senderId, type: TYPE.NUDGE, text: 'Te ha enviado un zumbido.', timestamp: Date.now() });
        const nudgeAudio = new Audio('/nudge.mp3');
        nudgeAudio.play().catch(e=>{});
        useStore.getState().triggerNudge();
        if (window.chrome && window.chrome.webview) {
          window.chrome.webview.postMessage("nudge");
        }
        break;
      case TYPE.SYSTEM:
        addMessage({ id: uuidv4(), type: TYPE.SYSTEM, text, timestamp: Date.now() });
        break;
      case TYPE.UPDATE_PFP:
        updateUser(senderId, { username: senderName, pfp });
        break;
      case TYPE.END_SESSION:
        alert("El host ha cerrado la sala.");
        useStore.getState().logout();
        break;
    }
  });

  conn.on('close', () => {
    removeConnection(conn.peer);
    addMessage({ id: uuidv4(), type: TYPE.SYSTEM, text: 'Alguien se ha desconectado.', timestamp: Date.now() });
  });
};

export const connectToHost = (hostId) => {
  const { peer, username } = useStore.getState();
  if (!peer) return;
  const conn = peer.connect(hostId, { metadata: { user: username } });
  handleConnection(conn);
};

export const sendMessage = (text) => {
  const { myId } = useStore.getState();
  const data = { type: TYPE.CHAT, senderId: myId, text };
  broadcast(data);
  useStore.getState().addMessage({ id: uuidv4(), ...data, timestamp: Date.now() });
};

export const sendNudge = () => {
  const { myId, triggerNudge } = useStore.getState();
  const data = { type: TYPE.NUDGE, senderId: myId };
  broadcast(data);
  useStore.getState().addMessage({ id: uuidv4(), type: TYPE.NUDGE, senderId: myId, text: 'Has enviado un zumbido.', timestamp: Date.now() });
  
  const nudgeAudio = new Audio('/nudge.mp3');
  nudgeAudio.play().catch(e=>{});
  triggerNudge();
  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.postMessage("nudge");
  }
};

export const sendFile = (file) => {
  const { myId } = useStore.getState();
  const reader = new FileReader();
  reader.onload = (e) => {
    const fileData = { name: file.name, type: file.type, data: e.target.result };
    const data = { type: TYPE.FILE, senderId: myId, text: `Archivo enviado: ${file.name}`, fileData };
    broadcast(data);
    useStore.getState().addMessage({ id: uuidv4(), ...data, timestamp: Date.now() });
  };
  reader.readAsDataURL(file);
};

// --- Call Logic (Video / Audio / Screen Share) ---
const getLocalMediaStream = async (requestedVideo) => {
  // Try 1: Tómalo todo (video y audio)
  try {
    return await navigator.mediaDevices.getUserMedia({ video: requestedVideo, audio: true });
  } catch (err) {
    console.warn("Failed to get stream with video & audio, trying fallback...", err);
  }

  // Try 2: Si pedimos video y falló, intenta solo audio
  if (requestedVideo) {
    try {
      return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    } catch (err) {
      console.warn("Failed to get audio-only stream, trying fallback...", err);
    }
  }

  // Try 3: Intenta solo video (si no hay micro)
  try {
    return await navigator.mediaDevices.getUserMedia({ video: requestedVideo, audio: false });
  } catch (err) {
    console.warn("Failed to get video-only stream, returning empty stream...", err);
  }

  // Try 4: Retorna stream vacío (sin tracks) para conectar de todos modos
  return new MediaStream();
};

export const startCall = async (isVideo) => {
  const { peer, connections, setStore } = useStore.getState();
  const targetId = Object.keys(connections)[0]; // For simplicity, call first connected peer (since it's meant for couples/friends)
  if (!targetId) return alert("Nadie en la sala para llamar.");

  try {
    const stream = await getLocalMediaStream(isVideo);
    setStore({ localStream: stream });
    const call = peer.call(targetId, stream);
    
    call.on('stream', (remoteStream) => {
      setStore({ remoteStream, call });
    });
    call.on('close', () => {
      useStore.getState().endCall();
    });
    setStore({ call });
  } catch (err) {
    console.error("Error accessing media devices.", err);
  }
};

export const answerCall = async (call, isVideo) => {
  const { setStore, ringtone } = useStore.getState();
  if (ringtone) {
    ringtone.pause();
    setStore({ ringtone: null });
  }
  
  try {
    const stream = await getLocalMediaStream(isVideo);
    setStore({ localStream: stream, call, incomingCall: null });
    call.answer(stream);
    call.on('stream', (remoteStream) => {
      setStore({ remoteStream });
    });
    call.on('close', () => {
      useStore.getState().endCall();
    });
  } catch (err) {
    console.error("Error answering call.", err);
  }
};

export const startScreenShare = async () => {
  const { call, localStream, setStore } = useStore.getState();
  if (!call) return;
  
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    
    // Replace the video track
    const videoTrack = screenStream.getVideoTracks()[0];
    const sender = call.peerConnection.getSenders().find(s => s.track.kind === 'video');
    if (sender) {
      sender.replaceTrack(videoTrack);
    } else {
      call.peerConnection.addTrack(videoTrack, screenStream);
    }
    
    videoTrack.onended = () => {
      // Revert to camera
      if (localStream) {
        const camTrack = localStream.getVideoTracks()[0];
        if (camTrack && sender) sender.replaceTrack(camTrack);
      }
      setStore({ isScreenSharing: false });
    };
    
    setStore({ isScreenSharing: true });
  } catch (err) {
    console.error("Error sharing screen", err);
  }
};
