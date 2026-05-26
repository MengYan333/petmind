import { useState, useEffect, useRef } from 'react';
import { RULE_LABELS, STATE_LABELS, SECONDARY_LABELS } from '../core/StateInference.js';
import { SkillManager } from '../core/SkillManager.js';

const S = {
  text: { color: 'rgba(72, 66, 58, 0.94)' },
  dimText: { color: 'rgba(124, 115, 104, 0.84)' },
  card: {
    background: 'rgba(255,255,255,0.58)',
    border: '1px solid rgba(208, 197, 182, 0.78)',
    borderRadius: 14,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)',
  },
};

const SKILL_META = {
  task_reminder: '任务提醒',
  task_decomposer: '任务拆解',
  plan_generator: '今日规划',
  daily_reflection: '每日总结',
  research_assistant: '调研助手',
  intent_parser: '意图理解',
};

const KIND_LABELS = { habit: '习惯', plan: '安排', idea: '灵感' };

export default function AgentDebug({ logs, isRunning, inferredState, lastResult, taskPool, lastParseResult, sensors, activityLog, memory, onShowBubble }) {
  const todayStats = taskPool ? taskPool.getTodayStats() : null;
  const activeTasks = taskPool ? taskPool.tasks.filter(t => t.status === 'pending' || t.status === 'active') : [];
  const todayTasks = taskPool ? taskPool.getTodayTasks() : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2, scrollbarWidth: 'thin' }}>
      {/* Header */}
      <div style={{
        ...S.card, padding: '10px 12px',
        background: 'rgba(240, 248, 245, 0.7)',
        border: '1px solid rgba(170, 210, 200, 0.6)',
      }}>
        <p style={{ ...S.text, fontSize: 11, fontWeight: 700, margin: 0 }}>
          Agent 决策链路
        </p>
      </div>

      {/* 1. Intent */}
      <Step num="1" title="意图理解" desc="自然语言 → 结构化意图">
        <IntentBlock lastParseResult={lastParseResult} taskPool={taskPool} />
      </Step>

      {/* 2. Decompose */}
      <Step num="2" title="多步推理" desc="意图 → 可执行步骤">
        <DecomposeBlock lastParseResult={lastParseResult} activeTasks={activeTasks} />
      </Step>

      {/* 3. State */}
      <Step num="3" title="状态推断" desc="信号 → 用户状态判断">
        <StateBlock inferredState={inferredState} sensors={sensors} />
      </Step>

      {/* 4. Priority Decision */}
      <Step num="4" title="优先级决策" desc="状态 + 任务 → 今日优先级">
        <PriorityBlock
          inferredState={inferredState}
          todayTasks={todayTasks}
          activeTasks={activeTasks}
          lastResult={lastResult}
          taskPool={taskPool}
          sensors={sensors}
          activityLog={activityLog}
          memory={memory}
        />
      </Step>

      {/* 5. Action */}
      <Step num="5" title="自主行动" desc="决策 → 执行技能">
        <ActionBlock lastResult={lastResult} logs={logs} isRunning={isRunning} onShowBubble={onShowBubble} />
      </Step>

      {/* 6. Memory */}
      <Step num="6" title="记忆更新" desc="行动结果 → 写入长期记忆">
        <MemoryBlock lastResult={lastResult} logs={logs} todayStats={todayStats} />
      </Step>
    </div>
  );
}

