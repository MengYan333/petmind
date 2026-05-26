# Desktop Pet QQ-Style Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the card-style Electron widget with a frameless, transparent full-body SVG cat that walks along the taskbar and shows a hover dialog.

**Architecture:** A full-screen-width × 160px transparent Electron window sits just above the taskbar. The React app renders a walking SVG cat via a `useCatWalk` state machine. Mouse events are toggled via IPC so the window is normally click-through. Hovering the cat reveals a Framer Motion popup with nurture buttons and agent trigger.

**Tech Stack:** React 19, Framer Motion, Electron 42 (IPC + `setIgnoreMouseEvents`), inline SVG, Tailwind CSS v4

---

## Task 1: Update Electron main.cjs — new window + IPC

**Files:**
- Modify: `electron/main.cjs`

**What changes:**
- Window becomes full-width × 160px, positioned at `y = workArea.y + workArea.height - 160`
- Remove old `resize-window` IPC (no longer expand/collapse)
- Add `set-mouse-ignore` IPC → calls `win.setIgnoreMouseEvents(ignore, { forward: true })`
- Add `get-screen-size` IPC → returns `{ width, height }` of work area
- On `ready`, call `win.setIgnoreMouseEvents(true, { forward: true })` immediately

**Step 1: Edit `electron/main.cjs`**

Replace the entire `createWindow` function and IPC section:

```js
// At top, keep existing requires. Change COLLAPSED/EXPANDED constants to:
const PET_STRIP = { height: 160 };

function createWindow() {
  const { x, y, width, height } = screen.getPrimaryDisplay().workAreaSize;
  const winY = y + height - PET_STRIP.height;

  win = new BrowserWindow({
    width,
    height: PET_STRIP.height,
    x: 0,
    y: winY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setIgnoreMouseEvents(true, { forward: true });
  win.setAlwaysOnTop(true, 'screen-saver');

  // ... keep existing webContents event listeners unchanged ...

  const isDev = !app.isPackaged;
  if (isDev) {
    const port = process.env.VITE_DEV_PORT || '5173';
    win.loadURL(`http://localhost:${port}`).catch(e => console.log('[main] loadURL error:', e.message));
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }
}
```

Replace the IPC block inside `app.whenReady().then(...)`:

```js
  ipcMain.on('set-mouse-ignore', (_, ignore) => {
    if (!win) return;
    win.setIgnoreMouseEvents(ignore, { forward: true });
  });

  ipcMain.handle('get-screen-size', () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return { width, height };
  });
```

Remove the old `resize-window` and `close-window` IPC handlers.

**Step 2: Verify syntax**
```bash
node -e "require('./electron/main.cjs')" 2>&1 | head -5
```
Expected: no output (require will fail on Electron APIs but shouldn't have syntax errors — ignore `Cannot find module 'electron'`).

**Step 3: Commit**
```bash
git add electron/main.cjs
git commit -m "feat(electron): full-width strip window + mouse-ignore IPC"
```

---

## Task 2: Update preload.cjs — expose new APIs

**Files:**
- Modify: `electron/preload.cjs`

**Step 1: Replace preload.cjs content**

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  setMouseIgnore: (ignore) => ipcRenderer.send('set-mouse-ignore', ignore),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
});
```

Note: `resizeWindow` and `closeWindow` removed — no longer needed.

**Step 2: Commit**
```bash
git add electron/preload.cjs
git commit -m "feat(electron): update preload — setMouseIgnore + getScreenSize"
```

---

## Task 3: Create `useCatWalk.js` — walk state machine

**Files:**
- Create: `src/hooks/useCatWalk.js`

**What it does:**
Returns `{ catX, walkMode, facing, screenWidth }` where:
- `catX` — current X position of cat (left edge of cat, in px)
- `walkMode` — `'sitting' | 'walking' | 'peeking'`
- `facing` — `'right' | 'left'`
- `screenWidth` — from `getScreenSize` or `window.innerWidth`

State machine:
1. Mount → fetch screen width → enter `sitting`
2. After random 4–10s → pick random `targetX`:
   - 15% chance: edge (peek) — `targetX < 30` or `targetX > screenWidth - 80`
   - 85% chance: `targetX` in `[80, screenWidth - 80]`
3. Enter `walking`, update `facing` based on direction
4. Framer Motion drives the `x` animation externally using `catX` as target
5. After walk duration (`distance / 80` seconds) → enter `sitting` or `peeking`
6. Repeat

**Step 1: Create `src/hooks/useCatWalk.js`**

