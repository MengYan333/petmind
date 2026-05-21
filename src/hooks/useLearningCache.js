const CACHE_KEY = 'petmind_learning_cache';

export function getLearningCache(topic) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const today = new Date().toDateString();
    if (cache.date === today && cache.topic === topic) {
      return cache.summary;
    }
    return null;
  } catch {
    return null;
  }
}

export function setLearningCache(topic, summary) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      date: new Date().toDateString(),
      topic,
      summary,
    }));
  } catch {}
}
