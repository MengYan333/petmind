import { useRef, useState, useCallback, useEffect } from 'react';
import { Memory } from '../core/Memory.js';

export function useMemory() {
  const memRef = useRef(null);
  if (!memRef.current) memRef.current = new Memory();
  const instance = memRef.current;

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsub = instance.subscribe(() => forceUpdate(n => n + 1));
    return unsub;
  }, [instance]);

  const updatePreference = useCallback((key, value) => {
    instance.updatePreference(key, value);
  }, [instance]);

  const getPreference = useCallback((key) => {
    return instance.getPreference(key);
  }, [instance]);

  return { instance, updatePreference, getPreference };
}
