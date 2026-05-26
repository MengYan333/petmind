# PetMind — 桌面 AI Agent 项目文档

## 项目概述

PetMind 是一个桌面 AI Agent 产品，形态是一只住在用户桌面上的猫咪。它不是聊天机器人，也不是待办清单工具，而是一个能主动感知用户状态、自主规划一天、在合适的时间提醒用户做事的 Agent。

**核心价值：** 用户只需要用自然语言说出想法，Agent 负责理解意图、拆解步骤、安排日程、主动提醒。用户不需要管理工具，工具自己管理自己。

---

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端框架 | React 19 + Vite 8 | UI 渲染和构建 |
| 动画 | Framer Motion 12 | 猫咪动画、面板过渡、气泡效果 |
| 桌面壳 | Electron 42 | 透明窗口、系统托盘、跨桌面置顶 |
| AI 服务 | OpenAI SDK 6 + DashScope (qwen3.5-plus-2026-04-20) | 意图理解、任务拆解、对话协商、计划生成 |
| 样式 | Inline Style（无 CSS 框架） | 奶油纸片感视觉风格 |
| 数据持久化 | localStorage | 任务池、记忆、活动日志 |

**AI 服务配置：**
```javascript
// 环境变量
VITE_AI_API_KEY=your_api_key
VITE_AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VITE_AI_MODEL=qwen3.5-plus-2026-04-20

// OpenAI SDK 配置
const client = new OpenAI({
  apiKey: import.meta.env.VITE_AI_API_KEY,
  baseURL: import.meta.env.VITE_AI_BASE_URL,
  dangerouslyAllowBrowser: true,  // 允许在浏览器中使用
});
```

**AI 调用场景：**
| 函数 | 用途 | max_tokens | temperature |
|------|------|------------|-------------|
| `generatePetMessage(prompt)` | 生成猫咪的简短回复 | 80 | 默认 |
| `chatWithAgent(message, history, tasks)` | 对话协商，返回结构化 actions | 200 | 0.3 |
| `generateContent(prompt, maxTokens)` | 通用内容生成 | 300 | 默认 |
| `researchTopic(topic)` | 生成调研框架 | 400 | 默认 |
| `parseTask(input)` | 意图解析（IntentParser Skill） | 400 | 默认 |

**所有 AI 调用都使用 `enable_thinking: false` 参数，禁用思考模式以加快响应速度。**

---

## 产品功能

### 1. 自然语言输入

用户在任务输入框中用自然语言描述想法，系统通过 AI 理解意图并解析为结构化任务。

**输入示例：**
- "今天探索 Subagent" → 灵感类、低优先级、工作标签、2小时、自动拆解3个步骤
- "这周要把搬家的行李收拾好寄出" → 灵感类、生活标签、3小时、截止本周末
- "明天和朋友去颐和园" → 灵感类、生活标签、4小时、截止明天
- "每天学多邻国" → 习惯类、习惯标签、30分钟、每天一次
- "周六洗衣服" → 安排类、生活标签、45分钟、截止周六

**解析流程（IntentParser Skill）：**
```
1. 用户输入自然语言
   ↓
2. 构造 AI Prompt（包含当前日期）
   ↓
3. 调用 AI 模型（qwen3.5-plus-2026-04-20）解析
   ↓
4. 解析 JSON 响应
   ↓
5. 如果 AI 失败，回退到本地规则引擎
   ↓
6. 返回结构化任务数据
```

**AI Prompt 结构：**
```javascript
const prompt = `你是一个任务解析器。当前日期：${dateStr}。

用户输入："${input}"

请解析为JSON：
{
  "title": "简短标题（不超过15字）",
  "kind": "habit|plan|idea",
  "priority": "high|medium|low",
  "tags": ["工作|生活|习惯|灵感"],
  "steps": ["步骤1","步骤2","步骤3"],
  "estimatedMinutes": 数字,
  "deadline": 数字或null（毫秒时间戳，根据当前日期计算）,
  "deadlineLabel": "截止日期的文字描述或null",
  "cadence": {"type": "daily|weekly|once", "day": 数字或null},
  "cadenceLabel": "节奏说明",
  "scheduleSummary": "时间安排一句话",
  "reminderPlan": "提醒方式一句话"
}

规则：
- kind：每天/每周的习惯用habit，有具体时间的安排用plan，探索/研究/了解/试试用idea
- tags从工作、生活、习惯、灵感中选，可多选
- idea类型必须拆解3-5个具体步骤，步骤要具体可执行
- deadline根据当前日期计算
- estimatedMinutes根据任务类型估算
- 只返回JSON`;
```

**本地规则引擎（fallbackParse）：**

当 AI 调用失败时，使用正则表达式和规则进行解析：

