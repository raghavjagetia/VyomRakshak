import { useEffect, useRef, useState } from 'react';
import { Theatre } from '../lib/theatre.js';
import { useDesk, useTheatre } from '../hooks.js';
import { BaseOpsPanel, CommanderPanel, PlannerPanel } from './Panels.jsx';
import Tabs from './Tabs.jsx';

const ROLES = [['planner', 'Air ops planner'], ['cdr', 'Mission commander'], ['base', 'Base ops']];

export default function Desk() {
  const roleRef = useRef('planner');
  const { D, conn, call, toast } = useDesk(roleRef);
  const [role, setRoleState] = useState('planner');
  const [ui, setUi] = useState({ selected: null, open: new Set() });
  const canvas = useRef();

  const setRole = r => { roleRef.current = r; setRoleState(r); };

  /* weather slider: local value while dragging, server value otherwise */
  const [wx, setWx] = useState(30);
  const dragging = useRef(false), wxTimer = useRef(), dragTimer = useRef();
  useEffect(() => { if (D && !dragging.current) setWx(D.weather); }, [D && D.weather]);
  const onWx = v => {
    setWx(v); dragging.current = true;
    clearTimeout(dragTimer.current); dragTimer.current = setTimeout(() => { dragging.current = false; }, 700);
    clearTimeout(wxTimer.current); wxTimer.current = setTimeout(() => call('POST', '/weather', { value: v }), 150);
  };

  useTheatre(canvas, () => D && ({ aircraft: D.aircraft, missions: D.missions, weather: D.weather, plan: D.plan, popupM: D.popup, bases: D.bases, selected: ui.selected }));

  const toggle = id => setUi(u => { const open = new Set(u.open); open.has(id) ? open.delete(id) : open.add(id); return { selected: id, open }; });
  const popup = async () => { await call('POST', '/popup'); setRole('cdr'); };

  const act = async (what, a, b) => {
    if (what === 'prio') call('POST', `/missions/${a}/priority`, { delta: b });
    else if (what === 'publish') call('POST', '/publish');
    else if (what === 'popup') popup();
    else if (what === 'ground') call('POST', `/aircraft/${a}/ground`);
    else if (what === 'coa') { if (await call('POST', `/coas/${a}/approve`)) setRole('planner'); }
  };

  const reset = async () => { setUi({ selected: null, open: new Set() }); await call('POST', '/reset'); setRole('planner'); };

  const pick = e => {
    if (!D) return;
    const id = Theatre.pick(canvas.current, { missions: D.missions, popupM: D.popup }, e);
    setUi(u => ({ selected: id, open: id && role === 'planner' ? new Set(u.open).add(id) : u.open }));
  };

  const delta = D ? D.plan.pct - D.publishedPct : 0;
  const eligible = D ? D.aircraft.filter(a => !a.grounded && a.serv >= 70).length : 0;

  return (
    <section className="dark desk-sec" id="desk">
      <div className="wrap">
        <p className="eyebrow">Working prototype</p>
        <h2>The tasking desk.</h2>
        <p className="sub light">This is the live prototype: a planning server solving 24 aircraft against 12 missions on synthetic data. Change a priority, tighten the weather, ground an aircraft, cut a data feed, or inject a pop-up threat and watch the plan respond. Switch role to see each user's view of the same shared picture.</p>

        <div className={`conn ${conn.ok ? 'ok' : 'wait'}`} role="status">{conn.msg}</div>

        <div className="desk">
          <div className="desk-left">
            <div className="toolbar">
              <label className="wx"><span>Weather severity</span>
                <input type="range" min="0" max="100" value={wx} onChange={e => onWx(+e.target.value)} disabled={!D} />
                <output>{wx}</output>
              </label>
              <label className="chk"><input type="checkbox" checked={!!(D && D.sim)} disabled={!D} onChange={e => call('POST', '/sim', { on: e.target.checked })} /> Simulate feed events</label>
              <button className="btn btn-danger" onClick={popup} disabled={!D}>Inject pop-up threat</button>
              <button className="btn btn-ghost sm" onClick={reset} disabled={!D}>Reset</button>
            </div>

            <div className="feeds" aria-label="Data feeds">
              {D && D.feeds.map(f => (
                <button key={f.name} className={`feed ${f.status}`} title={`Click to simulate a ${f.name} feed outage`} onClick={() => call('POST', `/feeds/${f.name}/toggle`)}>
                  <i />{f.name}<small>{f.down ? 'LOST' : f.age.toFixed(0) + 's'}</small>
                </button>
              ))}
              {D && D.degraded.length > 0 && <span className="degraded">Confidence reduced: {D.degraded.join(', ')} on last good values</span>}
            </div>

            <div className="map-box">
              <canvas ref={canvas} onClick={pick} role="img" aria-label="Operating picture map. Click a mission marker to select it." />
            </div>

            {D && (
              <div className="stats">
                <div><small>Priority coverage</small><b>{D.plan.pct}%</b>
                  <i className={delta < 0 ? 'neg' : delta > 0 ? 'pos' : ''}>{delta === 0 ? 'same as published' : `${delta > 0 ? '+' : ''}${delta} vs published`}</i></div>
                <div><small>Aircraft committed</small><b>{D.plan.used}<em>/{eligible}</em></b><i>flyable aircraft</i></div>
                <div><small>Solve time</small><b>{D.plan.ms}<em> ms</em></b><i>CP-SAT · {D.plan.status.toLowerCase()}</i></div>
                <div><small>Constraint violations</small><b>0</b><i>enforced, not scored</i></div>
              </div>
            )}
          </div>

          <div className="desk-right">
            <Tabs className="roles" label="Role" items={ROLES} value={ROLES.findIndex(r => r[0] === role)}
              onChange={i => setRole(ROLES[i][0])} render={r => <><small>Role</small>{r[1]}</>} />
            <div className="role-panel">
              {!D ? <p className="role-note">Waiting for the planning server…</p>
                : role === 'planner' ? <PlannerPanel D={D} ui={ui} toggle={toggle} act={act} />
                : role === 'cdr' ? <CommanderPanel D={D} act={act} />
                : <BaseOpsPanel D={D} act={act} />}
            </div>
          </div>
        </div>

        <details className="audit" open>
          <summary>Audit trail <span>{D ? `${D.log.length} entries · stored server-side` : ''}</span></summary>
          <ol>
            {D && D.log.length === 0 && <li className="empty">Nothing recorded yet.</li>}
            {D && D.log.slice(0, 14).map((l, i) => <li key={i}><time>{l.t}</time><b>{l.who}</b><span>{l.text}</span></li>)}
          </ol>
        </details>
        <p className="fine">All aircraft, bases and missions are synthetic. Plans come from an OR-Tools CP-SAT model on the server, fault risk from a scikit-learn gradient-boosted model, and roles are enforced by the API, not just hidden in the UI. Try approving a course of action as the planner: the server refuses.</p>
        <div id="toast" className={toast ? 'show' : ''} role="alert">{toast}</div>
      </div>
    </section>
  );
}
