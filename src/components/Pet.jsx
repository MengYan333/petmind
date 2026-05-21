import { motion } from 'framer-motion';

const PET_STATES = {
  normal:   { emoji: '🐱', label: '正常',    glow: '#a855f7' },
  thirsty:  { emoji: '😿', label: '干涸',    glow: '#f97316' },
  sleepy:   { emoji: '😴', label: '困倦',    glow: '#6366f1' },
  exercise: { emoji: '🙀', label: '需要运动', glow: '#22c55e' },
  rainy:    { emoji: '🐱', label: '下雨啦',  glow: '#38bdf8', accessory: '☂️' },
  hot:      { emoji: '🐱', label: '好热',    glow: '#ef4444', accessory: '🪭' },
  learning: { emoji: '🐱', label: '学习时间', glow: '#facc15', accessory: '📚' },
  news:     { emoji: '🐱', label: '新闻速递', glow: '#34d399', accessory: '📰' },
  happy:    { emoji: '😸', label: '开心',    glow: '#f472b6' },
};

const ANIMATIONS = {
  normal:   { y: [0, -8, 0],                            transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } },
  thirsty:  { scale: [1, 0.93, 1], rotate: [-2, 2, -2], transition: { duration: 1.2, repeat: Infinity } },
  sleepy:   { scale: [1, 0.97, 1], y: [0, 3, 0],        transition: { duration: 4,   repeat: Infinity, ease: 'easeInOut' } },
  exercise: { x: [-6, 6, -6],                            transition: { duration: 0.35, repeat: Infinity } },
  hot:      { rotate: [-8, 8, -8],                       transition: { duration: 0.5, repeat: Infinity } },
  happy:    { y: [0, -14, 0],                            transition: { duration: 0.6, repeat: Infinity } },
  rainy:    { y: [0, -4, 0],                             transition: { duration: 3,   repeat: Infinity } },
};

const SIZES = {
  sm: { ring: 'w-20 h-20', emoji: 'text-4xl', accessory: 'text-xl', shadow: '30px', label: 'text-xs mt-1' },
  md: { ring: 'w-44 h-44', emoji: 'text-8xl', accessory: 'text-4xl', shadow: '60px', label: 'text-xs mt-2' },
};

export default function Pet({ state = 'normal', onClick, size = 'md' }) {
  const config = PET_STATES[state] || PET_STATES.normal;
  const anim   = ANIMATIONS[state]  || ANIMATIONS.normal;
  const sz     = SIZES[size] || SIZES.md;

  return (
    <div className="flex flex-col items-center cursor-pointer" onClick={onClick}>
      <div
        className={`${sz.ring} rounded-full flex items-center justify-center relative`}
        style={{
          background: `radial-gradient(circle at 40% 35%, ${config.glow}33, #0d0d1a)`,
          boxShadow: `0 0 ${sz.shadow} ${config.glow}44`,
          border: `2px solid ${config.glow}44`,
        }}
      >
        <motion.div animate={anim} className={`${sz.emoji} select-none relative`}>
          {config.emoji}
          {config.accessory && (
            <span className={`absolute -top-1 -right-1 ${sz.accessory}`}>{config.accessory}</span>
          )}
        </motion.div>
      </div>
      <p className={`text-white/40 ${sz.label}`}>{config.label}</p>
    </div>
  );
}
