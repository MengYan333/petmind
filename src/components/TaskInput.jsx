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

const TAG_STYLES = {
  '工作': { bg: 'rgba(230, 240, 255, 0.9)', border: 'rgba(150, 185, 220, 0.7)' },
  '生活': { bg: 'rgba(255, 245, 230, 0.9)', border: 'rgba(220, 195, 150, 0.7)' },
};

const ALL_TAGS = ['工作', '生活'];

export default function TaskInput({ onAdd, onBack, onParse }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  async function handleParse() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const result = await onParse(text);
      if (result?.data) {
        let taskData = result.data;
        // 兼容：如果 data 是 {toolCalls: [{name:'add_task', args:{...}}]} 格式，提取 add_task 的 args
        if (taskData.toolCalls && Array.isArray(taskData.toolCalls)) {
          const addTask = taskData.toolCalls.find(t => t.name === 'add_task');
          if (addTask?.args) taskData = addTask.args;
        }
        setPreview({ rawText: text, ...taskData });
      } else {
        setPreview(null);
      }
    } catch {
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  function handleConfirm() {
    if (!preview) return;
    onAdd(preview);
    setInput('');
    setPreview(null);
  }

  function handleEdit() {
    setPreview(null);
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (preview) handleConfirm();
      else handleParse();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
      {/* Back button */}
      {onBack && (
        <button onClick={onBack} style={{
          ...S.card, ...S.dimText, padding: '6px 10px', borderRadius: 10, fontSize: 10,
          cursor: 'pointer', alignSelf: 'flex-start',
        }}>
          ← 返回任务列表
        </button>
      )}

      {/* Input area */}
      <div style={{ ...S.card, padding: '10px' }}>
        <p style={{ ...S.dimText, fontSize: 10, margin: '0 0 8px' }}>
          用自然语言写下你的想法，AI 会帮你理解并拆解
        </p>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="例如：我想探索垂类 Agent / 每天提醒我学多邻国 / 周六洗衣服"
          style={{
            width: '100%', boxSizing: 'border-box', minHeight: 72, resize: 'none',
            padding: '8px 9px', borderRadius: 10, fontSize: 11,
            background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(208,197,182,0.78)',
            color: 'rgba(72, 66, 58, 0.94)', outline: 'none',
          }}
        />
      </div>

      {/* Parse button (when no preview) */}
      {!preview && (
        <button onClick={handleParse} disabled={busy || !input.trim()} style={{
          width: '100%', padding: '8px 0', borderRadius: 12, fontSize: 11,
          cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
          opacity: busy || !input.trim() ? 0.55 : 1,
          ...S.accent, border: '1px solid rgba(108, 170, 160, 0.88)',
        }}>
          {busy ? '正在理解...' : '理解这句话'}
        </button>
      )}

      {/* Preview card (after parsing) */}
      {preview && (
        <div style={{ ...S.card, padding: '12px' }}>
          <p style={{ ...S.dimText, fontSize: 10, marginBottom: 6 }}>AI 理解的结果：</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{
              padding: '2px 8px', borderRadius: 999, fontSize: 9,
              color: 'rgba(88, 83, 73, 0.92)',
              background: 'rgba(255, 247, 230, 0.9)',
              border: '1px solid rgba(216, 198, 153, 0.72)',
            }}>
              {KIND_LABELS[preview.kind] || preview.kind}
            </span>
            {preview.priority && (
              <span style={{ ...S.dimText, fontSize: 9 }}>
                优先级: {preview.priority === 'high' ? '高' : preview.priority === 'low' ? '低' : '中'}
              </span>
            )}
          </div>

          <p style={{ ...S.text, fontSize: 13, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.4 }}>
            {preview.title}
          </p>

          <div style={{ display: 'flex', gap: 12, margin: '0 0 6px' }}>
            {preview.estimatedMinutes && (
              <p style={{ ...S.dimText, fontSize: 10, margin: 0 }}>
                预估 {preview.estimatedMinutes >= 60
                  ? `${Math.floor(preview.estimatedMinutes / 60)}小时${preview.estimatedMinutes % 60 > 0 ? preview.estimatedMinutes % 60 + '分钟' : ''}`
                  : `${preview.estimatedMinutes}分钟`}
              </p>
            )}
            {preview.deadlineLabel && (
              <p style={{ ...S.dimText, fontSize: 10, margin: 0, color: 'rgba(180, 100, 80, 0.8)' }}>
                截止 {preview.deadlineLabel}
              </p>
            )}
          </div>
          {preview.cadenceLabel && (
            <p style={{ ...S.dimText, fontSize: 10, margin: '0 0 4px' }}>
              节奏：{preview.cadenceLabel}
            </p>
          )}

          {preview.reminderPlan && (
            <p style={{ ...S.text, fontSize: 10, margin: '0 0 8px', lineHeight: 1.5 }}>
              {preview.reminderPlan}
            </p>
          )}

          {/* Steps */}
          {preview.steps && preview.steps.length > 0 && (
            <div style={{ margin: '6px 0 10px' }}>
              <p style={{ ...S.dimText, fontSize: 10, marginBottom: 4 }}>拆解步骤：</p>
              {preview.steps.map((step, i) => (
                <p key={i} style={{ ...S.text, fontSize: 10, margin: '3px 0', paddingLeft: 8, lineHeight: 1.5 }}>
                  {i + 1}. {typeof step === 'string' ? step : step.text}
                </p>
              ))}
            </div>
          )}

          {/* Tags */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {ALL_TAGS.map(tag => {
              const active = preview.tags?.includes(tag);
              const style = TAG_STYLES[tag];
              return (
                <span
                  key={tag}
                  onClick={() => {
                    const next = active
                      ? preview.tags.filter(t => t !== tag)
                      : [...(preview.tags || []), tag];
                    setPreview({ ...preview, tags: next });
                  }}
                  style={{
                    padding: '2px 8px', borderRadius: 999, fontSize: 9, cursor: 'pointer',
                    color: active ? 'rgba(55, 50, 45, 0.9)' : 'rgba(140, 132, 120, 0.6)',
                    background: active ? style.bg : 'rgba(245, 242, 238, 0.5)',
                    border: `1px solid ${active ? style.border : 'rgba(210, 204, 194, 0.4)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  {tag}
                </span>
              );
            })}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleConfirm} style={{
              flex: 1, ...S.accent, padding: '7px 0', borderRadius: 10, fontSize: 11,
              cursor: 'pointer', border: '1px solid rgba(108, 170, 160, 0.88)',
            }}>
              确认添加
            </button>
            <button onClick={handleEdit} style={{
              flex: 1, ...S.card, ...S.dimText, padding: '7px 0', borderRadius: 10, fontSize: 11,
              cursor: 'pointer',
            }}>
              修改
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
