import { motion } from 'framer-motion';

import stickerWave from '../assets/cat/wave.png';
import stickerLaptop from '../assets/cat/laptop.png';
import poseThink from '../assets/cat/think.png';
import poseSleep from '../assets/cat/sleep.png';
import poseStretch from '../assets/cat/stretch.png';
import poseNews from '../assets/cat/news.png';
import poseLearning from '../assets/cat/learning.png';

const STATE_ART = {
  normal: {
    src: stickerWave,
    glow: 'rgba(116, 196, 190, 0.42)',
    shadow: 'rgba(18, 36, 38, 0.26)',
    aura: 'radial-gradient(circle at 50% 35%, rgba(170, 235, 228, 0.4), rgba(170, 235, 228, 0.08) 48%, transparent 72%)',
  },
  working: {
    src: stickerLaptop,
    glow: 'rgba(113, 195, 215, 0.42)',
    shadow: 'rgba(16, 28, 39, 0.28)',
    aura: 'radial-gradient(circle at 50% 35%, rgba(155, 221, 235, 0.38), rgba(155, 221, 235, 0.08) 48%, transparent 72%)',
  },
  thirsty: {
    src: poseThink,
    glow: 'rgba(143, 201, 201, 0.34)',
    shadow: 'rgba(38, 48, 54, 0.24)',
    aura: 'radial-gradient(circle at 50% 35%, rgba(186, 235, 228, 0.3), rgba(186, 235, 228, 0.08) 48%, transparent 72%)',
  },
  sleepy: {
    src: poseSleep,
    glow: 'rgba(150, 170, 222, 0.36)',
    shadow: 'rgba(31, 36, 56, 0.25)',
    aura: 'radial-gradient(circle at 50% 35%, rgba(194, 201, 246, 0.34), rgba(194, 201, 246, 0.08) 48%, transparent 72%)',
  },
  exercise: {
    src: poseStretch,
    glow: 'rgba(131, 225, 189, 0.38)',
    shadow: 'rgba(18, 40, 33, 0.24)',
    aura: 'radial-gradient(circle at 50% 35%, rgba(179, 244, 222, 0.36), rgba(179, 244, 222, 0.08) 48%, transparent 72%)',
  },
  news: {
    src: poseNews,
    glow: 'rgba(125, 214, 196, 0.4)',
    shadow: 'rgba(24, 40, 37, 0.26)',
    aura: 'radial-gradient(circle at 50% 35%, rgba(181, 243, 226, 0.38), rgba(181, 243, 226, 0.08) 48%, transparent 72%)',
  },
  learning: {
    src: poseLearning,
    glow: 'rgba(236, 214, 136, 0.34)',
    shadow: 'rgba(45, 39, 22, 0.24)',
    aura: 'radial-gradient(circle at 50% 35%, rgba(248, 234, 169, 0.34), rgba(248, 234, 169, 0.08) 48%, transparent 72%)',
  },
  happy: {
    src: stickerWave,
    glow: 'rgba(252, 182, 206, 0.36)',
    shadow: 'rgba(52, 29, 37, 0.24)',
    aura: 'radial-gradient(circle at 50% 35%, rgba(253, 214, 227, 0.34), rgba(253, 214, 227, 0.08) 48%, transparent 72%)',
  },
};

const ANIMATIONS = {
  normal: {
    y: [0, -5, 0],
    rotate: [0, -1.5, 0.8, 0],
    transition: { duration: 4.4, repeat: Infinity, ease: 'easeInOut' },
  },
  working: {
    y: [0, -3, 0],
    rotate: [0, -0.8, 0.8, 0],
    transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
  },
  thirsty: {
    y: [0, 2, 0],
    rotate: [0, -2, 2, 0],
    transition: { duration: 2.3, repeat: Infinity, ease: 'easeInOut' },
  },
  sleepy: {
    y: [0, 4, 0],
    rotate: [0, -3, -1, 0],
    transition: { duration: 5.2, repeat: Infinity, ease: 'easeInOut' },
  },
  exercise: {
    scale: [1, 1.03, 1],
    y: [0, -7, 0],
    transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' },
  },
  news: {
    y: [0, -4, 0],
    x: [0, 1.5, -1.5, 0],
    rotate: [0, -1.8, 1.8, 0],
    transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
  },
  learning: {
    y: [0, -4, 0],
    rotate: [0, -0.6, 0.8, 0],
    scale: [1, 1.02, 1],
    transition: { duration: 3.8, repeat: Infinity, ease: 'easeInOut' },
  },
  happy: {
    y: [0, -8, 0],
    scale: [1, 1.05, 1],
    rotate: [0, -2, 2, 0],
    transition: { duration: 1.2, repeat: Infinity, ease: 'easeOut' },
  },
};

