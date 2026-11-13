'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface ConfettiHandle {
  burst: (x: number, y: number) => void;
}

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  w: number;
  h: number;
  color: string;
  life: number;
}

const COLORS = ['#FF8F9C', '#FFC857', '#7ED9B0', '#86B8F5', '#B79CF0', '#FF9F68', '#FFFFFF'];

// 화면 전체를 덮는 폭죽 캔버스. burst(x, y)로 그 지점에서 터뜨린다
export const Confetti = forwardRef<ConfettiHandle>(function Confetti(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parts = useRef<P[]>([]);
  const raf = useRef(0);
  const last = useRef(0);

  function loop(now: number) {
    const cv = canvasRef.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    const dt = Math.min(0.05, (now - last.current) / 1000 || 0.016);
    last.current = now;
    c.clearRect(0, 0, cv.width, cv.height);
    const dpr = cv.width / cv.clientWidth;
    parts.current = parts.current.filter((p) => p.life > 0 && p.y < cv.clientHeight + 40);
    for (const p of parts.current) {
      p.vy += 900 * dt;
      p.vx *= 0.992;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      p.life -= dt;
      c.save();
      c.translate(p.x * dpr, p.y * dpr);
      c.rotate(p.r);
      c.globalAlpha = Math.min(1, p.life * 2);
      c.fillStyle = p.color;
      c.fillRect((-p.w / 2) * dpr, (-p.h / 2) * dpr, p.w * dpr, p.h * dpr);
      c.restore();
    }
    raf.current = parts.current.length ? requestAnimationFrame(loop) : 0;
  }

  useImperativeHandle(ref, () => ({
    burst(x, y) {
      for (let i = 0; i < 110; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
        const sp = 280 + Math.random() * 520;
        parts.current.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          r: Math.random() * 6,
          vr: (Math.random() - 0.5) * 18,
          w: 6 + Math.random() * 8,
          h: 4 + Math.random() * 6,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          life: 1.6 + Math.random() * 1.2,
        });
      }
      if (!raf.current) {
        last.current = performance.now();
        raf.current = requestAnimationFrame(loop);
      }
    },
  }));

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(window.innerWidth * dpr);
      cv.height = Math.round(window.innerHeight * dpr);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-50 h-screen w-screen" />;
});
