# PetMind 功能优化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 补全 PetMind 所有 MVP 功能项，修复已知缺陷，添加新闻摘要和完整养成系统。

**Architecture:** 在现有 React + Vite SPA 基础上分层扩展：修复层（Bug fixes）→ 增强层（Feature improvements）→ 新功能层（News + Growth system）。所有用户数据持久化到 localStorage，不引入后端。新闻摘要通过 Claude API 模拟生成（规避 NewsAPI CORS 问题）。

**Tech Stack:** React 19, Vite, Tailwind CSS v3, Framer Motion, Anthropic JS SDK, localStorage

---

## 当前状态速查

| 功能 | 文件 | 状态 |
|------|------|------|
| 宠物9种状态 + 动画 | `src/components/Pet.jsx` | ✅ 基础完成，动画可增强 |
| 天气感知 | `src/hooks/useWeather.js` | ✅ 完成，hot 状态图标错误 |
| 屏幕时长检测 | `src/hooks/useScreenTime.js` | ⚠️ 仅监听 visibility，无鼠标活动检测 |
| Agent 决策 + 日志 | `src/services/claudeAgent.js` | ✅ 完成 |
| 学习摘要 | `src/services/claudeAgent.js` | ⚠️ 无每日持久化，重复调用 |
| 新闻摘要 | - | ❌ 未实现 |
| 养成系统 | `src/components/NurtureMenu.jsx` | ⚠️ 基础 stats，无阶段/解锁 |

---

## Task 1: 修复 hot 状态图标 + 增强宠物动画

**Files:**
- Modify: `src/components/Pet.jsx`

**目标：**
- 将 `hot` 状态 accessory 从 🌡️ 改为 🪭（扇扇子）
- `thirsty` 增加颜色变暗 + 微颤动效果（更有失水感）
- `sleepy` 增加从大到小的呼吸式动画（昏昏欲睡的懒散感）
- `exercise` 增加从慢到快的频率渐变（急迫感）

**Step 1: 修改 Pet.jsx**

替换 `hot` 的 accessory：
```js
hot: { emoji: '🐱', label: '好热', glow: '#ef4444', accessory: '🪭' },
```

增强动画配置（完整替换 ANIMATIONS 对象）：
```js
const ANIMATIONS = {
  normal:   { y: [0, -8, 0],                         transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } },
  thirsty:  { scale: [1, 0.93, 1], rotate: [-2, 2, -2], transition: { duration: 1.2, repeat: Infinity } },
  sleepy:   { scale: [1, 0.97, 1], y: [0, 3, 0],     transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } },
  exercise: { x: [-6, 6, -6],                         transition: { duration: 0.35, repeat: Infinity } },
  hot:      { rotate: [-8, 8, -8],                    transition: { duration: 0.5, repeat: Infinity } },
  happy:    { y: [0, -14, 0],                         transition: { duration: 0.6, repeat: Infinity } },
  rainy:    { y: [0, -4, 0],                          transition: { duration: 3, repeat: Infinity } },
};
```

**Step 2: 视觉验证**

运行 `npm run dev`，确认：
- hot 状态宠物身旁有扇子 🪭，并左右摇摆
- thirsty 宠物有轻微颤抖 + 缩放
- sleepy 宠物有慵懒的呼吸起伏
- exercise 宠物快速左右抖动

**Step 3: Commit**

```bash
git add src/components/Pet.jsx
git commit -m "fix: hot state uses fan emoji, enhance state animations"
```

---

## Task 2: 屏幕活跃时长检测优化

**Files:**
- Modify: `src/hooks/useScreenTime.js`

**目标：** 基于鼠标/键盘最后活动时间判断"真实活跃"。若超过 5 分钟无任何操作，暂停计时。

**Step 1: 重写 useScreenTime.js**