const STATE_DECOR = {
  working: [
    { text: '···', left: 42, top: 46, color: 'rgba(155, 221, 235, 0.9)', delay: 0 },
  ],
  thirsty: [
    { text: '💧', right: 42, top: 34, color: 'rgba(146, 210, 230, 0.95)', delay: 0 },
    { text: '﹏', left: 40, top: 88, color: 'rgba(146, 210, 230, 0.75)', delay: 0.3 },
  ],
  sleepy: [
    { text: 'z', right: 52, top: 44, color: 'rgba(194, 201, 246, 0.95)', delay: 0 },
    { text: 'z', right: 68, top: 62, color: 'rgba(194, 201, 246, 0.8)', delay: 0.25 },
  ],
  exercise: [
    { text: '✦', left: 38, top: 138, color: 'rgba(179, 244, 222, 0.9)', delay: 0 },
    { text: '✦', right: 36, top: 138, color: 'rgba(179, 244, 222, 0.9)', delay: 0.18 },
  ],
  news: [
    { text: '✦', left: 34, top: 70, color: 'rgba(181, 243, 226, 0.9)', delay: 0 },
    { text: '•', right: 36, top: 52, color: 'rgba(181, 243, 226, 0.95)', delay: 0.2 },
  ],
  learning: [
    { text: '✦', left: 44, top: 42, color: 'rgba(248, 234, 169, 0.95)', delay: 0 },
    { text: '+', right: 42, top: 96, color: 'rgba(248, 234, 169, 0.82)', delay: 0.25 },
  ],
  happy: [
    { text: '♡', left: 40, top: 44, color: 'rgba(253, 214, 227, 0.98)', delay: 0 },
    { text: '♡', right: 34, top: 58, color: 'rgba(253, 214, 227, 0.82)', delay: 0.2 },
  ],
};

function StateDecor({ state }) {
  const items = STATE_DECOR[state];
  if (!items?.length) return null;

  return items.map((item, index) => (
    <motion.div
      key={`${state}-${index}`}
      aria-hidden
      animate={{
        y: [0, -5, 0],
        opacity: [0.5, 1, 0.5],
        scale: [0.96, 1.06, 0.96],
      }}
      transition={{
        duration: 1.8,
        delay: item.delay || 0,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{
        position: 'absolute',
        left: item.left,
        right: item.right,
        top: item.top,
        color: item.color,
        fontSize: 18,
        fontWeight: 700,
        lineHeight: 1,
        pointerEvents: 'none',
        textShadow: '0 0 10px rgba(255,255,255,0.16)',
      }}
    >
      {item.text}
    </motion.div>
  ));
}

export default function CatSVG({ state = 'normal', isThinking = false }) {
  const art = STATE_ART[state] || STATE_ART.normal;
  const anim = ANIMATIONS[state] || ANIMATIONS.normal;

  return (
    <div
      style={{
        width: 170,
        height: 191,
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        overflow: 'visible',
      }}
    >
      <motion.div
        aria-hidden
        animate={{
          scale: [0.95, 1.02, 0.95],
          opacity: isThinking ? [0.3, 0.55, 0.3] : [0.22, 0.35, 0.22],
        }}
        transition={{ duration: isThinking ? 1.2 : 3.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: '8px 0 14px',
          background: art.aura,
          filter: 'blur(14px)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        aria-hidden
        animate={{
          scaleX: state === 'exercise' ? [1, 1.08, 1] : [1, 1.03, 1],
          opacity: state === 'sleepy' ? [0.18, 0.12, 0.18] : [0.2, 0.26, 0.2],
        }}
        transition={{ duration: state === 'exercise' ? 0.9 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: 10,
          width: 92,
          height: 16,
          borderRadius: '999px',
          background: art.shadow,
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      />

      <motion.img
        src={art.src}
        alt="PetMind cat"
        draggable={false}
        animate={anim}
        transition={anim.transition}
        style={{
          position: 'relative',
          width: 158,
          height: 178,
          objectFit: 'contain',
          userSelect: 'none',
          pointerEvents: 'none',
          filter: `drop-shadow(0 8px 20px ${art.glow})`,
        }}
      />

      <StateDecor state={state} />

      {isThinking && (
        <motion.div
          animate={{ y: [0, -4, 0], opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 26,
            height: 26,
            borderRadius: '999px',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(11, 18, 23, 0.72)',
            border: '1px solid rgba(170, 235, 228, 0.4)',
            boxShadow: '0 0 18px rgba(170, 235, 228, 0.24)',
            fontSize: 14,
            pointerEvents: 'none',
          }}
        >
          ✦
        </motion.div>
      )}
    </div>
  );
}
