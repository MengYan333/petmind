import { useMemo } from 'react';
import { useScreenTime } from './useScreenTime';

export function useSensors() {
  const { sessionMinutes, isIdle, idleMinutes } = useScreenTime();

  return useMemo(() => {
    const now = new Date();
    return {
      time: {
        hour: now.getHours(),
        minute: now.getMinutes(),
        isLateNight: now.getHours() >= 23 || now.getHours() < 1,
      },
      screenMinutes: sessionMinutes,
      isIdle,
      idleMinutes,
    };
  }, [sessionMinutes, isIdle, idleMinutes]);
}
