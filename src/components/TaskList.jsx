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

const KIND_LABELS = { habit: '习惯', plan: '安排', idea: '灵感' };
const STATUS_LABELS = { pending: '待开始', active: '进行中', completed: '已完成', missed: '已错过', snoozed: '已暂缓' };
const KIND_COLORS = {
  habit: { bg: 'rgba(255, 247, 230, 0.9)', border: 'rgba(216, 198, 153, 0.72)' },
  plan: { bg: 'rgba(230, 245, 255, 0.9)', border: 'rgba(153, 198, 216, 0.72)' },
  idea: { bg: 'rgba(245, 230, 255, 0.9)', border: 'rgba(198, 153, 216, 0.72)' },
};

const TAG_STYLES = {
  '工作': { bg: 'rgba(230, 240, 255, 0.85)', border: 'rgba(150, 185, 220, 0.6)' },
  '生活': { bg: 'rgba(255, 245, 230, 0.85)', border: 'rgba(220, 195, 150, 0.6)' },
};

export default function TaskList({ tasks, onRemove, onSetStatus, onToggleStep, onOpenInput }) {
  const [filter, setFilter] = useState('active'); // active | completed

  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const displayTasks = filter === 'active' ? activeTasks : completedTasks;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
      {/* Add button */}
      <button onClick={onOpenInput} style={{
        ...S.card, ...S.dimText, padding: '8px 12px', borderRadius: 12, fontSize: 11,
        cursor: 'pointer', width: '100%', textAlign: 'center',
      }}>
        + 添加新任务
      </button>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { id: 'active', label: `进行中 (${activeTasks.length})` },
          { id: 'completed', label: `已完成 (${completedTasks.length})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            flex: 1, padding: '5px 6px', borderRadius: 999, fontSize: 9,
            cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
            ...(filter === f.id ? { ...S.accent } : { ...S.card, ...S.dimText }),
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {displayTasks.length === 0 ? (
        <div style={{ ...S.card, padding: '16px 12px', textAlign: 'center' }}>
          <p style={{ ...S.dimText, fontSize: 11, margin: 0 }}>
            {filter === 'active' ? '还没有进行中的任务，去添加一个吧' : '这里空空的'}
          </p>
        </div>
      ) : (
        displayTasks.map(task => (
          <FullTaskCard
            key={task.id}
            task={task}
            onRemove={onRemove}
            onSetStatus={onSetStatus}
            onToggleStep={onToggleStep}
          />
        ))
      )}
    </div>
  );
}

function FullTaskCard({ task, onRemove, onSetStatus, onToggleStep }) {
  const [expanded, setExpanded] = useState(false);
  const badge = KIND_COLORS[task.kind] || KIND_COLORS.idea;
  const stepsDone = task.steps.filter(s => s.done).length;
  const isCompleted = task.status === 'completed';
  const isSnoozed = task.status === 'snoozed';

  return (
    <div style={{
      padding: '10px 10px',
      borderRadius: 14,
      background: isCompleted ? 'rgba(240, 248, 245, 0.6)' : 'rgba(255,255,255,0.54)',
      border: `1px solid ${isCompleted ? 'rgba(170, 210, 200, 0.6)' : 'rgba(209, 198, 183, 0.76)'}`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
      opacity: isSnoozed ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* Tags row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{
              padding: '2px 7px', borderRadius: 999, fontSize: 9,
              color: 'rgba(88, 83, 73, 0.92)', background: badge.bg, border: `1px solid ${badge.border}`,
            }}>
              {KIND_LABELS[task.kind] || task.kind}
            </span>
            {(task.tags || []).map(tag => {
              const ts = TAG_STYLES[tag];
              return ts ? (
                <span key={tag} style={{
                  padding: '1px 6px', borderRadius: 999, fontSize: 8,
                  color: 'rgba(88, 83, 73, 0.7)', background: ts.bg, border: `1px solid ${ts.border}`,
                }}>
                  {tag}
                </span>
              ) : null;
            })}
            {task.steps.length > 0 && (
              <span style={{ ...S.dimText, fontSize: 9 }}>
                {stepsDone}/{task.steps.length}
              </span>
            )}
          </div>

          {/* Title */}
          <p style={{
            ...S.text, fontSize: 12, margin: '0 0 4px', fontWeight: 700, lineHeight: 1.45,
            textDecoration: isCompleted ? 'line-through' : 'none',
            overflowWrap: 'break-word', minWidth: 0,
          }}>
            {task.title}
          </p>

          {/* Duration & Deadline & Cadence */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '0 0 4px' }}>
            {task.estimatedMinutes && (
              <span style={{ ...S.dimText, fontSize: 10 }}>
                {task.estimatedMinutes >= 60
                  ? `${Math.floor(task.estimatedMinutes / 60)}h${task.estimatedMinutes % 60 > 0 ? task.estimatedMinutes % 60 + 'min' : ''}`
                  : `${task.estimatedMinutes}min`}
              </span>
            )}
            {task.deadlineLabel && (
              <span style={{ ...S.dimText, fontSize: 10, color: 'rgba(180, 100, 80, 0.75)' }}>
                截止 {task.deadlineLabel}
              </span>
            )}
            {task.cadenceLabel && (
              <span style={{ ...S.dimText, fontSize: 10 }}>
                {task.cadenceLabel}
              </span>
            )}
          </div>

          {/* Steps preview */}
          {task.steps.length > 0 && !expanded && (
            <div style={{ margin: '2px 0', cursor: 'pointer' }} onClick={() => setExpanded(true)}>
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

          {/* Steps expanded */}
          {task.steps.length > 0 && expanded && (
            <div style={{ margin: '4px 0' }}>
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
                收起
              </p>
            </div>
          )}

          {/* Reminder plan */}
          {task.reminderPlan && (
            <p style={{ ...S.dimText, fontSize: 10, margin: '4px 0 0', lineHeight: 1.5 }}>
              {task.reminderPlan}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          {(isSnoozed || isCompleted) && (
            <button onClick={() => onSetStatus(task.id, 'pending')} style={{
              background: 'rgba(255,245,230,0.8)', border: '1px solid rgba(216, 198, 153, 0.8)',
              cursor: 'pointer', fontSize: 10, padding: '3px 7px', borderRadius: 999, color: 'rgba(140, 110, 50, 0.9)',
            }}>恢复</button>
          )}
          {!isCompleted && (
            <button onClick={() => onSetStatus(task.id, 'completed')} style={{
              background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(170, 210, 200, 0.8)',
              cursor: 'pointer', fontSize: 10, padding: '3px 7px', borderRadius: 999, color: 'rgba(60, 120, 100, 0.9)',
            }}>✓</button>
          )}
          <button onClick={() => onRemove(task.id)} style={{
            background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(208, 197, 182, 0.8)',
            cursor: 'pointer', ...S.dimText, fontSize: 10, padding: '3px 7px', borderRadius: 999,
          }}>✕</button>
        </div>
      </div>
    </div>
  );
}
