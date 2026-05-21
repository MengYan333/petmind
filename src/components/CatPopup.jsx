import { motion } from 'framer-motion';

const POPUP_WIDTH = 200;

const styles = {
  popup: {
    position: 'fixed',
    bottom: 168,
    width: POPUP_WIDTH,
    background: 'rgba(13,13,26,0.94)',
    border: '1px solid rgba(168,85,247,0.35)',
    borderRadius: 16,
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
    padding: '10px 10px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 1000,
  },
  message: {
    margin: 0,
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  nurtureRow: {
    display: 'flex',
    gap: 6,
    justifyContent: 'space-between',
  },
  nurtureBtn: {
    flex: 1,
    background: 'rgba(168,85,247,0.18)',
    border: '1px solid rgba(168,85,247,0.3)',
    borderRadius: 10,
    color: '#e2d9f3',
    fontSize: 11,
    padding: '5px 2px',
    cursor: 'pointer',
    textAlign: 'center',
    lineHeight: 1.3,
    transition: 'background 0.15s',
  },
  agentBtn: {
    width: '100%',
    background: 'rgba(168,85,247,0.28)',
    border: '1px solid rgba(168,85,247,0.5)',
    borderRadius: 10,
    color: '#e9d5ff',
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 0',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'background 0.15s, opacity 0.15s',
  },
  agentBtnDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
};

const NURTURE_BUTTONS = [
  { id: 'feed',  label: '🍎喂食' },
  { id: 'water', label: '💧喝水' },
  { id: 'groom', label: '✨梳毛' },
  { id: 'play',  label: '🎮玩耍' },
];

export default function CatPopup({ message, isThinking, onNurture, onTriggerAgent, catX, screenWidth }) {
  const left = Math.max(8, Math.min(catX + 35 - 100, screenWidth - 208));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      style={{ ...styles.popup, left }}
    >
      {message ? (
        <p style={styles.message}>💬 {message}</p>
      ) : null}

      <div style={styles.nurtureRow}>
        {NURTURE_BUTTONS.map(({ id, label }) => (
          <button
            key={id}
            style={styles.nurtureBtn}
            onClick={() => onNurture(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        style={{
          ...styles.agentBtn,
          ...(isThinking ? styles.agentBtnDisabled : {}),
        }}
        disabled={isThinking}
        onClick={onTriggerAgent}
      >
        {isThinking ? '⚙️ 思考中...' : '↺ 触发 Agent'}
      </button>
    </motion.div>
  );
}
