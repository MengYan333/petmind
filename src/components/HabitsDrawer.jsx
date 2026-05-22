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
