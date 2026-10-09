import { useEffect, useRef, useState } from 'react';
import { reducedMotion, useTheatre } from '../hooks.js';

/* Self-running replay: plan, pop-up, re-plan, approval. Uses the server's own solver output (/api/demo). */
export default function Hero() {
  const canvas = useRef();
  const scene = useRef(null);
  const [ticker, setTicker] = useState('Building plan…');

  useTheatre(canvas, () => scene.current, { compact: true, pad: 26 });

  useEffect(() => {
    let dead = false, timer;
    (async () => {
      let d;
      for (let i = 0; i < 30 && !d && !dead; i++) {
        try { const r = await fetch('/api/demo'); if (r.ok) d = await r.json(); } catch {}
        if (!d) { setTicker('Waking the planning server…'); await new Promise(r => setTimeout(r, 2500)); }
      }
      if (dead) return;
      if (!d) { setTicker('Planning server unreachable'); return; }
      const { base, replan, aircraft, missions, bases } = d;
      const withX = missions.concat([d.popup]);
      const s = { aircraft, missions, bases, weather: 30, plan: base, popupM: null, selected: null };
      scene.current = s;
      const steps = [
        () => { s.popupM = null; s.missions = missions; s.plan = base; setTicker(`Plan in force · ${base.funded.length} tasks funded · ${base.pct}% priority coverage · ${base.ms} ms`); },
        () => { s.popupM = d.popup; setTicker('Priority-5 track detected. Re-planning…'); },
        () => { s.popupM = null; s.missions = withX; s.plan = replan.plan; setTicker(`${replan.title} · ${replan.plan.ms} ms · ${replan.lines[0]}`); },
        () => setTicker('Awaiting commander approval before orders are issued'),
      ];
      steps[0]();
      if (reducedMotion()) { s.missions = withX; s.plan = replan.plan; setTicker(`Re-plan ready · ${replan.lines[0]}`); return; }
      let i = 0;
      timer = setInterval(() => { i = (i + 1) % steps.length; steps[i](); }, 3600);
    })();
    return () => { dead = true; clearInterval(timer); };
  }, []);

  return (
    <section className="hero dark">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Air operations planning</p>
          <h1>When the picture changes, <em>the plan should too.</em></h1>
          <p className="lede">Today a tasking order is built from spreadsheets, whiteboards and phone calls, then goes stale the moment a threat appears. VyomRakshak keeps one live picture of aircraft, crews, weapons, airspace and weather, and re-plans against it. The commander still makes the call.</p>
          <div className="cta">
            <a className="btn btn-amber" href="#desk">Try a pop-up threat</a>
            <a className="btn btn-ghost" href="#how">See how it works</a>
          </div>
          <dl className="meta">
            <div><dt>Domain</dt><dd>MoD / DSSC air ops</dd></div>
          </dl>
        </div>
        <figure className="hero-map">
          <canvas ref={canvas} role="img" aria-label="Animated operating picture showing aircraft tasked to missions and re-planned when a threat appears" />
          <figcaption>
            <span className="live"><i />Live replay · synthetic theatre</span>
            <output aria-live="polite">{ticker}</output>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
