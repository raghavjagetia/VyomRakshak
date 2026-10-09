import { useEffect, useState } from 'react';
import Tabs from './Tabs.jsx';
import { reducedMotion } from '../hooks.js';

const VERBS = [
  { n: 'Fuse', h: 'One live picture instead of six systems.',
    p: 'Aircraft serviceability, crew duty hours, weapon and fuel stock, airspace, weather and threat data arrive in different formats, on different clocks. Adapters normalise them, validate the schema, and time-sync everything into a single store.',
    t: [['in ', 'maintenance · crew roster · weapon load · airspace · met · intel'], ['do ', 'normalise → validate → time-sync → confidence-flag'], ['out', 'one fused state, each field tagged with its age and source']] },
  { n: 'Predict', h: 'Know what will be flyable, not only what is.',
    p: 'Models trained on serviceability and fault history forecast readiness and sortie rates, and score weather and threat impact on each route. A stale or missing feed lowers confidence rather than silently feeding a bad number to the solver.',
    t: [['in ', 'fault history · flying hours · forecast · threat tracks'], ['do ', 'gradient-boosted readiness, weather and threat risk'], ['out', 'per-aircraft fault risk, per-route exposure, confidence']] },
  { n: 'Optimise', h: 'Scarce aircraft, crews and munitions to the tasks that matter.',
    p: 'A constraint solver treats crew duty, weapon load, range, airspace and serviceability as hard limits, then maximises priority-weighted coverage. Every assignment carries the constraints it satisfied, so a planner can read why, not just what.',
    t: [['in ', 'fused state · predictions · mission priorities'], ['do ', 'CP-SAT / MILP, rolling horizon'], ['out', 'tasking plan + the constraints behind each assignment']] },
  { n: 'Retask', h: 'A pop-up threat gets options in minutes, not hours.',
    p: 'When priorities shift or a new track appears, the solver re-plans from the current state and offers ranked courses of action: how much each covers, how many crews it disturbs, what it drops. Nothing is pushed until the commander approves.',
    t: [['in ', 'new event + the plan currently in force'], ['do ', 're-solve under four different policies, rank by cost of change'], ['out', 'ranked COAs with rationale → human decision → orders issued']] },
];

export default function Method() {
  const [i, setI] = useState(0);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (touched || reducedMotion()) return;
    const id = setInterval(() => setI(v => (v + 1) % VERBS.length), 7000);
    return () => clearInterval(id);
  }, [touched]);

  const v = VERBS[i];
  return (
    <section className="paper" id="how">
      <div className="wrap">
        <p className="eyebrow dk">Method</p>
        <h2>Four verbs, one loop.</h2>
        <p className="sub">The solution is a cycle, not a pipeline. Each pass feeds the next, and a pop-up event drops the commander straight into the last step.</p>
        <div className="verbs">
          <Tabs className="verb-tabs" label="Method steps" items={VERBS} value={i}
            onChange={n => { setTouched(true); setI(n); }}
            render={(x, k) => <><b>{String(k + 1).padStart(2, '0')}</b>{x.n}</>} />
          <div className="verb-panels">
            <article className="verb-panel on" key={i}>
              <h3>{v.h}</h3>
              <p>{v.p}</p>
              <pre className="trace">{v.t.map(([k, text], j) => <span key={j}><span className="k">{k}</span> {text}{j < 2 ? '\n' : ''}</span>)}</pre>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