```js
import { useState, useEffect, useRef } from 'react';

export function useScreenTime() {
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const startRef = useRef(Date.now());
  const lastActivityRef = useRef(Date.now());
  const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 min idle = pause

  useEffect(() => {
    // Track last user activity
    const onActivity = () => { lastActivityRef.current = Date.now(); };
    document.addEventListener('mousemove', onActivity);
    document.addEventListener('keydown', onActivity);
    document.addEventListener('click', onActivity);

    const handleVisibility = () => {
      if (document.hidden) {
        startRef.current = null;
      } else {
        startRef.current = Date.now();
        lastActivityRef.current = Date.now();
        setSessionMinutes(0);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const interval = setInterval(() => {
      if (document.hidden || !startRef.current) return;
      const idleSince = Date.now() - lastActivityRef.current;
      if (idleSince > IDLE_THRESHOLD) return; // user is idle, don't count
      setSessionMinutes(Math.floor((Date.now() - startRef.current) / 60000));
    }, 15000); // check every 15s

    return () => {
      document.removeEventListener('mousemove', onActivity);
      document.removeEventListener('keydown', onActivity);
      document.removeEventListener('click', onActivity);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, []);

  return sessionMinutes;
}
```

**Step 2: 验证**

在 `src/App.jsx` 的 sensor bar 中，`⏱ 使用 {sensors.screenMinutes}分钟` 应在5分钟静止后停止增加。

**Step 3: Commit**

```bash
git add src/hooks/useScreenTime.js
git commit -m "feat: screen time pauses after 5min idle (mouse/keyboard tracking)"
```

---

## Task 3: 学习摘要每日一次持久化

**Files:**
- Create: `src/hooks/useLearningCache.js`
- Modify: `src/services/claudeAgent.js`

**目标：** 每日只向 Claude API 请求一次学习摘要，结果缓存在 localStorage，Agent 优先使用缓存。

**Step 1: 创建 useLearningCache.js**

```js
const CACHE_KEY = 'petmind_learning_cache';

export function getLearningCache(topic) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const today = new Date().toDateString();
    if (cache.date === today && cache.topic === topic) {
      return cache.summary;
    }
    return null;
  } catch {
    return null;
  }
}

export function setLearningCache(topic, summary) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      date: new Date().toDateString(),
      topic,
      summary,
    }));
  } catch {}
}
```

**Step 2: 修改 claudeAgent.js 中 fetch_learning_summary 的处理逻辑**

在 `claudeAgent.js` 顶部添加导入：
```js
import { getLearningCache, setLearningCache } from '../hooks/useLearningCache';
```

将 `fetch_learning_summary` 的处理块改为：
```js
} else if (toolUse.name === 'fetch_learning_summary') {
  const cached = getLearningCache(toolUse.input.topic);
  if (cached) {
    learningSummary = cached;
    onLog({ type: 'tool', text: `📚 使用今日缓存摘要 (${cached.length}字)` });
    result = { summary: cached };
  } else {
    const summaryRes = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `用3句话总结今天"${toolUse.input.topic}"领域最新进展，每句话不超过30字，面向普通用户。`,
      }],
    });
    learningSummary = summaryRes.content[0].text;
    setLearningCache(toolUse.input.topic, learningSummary);
    onLog({ type: 'tool', text: `📚 摘要生成并缓存 (${learningSummary.length}字)` });
    result = { summary: learningSummary };
  }
}
```

**Step 3: 验证**

触发 Agent 两次：第一次日志显示"摘要生成并缓存"，第二次显示"使用今日缓存摘要"，且不额外消耗 API 调用。

**Step 4: Commit**

```bash
git add src/hooks/useLearningCache.js src/services/claudeAgent.js
git commit -m "feat: cache learning summary per-day in localStorage"
```

---

## Task 4: 新闻摘要功能

**Files:**
- Modify: `src/services/claudeAgent.js`
- Create: `src/hooks/useNewsCache.js`

**目标：** 添加 `fetch_news_summary` 工具；早晨 8-10 点触发 news 状态；每日只调用一次，结果缓存。

