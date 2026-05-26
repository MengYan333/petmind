const STORAGE_KEY = 'petmind_taskpool';

export class TaskPool {
  constructor() {
    this.tasks = [];
    this._listeners = [];
    this.load();
  }

  add(taskData) {
    const task = {
      id: taskData.id || `task_${Date.now()}`,
      title: taskData.title || taskData.rawText || '',
      rawText: taskData.rawText || taskData.title || '',
      kind: taskData.kind || 'idea', // habit | plan | idea
      status: taskData.status || 'pending', // pending | active | completed | missed | snoozed
      priority: taskData.priority || 'medium', // high | medium | low
      tags: taskData.tags || [],
      steps: (taskData.steps || []).map((s, i) => ({
        id: i + 1,
        text: typeof s === 'string' ? s : s.text,
        done: false,
      })),
      estimatedMinutes: taskData.estimatedMinutes || 60,
      deadline: taskData.deadline || null,
      deadlineLabel: taskData.deadlineLabel || null,
      cadence: taskData.cadence || null, // { type: 'daily' | 'weekly' | 'once', day?: number }
      cadenceLabel: taskData.cadenceLabel || null,
      scheduleSummary: taskData.scheduleSummary || null,
      reminderPlan: taskData.reminderPlan || null,
      triggerHints: taskData.triggerHints || [],
      eventType: taskData.eventType || 'custom',
      createdAt: taskData.createdAt || Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      snoozedUntil: null,
      notes: taskData.notes || [],
    };
    this.tasks.push(task);
    this.persist();
    this._notify();
    return task;
  }

  update(id, changes) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    this.tasks[idx] = { ...this.tasks[idx], ...changes, updatedAt: Date.now() };
    this.persist();
    this._notify();
    return this.tasks[idx];
  }

  remove(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.persist();
    this._notify();
  }

  setStatus(id, status) {
    const task = this.get(id);
    if (!task) return null;
    const changes = { status, updatedAt: Date.now() };
    if (status === 'completed') changes.completedAt = Date.now();
    if (status === 'snoozed') changes.snoozedUntil = Date.now() + 3600000; // snooze 1 hour
    if (status === 'pending') { changes.snoozedUntil = null; changes.completedAt = null; }
    return this.update(id, changes);
  }

  get(id) {
    return this.tasks.find(t => t.id === id) || null;
  }

  getByStatus(status) {
    return this.tasks.filter(t => t.status === status);
  }

  getByKind(kind) {
    return this.tasks.filter(t => t.kind === kind);
  }

  getActiveTasks() {
    return this.tasks.filter(t => t.status === 'pending' || t.status === 'active');
  }

  getTodayTasks() {
    const today = new Date();
    const todayDay = today.getDay(); // 0=Sun, 1=Mon, ...
    return this.tasks.filter(t => {
      if (t.status === 'completed' || t.status === 'missed') return false;
      if (t.snoozedUntil && t.snoozedUntil > Date.now()) return false;
      // habit with cadence
      if (t.kind === 'habit') return true;
      // plan with weekly cadence matching today
      if (t.cadence?.type === 'weekly' && t.cadence.day === todayDay) return true;
      // plan with daily cadence
      if (t.cadence?.type === 'daily') return true;
      // once / idea: created today or still pending
      if (t.status === 'pending' || t.status === 'active') return true;
      return false;
    });
  }

  toggleStep(taskId, stepId) {
    const task = this.get(taskId);
    if (!task) return null;
    const steps = task.steps.map(s =>
      s.id === stepId ? { ...s, done: !s.done } : s
    );
    return this.update(taskId, { steps });
  }

  getCompletionRate(taskId) {
    const task = this.get(taskId);
    if (!task || task.steps.length === 0) return task?.status === 'completed' ? 1 : 0;
    const done = task.steps.filter(s => s.done).length;
    return done / task.steps.length;
  }

  getTodayStats() {
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const today = this.getTodayTasks();
    const completed = this.tasks.filter(t =>
      t.status === 'completed' && t.completedAt && t.completedAt >= todayStart
    );
    return {
      total: today.length,
      completed: completed.length,
      pending: today.filter(t => t.status === 'pending').length,
      active: today.filter(t => t.status === 'active').length,
    };
  }

  markMissed() {
    const today = this.getTodayTasks();
    const now = new Date();
    const endOfDay = new Date().setHours(23, 59, 59, 999);
    for (const task of today) {
      if (task.status === 'pending' && now > endOfDay) {
        this.setStatus(task.id, 'missed');
      }
    }
  }

  subscribe(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  _notify() {
    const snapshot = [...this.tasks];
    for (const l of this._listeners) l(snapshot);
  }

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tasks));
    } catch {}
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.tasks = JSON.parse(raw);
        // migrate: ensure steps array exists
        this.tasks = this.tasks.map(t => ({
          ...t,
          steps: t.steps || [],
          notes: t.notes || [],
        }));
      }
    } catch {
      this.tasks = [];
    }
  }
}
