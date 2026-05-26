const BASE_URL = import.meta.env.VITE_AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const API_KEY = import.meta.env.VITE_AI_API_KEY || '';
const MODEL = import.meta.env.VITE_AI_MODEL || 'qwen3.7-max-preview';

async function chatCompletion(messages, tools, maxTokens = 2048) {
  const body = {
    model: MODEL,
    messages,
    max_tokens: maxTokens,
    temperature: 0.3,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const result = await window.electronAPI.aiChat({
    baseURL: BASE_URL,
    apiKey: API_KEY,
    ...body,
  });

  return result;
}

export async function agentStep(messages, tools, context, maxIterations = 5) {
  const toolCalls = [];
  let iterations = 0;
  let reply = '';

  while (iterations < maxIterations) {
    iterations++;
    let response;
    try {
      response = await chatCompletion(messages, tools);
    } catch (e) {
      console.error('[agentStep] API error:', e);
      reply = `API 调用失败: ${e.message}`;
      break;
    }

    if (!response) {
      reply = 'API 返回空响应';
      break;
    }

    if (response.error) {
      reply = `API 错误: ${response.error.message || JSON.stringify(response.error)}`;
      break;
    }

    const choice = response.choices?.[0];
    if (!choice) {
      reply = 'API 返回无 choices';
      break;
    }

    const assistantMessage = choice.message;
    if (!assistantMessage) {
      reply = 'API 返回空 message';
      break;
    }

    messages.push(assistantMessage);

    // Check if there are tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (const tc of assistantMessage.tool_calls) {
        const toolName = tc.function?.name || tc.name || 'unknown';
        let toolArgs;
        try {
          toolArgs = JSON.parse(tc.function?.arguments || tc.arguments || '{}');
        } catch {
          toolArgs = {};
        }

        toolCalls.push({ name: toolName, args: toolArgs });

        // Execute tool
        const { executeTool } = await import('../core/AgentTools.js');
        let result;
        try {
          result = executeTool(toolName, toolArgs, context);
          if (result instanceof Promise) result = await result;
        } catch (e) {
          result = { error: e.message };
        }

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    } else {
      reply = assistantMessage.content || '';
      break;
    }
  }

  return { reply, toolCalls, iterations };
}
