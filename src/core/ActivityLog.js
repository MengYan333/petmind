const STORAGE_KEY = 'petmind_activity_log';
const MAX_AGE_DAYS = 7;

export class ActivityLog {
  constructor() {
    this.events = [];
    this._listeners = [];
    this.load();
  }

  log(type, metadata = {}) {
    const event = {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      metadata,
    };
    this.events.push(event);
    this._prune();
    this.persist();
    this._notify();
    return event;
  }

  query({ type, since, until } = {}) {
    return this.events.filter(e => {
      if (type && e.type !== type) return false;
      if (since && e.timestamp < since) return false;
      if (until && e.timestamp > until) return false;
      return true;
    });
  }

  lastEvent(type) {
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].type === type) return this.events[i];
    }
    return null;
  }

  minutesSinceLast(type) {
    const ev = this.lastEvent(type);
    if (!ev) return Infinity;
    return (Date.now() - ev.timestamp) / 60000;
  }

  getCompletionStatus(eventType, windowMs) {
    const cutoff = Date.now() - windowMs;
    return this.events.some(e => e.type === eventType && e.timestamp >= cutoff);
  }

  getDailySummary(date) {
    const dayStart = date ? new Date(date).setHours(0, 0, 0, 0) : new Date().setHours(0, 0, 0, 0);
    const dayEnd = dayStart + 86400000;
    const dayEvents = this.query({ since: dayStart, until: dayEnd });

    const byType = {};
    for (const e of dayEvents) {
      byType[e.type] = (byType[e.type] || 0) + 1;
    }

    return {
      total: dayEvents.length,
      byType,
      events: dayEvents,
    };
  }

  subscribe(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  _notify() {
    for (const l of this._listeners) l(this.events);
  }

  _prune() {
    const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;
    this.events = this.events.filter(e => e.timestamp >= cutoff);
  }

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
    } catch {}
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.events = JSON.parse(raw);
        this._prune();
      }
    } catch {
      this.events = [];
    }
    // Seed initial timestamps so skills don't fire immediately on first launch
    const now = Date.now();
    const types = ['stretch', 'drink', 'rest'];
    for (const t of types) {
      if (!this.lastEvent(t)) {
        this.events.push({ id: crypto.randomUUID(), type: t, timestamp: now, metadata: { _init: true } });
      }
    }
  }
}
