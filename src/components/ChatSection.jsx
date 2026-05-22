import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatWithPet } from '../services/claudeAgent';

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function ChatSection({ messages, onAddMessage, onClear }) {
  const [open, setOpen]     = useState(false);
  const [input, setInput]   = useState('');
  const [busy, setBusy]     = useState(false);
  const endRef              = useRef(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    onAddMessage('user', text);
    setBusy(true);
    try {
      const reply = await chatWithPet(text, messages);
      onAddMessage('pet', reply);
    } catch {
      onAddMessage('pet', '喵... 网络出了点问题 😿');
    } finally {
      setBusy(false);
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="w-full max-w-sm mt-4">
      {/* Header row */}
      <div className="flex items-center justify-between px-1 mb-2">
        <button onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm transition-colors">
          <span>{open ? '▼' : '▶'}</span>
          <span>💬 和猫咪聊天</span>
        </button>
        {open && messages.length > 0 && (
          <button onClick={onClear} className="text-xs text-white/25 hover:text-white/50 transition-colors">清空</button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            {/* Message list */}
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto px-1 mb-3"
              style={{ scrollbarWidth: 'none' }}>
              {messages.length === 0 && (
                <p className="text-white/30 text-xs text-center py-6">跟我说说话吧 ฅ^•ﻌ•^ฅ</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col gap-0.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-purple-500/20 border border-purple-500/30 text-purple-100'
                      : 'bg-white/7 border border-white/10 text-white/85'
                  }`}>{m.text}</div>
                  <span className="text-white/25 text-[10px] px-1">{formatTime(m.ts)}</span>
                </div>
              ))}
              {busy && <div className="text-white/35 text-xs ml-1">喵~...</div>}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                placeholder="说点什么..."
                className="flex-1 px-3 py-2 rounded-xl text-sm text-white/90 outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
              <button onClick={send} disabled={busy || !input.trim()}
                className="px-3 py-2 rounded-xl text-sm transition-colors disabled:opacity-40"
                style={{ background: 'rgba(168,85,247,0.18)', border: '1px solid rgba(168,85,247,0.4)', color: 'rgba(168,85,247,1)' }}>
                ↑
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
