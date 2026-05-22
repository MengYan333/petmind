import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { useSensors } from '../hooks/useSensors';
import { runAgent, chatWithPet } from '../services/claudeAgent';
import { useGrowthSystem } from '../hooks/useGrowthSystem';

const STATE_IMG = {
  normal:   '/cat_normal.png',
  happy:    '/cat_normal.png',
  rainy:    '/cat_normal.png',
  news:     '/cat_normal.png',
  learning: '/cat_learning.png',
  exercise: '/cat_exercise.png',
  sleepy:   '/cat_sleepy.png',
  thirsty:  '/cat_thirsty.png',
  hot:      '/cat_thirsty.png',
};

const STATE_SIZE = {
  default: { w: 110, h: 138 },
  sleepy:  { w: 150, h: 119 },
};

const DEFAULT_HABITS = [
  { id: 'water',   label: '喝水',   intervalHours: 2,  lastDone: null },
  { id: 'stretch', label: '起身活动', intervalHours: 1,  lastDone: null },
  { id: 'eyes',    label: '护眼休息', intervalHours: 1,  lastDone: null },
];
const DEFAULT_PREFS = { learningTopic: 'AI大模型', learningHour: 9 };

const TABS = [
  { id: 'today',  emoji: '📅', label: '今日' },
  { id: 'remind', emoji: '🔔', label: '提醒' },
  { id: 'chat',   emoji: '💬', label: '对话' },
];

const BUBBLE_W = 220;

// Shared style tokens
const S = {
  text:    { color: 'rgba(255,255,255,0.88)' },
  dimText: { color: 'rgba(255,255,255,0.4)' },
  card:    { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 },
  purple:  { background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)', color: 'rgba(168,85,247,0.95)' },
};

