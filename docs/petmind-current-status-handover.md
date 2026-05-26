# PetMind 当前现状与后续规划交接文档

更新时间：2026-05-26  
项目路径：`/Users/mengyanyang/Documents/petmind`

## 1. 项目定位

PetMind 当前正在从“桌面宠物 + 聊天 + 简单提醒”的原型，过渡到“持续运行的环境感知型桌面 AI Agent”。

目标不是把它做成一个更强的聊天机器人，而是做成一个具备以下能力的桌面伴侣：

- 持续观察环境信号
- 记录用户行为与长期历史
- 将能力拆成可复用的 Skill 模块
- 通过统一决策循环主动采取动作

目标决策循环是：

`observe -> intent classification -> state inference -> skill selection -> tool calling -> memory update -> act`

当前代码已经有这个方向的骨架，但距离完整形态还有明显差距。

## 2. 当前技术栈与运行方式

### 2.1 技术栈

- 前端：React 19 + Vite 8
- 动画：Framer Motion
- 桌面容器：Electron 42
- AI 接口：OpenAI 兼容格式

关键配置见：

- [package.json](/Users/mengyanyang/Documents/petmind/package.json)
- [electron/main.cjs](/Users/mengyanyang/Documents/petmind/electron/main.cjs)

### 2.2 常用命令

- 开发前端：`npm run dev`
- 启动 Electron 开发：`npm run electron:dev`
- 一键启动：`npm run start`
- 构建：`npm run build`

## 3. 当前已经实现的内容

## 3.1 桌面容器与悬浮宠物

已经实现：

- Electron 透明无边框全屏工作区窗口
- 始终置顶
- 鼠标穿透，只有交互区域可点击
- 托盘图标
- `petmind://` 自定义协议注册

入口文件：

- [electron/main.cjs](/Users/mengyanyang/Documents/petmind/electron/main.cjs)
- [src/components/DesktopApp.jsx](/Users/mengyanyang/Documents/petmind/src/components/DesktopApp.jsx)

现状说明：

- 桌宠本体可拖拽
- 点击小猫可打开主弹窗
- 右键小猫可退出应用

## 3.2 小猫视觉系统

已经实现：

- 小猫从原始 `SVG` 切换为基于 PNG 的插画风桌宠
- 图片资源统一到了同一画布尺寸
- 增加了轻量状态特效
- 主面板与触发弹窗风格已经向“奶油纸片感 + 手绘小猫风格”靠拢

核心组件：

- [src/components/CatSVG.jsx](/Users/mengyanyang/Documents/petmind/src/components/CatSVG.jsx)

当前使用资源：

- [src/assets/cat/wave.png](/Users/mengyanyang/Documents/petmind/src/assets/cat/wave.png)
- [src/assets/cat/laptop.png](/Users/mengyanyang/Documents/petmind/src/assets/cat/laptop.png)
- [src/assets/cat/think.png](/Users/mengyanyang/Documents/petmind/src/assets/cat/think.png)
- [src/assets/cat/sleep.png](/Users/mengyanyang/Documents/petmind/src/assets/cat/sleep.png)
- [src/assets/cat/stretch.png](/Users/mengyanyang/Documents/petmind/src/assets/cat/stretch.png)
- [src/assets/cat/news.png](/Users/mengyanyang/Documents/petmind/src/assets/cat/news.png)
- [src/assets/cat/learning.png](/Users/mengyanyang/Documents/petmind/src/assets/cat/learning.png)

当前状态映射：

- `normal` -> `wave.png`
- `working` -> `laptop.png`
- `thirsty` -> `think.png`
- `sleepy` -> `sleep.png`
- `exercise` -> `stretch.png`
- `news` -> `news.png`
- `learning` -> `learning.png`
- `happy` -> `wave.png`

当前问题：

- `happy` 仍然没有真正独立的专用状态图，还在复用 `wave.png`
- 状态切换主要还是“换图 + 轻动画”，没有更完整的角色状态机

## 3.3 环境信号层

