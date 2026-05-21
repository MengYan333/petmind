import { motion } from 'framer-motion';

const STAGES = [
  { id: 'egg',    label: '🥚',  name: '蛋',   threshold: 0  },
  { id: 'chick',  label: '🐣',  name: '幼崽', threshold: 30 },
  { id: 'kitten', label: '🐱',  name: '成长', threshold: 60 },
  { id: 'cat',    label: '😺',  name: '成年', threshold: 85 },
];

export default function GrowthPanel({ stage, completionRate, unlockedAchievements }) {
  return (
    <div className="w-full max-w-sm mt-4 bg-white/5 border border-white/10 rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-white/40">成长阶段</span>
        <span className="text-sm font-medium text-purple-300">{stage.label}</span>
      </div>

      {/* Stage steps */}
      <div className="flex items-center mb-4">
        {STAGES.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-base border transition-all ${
              completionRate >= s.threshold
                ? 'bg-purple-500/40 border-purple-400'
                : 'bg-white/5 border-white/20'
            }`}>
              {s.label}
            </div>
            {i < STAGES.length - 1 && (
              <div className="flex-1 h-0.5 bg-white/10 mx-0.5">
                <motion.div
                  animate={{ width: completionRate >= STAGES[i + 1].threshold ? '100%' : '0%' }}
                  transition={{ duration: 0.6 }}
                  className="h-full bg-purple-500/60"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 7-day completion bar */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-white/40 w-16 shrink-0">7日完成率</span>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${completionRate}%` }}
            transition={{ duration: 0.6 }}
            className="h-full bg-purple-400 rounded-full"
          />
        </div>
        <span className="text-xs text-purple-300 w-8 text-right shrink-0">{completionRate}%</span>
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