function Step({ num, title, desc, children }) {
  return (
    <div style={{ ...S.card, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          width: 22, height: 22, borderRadius: 999, fontSize: 10, fontWeight: 700,
          display: 'grid', placeItems: 'center',
          background: 'rgba(163, 221, 212, 0.4)', color: 'rgba(40, 64, 61, 0.85)',
          border: '1px solid rgba(100, 140, 130, 0.3)',
        }}>
          {num}
        </span>
        <div>
          <p style={{ ...S.text, fontSize: 11, fontWeight: 600, margin: 0 }}>{title}</p>
          <p style={{ ...S.dimText, fontSize: 9, margin: '1px 0 0' }}>{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ---- 1. Intent Understanding ---- */
function IntentBlock({ lastParseResult, taskPool }) {
  const total = taskPool ? taskPool.tasks.length : 0;
  const counts = { habit: 0, plan: 0, idea: 0 };
  if (taskPool) for (const t of taskPool.tasks) counts[t.kind] = (counts[t.kind] || 0) + 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Chip label={`共 ${total} 个任务`} />
        <Chip label={`${counts.habit} 习惯`} />
        <Chip label={`${counts.plan} 安排`} />
        <Chip label={`${counts.idea} 灵感`} />
      </div>
      {lastParseResult && (
        <p style={{ ...S.text, fontSize: 10, margin: 0, lineHeight: 1.5 }}>
          "{lastParseResult.rawText}" → <b>{lastParseResult.title}</b>
          <span style={{ ...S.dimText }}>（{KIND_LABELS[lastParseResult.kind]}·{lastParseResult.priority === 'high' ? '高优' : lastParseResult.priority === 'low' ? '低优' : '中优'}）</span>
        </p>
      )}
      {!lastParseResult && total === 0 && (
        <p style={{ ...S.dimText, fontSize: 10, margin: 0 }}>还没有输入过任务</p>
      )}
    </div>
  );
}

/* ---- 2. Decompose ---- */
function DecomposeBlock({ lastParseResult, activeTasks }) {
  const taskWithSteps = lastParseResult?.steps?.length > 0
    ? lastParseResult
    : activeTasks.find(t => t.steps?.length > 0);

  if (!taskWithSteps) {
    return <p style={{ ...S.dimText, fontSize: 10, margin: 0 }}>暂无需要拆解的任务</p>;
  }

  const done = taskWithSteps.steps.filter(s => s.done).length;
  const total = taskWithSteps.steps.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <p style={{ ...S.dimText, fontSize: 9, margin: 0 }}>
        "{taskWithSteps.rawText || taskWithSteps.title}" → {total} 步（已完成 {done}/{total}）
      </p>
      {taskWithSteps.steps.slice(0, 4).map((step, i) => (
        <p key={i} style={{
          ...S.text, fontSize: 10, margin: 0, lineHeight: 1.4, paddingLeft: 12,
          opacity: step.done ? 0.5 : 1, textDecoration: step.done ? 'line-through' : 'none',
        }}>
          {step.done ? '✓' : `${i + 1}.`} {typeof step === 'string' ? step : step.text}
        </p>
      ))}
    </div>
  );
}

/* ---- 3. State Inference ---- */
function StateBlock({ inferredState, sensors }) {
  if (!inferredState) return <span style={{ ...S.dimText, fontSize: 10 }}>等待推断...</span>;

  const primary = STATE_LABELS[inferredState.primary] || inferredState.primary;
  const secondary = inferredState.secondary ? SECONDARY_LABELS[inferredState.secondary] || inferredState.secondary : null;
  const confidence = Math.round((inferredState.confidence || 0.5) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Sensor signals */}
      {sensors && (
        <div style={{
          padding: '6px 8px', borderRadius: 10,
          background: 'rgba(245, 248, 252, 0.7)',
          border: '1px solid rgba(190, 200, 215, 0.5)',
        }}>
          <p style={{ ...S.dimText, fontSize: 9, margin: '0 0 4px' }}>环境信号</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <SensorChip label="时间" value={`${sensors.time.hour}:${String(sensors.time.minute).padStart(2, '0')}`} />
            <SensorChip label="屏幕" value={`${sensors.screenMinutes}min`} />
            <SensorChip label="空闲" value={sensors.isIdle ? `${sensors.idleMinutes}min` : '否'} warn={sensors.idleMinutes > 10} />
          </div>
        </div>
      )}

      {/* Inference result */}
      <p style={{ ...S.text, fontSize: 12, fontWeight: 700, margin: 0 }}>
        {primary}{secondary ? ` · ${secondary}` : ''}
        <span style={{ ...S.dimText, fontSize: 9, fontWeight: 400 }}> 信心 {confidence}%</span>
      </p>
      {inferredState.reason && (
        <p style={{ ...S.dimText, fontSize: 10, margin: 0, lineHeight: 1.5 }}>
          依据：{inferredState.reason}
        </p>
      )}
      {inferredState.evaluatedRules ? (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {inferredState.evaluatedRules
            .filter(r => r.matched)
            .sort((a, b) => b.score - a.score)
            .map((r, i) => (
              <span key={r.id} style={{
                padding: '1px 6px', borderRadius: 999, fontSize: 9,
                background: i === 0 ? 'rgba(163, 221, 212, 0.4)' : 'rgba(240, 238, 235, 0.6)',
                border: `1px solid ${i === 0 ? 'rgba(108, 170, 160, 0.5)' : 'rgba(200, 195, 188, 0.5)'}`,
                color: 'rgba(40, 64, 61, 0.8)',
                fontWeight: i === 0 ? 600 : 400,
              }}>
                {RULE_LABELS[r.id] || r.id} {r.score}分
              </span>
            ))}
        </div>
      ) : inferredState.source === 'ai' ? (
        <span style={{
          padding: '1px 6px', borderRadius: 999, fontSize: 9,
          background: 'rgba(163, 184, 221, 0.4)',
          border: '1px solid rgba(108, 140, 170, 0.5)',
          color: 'rgba(40, 50, 61, 0.8)',
        }}>
          AI 推断
        </span>
      ) : null}
    </div>
  );
}

