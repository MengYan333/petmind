import { useState } from 'react';

const S = {
  text: { color: 'rgba(72, 66, 58, 0.94)' },
  dimText: { color: 'rgba(124, 115, 104, 0.84)' },
  card: {
    background: 'rgba(255,255,255,0.58)',
    border: '1px solid rgba(208, 197, 182, 0.78)',
    borderRadius: 14,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)',
  },
  accent: {
    background: 'linear-gradient(180deg, rgba(163, 221, 212, 0.92), rgba(133, 203, 191, 0.96))',
    border: '1px solid rgba(108, 170, 160, 0.88)',
    color: 'rgba(40, 64, 61, 0.94)',
  },
};

const KIND_BADGE = {
  habit: { label: '习惯', bg: 'rgba(255, 247, 230, 0.9)', border: 'rgba(216, 198, 153, 0.72)' },
  plan: { label: '安排', bg: 'rgba(230, 245, 255, 0.9)', border: 'rgba(153, 198, 216, 0.72)' },
  idea: { label: '灵感', bg: 'rgba(245, 230, 255, 0.9)', border: 'rgba(198, 153, 216, 0.72)' },
};

const TAG_STYLES = {
  '工作': { bg: 'rgba(230, 240, 255, 0.85)', border: 'rgba(150, 185, 220, 0.6)' },
  '生活': { bg: 'rgba(255, 245, 230, 0.85)', border: 'rgba(220, 195, 150, 0.6)' },
};

const PRIORITY_DOT = {
  high: '🔴',
  medium: '🟡',
  low: '🔵',
};

function isDeadlineToday(task) {
  if (!task.deadline) return false;
  // Try parsing as timestamp
  let d;
  if (typeof task.deadline === 'number') {
    d = new Date(task.deadline);
  } else if (typeof task.deadline === 'string') {
    d = new Date(task.deadline);
  }
  if (d && !isNaN(d.getTime())) {
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  }
  // Fallback: check deadlineLabel
  if (task.deadlineLabel) {
    const todayLabels = ['今天', '今日', 'today'];
    return todayLabels.some(l => task.deadlineLabel.includes(l));
  }
  return false;
}

function isDeadlinePast(task) {
  if (!task.deadline) return false;
  let d;
  if (typeof task.deadline === 'number') d = new Date(task.deadline);
  else if (typeof task.deadline === 'string') d = new Date(task.deadline);
  if (d && !isNaN(d.getTime())) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return d < todayStart;
  }
  return false;
}