```javascript
// 1. 类型推断
hasDaily = /每天|每日/.test(text)           // → habit
hasWeekly = /每周|周[一二三四五六日天]/.test(text)  // → habit
hasOnce = /这周|周末|明天|今晚|今天|下周/.test(text)  // → idea
isExploratory = /探索|研究|调研|了解|试试/.test(text) // → idea

// 2. 优先级推断
/别忘|紧急|重要|必须/.test(text) → high
/探索|试试|了解|看看|灵感/.test(text) → low
其他 → medium

// 3. 标签推断
/代码|编程|开发|工作/.test(text) → ['工作']
/打扫|洗衣|买菜|做饭/.test(text) → ['生活']
/每天|习惯|锻炼|跑步/.test(text) → ['习惯']
/探索|试试|了解|好奇/.test(text) → ['灵感']

// 4. 时长估算
打电话|发邮件 → 20分钟
洗衣|做饭|打扫 → 45分钟
学习|锻炼|阅读 → 90分钟
开发|研究|探索 → 150分钟
搬家|大扫除 → 180分钟

// 5. 截止日期解析
明天 → today + 1天
后天 → today + 2天
本周X → 计算到本周X的天数差
周末 → 本周六
本月底 → 当月最后一天
```

**实现：** `src/skills/IntentParser.js` — priority 0，仅手动触发（用户输入任务时）。

### 2. 任务池管理

所有任务存储在 TaskPool 中，支持三种维度管理：

**任务类型（kind）：**
| 类型 | 说明 | 示例 |
|------|------|------|
| habit | 长期习惯，每天/每周重复 | 每天学多邻国、每周健身3次 |
| plan | 有具体时间的安排 | 周六洗衣服、明天开会 |
| idea | 灵感/探索类，可拆解为步骤 | 探索垂类Agent、研究RAG技术 |

**任务标签（tags）：** 工作、生活、习惯、灵感（可多选，颜色编码）

**任务状态机（status）：**
```
pending（待开始）
    ↓ 开始执行
active（进行中）
    ↓ 完成
completed（已完成）— 记录 completedAt 时间戳
    
pending（待开始）
    ↓ 推迟
snoozed（已推迟）— 记录 snoozedUntil = 当前时间 + 1小时
    ↓ 时间到期后自动恢复为 pending
    
pending（待开始）
    ↓ 当天结束仍未完成
missed（已错过）— 由 markMissed() 批量标记
```

**任务数据结构：**
```javascript
{
  id: 'task_1716700000000',      // 唯一标识
  title: '探索垂类Agent',         // 简短标题
  rawText: '我想探索垂类Agent',   // 原始输入文本
  kind: 'idea',                  // 类型：habit | plan | idea
  status: 'pending',             // 状态：pending | active | completed | missed | snoozed
  priority: 'medium',            // 优先级：high | medium | low
  tags: ['工作'],                // 标签数组
  steps: [                       // 拆解步骤
    { id: 1, text: '搜索垂类Agent的基本概念', done: false },
    { id: 2, text: '找一篇入门文章通读', done: false },
    { id: 3, text: '动手做一个最小实验', done: false }
  ],
  estimatedMinutes: 150,         // 预估分钟数
  deadline: 1716800000000,       // 截止时间戳（毫秒）或 null
  deadlineLabel: '本周末',       // 截止日期文字描述
  cadence: { type: 'once' },     // 节奏：daily | weekly | once
  cadenceLabel: '一次性安排',    // 节奏说明
  scheduleSummary: '一次性安排',
  reminderPlan: '先记下来，接近合适时间时再提醒你。',
  triggerHints: ['对话触发'],    // 触发提示
  eventType: 'custom',           // 事件类型
  createdAt: 1716700000000,      // 创建时间
  updatedAt: 1716700000000,      // 更新时间
  completedAt: null,             // 完成时间（completed 状态时有值）
  snoozedUntil: null,            // 推迟到期时间（snoozed 状态时有值）
  notes: []                      // 备注数组
}
```

**核心方法：**
| 方法 | 说明 |
|------|------|
| `add(taskData)` | 添加任务，自动生成 id 和时间戳 |
| `update(id, changes)` | 更新任务字段 |
| `remove(id)` | 删除任务 |
| `setStatus(id, status)` | 设置状态，自动处理 completedAt/snoozedUntil |
| `getTodayTasks()` | 获取今日相关任务（根据 kind、cadence、deadline 过滤） |
| `getActiveTasks()` | 获取待办和进行中的任务 |
| `toggleStep(taskId, stepId)` | 切换步骤完成状态 |
| `getTodayStats()` | 获取今日统计（总数、已完成、待办、进行中） |

**今日任务过滤逻辑（getTodayTasks）：**
1. 排除已完成和已错过的任务
2. 排除 snoozedUntil 未到期的任务
3. habit 类型：无条件入选
4. plan 类型：匹配 cadence（daily 每天入选，weekly 匹配星期几）
5. idea 类型：pending 或 active 状态入选