/* ---- 4. Priority Decision ---- */
function PriorityBlock({ inferredState, todayTasks, activeTasks, lastResult, taskPool, sensors, activityLog, memory }) {
  const [aiDecision, setAiDecision] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inferredState || activeTasks.length === 0) return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const mgr = new SkillManager();
        mgr.loadFromMd();
        const context = {
          sensors,
          inferredState,
          activityLog: activityLog?.instance,
          memory: memory?.instance,
          taskPool: taskPool?.instance,
        };
        const result = await mgr.executeSkill('priority_decision', context);
        if (!cancelled) setAiDecision(result);
      } catch {
        // keep null, fall back to basic display
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [inferredState?.primary, inferredState?.secondary, activeTasks.length]);

  if (!inferredState || activeTasks.length === 0) {
    return <p style={{ ...S.dimText, fontSize: 10, margin: 0 }}>没有待办任务，无需决策</p>;
  }

  const pendingTasks = activeTasks.filter(t => t.status === 'pending');
  const activeOnly = activeTasks.filter(t => t.status === 'active');
  const recommended = aiDecision?.data?.recommended;
  const ranking = aiDecision?.data?.ranking;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <p style={{ ...S.dimText, fontSize: 9, margin: 0 }}>
        {pendingTasks.length} 待办 · {activeOnly.length} 进行中
        {loading && <span style={{ marginLeft: 6 }}>AI 决策中...</span>}
      </p>
      {ranking ? (
        ranking.slice(0, 5).map((r, i) => {
          const t = activeTasks.find(at => at.id === r.taskId);
          if (!t) return null;
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 9, fontWeight: i === 0 ? 700 : 400,
                color: i === 0 ? 'rgba(80, 160, 130, 0.9)' : 'rgba(180, 170, 160, 0.7)',
              }}>
                {i === 0 ? '→' : `${i + 1}.`}
              </span>
              <span style={{
                ...S.text, fontSize: 10, lineHeight: 1.4,
                fontWeight: i === 0 ? 600 : 400,
                opacity: i === 0 ? 1 : 0.6,
              }}>
                {t.title}
                <span style={{ ...S.dimText, fontSize: 9 }}>（{r.score}分）</span>
              </span>
            </div>
          );
        })
      ) : (
        activeTasks.slice(0, 5).map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: 'rgba(180, 170, 160, 0.7)' }}>·</span>
            <span style={{ ...S.text, fontSize: 10, lineHeight: 1.4, opacity: 0.6 }}>
              {t.title}
              <span style={{ ...S.dimText, fontSize: 9 }}>
                （{t.priority === 'high' ? '高优' : t.priority === 'low' ? '低优' : '中优'}·{KIND_LABELS[t.kind]}）
              </span>
            </span>
          </div>
        ))
      )}
      {recommended && (
        <div style={{
          padding: '5px 8px', borderRadius: 10, marginTop: 2,
          background: 'rgba(240, 248, 245, 0.7)',
          border: '1px solid rgba(170, 210, 200, 0.5)',
        }}>
          <p style={{ ...S.text, fontSize: 10, margin: 0, fontWeight: 600, color: 'rgba(80, 140, 120, 0.9)' }}>
            推荐：{recommended.title}
          </p>
          {recommended.reason && (
            <p style={{ ...S.dimText, fontSize: 9, margin: '2px 0 0' }}>
              {recommended.reason}
            </p>
          )}
        </div>
      )}
      {aiDecision?.message && !recommended && (
        <p style={{ ...S.text, fontSize: 10, margin: '2px 0 0', fontWeight: 600, color: 'rgba(80, 140, 120, 0.9)' }}>
          {aiDecision.message}
        </p>
      )}
    </div>
  );
}

