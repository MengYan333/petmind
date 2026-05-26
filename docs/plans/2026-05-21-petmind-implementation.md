# PetMind Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build PetMind — a world-aware desktop pet agent that monitors weather, screen time, and habits, uses Claude function calling to decide pet behavior, and visualizes the agent's reasoning process in real-time.

**Architecture:** New standalone React + Vite SPA at `d:/yangmengyan/Desktop/petmind/`. Sensors (weather API, browser events, clock) feed a context object to Claude claude-sonnet-4-6 via function calling. Claude decides which pet state to show and what message to display. All tool calls stream into a visible AgentLog panel so the decision process is transparent.

**Tech Stack:** React 19, Vite, Tailwind CSS v3, Framer Motion, Anthropic JS SDK (browser), OpenWeatherMap API

---

## Task 1: Scaffold new project

**Files:**
- Create: `d:/yangmengyan/Desktop/petmind/` (new project root)

**Step 1: Create Vite project**

```bash
cd "d:/yangmengyan/Desktop"
npm create vite@latest petmind -- --template react
cd petmind
npm install
```

**Step 2: Install dependencies**

```bash
npm install @anthropic-ai/sdk framer-motion
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 3: Configure Tailwind**

Edit `tailwind.config.js`:
```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pet: { 50: '#fdf4ff', 500: '#a855f7', 900: '#3b0764' }
      }
    }
  },
  plugins: [],
}
```

Edit `src/index.css` — replace all contents with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
body {
  background: #0d0d1a;
  color: white;
  font-family: system-ui, sans-serif;
  margin: 0;
}
```

**Step 4: Create `.env` file**

```
VITE_ANTHROPIC_API_KEY=your_claude_api_key_here
VITE_WEATHER_API_KEY=your_openweathermap_key_here
VITE_WEATHER_CITY=Beijing
```

**Step 5: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite server running at http://localhost:5173

**Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold PetMind project"
```

---

## Task 2: Sensor hooks

**Files:**
- Create: `src/hooks/useScreenTime.js`
- Create: `src/hooks/useWeather.js`
- Create: `src/hooks/useSensors.js`

**Step 1: Create screen time tracker**

Create `src/hooks/useScreenTime.js`:
```js
import { useState, useEffect, useRef } from 'react';

export function useScreenTime() {
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        startRef.current = null;
      } else {
        startRef.current = Date.now();
        setSessionMinutes(0);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const interval = setInterval(() => {
      if (!document.hidden && startRef.current) {
        setSessionMinutes(Math.floor((Date.now() - startRef.current) / 60000));
      }
    }, 10000); // update every 10s

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, []);

  return sessionMinutes;
}
```

**Step 2: Create weather hook**

Create `src/hooks/useWeather.js`:
```js
import { useState, useEffect } from 'react';

export function useWeather() {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const city = import.meta.env.VITE_WEATHER_CITY || 'Beijing';
    const key = import.meta.env.VITE_WEATHER_API_KEY;
    if (!key) return;

    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}&units=metric`)
      .then(r => r.json())
      .then(data => setWeather({
        condition: data.weather[0].main, // Rain, Clear, Clouds, Thunderstorm, Snow
        temp: Math.round(data.main.temp),
        description: data.weather[0].description,
      }))
      .catch(() => setWeather({ condition: 'Clear', temp: 22, description: 'clear sky' }));
  }, []);

  return weather;
}
```

**Step 3: Create combined sensors hook**

Create `src/hooks/useSensors.js`:
```js
import { useScreenTime } from './useScreenTime';
import { useWeather } from './useWeather';

export function useSensors() {
  const screenMinutes = useScreenTime();
  const weather = useWeather();

  const now = new Date();

  return {
    time: {
      hour: now.getHours(),
      minute: now.getMinutes(),
      isLateNight: now.getHours() >= 23 || now.getHours() < 1,
    },
    weather: weather || { condition: 'Clear', temp: 22 },
    screenMinutes,
  };
}
```

**Step 4: Verify no errors**

```bash
npm run dev
```
Expected: No console errors.

**Step 5: Commit**

```bash
git add src/hooks/
git commit -m "feat: add sensor hooks (screen time, weather, time)"
```

---

## Task 3: Pet component

**Files:**
- Create: `src/components/Pet.jsx`

**Step 1: Create Pet component with state-based appearance**

