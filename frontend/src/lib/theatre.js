/* Canvas renderer for the operating picture. Used by the hero and the tasking desk. */
export const Theatre = (() => {
  const C = { line: '#243249', dim: '#5d6f88', text: '#cfd8e6', amber: '#f2a33a', green: '#5bb48a', red: '#e8664a', cloud: '143,163,189' };

  // fixed pseudo-random cloud field so it doesn't jump between frames
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const clouds = Array.from({ length: 18 }, () => ({ x: rnd(), y: rnd(), r: .06 + rnd() * .09, thr: rnd() * 85 + 5, ph: rnd() * 6.28 }));
  const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) / 997;

  function fit(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) {
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }

  function draw(canvas, s, t, o = {}) {
    const { ctx, w, h } = fit(canvas);
    const BASES = s.bases;
    const pad = o.pad ?? 30;
    const X = x => pad + x * (w - 2 * pad), Y = y => pad + y * (h - 2 * pad);
    const font = (px, wt = 400) => `${wt} ${px}px "IBM Plex Mono", monospace`;
    ctx.clearRect(0, 0, w, h);

    // grid + sector ticks
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(36,50,73,.65)';
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(X(i / 10), Y(0)); ctx.lineTo(X(i / 10), Y(1)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(0), Y(i / 10)); ctx.lineTo(X(1), Y(i / 10)); ctx.stroke();
    }
    ctx.fillStyle = C.dim; ctx.font = font(9);
    'ABCDEFGHIJ'.split('').forEach((c, i) => { if (i < 10) ctx.fillText(c, X(i / 10 + .045) - 3, Y(0) - 10); });
    for (let i = 0; i < 10; i++) ctx.fillText(String(i + 1), X(0) - 18, Y(i / 10 + .055) + 3);

    // range rings
    for (const k in BASES) {
      const b = BASES[k];
      ctx.strokeStyle = 'rgba(93,111,136,.25)'; ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.ellipse(X(b.x), Y(b.y), .4 * (w - 2 * pad), .4 * (h - 2 * pad), 0, 0, 6.283); ctx.stroke();
    }
    ctx.setLineDash([]);

    // weather field
    const wx = s.weather / 100;
    for (const c of clouds) {
      const a = Math.max(0, (s.weather - c.thr) / 40) * .42;
      if (a <= 0) continue;
      const cx = X(c.x + Math.sin(t / 9000 + c.ph) * .02), cy = Y(c.y), r = c.r * w;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(${C.cloud},${Math.min(a, .45)})`); g.addColorStop(1, `rgba(${C.cloud},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill();
    }

    const missions = s.missions.concat(s.popupM ? [s.popupM] : []);
    const plan = s.plan;
    const mById = Object.fromEntries(missions.map(m => [m.id, m]));

    // routes + aircraft
    for (const mid in plan.assign) {
      const m = mById[mid]; if (!m) continue;
      for (const id of plan.assign[mid]) {
        const ac = s.aircraft.find(a => a.id === id); if (!ac) continue;
        const b = BASES[ac.base];
        const x1 = X(b.x), y1 = Y(b.y), x2 = X(m.x), y2 = Y(m.y);
        ctx.strokeStyle = m.prio >= 5 ? 'rgba(232,102,74,.7)' : 'rgba(242,163,58,.5)';
        ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -t / 80;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
        const ph = ((t / (o.speed || 14000)) + hash(id)) % 1, p = ph < .5 ? ph * 2 : (1 - ph) * 2;
        const px = x1 + (x2 - x1) * p, py = y1 + (y2 - y1) * p;
        const ang = Math.atan2(y2 - y1, x2 - x1) + (ph < .5 ? 0 : Math.PI);
        ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
        ctx.fillStyle = C.text; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, 3.6); ctx.lineTo(-2, 0); ctx.lineTo(-4, -3.6); ctx.closePath(); ctx.fill();
        ctx.restore();
        if (!o.compact) { ctx.fillStyle = C.dim; ctx.font = font(9); ctx.fillText(id, px + 7, py - 6); }
      }
    }

    // bases
    for (const k in BASES) {
      const b = BASES[k], x = X(b.x), y = Y(b.y);
      ctx.strokeStyle = C.green; ctx.fillStyle = 'rgba(91,180,138,.16)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.rect(x - 6, y - 6, 12, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.green; ctx.font = font(10, 600); ctx.fillText(b.name, x + 11, y + 4);
    }

    // missions
    for (const m of missions) {
      const x = X(m.x), y = Y(m.y);
      const funded = !!plan.assign[m.id], held = plan.held.includes(m.id), sel = s.selected === m.id;
      const isPop = m.popup;
      const col = held ? C.dim : funded ? C.amber : C.red;
      if (isPop) {
        const k = (t % 1600) / 1600;
        ctx.strokeStyle = `rgba(232,102,74,${1 - k})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 10 + k * 26, 0, 6.283); ctx.stroke();
      }
      const r = 7 + m.prio * .8;
      ctx.lineWidth = sel ? 2.4 : 1.5; ctx.strokeStyle = col;
      ctx.fillStyle = funded ? 'rgba(242,163,58,.2)' : 'rgba(10,17,30,.9)';
      if (!funded && !held) ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = col; ctx.font = font(10, 600); ctx.textAlign = 'center'; ctx.fillText(m.prio, x, y + 3.5); ctx.textAlign = 'left';
      if (!o.compact || funded || isPop) {
        ctx.font = font(9); ctx.fillStyle = held ? C.dim : C.text;
        ctx.fillText(m.id + (held ? ' · WX HOLD' : !funded ? ' · UNMET' : ''), x + r + 5, y + 3);
      }
    }
  }

  /* nearest mission to a click, for selection */
  function pick(canvas, s, ev, pad = 30) {
    const r = canvas.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top;
    let best = null, bd = 26;
    for (const m of s.missions.concat(s.popupM ? [s.popupM] : [])) {
      const d = Math.hypot(pad + m.x * (r.width - 2 * pad) - mx, pad + m.y * (r.height - 2 * pad) - my);
      if (d < bd) { bd = d; best = m.id; }
    }
    return best;
  }

  return { draw, pick };
})();
