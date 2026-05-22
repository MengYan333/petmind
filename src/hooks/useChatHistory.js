import { useState, useEffect } from 'react';

const KEY = 'petmind-chat';
const MAX = 50;

export function useChatHistory() {
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(messages.slice(-MAX)));
  }, [messages]);

  function addMessage(role, text) {
    setMessages(prev => [...prev.slice(-(MAX - 1)), { role, text, ts: Date.now() }]);
  }

  function clearHistory() {
    setMessages([]);
    localStorage.removeItem(KEY);
  }

  return { messages, addMessage, clearHistory };
}