export default function DesktopApp() {
  const sensors = useSensors();
  const [petState, setPetState]     = useState('normal');
  const [message, setMessage]       = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [activeTab, setActiveTab]   = useState('today');
  const [newsContent, setNewsContent] = useState('');
  const [sw, setSw] = useState(1280);
  const [sh, setSh] = useState(752);

  // Chat state
  const [chatMsgs, setChatMsgs]   = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy]   = useState(false);
  const chatEndRef = useRef(null);

  // Habit done timestamps
  const [habitDone, setHabitDone] = useState({});

  const catX = useMotionValue(200);
  const catY = useMotionValue(600);
  const [bubblePos, setBubblePos] = useState({ left: 200, top: 400 });

  const triggerAgentRef = useRef(null);
  const nurtureTimerRef = useRef(null);
  const bubbleTimerRef  = useRef(null);
  const { nurture, recordLearnRead } = useGrowthSystem();
  const addLog = useCallback(() => {}, []);

  useEffect(() => {
    async function init() {
      let width = window.innerWidth;
      let height = window.innerHeight;
      if (window.electronAPI?.getScreenSize) {
        const s = await window.electronAPI.getScreenSize();
        width = s.width; height = s.height;
      }
      setSw(width); setSh(height);
      const startX = width - 160;
      const startY = height - 160;
      catX.set(startX); catY.set(startY);
      setBubblePos({ left: startX, top: startY - 260 });
    }
    init();
  }, []);

  async function triggerAgent() {
    if (isThinking) return;
    setIsThinking(true);
    try {
      const { petDecision, learningSummary: summary, newsHeadlines: news } = await runAgent(
        sensors, DEFAULT_HABITS, DEFAULT_PREFS, addLog
      );
      if (petDecision) { setPetState(petDecision.state); setMessage(petDecision.message); }
      if (summary) recordLearnRead();
      if (news) setNewsContent(news);
    } catch { setMessage('出错了，稍后再试～'); }
    finally { setIsThinking(false); }
  }

  triggerAgentRef.current = triggerAgent;

  useEffect(() => {
    triggerAgentRef.current?.();
    const id = setInterval(() => triggerAgentRef.current?.(), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Mouse-through: document mousemove + elementFromPoint
  useEffect(() => {
    function onMove(e) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      window.electronAPI?.setMouseIgnore(!(el && el.closest('[data-interactive]')));
    }
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => () => {
    clearTimeout(nurtureTimerRef.current);
    clearTimeout(bubbleTimerRef.current);
  }, []);

  // Scroll chat to bottom when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs]);

  function updateBubblePos() {
    const x = catX.get(); const y = catY.get();
    const size = petState === 'sleepy' ? STATE_SIZE.sleepy : STATE_SIZE.default;
    const POPUP_H = 260;
    const left = Math.max(8, Math.min(x + size.w / 2 - BUBBLE_W / 2, sw - BUBBLE_W - 8));
    const top  = Math.max(8, y - POPUP_H - 10);
    setBubblePos({ left, top });
  }

  function handleCatClick() {
    updateBubblePos();
    if (bubbleOpen) {
      setBubbleOpen(false);
      clearTimeout(bubbleTimerRef.current);
    } else {
      setBubbleOpen(true);
      // No auto-close when chat tab is open
      if (activeTab !== 'chat') {
        bubbleTimerRef.current = setTimeout(() => setBubbleOpen(false), 12000);
      }
    }
  }

  function closeBubble() {
    setBubbleOpen(false);
    clearTimeout(bubbleTimerRef.current);
  }

  function switchTab(id) {
    setActiveTab(id);
    clearTimeout(bubbleTimerRef.current);
    // No auto-close for chat
    if (id !== 'chat') {
      bubbleTimerRef.current = setTimeout(() => setBubbleOpen(false), 12000);
    }
  }

  // 喂食
  function handleFeed() {
    nurture({ effect: 'hunger', delta: 15 });
    const prev = petState;
    setPetState('happy');
    setMessage('谢谢主人！好吃～ 🎉');
    nurtureTimerRef.current = setTimeout(() => setPetState(prev), 2500);
  }

  // 提醒：mark habit done
  function handleHabitDone(id) {
    setHabitDone(prev => ({ ...prev, [id]: Date.now() }));
    nurture({ effect: 'mood', delta: 5 });
  }

  // 对话：send message
  async function handleChatSend() {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    setChatInput('');
    setChatMsgs(prev => [...prev, { role: 'user', text }]);
    setChatBusy(true);
    try {
      const reply = await chatWithPet(text, chatMsgs);
      setChatMsgs(prev => [...prev, { role: 'pet', text: reply }]);
    } catch {
      setChatMsgs(prev => [...prev, { role: 'pet', text: '喵... 网络出了点问题 😿' }]);
    } finally {
      setChatBusy(false);
    }
  }

  const size   = petState === 'sleepy' ? STATE_SIZE.sleepy : STATE_SIZE.default;
  const imgSrc = STATE_IMG[petState] || STATE_IMG.normal;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'transparent', pointerEvents: 'none' }}>

      {/* Cat */}
      <motion.div
        data-interactive
        drag dragMomentum={false} dragElastic={0.05}
        dragConstraints={{ left: 0, top: 0, right: sw - size.w, bottom: sh - size.h }}
        style={{ x: catX, y: catY, position: 'absolute', top: 0, left: 0, width: size.w,
          cursor: 'grab', userSelect: 'none', pointerEvents: 'auto' }}
        whileDrag={{ cursor: 'grabbing', scale: 1.06 }}
        onDragEnd={updateBubblePos}
        onClick={handleCatClick}
      >
        <img src={imgSrc} alt="pet" width={size.w} height={size.h}
          style={{ display: 'block', pointerEvents: 'none', userSelect: 'none' }}
          draggable={false} />
        {isThinking && (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ position: 'absolute', top: -4, right: -4, fontSize: 16, pointerEvents: 'none' }}>⚙️</motion.div>
        )}
      </motion.div>

      {/* Bubble */}
      <AnimatePresence>
        {bubbleOpen && (
          <motion.div
            data-interactive
            key="bubble"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            style={{
              position: 'absolute', left: bubblePos.left, top: bubblePos.top,
              width: BUBBLE_W,
              background: 'rgba(13,13,26,0.96)',
              border: '1px solid rgba(168,85,247,0.35)',
              borderRadius: 18,
              boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 24px rgba(168,85,247,0.1)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              padding: '12px 12px 10px',
              zIndex: 9999, pointerEvents: 'auto',
            }}
          >
            {/* Close */}
            <button onClick={closeBubble} style={{
              position: 'absolute', top: 8, right: 10, background: 'none', border: 'none',
              ...S.dimText, fontSize: 13, cursor: 'pointer', lineHeight: 1, padding: 2,
            }}>✕</button>

            {/* Pet message */}
            <p style={{ ...S.text, fontSize: 12, lineHeight: 1.6, textAlign: 'center',
              margin: '0 0 10px', paddingRight: 16, minHeight: 20 }}>
              {isThinking ? '⚙️ 思考中...' : (message || '嗨主人！今天怎么样？')}
            </p>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => switchTab(t.id)} style={{
                  flex: 1, padding: '5px 0', borderRadius: 9, fontSize: 11,
                  cursor: 'pointer', transition: 'all 0.15s',
                  ...(activeTab === t.id
                    ? { background: 'rgba(168,85,247,0.22)', border: '1px solid rgba(168,85,247,0.5)', color: 'rgba(168,85,247,1)' }
                    : { ...S.card, ...S.dimText }),
                }}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'today' && (
              <TodayTab onFeed={handleFeed} petState={petState} newsContent={newsContent} />
            )}
            {activeTab === 'remind' && <RemindTab habits={DEFAULT_HABITS} done={habitDone} onDone={handleHabitDone} />}
            {activeTab === 'chat' && (
              <ChatTab
                msgs={chatMsgs} busy={chatBusy}
                input={chatInput} onInput={setChatInput}
                onSend={handleChatSend} endRef={chatEndRef}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Tab: 今日 ── */
function TodayTab({ onFeed, petState, newsContent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {newsContent && (
        <div style={{
          padding: '7px 9px', borderRadius: 10,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <p style={{ ...S.dimText, fontSize: 10, marginBottom: 4 }}>📰 早报</p>
          {newsContent.split('\n').filter(l => l.trim()).map((line, i) => (
            <p key={i} style={{ ...S.text, fontSize: 11, lineHeight: 1.55, margin: '2px 0' }}>{line}</p>
          ))}
        </div>
      )}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 30, marginBottom: 4 }}>
          {petState === 'happy' ? '😸' : '🐱'}
        </div>
        <p style={{ ...S.dimText, fontSize: 11, marginBottom: 8 }}>
          {petState === 'happy' ? '吃得好开心～ (=^▽^=)' : '肚子有点饿了喵～'}
        </p>
        <button onClick={onFeed} style={{
          width: '100%', padding: '6px 0', borderRadius: 10, fontSize: 12,
          cursor: 'pointer', ...S.purple,
        }}>
          🍎 喂食
        </button>
      </div>
    </div>
  );
}

/* ── Tab: 提醒 ── */
function RemindTab({ habits, done, onDone }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {habits.map(h => {
        const doneAt = done[h.id];
        const isDone = doneAt && (Date.now() - doneAt) < h.intervalHours * 3600 * 1000;
        const nextIn = doneAt
          ? Math.max(0, Math.ceil((doneAt + h.intervalHours * 3600 * 1000 - Date.now()) / 60000))
          : null;
        return (
          <div key={h.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 8px', borderRadius: 10,
            background: isDone ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isDone ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.1)'}`,
          }}>
            <div>
              <span style={{ ...S.text, fontSize: 12 }}>{h.label}</span>
              <span style={{ ...S.dimText, fontSize: 10, marginLeft: 5 }}>
                {isDone ? `${nextIn}分钟后提醒` : `每${h.intervalHours}小时`}
              </span>
            </div>
            {isDone
              ? <span style={{ fontSize: 14 }}>✅</span>
              : <button onClick={() => onDone(h.id)} style={{
                  padding: '2px 8px', borderRadius: 7, fontSize: 10, cursor: 'pointer',
                  background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)',
                  color: 'rgba(74,222,128,0.9)',
                }}>完成</button>
            }
          </div>
        );
      })}
    </div>
  );
}

