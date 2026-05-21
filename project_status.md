# PetMind — Project Status for Next Agent

> Last updated: 2026-05-21 (优化完成)
> Purpose: Hand-off doc so the next agent can continue optimizing without re-reading all the code.

---

## What Is PetMind

A desktop AI pet (like QQ Pet) that senses the user's environment (time, weather, screen usage) and uses Claude claude-sonnet-4-6 to decide how the pet should behave. Built with React + Vite + Tailwind v4 + Framer Motion, packaged as both a **web app** and a **transparent floating Electron window**.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v4, Framer Motion |
| AI | Anthropic SDK (`@anthropic-ai/sdk`), model `claude-sonnet-4-6` |
| Desktop | Electron 42 — transparent, frameless, always-on-top, `skipTaskbar` |
| Sensors | `visibilitychange` (screen time), OpenWeatherMap API (weather) |

---

## Project Structure

```
petmind/
├── electron/
│   ├── main.cjs          # Electron main process (CommonJS)
│   ├── preload.cjs       # contextBridge → window.electronAPI
│   ├── launch.cjs        # Spawner that removes ELECTRON_RUN_AS_NODE
│   └── debug.cjs         # Debug helper (can ignore)
├── src/
│   ├── main.jsx          # Entry: sets body background transparent in Electron
│   ├── App.jsx           # Router: isElectron ? <DesktopApp> : <WebApp>
│   ├── index.css         # Tailwind v4 (@import "tailwindcss") + base styles
│   ├── components/
│   │   ├── Pet.jsx          # 9 states + Framer Motion (normal/thirsty/sleepy/exercise/rainy/hot/learning/news/happy)
│   │   ├── DesktopApp.jsx   # Electron floating window UI (collapsed + expanded)
│   │   ├── AgentLog.jsx     # Collapsible log panel (web version)
│   │   ├── HabitCard.jsx    # Message + action buttons + learning/news content blocks
│   │   ├── NurtureMenu.jsx  # Feed/groom/play popup with stat bars (web version)
│   │   └── GrowthPanel.jsx  # 4-stage growth progress + achievements (web version)
│   ├── hooks/
│   │   ├── useSensors.js        # Combines time + weather + screen time
│   │   ├── useWeather.js        # Fetches OpenWeatherMap, falls back to Clear/22°C
│   │   ├── useScreenTime.js     # Tracks active usage (mouse/keyboard idle detection, 5min threshold)
│   │   ├── useLearningCache.js  # Daily localStorage cache for learning summaries
│   │   ├── useNewsCache.js      # Daily localStorage cache for news headlines
│   │   └── useGrowthSystem.js   # Growth stages, achievements, stats decay, localStorage persistence
│   └── services/
│       └── claudeAgent.js   # Agentic loop with tool calling
├── .env                  # API keys (NOT committed, needs real values — see below)
├── package.json          # "type":"module", electron files use .cjs extension
└── PROJECT_STATUS.md     # This file
```

---

## How to Run

```bash
# Web version (localhost:5173)
npm run dev

# Desktop floating window
npm run electron:dev
```

Both require the Vite dev server running first (`npm run dev`). The Electron app loads `http://localhost:5173`.

---

## Environment Variables (`.env`)

```
VITE_ANTHROPIC_API_KEY=sk-ant-...     # Required for Claude agent
VITE_WEATHER_API_KEY=...              # OpenWeatherMap key (free tier OK)
VITE_WEATHER_CITY=Beijing             # City for weather lookup
```

**Status**: `.env` file exists but contains placeholder values. The user must fill in real keys for agent + weather to work.

---

## Key Architecture Decisions

### 1. Electron IPC Bridge
`window.electronAPI` is exposed via `contextBridge` in `preload.cjs`:
- `window.electronAPI.isElectron` — boolean, used in `App.jsx` to route to `<DesktopApp>`
- `window.electronAPI.resizeWindow(w, h)` — sends `resize-window` IPC to main
- `window.electronAPI.closeWindow()` — sends `close-window` IPC to main

### 2. Window Sizes
Defined in both `main.cjs` and `DesktopApp.jsx` (must stay in sync):
- **COLLAPSED**: 170 × 210 px — shows pet + two stat bars
- **EXPANDED**: 290 × 500 px — full panel with message, actions, nurture, agent log

