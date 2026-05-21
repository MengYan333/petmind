import { useState, useEffect, useCallback } from 'react';
import Pet from './components/Pet';
import AgentLog from './components/AgentLog';
import HabitCard from './components/HabitCard';
import NurtureMenu from './components/NurtureMenu';
import DesktopApp from './components/DesktopApp';
import { useSensors } from './hooks/useSensors';
import { runAgent } from './services/claudeAgent';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

const DEFAULT_HABITS = [
  { id: 'water', label: '喝水', intervalHours: 2, lastDone: null },
];

const DEFAULT_PREFS = {
  learningTopic: 'AI大模型',
  learningHour: 9,
};

function WebApp() {
  const sensors = useSensors();
  const [petState, setPetState] = useState('normal');
  const [message, setMessage] = useState('');
  const [actions, setActions] = useState([]);
  const [learningSummary, setLearningSummary] = useState('');
  const [newsHeadlines, setNewsHeadlines] = useState('');
  const [logs, setLogs] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [stats, setStats] = useState({ hunger: 70, mood: 80 });
  const [lastRun, setLastRun] = useState(null);
  const [prevPetState, setPrevPetState] = useState('normal');

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
      setLastRun(new Date());
    } catch (e) {
      addLog({ type: 'info', text: `❌ 错误：${e.message}` });
    } finally {
      setIsThinking(false);
    }
  }

  // Auto-run agent every 10 minutes
  useEffect(() => {
    triggerAgent();
    const interval = setInterval(triggerAgent, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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

  function handleNurture(action) {
    setPrevPetState(petState);
    setStats(prev => {
      const next = { ...prev };
      if (action.effect === 'hunger') next.hunger = Math.min(100, prev.hunger + action.delta);
      if (action.effect === 'mood' || action.effect === 'happy') next.mood = Math.min(100, prev.mood + action.delta);
      return next;
    });
    setPetState('happy');
    setTimeout(() => setPetState(prevPetState), 1500);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <h1 className="text-2xl font-bold mb-1 text-purple-300">PetMind</h1>
      <p className="text-white/30 text-xs mb-8">世界感知桌面宠物</p>

      {/* Sensor status bar */}
      <div className="flex gap-3 mb-6 text-xs text-white/40">
        <span>🌤 {sensors.weather?.condition} {sensors.weather?.temp}°C</span>
        <span>⏱ 使用 {sensors.screenMinutes}分钟</span>
        <span>🕐 {sensors.time.hour}:{String(sensors.time.minute).padStart(2, '0')}</span>
      </div>

      {/* Pet */}
      <Pet state={petState} onClick={triggerAgent} />

      {/* Habit card */}
      <div className="w-full max-w-sm">
        <HabitCard
          message={message}
          actions={actions}
          learningSummary={learningSummary}
          newsHeadlines={newsHeadlines}
          onAction={handleAction}
        />
      </div>

      {/* Nurture */}
      <div className="mt-6">
        <NurtureMenu stats={stats} onAction={handleNurture} />
      </div>

      {/* Manual trigger */}
      <button
        onClick={triggerAgent}
        disabled={isThinking}
        className="mt-4 text-xs text-white/30 hover:text-white/60 transition-colors disabled:cursor-not-allowed"
      >
        {isThinking ? '⚙️ Agent 运行中...' : '↺ 手动触发 Agent'}
      </button>

      {lastRun && (
        <p className="text-xs text-white/20 mt-1">
          上次运行：{lastRun.toLocaleTimeString()}
        </p>
      )}

      {/* Agent log */}
      <AgentLog logs={logs} isThinking={isThinking} />
    </div>
  );
}

export default function App() {
  if (isElectron) return <DesktopApp />;
  return <WebApp />;
}
