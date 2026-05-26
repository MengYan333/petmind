import { useRef, useState, useCallback } from 'react';
import { SkillManager } from '../core/SkillManager.js';

export function useSkillManager(sensors, inferredState, activityLog, memory, taskPool) {
  const managerRef = useRef(null);
  if (!managerRef.current) {
    managerRef.current = new SkillManager();
    managerRef.current.loadFromMd();
  }
  const manager = managerRef.current;

  const [lastResult, setLastResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);

  const sensorsRef = useRef(sensors);
  sensorsRef.current = sensors;
  const activityLogRef = useRef(activityLog);
  activityLogRef.current = activityLog;
  const memoryRef = useRef(memory);
  memoryRef.current = memory;
  const taskPoolRef = useRef(taskPool);
  taskPoolRef.current = taskPool;
  const isRunningRef = useRef(false);

  const addLog = useCallback((log) => {
    setLogs(prev => [...prev.slice(-30), { ...log, ts: Date.now() }]);
  }, []);

  // 超时保护：防止 API 调用卡住导致 isRunningRef 永远为 true
  function withTimeout(promise, ms = 90000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`超时 (${ms/1000}s)`)), ms)),
    ]);
  }

  const runLoop = useCallback(async () => {
    if (isRunningRef.current) return null;
    isRunningRef.current = true;
    setIsRunning(true);
    setLogs([]);
    try {
      const result = await withTimeout(manager.runLoop(
        sensorsRef.current,
        activityLogRef.current.instance,
        memoryRef.current.instance,
        addLog,
        taskPoolRef.current.instance,
      ));
      if (result) setLastResult(result);
      return result;
    } catch (e) {
      addLog({ type: 'info', text: `❌ 循环错误: ${e.message}` });
      return null;
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
    }
  }, [manager, addLog]);

  const runSkill = useCallback(async (skillId, ...args) => {
    if (isRunningRef.current) return null;
    isRunningRef.current = true;
    setIsRunning(true);
    setLogs([]);
    try {
      const context = {
        sensors: sensorsRef.current,
        inferredState: null,
        activityLog: activityLogRef.current.instance,
        memory: memoryRef.current.instance,
        taskPool: taskPoolRef.current.instance,
      };
      const result = await withTimeout(manager.executeSkill(skillId, context, ...args));
      if (result) {
        // 如果有 memoryUpdate，先保存到 memory
        if (result.memoryUpdate) {
          const memory = memoryRef.current.instance;
          for (const [key, value] of Object.entries(result.memoryUpdate)) {
            if (key === 'dailyDigest') {
              const today = new Date().toISOString().slice(0, 10);
              memory.addDailyDigest(today, value);
            } else {
              memory.updatePreference(key, value);
            }
          }
          addLog({ type: 'tool', text: `💾 Memory 已更新` });
        }

        // 兜底：如果 AI 没调用 update_memory 但回复里有 plan JSON，解析保存
        if (skillId === 'plan_generator' && !result.memoryUpdate?.todayPlan) {
          try {
            const reply = result.message || '';
            const jsonMatch = reply.match(/\{[\s\S]*"sections"[\s\S]*\}/);
            if (jsonMatch) {
              const plan = JSON.parse(jsonMatch[0]);
              if (plan.sections?.length > 0) {
                memoryRef.current.instance.updatePreference('todayPlan', plan);
                result.memoryUpdate = { todayPlan: plan };
                addLog({ type: 'tool', text: `💾 从回复中解析并保存计划` });
              }
            }
          } catch {}
        }

        // 如果没有 actions（AI 没调 notify_user），自动生成反馈
        if (!result.actions?.length && result.memoryUpdate?.todayPlan) {
          result.actions = ['查看今日计划', '好的'];
          result.petState = result.petState || 'news';
          result.message = result.message || '今日计划已生成';
        }

        setLastResult({ ...result, skillId });
        addLog({ type: 'decision', text: `🎯 手动执行: ${skillId}` });
        addLog({ type: 'decision', text: `✅ 输出: ${result.message}` });
      }
      return result;
    } catch (e) {
      addLog({ type: 'info', text: `❌ 执行失败: ${e.message}` });
      setLastResult({
        petState: 'normal',
        message: `执行失败: ${e.message}`,
        actions: [],
        skillId,
      });
      return null;
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
    }
  }, [manager, addLog]);

  const runParse = useCallback(async (input) => {
    return runSkill('intent_parser', `用户输入：${input}`);
  }, [runSkill]);

  const executeChat = useCallback(async (userMessage, history) => {
    if (isRunningRef.current) return null;
    isRunningRef.current = true;
    setIsRunning(true);
    try {
      const context = {
        sensors: sensorsRef.current,
        inferredState: null,
        activityLog: activityLogRef.current.instance,
        memory: memoryRef.current.instance,
        taskPool: taskPoolRef.current.instance,
      };
      const result = await withTimeout(manager.executeChat(userMessage, history, context));
      if (result) {
        setLastResult({ ...result, skillId: 'chat' });
        addLog({ type: 'decision', text: `💬 对话: ${userMessage.slice(0, 30)}` });
      }
      return result;
    } catch (e) {
      addLog({ type: 'info', text: `❌ Chat error: ${e.message}` });
      return null;
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
    }
  }, [manager, addLog]);

  return { runLoop, runSkill, runParse, executeChat, lastResult, isRunning, logs, addLog };
}
