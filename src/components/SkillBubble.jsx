import { motion, AnimatePresence } from 'framer-motion';

const S = {
  text: { color: 'rgba(70, 66, 59, 0.94)' },
  dimText: { color: 'rgba(123, 116, 106, 0.84)' },
  card: {
    background: 'rgba(255,255,255,0.62)',
    border: '1px solid rgba(208, 197, 182, 0.76)',
    borderRadius: 14,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)',
  },
  accent: {
    background: 'linear-gradient(180deg, rgba(163, 221, 212, 0.92), rgba(133, 203, 191, 0.96))',
    border: '1px solid rgba(108, 170, 160, 0.88)',
    color: 'rgba(40, 64, 61, 0.94)',
  },
};

const SKILL_META = {
  task_reminder: { icon: '🔔', label: '任务提醒' },
  task_decomposer: { icon: '🧩', label: '任务拆解' },
  plan_generator: { icon: '📋', label: '今日规划' },
  daily_reflection: { icon: '✨', label: '每日总结' },
  research_assistant: { icon: '🔍', label: '调研助手' },
};

export default function SkillBubble({ skillResult, visible, onClose, onAction }) {
  if (!skillResult) return null;

  const { skillId, message, actions, data } = skillResult;
  const meta = SKILL_META[skillId] || { icon: '🐱', label: '陪伴动作' };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-interactive
          drag
          dragMomentum={false}
          dragElastic={0.05}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.16 }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '10%',
            transform: 'translateX(-50%)',
            width: 276,
            background: 'linear-gradient(180deg, rgba(255,249,242,0.96), rgba(246,239,229,0.94))',
            border: '1px solid rgba(204, 193, 176, 0.9)',
            borderRadius: 22,
            boxShadow: '0 18px 42px rgba(92, 76, 53, 0.18), 0 4px 18px rgba(125, 162, 155, 0.18)',
            backdropFilter: 'blur(18px)',
            padding: '14px 14px 12px',
            zIndex: 9999,
            pointerEvents: 'auto',
            cursor: 'grab',
          }}
          whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              background: 'none',
              border: 'none',
              ...S.dimText,
              fontSize: 13,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 2,
            }}
          >
            ✕
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
              paddingBottom: 8,
              borderBottom: '1px dashed rgba(190, 178, 160, 0.7)',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(255,255,255,0.68)',
                border: '1px solid rgba(208, 197, 182, 0.76)',
              }}
            >
              <span style={{ fontSize: 16 }}>{meta.icon}</span>
            </div>
            <div>
              <p style={{ ...S.text, fontSize: 12, fontWeight: 700, margin: 0 }}>{meta.label}</p>
              <p style={{ ...S.dimText, fontSize: 10, margin: '2px 0 0' }}>技能已被触发，正在陪你处理这一刻</p>
            </div>
          </div>

          <p style={{ ...S.text, fontSize: 13, lineHeight: 1.6, margin: '0 0 10px', minHeight: 20 }}>
            {message}
          </p>

          {data?.headlines && (
            <div style={{ ...S.card, padding: '8px 9px', marginBottom: 10 }}>
              {data.headlines.split('\n').filter(line => line.trim()).map((line, i) => (
                <p key={i} style={{ ...S.text, fontSize: 11, lineHeight: 1.55, margin: '2px 0' }}>{line}</p>
              ))}
            </div>
          )}

          {data?.summary && (
            <div style={{ ...S.card, padding: '8px 9px', marginBottom: 10 }}>
              <p style={{ ...S.text, fontSize: 11, lineHeight: 1.55, margin: 0 }}>{data.summary}</p>
            </div>
          )}

          {data?.completionRate !== undefined && (
            <div style={{ ...S.card, padding: '8px 9px', marginBottom: 10 }}>
              <p style={{ ...S.text, fontSize: 11, margin: '0 0 3px' }}>今日习惯完成率 {data.completionRate}%</p>
              <p style={{ ...S.dimText, fontSize: 10, margin: 0 }}>已经完成 {data.habitsDone} 次健康习惯</p>
            </div>
          )}

          {data?.taskTitle && (
            <div style={{ ...S.card, padding: '8px 9px', marginBottom: 10 }}>
              <p style={{ ...S.text, fontSize: 11, lineHeight: 1.55, margin: 0 }}>
                待办：{data.taskTitle}
              </p>
              {data.pendingCount > 1 && (
                <p style={{ ...S.dimText, fontSize: 10, margin: '4px 0 0' }}>
                  还有 {data.pendingCount - 1} 个任务等待处理
                </p>
              )}
            </div>
          )}

          {data?.plan?.sections && (
            <div style={{ ...S.card, padding: '8px 9px', marginBottom: 10 }}>
              {data.plan.sections.map((section, i) => (
                <div key={i} style={{ marginBottom: i < data.plan.sections.length - 1 ? 6 : 0 }}>
                  <p style={{ ...S.dimText, fontSize: 9, margin: '0 0 3px' }}>{section.label}</p>
                  {section.tasks.map((t, j) => (
                    <p key={j} style={{ ...S.text, fontSize: 11, margin: '2px 0', lineHeight: 1.4 }}>
                      {t.title}
                      {t.reason && <span style={{ ...S.dimText, fontSize: 10 }}> — {t.reason}</span>}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}

          {data?.topic && data?.overview && (
            <div style={{ ...S.card, padding: '8px 9px', marginBottom: 10 }}>
              <p style={{ ...S.text, fontSize: 11, fontWeight: 600, margin: '0 0 4px' }}>{data.topic}</p>
              <p style={{ ...S.text, fontSize: 10, lineHeight: 1.5, margin: '0 0 6px' }}>{data.overview}</p>
              {data.keyConcepts?.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {data.keyConcepts.map((c, i) => (
                    <span key={i} style={{
                      padding: '1px 6px', borderRadius: 999, fontSize: 9,
                      background: 'rgba(163, 221, 212, 0.4)',
                      border: '1px solid rgba(108, 170, 160, 0.5)',
                      color: 'rgba(40, 64, 61, 0.8)',
                    }}>{c}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {data?.completedToday && data.completedToday.length > 0 && (
            <div style={{ ...S.card, padding: '8px 9px', marginBottom: 10 }}>
              <p style={{ ...S.dimText, fontSize: 9, margin: '0 0 3px' }}>今日完成</p>
              {data.completedToday.map((t, i) => (
                <p key={i} style={{ ...S.text, fontSize: 11, margin: '2px 0', lineHeight: 1.4 }}>✓ {t.title}</p>
              ))}
              {data.missedToday?.length > 0 && (
                <>
                  <p style={{ ...S.dimText, fontSize: 9, margin: '6px 0 3px' }}>未完成</p>
                  {data.missedToday.map((t, i) => (
                    <p key={i} style={{ ...S.dimText, fontSize: 11, margin: '2px 0', lineHeight: 1.4 }}>○ {t.title}</p>
                  ))}
                </>
              )}
            </div>
          )}

          {actions && actions.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {actions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => onAction(action)}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    borderRadius: 11,
                    fontSize: 11,
                    cursor: 'pointer',
                    textAlign: 'center',
                    ...S.accent,
                  }}
                >
                  {action}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