```js
import { useState, useEffect, useRef } from 'react';

const CAT_WIDTH = 70;
const WALK_SPEED = 80; // px per second

export function useCatWalk() {
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [catX, setCatX] = useState(200);
  const [walkMode, setWalkMode] = useState('sitting');
  const [facing, setFacing] = useState('right');
  const timerRef = useRef(null);

  useEffect(() => {
    async function init() {
      if (window.electronAPI?.getScreenSize) {
        const { width } = await window.electronAPI.getScreenSize();
        setScreenWidth(width);
      }
    }
    init();
  }, []);

  useEffect(() => {
    function scheduleNextWalk() {
      const delay = 4000 + Math.random() * 6000; // 4-10s
      timerRef.current = setTimeout(() => startWalk(), delay);
    }

    function startWalk() {
      const isPeek = Math.random() < 0.15;
      let targetX;
      if (isPeek) {
        targetX = Math.random() < 0.5
          ? -CAT_WIDTH + 20          // peek left
          : screenWidth - 20;        // peek right
      } else {
        targetX = 80 + Math.random() * (screenWidth - 160);
      }

      setCatX(prev => {
        setFacing(targetX > prev ? 'right' : 'left');
        return prev; // actual x update happens below
      });
      setWalkMode(targetX < 30 || targetX > screenWidth - 50 ? 'peeking' : 'walking');
      setCatX(targetX);

      // After walk completes, sit
      const distance = Math.abs(targetX - catX);
      const duration = (distance / WALK_SPEED) * 1000 + 200;
      timerRef.current = setTimeout(() => {
        setWalkMode('sitting');
        scheduleNextWalk();
      }, duration);
    }

    scheduleNextWalk();
    return () => clearTimeout(timerRef.current);
  }, [screenWidth]);

  return { catX, walkMode, facing, screenWidth };
}
```

**Step 2: Commit**
```bash
git add src/hooks/useCatWalk.js
git commit -m "feat: useCatWalk hook — walk state machine"
```

---

## Task 4: Create `CatSVG.jsx` — full-body SVG cat

**Files:**
- Create: `src/components/CatSVG.jsx`

**What it renders:** 70×90px inline SVG cat. Props:
- `color` — base hex color (e.g. `'#f97316'`)
- `walkMode` — `'sitting' | 'walking' | 'peeking'`
- `facing` — `'left' | 'right'` (handled by parent via `scaleX`)
- `isThinking` — shows small ⚙️ above head when true

**Body parts and their animations:**

| Part | Element | Animation |
|---|---|---|
| Tail | `<path>` curving right from body base | `rotate` ±20° from tail origin, 2s loop |
| Body | `<rect rx="12">` | y: +2/-2 bob when walking (0.4s loop) |
| Back legs | 2 `<rect>` at body bottom | alternate y ±4px, 0.4s loop, 180° phase offset |
| Front legs | 2 `<rect>` at body bottom-front | alternate y ±4px, opposite phase to back legs |
| Head | `<circle>` | fixed relative to body |
| Ears | 2 `<polygon>` triangles | no animation |
| Eyes | 2 `<ellipse>` | blink: scaleY 0→1 every 4s |
| Nose | `<ellipse>` small | no animation |
| Mouth | `<path>` | no animation |
| Whiskers | 3× `<line>` per side | no animation |

**Step 1: Create `src/components/CatSVG.jsx`**

```jsx
import { motion } from 'framer-motion';

// Derive lighter shade for belly/face details
function lighten(hex) {
  // simple: mix with white 40%
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255,r+80)},${Math.min(255,g+80)},${Math.min(255,b+80)})`;
}

const LEG_WALK = {
  animate: { y: [0, -5, 0, 5, 0] },
  transition: { duration: 0.4, repeat: Infinity, ease: 'linear' },
};
const LEG_WALK_ALT = {
  animate: { y: [0, 5, 0, -5, 0] },
  transition: { duration: 0.4, repeat: Infinity, ease: 'linear' },
};
const TAIL_SWISH = {
  animate: { rotate: [-20, 20, -20] },
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
};
const BODY_BOB = {
  animate: { y: [0, 2, 0, -2, 0] },
  transition: { duration: 0.4, repeat: Infinity, ease: 'linear' },
};
const BLINK = {
  animate: { scaleY: [1, 1, 1, 0.1, 1] },
  transition: { duration: 4, repeat: Infinity, times: [0, 0.85, 0.9, 0.95, 1] },
};

