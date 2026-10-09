import { useState } from 'react';

const ROWS = [
  ['Data sits in siloed systems', 'One fused picture, every field aged and sourced'],
  ['Planning takes hours by hand', 'An optimised plan in minutes'],
  ['A static plan, slow to retask', 'Dynamic re-plan on every event'],
  ['One course of action, argued in a room', 'Ranked COAs with what-if comparison'],
  ['Maintenance seen after the fault', 'Predictive readiness before the sortie'],
  ['Decisions that are hard to reconstruct', 'Explainable and audit-logged for post-mission review'],
];

export default function Compare() {
  const [mode, setMode] = useState('manual');
  return (
    <section className="paper" id="shift">
      <div className="wrap">
        <p className="eyebrow dk">Why change</p>
        <h2>Same mission, two ways of running it.</h2>
        <div className="switch" role="group" aria-label="Compare approaches">
          <button className={mode === 'manual' ? 'on' : ''} onClick={() => setMode('manual')}>Manual process</button>
          <button className={mode === 'vr' ? 'on' : ''} onClick={() => setMode('vr')}>VyomRakshak</button>
        </div>
        <ul className="compare" data-mode={mode}>
          {ROWS.map(([m, v]) => <li key={m}><span className="m">{m}</span><span className="v">{v}</span></li>)}
        </ul>
      </div>
    </section>
  );
}