**Step 1: 创建 useNewsCache.js**

```js
const NEWS_KEY = 'petmind_news_cache';

export function getNewsCache() {
  try {
    const raw = localStorage.getItem(NEWS_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const today = new Date().toDateString();
    return cache.date === today ? cache.headlines : null;
  } catch {
    return null;
  }
}

export function setNewsCache(headlines) {
  try {
    localStorage.setItem(NEWS_KEY, JSON.stringify({
      date: new Date().toDateString(),
      headlines,
    }));
  } catch {}
}
```

**Step 2: 在 claudeAgent.js 的 TOOLS 数组末尾添加新工具**

```js
{
  name: 'fetch_news_summary',
  description: "Generate a brief summary of today's top news in 3 bullet points, in Chinese.",
  input_schema: {
    type: 'object',
    properties: {
      categories: {
        type: 'array',
        items: { type: 'string' },
        description: '新闻分类，如 ["科技", "国际", "社会"]',
      },
    },
    required: ['categories'],
  },
},
```

**Step 3: 在 claudeAgent.js 顶部添加 news 缓存导入**

```js
import { getNewsCache, setNewsCache } from '../hooks/useNewsCache';
```

**Step 4: 在 contextPrompt 中添加早晨新闻触发规则**

在现有优先级规则之前（第1条之前）插入：
```
0. 早晨（8-10点）且今日新闻未读 → 先 fetch_news_summary，再 set_pet_state news
```

修改 contextPrompt 变量，在优先级规则第1条前加上：
```
0. 早晨8-10点（hour >= 8 && hour < 10）→ 先 fetch_news_summary，再 set_pet_state news
```

同时更新 `runAgent` 函数签名，从 `userPrefs` 读取 `newsCategories`：
```js
const newsCategories = userPrefs.newsCategories || ['科技', '国际', '社会'];
```

在 contextPrompt 中加入：
```
- 用户新闻偏好：${newsCategories.join('、')}
```

**Step 5: 在工具处理 loop 中添加 fetch_news_summary 处理**

```js
} else if (toolUse.name === 'fetch_news_summary') {
  const cached = getNewsCache();
  if (cached) {
    newsHeadlines = cached;
    onLog({ type: 'tool', text: `📰 使用今日缓存新闻 (${cached.length}字)` });
    result = { headlines: cached };
  } else {
    const cats = (toolUse.input.categories || ['科技', '国际', '社会']).join('、');
    const newsRes = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `请模拟今天（${new Date().toLocaleDateString('zh-CN')}）${cats}领域的3条重要新闻，每条一句话不超过30字，用"•"开头。不要说明这是模拟。`,
      }],
    });
    newsHeadlines = newsRes.content[0].text;
    setNewsCache(newsHeadlines);
    onLog({ type: 'tool', text: `📰 新闻摘要生成并缓存 (${newsHeadlines.length}字)` });
    result = { headlines: newsHeadlines };
  }
}
```

在 `runAgent` 函数顶部（`let petDecision = null;` 下方）添加：
```js
let newsHeadlines = null;
```

在 return 语句改为：
```js
return { petDecision, learningSummary, newsHeadlines };
```

**Step 6: 在 App.jsx 中处理 newsHeadlines**

在 `WebApp` 组件中添加 state：
```js
const [newsHeadlines, setNewsHeadlines] = useState('');
```

在 `triggerAgent` 的 try 块：
```js
const { petDecision, learningSummary: summary, newsHeadlines: news } = await runAgent(...);
if (news) setNewsHeadlines(news);
```

将 `newsHeadlines` 传给 `HabitCard`（添加 `newsHeadlines` prop），在 `learningSummary` 之后展示新闻块（绿色主题替换黄色）。

**Step 7: 修改 HabitCard 支持 newsHeadlines**

