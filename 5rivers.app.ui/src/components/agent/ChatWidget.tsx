import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/api/client';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentResponse {
  reply: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; result: string }>;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post<AgentResponse>('/agent/chat', { message: text });
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${errMsg}`, timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 lg:bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark transition-colors flex items-center justify-center"
        title="Open AI Assistant"
      >
        <span className="material-symbols-outlined text-2xl">smart_toy</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] h-[32rem] max-h-[calc(100vh-8rem)] bg-surface rounded-2xl shadow-2xl border border-outline/20 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline/10 bg-surface-variant/30">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">smart_toy</span>
          <span className="font-semibold text-sm">5Rivers Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMessages([])}
            className="p-1.5 rounded-lg hover:bg-surface-variant/50 text-on-surface-variant"
            title="Clear chat"
          >
            <span className="material-symbols-outlined text-lg">delete_sweep</span>
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-surface-variant/50 text-on-surface-variant"
            title="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-on-surface-variant/60 text-sm mt-8">
            <span className="material-symbols-outlined text-4xl mb-2 block">chat</span>
            <p>Send a message to get started.</p>
            <p className="mt-1 text-xs">Try: "Show today's jobs" or paste a job entry</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-surface-variant/50 text-on-surface rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-variant/50 rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-outline/10 px-3 py-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-xl bg-surface-variant/30 px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 border-none outline-none focus:ring-1 focus:ring-primary/50 max-h-24 overflow-y-auto"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="p-2 rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary-dark transition-colors"
          >
            <span className="material-symbols-outlined text-lg">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
