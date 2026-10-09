import { useState } from 'react';
import { reducedMotion } from '../hooks.js';

const LAYERS = [
  { n: 'Users', t: 'Planner · Commander · Base ops · Intel', d: 'Four roles see the same operating picture through different lenses. The server decides which actions each role may take, not just which buttons are greyed out.', tech: 'React role views' },
  { n: 'Security', t: 'Role-based access · Encryption · Audit trail', d: 'Every approval, override and grounding is written to an append-only log, so a post-mission review can replay who decided what, on which data.', tech: 'RBAC · TLS · audit log' },
  { n: 'Frontend and gateway', t: 'React map picture · FastAPI gateway', d: 'A map-based common operating picture in the browser, talking to a FastAPI gateway that handles role checks, REST calls and the live event stream.', tech: 'React · Vite · FastAPI · Server-Sent Events' },
  { n: 'Analytics, optimiser, decision support', t: 'Readiness · CP-SAT · COAs and what-if', d: 'A gradient-boosted model forecasts fault risk. The solver turns that into a plan. The decision layer builds ranked courses of action and writes the explanation for each assignment.', tech: 'scikit-learn · OR-Tools CP-SAT' },
  { n: 'Data fusion and store', t: 'Normalise · Validate · Time-sync · PostGIS', d: 'Feeds are normalised to one schema, validated, and time-aligned, each tagged with its age. The prototype keeps live state in memory and the audit trail in SQLite; the production design uses PostGIS, TimescaleDB and Redis.', tech: 'SQLite (prototype) → PostgreSQL + PostGIS · TimescaleDB · Redis' },
  { n: 'Source systems', t: 'Maintenance · Crew · Weapons · Airspace · Met · Intel', d: 'Simulated feeds first, adapter APIs to real C2, maintenance and met systems later. This is the riskiest layer, so it is isolated behind adapters.', tech: 'Adapter APIs · simulated feeds' },
];

const STEPS = [
  [5, 'A new radar track arrives from the intel feed.'],
  [4, 'Fusion normalises it, checks the schema, tags it 3 s old.'],
  [3, 'Threat model scores it. The solver re-plans around it and builds ranked COAs.'],
  [2, 'The gateway streams the ranked options to the commander.'],
  [1, 'The commander approves; the decision is signed and logged.'],
  [0, 'Orders reach the planner, base ops and crews. The picture updates for everyone.'],
];

export default function Architecture() {
  const [sel, setSel] = useState(0);
  const [pulse, setPulse] = useState(-1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const l = LAYERS[sel];

  async function trace() {
    if (busy) return;
    setBusy(true);
    for (const [i, text] of STEPS) {
      setPulse(i); setSel(i); setNote(text);
      await new Promise(r => setTimeout(r, reducedMotion() ? 500 : 1300));
    }
    setPulse(-1); setNote('Trace complete.'); setBusy(false);
  }

  return (
    <section className="dark" id="stack">
      <div className="wrap">
        <p className="eyebrow">Architecture</p>
        <h2>Six layers, built to run air-gapped.</h2>
        <p className="sub light">Select a layer, or trace one pop-up event from raw feed to issued order.</p>
        <div className="arch">
          <div className="layers" role="list">
            {LAYERS.map((x, i) => (
              <button key={x.n} role="listitem" className={`layer${sel === i ? ' sel' : ''}${pulse === i ? ' pulse' : ''}`} onClick={() => setSel(i)}>
                <b>{x.n}</b><span>{x.t}</span>
              </button>
            ))}
          </div>
          <aside className="layer-info" aria-live="polite">
            <small>Layer {sel + 1} of 6</small>
            <h3>{l.n}</h3>
            <p>{l.d}</p>
            <code>{l.tech}</code>
          </aside>
        </div>
        <div className="arch-actions">
          <button className="btn btn-amber" onClick={trace} disabled={busy}>Trace a pop-up event</button>
          <span className="fine">{note}</span>
        </div>
      </div>
    </section>
  );
}
