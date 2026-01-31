
import React, { useState, useRef, useEffect } from 'react';
import { askSage } from '../services/gemini';
import { Message } from '../types';
import { Sparkles, Send, User, Bot, X } from 'lucide-react';

interface SagePanelProps {
  onClose: () => void;
  initialLocationName?: string;
}

const SagePanel: React.FC<SagePanelProps> = ({ onClose, initialLocationName }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialLocationName) {
      handleSend(`${initialLocationName}에 대해 알려줘.`);
    }
  }, [initialLocationName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    const userMsg = text || input;
    if (!userMsg.trim()) return;

    const newMessages = [...messages, { role: 'user', content: userMsg } as Message];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const answer = await askSage(userMsg, messages);
    setMessages([...newMessages, { role: 'assistant', content: answer } as Message]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-md text-slate-100 shadow-2xl border-l border-white/10">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Sparkles className="text-amber-400" size={20} />
          <h2 className="font-fantasy text-lg text-amber-200">대현자의 지혜</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-amber-600">
        {messages.length === 0 && (
          <div className="text-center py-10 text-slate-400 italic">
            "지도에 대해 궁금한 것이 있다면 무엇이든 물어보게나..."
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-amber-600' : 'bg-slate-700 border border-amber-500/30'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} className="text-amber-400" />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-amber-600/20 text-amber-50 border border-amber-500/30' 
                : 'bg-slate-800/80 text-slate-200 border border-white/5'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-slate-700 shrink-0" />
            <div className="h-10 w-2/3 bg-slate-700 rounded-2xl" />
          </div>
        )}
      </div>

      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
        className="p-4 bg-slate-800/50 border-t border-white/10 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="대현자에게 묻기..."
          className="flex-1 bg-slate-700/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-slate-500"
        />
        <button 
          type="submit"
          disabled={isLoading}
          className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 p-2 rounded-lg transition-colors shadow-lg"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default SagePanel;
