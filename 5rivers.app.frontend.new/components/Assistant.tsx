
import React, { useState, useRef, useEffect } from 'react';
import { getLogisticsAdvice, parseCommand } from '../geminiService';
import { ViewType } from '../types';

interface AssistantProps {
  onClose: () => void;
  onAction: (view: ViewType) => void;
}

const Assistant: React.FC<AssistantProps> = ({ onClose, onAction }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: 'Hello! I am your AI Logistics Assistant. How can I help you today? You can ask for advice or try commands like "Schedule a job from NY to LA".' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setHistory(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    // Heuristic: if it sounds like a command, try parsing it
    if (userText.toLowerCase().includes('schedule') || userText.toLowerCase().includes('create') || userText.toLowerCase().includes('show')) {
      const parsed = await parseCommand(userText);
      if (parsed.action === 'CREATE_JOB') {
        setHistory(prev => [...prev, { role: 'ai', text: `Understood. Redirecting you to the Create Job view for ${parsed.params.customer || 'a new customer'} from ${parsed.params.origin || 'TBD'} to ${parsed.params.destination || 'TBD'}.` }]);
        setTimeout(() => {
          onAction('create-job');
          onClose();
        }, 1500);
        setIsLoading(false);
        return;
      }
    }

    const aiResponse = await getLogisticsAdvice(userText);
    setHistory(prev => [...prev, { role: 'ai', text: aiResponse || 'Sorry, I couldn\'t process that request.' }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-navy-light w-full max-w-lg rounded-2xl shadow-2xl flex flex-col h-[600px] overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4 bg-navy dark:bg-navy-deep text-white flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
              <span className="material-symbols-outlined">smart_toy</span>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight uppercase">AI Logistics Assistant</h2>
              <p className="text-[10px] text-primary font-bold">POWERED BY GEMINI 3 FLASH</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-slate-50 dark:bg-slate-900/50">
          {history.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-navy text-white rounded-br-none shadow-md' 
                  : 'bg-white dark:bg-navy shadow-sm border border-slate-200 dark:border-slate-800 rounded-bl-none text-navy dark:text-slate-200'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-navy px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-slate-200 dark:border-slate-800 flex gap-1">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-light">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Ask me anything or type a command..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-primary focus:border-primary outline-none"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-navy dark:bg-primary text-white dark:text-navy rounded-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