当前已经接入的环境信号较少，主要是：

- 时间
- 天气
- 屏幕活跃时长
- 是否空闲
- 空闲分钟数

核心文件：

- [src/hooks/useSensors.js](/Users/mengyanyang/Documents/petmind/src/hooks/useSensors.js)
- [src/hooks/useScreenTime.js](/Users/mengyanyang/Documents/petmind/src/hooks/useScreenTime.js)
- [src/hooks/useWeather.js](/Users/mengyanyang/Documents/petmind/src/hooks/useWeather.js)

当前现状：

- `useScreenTime` 负责简单屏幕活跃/空闲推断
- `useWeather` 通过 OpenWeatherMap 拉天气
- `useSensors` 汇总为统一 `sensors` 对象

当前缺失：

- 窗口状态识别
- 当前应用类型识别
- 鼠标键盘行为的更细粒度统计
- 学习类环境识别（Notion / Docs / PDF / IDE）
- 更丰富的上下文信号采样与标准化

## 3.4 状态推断层

当前已经有规则式状态推断，不依赖大模型主观判断。

核心文件：

- [src/core/StateInference.js](/Users/mengyanyang/Documents/petmind/src/core/StateInference.js)
- [src/hooks/useStateInference.js](/Users/mengyanyang/Documents/petmind/src/hooks/useStateInference.js)

当前规则支持：

- `sleeping`
- `working + sedentary`
- `working + overtime`
- `idle`
- `learning + news_time`
- `working + dehydrated`
- 普通 `working`

这部分已经比较符合目标方向：  
状态是从规则和信号推出来的，而不是直接问模型“用户现在是什么状态”。

当前缺失：

- `resting`
- 真正的 `learning` 状态识别
- 更精细的 `working` 子状态
- 情绪相关状态
- 多信号联合权重与冲突消解策略

## 3.5 Agent 决策循环

当前已经有一个非常重要的基础骨架：

- 观察环境
- 推断状态
- 找出可触发技能
- 按优先级选择一个技能
- 执行技能
- 记录日志
- 更新 memory

核心文件：

- [src/core/SkillManager.js](/Users/mengyanyang/Documents/petmind/src/core/SkillManager.js)
- [src/hooks/useSkillManager.js](/Users/mengyanyang/Documents/petmind/src/hooks/useSkillManager.js)

当前现状：

- 每 10 分钟自动执行一次 `runLoop`
- 支持技能注册
- 支持日志输出
- 支持 `memoryUpdate`
- 支持 `activityLog.log('skill_trigger')`

当前问题：

- 决策循环还是比较简单，严格来说更接近 `observe -> infer -> select -> act`
- 还没有真正显式的 `intent classification`
- 还没有统一 `tool calling` 抽象层
- 还没有把“用户自然语言计划”并入统一循环中

## 3.6 Skill 系统

已经注册的 Skill：

- `WellnessSkill`
- `NewsSkill`
- `LearningSkill`
- `ReflectionSkill`

文件：

- [src/skills/WellnessSkill.js](/Users/mengyanyang/Documents/petmind/src/skills/WellnessSkill.js)
- [src/skills/NewsSkill.js](/Users/mengyanyang/Documents/petmind/src/skills/NewsSkill.js)
- [src/skills/LearningSkill.js](/Users/mengyanyang/Documents/petmind/src/skills/LearningSkill.js)
- [src/skills/ReflectionSkill.js](/Users/mengyanyang/Documents/petmind/src/skills/ReflectionSkill.js)

### 已实现的技能现状

#### WellnessSkill

作用：

- 久坐提醒
- 喝水提醒
- 深夜催睡
- 用眼提醒

当前问题：

- 主要仍依赖简单时间窗口和事件间隔
- 还没有更强的“低活跃 + 长屏幕时长 + 环境状态”的联合判断

#### NewsSkill

作用：

- 早晨 8-10 点触发
- 调用模型生成三条摘要
- 本地做每日缓存

当前问题：

