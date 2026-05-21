import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Pet from './Pet';
import AgentLog from './AgentLog';
import { useSensors } from '../hooks/useSensors';
import { runAgent } from '../services/claudeAgent';

const DEFAULT_HABITS = [{ id: 'water', label: '喝水', intervalHours: 2, lastDone: null }];
const DEFAULT_PREFS  = { learningTopic: 'AI大模型', learningHour: 9 };

const COLLAPSED = { width: 170, height: 210 };
const EXPANDED  = { width: 290, height: 500 };

function StatBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' }}>
      <span className="text-white/40 text-xs w-12">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.4 }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
      <span className="text-white/30 text-xs w-5 text-right">{value}</span>
    </div>
  );
}

export default function DesktopApp() {
  const sensors = useSensors();
  const [expanded, setExpanded] = useState(false);
  const [petState, setPetState]   = useState('normal');
  const [message, setMessage]     = useState('');
  const [actions, setActions]     = useState([]);
  const [learningSummary, setLearningSummary] = useState('');
  const [newsHeadlines, setNewsHeadlines] = useState('');
  const [logs, setLogs]           = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [stats, setStats]         = useState({ hunger: 70, mood: 80 });
  const [logOpen, setLogOpen]     = useState(false);

  const addLog = useCallback((log) => {
    setLogs(prev => [...prev.slice(-20), log]);
  }, []);

  async function triggerAgent() {
    if (isThinking) return;
    setIsThinking(true);
    setLogs([]);
    try {
      const { petDecision, learningSummary: summary, newsHeadlines: news } = await runAgent(
        sensors, DEFAULT_HABITS, DEFAULT_PREFS, addLog
      );
      if (petDecision) {
        setPetState(petDecision.state);
        setMessage(petDecision.message);
        setActions(petDecision.actions);
      }
      if (summary) setLearningSummary(summary);
      if (news) setNewsHeadlines(news);
    } catch (e) {
      addLog({ type: 'info', text: `❌ ${e.message}` });
    } finally {
      setIsThinking(false);
    }
  }

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    const { width, height } = next ? EXPANDED : COLLAPSED;
    window.electronAPI?.resizeWindow(width, height);
  }

  function handleAction(action) {
    if (action.includes('喝水') || action.includes('做') || action.includes('去')) {
      setPetState('happy');
      setMessage('太棒了！你最棒！');
      setActions([]);
      setStats(s => ({ ...s, mood: Math.min(100, s.mood + 10) }));
    } else {
      setPetState('normal');
      setMessage('');
      setActions([]);
    }
  }

  const NURTURE = [
    { id: 'feed',  emoji: '🍎', label: '喂食', fn: () => setStats(s => ({ ...s, hunger: Math.min(100, s.hunger + 10) })) },
    { id: 'groom', emoji: '✨', label: '梳毛', fn: () => setStats(s => ({ ...s, mood:   Math.min(100, s.mood   + 5)  })) },
    { id: 'play',  emoji: '🎮', label: '玩耍', fn: () => { setPetState('happy'); setTimeout(() => setPetState(petState), 1500); setStats(s => ({ ...s, mood: Math.min(100, s.mood + 15) })); } },
  ];

  return (
    <div
      className="w-full h-full flex flex-col items-center"
      style={{ background: 'transparent' }}
    >
      {/* Floating card */}
      <div
        className="w-full flex flex-col items-center rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(13,13,26,0.88)',
          border: '1px solid rgba(168,85,247,0.25)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 24px rgba(168,85,247,0.12)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Header drag strip */}
        <div
          className="w-full flex items-center justify-between px-3 pt-2 pb-1"
          style={{ WebkitAppRegion: 'drag' }}
        >
          <span className="text-purple-300 text-xs font-semibold">PetMind</span>
          <div style={{ WebkitAppRegion: 'no-drag' }} className="flex gap-1">
            <button
              onClick={toggle}
              className="text-white/30 hover:text-white/70 text-xs px-1 transition-colors"
              title={expanded ? '收起' : '展开'}
            >
              {expanded ? '▼' : '▲'}
            </button>
            <button
              onClick={() => window.electronAPI?.closeWindow()}
              className="text-white/30 hover:text-red-400 text-xs px-1 transition-colors"
              title="关闭"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Pet — click triggers agent */}
        <div style={{ WebkitAppRegion: 'no-drag' }} className="py-1">
          <Pet
            state={petState}
            onClick={triggerAgent}
            size="sm"
          />
        </div>

        {/* Stat bars — always visible */}
        <div
          className="w-full px-4 pb-3 space-y-1.5"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <StatBar label="🍖 饱食" value={stats.hunger} color="bg-orange-400" />
          <StatBar label="💜 心情" value={stats.mood}   color="bg-purple-400" />
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full overflow-hidden"
              style={{ WebkitAppRegion: 'no-drag' }}
            >
              <div className="px-3 pb-3 space-y-3">
                {/* Message + actions */}
                {message && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-xs text-white/80 text-center mb-2">{message}</p>
                    {learningSummary && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 mb-2 text-xs text-white/60 leading-relaxed">
                        {learningSummary}
                      </div>
                    )}
                    {newsHeadlines && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 mb-2 text-xs text-white/60 leading-relaxed whitespace-pre-line">
                        {newsHeadlines}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {actions.map((a, i) => (
                        <button
                          key={i}
                          onClick={() => handleAction(a)}
                          className="px-3 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nurture */}
                <div className="flex justify-center gap-2">
                  {NURTURE.map(n => (
                    <button
                      key={n.id}
                      onClick={n.fn}
                      className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 transition-all"
                    >
                      <span className="text-xl">{n.emoji}</span>
                      <span className="text-xs text-white/50">{n.label}</span>
                    </button>
                  ))}
                </div>

                {/* Agent trigger */}
                <button
                  onClick={triggerAgent}
                  disabled={isThinking}
                  className="w-full text-xs text-white/30 hover:text-white/60 transition-colors py-1 disabled:cursor-not-allowed"
                >
                  {isThinking ? '⚙️ Agent 运行中...' : '↺ 触发 Agent'}
                </button>

                {/* Agent log (inline) */}
                <div>
                  <button
                    onClick={() => setLogOpen(o => !o)}
                    className="w-full flex items-center justify-between text-xs text-white/40 hover:text-white/60 py-1"
                  >
                    <span>
                      {isThinking ? (
                        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block">⚙️</motion.span>
                      ) : '🧠'} Agent 日志
                    </span>
                    <span>{logOpen ? '▲' : '▼'}</span>
                  </button>
                  <AnimatePresence>
                    {logOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-black/40 rounded-xl p-2 text-xs font-mono space-y-1 max-h-36 overflow-y-auto">
                          {logs.length === 0 && <p className="text-white/20">等待运行...</p>}
                          {logs.map((log, i) => (
                            <div key={i} className={`${
                              log.type === 'tool' ? 'text-green-400' :
                              log.type === 'decision' ? 'text-yellow-400' : 'text-white/50'
                            }`}>
                              {log.type === 'tool' ? '├─ ' : log.type === 'decision' ? '└─ ' : '   '}
                              {log.text}
                            </div>
                          ))}
                          {isThinking && (
                            <motion.div
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="text-purple-400"
                            >
                              🤔 推理中...
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
