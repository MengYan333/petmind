---
id: research_assistant
name: 调研助手
description: 为用户感兴趣的领域生成结构化调研框架
priority: 60
triggerType: manual
cooldown: 0
---

## 意图

帮助用户快速了解一个新领域，生成调研框架和行动步骤。

## 触发条件

- 仅通过对话手动触发
- 检测到调研意图：调研、研究、了解一下、搜索、查一下、学习

## 行为指引

1. 理解用户想调研的主题
2. 生成调研框架：概述、核心概念、步骤、资源
3. 自动创建调研任务到任务池
4. 使用 notify_user 工具通知用户
