/* Accessible tab strip: arrow keys move between tabs. `render(item, selected)` draws each button's content. */
export default function Tabs({ items, value, onChange, label, className, render }) {
  const move = (e, i) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    onChange(n);
    e.currentTarget.parentElement.children[n].focus();
  };
  return (
    <div className={className} role="tablist" aria-label={label}>
      {items.map((it, i) => (
        <button key={i} role="tab" aria-selected={value === i} tabIndex={value === i ? 0 : -1}
          onClick={() => onChange(i)} onKeyDown={e => move(e, i)}>
          {render(it, i)}
        </button>
      ))}
    </div>
  );
}
