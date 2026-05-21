import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CatSVG from './CatSVG';
import CatPopup from './CatPopup';
import { useCatWalk } from '../hooks/useCatWalk';
import { useSensors } from '../hooks/useSensors';
import { runAgent } from '../services/claudeAgent';
import { useGrowthSystem } from '../hooks/useGrowthSystem';

const DEFAULT_HABITS = [{ id: 'water', label: '喝水', intervalHours: 2, lastDone: null }];
const DEFAULT_PREFS  = { learningTopic: 'AI大模型', learningHour: 9 };

const STATE_COLORS = {
  normal:   '#f97316',
  thirsty:  '#f97316',
  sleepy:   '#818cf8',
  exercise: '#22c55e',
  rainy:    '#38bdf8',
  hot:      '#ef4444',
  learning: '#facc15',
  news:     '#34d399',
  happy:    '#f472b6',
};

export default function DesktopApp() {
  const sensors = useSensors();
  const { catX, walkMode, facing, screenWidth } = useCatWalk();
  const [petState, setPetState] = useState('normal');
  const [message, setMessage]   = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [hovered, setHovered]   = useState(false);
  const leaveTimerRef           = useRef(null);
  const { nurture, recordLearnRead } = useGrowthSystem();

  const addLog = useCallback(() => {}, []);

  async function triggerAgent() {
    if (isThinking) return;
    setIsThinking(true);
    try {
      const { petDecision, learningSummary: summary } = await runAgent(
        sensors, DEFAULT_HABITS, DEFAULT_PREFS, addLog
      );
      if (petDecision) {
        setPetState(petDecision.state);
        setMessage(petDecision.message);
      }
      if (summary) recordLearnRead();
    } catch (e) {
      console.error('[DesktopApp] agent error:', e.message);
    } finally {
      setIsThinking(false);
    }
  }

  useEffect(() => {
    triggerAgent();
    const id = setInterval(triggerAgent, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  function handleMouseEnter() {
    clearTimeout(leaveTimerRef.current);
    setHovered(true);
    window.electronAPI?.setMouseIgnore(false);
  }

  function handleMouseLeave() {
    leaveTimerRef.current = setTimeout(() => {
      setHovered(false);
      window.electronAPI?.setMouseIgnore(true);
    }, 120);
  }

  function handleNurture(id) {
    const effectMap = { feed: 'hunger', water: 'hunger', groom: 'mood', play: 'happy' };
    nurture({ effect: effectMap[id] || 'mood', delta: 10 });
    const prev = petState;
    setPetState('happy');
    setTimeout(() => setPetState(prev), 1500);
  }

  const color = STATE_COLORS[petState] || STATE_COLORS.normal;
  const isPeeking = walkMode === 'peeking';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: 'transparent' }}>
      <motion.div
        animate={{ x: catX }}
        transition={{ type: 'tween', ease: 'linear', duration: 0.05 }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 70,
          cursor: 'pointer',
          clipPath: isPeeking && facing === 'right' ? 'inset(0 0 0 40px)' : 'none',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{ transform: `scaleX(${facing === 'left' ? -1 : 1})`, transformOrigin: 'center' }}>
          <CatSVG color={color} walkMode={walkMode} isThinking={isThinking} />
        </div>
      </motion.div>

      <AnimatePresence>
        {hovered && (
          <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <CatPopup
              message={message}
              isThinking={isThinking}
              onNurture={handleNurture}
              onTriggerAgent={triggerAgent}
              catX={catX}
              screenWidth={screenWidth}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
