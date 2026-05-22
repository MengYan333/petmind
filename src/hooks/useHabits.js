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