export default function CatSVG({ color = '#f97316', walkMode = 'sitting', isThinking = false }) {
  const light = lighten(color);
  const isWalking = walkMode === 'walking';

  return (
    <svg width="70" height="90" viewBox="0 0 70 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tail — origin at body-right-bottom */}
      <motion.g
        style={{ originX: '48px', originY: '72px' }}
        {...TAIL_SWISH}
      >
        <path
          d="M48 72 Q65 68 62 55 Q59 45 52 48"
          stroke={color} strokeWidth="5" strokeLinecap="round" fill="none"
        />
      </motion.g>

      {/* Body */}
      <motion.g {...(isWalking ? BODY_BOB : {})}>
        <rect x="18" y="42" width="34" height="32" rx="12" fill={color} />
        {/* Belly */}
        <ellipse cx="35" cy="56" rx="10" ry="12" fill={light} opacity="0.5" />

        {/* Back legs */}
        <motion.rect x="20" y="68" width="8" height="16" rx="4" fill={color}
          {...(isWalking ? LEG_WALK : {})} />
        <motion.rect x="42" y="68" width="8" height="16" rx="4" fill={color}
          {...(isWalking ? LEG_WALK_ALT : {})} />

        {/* Front legs */}
        <motion.rect x="26" y="66" width="7" height="14" rx="4" fill={color}
          {...(isWalking ? LEG_WALK_ALT : {})} />
        <motion.rect x="37" y="66" width="7" height="14" rx="4" fill={color}
          {...(isWalking ? LEG_WALK : {})} />
      </motion.g>

      {/* Head */}
      <circle cx="35" cy="30" r="20" fill={color} />

      {/* Ears */}
      <polygon points="16,16 10,2 24,10" fill={color} />
      <polygon points="54,16 60,2 46,10" fill={color} />
      {/* Inner ears */}
      <polygon points="17,15 12,5 23,11" fill={light} opacity="0.6" />
      <polygon points="53,15 58,5 47,11" fill={light} opacity="0.6" />

      {/* Face */}
      {/* Eyes */}
      <motion.g style={{ originX: '28px', originY: '28px' }} {...BLINK}>
        <ellipse cx="28" cy="28" rx="4" ry="4.5" fill="#1a1a2e" />
        <circle cx="29.5" cy="26.5" r="1.2" fill="white" />
      </motion.g>
      <motion.g style={{ originX: '42px', originY: '28px' }} {...BLINK}>
        <ellipse cx="42" cy="28" rx="4" ry="4.5" fill="#1a1a2e" />
        <circle cx="43.5" cy="26.5" r="1.2" fill="white" />
      </motion.g>

      {/* Nose */}
      <ellipse cx="35" cy="34" rx="2.5" ry="2" fill="#1a1a2e" opacity="0.7" />

      {/* Mouth */}
      <path d="M32 36 Q35 39 38 36" stroke="#1a1a2e" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />

      {/* Whiskers left */}
      <line x1="12" y1="32" x2="27" y2="33" stroke="#1a1a2e" strokeWidth="0.8" opacity="0.4" />
      <line x1="12" y1="35" x2="27" y2="35" stroke="#1a1a2e" strokeWidth="0.8" opacity="0.4" />
      <line x1="14" y1="38" x2="27" y2="37" stroke="#1a1a2e" strokeWidth="0.8" opacity="0.4" />

      {/* Whiskers right */}
      <line x1="43" y1="33" x2="58" y2="32" stroke="#1a1a2e" strokeWidth="0.8" opacity="0.4" />
      <line x1="43" y1="35" x2="58" y2="35" stroke="#1a1a2e" strokeWidth="0.8" opacity="0.4" />
      <line x1="43" y1="37" x2="56" y2="38" stroke="#1a1a2e" strokeWidth="0.8" opacity="0.4" />

      {/* Thinking indicator */}
      {isThinking && (
        <motion.text x="48" y="12" fontSize="14"
          animate={{ opacity: [0.4, 1, 0.4], y: [0, -4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >⚙️</motion.text>
      )}
    </svg>
  );
}
```

**Step 2: Commit**
```bash
git add src/components/CatSVG.jsx
git commit -m "feat: CatSVG — full-body SVG cat with walk/blink/tail animations"
```

---

## Task 5: Create `CatPopup.jsx` — hover dialog

**Files:**
- Create: `src/components/CatPopup.jsx`

**Props:**
- `message` — string, agent's latest message
- `isThinking` — bool
- `onNurture(action)` — callback
- `onTriggerAgent()` — callback
- `catX` — number, for positioning
- `screenWidth` — number, to clamp popup within screen

**Step 1: Create `src/components/CatPopup.jsx`**

```jsx
import { motion } from 'framer-motion';

const NURTURE = [
  { id: 'feed',  emoji: '🍎', label: '喂食' },
  { id: 'water', emoji: '💧', label: '喝水' },
  { id: 'groom', emoji: '✨', label: '梳毛' },
  { id: 'play',  emoji: '🎮', label: '玩耍' },
];

export default function CatPopup({ message, isThinking, onNurture, onTriggerAgent, catX, screenWidth }) {
  const popupWidth = 200;
  // center popup on cat (cat center is catX + 35), clamp within screen
  const rawLeft = catX + 35 - popupWidth / 2;
  const left = Math.max(8, Math.min(rawLeft, screenWidth - popupWidth - 8));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'fixed',
        bottom: 168,  // 160px window height + 8px gap
        left,
        width: popupWidth,
        background: 'rgba(13,13,26,0.94)',
        border: '1px solid rgba(168,85,247,0.35)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 20px rgba(168,85,247,0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '10px 12px',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
    >
      {/* Message */}
      {message && (
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, textAlign: 'center', marginBottom: 8, lineHeight: 1.5 }}>
          💬 {message}
        </p>
      )}

      {/* Nurture buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 8 }}>
        {NURTURE.map(n => (
          <button
            key={n.id}
            onClick={() => onNurture(n.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10, padding: '5px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
              fontSize: 11,
            }}
          >
            <span style={{ fontSize: 18 }}>{n.emoji}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </div>

      {/* Agent trigger */}
      <button
        onClick={onTriggerAgent}
        disabled={isThinking}
        style={{
          width: '100%', padding: '5px 0', borderRadius: 10,
          background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)',
          color: isThinking ? 'rgba(168,85,247,0.5)' : 'rgba(168,85,247,0.9)',
          fontSize: 12, cursor: isThinking ? 'not-allowed' : 'pointer',
        }}
      >
        {isThinking ? '⚙️ 思考中...' : '↺ 触发 Agent'}
      </button>
    </motion.div>
  );
}
```

**Step 2: Commit**
```bash
git add src/components/CatPopup.jsx
git commit -m "feat: CatPopup — hover dialog with nurture + agent trigger"
```

---

## Task 6: Rewrite `DesktopApp.jsx`

**Files:**
- Modify: `src/components/DesktopApp.jsx`

**What it does:**
- Removes all card/panel UI
- Uses `useCatWalk` for position + mode
- Renders `CatSVG` animated to `catX` with Framer Motion `animate={{ x: catX }}`
- Mouse enter/leave on cat div → IPC `setMouseIgnore` toggle + `hovered` state
- `AnimatePresence` wraps `CatPopup` (shown only when `hovered`)
- Maps `petState` → `color` for CatSVG
- On mount: calls `triggerAgent()` once + sets 10-min interval

**State color map:**
```js
const STATE_COLORS = {
  normal: '#f97316', thirsty: '#f97316', sleepy: '#818cf8',
  exercise: '#22c55e', rainy: '#38bdf8', hot: '#ef4444',
  learning: '#facc15', news: '#34d399', happy: '#f472b6',
};
```

**Step 1: Rewrite `src/components/DesktopApp.jsx`**

```jsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CatSVG from './CatSVG';
import CatPopup from './CatPopup';
import { useCatWalk } from '../hooks/useCatWalk';
import { useSensors } from '../hooks/useSensors';
import { runAgent } from '../services/claudeAgent';
import { useGrowthSystem } from '../hooks/useGrowthSystem';

