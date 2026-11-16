import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../lib/auth.jsx';
import { useLoader } from './ui.jsx';
import Ico from './Ico.jsx';
import './NotificationBell.css';

function parseDate(v) {
  if (!v) return null;
  const d = new Date(String(v).replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

export function timeAgo(v) {
  const d = v instanceof Date ? v : parseDate(v);
  if (!d) return '';
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return `${mins || 1}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

export { parseDate };

/**
 * Notification bell + dropdown panel shared by the role dashboards.
 *
 * Props:
 *   onNavigate(key)  — called with the item's `go` key when a notification is clicked
 *   sources          — which datasets to load: { drops, reports, schedules, routes, redemptions }
 *   buildItems(data) — ({ drops, reports, schedules, routes, redemptions }) => [{ id, icon, kind, title, text, when, go }]
 *   role             — role key used in the localStorage seen/dismissed keys
 */
export default function NotificationBell({ onNavigate, sources = {}, buildItems, role = 'resident' }) {
  const { user } = useAuth();
  const want = { drops: true, reports: true, schedules: false, routes: false, redemptions: false, ...sources };

  // Always call the same hooks (rules of hooks); disabled sources resolve instantly.
  const drops = useLoader(() => (want.drops ? api('/dropoffs') : Promise.resolve(null)));
  const reports = useLoader(() => (want.reports ? api('/dumping-reports') : Promise.resolve(null)));
  const schedules = useLoader(() => (want.schedules ? api('/schedules') : Promise.resolve(null)));
  const routes = useLoader(() => (want.routes ? api('/routes') : Promise.resolve(null)));
  const redemptions = useLoader(() => (want.redemptions ? api('/redemptions') : Promise.resolve(null)));

  const uid = user?.id ?? user?.eco_id ?? role;
  const seenKey = `ecobin.notif.seen.${role}.${uid}`;
  const dismissedKey = `ecobin.notif.dismissed.${role}.${uid}`;
  const [open, setOpen] = useState(false);
  const [showCleared, setShowCleared] = useState(false);
  const [seen, setSeen] = useState(() => {
    try { return Number(localStorage.getItem(seenKey)) || 0; } catch { return 0; }
  });
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(dismissedKey)) || []; } catch { return []; }
  });
  const box = useRef(null);

  const raw = {
    drops: drops.data?.dropoffs || [],
    reports: reports.data?.reports || [],
    schedules: schedules.data?.schedules || [],
    routes: routes.data?.routes || [],
    redemptions: redemptions.data?.redemptions || [],
  };
  const items = (buildItems ? buildItems(raw) : []).map((i) => ({ ...i, when: i.when instanceof Date ? i.when : parseDate(i.when) })).filter((i) => i.when);

  const visible = items.filter((i) => !dismissed.includes(i.id));
  const clearedCount = items.length - visible.length;
  const list = showCleared ? items : visible;
  const unread = visible.filter((i) => i.when.getTime() > seen).length;
  const enabled = [
    want.drops && drops, want.reports && reports, want.schedules && schedules,
    want.routes && routes, want.redemptions && redemptions,
  ].filter(Boolean);
  const loading = enabled.some((s) => s.loading);

  function saveDismissed(next) {
    const trimmed = next.slice(-100);
    setDismissed(trimmed);
    try { localStorage.setItem(dismissedKey, JSON.stringify(trimmed)); } catch { /* ignore */ }
  }

  function clearAll() {
    saveDismissed([...new Set([...dismissed, ...items.map((i) => i.id)])]);
  }

  function restoreAll() {
    const ids = items.map((i) => i.id);
    saveDismissed(dismissed.filter((id) => !ids.includes(id)));
    setShowCleared(false);
  }

  function markRead() {
    const now = Date.now();
    setSeen(now);
    try { localStorage.setItem(seenKey, String(now)); } catch { /* ignore */ }
  }

  function closePanel() {
    setOpen(false);
    setShowCleared(false);
    markRead();
  }

  function reloadAll() {
    if (want.drops) drops.reload();
    if (want.reports) reports.reload();
    if (want.schedules) schedules.reload();
    if (want.routes) routes.reload();
    if (want.redemptions) redemptions.reload();
  }

  function togglePanel() {
    if (open) {
      closePanel();
    } else {
      setOpen(true);
      reloadAll();
    }
  }

  // Close when clicking outside or pressing Esc
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) closePanel(); };
    const onKey = (e) => { if (e.key === 'Escape') closePanel(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="notif" ref={box}>
      <button
        type="button"
        className="notif-bell"
        aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={togglePanel}
      >
        <Ico n="bell" size={19} />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <strong>Notifications</strong>
            <div>
              {unread > 0 && (
                <button type="button" className="notif-clear" onClick={markRead}>
                  Mark all as read
                </button>
              )}
              {visible.length > 0 && (
                <button type="button" className="notif-clear" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          {loading && !items.length ? (
            <p className="muted notif-empty">Loading…</p>
          ) : list.length ? (
            <ul className="notif-list">
              {list.map((i) => {
                const isCleared = dismissed.includes(i.id);
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      className={`notif-item${!isCleared && i.when.getTime() > seen ? ' unread' : ''}${isCleared ? ' cleared' : ''}`}
                      onClick={() => { onNavigate(i.go); closePanel(); }}
                    >
                      <span className={`notif-icon ${i.kind}`}><Ico n={i.icon} size={18} /></span>
                      <span className="notif-body">
                        <span className="notif-title">{i.title}</span>
                        <span className="notif-text">{i.text}</span>
                      </span>
                      <span className="notif-time">{timeAgo(i.when)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted notif-empty">
              {clearedCount > 0 ? 'All notifications cleared.' : "You're all caught up. 🎉"}
            </p>
          )}

          {clearedCount > 0 && (
            <div className="notif-footer">
              <button type="button" className="notif-restore" onClick={() => setShowCleared((s) => !s)}>
                {showCleared ? 'Hide cleared' : `Show cleared (${clearedCount})`}
              </button>
              <button type="button" className="notif-restore" onClick={restoreAll}>
                Restore all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