- 目前是“让模型生成新闻摘要”，不是基于真实新闻源的抓取与整理
- 更像生成式占位实现

#### LearningSkill

作用：

- 到设定学习时间后生成学习内容摘要
- 本地缓存

当前问题：

- 这还不是目标中的 `Learning Coach Skill`
- 现在本质是“按主题生成摘要”
- 还没有基于行为日志、学习应用、学习时长、主题聚类的结构化总结

#### ReflectionSkill

作用：

- 晚间根据事件日志生成一句总结
- 生成每日摘要并写入 memory

当前问题：

- 数据来源还是比较浅
- 总结维度不够丰富
- 目前只适合做 MVP 级别晚间回顾

### 尚未实现但目标中明确需要的 Skill

- `Emotion Companion Skill`
- 真正的 `Learning Coach Skill`

## 3.7 聊天能力

聊天功能目前已经保留，而且在本轮被重新接回主弹窗。

相关文件：

- [src/components/DesktopApp.jsx](/Users/mengyanyang/Documents/petmind/src/components/DesktopApp.jsx)
- [src/services/claudeAgent.js](/Users/mengyanyang/Documents/petmind/src/services/claudeAgent.js)

当前现状：

- 有聊天 Tab
- 支持发送消息
- 会把最近 6 条消息拼接成上下文
- 仍然走“可爱猫咪”人格

当前问题：

- 聊天记录目前没有看到重新接入持久化
- 聊天还没有与 `Emotion Companion Skill` 融合
- 聊天虽然是目标之一，但在整体架构里应当被放在“显式行为输入”层，而不是系统核心

## 3.8 提醒 / 计划输入系统

这一块本轮已经从“习惯提醒表单”升级成了更接近目标形态的自然语言输入。

相关文件：

- [src/components/HabitPanel.jsx](/Users/mengyanyang/Documents/petmind/src/components/HabitPanel.jsx)
- [src/hooks/useHabits.js](/Users/mengyanyang/Documents/petmind/src/hooks/useHabits.js)
- [src/services/claudeAgent.js](/Users/mengyanyang/Documents/petmind/src/services/claudeAgent.js)

当前现状：

- 用户可以直接输入一句自然语言
- 例如：
  - 每天提醒我学多邻国
  - 每周六提醒我洗衣服
  - 这周日我想去故宫
- 系统会调用 `parsePlanIntent`
- 模型或本地 fallback 会把它解析成：
  - `kind`: `habit | plan | idea`
  - `cadenceLabel`
  - `scheduleSummary`
  - `reminderPlan`
  - `triggerHints`
  - `eventType`

这一步非常重要，因为它开始把“习惯面板”转成“自然语言计划录入层”。

当前问题：

- 解析结果目前只是存储和展示，还没有真正进入 Agent 的调度逻辑
- 没有“待提醒 / 已完成 / 已错过 / 已延期”等状态机
- 没有真正的时间解析与日历化能力
- 周日去故宫这类一次性计划还没有后续触发机制
- `kind` 的 heuristic fallback 还很粗糙

## 3.9 行为日志与记忆系统

相关文件：

- [src/core/ActivityLog.js](/Users/mengyanyang/Documents/petmind/src/core/ActivityLog.js)
- [src/hooks/useActivityLog.js](/Users/mengyanyang/Documents/petmind/src/hooks/useActivityLog.js)
- [src/core/Memory.js](/Users/mengyanyang/Documents/petmind/src/core/Memory.js)
- [src/hooks/useMemory.js](/Users/mengyanyang/Documents/petmind/src/hooks/useMemory.js)

当前行为日志支持：

- `drink`
- `stretch`
- `rest`
- `chat`
- `skill_trigger`
- `reflection`
- 其他业务事件

当前 memory 支持：

- `preferences`
- `dailyDigests`

当前问题：

- 行为日志还没有“学习行为日志”这一层
- 还没有窗口类型、应用类型、学习主题聚类结果
- memory 还比较轻量，偏向简单配置和每日总结

