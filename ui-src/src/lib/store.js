import { create } from 'zustand';

export const TYPE = {
  CHAT: 'CHAT',
  FILE: 'FILE',
  NUDGE: 'NUDGE',
  SYSTEM: 'SYSTEM',
  UPDATE_PFP: 'UPDATE_PFP',
  END_SESSION: 'END_SESSION',
  GAME_INVITE: 'GAME_INVITE',
  GAME_MOVE: 'GAME_MOVE'
};

export const useStore = create((set, get) => ({
  peer: null,
  myId: null,
  username: '',
  myPfp: 'https://ui-avatars.com/api/?name=User',
  isHost: false,
  roomId: '', // If joined
  
  connections: {}, // Record<string, DataConnection>
  users: {}, // Record<string, { username: string, pfp: string }>
  messages: [], // Array of { id, senderId, senderName, text, type, timestamp, fileData? }
  
  // Call state
  call: null,
  localStream: null,
  remoteStream: null,
  incomingCall: null,
  isScreenSharing: false,
  
  // Game state
  gameOpen: false,
  gameState: Array(9).fill(null),
  gameOpponent: null,
  myGameSymbol: null,
  isMyTurn: false,

  setStore: (data) => set(data),
  
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  
  addConnection: (conn) => set((state) => ({
    connections: { ...state.connections, [conn.peer]: conn }
  })),
  
  removeConnection: (peerId) => set((state) => {
    const newConns = { ...state.connections };
    delete newConns[peerId];
    const newUsers = { ...state.users };
    delete newUsers[peerId];
    return { connections: newConns, users: newUsers };
  }),
  
  updateUser: (peerId, userData) => set((state) => ({
    users: { ...state.users, [peerId]: { ...state.users[peerId], ...userData } }
  })),

  endCall: () => {
    const state = get();
    if (state.call) state.call.close();
    if (state.localStream) {
      state.localStream.getTracks().forEach(t => t.stop());
    }
    set({ call: null, localStream: null, remoteStream: null, isScreenSharing: false });
  },
  
  logout: () => {
    const state = get();
    if (state.peer) state.peer.destroy();
    if (state.localStream) state.localStream.getTracks().forEach(t => t.stop());
    set({
      peer: null, myId: null, connections: {}, users: {}, messages: [],
      call: null, localStream: null, remoteStream: null, isScreenSharing: false,
      gameOpen: false
    });
  }
}));
