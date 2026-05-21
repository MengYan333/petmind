import { useState, useEffect, useRef } from 'react';

const CAT_WIDTH = 70;
const WALK_SPEED = 80; // px/s

export function useCatWalk() {
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [catX, setCatX] = useState(200);
  const [walkMode, setWalkMode] = useState('sitting');
  const [facing, setFacing] = useState('right');
  const timerRef = useRef(null);
  const catXRef = useRef(200);

  useEffect(() => {
    async function init() {
      if (window.electronAPI?.getScreenSize) {
        const { width } = await window.electronAPI.getScreenSize();
        setScreenWidth(width);
      }
    }
    init();
  }, []);

  useEffect(() => {
    function scheduleNextWalk() {
      const delay = 4000 + Math.random() * 6000;
      timerRef.current = setTimeout(startWalk, delay);
    }

    function startWalk() {
      const isPeek = Math.random() < 0.15;
      let targetX;
      if (isPeek) {
        targetX = Math.random() < 0.5 ? -CAT_WIDTH + 20 : screenWidth - 20;
      } else {
        targetX = 80 + Math.random() * (screenWidth - 240);
      }

      const currentX = catXRef.current;
      setFacing(targetX > currentX ? 'right' : 'left');
      setWalkMode(targetX < 30 || targetX > screenWidth - 50 ? 'peeking' : 'walking');
      catXRef.current = targetX;
      setCatX(targetX);

      const distance = Math.abs(targetX - currentX);
      const duration = (distance / WALK_SPEED) * 1000 + 300;
      timerRef.current = setTimeout(() => {
        setWalkMode('sitting');
        scheduleNextWalk();
      }, duration);
    }

    scheduleNextWalk();
    return () => clearTimeout(timerRef.current);
  }, [screenWidth]);

  return { catX, walkMode, facing, screenWidth };
}
