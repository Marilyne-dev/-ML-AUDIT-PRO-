import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';

const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://127.0.0.1:8000"
  : "https://ml-audit-pro.onrender.com";

const ChatBot = ({ missionId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Bonjour ! Je suis votre assistant audit. Posez-moi une question sur les anomalies détectées.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || !missionId) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

        try {
    console.log("Envoi question...");
    
    const res = await axios.post(
        `${API_URL}/chat/${missionId}`,
        { question: userMsg },
        { timeout: 20000 }
    );

    console.log("Réponse serveur:", res.data);

    setMessages(prev => [
        ...prev,
        { role: 'ai', text: res.data.reponse || "Pas de réponse reçue." }
    ]);

    } catch (error) {
    console.error("Erreur chatbot:", error);

    setMessages(prev => [
        ...prev,
        { role: 'ai', text: "⚠️ Le serveur ne répond pas." }
    ]);
    }
    finally {
        setLoading(false);
        }
    };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Fenêtre de Chat */}
      {isOpen && (
        <div className="bg-white w-80 h-96 rounded-2xl shadow-2xl border border-slate-200 flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Bot size={20} />
                <span className="font-bold text-sm">Assistant Audit IA</span>
            </div>
            <button onClick={() => setIsOpen(false)}><X size={18} /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`p-2 rounded-lg text-xs max-w-[80%] ${
                  m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-xs text-slate-400 italic text-center">L'IA réfléchit...</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input 
              type="text" 
              className="flex-1 text-xs p-2 bg-slate-100 rounded-lg outline-none focus:ring-1 ring-blue-500"
              placeholder="Posez votre question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={loading} className="text-blue-600 hover:text-blue-800 disabled:opacity-50">
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Bouton Flottant */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition transform hover:scale-105"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
};

export default ChatBot;