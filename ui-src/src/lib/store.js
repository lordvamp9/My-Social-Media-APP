import { create } from 'zustand';

export const TYPE = {
  CHAT: 'CHAT',
  FILE: 'FILE',
  NUDGE: 'NUDGE',
  SYSTEM: 'SYSTEM',
  UPDATE_PFP: 'UPDATE_PFP',
  END_SESSION: 'END_SESSION',
  GAME_INVITE: 'GAME_INVITE',
  GAME_MOVE: 'GAME_MOVE',
  CALL_REJECTED: 'CALL_REJECTED',
  PIN_REJECTED: 'PIN_REJECTED',   // [Punto 2] New: PIN auth rejection
};

export const useStore = create((set, get) => ({
  peer: null,
  myId: null,
  username: '',
  myPfp: 'https://ui-avatars.com/api/?name=User',
  isHost: false,
  roomId: '',
  roomPin: '',   // [Punto 2] PIN for room auth (host: validates; guest: sends)

  connections: {}, // Record<string, DataConnection>
  users: {},       // Record<string, { username: string, pfp: string }>
  messages: [],    // Array of { id, senderId, text, type, timestamp, fileData? }

  // [Punto 3] Toast notifications
  toasts: [],
  addToast: (message, type = 'info') => set((state) => ({
    toasts: [...state.toasts, { id: Date.now() + Math.random(), message, type }],
  })),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),

  // Call state
  call: null,
  localStream: null,
  remoteStream: null,
  incomingCall: null,
  isScreenSharing: false,
  isNudging: false,
  triggerNudge: () => {
    set({ isNudging: true });
    setTimeout(() => set({ isNudging: false }), 1000);
  },

  // Game state
  gameOpen: false,
  gameState: Array(9).fill(null),
  gameOpponent: null,
  myGameSymbol: null,
  isMyTurn: false,

  setStore: (data) => set(data),

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  addConnection: (conn) => set((state) => ({
    connections: { ...state.connections, [conn.peer]: conn },
  })),

  removeConnection: (peerId) => set((state) => {
    const newConns = { ...state.connections };
    delete newConns[peerId];
    const newUsers = { ...state.users };
    delete newUsers[peerId];
    return { connections: newConns, users: newUsers };
  }),

  updateUser: (peerId, userData) => set((state) => ({
    users: { ...state.users, [peerId]: { ...state.users[peerId], ...userData } },
  })),

  endCall: () => {
    const state = get();
    if (state.call) state.call.close();
    if (state.localStream) {
      state.localStream.getTracks().forEach((t) => t.stop());
    }
    set({ call: null, localStream: null, remoteStream: null, isScreenSharing: false });
  },

  logout: () => {
    const state = get();
    if (state.peer) state.peer.destroy();
    if (state.localStream) state.localStream.getTracks().forEach((t) => t.stop());
    set({
      peer: null, myId: null, connections: {}, users: {}, messages: [],
      call: null, localStream: null, remoteStream: null, isScreenSharing: false,
      gameOpen: false, roomPin: '',
    });
  },
}));
