// 工具定义（OpenAI function calling 格式）
export const TOOL_DEFINITIONS = [
  // TaskPool 工具
  {
    type: 'function',
    function: {
      name: 'add_task',
      description: '创建新任务',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '任务标题' },
          kind: { type: 'string', enum: ['habit', 'plan', 'idea'], description: '任务类型：habit=习惯，plan=安排，idea=灵感' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'], description: '优先级' },
          tags: { type: 'array', items: { type: 'string' }, description: '标签数组，如["工作","生活"]' },
          steps: { type: 'array', items: { type: 'string' }, description: '步骤数组' },
          estimatedMinutes: { type: 'number', description: '预估分钟数' },
          deadline: { type: 'number', description: '截止时间戳（毫秒）' },
          deadlineLabel: { type: 'string', description: '截止日期文字描述' },
          cadence: { type: 'object', description: '节奏，如{type:"daily"}或{type:"weekly",day:6}' },
          cadenceLabel: { type: 'string', description: '节奏说明' }
        },
        required: ['title', 'kind']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: '更新任务字段',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: '任务ID' },
          updates: { type: 'object', description: '要更新的字段和值，如{title:"新标题",priority:"high"}' }
        },
        required: ['taskId', 'updates']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'set_task_status',
      description: '设置任务状态',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: '任务ID' },
          status: { type: 'string', enum: ['pending', 'active', 'completed', 'snoozed', 'missed'], description: '新状态' }
        },
        required: ['taskId', 'status']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remove_task',
      description: '删除任务',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: '任务ID' }
        },
        required: ['taskId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: '获取任务列表',
      parameters: {
        type: 'object',
        properties: {
          filter: { type: 'string', enum: ['today', 'active', 'all', 'by_kind', 'by_status'], description: '过滤方式' },
          kind: { type: 'string', enum: ['habit', 'plan', 'idea'], description: '按类型过滤（仅filter=by_kind时使用）' },
          status: { type: 'string', enum: ['pending', 'active', 'completed', 'missed', 'snoozed'], description: '按状态过滤（仅filter=by_status时使用）' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'toggle_step',
      description: '切换任务步骤的完成状态',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: '任务ID' },
          stepId: { type: 'number', description: '步骤ID' }
        },
        required: ['taskId', 'stepId']
      }
    }
  },
  // Memory 工具
  {
    type: 'function',
    function: {
      name: 'update_memory',
      description: '更新用户偏好或记忆',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: '偏好键名' },
          value: { description: '偏好值（可以是任意类型）' }
        },
        required: ['key', 'value']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_memory',
      description: '获取用户偏好或记忆',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: '偏好键名' }
        },
        required: ['key']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_daily_digest',
      description: '添加每日总结',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: '日期，格式YYYY-MM-DD' },
          digest: { type: 'object', description: '总结内容' }
        },
        required: ['date', 'digest']
      }
    }
  },
  // ActivityLog 工具
  {
    type: 'function',
    function: {
      name: 'log_activity',
      description: '记录活动事件',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: '事件类型，如task_reminder, plan_generated等' },
          metadata: { type: 'object', description: '事件元数据' }
        },
        required: ['type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_activity',
      description: '检查活动状态（用于冷却判断）',
      parameters: {
        type: 'object',
        properties: {
          eventType: { type: 'string', description: '事件类型' },
          windowMs: { type: 'number', description: '时间窗口（毫秒）' }
        },
        required: ['eventType', 'windowMs']
      }
    }
  },
  // 搜索工具
  {
    type: 'function',
    function: {
      name: 'search_topic',
      description: '搜索某个主题的相关信息，返回结构化的搜索结果',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: '要搜索的主题' },
          depth: { type: 'string', enum: ['quick', 'detailed'], description: '搜索深度：quick=快速概览，detailed=详细调研' }
        },
        required: ['topic']
      }
    }
  },
  // 文档生成工具
  {
    type: 'function',
    function: {
      name: 'generate_document',
      description: '生成技术文档或学习资料，保存到本地 docs 目录',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '文档标题' },
          content: { type: 'string', description: '文档内容（Markdown 格式）' },
          category: { type: 'string', enum: ['research', 'learning', 'notes', 'guide'], description: '文档类型' }
        },
        required: ['title', 'content']
      }
    }
  },
  // 资源整理工具
  {
    type: 'function',
    function: {
      name: 'collect_resources',
      description: '整理学习资源链接，保存到记忆中',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: '主题' },
          resources: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, url: { type: 'string' }, description: { type: 'string' } } }, description: '资源列表' }
        },
        required: ['topic', 'resources']
      }
    }
  },
  // YouTube 搜索工具
  {
    type: 'function',
    function: {
      name: 'search_youtube',
      description: '在 YouTube 上搜索视频，返回视频链接',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' }
        },
        required: ['query']
      }
    }
  },
  // URL 摘要工具
  {
    type: 'function',
    function: {
      name: 'summarize_url',
      description: '读取网页内容并生成结构化摘要',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '要总结的网页 URL' }
        },
        required: ['url']
      }
    }
  },
  // 通知工具
  {
    type: 'function',
    function: {
      name: 'notify_user',
      description: '向用户发送通知（通过宠物气泡）',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: '通知消息（不超过30字）' },
          petState: { type: 'string', enum: ['normal', 'thinking', 'working', 'happy', 'news', 'sleepy', 'exercise'], description: '宠物状态' },
          actions: { type: 'array', items: { type: 'string' }, description: '操作按钮，如["开始做","等会儿"]' }
        },
        required: ['message']
      }
    }
  }
];

