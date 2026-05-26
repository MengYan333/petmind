// Skill md 文件的原始内容（Vite 环境下无法直接导入 md，所以内嵌）
const SKILL_MDS = {
  task_reminder: `---
id: task_reminder
name: 任务提醒
description: 根据当前状态和未完成任务，在合适时机主动提醒
priority: 90
triggerType: auto
cooldown: 1800000
---

## 触发条件

- 用户空闲 10 分钟以上，且有未完成任务
- 用户连续使用电脑 2 小时以上
- 用户活跃 30 分钟以上，且有待办任务
- 不在睡眠时段（23:00-07:00）

## 输入

- taskPool: 当前任务池（需要 getTodayTasks 方法）
- sensors: 传感器数据（time, screenMinutes, isIdle, idleMinutes）
- activityLog: 活动日志（用于冷却检查）

## 执行策略

1. 从任务池筛选今日待办任务（status === 'pending'）
2. 按优先级选择目标任务：
   - 优先选高优先级 pending 任务
   - 其次选灵感类 pending 任务
   - 再取第一个 pending 任务
   - 最后取第一个 active 任务
3. 根据上下文生成提醒消息：
   - 空闲场景："你刚休息了一会儿，要不要花点时间{任务名}？"
   - 久坐场景："你已经连续工作很久了，适合做个简单的任务切换"
   - 正常场景："别忘了今天的{任务名}哦～"
4. 生成温暖、简短的提醒（不超过30字）

## 输出格式

- petState: thinking（灵感类任务）或 working（其他任务）
- message: AI 生成的提醒语
- actions: [开始做, 等会儿, 跳过]
- data: { taskTitle, taskId, pendingCount, contextHint }`,

  plan_generator: `---
id: plan_generator
name: 今日规划
description: 从任务池生成今日推荐计划，分配时间段
priority: 80
triggerType: auto
cooldown: 86400000
---

## 任务
从当前任务池中挑选今日该做的任务，分配时间段，生成日程。

## 规则
- 习惯类任务无条件入选
- 只选 deadline 是今天或已过期的 plan/idea
- 没有 deadline 的待办可以选
- 不选 deadline 在明天及以后的任务
- 灵感任务最多选 2 个
- 从当前时间或 9:00 开始排，时间要现实
- 每个任务之间留 10-15 分钟休息

## 第一步：调用 update_memory

必须先调用 update_memory 保存计划数据：

key: "todayPlan"
value:
{
  "timeLabel": "总时长，如 3h30min",
  "sections": [
    {
      "label": "上午",
      "tasks": [
        { "timeLabel": "09:00-10:00", "title": "任务标题" }
      ]
    }
  ]
}

sections 按时段分组：上午(12点前)、下午(12-18点)、晚上(18点后)。
每个 task 的 timeLabel 格式必须是 "HH:MM-HH:MM"。

## 第二步：调用 notify_user

message: 一句鼓励的话（不超过30字）
petState: "news"
actions: ["查看今日计划", "好的"]`,

  task_decomposer: `---
id: task_decomposer
name: 任务拆解
description: 自动将灵感和复杂计划拆解为可执行的步骤
priority: 70
triggerType: auto
cooldown: 1200000
---

## 触发条件

- 每 20 分钟检查一次
- 存在 status === 'pending' 且 (kind === 'idea' 或 kind === 'plan') 且 steps 为空的任务

## 输入

- taskPool: 当前任务池（需要 tasks 数组）
- activityLog: 活动日志（用于冷却检查）

## 执行策略

1. 查找符合条件的任务
   - status === 'pending'
   - kind === 'idea' 或 kind === 'plan'
   - steps 为空或长度为 0

2. 选择目标任务
   - 优先选择最近添加的任务

3. 调用 AI 生成步骤
   - 把目标拆解为 3 个以内具体可执行的步骤
   - 每个步骤要短小明确

4. 更新任务的 steps 字段
   - 格式：[{ id: 1, text: "步骤内容", done: false }]

## 输出格式

- petState: thinking
- message: "帮你想好了「{任务名}」的行动步骤"
- actions: [开始做, 等会儿]
- data: { taskTitle, taskId, steps }`,

  research_assistant: `---
id: research_assistant
name: 调研助手
description: 为用户感兴趣的领域生成结构化调研框架和行动步骤
priority: 60
triggerType: manual
cooldown: 0
---

## 触发条件

- 仅通过对话手动触发
- 检测到调研意图：调研、研究、了解一下、帮我看看、搜索、查一下、学习

## 输入

- topic: 调研主题（字符串）
- taskPool: 当前任务池（用于自动创建任务）

## 执行策略

1. 生成调研框架
   - overview: 一句话说明这是什么
   - keyConcepts: 核心概念（最多5个）
   - steps: 调研步骤（最多5个，要具体可执行）
   - resources: 推荐资源方向（最多3个）
   - summary: 一句话总结调研建议

2. 自动创建任务
   - 标题：调研：{主题}
   - 类型：idea
   - 优先级：medium
   - 标签：[工作]
   - 步骤：使用生成的 steps
   - 预估时长：120 分钟

## 输出格式

- petState: thinking
- message: summary（一句话总结）
- actions: [查看任务, 好的]
- data: { topic, overview, keyConcepts, steps, resources }`,

  daily_reflection: `---
id: daily_reflection
name: 每日总结
description: 晚间分析今日任务完成情况，生成结构化总结
priority: 10
triggerType: auto
cooldown: 86400000
---

## 触发条件

- 时间在 21:00-23:00 之间
- 每天只触发一次
- 今日至少有 2 次活动记录

## 输入

- taskPool: 当前任务池（需要 getTodayTasks, getTodayStats 方法）
- sensors: 传感器数据（time）
- activityLog: 活动日志（用于冷却检查和活动统计）

## 执行策略

### 目标
晚间回顾今日表现，帮助用户看到进展、发现模式、获得明天的建议。

### 约束
- 统计今日完成率（已完成/总推荐数）
- 对未完成的任务给出简要分析（为什么可能没做，建议如何处理）
- 评估今日效率：时间利用是否合理，是否有任务被拖延
- 如果最近几天有每日总结，分析行为模式（如"连续3天探索AI相关内容"）
- 给出明天的具体建议（哪些任务明天继续，优先做什么）
- 总结语要有洞察力，不是简单复述数据（不超过100字）
- 语调温暖、鼓励，避免批判

## 输出格式

- petState: happy
- message: AI 生成的总结语（有洞察力，不超过100字）
- actions: [谢谢总结]
- data: { completedToday, missedToday, totalTasks, completionRate, efficiencyNote, pattern, tomorrowSuggestion }
- memoryUpdate: { dailyDigest: { completedTasks, missedTasks, completionRate, weeklyCompleted, summary, efficiencyNote, pattern, tomorrowSuggestion } }`,

  intent_parser: `---
id: intent_parser
name: 意图理解
description: 将自然语言解析为结构化任务，包含意图识别和步骤拆解
priority: 0
triggerType: manual
cooldown: 0
---

## 触发条件

- 仅通过手动触发（用户输入任务时）

## 输入

- input: 用户的自然语言输入（字符串）
- 当前日期（用于计算 deadline）

## 执行策略

1. 解析意图
   - 根据关键词判断类型（kind）：
     - 提醒/别忘了/记得/要交/要带 → reminder
     - 每天/每周 → habit
     - 具体时间安排 → plan
     - 探索/研究/了解/试试 → idea
   - reminder 类型：deadline 必须提取，默认 priority=high，不生成 steps
   - 根据紧急程度判断优先级（priority）
   - 根据内容推断标签（tags）：仅限"工作"或"生活"，不要添加"习惯"或"灵感"（它们已由 kind 表示）

2. 拆解步骤
   - idea 类型：拆解 3-5 个具体步骤
   - habit/plan 类型：拆解 2-3 个步骤
   - 步骤要具体可执行

3. 估算时长（必须填，用户没说就自己判断）
   - 打电话/发邮件/发消息：20 分钟
   - 洗衣/做饭/打扫/整理：45 分钟
   - 学习/锻炼/阅读/练习：90 分钟
   - 开发/研究/探索/调研：150 分钟
   - 搬家/大扫除/复杂项目：180 分钟
   - 其他：根据任务复杂度自行判断，最少 15 分钟

4. 解析截止日期（必须填，用户没说就自己判断）
   - 用户明确说了时间：按用户说的算（明天、后天、本周五、周末、本月底等）
   - reminder 类型没说时间：默认今天
   - plan 类型没说时间：默认明天
   - idea 类型没说时间：默认本周内（本周日）
   - 明天 → today + 1天
   - 后天 → today + 2天
   - 本周X → 计算到本周X的天数差
   - 周末 → 本周六
   - 本月底 → 当月最后一天

## 输出格式

- petState: thinking
- message: "理解了「{标题}」"
- actions: []
- data: { title, kind, priority, tags, steps, estimatedMinutes, deadline, deadlineLabel, cadence, cadenceLabel, scheduleSummary, reminderPlan }`,

  chat: `---
id: chat
name: 对话助手
description: 与用户自然对话，理解意图并自主调用工具完成任务
priority: 0
triggerType: manual
cooldown: 0
---

## 触发条件

- 用户在对话框输入任何内容

## 执行策略

### 目标
与用户自然对话，理解意图并调用工具完成任务。

### 约束
- 识别用户意图：日常聊天、任务管理、主题调研、资源整理
- 需要信息时主动搜索（search_topic, search_youtube），不要只说"我不确定"
- 需要创建/修改任务时直接调用工具，不要只回复"好的我知道了"
- 搜索结果要整理成结构化信息，包含链接
- 回复要有用、详细但不冗长
- 用户表达偏好时（"我喜欢..."、"我更习惯..."），用 update_memory 保存
- 用户说"不做这个"/"改成下周五"等修改指令时，立即调用 update_task/set_task_status
- 可以连续调用多个工具完成复杂任务

## 输出格式

- reply: AI 的回复内容`,

  priority_decision: `---
id: priority_decision
name: 优先级决策
description: 综合分析任务池和当前状态，推荐用户现在应该做什么
priority: 50
triggerType: manual
cooldown: 0
---

## 执行策略

### 目标
分析所有待办任务，结合当前时间、用户状态、任务属性，推荐"现在最应该做的一件事"以及整体优先级排序。

### 约束
- 综合考虑：任务 priority、kind、deadline 近度、estimatedMinutes、当前时间
- 习惯类任务有固定价值，不应总是排在最后
- 如果有接近截止日期的任务，应显著提高其优先级
- 考虑当前时段适合做什么（上午精力好做高难度任务，下午做轻松的）
- 推荐的任务要能在合理时间内完成（不要在晚上10点推荐3小时任务）
- 给出推荐理由，让用户理解排序逻辑

## 输出格式

- petState: thinking
- message: "推荐你现在做：{任务名}（理由）"
- actions: [开始做, 等会儿]
- data: { recommended: { taskId, title, reason }, ranking: [{ taskId, title, score, reason }], reasoning }`
};

