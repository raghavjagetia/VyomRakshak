import { useCallback, useEffect, useRef, useState } from 'react';
import { Theatre } from './lib/theatre.js';

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* fade sections in as they scroll into view */
export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: .12 });
    document.querySelectorAll('.wrap > h2, .wrap > .sub, .verbs, .compare, .cards, .arch, .road, .impact-grid, .refs > div')
      .forEach(el => { el.classList.add('rv'); io.observe(el); });
    return () => io.disconnect();
  }, []);
}

/* draws the operating picture while the canvas is on screen; `getState` is read every frame */
export function useTheatre(canvasRef, getState, opts) {
  const stateRef = useRef(getState);
  stateRef.current = getState;
  useEffect(() => {
    const canvas = canvasRef.current, reduce = reducedMotion();
    let visible = false, raf;
    const io = new IntersectionObserver(e => { visible = e[0].isIntersecting; });
    io.observe(canvas);
    const frame = t => {
      const s = stateRef.current();
      if (visible && s) Theatre.draw(canvas, s, reduce ? 0 : t, opts);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [canvasRef]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* shared server state: initial load (waits for a sleeping server), then a live SSE stream */
export function useDesk(roleRef) {
  const [D, setD] = useState(null);
  const [conn, setConn] = useState({ ok: false, msg: 'Connecting to the planning server. If it was asleep this can take up to a minute.' });
  const [toast, setToast] = useState('');
  const toastTimer = useRef();

  const say = useCallback(msg => {
    setToast(msg); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3600);
  }, []);

  const call = useCallback(async (method, path, body) => {
    try {
      const r = await fetch('/api' + path, {
        method, headers: { 'Content-Type': 'application/json', 'X-Role': roleRef.current },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); say(e.detail || 'Request failed'); return false; }
      setD(await r.json());
      return true;
    } catch { say('Cannot reach the planning server.'); return false; }
  }, [roleRef, say]);

  useEffect(() => {
    let dead = false, es;
    const OK = 'Connected to the planning server. Open this page in a second tab with another role and watch the two stay in sync.';
    (async () => {
      let first;
      for (let i = 0; i < 40 && !first && !dead; i++) {
        try { const r = await fetch('/api/state'); if (r.ok) first = await r.json(); } catch {}
        if (!first) await new Promise(r => setTimeout(r, 2500));
      }
      if (dead) return;
      if (!first) { setConn({ ok: false, msg: 'Planning server unreachable. Check that the backend is running.' }); return; }
      setD(first); setConn({ ok: true, msg: OK });
      es = new EventSource('/api/stream');
      es.onmessage = ev => { setD(JSON.parse(ev.data)); setConn({ ok: true, msg: OK }); };
      es.onerror = () => setConn({ ok: false, msg: 'Connection lost. Reconnecting…' });
    })();
    return () => { dead = true; es && es.close(); };
  }, []);

  return { D, conn, call, toast };
}
