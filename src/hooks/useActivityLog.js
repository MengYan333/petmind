import { useRef, useState, useCallback, useEffect } from 'react';
import { ActivityLog } from '../core/ActivityLog.js';

export function useActivityLog() {
  const logRef = useRef(null);
  if (!logRef.current) logRef.current = new ActivityLog();
  const instance = logRef.current;

  const [events, setEvents] = useState(instance.events);

  useEffect(() => {
    const unsub = instance.subscribe((evts) => setEvents([...evts]));
    return unsub;
  }, [instance]);

  const log = useCallback((type, metadata) => {
    return instance.log(type, metadata);
  }, [instance]);

  const query = useCallback((opts) => {
    return instance.query(opts);
  }, [instance]);

  const getCompletionStatus = useCallback((eventType, windowMs) => {
    return instance.getCompletionStatus(eventType, windowMs);
  }, [instance]);

  const getDailySummary = useCallback((date) => {
    return instance.getDailySummary(date);
  }, [instance]);

  const minutesSinceLast = useCallback((type) => {
    return instance.minutesSinceLast(type);
  }, [instance]);

  return { log, query, getCompletionStatus, getDailySummary, minutesSinceLast, events, instance };
}
