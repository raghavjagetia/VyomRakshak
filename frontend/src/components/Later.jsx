import { useState } from 'react';
import Tabs from './Tabs.jsx';

const RISKS = [
  ['Siloed data feeds', 'Adapters and schema checks', 'Legacy systems get a thin adapter each. Every record is validated on entry, and simulated feeds are built first so the core never waits on integration.'],
  ['Stale or missing data', 'Confidence flags and fallback', 'Every field carries its age. Stale values are flagged on screen and the solver falls back to the last good value with reduced confidence, never a silent guess. Try cutting a feed on the tasking desk.'],
  ['Solver latency', 'Rolling-horizon re-planning', 'Plan the near window in detail and the far window coarsely. A pop-up only re-solves what it touches, so the answer arrives while it still matters.'],
  ['Low operator trust', 'Explainable and human-approved', 'Each assignment lists the constraints it met and the priority it served. The system recommends; a named commander approves; the audit log keeps both.'],
];

export function Risks() {
  const [flipped, setFlipped] = useState({});
  return (
    <section className="paper" id="risks">
      <div className="wrap">
        <p className="eyebrow dk">Risks we planned for</p>
        <h2>Four things that would sink it, and what we do about each.</h2>
        <p className="sub">Tap a card to flip it.</p>
        <div className="cards">
          {RISKS.map(([risk, fix, text], i) => (
            <button key={risk} className={`flip${flipped[i] ? ' flipped' : ''}`} onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))} aria-pressed={!!flipped[i]}>
              <span className="face front"><small>Risk</small><b>{risk}</b><i>Tap for mitigation</i></span>
              <span className="face back"><small>Mitigation</small><b>{fix}</b><i>{text}</i></span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

const PHASES = [
  ['Simulation', 'Sandbox with synthetic air-ops data, for wargaming at DSSC.', 'You are looking at this stage: the solver, the fused picture and the commander workflow running on simulated feeds.'],
  ['Pilot', 'Trial with one air base or squadron on replayed scenarios.', 'Real planning problems, replayed after the fact, so the plans can be compared with what planners actually did without touching live operations.'],
  ['Integration', 'Adapters to existing C2, maintenance and met systems.', 'This is where the riskiest piece, legacy data feeds, is handled. Each system gets a thin adapter with schema checks and confidence flags.'],
  ['Scale', 'Command-level rollout, then joint-service logistics.', 'From one squadron up to a command, and sideways to naval and army logistics where the same allocation problem appears.'],
];

export function Roadmap() {
  const [i, setI] = useState(0);
  return (
    <section className="dark" id="roadmap">
      <div className="wrap">
        <p className="eyebrow">Adoption roadmap</p>
        <h2>From sandbox to command level, one step at a time.</h2>
        <div className="road">
          <div className="track"><i style={{ width: (i + 1) * 25 + '%' }} /></div>
          <Tabs className="phases" label="Roadmap phases" items={PHASES} value={i} onChange={setI}
            render={(p, k) => <><b>Phase {k + 1}</b><span>{p[0]}</span></>} />
          <div className="phase-detail" aria-live="polite" key={i}>
            <h3>{PHASES[i][1]}</h3>
            <p>{PHASES[i][2]}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const WHO = [
  ['Air ops planner', 'Faster, de-conflicted tasking plans. The planner stops reconciling six sources by hand and starts reviewing a plan the solver has already checked against crew, weapon and airspace limits.'],
  ['Mission commander', 'Ranked retasking options under pressure. Several courses of action, each with what it covers, what it drops and how many crews it disturbs, instead of one plan argued from memory.'],
  ['Base ops & maintenance', 'A predictive readiness and turnaround view. Fault risk, duty hours and stock levels in one place, with alerts before an aircraft becomes the reason a sortie fails.'],
  ['Training, DSSC', 'Wargaming and COA analysis for staff officers. The same engine becomes a trainer: change a variable, see the plan move, and read why.'],
];

export function Impact() {
  const [i, setI] = useState(0);
  return (
    <section className="paper" id="impact">
      <div className="wrap">
        <p className="eyebrow dk">Impact</p>
        <h2>Who it helps, and what we expect.</h2>
        <div className="impact-grid">
          <div>
            <Tabs className="who" label="Beneficiaries" items={WHO} value={i} onChange={setI} render={w => w[0]} />
            <p className="who-text" aria-live="polite">{WHO[i][1]}</p>
          </div>
          <div className="targets">
            <h3>MVP targets</h3>
            <ul>
              <li>Shorter planning cycle through automated allocation and de-confliction</li>
              <li>Better use of scarce aircraft, crews and munitions</li>
              <li>Retasking options in minutes on a pop-up threat</li>
              <li>Fewer constraint violations: crew duty, weapon load, airspace</li>
              <li>Auditable, explainable decisions for post-mission review</li>
            </ul>
            <p className="fine dk">These are directional targets for the MVP, to be validated in pilot testing. They are not measured production results.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Refs() {
  return (
    <>
      <section className="dark" id="refs">
        <div className="wrap refs">
          <div>
            <p className="eyebrow">Research basis</p>
            <ul className="plain">
              <li><b>Air Tasking Order cycle</b> — the process VyomRakshak speeds up and keeps current.</li>
              <li><b>Sortie and weapon-target assignment</b> — classical OR formulations solved with MILP and CP-SAT.</li>
              <li><b>Predictive maintenance</b> — ML on serviceability and fault history to forecast readiness.</li>
              <li><b>JDL data-fusion model</b> — the structure behind the single operating picture.</li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">Government alignment</p>
            <ul className="plain">
              <li><b>Atmanirbhar Bharat</b> — indigenous defence technology, open-source stack, no licence lock-in.</li>
              <li><b>MoD AI adoption roadmap</b> for the armed forces.</li>
              <li><b>IAF integrated air command and control</b> ecosystem.</li>
              <li><b>Joint-operations training</b> and wargaming at DSSC.</li>
            </ul>
          </div>
        </div>
        <div className="wrap stackline">React · Vite · FastAPI · OR-Tools CP-SAT · scikit-learn · SQLite · Server-Sent Events · Docker-ready</div>
      </section>
      <footer className="foot">
        <div className="wrap">
          <span>VyomRakshak · Smart India Hackathon 2026 · Problem Statement 26250 · Team KO_KRAKENS (185374)</span>
          <a href="#top">Back to top</a>
        </div>
      </footer>
    </>
  );
}
