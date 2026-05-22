import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttachedImage {
  data: string;      // base64 (no prefix)
  mimeType: string;
  previewUrl: string;
  name: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imagePreviews?: string[];
}

// SSE event shapes sent by /api/agent/chat-stream
type StreamEvent =
  | { type: 'tool';  name: string }
  | { type: 'token'; text: string }
  | { type: 'done';  toolCalls?: unknown[] }
  | { type: 'error'; message: string };

// ─── Tool label map ───────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  list_jobs:             'Searching jobs',
  list_companies:        'Looking up companies',
  list_dispatchers:      'Looking up dispatchers',
  list_drivers:          'Looking up drivers',
  list_units:            'Looking up units',
  list_job_types:        'Looking up job types',
  list_carriers:         'Looking up carriers',
  search_jobs:           'Searching jobs',
  get_job:               'Getting job details',
  create_job:            'Creating job',
  create_company:        'Creating company',
  create_dispatcher:     'Creating dispatcher',
  create_driver:         'Creating driver',
  create_unit:           'Creating unit',
  create_job_type:       'Creating job type',
  create_carrier:        'Creating carrier',
  update_job:            'Updating job',
  mark_job_paid:         'Marking job paid',
  mark_job_paid_by_date: 'Marking jobs paid',
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, ' ');
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatWidget() {
  const [open, setOpen]                   = useState(false);
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);

  // Streaming state
  const [streamingText, setStreamingText]     = useState('');
  const [streamingStatus, setStreamingStatus] = useState('');  // active tool label
  const streamingTextRef = useRef(''); // mirror for closure access inside async loop

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  // ── Image picker ────────────────────────────────────────────────────────────

  /** Add a single image file to the attached list. Used by both the
   *  file-picker (📎) and the clipboard paste (Ctrl+V). */
  const attachImageFile = useCallback((file: File, fallbackName?: string) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl  = reader.result as string;
      const [prefix, data] = dataUrl.split(',');
      const mimeType = prefix.match(/:(.*?);/)?.[1] ?? file.type ?? 'image/png';
      setAttachedImages((prev) => [
        ...prev,
        { data, mimeType, previewUrl: dataUrl, name: file.name || fallbackName || 'pasted-image' },
      ]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach((file) => attachImageFile(file));
    e.target.value = '';
  };

  /** Paste-from-clipboard handler. Triggered when the user hits Ctrl+V
   *  with the textarea focused (and also when the widget container has
   *  focus via the document-level listener below).
   *
   *  Extracts every image item from the clipboard, names them
   *  "pasted-<timestamp>-<n>.<ext>" since clipboard images don't carry
   *  a filename, and prevents the default paste so text-form variants
   *  (e.g. a copied image URL) don't end up in the textarea alongside
   *  the actual image. */
  const handlePaste = useCallback((e: React.ClipboardEvent | ClipboardEvent) => {
    const cd = ('clipboardData' in e ? e.clipboardData : null) as DataTransfer | null;
    if (!cd) return;
    const items = Array.from(cd.items ?? []);
    const imageItems = items.filter((it) => it.kind === 'file' && it.type.startsWith('image/'));
    if (imageItems.length === 0) return;
    e.preventDefault();
    const ts = Date.now();
    imageItems.forEach((it, i) => {
      const file = it.getAsFile();
      if (!file) return;
      const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
      attachImageFile(file, `pasted-${ts}-${i + 1}.${ext}`);
    });
  }, [attachImageFile]);

  // Document-level paste listener so Ctrl+V works even when focus is on
  // a message bubble, the header, etc. (not just the textarea). Only
  // active while the widget is open.
  useEffect(() => {
    if (!open) return;
    const listener = (e: ClipboardEvent) => {
      // Skip if user is typing into a different page input outside the widget
      const widgetRoot = inputRef.current?.closest('.chat-widget-root');
      const target = e.target as Node | null;
      if (target && widgetRoot && !widgetRoot.contains(target)) return;
      handlePaste(e);
    };
    document.addEventListener('paste', listener);
    return () => document.removeEventListener('paste', listener);
  }, [open, handlePaste]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamingText, scrollToBottom]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  // ── Send message ─────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && attachedImages.length === 0) || loading) return;

    const previews     = attachedImages.map((img) => img.previewUrl);
    const imagesToSend = attachedImages.map(({ data, mimeType }) => ({ data, mimeType }));

    setMessages((prev) => [
      ...prev,
      {
        role:          'user',
        content:       text || '(image)',
        timestamp:     new Date(),
        imagePreviews: previews.length ? previews : undefined,
      },
    ]);
    setInput('');
    setAttachedImages([]);
    setLoading(true);
    setStreamingText('');
    setStreamingStatus('');
    streamingTextRef.current = '';

    const token   = localStorage.getItem('token');
    const apiBase = import.meta.env.VITE_API_URL || '/api';

    try {
      const response = await fetch(`${apiBase}/agent/chat-stream`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text || 'Please extract the job information from the attached image(s).',
          images:  imagesToSend.length ? imagesToSend : undefined,
        }),
      });

      // Non-2xx before we start reading → surface as error message
      if (!response.ok) {
        let errMsg = `Request failed (${response.status})`;
        try {
          const body = await response.json() as { error?: { message?: string } };
          if (body?.error?.message) errMsg = body.error.message;
        } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      // ── Read SSE stream ───────────────────────────────────────────────────
      const reader  = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop()!; // keep partial line for next chunk

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event: StreamEvent;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.type === 'tool') {
            setStreamingStatus(toolLabel(event.name) + '…');
          } else if (event.type === 'token') {
            streamingTextRef.current += event.text;
            setStreamingText(streamingTextRef.current);
            setStreamingStatus(''); // hide tool label once text starts flowing
          } else if (event.type === 'done') {
            // Commit the complete message to history
            const finalText = streamingTextRef.current;
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: finalText, timestamp: new Date() },
            ]);
            setStreamingText('');
            setStreamingStatus('');
            streamingTextRef.current = '';
            setLoading(false);
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${errMsg}`, timestamp: new Date() },
      ]);
      setStreamingText('');
      setStreamingStatus('');
      streamingTextRef.current = '';
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Collapsed button ─────────────────────────────────────────────────────────

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

  // ── Chat window ──────────────────────────────────────────────────────────────

  const isStreaming = loading && (streamingText !== '' || streamingStatus !== '');

  return (
    <div className="chat-widget-root fixed bottom-20 lg:bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] h-[32rem] max-h-[calc(100vh-8rem)] bg-surface rounded-2xl shadow-2xl border border-outline/20 flex flex-col overflow-hidden">

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
              setStreamingText('');
              setStreamingStatus('');
              fetch(`${import.meta.env.VITE_API_URL || '/api'}/agent/clear`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
                },
              }).catch(() => {});
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
        {messages.length === 0 && !loading && (
          <div className="text-center text-on-surface-variant/60 text-sm mt-8">
            <span className="material-symbols-outlined text-4xl mb-2 block">chat</span>
            <p>Send a message to get started.</p>
            <p className="mt-1 text-xs">Try: "Show today's jobs" or attach a ticket photo</p>
          </div>
        )}

        {/* Committed messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-surface-variant/50 text-on-surface rounded-bl-md'
              }`}
            >
              {msg.imagePreviews?.length && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {msg.imagePreviews.map((url, j) => (
                    <img key={j} src={url} alt="attachment"
                      className="h-24 w-auto rounded-lg object-cover border border-white/20" />
                  ))}
                </div>
              )}
              {msg.role === 'user' ? (
                msg.content !== '(image)' && (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )
              ) : (
                <AssistantBubble content={msg.content} />
              )}
            </div>
          </div>
        ))}

        {/* Live streaming bubble */}
        {loading && (
          <div className="flex justify-start">
            {isStreaming ? (
              /* Text is flowing — show streaming bubble */
              <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2 text-sm bg-surface-variant/50 text-on-surface">
                {streamingStatus && (
                  <p className="text-xs text-on-surface-variant/60 mb-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                    {streamingStatus}
                  </p>
                )}
                <AssistantBubble content={streamingText} streaming />
              </div>
            ) : streamingStatus ? (
              /* Tools running, no text yet — show status pill */
              <div className="bg-surface-variant/50 rounded-2xl rounded-bl-md px-4 py-2.5">
                <p className="text-xs text-on-surface-variant/70 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                  {streamingStatus}
                </p>
              </div>
            ) : (
              /* Waiting for first event — dot loader */
              <div className="bg-surface-variant/50 rounded-2xl rounded-bl-md px-4 py-2.5">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Staged image previews */}
      {attachedImages.length > 0 && (
        <div className="px-3 pt-2 flex gap-2 flex-wrap border-t border-outline/10">
          {attachedImages.map((img, i) => (
            <div key={i} className="relative">
              <img src={img.previewUrl} alt={img.name}
                className="h-16 w-16 object-cover rounded-lg border border-outline/20" />
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
            onPaste={handlePaste}
            placeholder={attachedImages.length ? 'Add a message or send image…' : 'Type a message or paste an image…'}
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

// ─── AssistantBubble — renders markdown, optionally shows blinking cursor ─────

function AssistantBubble({ content, streaming = false }: { content: string; streaming?: boolean }) {
  return (
    <span>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p:      ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em:     ({ children }) => <em className="italic">{children}</em>,
          ul:     ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
          ol:     ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
          li:     ({ children }) => <li className="leading-snug">{children}</li>,
          code:   ({ children, className }) =>
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
          tr:    ({ children }) => <tr className="hover:bg-on-surface/5 transition-colors">{children}</tr>,
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
        {content}
      </ReactMarkdown>
      {streaming && (
        <span className="inline-block w-0.5 h-4 bg-on-surface/60 ml-0.5 animate-pulse align-text-bottom" />
      )}
    </span>
  );
}