export default function DailyPlan({ tasks, memory, onToggleStep, onSetStatus, onOpenTaskTab, onGeneratePlan, onGenerateReflection }) {
  const [generating, setGenerating] = useState(false);
  let rawPlan = memory.getPreference?.('todayPlan') || null;

  // Handle if AI saved as JSON string
  if (typeof rawPlan === 'string') {
    try { rawPlan = JSON.parse(rawPlan); } catch {}
  }

  // Normalize plan: support both {sections:[...]} and {schedule:[{time,task}]}
  let todayPlan = null;
  if (rawPlan && typeof rawPlan === 'object') {
    if (rawPlan.sections) {
      todayPlan = rawPlan;
    } else if (rawPlan.schedule) {
      // Group schedule items by time period
      const groups = { '上午': [], '下午': [], '晚上': [] };
      for (const item of rawPlan.schedule) {
        const hour = parseInt(item.time) || 0;
        const task = { timeLabel: item.time, title: item.task + (item.step ? ` — ${item.step}` : '') };
        if (hour < 12) groups['上午'].push(task);
        else if (hour < 18) groups['下午'].push(task);
        else groups['晚上'].push(task);
      }
      todayPlan = {
        timeLabel: rawPlan.timeLabel || '',
        sections: Object.entries(groups)
          .filter(([, tasks]) => tasks.length > 0)
          .map(([label, tasks]) => ({ label, tasks })),
      };
    }
  }

  const todayDay = new Date().getDay();

  const todayTasks = tasks.filter(t => {
    if (t.status === 'completed' || t.status === 'missed') return false;
    if (t.snoozedUntil && t.snoozedUntil > Date.now()) return false;
    // Habits always
    if (t.kind === 'habit') return true;
    // Cadence-based
    if (t.cadence?.type === 'daily') return true;
    if (t.cadence?.type === 'weekly' && t.cadence.day === todayDay) return true;
    // Deadline today or overdue → include
    if (isDeadlineToday(t) || isDeadlinePast(t)) return true;
    // No deadline, flexible → include if pending/active
    if (!t.deadline && (t.status === 'pending' || t.status === 'active')) return true;
    // Future deadline → NOT today
    return false;
  });

  const habits = todayTasks.filter(t => t.kind === 'habit');
  const plans = todayTasks.filter(t => t.kind === 'plan');
  const ideas = todayTasks.filter(t => t.kind === 'idea');

  const completedToday = tasks.filter(t =>
    t.status === 'completed' && t.completedAt &&
    t.completedAt >= new Date().setHours(0, 0, 0, 0)
  );

  async function handleGenerate() {
    setGenerating(true);
    try {
      if (onGeneratePlan) {
        await onGeneratePlan();
      }
    } finally {
      setGenerating(false);
    }
  }

  function handleComplete(taskId) {
    onSetStatus(taskId, 'completed');
  }

  function handleSnooze(taskId) {
    onSetStatus(taskId, 'snoozed');
  }

  if (todayTasks.length === 0 && completedToday.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
        {/* Plan card always shown */}
        <div style={{ ...S.card, padding: '10px 12px', flexShrink: 0, minHeight: 64 }}>
          <p style={{ ...S.dimText, fontSize: 10, margin: 0 }}>今日安排</p>
          {todayPlan?.sections?.length > 0 ? todayPlan.sections.map((section, i) => (
            <div key={i} style={{ marginTop: 6 }}>
              <p style={{ ...S.dimText, fontSize: 9, margin: '0 0 4px', color: 'rgba(120, 140, 130, 0.9)' }}>{section.label}</p>
              {section.tasks.map((t, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '3px 0' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, flexShrink: 0, color: 'rgba(100, 130, 120, 0.9)', whiteSpace: 'nowrap' }}>{t.timeLabel}</span>
                  <span style={{ ...S.text, fontSize: 11, lineHeight: 1.4 }}>{t.title}</span>
                </div>
              ))}
            </div>
          )) : (
            <p style={{ ...S.dimText, fontSize: 10, margin: '4px 0 0', color: 'rgba(140, 132, 120, 0.5)' }}>
              点击下方按钮生成今日计划
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={handleGenerate} disabled={generating} style={{
            flex: 1, ...S.accent, padding: '8px 12px', borderRadius: 12, fontSize: 11,
            cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1,
            border: '1px solid rgba(108, 170, 160, 0.88)',
          }}>
            {generating ? '生成中...' : '生成今日计划'}
          </button>
        </div>
        <div style={{ ...S.card, padding: '20px 12px', textAlign: 'center' }}>
          <p style={{ ...S.text, fontSize: 12, margin: '0 0 8px' }}>今天还没有任务</p>
          <p style={{ ...S.dimText, fontSize: 10, margin: '0 0 12px' }}>去"任务"标签添加一些灵感、习惯或计划吧</p>
          <button onClick={onOpenTaskTab} style={{
            ...S.accent, padding: '6px 16px', borderRadius: 10, fontSize: 10,
            cursor: 'pointer', border: '1px solid rgba(108, 170, 160, 0.88)',
          }}>
            添加第一个任务
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      {/* Plan schedule card — always visible */}
      <div style={{ ...S.card, padding: '10px 12px', flexShrink: 0, minHeight: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <p style={{ ...S.dimText, fontSize: 10, margin: 0 }}>今日安排</p>
          {todayPlan?.timeLabel && (
            <span style={{ ...S.dimText, fontSize: 9, color: 'rgba(120, 140, 130, 0.8)' }}>
              预估 {todayPlan.timeLabel}
            </span>
          )}
        </div>
        {todayPlan?.sections?.length > 0 ? todayPlan.sections.map((section, i) => (
          <div key={i} style={{ marginBottom: i < todayPlan.sections.length - 1 ? 8 : 0 }}>
            <p style={{ ...S.dimText, fontSize: 9, margin: '0 0 4px', color: 'rgba(120, 140, 130, 0.9)' }}>{section.label}</p>
            {section.tasks.map((t, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '3px 0' }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, flexShrink: 0,
                  color: 'rgba(100, 130, 120, 0.9)',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}>
                  {t.timeLabel}
                </span>
                <span style={{ ...S.text, fontSize: 11, lineHeight: 1.4, minWidth: 0, wordBreak: 'break-word' }}>
                  {t.title}
                </span>
              </div>
            ))}
          </div>
        )) : (
          <p style={{ ...S.dimText, fontSize: 10, margin: 0, color: 'rgba(140, 132, 120, 0.5)' }}>
            点击下方按钮生成今日计划
          </p>
        )}
      </div>

      {/* Generate buttons */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={handleGenerate} disabled={generating} style={{
          flex: 1, ...S.accent, padding: '8px 12px', borderRadius: 12, fontSize: 11,
          cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1,
          border: '1px solid rgba(108, 170, 160, 0.88)',
        }}>
          {generating ? '生成中...' : '生成今日计划'}
        </button>
        {onGenerateReflection && (
          <button onClick={onGenerateReflection} style={{
            ...S.card, ...S.dimText, padding: '8px 12px', borderRadius: 12, fontSize: 11,
            cursor: 'pointer', border: '1px solid rgba(208, 197, 182, 0.78)',
          }}>
            今日总结
          </button>
        )}
      </div>

      {/* Scrollable task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
        {/* Habits section */}
        {habits.length > 0 && (
          <TaskSection title="日常习惯" tasks={habits} onComplete={handleComplete} onSnooze={handleSnooze} onToggleStep={onToggleStep} />
        )}

        {/* Plans section */}
        {plans.length > 0 && (
          <TaskSection title="今日安排" tasks={plans} onComplete={handleComplete} onSnooze={handleSnooze} onToggleStep={onToggleStep} />
        )}

        {/* Ideas section */}
        {ideas.length > 0 && (
          <TaskSection title="推荐探索" tasks={ideas} onComplete={handleComplete} onSnooze={handleSnooze} onToggleStep={onToggleStep} />
        )}

        {/* Completed today */}
        {completedToday.length > 0 && (
          <div style={{ ...S.card, padding: '10px 12px' }}>
            <p style={{ ...S.dimText, fontSize: 10, marginBottom: 6 }}>已完成 ({completedToday.length})</p>
            {completedToday.map(t => (
              <p key={t.id} style={{ ...S.dimText, fontSize: 11, margin: '3px 0', textDecoration: 'line-through' }}>
                {t.title}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskSection({ title, tasks, onComplete, onSnooze, onToggleStep }) {
  return (
    <div style={{ ...S.card, padding: '10px 12px' }}>
      <p style={{ ...S.dimText, fontSize: 10, marginBottom: 6 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} onComplete={onComplete} onSnooze={onSnooze} onToggleStep={onToggleStep} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, onComplete, onSnooze, onToggleStep }) {
  const [expanded, setExpanded] = useState(false);
  const badge = KIND_BADGE[task.kind] || KIND_BADGE.idea;
  const dot = PRIORITY_DOT[task.priority] || PRIORITY_DOT.medium;
  const stepsDone = task.steps.filter(s => s.done).length;
  const hasSteps = task.steps.length > 0;

  return (
    <div style={{
      padding: '8px 10px',
      borderRadius: 12,
      background: 'rgba(255, 251, 246, 0.74)',
      border: '1px solid rgba(211, 200, 185, 0.72)',
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{ fontSize: 8 }}>{dot}</span>
        <span style={{
          padding: '1px 6px', borderRadius: 999, fontSize: 9,
          color: 'rgba(88, 83, 73, 0.92)', background: badge.bg, border: `1px solid ${badge.border}`,
        }}>
          {badge.label}
        </span>
        {(task.tags || []).map(tag => {
          const ts = TAG_STYLES[tag];
          return ts ? (
            <span key={tag} style={{
              padding: '1px 5px', borderRadius: 999, fontSize: 8,
              color: 'rgba(88, 83, 73, 0.6)', background: ts.bg, border: `1px solid ${ts.border}`,
            }}>
              {tag}
            </span>
          ) : null;
        })}
        {task.estimatedMinutes && (
          <span style={{ ...S.dimText, fontSize: 8 }}>
            {task.estimatedMinutes >= 60
              ? `${Math.floor(task.estimatedMinutes / 60)}h${task.estimatedMinutes % 60 > 0 ? task.estimatedMinutes % 60 + 'min' : ''}`
              : `${task.estimatedMinutes}min`}
          </span>
        )}
        {hasSteps && (
          <span style={{ ...S.dimText, fontSize: 9 }}>{stepsDone}/{task.steps.length}</span>
        )}
      </div>

      <p style={{ ...S.text, fontSize: 12, fontWeight: 600, margin: '0 0 4px', lineHeight: 1.4, overflowWrap: 'break-word', minWidth: 0 }}>
        {task.title}
      </p>

      {hasSteps && !expanded && (
        <div style={{ margin: '0 0 6px', cursor: 'pointer' }} onClick={() => setExpanded(true)}>
          <p style={{ ...S.dimText, fontSize: 10, margin: 0, wordBreak: 'break-word', lineHeight: 1.5 }}>
            {task.steps[0]?.text}
          </p>
          {task.steps.length > 1 && (
            <span style={{ ...S.dimText, fontSize: 9, color: 'rgba(120, 140, 130, 0.8)' }}>
              共 {task.steps.length} 步，点击展开
            </span>
          )}
        </div>
      )}

      {hasSteps && expanded && (
        <div style={{ margin: '4px 0 6px' }}>
          {task.steps.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}
                 onClick={() => onToggleStep(task.id, s.id)}>
              <span style={{ fontSize: 10, cursor: 'pointer' }}>{s.done ? '✅' : '⬜'}</span>
              <span style={{
                ...S.text, fontSize: 10, lineHeight: 1.4, cursor: 'pointer',
                textDecoration: s.done ? 'line-through' : 'none',
                opacity: s.done ? 0.5 : 1,
              }}>{s.text}</span>
            </div>
          ))}
          <p style={{ ...S.dimText, fontSize: 9, margin: '4px 0 0', cursor: 'pointer' }}
             onClick={() => setExpanded(false)}>
            收起步骤
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button onClick={() => onComplete(task.id)} style={{
          ...S.accent, padding: '3px 10px', borderRadius: 8, fontSize: 9,
          cursor: 'pointer', border: '1px solid rgba(108, 170, 160, 0.88)',
        }}>
          完成
        </button>
        <button onClick={() => onSnooze(task.id)} style={{
          ...S.card, ...S.dimText, padding: '3px 10px', borderRadius: 8, fontSize: 9,
          cursor: 'pointer',
        }}>
          等会儿
        </button>
      </div>
    </div>
  );
}