const DEFAULT_HABITS = [{ id: 'water', label: '喝水', intervalHours: 2, lastDone: null }];
const DEFAULT_PREFS  = { learningTopic: 'AI大模型', learningHour: 9 };

const STATE_COLORS = {
  normal: '#f97316', thirsty: '#f97316', sleepy: '#818cf8',
  exercise: '#22c55e', rainy: '#38bdf8', hot: '#ef4444',
  learning: '#facc15', news: '#34d399', happy: '#f472b6',
};

export default function DesktopApp() {
  const sensors = useSensors();
  const { catX, walkMode, facing, screenWidth } = useCatWalk();
  const [petState, setPetState] = useState('normal');
  const [message, setMessage]   = useState('');
  const [actions, setActions]   = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [hovered, setHovered]   = useState(false);
  const leaveTimerRef           = useRef(null);
  const { nurture, recordHabitDone, recordLearnRead } = useGrowthSystem();

  const addLog = useCallback(() => {}, []); // desktop: no log panel

  async function triggerAgent() {
    if (isThinking) return;
    setIsThinking(true);
    try {
      const { petDecision, learningSummary: summary } = await runAgent(
        sensors, DEFAULT_HABITS, DEFAULT_PREFS, addLog
      );
      if (petDecision) {
        setPetState(petDecision.state);
        setMessage(petDecision.message);
        setActions(petDecision.actions);
      }
      if (summary) recordLearnRead();
    } catch (e) {
      console.error('[DesktopApp] agent error:', e.message);
    } finally {
      setIsThinking(false);
    }
  }

  // Auto-run on mount + every 10 min
  useEffect(() => {
    triggerAgent();
    const id = setInterval(triggerAgent, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  function handleMouseEnter() {
    clearTimeout(leaveTimerRef.current);
    setHovered(true);
    window.electronAPI?.setMouseIgnore(false);
  }

  function handleMouseLeave() {
    // small delay so mouse can move into popup without it closing
    leaveTimerRef.current = setTimeout(() => {
      setHovered(false);
      window.electronAPI?.setMouseIgnore(true);
    }, 120);
  }

  function handleNurture(id) {
    const effectMap = { feed: 'hunger', water: 'hunger', groom: 'mood', play: 'happy' };
    nurture({ effect: effectMap[id] || 'mood', delta: 10 });
    const prev = petState;
    setPetState('happy');
    setTimeout(() => setPetState(prev), 1500);
  }

  const color = STATE_COLORS[petState] || STATE_COLORS.normal;
  // peeking: only show head (clip body)
  const isPeeking = walkMode === 'peeking';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: 'transparent' }}>
      {/* Cat */}
      <motion.div
        animate={{ x: catX }}
        transition={{ type: 'tween', ease: 'linear', duration: Math.abs(catX) / 80 || 0.1 }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 70,
          cursor: 'pointer',
          // when peeking at right edge, clip to show only head
          clipPath: isPeeking && facing === 'right' ? 'inset(0 0 0 40px)' : 'none',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{ transform: `scaleX(${facing === 'left' ? -1 : 1})`, transformOrigin: 'center' }}>
          <CatSVG color={color} walkMode={walkMode} isThinking={isThinking} />
        </div>
      </motion.div>

      {/* Hover popup */}
      <AnimatePresence>
        {hovered && (
          <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <CatPopup
              message={message}
              isThinking={isThinking}
              onNurture={handleNurture}
              onTriggerAgent={triggerAgent}
              catX={catX}
              screenWidth={screenWidth}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add src/components/DesktopApp.jsx
git commit -m "feat: rewrite DesktopApp — frameless walking cat + hover popup"
```

---

## Task 7: Test end-to-end in Electron

**Step 1: Kill any running Electron instances**
```bash
taskkill /F /IM electron.exe 2>/dev/null; echo done
```

**Step 2: Ensure Vite is running, note port**
```bash
# Check if dev server is up
curl -s -o /dev/null -w "%{http_code}" http://localhost:5760 || echo "start vite first"
```

**Step 3: Launch Electron with correct port**
```bash
VITE_DEV_PORT=5760 npm run electron:dev
```

**Step 4: Visual checks**
- [ ] Transparent window — no dark card, no border
- [ ] Cat SVG visible at bottom of screen, walking left/right
- [ ] Cat faces direction of travel (flips horizontally)
- [ ] Tail swishes, legs animate during walk
- [ ] Cat occasionally peeks at screen edge (head only)
- [ ] Hover over cat → popup appears with message + nurture buttons
- [ ] Mouse leave → popup disappears after ~120ms
- [ ] Nurture button → cat briefly turns happy color
- [ ] Agent trigger button → isThinking spinner on cat

**Step 5: If window doesn't appear at bottom, check console**
```bash
# In Electron dev tools (Ctrl+Shift+I in the window if visible)
# Or check stdout from npm run electron:dev
```

**Step 6: Commit fix if needed, then final commit**
```bash
git add -A
git commit -m "feat: QQ-pet style desktop cat complete"
```

---

## Known Edge Cases

| Case | Handling |
|---|---|
| Screen resize / multiple monitors | `getScreenSize` called once on mount; restart needed for monitor changes |
| Agent error | Logged to console only (no UI in desktop mode) |
| Popup going off-screen top | `bottom: 168` is fixed; if screen is very short, popup may overlap |
| Walk animation jitter | Framer Motion `duration` calculated from distance; minimum 0.1s |