**实现：** `src/core/TaskPool.js` — localStorage 持久化，pub/sub 订阅模式。

### 3. 每日规划（PlanGenerator）

每天早上 8-10 点自动触发，从任务池生成今日推荐计划。

**触发条件（shouldTrigger）：**
```javascript
if (!taskPool) return false;
if (hour < 8 || hour >= 10) return false;  // 只在 8-10 点触发
if (activityLog.getCompletionStatus('plan_generated', 86400000)) return false;  // 每天只触发一次
if (activeTasks.length === 0) return false;  // 需要有任务
```

**规划算法（execute）：**
```
1. 时间预算设定
   - 总可用时间：480 分钟（8 小时）
   - 习惯类任务优先占用，剩余时间用于安排和灵感

2. 任务分类与筛选
   - 习惯（habit）：无条件入选
   - 安排（plan）：只包含 deadline <= 今天的任务
   - 灵感（idea）：只包含 deadline <= 今天的任务

3. 灵感任务排序规则（贪心选择）
   - 有 deadline 的优先于无 deadline 的
   - deadline 相同的按优先级排序：high > medium > low
   - 最多选择 3 个灵感任务

4. 贪心填充算法
   usedMinutes = 今日安排的总时长
   for idea in sorted_ideas:
     if usedMinutes + idea.estimatedMinutes <= remainingMinutes:
       推荐该灵感任务
       usedMinutes += idea.estimatedMinutes
     if 已选 3 个灵感任务: 停止

5. 时间槽分配（从 9:00 开始）
   currentMinutes = 9 * 60  // 9:00
   for task in allTasks:
     startH = currentMinutes / 60
     startM = currentMinutes % 60
     currentMinutes += task.estimatedMinutes
     endH = currentMinutes / 60
     endM = currentMinutes % 60
     timeLabel = "09:00-10:30"
```

**输出结构：**
```javascript
{
  sections: [
    {
      label: '日常习惯',
      totalMinutes: 60,
      tasks: [
        { id, title, estimatedMinutes: 30, timeLabel: '09:00-09:30', section: '日常习惯', reason: '第一步...' }
      ]
    },
    { label: '今日安排', ... },
    { label: '推荐探索', ... }
  ],
  summary: 'AI 生成的一句鼓励语',
  totalTasks: 5,
  totalMinutes: 300,
  timeLabel: '5小时'
}
```

**实现：** `src/skills/PlanGenerator.js` — priority 80，每天触发一次。

### 4. 主动提醒（TaskReminder）

每 10 分钟运行一次决策循环，根据用户状态主动推送任务提醒。

**触发条件（shouldTrigger）：**
```javascript
// 前置条件
if (!taskPool) return false;
if (todayTasks.length === 0) return false;  // 没有今日任务
if (activityLog.getCompletionStatus('task_reminder', 1800000)) return false;  // 30分钟内已触发
if (hour >= 23 || hour < 7) return false;  // 睡眠时段

// 触发规则（满足任一即触发）
if (isIdle && idleMinutes >= 10) return true;  // 用户空闲10分钟以上
if (screenMinutes >= 120) return true;  // 连续使用电脑2小时以上
if (screenMinutes >= 30 && !isIdle && pendingTasks.length > 0) return true;  // 活跃30分钟且有待办
```

**任务选择逻辑（execute）：**
```javascript
// 按优先级选择目标任务
let targetTask = 
  pendingTasks.find(t => t.priority === 'high')    // 1. 高优先级 pending 任务
  || pendingTasks.find(t => t.kind === 'idea')     // 2. 灵感类 pending 任务
  || pendingTasks[0]                                // 3. 第一个 pending 任务
  || activeTasks[0];                                // 4. 第一个 active 任务
```

**上下文感知：**
- 空闲场景：`"你刚休息了一会儿，要不要花点时间探索垂类Agent？"`
- 久坐场景：`"你已经连续工作很久了，适合做个简单的任务切换"`
- 正常场景：`"别忘了今天的学多邻国哦～"`

**输出结构：**
```javascript
{
  petState: 'thinking',  // idea 任务用 thinking，其他用 working
  message: 'AI 生成的提醒语',
  actions: ['开始做', '等会儿', '跳过'],
  data: { taskTitle, taskId, pendingCount, contextHint }
}
```

**实现：** `src/skills/TaskReminder.js` — priority 90，每 30 分钟最多触发一次。

### 5. 任务拆解（TaskDecomposer）

自动为没有步骤的灵感类任务生成 3-5 个可执行步骤。

**触发条件（shouldTrigger）：**
```javascript
if (!taskPool) return false;
if (activityLog.getCompletionStatus('task_decomposer', 1200000)) return false;  // 20分钟内已触发

// 查找符合条件的任务
const candidates = taskPool.tasks.filter(t =>
  t.status === 'pending' &&      // 待开始状态
  t.kind === 'idea' &&           // 灵感类任务
  (!t.steps || t.steps.length === 0)  // 没有步骤
);
return candidates.length > 0;
```

