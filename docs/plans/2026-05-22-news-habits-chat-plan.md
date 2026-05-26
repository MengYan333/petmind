# News / Habits / Chat Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 桌面气泡「今日」tab 展示早报 + 喂食；Web 版增加习惯配置抽屉和持久化聊天区。

**Architecture:** 新增两个 localStorage hook（useHabits / useChatHistory）+ 三个组件（HabitsDrawer / ChatSection / TodayTab）。DesktopApp 改「喂食」tab 为「今日」tab；App.jsx 接入新组件。

**Tech Stack:** React 19, Framer Motion, localStorage, OpenAI-compatible SDK (chatWithPet already exported)

---

### Task 1: useHabits hook

**Files:**
- Create: `src/hooks/useHabits.js`

**Step 1: 创建文件**

```js
import { useState, useEffect } from 'react';

const KEY = 'petmind-habits';
const DEFAULT = [
  { id: 'water',   label: '喝水',    intervalHours: 2 },
  { id: 'stretch', label: '起身活动', intervalHours: 1 },
  { id: 'eyes',    label: '护眼休息', intervalHours: 1 },
];

export function useHabits() {
  const [habits, setHabits] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || DEFAULT; }
    catch { return DEFAULT; }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(habits));
  }, [habits]);

  function addHabit(label, intervalHours) {
    const id = Date.now().toString();
    setHabits(prev => [...prev, { id, label, intervalHours: Number(intervalHours) }]);
  }

  function removeHabit(id) {
    setHabits(prev => prev.filter(h => h.id !== id));
  }

  return { habits, addHabit, removeHabit };
}
```

**Step 2: 验证**
- 打开 http://localhost:5757，控制台无报错即可

**Step 3: Commit**
```bash
git add src/hooks/useHabits.js
git commit -m "feat: useHabits hook with localStorage persistence"
```

---

### Task 2: useChatHistory hook

**Files:**
- Create: `src/hooks/useChatHistory.js`

**Step 1: 创建文件**

```js
import { useState, useEffect } from 'react';

const KEY = 'petmind-chat';
const MAX = 50;

export function useChatHistory() {
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(messages.slice(-MAX)));
  }, [messages]);

  function addMessage(role, text) {
    setMessages(prev => [...prev.slice(-(MAX - 1)), { role, text, ts: Date.now() }]);
  }

  function clearHistory() {
    setMessages([]);
    localStorage.removeItem(KEY);
  }

  return { messages, addMessage, clearHistory };
}
```

**Step 2: 验证**
- 控制台无报错

**Step 3: Commit**
```bash
git add src/hooks/useChatHistory.js
git commit -m "feat: useChatHistory hook with localStorage persistence"
```

---

### Task 3: HabitsDrawer 组件

**Files:**
- Create: `src/components/HabitsDrawer.jsx`

**Step 1: 创建文件**

```jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HabitsDrawer({ habits, onAdd, onRemove, onClose }) {
  const [label, setLabel]   = useState('');
  const [hours, setHours]   = useState(2);

  function submit(e) {
    e.preventDefault();
    if (!label.trim()) return;
    onAdd(label.trim(), hours);
    setLabel('');
    setHours(2);
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
      />

      {/* Drawer */}
      <motion.div
        key="drawer"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 h-full w-72 z-50 flex flex-col"
        style={{ background: 'rgba(13,13,26,0.97)', borderLeft: '1px solid rgba(168,85,247,0.25)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="text-white font-semibold text-sm">🔔 习惯提醒</span>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-lg leading-none">✕</button>
        </div>

        {/* Habit list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {habits.length === 0 && (
            <p className="text-white/30 text-xs text-center mt-8">还没有提醒任务</p>
          )}
          {habits.map(h => (
            <div key={h.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <span className="text-white/90 text-sm">{h.label}</span>
                <span className="text-white/35 text-xs ml-2">每 {h.intervalHours} 小时</span>
              </div>
              <button onClick={() => onRemove(h.id)}
                className="text-white/25 hover:text-red-400 text-sm transition-colors px-1">✕</button>
            </div>
          ))}
        </div>

        {/* Add form */}
        <form onSubmit={submit} className="px-4 pb-6 pt-3 border-t border-white/10 flex flex-col gap-2">
          <p className="text-white/40 text-xs mb-1">新增提醒</p>
          <input
            value={label} onChange={e => setLabel(e.target.value)}
            placeholder="提醒名称..."
            className="w-full px-3 py-2 rounded-lg text-sm text-white/90 outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
          />
          <div className="flex gap-2 items-center">
            <input
              type="number" min={1} max={24} value={hours} onChange={e => setHours(e.target.value)}
              className="w-16 px-2 py-2 rounded-lg text-sm text-white/90 outline-none text-center"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
            />
            <span className="text-white/40 text-xs">小时提醒一次</span>
          </div>
          <button type="submit"
            className="w-full py-2 rounded-xl text-sm transition-colors"
            style={{ background: 'rgba(168,85,247,0.18)', border: '1px solid rgba(168,85,247,0.4)', color: 'rgba(168,85,247,1)' }}>
            + 添加
          </button>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 2: 验证**
- 暂时不接入，只确认文件保存无语法报错

**Step 3: Commit**
```bash
git add src/components/HabitsDrawer.jsx
git commit -m "feat: HabitsDrawer component"
```

---

### Task 4: ChatSection 组件

**Files:**
- Create: `src/components/ChatSection.jsx`

**Step 1: 创建文件**

```jsx
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
```

**Step 2: 验证**
- 确认文件保存，无语法报错

**Step 3: Commit**
```bash
git add src/components/ChatSection.jsx
git commit -m "feat: ChatSection component with collapsible history"
```

---

### Task 5: App.jsx 接入 useHabits + ChatSection + HabitsDrawer

**Files:**
- Modify: `src/App.jsx`

**Step 1: 在 WebApp 里替换 DEFAULT_HABITS，接入三个新东西**

在 App.jsx 顶部新增 import：
```js
import { useHabits } from './hooks/useHabits';
import { useChatHistory } from './hooks/useChatHistory';
import HabitsDrawer from './components/HabitsDrawer';
import ChatSection from './components/ChatSection';
```

在 WebApp 函数体内，删除 `DEFAULT_HABITS` 常量（移到 useHabits 里了），添加：
```js
const { habits, addHabit, removeHabit } = useHabits();
const { messages: chatMessages, addMessage, clearHistory } = useChatHistory();
const [drawerOpen, setDrawerOpen] = useState(false);
```

把 `runAgent(sensors, DEFAULT_HABITS, DEFAULT_PREFS, addLog)` 改为：
```js
runAgent(sensors, habits, DEFAULT_PREFS, addLog)
```

顶部 ⚙️ 按钮加在 `<DesktopLaunchButton />` 同一区域：
```jsx
<button
  onClick={() => setDrawerOpen(true)}
  className="fixed top-4 left-4 z-50 text-xs bg-white/10 hover:bg-white/20 text-white/70 hover:text-white px-3 py-1.5 rounded-full transition-all border border-white/10 hover:border-white/30"
>
  ⚙️ 提醒设置
</button>
```

在 JSX 底部（`<AgentLog>` 之前）加：
```jsx
<ChatSection
  messages={chatMessages}
  onAddMessage={addMessage}
  onClear={clearHistory}
/>
```

在 JSX 最外层（`return` 的 `<div>` 内最后）加抽屉：
```jsx
{drawerOpen && (
  <HabitsDrawer
    habits={habits}
    onAdd={addHabit}
    onRemove={removeHabit}
    onClose={() => setDrawerOpen(false)}
  />
)}
```

**Step 2: 验证**
- 打开 http://localhost:5757
- 左上角出现「⚙️ 提醒设置」按钮
- 点击打开抽屉，能增删习惯
- 页面底部出现「💬 和猫咪聊天」折叠区，展开后能发消息
- 刷新页面，习惯和聊天记录保持不变（localStorage 生效）

**Step 3: Commit**
```bash
git add src/App.jsx
git commit -m "feat: wire useHabits, ChatSection, HabitsDrawer into WebApp"
```

---

### Task 6: DesktopApp — 「今日」tab 替换「喂食」tab

**Files:**
- Modify: `src/components/DesktopApp.jsx`

**Step 1: 修改 TABS 常量**

```js
const TABS = [
  { id: 'today',  emoji: '📅', label: '今日' },
  { id: 'remind', emoji: '🔔', label: '提醒' },
  { id: 'chat',   emoji: '💬', label: '对话' },
];
```

**Step 2: 在 state 里添加 newsContent**

```js
const [newsContent, setNewsContent] = useState('');
```

**Step 3: triggerAgent 函数里存 newsHeadlines**

```js
const { petDecision, learningSummary: summary, newsHeadlines: news } = await runAgent(...);
if (news) setNewsContent(news);
```

**Step 4: 把 `activeTab === 'feed'` 改为 `activeTab === 'today'`，TodayTab 接收 newsContent**

```jsx
{activeTab === 'today' && (
  <TodayTab onFeed={handleFeed} petState={petState} newsContent={newsContent} />
)}
```

**Step 5: 删除 FeedTab，新增 TodayTab**

```jsx
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
```

**Step 6: 重启 Electron 验证**

```bash
powershell -Command "Stop-Process -Name electron -Force -ErrorAction SilentlyContinue"
# 等 2 秒后
node electron/launch.cjs
```

- 点击猫咪，气泡 tab 变为「📅今日 / 🔔提醒 / 💬对话」
- 今日 tab 显示喂食按钮，早报 8-10 点后有内容

**Step 7: Commit**
```bash
git add src/components/DesktopApp.jsx
git commit -m "feat: desktop bubble — TodayTab with news + feed"
```
