import { inferState, inferStateAsync } from './StateInference.js';
import { SkillLoader } from './SkillLoader.js';
import { agentStep } from '../services/claudeAgent.js';
import { TOOL_DEFINITIONS } from './AgentTools.js';

export class SkillManager {
  constructor() {
    this.skills = new Map();
    this.loader = new SkillLoader();
  }

  loadFromMd() {
    const skills = this.loader.loadAll();
    for (const [id, skill] of skills) {
      this.skills.set(id, skill);
    }
  }

  async runLoop(sensors, activityLog, memory, onLog = () => {}, taskPool = null) {
    onLog({ type: 'info', text: '🔍 观察环境信号...' });

    // 1. 感知
    let inferredState;
    try {
      inferredState = await inferStateAsync(sensors, activityLog, memory, taskPool);
    } catch {
      inferredState = inferState(sensors, activityLog, memory, taskPool);
    }
    onLog({ type: 'info', text: `🧠 状态推断: ${inferredState.primary}${inferredState.secondary ? '/' + inferredState.secondary : ''} (${Math.round(inferredState.confidence * 100)}%)` });

    // 2. 构建上下文
    const context = { sensors, inferredState, activityLog, memory, taskPool };
    const contextMessage = this.buildContextMessage(sensors, inferredState, taskPool);

    // 3. 加载所有 skill 定义
    const skillDescriptions = Array.from(this.skills.values())
      .filter(s => s.triggerType === 'auto')
      .map(s => `- ${s.name} (${s.id}): ${s.description}`)
      .join('\n');

    const systemPrompt = `你是 PetMind 桌面 AI Agent。你可以通过调用工具来完成任务。

## 可用技能
${skillDescriptions}

## 可用工具
### 任务管理
- add_task: 创建新任务
- update_task: 更新任务
- set_task_status: 设置任务状态
- get_tasks: 获取任务列表
- toggle_step: 切换步骤完成状态

### 搜索与文档
- search_topic: 搜索主题相关信息
- search_youtube: 在 YouTube 上搜索视频，返回视频链接
- generate_document: 生成技术文档保存到本地
- collect_resources: 整理学习资源链接

### 记忆与日志
- update_memory: 更新用户偏好
- get_memory: 获取用户偏好
- log_activity: 记录活动事件

### 通知
- notify_user: 向用户发送通知

## 当前环境
${contextMessage}

## 你的职责
1. 根据环境状态和用户需求，决定是否需要采取行动
2. 如果需要，选择合适的工具来执行
3. 可以连续调用多个工具来完成复杂任务
4. 每次行动后观察结果，决定是否需要继续
5. 使用 notify_user 工具向用户发送通知
6. 用户想了解某个主题时，使用 search_youtube 搜索视频链接，然后 collect_resources 整理给用户
7. 如果需要生成文档，使用 generate_document

## 注意事项
- 回复简洁，消息不超过30字
- 只在真正需要时才采取行动
- 尊重用户的作息时间（23:00-07:00不打扰）
- 搜索到的链接要整理给用户`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请评估当前状态，决定是否需要采取行动。如果不需要，回复"无需行动"。' }
    ];

    // 4. 执行 agent 循环
    onLog({ type: 'info', text: '🤖 Agent 开始推理...' });

    let result;
    try {
      result = await agentStep(messages, TOOL_DEFINITIONS, context, 5);
    } catch (e) {
      onLog({ type: 'info', text: `❌ Agent 执行失败: ${e.message}` });
      return null;
    }

    onLog({ type: 'info', text: `🔄 Agent 完成 ${result.iterations} 轮推理` });

    // 5. 记录工具调用
    for (const tc of result.toolCalls) {
      onLog({ type: 'decision', text: `🔧 调用工具: ${tc.name}` });
    }

    // 6. 处理结果
    const processed = this.processResult(result, inferredState);

