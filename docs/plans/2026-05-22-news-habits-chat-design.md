# PetMind — News / Habits / Chat Design

> Date: 2026-05-22

## Scope

Three features added on top of the existing desktop bubble + web version:

1. **Desktop: 「今日」tab** — replaces 「喂食」tab, shows news + feed button
2. **Web: Habits drawer** — ⚙️ button opens right-side drawer to add/delete habits; data persisted in localStorage
3. **Web: Chat section** — collapsible chat area at page bottom with persistent history (localStorage, 50 messages max)

---

## 1. Desktop Bubble — 「今日」Tab

### Layout

```
┌──────────────────────────┐
│  <pet message>            │
├──────────────────────────┤
│ 📅今日 │ 🔔提醒 │ 💬对话  │
├──────────────────────────┤
│ (when newsHeadlines set)  │
│ 📰 早报                   │
│ • ...                    │
│ ────────────────────── │
│       [🍎 喂食]           │
└──────────────────────────┘
```

### Data Flow

- `runAgent()` already returns `newsHeadlines`
- `DesktopApp` stores it in `newsContent` state
- `TodayTab` receives `newsContent` + `onFeed` props

### Rules

- News section only renders when `newsContent` is non-empty
- Feed button always visible
- No auto-close timer when on chat tab (already implemented)

---

## 2. Web Version — Habits Drawer

### New file: `src/hooks/useHabits.js`

```js
// localStorage key: 'petmind-habits'
// Default: [喝水 2h, 起身活动 1h, 护眼休息 1h]
// Exports: { habits, addHabit(label, hours), removeHabit(id) }
```

### New file: `src/components/HabitsDrawer.jsx`

- Triggered by ⚙️ button in top-right of WebApp
- Right-side overlay (fixed, z-50), semi-transparent backdrop
- Shows current habits as a list with delete button
- Add-habit form: text input + number input (hours) + submit

### Integration

- `App.jsx` passes `habits` from `useHabits()` to both `runAgent()` and `HabitsDrawer`
- Replaces hardcoded `DEFAULT_HABITS`

---

## 3. Web Version — Chat Section

### New file: `src/hooks/useChatHistory.js`

```js
// localStorage key: 'petmind-chat'
// Max 50 messages: [{ role: 'user'|'pet', text, ts }]
// Exports: { messages, addMessage(role, text), clearHistory() }
```

### New file: `src/components/ChatSection.jsx`

- Placed at bottom of WebApp, above AgentLog
- Header: "💬 和猫咪聊天" + expand/collapse toggle + "清空" button
- Collapsed by default
- When expanded: scrollable message list + input bar
- Timestamps: show HH:mm for today, MM/DD for older

### Integration

- `App.jsx` imports `useChatHistory` and `ChatSection`
- `chatWithPet()` already exported from `claudeAgent.js`

---

## Files Changed

| File | Action |
|------|--------|
| `src/hooks/useHabits.js` | Create |
| `src/hooks/useChatHistory.js` | Create |
| `src/components/HabitsDrawer.jsx` | Create |
| `src/components/ChatSection.jsx` | Create |
| `src/components/DesktopApp.jsx` | Modify — TodayTab replaces FeedTab |
| `src/App.jsx` | Modify — wire useHabits, ChatSection, HabitsDrawer |
