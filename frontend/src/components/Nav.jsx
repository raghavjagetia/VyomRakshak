export default function Nav() {
  return (
    <header className="nav" id="top">
      <a className="brand" href="#top" aria-label="VyomRakshak home">
        <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4l10 12-10 12L6 16z" fill="none" stroke="currentColor" strokeWidth="2.4" /><circle cx="16" cy="16" r="2.8" fill="currentColor" /></svg>
        <span>Vyom<em>Rakshak</em></span>
      </a>
      <nav aria-label="Sections">
        <a href="#how">Method</a>
        <a href="#shift">Why change</a>
        <a href="#stack">Architecture</a>
        <a href="#risks">Risks</a>
        <a href="#roadmap">Roadmap</a>
        <a href="#impact">Impact</a>
      </nav>
      <a className="btn btn-amber" href="#desk">Open the tasking desk</a>
    </header>
  );
}