/* ── Tab: 对话 ── */
function ChatTab({ msgs, busy, input, onInput, onSend, endRef }) {
  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Message list */}
      <div style={{
        height: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5,
        padding: '4px 2px',
        scrollbarWidth: 'none',
      }}>
        {msgs.length === 0 && (
          <p style={{ ...S.dimText, fontSize: 11, textAlign: 'center', marginTop: 36 }}>
            跟我说说话吧 ฅ^•ﻌ•^ฅ
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%', padding: '4px 8px', borderRadius: 10, fontSize: 11, lineHeight: 1.5,
            ...(m.role === 'user'
              ? { background: 'rgba(168,85,247,0.22)', border: '1px solid rgba(168,85,247,0.35)', color: 'rgba(220,200,255,0.95)' }
              : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', ...S.text }),
          }}>{m.text}</div>
        ))}
        {busy && (
          <div style={{ alignSelf: 'flex-start', ...S.dimText, fontSize: 11 }}>喵~...</div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          value={input} onChange={e => onInput(e.target.value)} onKeyDown={onKey}
          placeholder="说点什么..."
          style={{
            flex: 1, padding: '5px 8px', borderRadius: 9, fontSize: 11,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.9)', outline: 'none',
          }}
        />
        <button onClick={onSend} disabled={busy || !input.trim()} style={{
          padding: '5px 9px', borderRadius: 9, fontSize: 12, cursor: busy ? 'not-allowed' : 'pointer',
          ...S.purple, opacity: busy || !input.trim() ? 0.4 : 1,
        }}>↑</button>
      </div>
    </div>
  );
}
