import { useStore } from '../lib/store';
import { Copy, LogOut } from 'lucide-react';

export default function Sidebar() {
  const { myId, username, myPfp, isHost, users, logout } = useStore();
  const userList = Object.values(users);

  const copyId = () => {
    navigator.clipboard.writeText(myId);
    alert('ID copiado al portapapeles');
  };

  return (
    <div className="w-64 flex flex-col bg-msn-sidebar border-r border-msn-border shadow-msn z-10">
      {/* Header */}
      <div className="p-4 msn-gradient border-b border-msn-border text-white shadow-md">
        <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
          <img src="/logo.png" alt="logo" className="w-6 h-6" />
          Messenger
        </h2>
        {isHost && (
          <div className="text-xs bg-black/20 rounded p-2 flex items-center justify-between cursor-pointer hover:bg-black/30" onClick={copyId}>
            <span className="truncate mr-2">ID: {myId}</span>
            <Copy className="w-4 h-4 shrink-0" />
          </div>
        )}
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Conectados ({userList.length})</h3>
        {userList.length === 0 && (
          <p className="text-sm text-gray-400 italic">Esperando a que alguien se una...</p>
        )}
        {userList.map((u, i) => (
          <div key={i} className="flex items-center space-x-3 p-2 hover:bg-msn-active rounded cursor-pointer transition-colors">
            <div className="relative">
              <img src={u.pfp} alt={u.username} className="w-8 h-8 rounded-full border border-msn-border object-cover" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
            <span className="text-sm font-semibold truncate text-msn-text">{u.username}</span>
          </div>
        ))}
      </div>

      {/* Current User Area (Discord style at bottom) */}
      <div className="p-3 bg-[#D3E5FA] border-t border-msn-border flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="relative">
            <img src={myPfp} alt={username} className="w-10 h-10 rounded border-2 border-white object-cover shadow-sm" />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
          </div>
          <div className="flex flex-col truncate">
            <span className="text-sm font-bold text-msn-text">{username}</span>
            <span className="text-xs text-green-700">Conectado</span>
          </div>
        </div>
        <button 
          onClick={logout} 
          className="p-2 hover:bg-red-100 text-red-500 rounded transition-colors"
          title="Desconectar"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
