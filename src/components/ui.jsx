import { useEffect, useState } from 'react';

export function Notice({ kind = 'info', children }) {
  if (!children) return null;
  return <div className={`notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function Card({ title, actions, children }) {
  return (
    <section className="card">
      {(title || actions) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Table({ columns, rows, empty = 'Nothing to show yet.' }) {
  if (!rows?.length) return <p className="muted">{empty}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i}>
              {columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Loads data with a refresh function. Keeps the UI simple in each page. */
export function useLoader(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fn()
      .then((data) => alive && setState({ data, error: '', loading: false }))
      .catch((e) => alive && setState({ data: null, error: e.message, loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

export const fmtDate = (v) => (v ? new Date(v.replace(' ', 'T')).toLocaleString() : '—');
export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '');