## 3.10 UI 结构现状

当前主弹窗已被重构为三层结构：

- `对话`
- `看板`
- `调试`

其中 `看板` 再分为：

- `状态`
- `近期总结`
- `提醒计划`
- `今日统计`

这比之前更符合项目目标，因为：

- `对话` 承担显式交互入口
- `看板` 展示持续感知结果
- `调试` 展示 Agent 循环

相关文件：

- [src/components/DesktopApp.jsx](/Users/mengyanyang/Documents/petmind/src/components/DesktopApp.jsx)
- [src/components/Dashboard.jsx](/Users/mengyanyang/Documents/petmind/src/components/Dashboard.jsx)
- [src/components/HabitPanel.jsx](/Users/mengyanyang/Documents/petmind/src/components/HabitPanel.jsx)
- [src/components/AgentDebug.jsx](/Users/mengyanyang/Documents/petmind/src/components/AgentDebug.jsx)
- [src/components/SkillBubble.jsx](/Users/mengyanyang/Documents/petmind/src/components/SkillBubble.jsx)

当前问题：

- 看板页还是偏展示，不够“Agent 化”
- 调试面板虽然已经中文化并展示核心链路，但仍然只是 UI 展示，不是完整调试工具
- 小触发弹窗和主面板虽然风格统一了，但还缺更强的“从小猫身边弹出”的气泡感

## 4. 当前代码和目标架构的差距

### 4.1 已经对齐的部分

- 已经有环境信号输入层
- 已经有规则式状态推断
- 已经有 SkillManager 和技能注册机制
- 已经有 Memory / ActivityLog
- 已经有桌面常驻形态
- 已经有主动运行循环
- 已经开始把提醒系统升级为自然语言计划输入

### 4.2 还没有对齐的核心部分

#### 还没有真正的环境感知深度

缺：

- 当前窗口 / 应用分类
- 学习场景识别
- 更细粒度的活跃模式判断

#### 还没有真正的 Learning Coach Skill

目标应是：

- 聚类学习主题
- 汇总学习时长
- 判断专注 / 碎片化 / 低效
- 给出下一步建议

当前实现只是“按主题生成摘要”

#### 还没有真正的 Emotion Companion Skill

当前聊天只是猫咪人格回复，不是完整的情绪陪伴模块。

#### 还没有把计划系统真正接入 Agent 循环

目前“提醒计划”只是保存和展示，还没有进入：

- 事件触发
- 时间触发
- 状态触发
- 完成率计算
- 偏差分析

#### 还没有真正的行为对齐系统

目标中强调的是：

- 不只是提醒
- 而是把目标、事件、时间窗口、完成情况、偏差分析组织起来

当前仍停留在“输入自然语言计划 + 展示模型判断”的阶段。

## 5. 推荐给下一个 AI 的优先级路线

以下优先级是按照“最符合目标架构收益最大”排序的。

## P0：必须优先完成

### 5.1 把提醒计划系统接入真正的任务状态流

建议新增能力：

- `pending`
- `active`
- `completed`
- `missed`
- `snoozed`

建议做法：

- 为 `useHabits` 中的条目新增状态字段
- 引入真正的时间解析结果
- 对一次性计划与周期计划分别处理

原因：

这是从“只是存条目”走向“真正可执行 Agent 计划”的第一步。

### 5.2 重写 LearningSkill 为真正的 Learning Coach Skill

建议目标：

- 记录学习相关行为日志
- 识别学习类环境
- 对学习时间段做主题聚合
- 输出：
  - 学习主题
  - 学习时长
  - 学习状态评估
  - 下一步建议

原因：

这是项目从“摘要型 AI 宠物”升级成“行为感知型 Agent”的关键。

### 5.3 补全环境信号

建议先做：

- 当前窗口标题 / 应用名
- 学习类应用白名单识别
- 更可靠的活跃度统计

原因：

没有这层，很多后续技能只能停留在想象中。

## P1：第二优先级

