import { useState, useEffect, useRef } from 'react';

export function useScreenTime() {
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const startRef = useRef(Date.now());
  const lastActivityRef = useRef(Date.now());
  const IDLE_THRESHOLD = 5 * 60 * 1000;

  useEffect(() => {
    const onActivity = () => { lastActivityRef.current = Date.now(); };
    document.addEventListener('mousemove', onActivity);
    document.addEventListener('keydown', onActivity);
    document.addEventListener('click', onActivity);

    const handleVisibility = () => {
      if (document.hidden) {
        startRef.current = null;
      } else {
        startRef.current = Date.now();
        lastActivityRef.current = Date.now();
        setSessionMinutes(0);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const interval = setInterval(() => {
      if (document.hidden || !startRef.current) return;
      const idleSince = Date.now() - lastActivityRef.current;
      if (idleSince > IDLE_THRESHOLD) return;
      setSessionMinutes(Math.floor((Date.now() - startRef.current) / 60000));
    }, 15000);

    return () => {
      document.removeEventListener('mousemove', onActivity);
      document.removeEventListener('keydown', onActivity);
      document.removeEventListener('click', onActivity);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, []);

  return sessionMinutes;
}
