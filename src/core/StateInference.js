export function inferState(sensors, activityLog, memory, taskPool) {
  const { time, screenMinutes, isIdle, idleMinutes } = sensors;

  const pendingTasks = taskPool ? taskPool.getTodayTasks().filter(t => t.status === 'pending') : [];
  const ideaTasks = pendingTasks.filter(t => t.kind === 'idea');

  const rules = [
    {
      id: 'sleeping',
      score: 100,
      test: () => time.hour >= 23 || time.hour < 7,
      primary: 'sleeping',
      secondary: null,
      reason: () => `现在是 ${time.hour} 点，属于睡眠时段`,
    },
    {
      id: 'deep_work',
      score: 90,
      test: () => screenMinutes >= 90 && !isIdle,
      primary: 'working',
      secondary: 'deep_work',
      reason: () => `你已经连续使用电脑 ${screenMinutes} 分钟，没有休息`,
    },
    {
      id: 'break_needed',
      score: 85,
      test: () => screenMinutes >= 120,
      primary: 'working',
      secondary: 'break_needed',
      reason: () => `屏幕时间已达 ${screenMinutes} 分钟，建议休息`,
    },
    {
      id: 'idle_with_tasks',
      score: 80,
      test: () => isIdle && idleMinutes >= 10 && pendingTasks.length > 0,
      primary: 'idle',
      secondary: 'has_tasks',
      reason: () => `你已空闲 ${idleMinutes} 分钟，还有 ${pendingTasks.length} 个待办任务`,
    },
    {
      id: 'idle',
      score: 75,
      test: () => isIdle && idleMinutes >= 10,
      primary: 'idle',
      secondary: null,
      reason: () => `你已空闲 ${idleMinutes} 分钟`,
    },
    {
      id: 'has_ideas',
      score: 60,
      test: () => ideaTasks.length > 0 && screenMinutes >= 10 && !isIdle,
      primary: 'working',
      secondary: 'has_ideas',
      reason: () => `你正在使用电脑，有 ${ideaTasks.length} 个灵感等待探索`,
    },
    {
      id: 'working',
      score: 10,
      test: () => screenMinutes >= 3 && !isIdle,
      primary: 'working',
      secondary: null,
      reason: () => `你正在使用电脑（${screenMinutes} 分钟）`,
    },
  ];

  const matched = rules
    .filter(r => r.test())
    .sort((a, b) => b.score - a.score)[0];

  if (!matched) {
    return {
      primary: 'idle', secondary: null, confidence: 0.5, signals: [],
      matchedRule: null, reason: '没有匹配到任何规则，处于待机状态',
      evaluatedRules: rules.map(r => ({ id: r.id, matched: false })),
    };
  }

  const signals = [];
  if (screenMinutes > 0) signals.push({ key: 'screenMinutes', value: screenMinutes });
  if (isIdle) signals.push({ key: 'isIdle', value: true });
  if (idleMinutes > 0) signals.push({ key: 'idleMinutes', value: idleMinutes });
  signals.push({ key: 'hour', value: time.hour });
  if (pendingTasks.length > 0) signals.push({ key: 'pendingTasks', value: pendingTasks.length });
  if (ideaTasks.length > 0) signals.push({ key: 'ideaTasks', value: ideaTasks.length });

  return {
    primary: matched.primary,
    secondary: matched.secondary,
    confidence: matched.score / 100,
    signals,
    matchedRule: matched.id,
    reason: matched.reason(),
    evaluatedRules: rules.map(r => ({
      id: r.id,
      matched: r.test(),
      score: r.score,
    })),
  };
}

export const RULE_LABELS = {
  sleeping: '睡眠时段',
  deep_work: '深度工作',
  break_needed: '需要休息',
  idle_with_tasks: '空闲且有任务',
  idle: '空闲状态',
  has_ideas: '有灵感可探索',
  working: '正常工作',
};

export const STATE_LABELS = {
  working: '专注中',
  idle: '空闲中',
  sleeping: '睡眠时间',
};

export const SECONDARY_LABELS = {
  deep_work: '连续工作很久了',
  break_needed: '该休息一下',
  has_tasks: '有未完成的任务',
  has_ideas: '有灵感可以探索',
};

const VALID_PRIMARY = ['working', 'idle', 'sleeping'];
const VALID_SECONDARY = [null, 'deep_work', 'break_needed', 'has_tasks', 'has_ideas'];

export async function inferStateAsync(sensors, activityLog, memory, taskPool) {
  const { STATE_INFERENCE_MD } = await import('./StateInferencePrompt.js');
  const { callAI } = await import('../services/claudeAgent.js');

  const { time, screenMinutes, isIdle, idleMinutes } = sensors;
  const pendingTasks = taskPool ? taskPool.getTodayTasks().filter(t => t.status === 'pending') : [];
  const ideaTasks = pendingTasks.filter(t => t.kind === 'idea');

  const userMessage = `## 当前信号

时间: ${time.hour}:${String(time.minute).padStart(2, '0')}
屏幕使用: ${screenMinutes} 分钟
是否空闲: ${isIdle ? '是' : '否'}
空闲时长: ${idleMinutes} 分钟
待办任务数: ${pendingTasks.length}
灵感任务数: ${ideaTasks.length}`;

  try {
    const response = await callAI({
      messages: [
        { role: 'system', content: STATE_INFERENCE_MD },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 300,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(content);

    if (!VALID_PRIMARY.includes(parsed.primary)) {
      throw new Error(`Invalid primary: ${parsed.primary}`);
    }
    if (!VALID_SECONDARY.includes(parsed.secondary)) {
      throw new Error(`Invalid secondary: ${parsed.secondary}`);
    }

    return {
      primary: parsed.primary,
      secondary: parsed.secondary || null,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
      reason: String(parsed.reason || ''),
      source: 'ai',
    };
  } catch (e) {
    console.warn('[StateInference] AI inference failed, falling back to rules:', e.message);
    const fallback = inferState(sensors, activityLog, memory, taskPool);
    fallback.source = 'rule';
    return fallback;
  }
}
