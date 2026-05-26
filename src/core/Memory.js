const STORAGE_KEY = 'petmind_memory';

export class Memory {
  constructor() {
    this.preferences = {
      learningTopic: 'AI大模型',
      newsCategories: ['科技', '国际', '社会'],
      learningHour: 9,
    };
    this.dailyDigests = {};
    this._listeners = [];
    this.load();
  }

  updatePreference(key, value) {
    this.preferences[key] = value;
    this.persist();
    this._notify();
  }

  getPreference(key) {
    return this.preferences[key];
  }

  addDailyDigest(date, digest) {
    this.dailyDigests[date] = digest;
    this.persist();
    this._notify();
  }

  getRecentDigests(n = 7) {
    const dates = Object.keys(this.dailyDigests).sort().reverse();
    return dates.slice(0, n).map(d => ({ date: d, ...this.dailyDigests[d] }));
  }

  getTodayDigest() {
    const today = new Date().toISOString().slice(0, 10);
    return this.dailyDigests[today] || null;
  }

  subscribe(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  _notify() {
    for (const l of this._listeners) l(this);
  }

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        preferences: this.preferences,
        dailyDigests: this.dailyDigests,
      }));
    } catch {}
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.preferences) this.preferences = { ...this.preferences, ...data.preferences };
        if (data.dailyDigests) this.dailyDigests = data.dailyDigests;
      }
    } catch {}
  }
}