export class SkillLoader {
  constructor() {
    this.skills = new Map();
  }

  loadAll() {
    for (const [id, md] of Object.entries(SKILL_MDS)) {
      const parsed = this.parse(md);
      this.skills.set(id, parsed);
    }
    return this.skills;
  }

  parse(md) {
    const lines = md.split('\n');
    const frontmatter = {};
    const sections = {};
    let currentSection = null;
    let currentContent = [];

    for (const line of lines) {
      // 解析 frontmatter
      if (line === '---') {
        if (Object.keys(frontmatter).length === 0) {
          currentSection = 'frontmatter';
        } else {
          currentSection = null;
        }
        continue;
      }

      if (currentSection === 'frontmatter') {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          let value = match[2].trim();
          // 转换数字
          if (/^\d+$/.test(value)) value = parseInt(value);
          // 转换布尔
          if (value === 'true') value = true;
          if (value === 'false') value = false;
          frontmatter[match[1]] = value;
        }
        continue;
      }

      // 解析 sections
      if (line.startsWith('## ')) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = line.replace('## ', '').trim();
        currentContent = [];
        continue;
      }

      if (currentSection) {
        currentContent.push(line);
      }
    }

    // 保存最后一个 section
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return {
      ...frontmatter,
      intent: sections['意图'] || '',
      triggerConditions: this.parseList(sections['触发条件']),
      behaviorGuide: sections['行为指引'] || '',
      executionStrategy: sections['执行策略'] || '',
      outputFormat: sections['输出格式'] || ''
    };
  }

  parseList(text) {
    if (!text) return [];
    return text.split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim());
  }
}