**执行逻辑（execute）：**
```javascript
// 1. 选择目标任务（最近添加的灵感任务）
const target = candidates[candidates.length - 1];

// 2. 调用 AI 生成步骤
const prompt = `把下面的目标拆解为3-5个具体可执行的步骤，每个步骤要短小明确。
目标："${target.title}"
只返回JSON数组：["步骤1","步骤2","步骤3"]`;

const raw = await generateContent(prompt, 200);
const steps = JSON.parse(raw.match(/\[[\s\S]*\]/)[0]);

// 3. 更新任务的步骤
taskPool.update(target.id, {
  steps: steps.map((s, i) => ({ id: i + 1, text: s, done: false }))
});
```

**示例：**
```
输入任务：探索垂类Agent
AI 输出：["搜索垂类Agent的基本概念和背景", "找一篇入门文章或官方文档通读", "动手做一个最小实验验证理解"]
更新后任务的 steps 字段：
[
  { id: 1, text: "搜索垂类Agent的基本概念和背景", done: false },
  { id: 2, text: "找一篇入门文章或官方文档通读", done: false },
  { id: 3, text: "动手做一个最小实验验证理解", done: false }
]
```

**实现：** `src/skills/TaskDecomposer.js` — priority 70，每 20 分钟检查一次，调用 AI 生成步骤。

### 6. 对话协商

用户可以通过对话与 Agent 交互，AI 拥有完整的任务池上下文。

**对话流程：**
```
1. 用户输入消息
   ↓
2. 检测是否为调研意图
   ↓
3. 如果是调研 → 调用 ResearchAssistant 生成调研框架
   ↓
4. 如果是普通对话 → 调用 chatWithAgent()
   ↓
5. AI 返回 { reply, actions }
   ↓
6. 前端解析 actions 并执行对应操作
   ↓
7. 显示 AI 回复
```

**AI System Prompt：**
```javascript
const sysMsg = {
  role: 'system',
  content: `你是生活助手。当前任务池：
${taskSummary}

用户提到任务时，找到匹配并操作。
可修改字段：title(标题), kind(habit|plan|idea), priority(high|medium|low), 
           estimatedMinutes(分钟数number), deadline(毫秒时间戳number), tags(字符串数组)
格式：{"reply":"回复","actions":[{"type":"update_task","taskId":"id","field":"字段","value":"值"}]}
纯聊天时actions为[]。回复不超过30字。`
};
```

**任务池上下文（taskSummary）格式：**
```
task_1716700000001|探索垂类Agent|idea|150min|low
task_1716700000002|每天学多邻国|habit|30min|medium|截止明天
task_1716700000003|收拾行李|idea|180min|medium|截止本周末
```

**支持的 Actions：**
```javascript
// 1. 修改任务字段
{ type: 'update_task', taskId: 'task_xxx', field: 'estimatedMinutes', value: 180 }

// 2. 添加新任务
{ type: 'add_task', data: { title: '新任务', kind: 'idea', ... } }

// 3. 修改任务状态
{ type: 'set_status', taskId: 'task_xxx', status: 'snoozed' }
```

**对话示例：**
```
用户: "收拾行李需要3小时"
AI: { 
  reply: "好的，已调整为3小时", 
  actions: [{ type: 'update_task', taskId: 'task_xxx', field: 'estimatedMinutes', value: 180 }] 
}

用户: "把那个项目的优先级调高"
AI: { 
  reply: "已将探索垂类Agent设为高优先级", 
  actions: [{ type: 'update_task', taskId: 'task_xxx', field: 'priority', value: 'high' }] 
}

用户: "今天不想做这个了"
AI: { 
  reply: "好的，已推迟到明天", 
  actions: [{ type: 'set_status', taskId: 'task_xxx', status: 'snoozed' }] 
}
```

**实现：** `src/services/claudeAgent.js` 的 `chatWithAgent()` — AI 返回结构化 action，前端解析后直接执行。

### 7. 调研助手（ResearchAssistant）

检测到调研意图后，生成结构化调研框架并自动创建任务。

**触发方式：** 仅通过对话手动触发（`shouldTrigger` 始终返回 false）

**意图检测（在 DesktopApp.jsx 中）：**
```javascript
const researchMatch = text.match(/(?:调研|研究|了解一下|帮我看看|搜索|查一下|学习)\s*(.+)/);
if (researchMatch) {
  const topic = researchMatch[1].trim();
  // 调用 ResearchAssistant
}
```

