import { useState, useEffect, useRef } from 'react';

export function useScreenTime() {
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [isIdle, setIsIdle] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState(0);
  const startRef = useRef(Date.now());
  const lastActivityRef = useRef(Date.now());
  const IDLE_THRESHOLD = 5 * 60 * 1000;

  useEffect(() => {
    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Use window instead of document — document events may not fire in
    // Electron when the window is in mouse-ignore mode.
    window.addEventListener('keydown', onActivity);
    window.addEventListener('click', onActivity);

    const interval = setInterval(() => {
      if (document.hidden) return;
      const now = Date.now();
      const idleSince = now - lastActivityRef.current;
      if (idleSince > IDLE_THRESHOLD) {
        setIsIdle(true);
        setIdleMinutes(Math.floor(idleSince / 60000));
      } else {
        setIsIdle(false);
        setIdleMinutes(0);
      }
      setSessionMinutes(Math.floor((now - startRef.current) / 60000));
    }, 15000);

    return () => {
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('click', onActivity);
      clearInterval(interval);
    };
  }, []);

  return { sessionMinutes, isIdle, idleMinutes };
}
