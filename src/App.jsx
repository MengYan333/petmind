import { useState, useEffect, useCallback } from 'react';
import Pet from './components/Pet';
import AgentLog from './components/AgentLog';
import HabitCard from './components/HabitCard';
import NurtureMenu from './components/NurtureMenu';
import DesktopApp from './components/DesktopApp';
import { useSensors } from './hooks/useSensors';
import { runAgent } from './services/claudeAgent';
import { useGrowthSystem } from './hooks/useGrowthSystem';
import GrowthPanel from './components/GrowthPanel';
import { useHabits } from './hooks/useHabits';
import { useChatHistory } from './hooks/useChatHistory';
import HabitsDrawer from './components/HabitsDrawer';
import ChatSection from './components/ChatSection';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

const DEFAULT_PREFS = {
  learningTopic: 'AI大模型',
  learningHour: 9,
};

function DesktopLaunchButton() {
  const [hint, setHint] = useState(false);

  function launch() {
    // Use a hidden anchor so the current page doesn't navigate away
    const a = document.createElement('a');
    a.href = 'petmind://';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Show fallback hint in case the protocol isn't registered yet
    setTimeout(() => setHint(true), 1500);
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      <button
        onClick={launch}
        className="text-xs bg-white/10 hover:bg-white/20 text-white/70 hover:text-white px-3 py-1.5 rounded-full transition-all border border-white/10 hover:border-white/30"
      >
        🖥️ 桌面版
      </button>
      {hint && (
        <div className="text-xs text-white/50 bg-black/40 backdrop-blur px-3 py-2 rounded-xl border border-white/10 max-w-[180px] text-center leading-relaxed">
          未自动打开？<br />
          请在终端运行<br />
          <code className="text-purple-300">npm start</code>
        </div>
      )}
    </div>
  );
}

function WebApp() {
  const sensors = useSensors();
  const [petState, setPetState] = useState('normal');
  const [message, setMessage] = useState('');
  const [actions, setActions] = useState([]);
  const [learningSummary, setLearningSummary] = useState('');
  const [newsHeadlines, setNewsHeadlines] = useState('');
  const [logs, setLogs] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const {
    stats, stage, completionRate, unlockedAchievements,
    nurture, recordHabitDone, recordLearnRead, recordRainInteraction,
  } = useGrowthSystem();
  const { habits, addHabit, removeHabit } = useHabits();
  const { messages: chatMessages, addMessage, clearHistory } = useChatHistory();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  const addLog = useCallback((log) => {
    setLogs(prev => [...prev.slice(-20), log]);
  }, []);

  async function triggerAgent() {
    if (isThinking) return;
    setIsThinking(true);
    setLogs([]);
    try {
      const { petDecision, learningSummary: summary, newsHeadlines: news } = await runAgent(
        sensors, habits, DEFAULT_PREFS, addLog
      );
      if (petDecision) {
        setPetState(petDecision.state);
        setMessage(petDecision.message);
        setActions(petDecision.actions);
      }
      if (summary) {
        setLearningSummary(summary);
        recordLearnRead();
      }
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
      recordHabitDone();
      if (petState === 'rainy') recordRainInteraction();
    } else {
      setPetState('normal');
      setMessage('');
      setActions([]);
    }
  }

  function handleNurture(action) {
    const prev = petState;
    nurture(action);
    setPetState('happy');
    setTimeout(() => setPetState(prev), 1500);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <DesktopLaunchButton />
      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed top-4 left-4 z-50 text-xs bg-white/10 hover:bg-white/20 text-white/70 hover:text-white px-3 py-1.5 rounded-full transition-all border border-white/10 hover:border-white/30"
      >
        ⚙️ 提醒设置
      </button>
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

      <div className="mt-6">
        <NurtureMenu stats={stats} onAction={handleNurture} />
      </div>

      <GrowthPanel
        stage={stage}
        completionRate={completionRate}
        unlockedAchievements={unlockedAchievements}
      />

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
      <ChatSection
        messages={chatMessages}
        onAddMessage={addMessage}
        onClear={clearHistory}
      />
      <AgentLog logs={logs} isThinking={isThinking} />
      {drawerOpen && (
        <HabitsDrawer
          habits={habits}
          onAdd={addHabit}
          onRemove={removeHabit}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  if (isElectron) return <DesktopApp />;
  return <WebApp />;
}
