import { useState, useRef, useEffect } from 'react';
import { useStore, TYPE } from '../lib/store';
import { sendMessage, sendNudge, sendFile, startCall } from '../lib/webrtc';
import { Video, Phone, BellRing, Paperclip, Send, Gamepad2, Download } from 'lucide-react';

export default function ChatArea() {
  const { messages, myId, users } = useStore();
  const [text, setText] = useState('');
  const [stagingFile, setStagingFile] = useState(null);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (stagingFile) {
      sendFile(stagingFile);
      setStagingFile(null);
    }
    if (text.trim()) {
      sendMessage(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setStagingFile(e.target.files[0]);
    }
  };

  return (
    <>
      {/* Top Header (Discord Style) */}
      <div className="h-14 border-b border-msn-border bg-white flex items-center justify-between px-4 shadow-sm z-10">
        <div className="flex items-center space-x-2 text-msn-text font-bold">
          <span className="text-gray-400 text-xl">#</span>
          <span>Sala General</span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button onClick={() => startCall(false)} className="p-2 text-gray-500 hover:text-msn-text hover:bg-gray-100 rounded" title="Llamada de voz">
            <Phone className="w-5 h-5" />
          </button>
          <button onClick={() => startCall(true)} className="p-2 text-gray-500 hover:text-msn-text hover:bg-gray-100 rounded" title="Videollamada">
            <Video className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button onClick={sendNudge} className="p-2 text-yellow-500 hover:bg-yellow-50 rounded" title="Enviar Zumbido">
            <BellRing className="w-5 h-5" />
          </button>
          <button className="p-2 text-blue-500 hover:bg-blue-50 rounded" title="Jugar Tres en Raya (Próximamente)">
            <Gamepad2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((msg) => {
          const isMe = msg.senderId === myId;
          const senderInfo = isMe ? { username: useStore.getState().username, pfp: useStore.getState().myPfp } : (users[msg.senderId] || { username: 'Desconocido', pfp: 'https://ui-avatars.com/api/?name=?' });
          
          if (msg.type === TYPE.SYSTEM) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{msg.text}</span>
              </div>
            );
          }

          if (msg.type === TYPE.NUDGE) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="text-sm font-bold text-red-500 animate-pulse">{senderInfo.username} {msg.text}</span>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
              <img src={senderInfo.pfp} alt={senderInfo.username} className={`w-8 h-8 rounded-full border border-gray-200 ${isMe ? 'ml-2' : 'mr-2'}`} />
              
              <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-gray-500 mb-1 px-1">{senderInfo.username}</span>
                <div className={`p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-msn-header text-white rounded-br-none' : 'bg-gray-100 text-msn-text rounded-bl-none'}`}>
                  {msg.type === TYPE.CHAT && <p className="whitespace-pre-wrap">{msg.text}</p>}
                  
                  {msg.type === TYPE.FILE && msg.fileData && (
                    <div className="flex flex-col items-center">
                      {msg.fileData.type.startsWith('image/') ? (
                        <img src={msg.fileData.data} alt="Adjunto" className="max-w-xs rounded-lg mt-2 cursor-pointer" onClick={() => window.open(msg.fileData.data)} />
                      ) : (
                        <div className="flex items-center space-x-2 bg-black/10 p-2 rounded mt-2">
                          <Download className="w-4 h-4" />
                          <a href={msg.fileData.data} download={msg.fileData.name} className="font-semibold underline hover:text-blue-200">
                            {msg.fileData.name}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area (Discord style) */}
      <div className="p-4 bg-white border-t border-msn-border">
        {stagingFile && (
          <div className="mb-2 flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md border border-blue-200 w-max">
            <Paperclip className="w-4 h-4" />
            <span className="text-sm font-medium">{stagingFile.name}</span>
            <button onClick={() => setStagingFile(null)} className="ml-2 font-bold hover:text-red-500">✕</button>
          </div>
        )}
        <div className="bg-gray-100 rounded-lg flex items-center px-2 py-2">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-msn-text hover:bg-gray-200 rounded-full transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          
          <textarea 
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enviar un mensaje..."
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 px-3 py-2 text-sm text-msn-text"
            rows="1"
          />
          
          <button 
            onClick={handleSend} 
            disabled={!text.trim() && !stagingFile}
            className={`p-2 rounded-full transition-colors ${text.trim() || stagingFile ? 'text-white bg-msn-header hover:bg-msn-header-dark' : 'text-gray-400'}`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