**执行逻辑（execute）：**
```javascript
// 1. 调用 AI 生成调研框架
const result = await researchTopic(topic);

// 2. 自动创建任务
if (result.steps && result.steps.length > 0 && taskPool) {
  taskPool.add({
    title: `调研：${topic}`,
    rawText: `调研${topic}`,
    kind: 'idea',
    priority: 'medium',
    tags: ['工作'],
    steps: result.steps,
    estimatedMinutes: 120,
    cadence: { type: 'once' },
    cadenceLabel: '一次性安排'
  });
}
```

**AI Prompt：**
```javascript
const prompt = `你是一个技术调研助手。用户想要调研「${topic}」，请生成一份结构化的调研框架。

返回JSON格式：
{
  "overview": "一句话说明这是什么",
  "keyConcepts": ["核心概念1", "核心概念2", "核心概念3"],
  "steps": ["步骤1: 搜集基本信息", "步骤2: 了解核心技术原理", "步骤3: 找到实际案例或Demo", "步骤4: 动手做一个最小实验"],
  "resources": ["推荐搜索关键词或资源方向1", "方向2", "方向3"],
  "summary": "一句话总结调研建议"
}

只返回JSON，steps不超过5个，keyConcepts不超过5个，resources不超过3个。`;
```

**输出示例（调研"垂类Agent"）：**
```javascript
{
  overview: "垂类Agent是指专注于特定领域（如医疗、法律、教育）的AI Agent",
  keyConcepts: ["领域知识图谱", "专业工具调用", "领域特定Prompt", "RAG增强", "多轮对话"],
  steps: [
    "搜集垂类Agent的基本概念和应用场景",
    "了解主流框架（LangChain、AutoGPT）的实现方式",
    "找到3-5个实际案例或开源项目",
    "选择一个垂直领域设计最小可行方案",
    "动手实现一个简单的领域Agent原型"
  ],
  resources: ["搜索'垂直领域AI Agent'", "查看LangChain官方文档", "GitHub搜索相关项目"],
  summary: "建议从医疗或教育领域入手，先做一个简单的问答Agent"
}
```

**实现：** `src/skills/ResearchAssistant.js` — priority 60，仅通过对话手动触发。

### 8. 每日反思（DailyReflection）

晚间 21-23 点自动触发，分析今日任务完成情况。

**触发条件（shouldTrigger）：**
```javascript
if (!taskPool) return false;
if (hour < 21 || hour >= 23) return false;  // 只在 21-23 点触发
if (activityLog.getCompletionStatus('daily_reflection', 86400000)) return false;  // 每天只触发一次

// 需要有一定的活动量
const summary = activityLog.getDailySummary();
return summary.total >= 2;  // 今日至少有 2 次活动记录
```

**分析内容（execute）：**
```javascript
// 1. 获取今日数据
const todayTasks = taskPool.getTodayTasks();
const todayStats = taskPool.getTodayStats();

// 2. 分类统计
const completedToday = allTasks.filter(t =>
  t.status === 'completed' && t.completedAt &&
  t.completedAt >= new Date().setHours(0, 0, 0, 0)
);
const missedToday = todayTasks.filter(t => t.status === 'missed' || t.status === 'pending');

// 3. 周维度分析
const recentCompletions = allTasks.filter(t =>
  t.status === 'completed' && t.completedAt &&
  t.completedAt >= Date.now() - 7 * 86400000
);

// 4. 灵感池进度
const ideaCount = allTasks.filter(t => t.kind === 'idea').length;
const completedIdeas = allTasks.filter(t => t.kind === 'idea' && t.status === 'completed').length;
```

**AI 生成总结：**
```javascript
const prompt = `你是一个生活助手。帮用户总结今天：
完成的任务：${completedNames}
未完成的任务：${missedNames}
本周已完成${recentCompletions.length}个任务，灵感池中有${ideaCount}个想法。
用一句温暖有洞察力的话总结，不超过50字，可以给一个具体的下一步建议。`;
```

**输出结构：**
```javascript
{
  petState: 'happy',
  message: 'AI 生成的总结语',
  actions: ['谢谢总结'],
  data: {
    completedToday: [{ id, title, kind }],  // 今日已完成任务
    missedToday: [{ id, title, kind }],     // 今日未完成任务
    totalCompleted: 3,                       // 今日完成数
    totalTasks: 5,                           // 今日总任务数
    weeklyCompleted: 12,                     // 本周完成数
    ideaProgress: { total: 8, completed: 3 } // 灵感池进度
  },
  memoryUpdate: {
    dailyDigest: {
      completedTasks: ['任务1', '任务2'],
      missedTasks: ['任务3'],
      completionRate: 60,  // 完成率百分比
      weeklyCompleted: 12,
      summary: 'AI 生成的总结'
    }
  }
}
```

**实现：** `src/skills/DailyReflection.js` — priority 10，写入 Memory 的 dailyDigest。

### 9. 状态推断

通过 7 条加权规则推断用户当前状态，驱动 Agent 的主动行为。

