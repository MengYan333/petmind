const NEWS_KEY = 'petmind_news_cache';

export function getNewsCache() {
  try {
    const raw = localStorage.getItem(NEWS_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const today = new Date().toDateString();
    return cache.date === today ? cache.headlines : null;
  } catch {
    return null;
  }
}

export function setNewsCache(headlines) {
  try {
    localStorage.setItem(NEWS_KEY, JSON.stringify({
      date: new Date().toDateString(),
      headlines,
    }));
  } catch {}
}
