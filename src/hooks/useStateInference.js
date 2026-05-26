import { useState, useEffect, useRef } from 'react';
import { inferState, inferStateAsync } from '../core/StateInference.js';

export function useStateInference(sensors, activityLog, memory, taskPool) {
  const [state, setState] = useState(null);
  const debounceRef = useRef(null);

  const sensorKey = [
    sensors.time?.hour,
    sensors.time?.minute,
    sensors.screenMinutes,
    sensors.isIdle,
    sensors.idleMinutes,
    activityLog?.events?.length,
    memory,
    taskPool?.tasks?.length,
  ].join('|');

  useEffect(() => {
    if (!activityLog || !memory) {
      setState({ primary: 'idle', secondary: null, confidence: 0.5, signals: [] });
      return;
    }

    const syncResult = inferState(sensors, activityLog, memory, taskPool);
    setState(syncResult);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const asyncResult = await inferStateAsync(sensors, activityLog, memory, taskPool);
        setState(asyncResult);
      } catch (e) {
        console.warn('[useStateInference] async inference failed:', e);
      }
    }, 2000);

    return () => clearTimeout(debounceRef.current);
  }, [sensorKey]);

  return state;
}
