import Peer from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import { useStore, TYPE } from './store';
import { initCrypto, encryptMessage, decryptMessage } from './crypto';

// Helper: show a toast without importing React hooks
const toast = (message, type = 'info') => useStore.getState().addToast(message, type);

// Helper: broadcast to all open connections
const broadcast = (data) => {
  const { connections } = useStore.getState();
  Object.values(connections).forEach((conn) => {
    if (conn.open) conn.send(data);
  });
};

export const initPeer = (isHost, inputRoomId = '', roomPin = '') => {
  const { username, myPfp, setStore, addMessage } = useStore.getState();

  // [Punto 2] Store the PIN for this session
  setStore({ roomPin });

  // Host gets a deterministic ID; guest gets a random temp one
  const myId = isHost ? `msn-${uuidv4().substring(0, 8)}` : undefined;

  const peer = new Peer(myId, {
    // [Punto 1] Own PeerJS signaling server hosted on Render (free tier)
    host: 'my-social-media-app-h1v1.onrender.com',
    port: 443,
    path: '/',
    secure: true,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    },
    debug: 0,
  });

  peer.on('open', (id) => {
    setStore({ myId: id, peer });

    // [Punto 4] Init E2E encryption key from the room/host peer ID
    const roomKeyId = isHost ? id : inputRoomId;
    initCrypto(roomKeyId);

    if (isHost) {
      addMessage({ id: uuidv4(), type: TYPE.SYSTEM, text: `Sala creada. ID: ${id}`, timestamp: Date.now() });
    } else {
      if (inputRoomId) connectToHost(inputRoomId);
    }
  });

  peer.on('connection', (conn) => {
    handleConnection(conn);
  });

  peer.on('call', (call) => {
    setStore({ incomingCall: call });
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1357/1357-preview.mp3');
    audio.loop = true;
    audio.play().catch((e) => console.log('Autoplay blocked', e));
    setStore({ ringtone: audio });
  });

  peer.on('error', (err) => {
    console.error('[PeerJS Error]', err);
    // [Punto 3] Replace alert() with toast
    toast(`Error de conexión: ${err.type}`, 'error');
  });
};

