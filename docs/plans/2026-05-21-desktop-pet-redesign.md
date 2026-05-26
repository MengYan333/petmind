# Desktop Pet Redesign — QQ Pet Style

> Date: 2026-05-21
> Status: Approved

## Goal

Replace the current bordered card UI with a frameless, transparent floating cat that walks along the taskbar — inspired by QQ Pet. No visible window frame, no panel. The cat is the only visible element.

---

## Electron Window Changes

| Property | Old | New |
|---|---|---|
| Width | 170 / 290 px | Full screen width |
| Height | 210 / 500 px | 160 px |
| Position | Bottom-right corner | `x=0, y=workAreaHeight-160` |
| Mouse | Normal | `setIgnoreMouseEvents(true, { forward: true })` default |

- Collapse/expand concept removed entirely.
- IPC channels added: `set-mouse-ignore(bool)` for renderer to toggle click-through.
- Window is repositioned on `ready` using `screen.getPrimaryDisplay().workAreaSize`.

---

## SVG Cat Component (`CatSVG.jsx`)

A single inline SVG (~70×90px) with these layers (bottom to top):

1. **Tail** — curved `<path>`, swish animation (`rotate` ±20°)
2. **Body** — rounded `<rect>`, slight y-bob when walking
3. **Legs** — 4 small `<rect>` elements; front pair and back pair alternate phase during walk
4. **Head** — `<circle>`
5. **Ears** — 2 triangular `<path>` elements
6. **Face** — eyes (`<circle>`), nose (`<ellipse>`), mouth (`<path>`), whiskers (`<line>`)

**Color system**: a single `baseColor` prop drives fill; derived lighter/darker shades used for body, belly, face details.

| Pet State | Base Color |
|---|---|
| normal | #f97316 (orange) |
| thirsty | #f97316 |
| sleepy | #818cf8 (indigo) |
| exercise | #22c55e (green) |
| rainy | #38bdf8 (sky) |
| hot | #ef4444 (red) |
| learning | #facc15 (yellow) |
| news | #34d399 (emerald) |
| happy | #f472b6 (pink) |

**Facing direction**: `scaleX(-1)` when walking left, `scaleX(1)` when walking right.

---

## Walk Behavior (`useCatWalk.js` hook)

State machine with 4 modes:

```
idle ──(timer)──→ walking ──(arrived)──→ sitting
  ↑                                         |
  └──────────────────────────────────────(timer)
                          ↑
                    peeking (at screen edge)
```

| Mode | Condition | Duration |
|---|---|---|
| `sitting` | Default on mount; after arriving | 4–10s random |
| `walking` | After sit timer fires | Until `catX` reaches `targetX` |
| `peeking` | `targetX < 30` or `targetX > screenW-50` | Until next walk cycle |

Walk speed: ~80px/s. Target X chosen randomly from `[30, screenW-50]`, with 15% chance of choosing an edge (peek).

Framer Motion `animate` on the cat group drives `x` position with `type: 'tween', ease: 'linear'`.

---

## State Animations (overlaid on walk behavior)

| Pet State | Animation |
|---|---|
| normal / thirsty / rainy / news | Default walk/sit |
| sleepy | Cat lies flat; ZZZ floats above |
| exercise | Rapid x-shake while sitting |
| hot | Rotation wobble + red tint |
| learning | Book accessory bobs above head |
| happy | Vertical bounce (y: [0,-20,0]) |

---

## Hover Dialog (`CatPopup.jsx`)

Triggered by `onMouseEnter` on the cat SVG group. Mouse interactivity toggled via IPC:

- `onMouseEnter` cat → IPC `set-mouse-ignore(false)` → window captures mouse events
- `onMouseLeave` popup → IPC `set-mouse-ignore(true)` → click-through restored

Popup layout (positioned above cat head, centered):

```
╔══════════════════════╗
║ 💬 [agent message]   ║  ← hidden when empty
╠══════════════════════╣
║ 🍎  💧  ✨  🎮       ║  ← nurture buttons
╠══════════════════════╣
║    ↺ 触发 Agent      ║
╚══════════════════════╝
```

- Framer Motion: `initial={{ opacity:0, y:8 }}` → `animate={{ opacity:1, y:0 }}`
- Width: 200px, positioned so it doesn't go off-screen
- Background: `rgba(13,13,26,0.92)` with `backdrop-filter: blur(12px)`, purple border

---

## File Changes

| File | Action |
|---|---|
| `electron/main.cjs` | Resize window to full-width strip; add `set-mouse-ignore` IPC; add `get-screen-size` IPC |
| `electron/preload.cjs` | Expose `setMouseIgnore(bool)` and `getScreenSize()` |
| `src/components/CatSVG.jsx` | New — full-body SVG cat with color + animation props |
| `src/components/CatPopup.jsx` | New — hover dialog with message, nurture, agent trigger |
| `src/hooks/useCatWalk.js` | New — walk state machine returning `{ catX, walkMode, facing }` |
| `src/components/DesktopApp.jsx` | Rewrite — remove card UI, compose CatSVG + CatPopup + useCatWalk |
| `src/components/Pet.jsx` | Keep for web version (unchanged) |
