/* The three role views. They only render server state and call back with actions;
   the server decides whether the current role is allowed to do them. */

const Chip = ({ kind, children }) => <span className={`chip ${kind}`}>{children}</span>;

export function PlannerPanel({ D, ui, toggle, act }) {
  const status = m => D.plan.held.includes(m.id) ? ['held', 'Weather hold'] : D.plan.assign[m.id] ? ['ok', 'Funded'] : ['no', 'Unmet'];
  return (
    <>
      <p className="role-note">Set priorities, read the reasoning, then publish. Tap a task to see why each aircraft was chosen.</p>
      <ul className="mlist">
        {D.missions.map(m => {
          const [cls, label] = status(m);
          const ids = D.plan.assign[m.id] || [], open = ui.open.has(m.id);
          return (
            <li key={m.id} className={`mrow${ui.selected === m.id ? ' sel' : ''}`}>
              <div className="mtop">
                <button className="mname" aria-expanded={open} onClick={() => toggle(m.id)}>
                  <code>{m.id}</code><span>{m.name}</span><small>{m.type} · needs {m.need}</small>
                </button>
                <div className="prio" aria-label={`Priority ${m.prio}`}>
                  <button aria-label="Lower priority" onClick={() => act('prio', m.id, -1)}>−</button>
                  <b>P{m.prio}</b>
                  <button aria-label="Raise priority" onClick={() => act('prio', m.id, 1)}>+</button>
                </div>
                <Chip kind={cls}>{label}</Chip>
              </div>
              {ids.length > 0 && <div className="assigned">{ids.map(i => <span key={i}>{i}</span>)}</div>}
              {open && (ids.length
                ? ids.map(id => <div className="why" key={id}><b>{id}</b><ul>{D.plan.explain[m.id][id].map((x, k) => <li key={k}>{x}</li>)}</ul></div>)
                : <div className="why"><p>{D.plan.reasons[m.id]}</p></div>)}
            </li>
          );
        })}
      </ul>
      <div className="actions">
        <button className="btn btn-amber" disabled={!D.dirty} onClick={() => act('publish')}>
          {D.dirty ? 'Approve and publish tasking order' : 'Tasking order is current'}
        </button>
      </div>
    </>
  );
}

export function CommanderPanel({ D, act }) {
  if (!D.popup) {
    const x = D.missions.find(m => m.popup);
    return (
      <>
        <p className="role-note">The commander watches for pop-up events and chooses between ranked options. Nothing is pushed to crews without approval.</p>
        <div className="empty-state">
          <b>{x ? 'Threat engaged' : 'No active pop-up events'}</b>
          <p>{x ? `${x.id} was folded into the plan. Reset the desk to run the scenario again.` : 'Inject a priority-5 unidentified track to see re-tasking options.'}</p>
          {!x && <button className="btn btn-danger" onClick={() => act('popup')}>Inject pop-up threat</button>}
        </div>
      </>
    );
  }
  return (
    <>
      <p className="role-note alert"><b>Pop-up:</b> {D.popup.name}. Priority 5, needs 2 CAP aircraft. Options ranked by coverage minus the cost of disturbing crews already tasked.</p>
      <ol className="coas">
        {D.coas.map((c, i) => (
          <li key={c.key} className={`coa${i === 0 ? ' rec' : ''}`}>
            <header>
              <span className="rank">{i + 1}</span>
              <div><h4>{c.title}</h4><p>{c.blurb}</p></div>
              {i === 0 && <em>Recommended</em>}
            </header>
            <div className="coa-m">
              <div><small>Coverage</small><b>{c.pct}%</b></div>
              <div><small>Crews retasked</small><b>{c.moved}</b></div>
              <div><small>Threat X1</small><b className={c.x1 ? 'pos' : 'neg'}>{c.x1 ? 'Covered' : 'Not covered'}</b></div>
              <div><small>Solved in</small><b>{c.ms} ms</b></div>
            </div>
            <ul className="lines">{c.lines.map((l, k) => <li key={k}>{l}</li>)}</ul>
            <button className={`btn sm ${i === 0 ? 'btn-amber' : 'btn-ghost'}`} onClick={() => act('coa', i)}>Approve this course of action</button>
          </li>
        ))}
      </ol>
    </>
  );
}

export function BaseOpsPanel({ D, act }) {
  const tasked = id => Object.keys(D.plan.assign).find(m => D.plan.assign[m].includes(id));
  const alerts = D.aircraft.filter(a => a.fault >= 30 && !a.grounded).slice(0, 4);
  return (
    <>
      <p className="role-note">Readiness, crew duty and stock. Fault risk comes from a gradient-boosted model on the server. Ground an aircraft and everyone's plan rebuilds without it.</p>
      <div className="tscroll">
        <table className="ac">
          <thead><tr><th>Aircraft</th><th>Base</th><th>Serviceability</th><th>Duty left</th><th>Fault 48h</th><th>Status</th><th /></tr></thead>
          <tbody>
            {D.aircraft.map(a => {
              const task = tasked(a.id), down = a.grounded || a.serv < 70;
              const why = a.grounded ? 'Grounded' : a.serv < 70 ? 'Under 70%' : task || 'Reserve';
              return (
                <tr key={a.id} className={down ? 'down' : ''}>
                  <td><code>{a.id}</code> {a.type}</td>
                  <td>{D.bases[a.base].name.slice(0, 3)}</td>
                  <td><div className={`bar${a.serv < 70 ? ' bad' : ''}`}><i style={{ width: a.serv + '%' }} /></div><small>{Math.round(a.serv)}%</small></td>
                  <td>{a.duty}h</td>
                  <td className={a.fault >= 30 ? 'neg' : ''}>{a.fault}%</td>
                  <td><Chip kind={down ? 'no' : task ? 'ok' : 'held'}>{why}</Chip></td>
                  <td><button className="mini" aria-pressed={a.grounded} onClick={() => act('ground', a.id)}>{a.grounded ? 'Release' : 'Ground'}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {alerts.length > 0 && (
        <ul className="alerts">
          {alerts.map(a => <li key={a.id}><b>{a.id}</b> has a {a.fault}% predicted fault risk in the next 48 h{tasked(a.id) ? ' and is currently tasked' : ''}. Consider grounding it for inspection.</li>)}
        </ul>
      )}
      <div className="stocks">
        {Object.entries(D.bases).map(([k, b]) => (
          <div className="stk" key={k}>
            <b>{b.name}</b>
            {Object.entries(b.stock).map(([w, n]) => {
              const left = D.plan.stockLeft[k][w];
              return <div key={w}><span>{w}</span><div className="bar"><i style={{ width: (n ? left / n * 100 : 0) + '%' }} /></div><small>{left}/{n}</small></div>;
            })}
          </div>
        ))}
      </div>
    </>
  );
}