**推断流程：**
1. 收集传感器信号：当前时间、屏幕使用分钟数、是否空闲、空闲分钟数
2. 获取任务池数据：今日待办任务数、灵感类任务数
3. 依次执行 7 条规则的 `test()` 函数
4. 过滤出匹配的规则，按分数降序排列
5. 取分数最高的规则作为推断结果

**7 条规则详细说明：**

| 规则 | 分数 | 条件 | 输出状态 | 说明 |
|------|------|------|----------|------|
| sleeping | 100 | `hour >= 23 或 hour < 7` | sleeping | 睡眠时段，不触发任何提醒 |
| deep_work | 90 | `screenMinutes >= 90 且 !isIdle` | working/deep_work | 连续使用电脑超过 90 分钟，建议休息 |
| break_needed | 85 | `screenMinutes >= 120` | working/break_needed | 屏幕时间超过 2 小时，强制建议休息 |
| idle_with_tasks | 80 | `isIdle 且 idleMinutes >= 10 且 pendingTasks > 0` | idle/has_tasks | 用户空闲且有未完成任务，主动提醒 |
| idle | 75 | `isIdle 且 idleMinutes >= 10` | idle | 用户空闲超过 10 分钟 |
| has_ideas | 60 | `ideaTasks > 0 且 screenMinutes >= 10 且 !isIdle` | working/has_ideas | 有灵感任务等待探索，用户正在使用电脑 |
| working | 10 | `screenMinutes >= 3 且 !isIdle` | working | 默认工作状态 |

**返回数据结构：**
```javascript
{
  primary: 'working',           // 主状态：working | idle | sleeping
  secondary: 'deep_work',       // 次状态：deep_work | break_needed | has_tasks | has_ideas | null
  confidence: 0.9,              // 信心度：score / 100
  signals: [...],               // 原始信号数组
  matchedRule: 'deep_work',     // 匹配的规则 ID
  reason: '你已经连续使用电脑 95 分钟，没有休息',  // 人类可读的推断依据
  evaluatedRules: [...]         // 所有规则的评估结果
}
```

**实现：** `src/core/StateInference.js` — 取分数最高的规则作为当前状态。

### 10. 调试面板

展示 Agent 决策的完整链条，6 个步骤：

**Step 1: 意图理解**
- 展示任务池统计：总任务数、习惯数、安排数、灵感数
- 展示最近一次解析结果：原始输入 → 解析标题（类型·优先级）
- 如果还没有输入过任务，显示提示

**Step 2: 多步推理**
- 查找有步骤的任务（优先显示最近解析的，其次显示有步骤的活跃任务）
- 展示步骤进度：已完成数/总数
- 列出前 4 个步骤，已完成的显示删除线

**Step 3: 状态推断**
- 环境信号卡片：
  - 时间：当前小时:分钟
  - 屏幕：已使用分钟数
  - 空闲：是否空闲 + 空闲分钟数（超过 10 分钟标红）
- 推断结果：主状态 · 次状态 + 信心百分比
- 推断依据：人类可读的规则说明
- 匹配的规则列表：按分数排序，最高分高亮

**Step 4: 优先级决策**
- 显示待办和进行中任务数量
- 列出前 5 个活跃任务，高亮目标任务
- 每个任务显示：标题（优先级·类型·状态）
- 决策结果：提醒 → "目标任务标题"
- 决策逻辑：
  1. 优先选高优先级 pending 任务
  2. 其次选灵感类 pending 任务
  3. 再取第一个 pending 任务
  4. 最后取第一个 active 任务

**Step 5: 自主行动**
- 技能评估日志：每个 Skill 的触发状态（✓ 或 ✗）
- 执行结果卡片：
  - 技能名称（中文）
  - 执行消息
  - 操作按钮标签
- 如果没有技能触发，显示"等待下一轮循环（每 10 分钟）"

**Step 6: 记忆更新**
- Memory 更新日志
- 如果有 memoryUpdate，显示更新的字段（如"更新今日计划"、"写入每日总结"）
- 今日统计：总任务数、已完成数
- 如果还没有记忆更新，显示提示

**实现：** `src/components/AgentDebug.jsx`。

---

## 架构设计

### 核心架构：感知 → 决策 → 行动

```
┌─────────────────────────────────────────────────┐
│                   感知层                          │
│  Sensors (时间、屏幕使用、空闲状态)                │
│  StateInference (7条规则 → 用户状态)              │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                   决策层                          │
│  SkillManager (每10分钟循环)                      │
│  → 遍历所有 Skill，按优先级评估 shouldTrigger     │
│  → 选择最高优先级的 Skill 执行                    │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                   行动层                          │
│  SkillBubble (浮动气泡通知)                       │
│  Memory (写入长期记忆)                            │
│  TaskPool (修改任务状态)                          │
└─────────────────────────────────────────────────┘
```

