"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

export interface GestureHandlers {
  /** incremental move in px (single pointer) */
  onDrag?: (dx: number, dy: number) => void;
  /** incremental pinch: scale ratio, rotation delta in degrees, midpoint move in px */
  onPinch?: (ratio: number, angleDelta: number, dx: number, dy: number) => void;
  onTap?: () => void;
  /** horizontal swipe with a single pointer: -1 left, +1 right */
  onSwipe?: (dir: -1 | 1) => void;
  onStart?: () => void;
  onEnd?: () => void;
  enabled?: boolean;
}

interface P {
  x: number;
  y: number;
}

/**
 * Pointer-event gestures for one element: drag, two-finger pinch/rotate, tap, swipe.
 * Spread the returned props onto the element and give it `touch-action: none`.
 */
export function useGestures(h: GestureHandlers) {
  const pointers = useRef(new Map<number, P>());
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const moved = useRef(0);
  const handlers = useRef(h);
  useEffect(() => {
    handlers.current = h;
  });

  function dist(a: P, b: P) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function angle(a: P, b: P) {
    return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  }
  function mid(a: P, b: P): P {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    if (handlers.current.enabled === false) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      moved.current = 0;
      handlers.current.onStart?.();
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    const all = Array.from(pointers.current.entries());
    if (all.length === 1) {
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      moved.current += Math.abs(dx) + Math.abs(dy);
      handlers.current.onDrag?.(dx, dy);
    } else if (all.length >= 2) {
      const [idA, a] = all[0];
      const [idB, b] = all[1];
      const na = idA === e.pointerId ? cur : a;
      const nb = idB === e.pointerId ? cur : b;
      const ratio = dist(a, b) > 0 ? dist(na, nb) / dist(a, b) : 1;
      const angleDelta = angle(na, nb) - angle(a, b);
      const m0 = mid(a, b);
      const m1 = mid(na, nb);
      moved.current += 100;
      handlers.current.onPinch?.(ratio, angleDelta, m1.x - m0.x, m1.y - m0.y);
    }
    pointers.current.set(e.pointerId, cur);
  };

  const finish = (e: ReactPointerEvent) => {
    const had = pointers.current.has(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (!had) return;
    if (pointers.current.size === 0 && start.current) {
      const dt = Date.now() - start.current.t;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      if (moved.current < 8 && dt < 350) handlers.current.onTap?.();
      else if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && dt < 600 && moved.current < 400) {
        handlers.current.onSwipe?.(dx < 0 ? -1 : 1);
      }
      start.current = null;
      handlers.current.onEnd?.();
    }
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    onLostPointerCapture: finish,
  };
}
