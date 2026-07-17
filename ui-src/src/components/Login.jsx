import { useState } from 'react';
import { useStore } from '../lib/store';
import { initPeer } from '../lib/webrtc';
import { User, LogIn, Plus, Lock } from 'lucide-react';

export default function Login() {
  const { setStore, addToast } = useStore();
  const [name, setName] = useState('');
  const [pfp, setPfp] = useState(null);
  const [isHost, setIsHost] = useState(true);
  const [roomId, setRoomId] = useState('');
  const [pin, setPin] = useState('');

  const handlePfpChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const r = new FileReader();
      r.onload = (val) => setPfp(val.target.result);
      r.readAsDataURL(file);
    }
  };

  const handleConnect = () => {
    // [Punto 3] Replace alert() with toast
    if (!name.trim()) return addToast('El apodo es requerido.', 'error');
    if (!isHost && !roomId.trim()) return addToast('El ID de la sala es requerido.', 'error');

    let finalPfp = pfp;
    if (!finalPfp) {
      finalPfp = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    }

    setStore({ username: name.trim(), myPfp: finalPfp, isHost });
    // [Punto 2] Pass PIN to initPeer
    initPeer(isHost, roomId.trim(), pin.trim());
  };

  return (
    <div className="glass-card w-[360px] p-6 rounded-2xl flex flex-col items-center">
      <img
        src="/logo.png"
        alt="MSN Logo"
        className="w-24 h-24 mb-4 drop-shadow-lg"
      />

      <div className="w-full space-y-4">
        {/* Apodo */}
        <div>
          <label className="text-sm font-semibold mb-1 block">Apodo</label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Tu nombre o apodo"
              className="w-full pl-10 pr-4 py-2 rounded-md border border-msn-border focus:outline-none focus:ring-2 focus:ring-msn-header"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />
          </div>
        </div>

        {/* Foto de perfil */}
        <div>
          <label className="text-sm font-semibold mb-1 block">Foto de perfil (Opcional)</label>
          <div className="flex items-center space-x-4">
            <label className="cursor-pointer bg-white px-4 py-2 rounded-md border border-msn-border hover:bg-gray-50 flex-1 text-center text-sm font-medium">
              Elegir imagen
              <input type="file" accept="image/*" className="hidden" onChange={handlePfpChange} />
            </label>
            {pfp && <img src={pfp} alt="Preview" className="w-10 h-10 rounded-full border border-msn-border object-cover" />}
          </div>
        </div>

        {/* Crear / Unirse */}
        <div className="flex bg-white rounded-md p-1 border border-msn-border">
          <button
            className={`flex-1 py-1.5 text-sm font-semibold rounded ${isHost ? 'bg-msn-active text-msn-text' : 'text-gray-500'}`}
            onClick={() => setIsHost(true)}
          >
            Crear Sala
          </button>
          <button
            className={`flex-1 py-1.5 text-sm font-semibold rounded ${!isHost ? 'bg-msn-active text-msn-text' : 'text-gray-500'}`}
            onClick={() => setIsHost(false)}
          >
            Unirse
          </button>
        </div>

        {/* Room ID (solo guest) */}
        {!isHost && (
          <div>
            <input
              type="text"
              placeholder="ID de la sala"
              className="w-full px-4 py-2 rounded-md border border-msn-border focus:outline-none focus:ring-2 focus:ring-msn-header"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
          </div>
        )}

        {/* [Punto 2] PIN de sala */}
        <div>
          <label className="text-sm font-semibold mb-1 flex items-center gap-1.5 block">
            <Lock className="w-4 h-4 text-msn-header" />
            {isHost ? 'PIN de sala (opcional)' : 'PIN de sala'}
          </label>
          <input
            type="password"
            placeholder={isHost ? 'Dejar vacío = sin PIN' : 'PIN del host'}
            className="w-full px-4 py-2 rounded-md border border-msn-border focus:outline-none focus:ring-2 focus:ring-msn-header"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          />
        </div>

        <button
          onClick={handleConnect}
          className="w-full msn-btn py-2.5 rounded-md font-bold flex items-center justify-center gap-2 mt-2"
        >
          {isHost ? <Plus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
          {isHost ? 'Crear Sala Segura' : 'Conectar'}
        </button>
      </div>
    </div>
  );
}