// 工具执行器
export function executeTool(name, args, context) {
  const { taskPool, memory, activityLog } = context;

  switch (name) {
    // TaskPool 工具
    case 'add_task':
      return taskPool.add(args);
    case 'update_task':
      return taskPool.update(args.taskId, args.updates);
    case 'set_task_status':
      return taskPool.setStatus(args.taskId, args.status);
    case 'remove_task':
      taskPool.remove(args.taskId);
      return { success: true };
    case 'get_tasks':
      if (args.filter === 'today') return taskPool.getTodayTasks();
      if (args.filter === 'active') return taskPool.getActiveTasks();
      if (args.filter === 'by_kind') return taskPool.getByKind(args.kind);
      if (args.filter === 'by_status') return taskPool.getByStatus(args.status);
      return taskPool.tasks;
    case 'toggle_step':
      return taskPool.toggleStep(args.taskId, args.stepId);

    // Memory 工具
    case 'update_memory':
      memory.updatePreference(args.key, args.value);
      return { success: true };
    case 'get_memory':
      return memory.getPreference(args.key);
    case 'add_daily_digest':
      memory.addDailyDigest(args.date, args.digest);
      return { success: true };

    // ActivityLog 工具
    case 'log_activity':
      return activityLog.log(args.type, args.metadata);
    case 'check_activity':
      return activityLog.getCompletionStatus(args.eventType, args.windowMs);

    // 搜索工具
    case 'search_topic':
      return searchTopic(args.topic, args.depth);

    // 文档生成工具
    case 'generate_document':
      return generateDocument(args.title, args.content, args.category);

    // 资源整理工具
    case 'collect_resources':
      return collectResources(args.topic, args.resources, memory);

    // YouTube 搜索工具
    case 'search_youtube':
      return searchYouTube(args.query);

    // URL 摘要工具
    case 'summarize_url':
      return summarizeUrl(args.url);

    // 通知工具
    case 'notify_user':
      return { notified: true, ...args };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// 搜索主题（使用 DashScope AI 联网搜索）
async function searchTopic(topic, depth = 'quick') {
  if (window.electronAPI?.webSearch) {
    try {
      const searchResult = await window.electronAPI.webSearch(topic);
      if (searchResult.success) {
        return {
          topic,
          depth,
          timestamp: Date.now(),
          source: 'dashscope_search',
          results: searchResult.results,
          aiSummary: searchResult.aiSummary,
          extractedLinks: searchResult.extractedLinks || [],
        };
      }
    } catch (e) {
      console.error('Search failed:', e);
    }
  }

  // 降级到 AI 生成
  return {
    topic,
    depth,
    timestamp: Date.now(),
    source: 'ai_generated',
    needsAI: true,
    prompt: depth === 'detailed'
      ? `请详细调研「${topic}」，包括：1) 核心概念 2) 技术原理 3) 实际应用 4) 学习路径 5) 推荐资源（包含链接）`
      : `请快速介绍「${topic}」，包括：1) 是什么 2) 核心特点 3) 推荐学习链接`
  };
}

// URL 摘要
async function summarizeUrl(url) {
  if (window.electronAPI?.summarizeUrl) {
    try {
      const result = await window.electronAPI.summarizeUrl(url);
      if (result.success) {
        return {
          success: true,
          url,
          summary: result.summary,
          extractedLinks: result.extractedLinks || [],
        };
      }
    } catch (e) {
      console.error('URL summary failed:', e);
    }
  }

  // 降级：返回 URL 本身
  return {
    success: false,
    url,
    summary: `无法读取该网页内容，请直接访问：${url}`,
  };
}

// 生成文档（保存到 localStorage 和文件系统）
function generateDocument(title, content, category = 'notes') {
  const doc = {
    id: `doc_${Date.now()}`,
    title,
    content,
    category,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // 保存到 localStorage
  try {
    const docs = JSON.parse(localStorage.getItem('petmind_documents') || '[]');
    docs.push(doc);
    localStorage.setItem('petmind_documents', JSON.stringify(docs));
  } catch (e) {
    console.error('Failed to save document to localStorage:', e);
  }

  // 如果在 Electron 环境中，也保存到 docs 目录
  if (window.electronAPI?.saveDocument) {
    try {
      window.electronAPI.saveDocument(title, content, category);
    } catch (e) {
      console.error('Failed to save document to file system:', e);
    }
  }

  return { success: true, document: doc };
}

// 整理资源（保存到 Memory）
function collectResources(topic, resources, memory) {
  const resourceList = {
    topic,
    resources,
    collectedAt: Date.now()
  };

  // 保存到 Memory
  const existing = memory.getPreference('learningResources') || {};
  existing[topic] = resourceList;
  memory.updatePreference('learningResources', existing);

  return { success: true, resourceList };
}

// YouTube 搜索
async function searchYouTube(query) {
  if (window.electronAPI?.youtubeSearch) {
    try {
      const result = await window.electronAPI.youtubeSearch(query);
      return result;
    } catch (e) {
      console.error('YouTube search failed:', e);
    }
  }

  // 降级：返回搜索链接
  const encodedQuery = encodeURIComponent(query);
  return {
    success: true,
    query,
    videos: [],
    searchUrl: `https://www.youtube.com/results?search_query=${encodedQuery}`
  };
}