### 5.4 新增 Emotion Companion Skill

目标：

- 从聊天输入中识别情绪
- 生成更像陪伴者的反馈
- 不是单纯“可爱回复”，而是和长期状态有关联

### 5.5 把 Chat 显式并入 Agent 输入层

建议：

- 聊天不仅生成回复
- 还要产出结构化事件
- 如：
  - 用户表达疲惫
  - 用户主动请求总结
  - 用户主动请求学习建议

原因：

这样对话才会变成系统的一类输入，而不是孤立 UI。

### 5.6 给 Agent Debug 面板增加更明确的结构化信息

比如：

- 当前输入信号快照
- 当前状态推断原因
- 候选 skill 列表
- 被选中的 skill
- memory 更新内容

## P2：体验优化

### 5.7 给主弹窗和触发弹窗加“气泡尾巴”

让它们更像从小猫身边长出来。

### 5.8 给 `happy` 补独立状态图

现在 `happy` 还复用 `wave.png`。

### 5.9 聊天记录持久化

如果还没重新接回，应加回本地持久化。

### 5.10 更细的视觉一致性

- 面板切换动画
- Skill 弹窗出现/收起动画
- 更统一的图标语言

## 6. 建议下一个 AI 先看的文件

如果下一个 AI 要继续开发，建议按这个顺序建立上下文：

1. [src/components/DesktopApp.jsx](/Users/mengyanyang/Documents/petmind/src/components/DesktopApp.jsx)  
   当前桌面主交互入口

2. [src/core/SkillManager.js](/Users/mengyanyang/Documents/petmind/src/core/SkillManager.js)  
   当前 Agent 循环核心

3. [src/core/StateInference.js](/Users/mengyanyang/Documents/petmind/src/core/StateInference.js)  
   当前状态推断规则

4. [src/services/claudeAgent.js](/Users/mengyanyang/Documents/petmind/src/services/claudeAgent.js)  
   聊天、生成、计划解析都在这里

5. [src/hooks/useHabits.js](/Users/mengyanyang/Documents/petmind/src/hooks/useHabits.js)  
   当前提醒计划数据结构

6. [src/components/HabitPanel.jsx](/Users/mengyanyang/Documents/petmind/src/components/HabitPanel.jsx)  
   当前自然语言计划输入 UI

7. [src/skills/LearningSkill.js](/Users/mengyanyang/Documents/petmind/src/skills/LearningSkill.js)  
   后续最需要重构的 skill 之一

8. [src/core/ActivityLog.js](/Users/mengyanyang/Documents/petmind/src/core/ActivityLog.js)  
   后续行为系统扩展的基础

## 7. 建议下一个 AI 的第一步任务

如果交给下一个 AI，我建议它第一步直接做这件事：

### “把提醒计划条目升级为可执行任务状态系统”

具体建议：

- 扩展 `useHabits` 的条目结构
- 增加状态字段与时间字段
- 为一次性计划和周期任务分别设计最小可行状态机
- 在 Dashboard 中展示“待提醒 / 今日完成 / 已错过”
- 在 SkillManager 中增加一个基于时间与状态的提醒触发入口

原因：

这一步可以把当前“自然语言录入”真正推进成“Agent 可执行对象”，而且不会像重做学习技能那样一下子改太大。

## 8. 总结

当前项目最重要的事实不是“它已经完成了很多功能”，而是：

- 桌面形态已经成立
- Agent 骨架已经成立
- Skill 模块化已经成立
- 状态推断已经开始摆脱大模型主观判断
- 提醒系统已经开始从固定表单升级为自然语言计划输入

但同时也必须明确：

- 现在还不是完整的环境感知型桌面 AI Agent
- 很多核心能力还停留在 MVP 或占位实现
- 后续重点不应放在“再加几个功能”
- 而应放在把输入、状态、技能、计划、记忆、输出真正串成一个持续运行的系统

这份文档应作为后续开发的交接基线，以当前代码真实状态为准，而不是以早期设计设想为准。
