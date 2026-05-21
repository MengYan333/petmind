import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'petmind_growth';

const STAGES = [
  { id: 'egg',    label: '🥚 蛋',   threshold: 0  },
  { id: 'chick',  label: '🐣 幼崽', threshold: 30 },
  { id: 'kitten', label: '🐱 成长', threshold: 60 },
  { id: 'cat',    label: '😺 成年', threshold: 85 },
];

const ACHIEVEMENTS = [
  { id: 'streak7',   label: '连续7天',  emoji: '🔥', condition: (d) => (d.currentStreak || 0) >= 7  },
  { id: 'reads30',   label: '阅读30篇', emoji: '📖', condition: (d) => (d.learnReads || 0) >= 30   },
  { id: 'rain_once', label: '雨天互动', emoji: '🌈', condition: (d) => !!d.rainInteraction           },
  { id: 'nurture20', label: '互动20次', emoji: '💝', condition: (d) => (d.nurtureCount || 0) >= 20  },
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
  const [data, setData]   = useState(loadData);
  const [stats, setStats] = useState(() => {
    const d = loadData();
    return { hunger: d.hunger ?? 70, mood: d.mood ?? 80 };
  });

  // Persist stats to localStorage whenever they change
  useEffect(() => {
    setData(prev => {
      const next = { ...prev, hunger: stats.hunger, mood: stats.mood };
      saveData(next);
      return next;
    });
  }, [stats]);

  // Stats decay: ~3 hunger/hr, ~1 mood/hr (check every 20min)
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(s => ({
        hunger: Math.max(0, s.hunger - 1),
        mood:   Math.max(0, s.mood - 0.33),
      }));
    }, 20 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute 7-day completion rate
  const completionRate = useCallback(() => {
    const history = data.habitHistory || [];
    const last7 = history.slice(-7);
    if (last7.length === 0) return 0;
    const done = last7.filter(h => h.completed).length;
    return Math.round((done / 7) * 100);
  }, [data]);

  // Current stage (highest threshold that completionRate meets)
  const rate = completionRate();
  const stage = [...STAGES].reverse().find(s => rate >= s.threshold) || STAGES[0];

  // Unlocked achievements
  const unlockedAchievements = ACHIEVEMENTS.filter(a => a.condition(data));

  // Mutators
  const nurture = useCallback((action) => {
    setStats(prev => {
      const next = { ...prev };
      if (action.effect === 'hunger') next.hunger = Math.min(100, prev.hunger + action.delta);
      if (action.effect === 'mood' || action.effect === 'happy') next.mood = Math.min(100, prev.mood + action.delta);
      return next;
    });
    setData(prev => {
      const next = { ...prev, nurtureCount: (prev.nurtureCount || 0) + 1 };
      saveData(next);
      return next;
    });
  }, []);

  const recordHabitDone = useCallback(() => {
    const today = new Date().toDateString();
    setData(prev => {
      const history  = prev.habitHistory || [];
      const filtered = history.filter(h => h.date !== today);
      const streak   = (prev.lastDoneDate === new Date(Date.now() - 86400000).toDateString())
        ? (prev.currentStreak || 0) + 1
        : 1;
      const next = {
        ...prev,
        habitHistory:  [...filtered, { date: today, completed: true }],
        currentStreak: streak,
        lastDoneDate:  today,
      };
      saveData(next);
      return next;
    });
    setStats(s => ({ ...s, mood: Math.min(100, s.mood + 10) }));
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

  return {
    stats,
    stage,
    completionRate: rate,
    unlockedAchievements,
    nurture,
    recordHabitDone,
    recordLearnRead,
    recordRainInteraction,
  };
}