### 3. ELECTRON_RUN_AS_NODE Fix
VS Code injects `ELECTRON_RUN_AS_NODE=1` into child processes, which makes Electron run as plain Node.js (no Electron APIs injected). Fixed by `electron/launch.cjs` which `delete env.ELECTRON_RUN_AS_NODE` before spawning the Electron binary.

### 4. Pet States (9 total)
`normal | thirsty | sleepy | exercise | rainy | hot | learning | news | happy`

Each has: emoji, glow color, optional accessory emoji, Framer Motion animation. Claude decides which state to show based on sensor data.

### 5. Agent Decision Loop (`claudeAgent.js`)
Tools available to Claude:
- `set_pet_state` — delivers final pet state + message + action buttons
- `fetch_learning_summary` — generates a 3-sentence summary of a topic

Priority rules (encoded in the system prompt):
1. Late night (≥23:00) → `sleepy`
2. Screen time ≥ 60 min → `exercise`
3. Rain weather → `rainy`
4. High temp (≥35°C) → `hot`
5. Drink water reminder → `thirsty`
6. Learning hour → `fetch_learning_summary` then `learning`
7. Default → `normal`

---

## Current State (What Works)

- [x] Web app UI — pet, habit card, nurture menu, agent log
- [x] Desktop Electron app — transparent floating window, bottom-right corner
- [x] Collapsed view: pet + stat bars (draggable header)
- [x] Expand/collapse via ▲/▼ button (IPC resize confirmed working)
- [x] Close via ✕ button (IPC close confirmed working)
- [x] Screen time sensor
- [x] Weather sensor (works when API key is provided)
- [x] Agent decision loop structure
- [x] Inline agent log in expanded desktop view

---

## MVP 功能完成状态 ✅

| # | 功能 | 状态 |
|---|------|------|
| 1 | 宠物渲染 + 9种状态动画（含 learning/news 专属动画） | ✅ 完成 |
| 2 | 天气感知 → rainy（☂️）/ hot（🪭 扇扇子） | ✅ 完成 |
| 3 | 屏幕活跃时长（鼠标/键盘检测，5分钟空闲暂停） | ✅ 完成 |
| 4 | Agent 优先级决策（Claude function calling + AgentLog 可视化） | ✅ 完成 |
| 5 | 学习摘要（每日一次，localStorage 缓存，无重复 API 调用） | ✅ 完成 |
| 6 | 新闻摘要（早晨8-10点，Claude生成，每日缓存） | ✅ 完成 |
| 7 | 完整养成系统（4阶段成长、4成就、stats衰减、全量持久化） | ✅ 完成 |

---

## Agent 工具列表（claudeAgent.js）

| 工具 | 触发条件 | 行为 |
|------|----------|------|
| `set_pet_state` | 每次 Agent 决策 | 设置宠物状态 + 消息 + 操作按钮 |
| `fetch_learning_summary` | 学习时间到 | 生成3句话摘要（优先读当日缓存）|
| `fetch_news_summary` | 早晨8-10点 | 生成3条新闻（优先读当日缓存）|

---

## Agent 优先级规则

```
0. 早晨8-10点 → fetch_news_summary → news
1. 深夜≥23点 → sleepy
2. 连续使用≥60分钟 → exercise
3. 下雨（Rain/Drizzle/Thunderstorm）→ rainy
4. 高温≥35°C → hot
5. 喝水时间到 → thirsty
6. 学习时间到 → fetch_learning_summary → learning
7. 默认 → normal
```

---

## 当前已知遗留问题

1. **Desktop 版无自动触发** — `DesktopApp.jsx` 缺少启动时 `triggerAgent()` 和10分钟定时（Web版有，Desktop版没有）
2. **习惯记录无设置 UI** — `DEFAULT_HABITS` 仍为硬编码，用户无法在 UI 中修改习惯列表
3. **useWeather 无刷新间隔** — 天气数据只在组件挂载时获取一次，长时间使用会过时

---

## Design Docs

Two design documents are in the project root:
- [`2026-05-21-petmind-design.md`](./2026-05-21-petmind-design.md) — original product design
- [`2026-05-21-petmind-implementation.md`](./2026-05-21-petmind-implementation.md) — implementation plan