**详细执行流程（SkillManager.runLoop）：**
```javascript
async runLoop(sensors, activityLog, memory, onLog, taskPool) {
  // 1. 感知阶段
  onLog('🔍 观察环境信号...');
  // 输出传感器数据：时间、屏幕分钟数、是否空闲、空闲分钟数

  // 2. 状态推断
  const inferredState = inferState(sensors, activityLog, memory, taskPool);
  onLog(`🧠 状态推断: ${inferredState.primary} (${confidence}%)`);

  // 3. 构建上下文
  const context = { sensors, inferredState, activityLog, memory, taskPool };

  // 4. 评估所有 Skill
  const candidates = this.evaluate(context);
  // 按 priority 降序排列，过滤出 shouldTrigger 返回 true 的 Skill

  // 5. 记录评估结果
  for (const skill of allSkills) {
    if (triggered) {
      onLog(`✓ ${skill.name} — 触发条件满足`);
    } else {
      onLog(`✗ ${skill.name} — 条件不满足`);
    }
  }

  // 6. 执行最高优先级的 Skill
  const skill = candidates[0];
  const result = await skill.execute(context);

  // 7. 记录活动日志
  activityLog.log('skill_trigger', { skillId, petState });

  // 8. 写入 Memory
  if (result.memoryUpdate) {
    for (const [key, value] of Object.entries(result.memoryUpdate)) {
      if (key === 'dailyDigest') {
        memory.addDailyDigest(today, value);
      } else {
        memory.updatePreference(key, value);
      }
    }
  }

  // 9. 返回结果
  return { ...result, skillId, name, inferredState };
}
```

### 技能系统

每个 Skill 是一个独立模块，包含：
- `id` — 唯一标识
- `name` — 显示名称
- `priority` — 优先级（越高越先评估）
- `shouldTrigger(context)` — 是否应该触发
- `execute(context, ...args)` — 执行逻辑，返回 `{ petState, message, actions, data, memoryUpdate }`

**已注册的 6 个 Skill：**

| Skill | Priority | 触发方式 | 触发频率 |
|-------|----------|---------|---------|
| TaskReminder | 90 | 自动（空闲/久坐时） | 每 30 分钟最多 1 次 |
| PlanGenerator | 80 | 自动（每天早上 8-10 点） | 每天 1 次 |
| TaskDecomposer | 70 | 自动（有无步骤的灵感任务时） | 每 20 分钟最多 1 次 |
| ResearchAssistant | 60 | 手动（对话中检测调研意图） | 无限制 |
| DailyReflection | 10 | 自动（晚间 21-23 点） | 每天 1 次 |
| IntentParser | 0 | 手动（用户输入任务时） | 无限制 |

**Skill 执行返回结构：**
```javascript
{
  petState: 'thinking',      // 猫咪状态：normal | thinking | working | happy | news | sleepy | exercise
  message: 'AI 生成的消息',   // 显示给用户的消息
  actions: ['开始做', '等会儿'],  // 可选操作按钮
  data: { ... },             // 技能特定数据
  memoryUpdate: {            // 需要写入 Memory 的数据
    todayPlan: { ... },      // 今日计划
    dailyDigest: { ... }     // 每日总结
  }
}
```

### 数据层

| 模块 | 存储 Key | 用途 |
|------|---------|------|
| TaskPool | `petmind_taskpool` | 任务池 |
| Memory | `petmind_memory` | 用户偏好 + 每日总结 |
| ActivityLog | `petmind_activity_log` | 活动事件（7天自动清理） |

**Memory 详细结构：**
```javascript
{
  preferences: {
    learningTopic: 'AI大模型',      // 学习主题
    newsCategories: ['科技', '国际'], // 新闻分类
    learningHour: 9,                 // 学习时间
    todayPlan: { ... }               // 今日计划（PlanGenerator 写入）
  },
  dailyDigests: {
    '2026-05-26': {
      completedTasks: ['任务1', '任务2'],
      missedTasks: ['任务3'],
      completionRate: 60,
      weeklyCompleted: 12,
      summary: 'AI 生成的总结'
    }
  }
}
```

**Memory 核心方法：**
| 方法 | 说明 |
|------|------|
| `updatePreference(key, value)` | 更新用户偏好 |
| `getPreference(key)` | 获取用户偏好 |
| `addDailyDigest(date, digest)` | 添加每日总结 |
| `getRecentDigests(n)` | 获取最近 n 天的总结 |
| `getTodayDigest()` | 获取今日总结 |

**ActivityLog 详细结构：**
```javascript
{
  events: [
    {
      id: 'uuid',
      type: 'task_reminder',  // 事件类型
      timestamp: 1716700000000,
      metadata: {             // 事件元数据
        skillId: 'task_reminder',
        petState: 'thinking'
      }
    }
  ]
}
```

