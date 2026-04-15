import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/api/client';

interface AttachedImage {
  data: string;      // base64 (no prefix)
  mimeType: string;
  previewUrl: string; // object URL for thumbnail
  name: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imagePreviews?: string[]; // object URLs shown in the chat bubble
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
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const [prefix, data] = dataUrl.split(',');
        const mimeType = prefix.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
        setAttachedImages((prev) => [
          ...prev,
          { data, mimeType, previewUrl: dataUrl, name: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    });
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

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
    if ((!text && attachedImages.length === 0) || loading) return;

    const previews = attachedImages.map((img) => img.previewUrl);
    const userMsg: ChatMessage = {
      role: 'user',
      content: text || '(image)',
      timestamp: new Date(),
      imagePreviews: previews.length ? previews : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    const imagesToSend = attachedImages.map(({ data, mimeType }) => ({ data, mimeType }));
    setAttachedImages([]);
    setLoading(true);

    try {
      const res = await api.post<AgentResponse>('/agent/chat', {
        message: text || 'Please extract the job information from the attached image(s).',
        images: imagesToSend.length ? imagesToSend : undefined,
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply, timestamp: new Date() },
      ]);
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
            onClick={() => {
              setMessages([]);
              setAttachedImages([]);
              api.post('/agent/clear').catch(() => {});
            }}
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
            <p className="mt-1 text-xs">Try: "Show today's jobs" or attach a ticket photo</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-surface-variant/50 text-on-surface rounded-bl-md'
              }`}
            >
              {/* Image thumbnails in user bubble */}
              {msg.imagePreviews?.length && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {msg.imagePreviews.map((url, j) => (
                    <img
                      key={j}
                      src={url}
                      alt="attachment"
                      className="h-24 w-auto rounded-lg object-cover border border-white/20"
                    />
                  ))}
                </div>
              )}
              {msg.role === 'user' ? (
                msg.content !== '(image)' && (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li className="leading-snug">{children}</li>,
                    code: ({ children, className }) =>
                      className ? (
                        <code className="block bg-black/10 rounded px-2 py-1 text-xs font-mono mt-1 mb-1.5 whitespace-pre-wrap">{children}</code>
                      ) : (
                        <code className="bg-black/10 rounded px-1 font-mono text-xs">{children}</code>
                      ),
                    h1: ({ children }) => <p className="font-bold text-base mb-1">{children}</p>,
                    h2: ({ children }) => <p className="font-bold mb-1">{children}</p>,
                    h3: ({ children }) => <p className="font-semibold mb-0.5">{children}</p>,
                    hr: () => <hr className="border-on-surface/20 my-2" />,
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-2 rounded-lg border border-on-surface/10">
                        <table className="w-full text-xs border-collapse">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className="bg-on-surface/5">{children}</thead>,
                    tbody: ({ children }) => <tbody className="divide-y divide-on-surface/10">{children}</tbody>,
                    tr: ({ children }) => <tr className="hover:bg-on-surface/5 transition-colors">{children}</tr>,
                    th: ({ children }) => (
                      <th className="px-2 py-1.5 text-left font-semibold text-on-surface/70 whitespace-nowrap border-b border-on-surface/10">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-2 py-1.5 text-on-surface/90 align-top">{children}</td>
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
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

      {/* Staged image previews */}
      {attachedImages.length > 0 && (
        <div className="px-3 pt-2 flex gap-2 flex-wrap border-t border-outline/10">
          {attachedImages.map((img, i) => (
            <div key={i} className="relative">
              <img src={img.previewUrl} alt={img.name} className="h-16 w-16 object-cover rounded-lg border border-outline/20" />
              <button
                onClick={() => setAttachedImages((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-white flex items-center justify-center text-xs shadow"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-outline/10 px-3 py-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-variant/50 disabled:opacity-40 transition-colors flex-shrink-0"
            title="Attach image"
          >
            <span className="material-symbols-outlined text-lg">attach_file</span>
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={attachedImages.length ? 'Add a message or send image…' : 'Type a message...'}
            rows={1}
            className="flex-1 resize-none rounded-xl bg-surface-variant/30 px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 border-none outline-none focus:ring-1 focus:ring-primary/50 max-h-24 overflow-y-auto"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || (!input.trim() && attachedImages.length === 0)}
            className="p-2 rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary-dark transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-lg">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