在 `HabitCard.jsx` 的 `learningSummary` 展示块之后添加：
```jsx
{newsHeadlines && (
  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-3 text-xs text-white/70 leading-relaxed whitespace-pre-line">
    {newsHeadlines}
  </div>
)}
```

同时在 props 解构中加上 `newsHeadlines`。

**Step 8: 同步更新 DesktopApp.jsx**

类似地，在 `DesktopApp.jsx` 中：
- 添加 `newsHeadlines` state
- `triggerAgent` 中处理 `news`
- 在展开面板的 `learningSummary` 块后面添加新闻展示块（绿色主题）

**Step 9: 验证**

临时将 contextPrompt 的时间条件改为 `hour >= 0`（任意时间触发新闻），触发 Agent 验证新闻显示正常，然后改回 `hour >= 8 && hour < 10`。

**Step 10: Commit**

```bash
git add src/services/claudeAgent.js src/hooks/useNewsCache.js src/components/HabitCard.jsx src/components/DesktopApp.jsx src/App.jsx
git commit -m "feat: add daily news summary (morning 8-10am, Claude-generated, cached)"
```

---

## Task 5: 完整养成系统

**Files:**
- Create: `src/hooks/useGrowthSystem.js`
- Create: `src/components/GrowthPanel.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Pet.jsx`
- Modify: `src/components/DesktopApp.jsx`

**目标：**
- 4阶段成长（蛋→幼崽→成长期→成年期），基于7日习惯完成率
- 习惯完成历史持久化到 localStorage
- 每小时饱食度 -3、心情 -1（自然衰减）
- 成就解锁系统（连续7天、阅读30条摘要等）
- GrowthPanel 展示成长进度 + 已解锁成就

**Step 1: 创建 useGrowthSystem.js**

```js
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'petmind_growth';

const STAGES = [
  { id: 'egg',    label: '🥚 蛋',   emoji: '🥚', threshold: 0   },
  { id: 'chick',  label: '🐣 幼崽', emoji: '🐣', threshold: 30  },
  { id: 'kitten', label: '🐱 成长', emoji: '🐱', threshold: 60  },
  { id: 'cat',    label: '😺 成年', emoji: '😺', threshold: 85  },
];

const ACHIEVEMENTS = [
  { id: 'streak7',   label: '连续7天',   emoji: '🔥', condition: (data) => data.currentStreak >= 7 },
  { id: 'reads30',   label: '阅读30篇',  emoji: '📖', condition: (data) => (data.learnReads || 0) >= 30 },
  { id: 'rain_once', label: '雨天互动',  emoji: '🌈', condition: (data) => data.rainInteraction },
  { id: 'nurture20', label: '互动20次',  emoji: '💝', condition: (data) => (data.nurtureCount || 0) >= 20 },
];

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function useGrowthSystem() {
  const [data, setData] = useState(loadData);
  const [stats, setStats] = useState(() => {
    const d = loadData();
    return { hunger: d.hunger ?? 70, mood: d.mood ?? 80 };
  });

  // Persist stats changes
  useEffect(() => {
    setData(prev => {
      const next = { ...prev, hunger: stats.hunger, mood: stats.mood };
      saveData(next);
      return next;
    });
  }, [stats]);

  // Stats decay: hunger -3/hr, mood -1/hr
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(s => ({
        hunger: Math.max(0, s.hunger - 1),
        mood:   Math.max(0, s.mood - 0.3),
      }));
    }, 20 * 60 * 1000); // every 20min: -3/hr hunger, ~-1/hr mood
    return () => clearInterval(interval);
  }, []);

  // Compute 7-day completion rate
  const completionRate = useCallback(() => {
    const history = data.habitHistory || [];
    const last7 = history.slice(-7);
    if (last7.length === 0) return 0;
    const done = last7.filter(d => d.completed).length;
    return Math.round((done / 7) * 100);
  }, [data]);

  // Current growth stage
  const stage = STAGES.slice().reverse().find(s => completionRate() >= s.threshold) || STAGES[0];

  // Unlocked achievements
  const unlockedAchievements = ACHIEVEMENTS.filter(a => a.condition(data));

  // Record habit completion (called from App)
  const recordHabitDone = useCallback(() => {
    setData(prev => {
      const today = new Date().toDateString();
      const history = prev.habitHistory || [];
      // Avoid duplicate entries for same day
      const withoutToday = history.filter(h => h.date !== today);
      const next = {
        ...prev,
        habitHistory: [...withoutToday, { date: today, completed: true }],
        currentStreak: (prev.currentStreak || 0) + 1,
        lastDoneDate: today,
      };
      saveData(next);
      return next;
    });
    setStats(s => ({ ...s, mood: Math.min(100, s.mood + 10) }));
  }, []);

  const recordNurture = useCallback(() => {
    setData(prev => {
      const next = { ...prev, nurtureCount: (prev.nurtureCount || 0) + 1 };
      saveData(next);
      return next;
    });
  }, []);

  const recordLearnRead = useCallback(() => {
    setData(prev => {
      const next = { ...prev, learnReads: (prev.learnReads || 0) + 1 };
      saveData(next);
      return next;
    });
  }, []);

  const recordRainInteraction = useCallback(() => {
    setData(prev => {
      const next = { ...prev, rainInteraction: true };
      saveData(next);
      return next;
    });
  }, []);

  const nurture = useCallback((action) => {
    setStats(prev => {
      const next = { ...prev };
      if (action.effect === 'hunger') next.hunger = Math.min(100, prev.hunger + action.delta);
      if (action.effect === 'mood' || action.effect === 'happy') next.mood = Math.min(100, prev.mood + action.delta);
      return next;
    });
    recordNurture();
  }, [recordNurture]);

  return {
    stats,
    stage,
    completionRate: completionRate(),
    unlockedAchievements,
    data,
    nurture,
    recordHabitDone,
    recordLearnRead,
    recordRainInteraction,
  };
}
```

