import { motion } from 'framer-motion'

// Helper: lighten a hex color by adding 80 to each RGB channel (capped at 255)
function lighten(hex) {
  const h = hex.replace('#', '')
  const r = Math.min(255, parseInt(h.slice(0, 2), 16) + 80)
  const g = Math.min(255, parseInt(h.slice(2, 4), 16) + 80)
  const b = Math.min(255, parseInt(h.slice(4, 6), 16) + 80)
  return `rgb(${r},${g},${b})`
}

// Animation constants (defined outside component to avoid recreation on render)
const TAIL_SWISH = {
  animate: { rotate: [0, 20, 0, -20, 0] },
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
}

const BODY_BOB = {
  animate: { y: [0, 2, 0, -2, 0] },
  transition: { duration: 0.4, repeat: Infinity, ease: 'linear' },
}

const LEG_WALK = {
  animate: { y: [0, -5, 0, 5, 0] },
  transition: { duration: 0.4, repeat: Infinity, ease: 'linear' },
}

const LEG_WALK_ALT = {
  animate: { y: [0, 5, 0, -5, 0] },
  transition: { duration: 0.4, repeat: Infinity, ease: 'linear' },
}

const BLINK = {
  animate: { scaleY: [1, 1, 1, 0.1, 1] },
  transition: {
    duration: 4,
    repeat: Infinity,
    times: [0, 0.85, 0.9, 0.95, 1],
  },
}

export default function CatSVG({
  color = '#f97316',
  walkMode = 'sitting',
  isThinking = false,
}) {
  const light = lighten(color)
  const isWalking = walkMode === 'walking'

  return (
    <svg
      viewBox="0 0 70 90"
      width={70}
      height={90}
      xmlns="http://www.w3.org/2000/svg"
      overflow="visible"
    >
      {/* Tail */}
      <motion.g
        animate={TAIL_SWISH.animate}
        transition={TAIL_SWISH.transition}
        style={{ originX: '50px', originY: '70px' }}
        transformOrigin="50 70"
      >
        <path
          d="M50 70 Q65 60 60 45"
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </motion.g>

      {/* Body group */}
      <motion.g
        animate={isWalking ? BODY_BOB.animate : undefined}
        transition={isWalking ? BODY_BOB.transition : undefined}
      >
        {/* Body rect */}
        <rect x={18} y={42} width={34} height={32} rx={12} fill={color} />

        {/* Belly ellipse */}
        <ellipse
          cx={35}
          cy={56}
          rx={10}
          ry={12}
          fill={light}
          opacity={0.5}
        />

        {/* Back legs */}
        <motion.rect
          x={20}
          y={68}
          width={8}
          height={16}
          rx={4}
          fill={color}
          animate={isWalking ? LEG_WALK.animate : undefined}
          transition={isWalking ? LEG_WALK.transition : undefined}
        />
        <motion.rect
          x={42}
          y={68}
          width={8}
          height={16}
          rx={4}
          fill={color}
          animate={isWalking ? LEG_WALK_ALT.animate : undefined}
          transition={isWalking ? LEG_WALK_ALT.transition : undefined}
        />

        {/* Front legs */}
        <motion.rect
          x={26}
          y={66}
          width={7}
          height={14}
          rx={4}
          fill={color}
          animate={isWalking ? LEG_WALK_ALT.animate : undefined}
          transition={isWalking ? LEG_WALK_ALT.transition : undefined}
        />
        <motion.rect
          x={37}
          y={66}
          width={7}
          height={14}
          rx={4}
          fill={color}
          animate={isWalking ? LEG_WALK.animate : undefined}
          transition={isWalking ? LEG_WALK.transition : undefined}
        />
      </motion.g>

      {/* Head */}
      <circle cx={35} cy={30} r={20} fill={color} />

      {/* Ears */}
      {/* Left outer ear */}
      <polygon points="14,18 20,4 28,18" fill={color} />
      {/* Right outer ear */}
      <polygon points="42,18 50,4 56,18" fill={color} />
      {/* Left inner ear */}
      <polygon points="16,17 20,7 27,17" fill={light} opacity={0.6} />
      {/* Right inner ear */}
      <polygon points="43,17 50,7 54,17" fill={light} opacity={0.6} />

      {/* Eyes */}
      {/* Left eye */}
      <motion.g
        animate={BLINK.animate}
        transition={BLINK.transition}
        style={{ transformOrigin: '27px 27px' }}
      >
        <ellipse cx={27} cy={27} rx={4} ry={4.5} fill="#1a1a2e" />
        <circle cx={29} cy={25} r={1.2} fill="white" />
      </motion.g>

      {/* Right eye */}
      <motion.g
        animate={BLINK.animate}
        transition={BLINK.transition}
        style={{ transformOrigin: '43px 27px' }}
      >
        <ellipse cx={43} cy={27} rx={4} ry={4.5} fill="#1a1a2e" />
        <circle cx={45} cy={25} r={1.2} fill="white" />
      </motion.g>

      {/* Nose */}
      <ellipse cx={35} cy={34} rx={2.5} ry={2} fill="#1a1a2e" opacity={0.7} />

      {/* Mouth */}
      <path
        d="M32 36 Q35 39 38 36"
        fill="none"
        stroke="#1a1a2e"
        strokeWidth={1.2}
        strokeLinecap="round"
      />

      {/* Whiskers left */}
      <line x1={12} y1={31} x2={27} y2={32} stroke="#1a1a2e" strokeWidth={0.8} opacity={0.5} />
      <line x1={12} y1={34} x2={27} y2={34} stroke="#1a1a2e" strokeWidth={0.8} opacity={0.5} />
      <line x1={12} y1={37} x2={27} y2={36} stroke="#1a1a2e" strokeWidth={0.8} opacity={0.5} />

      {/* Whiskers right */}
      <line x1={43} y1={32} x2={58} y2={31} stroke="#1a1a2e" strokeWidth={0.8} opacity={0.5} />
      <line x1={43} y1={34} x2={58} y2={34} stroke="#1a1a2e" strokeWidth={0.8} opacity={0.5} />
      <line x1={43} y1={36} x2={58} y2={37} stroke="#1a1a2e" strokeWidth={0.8} opacity={0.5} />

      {/* Thinking gear icon */}
      {isThinking && (
        <motion.text
          x={50}
          y={10}
          fontSize={14}
          textAnchor="middle"
          animate={{ opacity: [0.4, 1, 0.4], y: [10, 6, 10] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          ⚙️
        </motion.text>
      )}
    </svg>
  )
}
