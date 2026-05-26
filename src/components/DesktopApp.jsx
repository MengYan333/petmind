import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { useSensors } from '../hooks/useSensors';
import { useActivityLog } from '../hooks/useActivityLog';
import { useStateInference } from '../hooks/useStateInference';
import { useSkillManager } from '../hooks/useSkillManager';
import { useMemory } from '../hooks/useMemory';
import { useTaskPool } from '../hooks/useTaskPool';
import CatSVG from './CatSVG';
import SkillBubble from './SkillBubble';
import DailyPlan from './DailyPlan';
import TaskList from './TaskList';
import TaskInput from './TaskInput';
import AgentDebug from './AgentDebug';

const STATE_SIZE = { w: 110, h: 138 };
const PANEL_W = 320;
const PANEL_H = 520;

const PRIMARY_TABS = [
  { id: 'today', label: '今日' },
  { id: 'tasks', label: '任务' },
  { id: 'chat', label: '对话' },
  { id: 'debug', label: '调试' },
];

const S = {
  text: { color: 'rgba(55, 50, 45, 0.92)' },
  dimText: { color: 'rgba(140, 132, 120, 0.78)' },
  card: {
    background: 'rgba(255, 253, 250, 0.8)',
    border: '1px solid rgba(220, 214, 204, 0.5)',
    borderRadius: 12,
  },
  accent: {
    background: 'rgba(55, 50, 45, 0.9)',
    border: 'none',
    color: 'rgba(255, 253, 250, 0.95)',
  },
};

