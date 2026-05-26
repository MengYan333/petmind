import { useState, useEffect, useRef, useCallback } from 'react';
import { TaskPool } from '../core/TaskPool.js';

export function useTaskPool() {
  const instanceRef = useRef(null);
  if (!instanceRef.current) {
    instanceRef.current = new TaskPool();
  }
  const [tasks, setTasks] = useState(instanceRef.current.tasks);

  useEffect(() => {
    const unsub = instanceRef.current.subscribe(setTasks);
    return unsub;
  }, []);

  const addTask = useCallback((data) => instanceRef.current.add(data), []);
  const updateTask = useCallback((id, changes) => instanceRef.current.update(id, changes), []);
  const removeTask = useCallback((id) => instanceRef.current.remove(id), []);
  const setTaskStatus = useCallback((id, status) => instanceRef.current.setStatus(id, status), []);
  const toggleStep = useCallback((taskId, stepId) => instanceRef.current.toggleStep(taskId, stepId), []);
  const getTodayTasks = useCallback(() => instanceRef.current.getTodayTasks(), []);
  const getTodayStats = useCallback(() => instanceRef.current.getTodayStats(), []);

  return {
    tasks,
    addTask,
    updateTask,
    removeTask,
    setTaskStatus,
    toggleStep,
    getTodayTasks,
    getTodayStats,
    instance: instanceRef.current,
  };
}