const handleConnection = (conn) => {
  const { addConnection, removeConnection, addMessage, updateUser, username, myPfp } = useStore.getState();

  conn.on('open', () => {
    addConnection(conn);
    // Send my info — include PIN attempt so host can verify [Punto 2]
    conn.send({
      type: TYPE.UPDATE_PFP,
      senderId: useStore.getState().myId,
      username,
      pfp: myPfp,
      pin: useStore.getState().roomPin,  // guest sends their PIN; host sends '' (ignored)
    });
  });

  conn.on('data', async (data) => {
    const { type, senderId, text, pfp, username: senderName, fileData } = data;

    switch (type) {
      case TYPE.CHAT: {
        // [Punto 4] Decrypt incoming message
        const plainText = await decryptMessage(text);
        addMessage({ id: uuidv4(), senderId, text: plainText, type, timestamp: Date.now() });
        new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3').play().catch(() => {});
        break;
      }
      case TYPE.FILE:
        addMessage({ id: uuidv4(), senderId, text, type, fileData, timestamp: Date.now() });
        new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3').play().catch(() => {});
        break;
      case TYPE.NUDGE:
        addMessage({ id: uuidv4(), senderId, type: TYPE.NUDGE, text: 'Te ha enviado un zumbido.', timestamp: Date.now() });
        new Audio('/nudge.mp3').play().catch(() => {});
        useStore.getState().triggerNudge();
        if (window.chrome?.webview) window.chrome.webview.postMessage('nudge');
        break;
      case TYPE.SYSTEM:
        addMessage({ id: uuidv4(), type: TYPE.SYSTEM, text, timestamp: Date.now() });
        break;
      case TYPE.UPDATE_PFP: {
        // [Punto 2] Host verifies PIN before accepting the guest
        const hostPin = useStore.getState().roomPin;
        if (hostPin && data.pin !== hostPin) {
          conn.send({ type: TYPE.PIN_REJECTED });
          conn.close();
          return;
        }
        updateUser(senderId, { username: senderName, pfp });
        break;
      }
      case TYPE.PIN_REJECTED:
        // [Punto 2 + 3] Guest receives rejection — toast + logout
        toast('PIN incorrecto. Acceso denegado.', 'error');
        useStore.getState().logout();
        break;
      case TYPE.END_SESSION:
        // [Punto 3] Replace alert with toast
        toast('El host ha cerrado la sala.', 'error');
        useStore.getState().logout();
        break;
      case TYPE.CALL_REJECTED:
        useStore.getState().endCall();
        addMessage({ id: uuidv4(), type: TYPE.SYSTEM, text: 'Llamada rechazada.', timestamp: Date.now() });
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

export const sendMessage = async (text) => {
  const { myId } = useStore.getState();
  // [Punto 4] Encrypt before sending
  const encryptedText = await encryptMessage(text);
  const data = { type: TYPE.CHAT, senderId: myId, text: encryptedText };
  broadcast(data);
  // Add plain text locally (no need to decrypt what we just typed)
  useStore.getState().addMessage({ id: uuidv4(), type: TYPE.CHAT, senderId: myId, text, timestamp: Date.now() });
};

export const sendNudge = () => {
  const { myId, triggerNudge } = useStore.getState();
  const data = { type: TYPE.NUDGE, senderId: myId };
  broadcast(data);
  useStore.getState().addMessage({ id: uuidv4(), type: TYPE.NUDGE, senderId: myId, text: 'Has enviado un zumbido.', timestamp: Date.now() });
  new Audio('/nudge.mp3').play().catch(() => {});
  triggerNudge();
  if (window.chrome?.webview) window.chrome.webview.postMessage('nudge');
};

export const sendFile = (file) => {
  const { myId } = useStore.getState();
  const reader = new FileReader();
  reader.onload = (e) => {
    const fileData = { name: file.name, type: file.type, data: e.target.result };
    const data = { type: TYPE.FILE, senderId: myId, text: `Archivo: ${file.name}`, fileData };
    broadcast(data);
    useStore.getState().addMessage({ id: uuidv4(), ...data, timestamp: Date.now() });
  };
  reader.readAsDataURL(file);
};

// --- Call Logic ---
const getLocalMediaStream = async (requestedVideo) => {
  const cameraConstraints = requestedVideo
    ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
    : false;
  try {
    return await navigator.mediaDevices.getUserMedia({ video: cameraConstraints, audio: true });
  } catch (_) {}
  if (requestedVideo) {
    try { return await navigator.mediaDevices.getUserMedia({ video: false, audio: true }); } catch (_) {}
  }
  try { return await navigator.mediaDevices.getUserMedia({ video: cameraConstraints, audio: false }); } catch (_) {}
  return new MediaStream();
};

export const startCall = async (isVideo) => {
  const { peer, connections, setStore } = useStore.getState();
  const targetId = Object.keys(connections)[0];
  if (!targetId) return toast('Nadie en la sala para llamar.', 'error');
  try {
    const stream = await getLocalMediaStream(isVideo);
    setStore({ localStream: stream });
    const call = peer.call(targetId, stream);
    call.on('stream', (remoteStream) => setStore({ remoteStream, call }));
    call.on('close', () => useStore.getState().endCall());
    setStore({ call });
  } catch (err) {
    console.error('Error accessing media devices.', err);
    toast('No se pudo acceder al micrófono o cámara.', 'error');
  }
};

export const answerCall = async (call, isVideo) => {
  const { setStore, ringtone } = useStore.getState();
  if (ringtone) { ringtone.pause(); setStore({ ringtone: null }); }
  try {
    const stream = await getLocalMediaStream(isVideo);
    setStore({ localStream: stream, call, incomingCall: null });
    call.answer(stream);
    call.on('stream', (remoteStream) => setStore({ remoteStream }));
    call.on('close', () => useStore.getState().endCall());
  } catch (err) {
    console.error('Error answering call.', err);
    toast('No se pudo contestar la llamada.', 'error');
  }
};

export const startScreenShare = async () => {
  const { call, localStream, setStore } = useStore.getState();
  if (!call) return;
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } },
    });
    const videoTrack = screenStream.getVideoTracks()[0];
    const sender = call.peerConnection.getSenders().find((s) => s.track && s.track.kind === 'video');
    if (sender) {
      sender.replaceTrack(videoTrack);
    } else {
      call.peerConnection.addTrack(videoTrack, screenStream);
    }
    videoTrack.onended = () => {
      if (localStream) {
        const camTrack = localStream.getVideoTracks()[0];
        if (camTrack && sender) sender.replaceTrack(camTrack);
      }
      setStore({ isScreenSharing: false });
    };
    setStore({ isScreenSharing: true });
  } catch (err) {
    console.error('Error sharing screen', err);
    toast('No se pudo compartir la pantalla.', 'error');
  }
};
