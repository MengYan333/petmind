import Anthropic from '@anthropic-ai/sdk';
import { getLearningCache, setLearningCache } from '../hooks/useLearningCache';
import { getNewsCache, setNewsCache } from '../hooks/useNewsCache';

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

const TOOLS = [
  {
    name: 'set_pet_state',
    description: "Set the pet's visual state, message to show user, and action buttons. Call this to deliver the final decision.",
    input_schema: {
      type: 'object',
      properties: {
        state: {
          type: 'string',
          enum: ['normal', 'thirsty', 'sleepy', 'exercise', 'rainy', 'hot', 'learning', 'news', 'happy'],
          description: 'Visual state of the pet',
        },
        message: {
          type: 'string',
          description: '简短的宠物消息（最多30字，亲切口语）',
        },
        actions: {
          type: 'array',
          items: { type: 'string' },
          description: '最多3个操作按钮，如 ["好，我去喝水", "再等一会儿"]',
        },
        reasoning: {
          type: 'string',
          description: '简要说明为什么选择这个状态',
        },
      },
      required: ['state', 'message', 'actions', 'reasoning'],
    },
  },
  {
    name: 'fetch_learning_summary',
    description: "Summarize today's content for the user's learning topic in 3 sentences.",
    input_schema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: '要总结的主题，如 "AI大模型"、"设计"、"编程"',
        },
      },
      required: ['topic'],
    },
  },
  ,{
    name: 'fetch_news_summary',
    description: "Generate a brief summary of today's top news in 3 bullet points, in Chinese.",
    input_schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: '新闻分类，如 ["科技", "国际", "社会"]',
        },
      },
      required: ['categories'],
    },
  }
];

export async function runAgent(sensors, habits, userPrefs, onLog) {
  onLog({ type: 'info', text: `🔍 收集传感器数据...` });
  onLog({ type: 'tool', text: `get_time() → ${sensors.time.hour}:${String(sensors.time.minute).padStart(2, '0')}` });
  onLog({ type: 'tool', text: `get_weather() → ${sensors.weather.condition}, ${sensors.weather.temp}°C` });
  onLog({ type: 'tool', text: `get_screen_time() → ${sensors.screenMinutes}分钟` });

  const contextPrompt = `
你是用户桌面宠物的大脑。根据当前环境数据，决定宠物该展示什么状态。

当前数据：
- 时间：${sensors.time.hour}:${String(sensors.time.minute).padStart(2, '0')}
- 天气：${sensors.weather.condition}，${sensors.weather.temp}°C
- 连续使用电脑：${sensors.screenMinutes} 分钟
- 深夜模式：${sensors.time.isLateNight ? '是' : '否'}
- 用户学习主题：${userPrefs.learningTopic || 'AI大模型'}
- 今日待提醒习惯：${habits.map(h => h.label).join('、') || '无'}
- 用户新闻偏好：${(userPrefs.newsCategories || ['科技', '国际', '社会']).join('、')}

优先级规则：
0. 早晨（8-10点，即 hour >= 8 && hour < 10）→ 先 fetch_news_summary，再 set_pet_state news
1. 深夜（23点后）→ sleepy（催睡）
2. 连续使用 ≥ 60分钟 → exercise
3. 下雨天（Rain/Drizzle/Thunderstorm）→ rainy
4. 高温（≥ 35°C）→ hot
5. 喝水时间到 → thirsty
6. 学习时间到 → 先 fetch_learning_summary，再 set_pet_state learning
7. 以上都不满足 → normal

当多个条件同时满足时，按上述优先级选最高的一个。
使用工具 set_pet_state 给出最终决策。消息要简短亲切，像宠物说话。
`.trim();

  const messages = [{ role: 'user', content: contextPrompt }];
  let petDecision = null;
  let learningSummary = null;
  let newsHeadlines = null;

  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(b => b.type === 'tool_use');
      const toolResults = [];

      for (const toolUse of toolUses) {
        onLog({ type: 'tool', text: `${toolUse.name}(${JSON.stringify(toolUse.input).slice(0, 60)})` });

        let result;
        if (toolUse.name === 'set_pet_state') {
          petDecision = toolUse.input;
          onLog({ type: 'decision', text: `💡 决策：${toolUse.input.reasoning}` });
          result = { success: true };
        } else if (toolUse.name === 'fetch_learning_summary') {
          const cached = getLearningCache(toolUse.input.topic);
          if (cached) {
            learningSummary = cached;
            onLog({ type: 'tool', text: `📚 使用今日缓存摘要 (${cached.length}字)` });
            result = { summary: cached };
          } else {
            const summaryRes = await client.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 256,
              messages: [{
                role: 'user',
                content: `用3句话总结今天"${toolUse.input.topic}"领域最新进展，每句话不超过30字，面向普通用户。`,
              }],
            });
            learningSummary = summaryRes.content[0].text;
            setLearningCache(toolUse.input.topic, learningSummary);
            onLog({ type: 'tool', text: `📚 摘要生成并缓存 (${learningSummary.length}字)` });
            result = { summary: learningSummary };
          }
        } else if (toolUse.name === 'fetch_news_summary') {
          const cached = getNewsCache();
          if (cached) {
            newsHeadlines = cached;
            onLog({ type: 'tool', text: `📰 使用今日缓存新闻 (${cached.length}字)` });
            result = { headlines: cached };
          } else {
            const cats = (toolUse.input.categories || ['科技', '国际', '社会']).join('、');
            const newsRes = await client.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 300,
              messages: [{
                role: 'user',
                content: `请用3条简短新闻摘要介绍${new Date().toLocaleDateString('zh-CN')}${cats}领域的重要动态，每条一句话不超过30字，用"•"开头。`,
              }],
            });
            newsHeadlines = newsRes.content[0].text;
            setNewsCache(newsHeadlines);
            onLog({ type: 'tool', text: `📰 新闻摘要生成并缓存 (${newsHeadlines.length}字)` });
            result = { headlines: newsHeadlines };
          }
        }

        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) });
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    } else {
      break;
    }
  }

  return { petDecision, learningSummary, newsHeadlines };
}
