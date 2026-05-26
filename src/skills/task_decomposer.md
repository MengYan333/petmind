---
id: task_decomposer
name: 任务拆解
description: 自动将灵感和复杂计划拆解为可执行的步骤
priority: 70
triggerType: auto
cooldown: 1200000
---

## 意图

帮助用户将抽象的灵感或复杂的计划拆解为具体的行动步骤，降低执行门槛。

## 触发条件

- 存在 status=pending 且 (kind=idea 或 kind=plan) 且 steps 为空的任务
- 每 20 分钟检查一次

## 行为指引

1. 从任务池获取需要拆解的任务（idea 或 plan 类型）
2. 为每个任务生成 3 个以内具体步骤
3. 更新任务的 steps 字段
4. 使用 notify_user 工具通知用户