export default function DesktopApp() {
  const sensors = useSensors();
  const activityLog = useActivityLog();
  const memory = useMemory();
  const taskPool = useTaskPool();
  const inferredState = useStateInference(sensors, activityLog, memory, taskPool);
  const { runLoop, runSkill, runParse, executeChat, lastResult, isRunning, logs } = useSkillManager(sensors, inferredState, activityLog, memory, taskPool);

  const [petState, setPetState] = useState('normal');
  const [message, setMessage] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [primaryTab, setPrimaryTab] = useState('today');
  const [taskView, setTaskView] = useState('list'); // list | input
  const [skillBubbleVisible, setSkillBubbleVisible] = useState(false);
  const [sw, setSw] = useState(1280);
  const [sh, setSh] = useState(752);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [lastParseResult, setLastParseResult] = useState(null);

  const chatEndRef = useRef(null);
  const catX = useMotionValue(200);
  const catY = useMotionValue(600);
  const bubbleTimerRef = useRef(null);
  const skillBubbleTimerRef = useRef(null);

  useEffect(() => {
    async function init() {
      let width = window.innerWidth;
      let height = window.innerHeight;
      if (window.electronAPI?.getScreenSize) {
        const s = await window.electronAPI.getScreenSize();
        width = s.width;
        height = s.height;
      }
      setSw(width);
      setSh(height);
      catX.set(width - 160);
      catY.set(height - 160);
    }
    init();
  }, []);

  useEffect(() => {
    function onMove(e) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      window.electronAPI?.setMouseIgnore(!(el && el.closest('[data-interactive]')));
    }
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  // Lower window level when input/textarea is focused so system IME shows above
  useEffect(() => {
    function onFocusIn(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        window.electronAPI?.setInputFocused(true);
      }
    }
    function onFocusOut(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        window.electronAPI?.setInputFocused(false);
      }
    }
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs]);

  useEffect(() => {
    const run = async () => {
      const result = await runLoop();
      if (result) {
        // 过滤"无需行动"类消息，不展示弹窗
        const noActionPhrases = ['无需行动', '不需要', '没有需要', '保持现状'];
        if (noActionPhrases.some(p => result.message?.includes(p))) return;
        setPetState(result.petState);
        setMessage(result.message);
        setSkillBubbleVisible(true);
        clearTimeout(skillBubbleTimerRef.current);
        skillBubbleTimerRef.current = setTimeout(() => setSkillBubbleVisible(false), 15000);
      }
    };
    run();
    const id = setInterval(run, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [runLoop]);

  useEffect(() => () => {
    clearTimeout(bubbleTimerRef.current);
    clearTimeout(skillBubbleTimerRef.current);
  }, []);

  // 当技能执行产生有意义的结果时，自动弹窗
  useEffect(() => {
    if (!lastResult) return;
    // 跳过意图解析（它在 TaskInput 里处理预览，不需要弹窗）
    if (lastResult.skillId === 'intent_parser') return;
    // 跳过对话（它在 ChatTab 里展示）
    if (lastResult.skillId === 'chat') return;
    // 有 message 或 actions 才弹窗
    if (!lastResult.message && !lastResult.actions?.length) return;
    setPetState(lastResult.petState || 'normal');
    setMessage(lastResult.message);
    setSkillBubbleVisible(true);
    clearTimeout(skillBubbleTimerRef.current);
    skillBubbleTimerRef.current = setTimeout(() => setSkillBubbleVisible(false), 15000);
  }, [lastResult]);

  // Cat visual responds to inferred state (when no skill is actively controlling it)
  useEffect(() => {
    if (!inferredState || skillBubbleVisible) return;
    const stateMap = {
      sleeping: 'sleepy',
      idle: 'normal',
      working: 'working',
    };
    const mapped = stateMap[inferredState.primary] || 'normal';
    setPetState(mapped);
    if (inferredState.secondary === 'break_needed') {
      setPetState('exercise');
    }
    if (inferredState.secondary === 'has_ideas') {
      setPetState('thinking');
    }
  }, [inferredState, skillBubbleVisible]);

  function handleCatClick() {
    if (panelOpen) {
      setPanelOpen(false);
      clearTimeout(bubbleTimerRef.current);
    } else {
      setPanelOpen(true);
      setSkillBubbleVisible(false);
    }
  }

  function handleCatContextMenu(e) {
    e.preventDefault();
    if (window.electronAPI?.quitApp) window.electronAPI.quitApp();
    else window.close();
  }

  function closePanel() {
    setPanelOpen(false);
    clearTimeout(bubbleTimerRef.current);
  }

  function handleSkillAction(action) {
    if (action.includes('开始做') || action.includes('好的')) {
      if (lastResult?.data?.taskId) {
        taskPool.setTaskStatus(lastResult.data.taskId, 'active');
      }
    }
    if (action.includes('等会儿') || action.includes('跳过')) {
      if (lastResult?.data?.taskId) {
        taskPool.setTaskStatus(lastResult.data.taskId, 'snoozed');
      }
    }
    if (action.includes('查看今日计划')) {
      setPrimaryTab('today');
      setPanelOpen(true);
    }
    if (action.includes('谢谢总结') || action.includes('谢谢')) {
      setPetState('happy');
      setTimeout(() => setPetState('normal'), 2000);
    }
    setSkillBubbleVisible(false);
  }

  async function handleChatSend() {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    setChatInput('');
    setChatMsgs(prev => [...prev, { role: 'user', text }]);
    activityLog.log('chat');
    setChatBusy(true);

    try {
      const result = await executeChat(text, chatMsgs);

      if (result) {
        setChatMsgs(prev => [...prev, { role: 'pet', text: result.message }]);
      } else {
        setChatMsgs(prev => [...prev, { role: 'pet', text: '抱歉，我没有理解你的意思。' }]);
      }
    } catch (err) {
      console.error('[chat] error:', err);
      setChatMsgs(prev => [...prev, { role: 'pet', text: `连接出错: ${err.message || '未知错误'}` }]);
    } finally {
      setChatBusy(false);
    }
  }

  function handleAddTask(data) {
    taskPool.addTask(data);
    setLastParseResult(data);
    setTaskView('list');
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'transparent', pointerEvents: 'none' }}>
      <motion.div
        data-interactive
        drag
        dragMomentum={false}
        dragElastic={0.05}
        dragConstraints={{ left: 0, top: 0, right: sw - STATE_SIZE.w, bottom: sh - STATE_SIZE.h }}
        style={{
          x: catX, y: catY,
          position: 'absolute', top: 0, left: 0,
          width: STATE_SIZE.w, cursor: 'grab', userSelect: 'none', pointerEvents: 'auto',
        }}
        whileDrag={{ cursor: 'grabbing', scale: 1.06 }}
        onClick={handleCatClick}
        onContextMenu={handleCatContextMenu}
      >
        <CatSVG state={petState} isThinking={isRunning} />
        {isRunning && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ position: 'absolute', top: -4, right: -4, fontSize: 16, pointerEvents: 'none' }}
          >
            ⚙️
          </motion.div>
        )}
      </motion.div>

      <SkillBubble
        skillResult={lastResult}
        visible={skillBubbleVisible}
        onClose={() => setSkillBubbleVisible(false)}
        onAction={handleSkillAction}
      />

      <AnimatePresence>
        {panelOpen && (
          <motion.div
            data-interactive
            key="panel"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            style={{
              position: 'absolute',
              left: Math.max(8, Math.min(catX.get() + STATE_SIZE.w / 2 - PANEL_W / 2, sw - PANEL_W - 8)),
              top: Math.max(8, Math.min(catY.get() - PANEL_H - 20, sh - PANEL_H - 8)),
              width: PANEL_W, height: PANEL_H,
              background: 'rgba(252, 250, 247, 0.98)',
              border: '1px solid rgba(210, 204, 194, 0.6)',
              borderRadius: 16,
              boxShadow: '0 24px 64px rgba(50, 44, 38, 0.12), 0 8px 24px rgba(50, 44, 38, 0.06)',
              backdropFilter: 'blur(24px)',
              padding: '0 16px 14px',
              zIndex: 9999,
              pointerEvents: 'auto',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Tabs */}
            <div style={{
              display: 'flex', gap: 0, margin: '0 -16px 14px', padding: '0 12px',
              borderBottom: '1px solid rgba(210, 204, 194, 0.35)',
            }}>
              {PRIMARY_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setPrimaryTab(tab.id); if (tab.id === 'tasks') setTaskView('list'); }}
                  style={{
                    minWidth: 0, padding: '10px 10px 11px',
                    fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
                    whiteSpace: 'nowrap', background: 'none',
                    border: 'none',
                    color: primaryTab === tab.id ? 'rgba(55, 50, 45, 0.92)' : 'rgba(140, 132, 120, 0.6)',
                    fontWeight: primaryTab === tab.id ? 600 : 400,
                    borderBottom: primaryTab === tab.id ? '2px solid rgba(55, 50, 45, 0.85)' : '2px solid transparent',
                    marginBottom: '-1px',
                  }}
                >
                  {tab.label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button
                onClick={closePanel}
                style={{
                  padding: '10px 2px 11px', background: 'none', border: 'none',
                  color: 'rgba(140, 132, 120, 0.45)', fontSize: 13, cursor: 'pointer',
                  lineHeight: 1, marginBottom: '-1px',
                  borderBottom: '2px solid transparent',
                }}
              >×</button>
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {primaryTab === 'chat' && (
                <ChatTab
                  msgs={chatMsgs} busy={chatBusy} input={chatInput}
                  onInput={setChatInput} onSend={handleChatSend} endRef={chatEndRef}
                />
              )}

              {primaryTab === 'today' && (
                <DailyPlan
                  tasks={taskPool.tasks}
                  memory={memory}
                  onToggleStep={taskPool.toggleStep}
                  onSetStatus={taskPool.setTaskStatus}
                  onOpenTaskTab={() => setPrimaryTab('tasks')}
                  onGeneratePlan={() => runSkill('plan_generator')}
                  onGenerateReflection={() => runSkill('daily_reflection')}
                />
              )}

              {primaryTab === 'tasks' && (
                taskView === 'input' ? (
                  <TaskInput onAdd={handleAddTask} onBack={() => setTaskView('list')} onParse={runParse} />
                ) : (
                  <TaskList
                    tasks={taskPool.tasks}
                    onRemove={taskPool.removeTask}
                    onSetStatus={taskPool.setTaskStatus}
                    onToggleStep={taskPool.toggleStep}
                    onOpenInput={() => setTaskView('input')}
                  />
                )
              )}

              {primaryTab === 'debug' && (
                <AgentDebug
                  logs={logs}
                  isRunning={isRunning}
                  inferredState={inferredState}
                  lastResult={lastResult}
                  taskPool={taskPool}
                  lastParseResult={lastParseResult}
                  sensors={sensors}
                  activityLog={activityLog}
                  memory={memory}
                  onShowBubble={() => setSkillBubbleVisible(true)}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChatTab({ msgs, busy, input, onInput, onSend, endRef }) {
  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '8px 6px', borderRadius: 12,
        background: 'rgba(255,255,255,0.52)',
        border: '1px solid rgba(208, 198, 184, 0.72)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)',
        scrollbarWidth: 'thin',
      }}>
        {msgs.length === 0 && (
          <p style={{ color: 'rgba(124, 115, 104, 0.84)', fontSize: 11, textAlign: 'center', marginTop: 72, lineHeight: 1.7 }}>
            和我聊聊你今天的想法，
            <br />
            或者告诉我你想调整什么计划。
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '86%', padding: '7px 9px', borderRadius: 14,
            fontSize: 11, lineHeight: 1.6,
            ...(m.role === 'user'
              ? { background: 'rgba(163, 221, 212, 0.62)', border: '1px solid rgba(108, 170, 160, 0.7)', color: 'rgba(40, 64, 61, 0.94)' }
              : { background: 'rgba(255,255,255,0.74)', border: '1px solid rgba(208, 198, 184, 0.72)', color: 'rgba(70, 66, 59, 0.94)' }),
          }}>
            {m.text}
          </div>
        ))}
        {busy && (
          <div style={{ alignSelf: 'flex-start', color: 'rgba(123, 116, 106, 0.84)', fontSize: 11 }}>
            正在思考...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => onInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="说说你的想法，或让我帮你调整计划"
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 12, fontSize: 11,
            background: 'rgba(255,255,255,0.72)',
            border: '1px solid rgba(208, 198, 184, 0.78)',
            color: 'rgba(72, 66, 58, 0.94)', outline: 'none',
          }}
        />
        <button
          onClick={onSend}
          disabled={busy || !input.trim()}
          style={{
            padding: '8px 12px', borderRadius: 12, fontSize: 11,
            cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: busy || !input.trim() ? 0.5 : 1,
            background: 'linear-gradient(180deg, rgba(163, 221, 212, 0.92), rgba(133, 203, 191, 0.96))',
            border: '1px solid rgba(108, 170, 160, 0.88)',
            color: 'rgba(40, 64, 61, 0.94)',
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
}