**Step 2: 创建 GrowthPanel.jsx**

```jsx
import { motion } from 'framer-motion';

const STAGES = [
  { id: 'egg',    label: '🥚 蛋',   threshold: 0  },
  { id: 'chick',  label: '🐣 幼崽', threshold: 30 },
  { id: 'kitten', label: '🐱 成长', threshold: 60 },
  { id: 'cat',    label: '😺 成年', threshold: 85 },
];

export default function GrowthPanel({ stage, completionRate, unlockedAchievements }) {
  return (
    <div className="w-full max-w-sm mt-4 bg-white/5 border border-white/10 rounded-2xl p-4">
      {/* Stage progress */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-white/50">成长阶段</span>
        <span className="text-sm font-medium text-purple-300">{stage.label}</span>
      </div>

      {/* Stage steps */}
      <div className="flex items-center gap-1 mb-4">
        {STAGES.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all ${
              completionRate >= s.threshold ? 'bg-purple-500/40 border border-purple-400' : 'bg-white/10 border border-white/20'
            }`}>
              {s.label.split(' ')[0]}
            </div>
            {i < STAGES.length - 1 && (
              <div className="flex-1 h-0.5 bg-white/10">
                <motion.div
                  animate={{ width: completionRate >= STAGES[i + 1].threshold ? '100%' : '0%' }}
                  className="h-full bg-purple-500/60"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Completion rate bar */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-white/40 w-16">7日完成率</span>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${completionRate}%` }}
            transition={{ duration: 0.6 }}
            className="h-full bg-purple-400 rounded-full"
          />
        </div>
        <span className="text-xs text-purple-300 w-8 text-right">{completionRate}%</span>
      </div>

      {/* Achievements */}
      {unlockedAchievements.length > 0 && (
        <div>
          <p className="text-xs text-white/40 mb-2">已解锁成就</p>
          <div className="flex flex-wrap gap-2">
            {unlockedAchievements.map(a => (
              <motion.div
                key={a.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-xs text-yellow-300"
              >
                {a.emoji} {a.label}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: 修改 App.jsx，接入 useGrowthSystem**

替换现有的 `stats` state 和 `handleNurture` 函数：

```jsx
import { useGrowthSystem } from './hooks/useGrowthSystem';
import GrowthPanel from './components/GrowthPanel';

// 在 WebApp 组件内，替换 stats/handleNurture 相关代码：
const {
  stats, stage, completionRate, unlockedAchievements,
  nurture, recordHabitDone, recordLearnRead, recordRainInteraction,
} = useGrowthSystem();

// handleAction 中，当用户点击完成习惯时：
function handleAction(action) {
  if (action.includes('喝水') || action.includes('做') || action.includes('去')) {
    setPetState('happy');
    setMessage('太棒了！你最棒！');
    setActions([]);
    recordHabitDone();
    if (petState === 'rainy') recordRainInteraction();
  } else {
    setPetState('normal');
    setMessage('');
    setActions([]);
  }
}

// triggerAgent 中，当收到 learningSummary 时：
if (summary) {
  setLearningSummary(summary);
  recordLearnRead();
}

// handleNurture 改为：
function handleNurture(action) {
  const prevState = petState;
  nurture(action);
  setPetState('happy');
  setTimeout(() => setPetState(prevState), 1500);
}
```

在 JSX 中，在 NurtureMenu 下方添加 GrowthPanel：
```jsx
<GrowthPanel
  stage={stage}
  completionRate={completionRate}
  unlockedAchievements={unlockedAchievements}
/>
```

删除旧的 `const [stats, setStats] = useState(...)` 和相关 `handleNurture` 逻辑（由 useGrowthSystem 接管）。

**Step 4: 修改 NurtureMenu.jsx，接受外部 stats**

NurtureMenu 的 `stats` prop 接口不变（已经从外部传入），只需确认 `onAction` 接收到 `action` 对象即可（当前实现正确）。

**Step 5: 验证**

1. 进行喂食/梳毛/玩耍，确认 stats 条变化且重刷后不重置
2. 点击"好，我去喝水"，确认习惯完成被记录
3. 连续完成 7 次（可临时修改 streak 判断为 1 次调试），确认 🔥 成就出现
4. 确认页面刷新后 hunger/mood 数值保持

**Step 6: Commit**

```bash
git add src/hooks/useGrowthSystem.js src/components/GrowthPanel.jsx src/App.jsx src/components/NurtureMenu.jsx
git commit -m "feat: full growth system (4 stages, achievements, stats decay, localStorage)"
```

---

## Task 6: 同步更新 project_status.md

**Files:**
- Create/Modify: `project_status.md`

**Step 1: 创建 project_status.md**

在项目根目录创建，内容见下方 project_status.md 格式。

**Step 2: Commit**

```bash
git add project_status.md
git commit -m "docs: update project_status with completed features"
```

---

## MVP Checklist（最终状态）

- [x] Pet 9种动画状态（normal/thirsty/sleepy/exercise/rainy/hot/learning/news/happy）
- [x] hot 状态扇扇子 🪭，rainy 状态打伞 ☂️
- [x] 屏幕活跃时长（鼠标+键盘活动检测，5分钟空闲暂停）
- [x] 深夜 → sleepy；连续60分钟 → exercise
- [x] Claude function calling + AgentLog 可视化工具调用
- [x] 多信号优先级推理可见
- [x] 学习摘要（每日一次，localStorage 缓存）
- [x] 新闻摘要（早晨8-10点，Claude生成，每日缓存）
- [x] 4阶段养成系统（蛋→幼崽→成长→成年）
- [x] 成就解锁系统（4种成就）
- [x] Stats 自然衰减（hunger/mood 随时间降低）
- [x] 所有用户数据 localStorage 持久化