/* ---- 5. Action ---- */
function ActionBlock({ lastResult, logs, isRunning, onShowBubble }) {
  const skillLogs = logs.filter(l => l.text?.includes('✓') || l.text?.includes('✗'));
  const noTrigger = logs.find(l => l.text?.includes('没有技能触发'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Manual trigger */}
      <button
        onClick={() => onShowBubble?.()}
        disabled={!lastResult}
        style={{
          padding: '4px 10px', borderRadius: 8, fontSize: 9, cursor: lastResult ? 'pointer' : 'not-allowed',
          opacity: lastResult ? 1 : 0.5,
          background: 'rgba(163, 221, 212, 0.4)', border: '1px solid rgba(108, 170, 160, 0.5)',
          color: 'rgba(40, 64, 61, 0.85)',
        }}
      >
        执行弹窗测试
      </button>

      {/* Skill evaluation */}
      {skillLogs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {skillLogs.map((log, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 9,
                color: log.text?.includes('✓') ? 'rgba(80, 160, 130, 0.9)' : 'rgba(180, 170, 160, 0.7)',
              }}>
                {log.text?.includes('✓') ? '✓' : '✗'}
              </span>
              <span style={{ ...S.text, fontSize: 10, opacity: log.text?.includes('✓') ? 1 : 0.6 }}>
                {log.text?.replace(/^[✓✗]\s*/, '')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Executed action */}
      {lastResult && (
        <div style={{
          padding: '6px 8px', borderRadius: 10,
          background: 'rgba(255, 248, 235, 0.8)',
          border: '1px solid rgba(220, 200, 160, 0.6)',
        }}>
          <p style={{ ...S.text, fontSize: 11, fontWeight: 600, margin: '0 0 2px' }}>
            执行：{SKILL_META[lastResult.skillId] || lastResult.name || lastResult.skillId}
          </p>
          <p style={{ ...S.dimText, fontSize: 10, margin: 0, lineHeight: 1.5 }}>
            {lastResult.message}
          </p>
          {lastResult.actions?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {lastResult.actions.map((a, i) => (
                <span key={i} style={{
                  padding: '1px 6px', borderRadius: 999, fontSize: 9,
                  background: 'rgba(163, 221, 212, 0.4)',
                  border: '1px solid rgba(108, 170, 160, 0.5)',
                  color: 'rgba(40, 64, 61, 0.8)',
                }}>
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {noTrigger && !lastResult && (
        <p style={{ ...S.dimText, fontSize: 10, margin: 0 }}>{noTrigger.text}</p>
      )}

      {!lastResult && !noTrigger && skillLogs.length === 0 && (
        <p style={{ ...S.dimText, fontSize: 10, margin: 0 }}>
          {isRunning ? '正在评估...' : '等待下一轮循环（每 10 分钟）'}
        </p>
      )}
    </div>
  );
}

/* ---- 6. Memory Update ---- */
function MemoryBlock({ lastResult, logs, todayStats }) {
  const memoryLog = logs.find(l => l.text?.includes('Memory'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {memoryLog && (
        <p style={{ ...S.text, fontSize: 10, margin: 0 }}>{memoryLog.text}</p>
      )}

      {lastResult?.memoryUpdate && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Object.entries(lastResult.memoryUpdate).map(([key, value]) => (
            <p key={key} style={{ ...S.dimText, fontSize: 10, margin: 0 }}>
              {key === 'todayPlan' ? '更新今日计划' : key === 'dailyDigest' ? '写入每日总结' : `更新 ${key}`}
            </p>
          ))}
        </div>
      )}

      {todayStats && (
        <p style={{ ...S.dimText, fontSize: 10, margin: 0 }}>
          累计：今日 {todayStats.total} 任务，已完成 {todayStats.completed}
        </p>
      )}

      {!memoryLog && !lastResult?.memoryUpdate && (
        <p style={{ ...S.dimText, fontSize: 10, margin: 0 }}>还没有记忆更新</p>
      )}
    </div>
  );
}

function Chip({ label }) {
  return (
    <span style={{
      padding: '1px 6px', borderRadius: 999, fontSize: 9,
      background: 'rgba(240, 238, 235, 0.7)',
      border: '1px solid rgba(200, 195, 188, 0.6)',
      color: 'rgba(88, 83, 73, 0.8)',
    }}>
      {label}
    </span>
  );
}

function SensorChip({ label, value, warn }) {
  return (
    <span style={{
      padding: '1px 6px', borderRadius: 999, fontSize: 9,
      background: warn ? 'rgba(255, 235, 230, 0.8)' : 'rgba(240, 238, 235, 0.7)',
      border: `1px solid ${warn ? 'rgba(220, 160, 140, 0.6)' : 'rgba(200, 195, 188, 0.6)'}`,
      color: warn ? 'rgba(180, 80, 60, 0.9)' : 'rgba(88, 83, 73, 0.8)',
    }}>
      {label}: {value}
    </span>
  );
}