    if (processed) {
      onLog({ type: 'decision', text: `✅ 输出: ${processed.message}` });
    } else {
      onLog({ type: 'info', text: '💤 无需行动，不显示弹窗' });
    }

    return processed;
  }

  buildContextMessage(sensors, inferredState, taskPool) {
    const todayTasks = taskPool?.getTodayTasks() || [];
    const taskSummary = todayTasks.map(t => {
      const steps = t.steps?.map(s => `${s.done ? '✓' : '○'} ${s.text}`).join(', ') || '无步骤';
      return `- ${t.title} (${t.kind}, ${t.status}, ${t.priority}): ${steps}`;
    }).join('\n') || '无任务';

    const stats = taskPool?.getTodayStats() || { total: 0, completed: 0, pending: 0, active: 0 };

    return `时间：${sensors.time.hour}:${String(sensors.time.minute).padStart(2, '0')}
屏幕使用：${sensors.screenMinutes} 分钟
是否空闲：${sensors.isIdle ? '是' : '否'}
空闲时长：${sensors.idleMinutes} 分钟
推断状态：${inferredState.primary}${inferredState.secondary ? '/' + inferredState.secondary : ''}
信心度：${Math.round(inferredState.confidence * 100)}%

今日统计：${stats.total} 个任务，已完成 ${stats.completed} 个
今日任务：
${taskSummary}`;
  }

  processResult(result, inferredState) {
    // 从所有 update_memory 工具调用中提取 memoryUpdate
    const memoryUpdate = {};
    for (const tc of result.toolCalls) {
      if (tc.name === 'update_memory' && tc.args?.key && tc.args?.value !== undefined) {
        memoryUpdate[tc.args.key] = tc.args.value;
      }
    }
    const hasMemoryUpdate = Object.keys(memoryUpdate).length > 0;

    // 查找 add_task 工具调用（用于意图解析）— 必须在 notify_user 之前检查
    const addTaskCall = result.toolCalls.find(t => t.name === 'add_task');

    // 查找 notify_user 工具调用
    const notifyCall = result.toolCalls.find(t => t.name === 'notify_user');

    // 如果同时有 add_task 和 notify_user，优先返回 add_task 数据（意图解析场景）
    if (addTaskCall) {
      return {
        petState: notifyCall?.args?.petState || 'normal',
        message: notifyCall?.args?.message || result.reply || '已理解任务',
        actions: notifyCall?.args?.actions || [],
        data: addTaskCall.args,
        memoryUpdate: hasMemoryUpdate ? memoryUpdate : null,
        inferredState
      };
    }

    if (notifyCall) {
      return {
        petState: notifyCall.args.petState || 'normal',
        message: notifyCall.args.message,
        actions: notifyCall.args.actions || [],
        data: {
          toolCalls: result.toolCalls.map(tc => ({
            name: tc.name,
            args: tc.args
          }))
        },
        memoryUpdate: hasMemoryUpdate ? memoryUpdate : null,
        inferredState
      };
    }

    // 如果没有 notify_user，但有其他工具调用，返回汇总信息
    if (result.toolCalls.length > 0) {
      return {
        petState: 'normal',
        message: result.reply || '已完成操作',
        actions: [],
        data: {
          toolCalls: result.toolCalls.map(tc => ({
            name: tc.name,
            args: tc.args
          }))
        },
        memoryUpdate: hasMemoryUpdate ? memoryUpdate : null,
        inferredState
      };
    }

    // 没有工具调用，检查是否是"无需行动"
    const reply = result.reply || '';
    const noActionPhrases = ['无需行动', '不需要', '不需要行动', '没有需要', '不需要采取', '保持现状'];
    const isNoAction = noActionPhrases.some(phrase => reply.includes(phrase));

    if (isNoAction) {
      // 无需行动，返回 null 表示不显示弹窗
      return null;
    }

    // 有回复但没有工具调用，返回回复（可能是用户对话）
    if (reply) {
      return {
        petState: 'normal',
        message: reply,
        actions: [],
        data: {},
        memoryUpdate: null,
        inferredState
      };
    }

    return null;
  }

  // 手动执行 skill
  async executeSkill(skillId, context, ...args) {
    const skill = this.skills.get(skillId);
    if (!skill) throw new Error(`Skill not found: ${skillId}`);

    const { sensors, activityLog, memory, taskPool } = context;
    let currentState;
    try {
      currentState = await inferStateAsync(sensors, activityLog, memory, taskPool);
    } catch {
      currentState = inferState(sensors, activityLog, memory, taskPool);
    }
    const contextMessage = this.buildContextMessage(sensors, currentState, taskPool);

    const systemPrompt = `你是 PetMind 桌面 AI Agent。你可以通过调用工具来完成任务。

## 当前任务
${skill.name}: ${skill.description}

## 执行指引
${skill.executionStrategy || '根据任务描述自主决定如何执行'}

## 当前环境
${contextMessage}

## 可用工具
- add_task: 创建新任务
- update_task: 更新任务
- set_task_status: 设置任务状态
- get_tasks: 获取任务列表
- update_memory: 更新用户偏好
- get_memory: 获取用户偏好
- log_activity: 记录活动事件
- search_topic: 搜索主题信息
- search_youtube: 搜索 YouTube 视频
- collect_resources: 整理资源链接
- generate_document: 生成文档
- notify_user: 向用户发送通知

## 注意事项
- 根据任务需要自主选择工具
- 回复要有用、结构化
- 必须调用 notify_user 向用户展示结果（消息不超过30字，附上操作按钮）
- 如果生成了计划/总结/文档等数据，必须调用 update_memory 保存（如 key="todayPlan"）
- 不要只返回文字，必须通过工具执行动作`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: args[0] || '请执行当前任务。' }
    ];

    const result = await agentStep(messages, TOOL_DEFINITIONS, context, 5);
    return this.processResult(result, currentState);
  }

  async executeChat(userMessage, history, context) {
    const { sensors, activityLog, memory, taskPool } = context;
    const skill = this.skills.get('chat');

    const tasks = taskPool ? taskPool.getTodayTasks() : [];
    const taskSummary = tasks.length > 0
      ? tasks.map(t => `- ${t.title} (${t.kind}, ${t.status}, ${t.priority})`).join('\n')
      : '无任务';

    const currentState = await inferStateAsync(sensors, activityLog, memory, taskPool).catch(() => inferState(sensors, activityLog, memory, taskPool));
    const contextMessage = this.buildContextMessage(sensors, currentState, taskPool);

    const systemPrompt = `你是 PetMind 桌面 AI Agent。你通过对话帮助用户管理任务和生活。

## 当前任务池
${taskSummary}

## 执行指引
${skill ? skill.executionStrategy : '与用户自然对话，理解意图并调用工具完成任务。'}

## 当前环境
${contextMessage}

## 可用工具
- add_task: 创建新任务
- update_task: 更新任务
- set_task_status: 设置任务状态
- get_tasks: 获取任务列表
- update_memory: 更新用户偏好
- get_memory: 获取用户偏好
- log_activity: 记录活动事件
- search_topic: 搜索主题信息
- search_youtube: 搜索 YouTube 视频
- collect_resources: 整理资源链接
- generate_document: 生成文档
- notify_user: 向用户发送通知

## 注意事项
- 回复要有用、结构化，不要太短
- 用户想调研/研究某个主题时，主动搜索相关信息
- 搜索到的链接要整理给用户`;

    const pastMsgs = (history || []).slice(-6).map(m => ({
      role: m.role === 'pet' ? 'assistant' : 'user',
      content: m.text || m.content,
    }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...pastMsgs,
      { role: 'user', content: userMessage },
    ];

    const result = await agentStep(messages, TOOL_DEFINITIONS, context, 3);
    return this.processResult(result, currentState);
  }
}