**ActivityLog 事件类型：**
| 类型 | 说明 | 触发时机 |
|------|------|---------|
| `task_reminder` | 任务提醒 | TaskReminder 执行时 |
| `plan_generated` | 今日规划 | PlanGenerator 执行时 |
| `task_decomposer` | 任务拆解 | TaskDecomposer 执行时 |
| `daily_reflection` | 每日反思 | DailyReflection 执行时 |
| `research_assistant` | 调研助手 | ResearchAssistant 执行时 |
| `skill_trigger` | 技能触发 | 任何 Skill 执行时 |
| `chat` | 对话 | 用户发送消息时 |
| `stretch` | 伸展 | 初始化种子 |
| `drink` | 喝水 | 初始化种子 |
| `rest` | 休息 | 初始化种子 |

**ActivityLog 核心方法：**
| 方法 | 说明 |
|------|------|
| `log(type, metadata)` | 记录事件 |
| `query({ type, since, until })` | 查询事件 |
| `lastEvent(type)` | 获取某类型的最后一个事件 |
| `minutesSinceLast(type)` | 距离上次某类型事件的分钟数 |
| `getCompletionStatus(eventType, windowMs)` | 检查在时间窗口内是否触发过 |
| `getDailySummary(date)` | 获取某天的事件统计 |

**自动清理机制：**
- 事件保留 7 天，超过 7 天的事件自动删除
- 每次添加新事件时触发清理（`_prune()`）
- 首次启动时初始化种子事件（stretch、drink、rest），避免技能立即触发

---

## 目录结构

```
src/
├── main.jsx                    # 入口
├── App.jsx                     # 根组件
├── index.css                   # 全局样式
│
├── components/                 # UI 组件
│   ├── DesktopApp.jsx          # 主界面（猫咪 + 4标签面板）
│   ├── CatSVG.jsx              # 猫咪动画（7种状态）
│   ├── SkillBubble.jsx         # 技能结果气泡
│   ├── DailyPlan.jsx           # 今日标签
│   ├── TaskList.jsx            # 任务列表
│   ├── TaskInput.jsx           # 任务输入
│   ├── AgentDebug.jsx          # 调试面板
│   └── ...
│
├── skills/                     # Agent 技能模块
│   ├── IntentParser.js         # 意图理解 + 任务拆解
│   ├── TaskReminder.js         # 任务提醒
│   ├── TaskDecomposer.js       # 后台任务拆解
│   ├── PlanGenerator.js        # 每日规划
│   ├── DailyReflection.js      # 每日反思
│   └── ResearchAssistant.js    # 调研助手
│
├── core/                       # 核心数据模型
│   ├── TaskPool.js             # 任务池
│   ├── Memory.js               # 记忆系统
│   ├── ActivityLog.js          # 活动日志
│   ├── StateInference.js       # 状态推断引擎
│   └── SkillManager.js         # 技能调度引擎
│
├── hooks/                      # React Hooks
│   ├── useTaskPool.js          # 任务池 Hook
│   ├── useMemory.js            # 记忆 Hook
│   ├── useActivityLog.js       # 活动日志 Hook
│   ├── useSensors.js           # 传感器 Hook
│   ├── useStateInference.js    # 状态推断 Hook
│   ├── useSkillManager.js      # 技能管理 Hook
│   └── useScreenTime.js        # 屏幕时间 Hook
│
├── services/                   # 外部服务
│   └── claudeAgent.js          # AI 服务（OpenAI SDK + DashScope）
│
└── assets/                     # 静态资源
    └── cat/                    # 猫咪状态图片
```

---

## 设计决策与思考

### 1. 意图理解用 AI 而非本地规则

最初用正则表达式做意图解析（零延迟），后来改为调用 AI。原因是：AI 能更准确地理解复杂表达、拆解步骤、估算时长，本地规则只能处理简单的关键词匹配。AI 失败时回退到本地规则引擎，保证可用性。

### 2. 主动行为用气泡而非聊天窗口

Agent 的主动输出（提醒、规划、反思）通过 SkillBubble 浮动气泡展示，而不是聊天窗口。原因是：主动输出应该是轻量的、非打扰的、可忽略的。聊天窗口适合用户主动发起的对话，不适合 Agent 主动推送。

### 3. 对话系统携带任务上下文

对话的 system prompt 包含完整的任务池数据，AI 能直接操作任务。这让对话从"问答"变成了"操作接口"，用户说一句话就能修改任务，不需要手动编辑。

### 4. 调试面板保证可解释性

Agent 的每个决策都通过调试面板展示：当前信号、推断状态、规则评分、技能评估、执行结果、记忆更新。这让用户理解 Agent 为什么这么做，建立信任感。

---

## 运行方式

```bash
# 开发模式
npm run electron:dev

# 构建
npm run build

# 启动
npm start
```

环境变量（`.env`）：
```
VITE_AI_API_KEY=your_api_key
VITE_AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VITE_AI_MODEL=qwen3.5-plus-2026-04-20
```