Create `src/components/Pet.jsx`:
```jsx
import { motion } from 'framer-motion';

const PET_STATES = {
  normal:   { emoji: '🐱', label: '正常',   glow: '#a855f7' },
  thirsty:  { emoji: '😿', label: '干涸',   glow: '#f97316' },
  sleepy:   { emoji: '😴', label: '困倦',   glow: '#6366f1' },
  exercise: { emoji: '🙀', label: '需要运动', glow: '#22c55e' },
  rainy:    { emoji: '🐱', label: '下雨啦',  glow: '#38bdf8', accessory: '☂️' },
  hot:      { emoji: '🐱', label: '好热',   glow: '#ef4444', accessory: '🌡️' },
  learning: { emoji: '🐱', label: '学习时间', glow: '#facc15', accessory: '📚' },
  news:     { emoji: '🐱', label: '新闻速递', glow: '#34d399', accessory: '📰' },
  happy:    { emoji: '😸', label: '开心',   glow: '#f472b6' },
};

const ANIMATIONS = {
  normal:   { y: [0, -8, 0], transition: { duration: 2.5, repeat: Infinity } },
  thirsty:  { scale: [1, 0.95, 1], transition: { duration: 1.5, repeat: Infinity } },
  sleepy:   { rotate: [-3, 3, -3], transition: { duration: 3, repeat: Infinity } },
  exercise: { x: [-4, 4, -4], transition: { duration: 0.5, repeat: Infinity } },
  happy:    { y: [0, -14, 0], transition: { duration: 0.6, repeat: Infinity } },
};

export default function Pet({ state = 'normal', onClick }) {
  const config = PET_STATES[state] || PET_STATES.normal;
  const anim = ANIMATIONS[state] || ANIMATIONS.normal;

  return (
    <div className="flex flex-col items-center cursor-pointer" onClick={onClick}>
      <div
        className="w-44 h-44 rounded-full flex items-center justify-center relative"
        style={{
          background: `radial-gradient(circle at 40% 35%, ${config.glow}33, #0d0d1a)`,
          boxShadow: `0 0 60px ${config.glow}44`,
          border: `2px solid ${config.glow}44`,
        }}
      >
        <motion.div animate={anim} className="text-8xl select-none relative">
          {config.emoji}
          {config.accessory && (
            <span className="absolute -top-3 -right-3 text-4xl">{config.accessory}</span>
          )}
        </motion.div>
      </div>
      <p className="text-white/40 text-xs mt-2">{config.label}</p>
    </div>
  );
}
```

**Step 2: Test visually — build a quick preview in App.jsx**

Replace `src/App.jsx` with:
```jsx
import Pet from './components/Pet';

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center gap-8 flex-wrap p-8">
      {['normal','thirsty','sleepy','exercise','rainy','hot','happy'].map(s => (
        <Pet key={s} state={s} onClick={() => console.log(s)} />
      ))}
    </div>
  );
}
```

Run `npm run dev` and verify all 7 states render correctly with different glows and animations.

**Step 3: Commit**

```bash
git add src/components/Pet.jsx src/App.jsx
git commit -m "feat: add Pet component with 7 animated states"
```

---

## Task 4: Agent log panel

**Files:**
- Create: `src/components/AgentLog.jsx`

**Step 1: Create AgentLog component**

Create `src/components/AgentLog.jsx`:
```jsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function AgentLog({ logs, isThinking }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 w-72 z-50">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-sm backdrop-blur-sm"
      >
        <span className="flex items-center gap-2">
          {isThinking ? (
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              ⚙️
            </motion.span>
          ) : '🧠'}
          Agent 思考日志
        </span>
        <span className="text-white/40">{open ? '▼' : '▲'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-1 bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-mono space-y-1.5 max-h-64 overflow-y-auto backdrop-blur-sm">
              {logs.length === 0 && (
                <p className="text-white/30">等待 Agent 运行...</p>
              )}
              {logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex gap-2 ${log.type === 'tool' ? 'text-green-400' : log.type === 'decision' ? 'text-yellow-400' : 'text-white/60'}`}
                >
                  <span>{log.type === 'tool' ? '├─' : log.type === 'decision' ? '└─' : '  '}</span>
                  <span>{log.text}</span>
                </motion.div>
              ))}
              {isThinking && (
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-purple-400"
                >
                  🤔 推理中...
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/AgentLog.jsx
git commit -m "feat: add AgentLog panel for visualizing tool calls"
```

---

## Task 5: Claude agent service

**Files:**
- Create: `src/services/claudeAgent.js`

**Step 1: Create agent service with function calling**

Create `src/services/claudeAgent.js`:
```js
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

const TOOLS = [
  {
    name: 'set_pet_state',
    description: 'Set the pet\'s visual state, message to show user, and action buttons. Call this to deliver the final decision.',
    input_schema: {
      type: 'object',
      properties: {
        state: {
          type: 'string',
          enum: ['normal', 'thirsty', 'sleepy', 'exercise', 'rainy', 'hot', 'learning', 'news', 'happy'],
          description: 'Visual state of the pet'
        },
        message: { type: 'string', description: 'Short message from the pet to user (max 30 chars, casual Chinese)' },
        actions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Up to 3 action buttons user can click, e.g. ["好，我去喝水", "再等一会儿"]'
        },
        reasoning: { type: 'string', description: 'Brief explanation of why this state was chosen' }
      },
      required: ['state', 'message', 'actions', 'reasoning']
    }
  },
  {
    name: 'fetch_learning_summary',
    description: 'Summarize today\'s content for the user\'s learning topic in 3 sentences.',
    input_schema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'The topic to summarize (e.g. "AI大模型", "设计", "编程")' }
      },
      required: ['topic']
    }
  }
];

export async function runAgent(sensors, habits, userPrefs, onLog) {
  onLog({ type: 'info', text: `🔍 收集传感器数据...` });
  onLog({ type: 'tool', text: `get_time() → ${sensors.time.hour}:${String(sensors.time.minute).padStart(2,'0')}` });
  onLog({ type: 'tool', text: `get_weather() → ${sensors.weather.condition}, ${sensors.weather.temp}°C` });
  onLog({ type: 'tool', text: `get_screen_time() → ${sensors.screenMinutes}分钟` });

  const contextPrompt = `
你是用户桌面宠物的大脑。根据当前环境数据，决定宠物该展示什么状态。

当前数据：
- 时间：${sensors.time.hour}:${String(sensors.time.minute).padStart(2,'0')}
- 天气：${sensors.weather.condition}，${sensors.weather.temp}°C
- 连续使用电脑：${sensors.screenMinutes} 分钟
- 深夜模式：${sensors.time.isLateNight ? '是' : '否'}
- 用户学习主题：${userPrefs.learningTopic || 'AI大模型'}
- 今日待提醒习惯：${habits.map(h => h.label).join('、') || '无'}

优先级规则：
1. 深夜（23点后）→ sleepy（催睡）
2. 连续使用 ≥ 60分钟 → exercise
3. 下雨天 → rainy
4. 高温（≥ 35°C）→ hot
5. 喝水时间到 → thirsty
6. 学习时间到 → 先 fetch_learning_summary，再 set_pet_state learning
7. 以上都不满足 → normal

当多个条件同时满足时，按上述优先级选最高的一个。
使用工具 set_pet_state 给出最终决策。消息要简短亲切，像宠物说话。
`.trim();

  const messages = [{ role: 'user', content: contextPrompt }];
  let petDecision = null;
  let learningSummary = null;

  // Agentic loop
  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(b => b.type === 'tool_use');
      const toolResults = [];

      for (const toolUse of toolUses) {
        onLog({ type: 'tool', text: `${toolUse.name}(${JSON.stringify(toolUse.input).slice(0, 60)})` });

        let result;
        if (toolUse.name === 'set_pet_state') {
          petDecision = toolUse.input;
          onLog({ type: 'decision', text: `💡 决策：${toolUse.input.reasoning}` });
          result = { success: true };
        } else if (toolUse.name === 'fetch_learning_summary') {
          // Call Claude again to generate summary
          const summaryRes = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 256,
            messages: [{
              role: 'user',
              content: `用3句话总结今天"${toolUse.input.topic}"领域最新进展，每句话不超过30字，面向普通用户。`
            }]
          });
          learningSummary = summaryRes.content[0].text;
          onLog({ type: 'tool', text: `📚 摘要生成完成 (${learningSummary.length}字)` });
          result = { summary: learningSummary };
        }

        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) });
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    } else {
      break;
    }
  }

  return { petDecision, learningSummary };
}
```

**Step 2: Commit**

```bash
git add src/services/claudeAgent.js
git commit -m "feat: add Claude agent service with function calling loop"
```

---

## Task 6: Habit card component

**Files:**
- Create: `src/components/HabitCard.jsx`

**Step 1: Create HabitCard**

Create `src/components/HabitCard.jsx`:
```jsx
import { motion, AnimatePresence } from 'framer-motion';

export default function HabitCard({ petState, message, actions, learningSummary, onAction }) {
  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-4 mt-4"
      >
        <p className="text-sm text-white/80 mb-3 text-center">{message}</p>

        {learningSummary && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-3 text-xs text-white/70 leading-relaxed">
            {learningSummary}
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-center">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => onAction(action)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white/10 hover:bg-white/20 transition-all border border-white/20"
            >
              {action}
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/HabitCard.jsx
git commit -m "feat: add HabitCard for pet messages and action buttons"
```

---

## Task 7: Nurture menu

**Files:**
- Create: `src/components/NurtureMenu.jsx`

**Step 1: Create NurtureMenu**

Create `src/components/NurtureMenu.jsx`:
```jsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const ACTIONS = [
  { id: 'feed',  emoji: '🍎', label: '喂食',  effect: 'hunger',  delta: 10 },
  { id: 'groom', emoji: '✨', label: '梳毛',  effect: 'mood',    delta: 5  },
  { id: 'play',  emoji: '🎮', label: '玩耍',  effect: 'happy',   delta: 15 },
];

export default function NurtureMenu({ stats, onAction }) {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(null);

  function handleAction(action) {
    onAction(action);
    setFlash(action.id);
    setTimeout(() => setFlash(null), 800);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-sm hover:bg-white/20 transition-all"
      >
        {open ? '✕ 关闭' : '💝 互动'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-[#1a1a2e] border border-white/20 rounded-2xl p-4 flex gap-3 shadow-xl"
          >
            {ACTIONS.map(a => (
              <button
                key={a.id}
                onClick={() => handleAction(a)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  flash === a.id ? 'bg-purple-500/40 scale-110' : 'bg-white/5 hover:bg-white/15'
                }`}
              >
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-xs text-white/60">{a.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      <div className="mt-3 space-y-1.5">
        {[
          { label: '🍖 饱食', value: stats.hunger, color: 'bg-orange-400' },
          { label: '💜 心情', value: stats.mood,   color: 'bg-purple-400' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-xs text-white/40 w-14">{s.label}</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${s.value}%` }}
                className={`h-full ${s.color} rounded-full`}
              />
            </div>
            <span className="text-xs text-white/30 w-6">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/NurtureMenu.jsx
git commit -m "feat: add NurtureMenu with feed/groom/play actions and stats bars"
```

---

## Task 8: Main app — wire everything together

**Files:**
- Modify: `src/App.jsx`

**Step 1: Rewrite App.jsx**

Replace `src/App.jsx` with:
```jsx
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Pet from './components/Pet';
import AgentLog from './components/AgentLog';
import HabitCard from './components/HabitCard';
import NurtureMenu from './components/NurtureMenu';
import { useSensors } from './hooks/useSensors';
import { runAgent } from './services/claudeAgent';

const DEFAULT_HABITS = [
  { id: 'water', label: '喝水', intervalHours: 2, lastDone: null },
];

const DEFAULT_PREFS = {
  learningTopic: 'AI大模型',
  learningHour: 9,
};

export default function App() {
  const sensors = useSensors();
  const [petState, setPetState] = useState('normal');
  const [message, setMessage] = useState('');
  const [actions, setActions] = useState([]);
  const [learningSummary, setLearningSummary] = useState('');
  const [logs, setLogs] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [stats, setStats] = useState({ hunger: 70, mood: 80 });
  const [lastRun, setLastRun] = useState(null);

  const addLog = useCallback((log) => {
    setLogs(prev => [...prev.slice(-20), log]);
  }, []);

  async function triggerAgent() {
    if (isThinking) return;
    setIsThinking(true);
    setLogs([]);
    try {
      const { petDecision, learningSummary: summary } = await runAgent(
        sensors, DEFAULT_HABITS, DEFAULT_PREFS, addLog
      );
      if (petDecision) {
        setPetState(petDecision.state);
        setMessage(petDecision.message);
        setActions(petDecision.actions);
      }
      if (summary) setLearningSummary(summary);
      setLastRun(new Date());
    } catch (e) {
      addLog({ type: 'info', text: `❌ 错误：${e.message}` });
    } finally {
      setIsThinking(false);
    }
  }

  // Auto-run agent every 10 minutes
  useEffect(() => {
    triggerAgent();
    const interval = setInterval(triggerAgent, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  function handleAction(action) {
    if (action.includes('喝水') || action.includes('做') || action.includes('去')) {
      setPetState('happy');
      setMessage('太棒了！你最棒！');
      setActions([]);
      setStats(s => ({ ...s, mood: Math.min(100, s.mood + 10) }));
    } else {
      setPetState('normal');
      setMessage('');
      setActions([]);
    }
  }

  function handleNurture(action) {
    setStats(prev => {
      const next = { ...prev };
      if (action.effect === 'hunger') next.hunger = Math.min(100, prev.hunger + action.delta);
      if (action.effect === 'mood') next.mood = Math.min(100, prev.mood + action.delta);
      if (action.effect === 'happy') { next.mood = Math.min(100, prev.mood + action.delta); }
      return next;
    });
    setPetState('happy');
    setTimeout(() => setPetState(petState), 1500);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <h1 className="text-2xl font-bold mb-1 text-purple-300">PetMind</h1>
      <p className="text-white/30 text-xs mb-8">世界感知桌面宠物</p>

      {/* Sensor status bar */}
      <div className="flex gap-3 mb-6 text-xs text-white/40">
        <span>🌤 {sensors.weather?.condition} {sensors.weather?.temp}°C</span>
        <span>⏱ 使用 {sensors.screenMinutes}分钟</span>
        <span>🕐 {sensors.time.hour}:{String(sensors.time.minute).padStart(2,'0')}</span>
      </div>

      {/* Pet */}
      <Pet state={petState} onClick={triggerAgent} />

      {/* Habit card */}
      <div className="w-full max-w-sm">
        <HabitCard
          petState={petState}
          message={message}
          actions={actions}
          learningSummary={learningSummary}
          onAction={handleAction}
        />
      </div>

      {/* Nurture */}
      <div className="mt-6">
        <NurtureMenu stats={stats} onAction={handleNurture} />
      </div>

      {/* Manual trigger */}
      <button
        onClick={triggerAgent}
        disabled={isThinking}
        className="mt-4 text-xs text-white/30 hover:text-white/60 transition-colors"
      >
        {isThinking ? '⚙️ Agent 运行中...' : '↺ 手动触发 Agent'}
      </button>

      {lastRun && (
        <p className="text-xs text-white/20 mt-1">
          上次运行：{lastRun.toLocaleTimeString()}
        </p>
      )}

      {/* Agent log */}
      <AgentLog logs={logs} isThinking={isThinking} />
    </div>
  );
}
```

**Step 2: Test full flow**

```bash
npm run dev
```

Expected:
- Page loads with pet in normal state
- Sensor bar shows weather + screen time + time
- Clicking pet or "手动触发 Agent" triggers agent
- AgentLog panel shows tool calls streaming in
- Pet state changes based on agent decision
- HabitCard shows message + action buttons
- Clicking action buttons changes pet to happy state

**Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire all components — sensors, agent, pet, log, nurture"
```

---

## Task 9: Build and deploy

**Step 1: Build**

```bash
npm run build
```
Expected: `dist/` folder created, no errors.

**Step 2: Deploy to Netlify**

```bash
netlify deploy --prod --dir=dist --allow-anonymous
```

**Step 3: Note the URL and test on mobile**

Open the URL on phone browser — verify pet renders, agent triggers, log shows tool calls.

**Step 4: Final commit**

```bash
git add .
git commit -m "chore: production build"
```

---

## MVP Checklist

- [ ] Pet with 7 animated states
- [ ] Weather sensor → pet reacts (rain → umbrella, hot → fan)
- [ ] Screen time sensor → 60min → exercise state
- [ ] Time sensor → 23:00 → sleepy state
- [ ] Claude function calling with `set_pet_state` tool
- [ ] AgentLog panel shows all tool calls in real-time
- [ ] Multi-signal priority reasoning visible in log
- [ ] Learning summary via `fetch_learning_summary` tool
- [ ] Nurture interactions (feed/groom/play)
- [ ] Deployed and shareable link
