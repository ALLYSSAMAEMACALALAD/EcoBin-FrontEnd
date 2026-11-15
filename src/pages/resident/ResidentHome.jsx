import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../api/client.js';
import { useAuth } from '../../lib/auth.jsx';
import {
  Card,
  Notice,
  Table,
  useLoader,
  fmtDate,
  cap
} from '../../components/ui.jsx';

import { compressImage } from '../../lib/image.js';
import { downloadCertificate } from '../../lib/certificate.js';
import './ResidentHome.css';

// ==========================================
// REWARDS CATALOG
// ==========================================

const rewardCatalog = [
  { name: 'Plant Seedling', points_cost: 50, stock: 30, icon: '🌱' },
  { name: 'Recycled Pencil Set', points_cost: 50, stock: 30, icon: '✏️' },
  { name: 'Recycled Notebook', points_cost: 75, stock: 25, icon: '📓' },
  { name: 'Bamboo Toothbrush', points_cost: 75, stock: 20, icon: '🪥' },
  { name: 'Reusable Tote Bag', points_cost: 100, stock: 30, icon: '👜' },
  { name: 'Reusable Mesh Bag', points_cost: 100, stock: 25, icon: '🛍️' },
  { name: 'Reusable Food Container', points_cost: 150, stock: 15, icon: '🍱' },
  { name: 'Reusable Tumbler', points_cost: 200, stock: 15, icon: '🥤' },
  { name: 'Eco Cleaning Kit', points_cost: 200, stock: 10, icon: '🧽' },
  { name: 'Gardening Starter Kit', points_cost: 250, stock: 10, icon: '🪴' },
  { name: 'Grocery Discount Voucher', points_cost: 300, stock: 20, icon: '🎟️' },
  { name: 'School Supplies Bundle', points_cost: 350, stock: 10, icon: '🎒' },
  { name: 'Grocery Gift Pack', points_cost: 500, stock: 10, icon: '🎁' },
  { name: 'Transportation Fare Voucher', points_cost: 500, stock: 10, icon: '🚌' },
  { name: 'Eco-Friendly Household Kit', points_cost: 750, stock: 5, icon: '🏠' }
];

// ==========================================
// HELPERS
// ==========================================

function getBalance(response) {
  if (response == null) return null;

  const candidates = [
    response,
    response.data,
    response.result,
    response.data?.data,
    response.result?.data
  ];

  for (const item of candidates) {
    if (item == null) continue;

    const value =
      typeof item === 'number' || typeof item === 'string'
        ? item
        : item.balance ??
          item.points_balance ??
          item.available_points ??
          item.available_balance;

    if (value === undefined || value === null || value === '') {
      continue;
    }

    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

// ==========================================
// RESIDENT HOME (SHELL)
// ==========================================

const NAV_ITEMS = [
  ['overview', 'dashboard', 'Dashboard', 'home overview'],
  ['schedule', 'schedule', 'Collection Schedule', 'calendar pickup collection'],
  ['rewards', 'rewards', 'Rewards', 'points redeem gift'],
  ['report', 'report', 'Report Dumping', 'illegal dump complaint'],
  ['tickets', 'tickets', 'My Tickets', 'reports status'],
  ['guide', 'guide', 'Segregation Guide', 'waste recycle quiz segregate']
];

// Small line icons (no extra library needed)
const ICON_PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.6" /><rect x="14" y="3" width="7" height="7" rx="1.6" /><rect x="3" y="14" width="7" height="7" rx="1.6" /><rect x="14" y="14" width="7" height="7" rx="1.6" /></>,
  schedule: <><rect x="3" y="5" width="18" height="16" rx="2.6" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  rewards: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><path d="M12 8c-2.5 0-4-1-4-2.5S9.5 3 12 5c2.5-2 4-1 4 .5S14.5 8 12 8z" /></>,
  report: <><path d="M12 3 2.5 20h19z" /><path d="M12 10v5M12 17.4v.2" /></>,
  tickets: <><path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3z" /><path d="M14 6v12" strokeDasharray="2 2.4" /></>,
  guide: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5M9 7.5h6" /></>,
  logout: <><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  leaf: <><path d="M11 20c-4 0-7-3-7-8 0-4 4-8 13-8 0 9-4 16-11 16Z" /><path d="M4 20c6 0 10-4 12-9" /></>,
  recycle: <><path d="M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8" /><path d="M18.5 2v4h-4M5.5 22v-4h4" /></>,
  doc: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>
};

function Ico({ n, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[n]}
    </svg>
  );
}

export default function ResidentHome() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [navOpen, setNavOpen] = useState(false);

  const firstName = (user?.name || '').split(' ')[0] || 'Resident';
  const initial = firstName.charAt(0).toUpperCase();

  // Search box: type a page name (e.g. "rewards", "quiz", "calendar") and press Enter
  function onSearch(e) {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit = NAV_ITEMS.find(([, , label, words]) => `${label} ${words}`.toLowerCase().includes(q));
    if (hit) {
      setTab(hit[0]);
      setQuery('');
    }
  }
  // Close the mobile drawer on Escape and prevent body scroll while it is open.
  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [navOpen]);

  const navTo = (key) => { setTab(key); setNavOpen(false); };

  return (
    <div className="rd-shell">
      <aside className={`rd-sidebar${navOpen ? ' open' : ''}`}>
        <div className="rd-logo">
          <div className="rd-logo-art" aria-hidden="true" />
          <div className="rd-logo-name">EcoBin</div>
        </div>

        <nav className="rd-nav">
          {NAV_ITEMS.map(([key, icon, label]) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'active' : ''}
              onClick={() => navTo(key)}
            >
              <span className="rd-nav-icon"><Ico n={icon} /></span>
              {label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="rd-logout"
          onClick={() => logout?.()}
        >
          <span className="rd-nav-icon"><Ico n="logout" /></span>
          Log Out
        </button>
      </aside>

      {navOpen && <div className="rd-overlay" onClick={() => setNavOpen(false)} aria-hidden="true" />}

      <main className="rd-main">
        <button type="button" className="rd-burger" onClick={() => setNavOpen(v => !v)} aria-expanded={navOpen} aria-controls="rd-drawer">
          <span aria-hidden="true">☰</span> Menu
        </button>
        <header className="rd-topbar">
          <form className="rd-search" onSubmit={onSearch} role="search">
            <Ico n="search" size={18} />
            <input
              type="search"
              placeholder="Search anything… (e.g. rewards, schedule)"
              aria-label="Search pages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
          <NotificationBell onNavigate={setTab} />
          <div className="rd-user">
            <div className="rd-avatar">{initial}</div>
            <div>
              <div className="rd-user-name">{user?.name || `Hi, ${firstName}!`}</div>
              <div className="rd-user-role">Resident</div>
            </div>
          </div>
        </header>

        <section className="rd-hero">
          <h1>Good day, {firstName}! 🌱</h1>
          <p>Let's keep our community clean and green together.</p>
        </section>

        {tab === 'overview' && <Overview onNavigate={setTab} />}
        {tab === 'schedule' && <Schedule />}
        {tab === 'guide' && <WasteGuide />}
        {tab === 'rewards' && <Rewards />}
        {tab === 'report' && <ReportDumping onFiled={() => setTab('tickets')} />}
        {tab === 'tickets' && <MyTickets />}
      </main>
    </div>
  );
}

// ==========================================
// OVERVIEW HELPERS
// ==========================================

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function parseDate(v) {
  if (!v) return null;
  const d = new Date(String(v).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Total kg per day for the last 7 days (today last). */
function lastSevenDays(dropRows) {
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({
      key: dayKey(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      kg: 0,
      pts: 0
    });
  }
  const byKey = Object.fromEntries(days.map((x) => [x.key, x]));
  dropRows.forEach((r) => {
    const d = parseDate(r.created_at);
    const slot = d && byKey[dayKey(d)];
    if (slot) {
      slot.kg += parseFloat(r.weight_kg) || 0;
      slot.pts += Number(r.points) || 0;
    }
  });
  return days;
}

/** Soonest upcoming collection from the barangay's (non-recyclable) schedule rows. */
function nextCollection(rows) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let best = null;
  rows.forEach((s) => {
    const text = String(s.collection_day || '').toLowerCase();
    WEEKDAYS.forEach((name, idx) => {
      if (!new RegExp(`\\b${name.slice(0, 3)}`).test(text)) return;
      const date = new Date(today);
      date.setDate(today.getDate() + ((idx - today.getDay() + 7) % 7));
      if (!best || date < best.date) best = { date, row: s };
    });
  });
  return best;
}

function timeAgo(v) {
  const d = v instanceof Date ? v : parseDate(v);
  if (!d) return '';
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return `${mins || 1}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 30 ? `${days}d ago` : d.toLocaleDateString();
}

const fmtKg = (n) => (Math.round(n * 10) / 10).toLocaleString();

/** Simple smooth line + area chart in plain SVG (no chart library needed). */
function ActivityChart({ days }) {
  const W = 600;
  const H = 210;
  const L = 38;
  const R = 14;
  const T = 26;
  const B = 28;
  const max = Math.max(...days.map((d) => d.kg), 0);
  const top = Math.max(4, Math.ceil(max / 4) * 4);
  const x = (i) => L + (i * (W - L - R)) / (days.length - 1);
  const y = (kg) => T + (1 - kg / top) * (H - T - B);

  let line = `M ${x(0)} ${y(days[0].kg)}`;
  for (let i = 1; i < days.length; i += 1) {
    const mx = (x(i - 1) + x(i)) / 2;
    line += ` C ${mx} ${y(days[i - 1].kg)}, ${mx} ${y(days[i].kg)}, ${x(i)} ${y(days[i].kg)}`;
  }
  const area = `${line} L ${x(days.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  const peak = max > 0 ? days.findIndex((d) => d.kg === max) : -1;

  return (
    <svg className="rd-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weekly recycling in kilograms">
      <defs>
        <linearGradient id="rdArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="rd-chart-stop" stopOpacity="0.28" />
          <stop offset="100%" className="rd-chart-stop" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const val = (top / 4) * i;
        return (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(val)} y2={y(val)} className="rd-chart-grid" strokeDasharray="3 4" />
            <text x={L - 8} y={y(val) + 4} textAnchor="end" className="rd-chart-text">{val}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#rdArea)" />
      <path d={line} fill="none" className="rd-chart-line" strokeWidth="2.5" strokeLinecap="round" />
      {days.map((d, i) => (
        <g key={d.key}>
          <circle cx={x(i)} cy={y(d.kg)} r={i === peak ? 5 : 3} className="rd-chart-dot" strokeWidth="2" />
          <text x={x(i)} y={H - 7} textAnchor="middle" className="rd-chart-text">{d.label}</text>
        </g>
      ))}
      {peak >= 0 && (
        <g>
          <rect x={x(peak) - 28} y={y(max) - 30} width="56" height="20" rx="7" className="rd-chart-tipbg" />
          <text x={x(peak)} y={y(max) - 16} textAnchor="middle" className="rd-chart-tip">{fmtKg(max)} kg</text>
        </g>
      )}
    </svg>
  );
}

// ==========================================
// NOTIFICATIONS (bell in the top bar)
// Built from data the resident already has: points credited, report updates
// and a pickup reminder when collection is today or tomorrow.
// ==========================================

function buildNotifications(dropRows, reportRows, scheduleRows) {
  const items = [];

  dropRows.slice(0, 5).forEach((d) => {
    const when = parseDate(d.created_at);
    if (!when) return;
    items.push({
      id: `d${d.id ?? d.created_at}`,
      icon: 'leaf',
      kind: 'points',
      title: `+${d.points} EcoPoints credited`,
      text: `${cap(d.material)} drop-off (${d.unit === 'pcs' ? `${d.quantity} pcs` : `${parseFloat(d.weight_kg)} kg`})`,
      when,
      go: 'overview'
    });
  });

  reportRows.slice(0, 5).forEach((r) => {
    const when = parseDate(r.updated_at || r.created_at);
    if (!when) return;
    items.push({
      id: `r${r.id ?? r.ticket_no}-${r.status}`,
      icon: 'report',
      kind: 'report',
      title: `Report ${r.ticket_no || ''} is ${cap(r.status)}`.replace('  ', ' '),
      text: r.location || 'Illegal dumping report',
      when,
      go: 'tickets'
    });
  });

  const next = nextCollection(scheduleRows);
  if (next) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((next.date - today) / 86400000);
    if (days <= 1) {
      items.push({
        id: `c${dayKey(next.date)}`,
        icon: 'schedule',
        kind: 'pickup',
        title: days === 0 ? 'Collection day is today' : 'Collection is tomorrow',
        text: `${cap(next.row.waste_type)} waste${next.row.time_slot ? ` · ${next.row.time_slot}` : ''}`,
        when: today,
        go: 'schedule'
      });
    }
  }

  return items.sort((a, b) => b.when - a.when).slice(0, 8);
}

function NotificationBell({ onNavigate }) {
  const { user } = useAuth();
  const drops = useLoader(() => api('/dropoffs'));
  const reports = useLoader(() => api('/dumping-reports'));
  const schedules = useLoader(() => api('/schedules'));
  const uid = user?.id ?? user?.eco_id ?? 'resident';
  const seenKey = `ecobin.notif.seen.${uid}`;
  const dismissedKey = `ecobin.notif.dismissed.${uid}`;
  const [open, setOpen] = useState(false);
  const [showCleared, setShowCleared] = useState(false);
  const [seen, setSeen] = useState(() => {
    try { return Number(localStorage.getItem(seenKey)) || 0; } catch { return 0; }
  });
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(dismissedKey)) || []; } catch { return []; }
  });
  const box = useRef(null);

  const zoneQuery = (user?.barangay || '').trim().toLowerCase();
  const scheduleRows = (schedules.data?.schedules || [])
    .filter((s) => s.waste_type !== 'recyclable')
    .filter((s) => !zoneQuery || String(s.zone || '').trim().toLowerCase() === zoneQuery);
  const items = buildNotifications(drops.data?.dropoffs || [], reports.data?.reports || [], scheduleRows);

  const visible = items.filter((i) => !dismissed.includes(i.id));
  const clearedCount = items.length - visible.length;
  const list = showCleared ? items : visible;
  const unread = visible.filter((i) => i.when.getTime() > seen).length;
  const loading = drops.loading || reports.loading || schedules.loading;

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

  function togglePanel() {
    if (open) {
      closePanel();
    } else {
      setOpen(true);
      drops.reload();
      reports.reload();
      schedules.reload();
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
    <div className="rd-notif" ref={box}>
      <button
        type="button"
        className="rd-bell"
        aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={togglePanel}
      >
        <Ico n="bell" size={19} />
        {unread > 0 && <span className="rd-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="rd-notif-panel" role="dialog" aria-label="Notifications">
          <div className="rd-notif-head">
            <strong>Notifications</strong>
            <div>
              {unread > 0 && (
                <button type="button" className="rd-notif-clear" onClick={markRead}>
                  Mark all as read
                </button>
              )}
              {visible.length > 0 && (
                <button type="button" className="rd-notif-clear" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          {loading && !items.length ? (
            <p className="muted rd-notif-empty">Loading…</p>
          ) : list.length ? (
            <ul className="rd-notif-list">
              {list.map((i) => {
                const isCleared = dismissed.includes(i.id);
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      className={`rd-notif-item${!isCleared && i.when.getTime() > seen ? ' unread' : ''}${isCleared ? ' cleared' : ''}`}
                      onClick={() => { onNavigate(i.go); closePanel(); }}
                    >
                      <span className={`rd-notif-icon ${i.kind}`}><Ico n={i.icon} size={18} /></span>
                      <span className="rd-notif-body">
                        <span className="rd-notif-title">{i.title}</span>
                        <span className="rd-notif-text">{i.text}</span>
                      </span>
                      <span className="rd-notif-time">{timeAgo(i.when)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted rd-notif-empty">
              {clearedCount > 0 ? 'All notifications cleared.' : "You're all caught up. 🎉"}
            </p>
          )}

          {clearedCount > 0 && (
            <div className="rd-notif-footer">
              <button type="button" className="rd-notif-restore" onClick={() => setShowCleared((s) => !s)}>
                {showCleared ? 'Hide cleared' : `Show cleared (${clearedCount})`}
              </button>
              {showCleared && (
                <button type="button" className="rd-notif-restore" onClick={restoreAll}>
                  Restore all
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// OVERVIEW
// ==========================================

function Overview({ onNavigate }) {
  const { user } = useAuth();
  const balance = useLoader(() => api('/balance'));
  const drops = useLoader(() => api('/dropoffs'));
  const reports = useLoader(() => api('/dumping-reports'));
  const schedules = useLoader(() => api('/schedules'));

  const points = getBalance(balance.data);
  const dropRows = drops.data?.dropoffs || [];
  const reportRows = reports.data?.reports || [];

  const days = lastSevenDays(dropRows);
  const weekKg = days.reduce((s, d) => s + d.kg, 0);
  const weekPts = days.reduce((s, d) => s + d.pts, 0);
  const totalKg = dropRows.reduce((s, r) => s + (parseFloat(r.weight_kg) || 0), 0);
  const pending = reportRows.filter((r) => r.status === 'pending').length;

  const zoneQuery = (user?.barangay || '').trim().toLowerCase();
  const scheduleRows = (schedules.data?.schedules || [])
    .filter((s) => s.waste_type !== 'recyclable')
    .filter((s) => !zoneQuery || String(s.zone || '').trim().toLowerCase() === zoneQuery);
  const next = nextCollection(scheduleRows);

  return (
    <>
      {/* Stat cards */}
      <div className="rd-stats">
        <div className="card rd-stat">
          <span className="rd-stat-icon green"><Ico n="leaf" size={26} /></span>
          <div>
            <div className="rd-stat-value">
              {points !== null ? points.toLocaleString() : balance.loading ? '…' : '—'}
            </div>
            <div className="rd-stat-label">EcoPoints</div>
            <div className="rd-stat-delta">↑ +{weekPts} this week</div>
            {balance.error && <Notice kind="error">{balance.error}</Notice>}
          </div>
        </div>

        <div className="card rd-stat">
          <span className="rd-stat-icon mint"><Ico n="recycle" size={26} /></span>
          <div>
            <div className="rd-stat-value">{fmtKg(totalKg)} kg</div>
            <div className="rd-stat-label">Waste Recycled</div>
            <div className="rd-stat-delta">↑ +{fmtKg(weekKg)} kg this week</div>
          </div>
        </div>

        <div className="card rd-stat">
          <span className="rd-stat-icon sun"><Ico n="doc" size={26} /></span>
          <div>
            <div className="rd-stat-value">{reportRows.length}</div>
            <div className="rd-stat-label">Reports Submitted</div>
            <div className="rd-stat-delta">{pending} pending</div>
          </div>
        </div>
      </div>

      {/* Activity chart and next collection */}
      <div className="rd-row rd-row-chart">
        <div className="card">
          <div className="rd-card-head">
            <h3 className="rd-card-title">Your Recycling Activity</h3>
            <span className="rd-chip">Last 7 days</span>
          </div>
          <ActivityChart days={days} />
          {!dropRows.length && !drops.loading && (
            <p className="muted" style={{ margin: '4px 0 0' }}>
              No drop-offs yet. Bring recyclables to the hub to see your chart grow.
            </p>
          )}
        </div>

        <div className="card rd-next">
          <div className="rd-card-head">
            <h3 className="rd-card-title">Next Collection</h3>
          </div>
          {next ? (
            <>
              <div className="rd-next-date">
                <span className="rd-next-cal"><Ico n="schedule" size={26} /></span>
                <div>
                  <div className="rd-next-day">
                    {next.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="muted">({next.date.toLocaleDateString('en-US', { weekday: 'long' })})</div>
                </div>
              </div>
              <div className="rd-next-meta">
                {cap(next.row.waste_type)} Waste{next.row.time_slot ? ` · ${next.row.time_slot}` : ''}
              </div>
            </>
          ) : (
            <p className="muted">
              {schedules.loading ? 'Loading schedule…' : 'No schedule published for your barangay yet.'}
            </p>
          )}
          <div className="rd-bin-art" aria-hidden="true" />
          <button className="btn primary" type="button" onClick={() => onNavigate('schedule')}>
            View Schedule →
          </button>
        </div>
      </div>

      {/* Recent activity and environmental impact */}
      <div className="rd-row rd-row-chart">
        <div className="card">
          <div className="rd-card-head">
            <h3 className="rd-card-title">Recent Activity</h3>
          </div>
          {dropRows.length ? (
            <ul className="rd-activity">
              {dropRows.slice(0, 4).map((d) => (
                <li key={d.id ?? d.created_at}>
                  <span className="rd-act-icon"><Ico n="check" size={20} /></span>
                  <div className="rd-act-body">
                    <div className="rd-activity-text">
                      You earned {d.points} pts for a {cap(d.material)} drop-off ({d.unit === 'pcs' ? `${d.quantity} pcs` : `${parseFloat(d.weight_kg)} kg`})
                    </div>
                    <div className="rd-activity-date">{fmtDate(d.created_at)}</div>
                  </div>
                  <span className="rd-act-ago">{timeAgo(d.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No activity yet. Bring recyclables to the hub.</p>
          )}
        </div>

        <div className="card rd-impact">
          <div className="rd-card-head">
            <h3 className="rd-card-title">Environmental Impact</h3>
          </div>
          <div className="rd-impact-body">
            <span className="rd-stat-icon green"><Ico n="leaf" size={26} /></span>
            <div>
              <div className="rd-stat-value">{fmtKg(totalKg)} kg</div>
              <div className="muted">of waste diverted from landfills</div>
            </div>
          </div>
          <div className="rd-impact-stats">
            <div>
              <b>{dropRows.length}</b>
              <span>drop-offs made</span>
            </div>
            <div>
              <b>{fmtKg(weekKg)} kg</b>
              <span>recycled this week</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions and eco-ID */}
      <div className="rd-row-2">
        <div className="card">
          <div className="rd-card-head">
            <h3 className="rd-card-title">Quick Actions</h3>
          </div>
          <div className="rd-actions">
            <button type="button" className="rd-action" onClick={() => onNavigate('report')}>
              <span className="rd-action-icon"><Ico n="report" size={24} /></span>
              Report Dumping
            </button>
            <button type="button" className="rd-action" onClick={() => onNavigate('rewards')}>
              <span className="rd-action-icon"><Ico n="rewards" size={24} /></span>
              Check Rewards
            </button>
            <button type="button" className="rd-action" onClick={() => onNavigate('guide')}>
              <span className="rd-action-icon"><Ico n="guide" size={24} /></span>
              View Guide
            </button>
            <button type="button" className="rd-action" onClick={() => onNavigate('schedule')}>
              <span className="rd-action-icon"><Ico n="schedule" size={24} /></span>
              View Schedule
            </button>
          </div>
        </div>

        <div className="card">
          <div className="rd-card-head">
            <h3 className="rd-card-title">Your Eco-ID</h3>
          </div>
          <div className="rd-eco-qr">
            <p className="muted" style={{ textAlign: 'center', margin: 0 }}>
              Show this QR code at the drop-off hub so your points can be credited.
            </p>
            <QRCodeSVG value={user?.eco_id || ''} size={280} includeMargin className="rd-qr-svg" />
            <p className="mono" style={{ margin: 0 }}>{user?.eco_id}</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ==========================================
// COLLECTION SCHEDULE
// ==========================================

function Schedule() {
  const { user } = useAuth();
  const schedules = useLoader(() => api('/schedules'));

  return (
    <div className="rd-schedule">
      <CollectionScheduleCard schedules={schedules} zone={user?.barangay} />
      <RecyclablesCard schedules={schedules} zone={user?.barangay} />
    </div>
  );
}

function RecyclablesCard({ schedules, zone }) {
  const rows = (schedules.data?.schedules || []).filter((s) => s.waste_type === 'recyclable');
  const zoneQuery = (zone || '').trim().toLowerCase();
  const onlyBarangay = zoneQuery
    ? rows.filter((s) => String(s.zone || '').trim().toLowerCase() === zoneQuery)
    : rows;

  return (
    <Card
      title="Recyclables pickup"
      actions={
        <button className="btn ghost" type="button" onClick={() => schedules.reload()}>
          Refresh
        </button>
      }
    >
      {schedules.loading ? (
        <p className="muted">Loading recyclables pickup…</p>
      ) : schedules.error ? (
        <Notice kind="error">{schedules.error}</Notice>
      ) : (
        <>
          <p className="muted">
            Schedule for recyclables collection{zone ? ` in ${zone}` : ' in your barangay'}.
          </p>
          <Table
            columns={[
              { key: 'collection_day', label: 'Day' },
              { key: 'time_slot', label: 'Time' },
              { key: 'waste_type', label: 'Bin / type', render: (r) => cap(r.waste_type) }
            ]}
            rows={onlyBarangay}
            empty="No recyclables pickup scheduled for your barangay yet."
          />
          <p className="muted">
            Sort your recyclables in the blue bin and place them by the gate on pickup day.
          </p>
        </>
      )}
    </Card>
  );
}

function CollectionScheduleCard({ schedules, zone }) {
  const zoneQuery = (zone || '').trim().toLowerCase();
  const onlyBarangay = (schedules.data?.schedules || [])
    .filter((s) => s.waste_type !== 'recyclable')
    .filter((s) => !zoneQuery || String(s.zone || '').trim().toLowerCase() === zoneQuery);

  return (
    <Card
      title={`Collection schedule${zone ? ` for ${zone}` : ' for your barangay'}`}
      actions={
        <button className="btn ghost" type="button" onClick={() => schedules.reload()}>
          Refresh
        </button>
      }
    >
      {schedules.loading ? (
        <p className="muted">Loading collection schedules…</p>
      ) : schedules.error ? (
        <Notice kind="error">{schedules.error}</Notice>
      ) : (
        <Table
          columns={[
            { key: 'zone', label: 'Barangay / zone' },
            { key: 'collection_day', label: 'Day' },
            { key: 'time_slot', label: 'Time' },
            {
              key: 'waste_type',
              label: 'Waste type',
              render: (r) => cap(r.waste_type)
            }
          ]}
          rows={onlyBarangay}
          empty="No schedule published for your barangay yet."
        />
      )}

      <p className="muted">
        Sort non-recyclable waste for your barangay's collection day. Recyclables have their own
        pickup schedule on the card beside it.
      </p>
    </Card>
  );
}

// ==========================================
// REWARDS
// ==========================================

function Rewards() {
  const balance = useLoader(() => api('/balance'));
  const rewards = useLoader(() => api('/rewards'));
  const redemptions = useLoader(() => api('/redemptions'));

  const [msg, setMsg] = useState({
    kind: 'info',
    text: ''
  });

  const [busyReward, setBusyReward] = useState(null);

  const points = getBalance(balance.data);

  const backendRewards = rewards.data?.rewards || [];

  const availableRewards = rewardCatalog.map((item) => {
    const backendReward = backendRewards.find(
      (r) => r.name?.trim().toLowerCase() === item.name.toLowerCase()
    );

    const stockValue =
      backendReward?.remaining_quantity ??
      backendReward?.stock_remaining ??
      backendReward?.quantity_available ??
      backendReward?.stock;

    return {
      ...item,
      id: backendReward?.id,
      image_url: backendReward?.image_url || null,
      stock: stockValue != null
        ? Number(stockValue)
        : item.stock
    };
  });

  const myRequests = redemptions.data?.redemptions || [];

  async function redeem(reward) {
    if (busyReward !== null) return;

    if (points === null) {
      setMsg({
        kind: 'error',
        text: 'Unable to load your points. Please refresh and try again.'
      });
      return;
    }

    if (!reward.id) {
      setMsg({
        kind: 'error',
        text: `${reward.name} is not registered in the backend database.`
      });
      return;
    }

    if (points < reward.points_cost) {
      setMsg({
        kind: 'error',
        text: 'You do not have enough points for this reward.'
      });
      return;
    }

    if (reward.stock <= 0) {
      setMsg({
        kind: 'error',
        text: 'This reward is currently out of stock.'
      });
      return;
    }

    setBusyReward(reward.id);
    setMsg({ kind: 'info', text: '' });

    try {
      const d = await api('/redemptions', {
        method: 'POST',
        body: {
          reward_id: reward.id
        }
      });

      setMsg({
        kind: 'success',
        text: `Request sent successfully! Certificate code: ${d.certificate_code || 'Pending'}`
      });

      await Promise.all([
        balance.reload(),
        rewards.reload(),
        redemptions.reload()
      ]);

    } catch (e) {
      setMsg({
        kind: 'error',
        text: e.message || 'Unable to submit your redemption request.'
      });
    } finally {
      setBusyReward(null);
    }
  }

  async function certificate(id) {
    try {
      const d = await api(`/redemptions/${id}/certificate`);
      downloadCertificate(d.certificate);
    } catch (e) {
      setMsg({
        kind: 'error',
        text: e.message || 'Unable to download certificate.'
      });
    }
  }

  return (
    <div className="stack">

      <Card title="Your available points">
        <p className="big">
          {points !== null ? `${points} pts` : balance.loading ? 'Loading...' : 'Unavailable'}
        </p>

        {balance.error && <Notice kind="error">{balance.error}</Notice>}

        <p className="muted">
          Your available points for redeeming eco-friendly rewards.
        </p>

        <button
          className="btn ghost"
          type="button"
          onClick={() => balance.reload()}
        >
          Refresh points
        </button>
      </Card>

      <Card title="Available rewards">
        <Notice kind={msg.kind}>
          {msg.text}
        </Notice>

        <div className="grid-2">
          {availableRewards.map((reward) => {
            const enoughPoints =
              points !== null && points >= reward.points_cost;

            const inStock = reward.stock > 0;
            const registered = Boolean(reward.id);
            const isBusy = busyReward === reward.id;

            return (
              <div className="card" key={reward.name}>
                {reward.image_url ? (
                  <img className="rd-reward-img" src={reward.image_url} alt={reward.name} loading="lazy" />
                ) : (
                  <div className="rd-reward-icon-big">{reward.icon}</div>
                )}
                <h3>{reward.name}</h3>

                <p className="muted">
                  Points Required: {reward.points_cost}
                </p>

                <p className="muted">
                  Available Stock: {reward.stock}
                </p>

                <button
                  className="btn primary"
                  type="button"
                  disabled={
                    !enoughPoints ||
                    !inStock ||
                    !registered ||
                    busyReward !== null
                  }
                  onClick={() => redeem(reward)}
                >
                  {isBusy ? 'Requesting...' : 'Request reward'}
                </button>

                {!registered ? (
                  <p className="muted">
                    Reward not yet registered.
                  </p>
                ) : !inStock ? (
                  <p className="muted">
                    Out of stock.
                  </p>
                ) : points === null ? (
                  <p className="muted">
                    Unable to load points.
                  </p>
                ) : !enoughPoints ? (
                  <p className="muted">
                    Not enough points yet.
                  </p>
                ) : (
                  <p className="muted">
                    You can request this reward.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="My requests">
        <Table
          columns={[
            {
              key: 'created_at',
              label: 'Requested',
              render: (r) => fmtDate(r.created_at)
            },
            { key: 'reward_name', label: 'Reward' },
            {
              key: 'status',
              label: 'Status',
              render: (r) => (
                <span className={`badge s-${r.status}`}>
                  {cap(r.status)}
                </span>
              )
            },
            { key: 'certificate_code', label: 'Certificate' },
            {
              key: 'pdf',
              label: 'PDF',
              render: (r) => (
                r.status === 'approved' ? (
                  <button
                    className="btn small"
                    type="button"
                    onClick={() => certificate(r.id)}
                  >
                    Download PDF
                  </button>
                ) : '—'
              )
            }
          ]}
          rows={myRequests}
          empty="You have not requested any rewards yet."
        />
      </Card>

    </div>
  );
}

// ==========================================
// REPORT DUMPING
// ==========================================

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function ReportDumping({ onFiled }) {
  const [form, setForm] = useState({
    location: '',
    description: ''
  });

  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState({
    kind: 'info',
    text: ''
  });
  const [busy, setBusy] = useState(false);

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  // Creates an image preview and cleans up memory when the photo changes or is removed
  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function pickPhoto(file) {
    if (!file) return;

    setMsg({ kind: 'info', text: '' });
    // Phone cameras produce multi-megabyte photos; shrink before uploading.
    const compressed = await compressImage(file);

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(compressed.type)) {
      setMsg({
        kind: 'error',
        text: "The browser can't read this image. Save it as JPEG/PNG and try again."
      });
      return;
    }

    if (compressed.size > MAX_PHOTO_BYTES) {
      setMsg({
        kind: 'error',
        text: 'Image is too large. Maximum 5 MB.'
      });
      return;
    }

    setPhoto(compressed);
  }

  async function submit(e) {
    e.preventDefault();

    setBusy(true);
    setMsg({
      kind: 'info',
      text: ''
    });

    try {
      const fd = new FormData();

      fd.append('location', form.location);
      fd.append('description', form.description);

      if (photo) {
        fd.append('photo', photo);
      }

      const d = await api('/dumping-reports', {
        method: 'POST',
        body: fd
      });

      setMsg({
        kind: 'success',
        text: `Report filed. Ticket ${d.ticket_no} is open.`
      });

      setForm({
        location: '',
        description: ''
      });
      setPhoto(null);

      setTimeout(onFiled, 1200);

    } catch (err) {
      setMsg({
        kind: 'error',
        text: err.message || 'Unable to submit report.'
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Report illegal dumping">
      <Notice kind={msg.kind}>
        {msg.text}
      </Notice>

      <form className="stack" onSubmit={submit}>
        <label>
          Location
          <input
            value={form.location}
            onChange={(e) =>
              setForm({
                ...form,
                location: e.target.value
              })
            }
            required
          />
        </label>

        <label>
          What did you see?
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description: e.target.value
              })
            }
          />
        </label>

        <div className="stack">
          <span>Photo evidence (optional, max 5 MB)</span>

          {/* Hidden inputs: these two buttons open the camera/gallery picker */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              pickPhoto(e.target.files[0]);
              e.target.value = '';
            }}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              pickPhoto(e.target.files[0]);
              e.target.value = '';
            }}
          />

          <div className="row">
            <button
              type="button"
              className="btn ghost"
              onClick={() => cameraRef.current?.click()}
            >
              Take photo
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => galleryRef.current?.click()}
            >
              Choose from gallery
            </button>
          </div>

          {preview && photo && (
            <div className="stack">
              <img
                src={preview}
                alt="Preview of the reported dumping"
                style={{ width: '100%', maxWidth: 320, borderRadius: 14, objectFit: 'cover' }}
              />
              <div className="row">
                <span className="muted">{photo.name}</span>
                <button
                  type="button"
                  className="btn small danger"
                  onClick={() => setPhoto(null)}
                >
                  Remove photo
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          className="btn primary"
          disabled={busy}
          type="submit"
        >
          {busy ? 'Submitting…' : 'Submit report'}
        </button>
      </form>
    </Card>
  );
}

// ==========================================
// WASTE SEGREGATION GUIDE
// ==========================================

const CATEGORY_INFO = {
  biodegradable: {
    label: 'Biodegradable',
    bin: 'Green bin',
    description: 'Natural waste that breaks down on its own. Good for composting.'
  },
  recyclable: {
    label: 'Recyclable',
    bin: 'Blue bin',
    description: 'Clean, dry materials that can be made into new products.'
  },
  residual: {
    label: 'Residual (non-recyclable)',
    bin: 'Yellow bin',
    description: 'Waste that cannot be recycled or composted.'
  },
  hazardous: {
    label: 'Hazardous / special',
    bin: 'Red bin (keep separate, never mixed)',
    description: 'Items that can harm people or the environment. Handle them separately.'
  }
};

const wasteCategories = [
  {
    key: 'biodegradable',
    items: [
      'Food scraps and leftovers',
      'Fruit and vegetable peels',
      'Coffee grounds and tea bags',
      'Dried leaves and yard trimmings',
      'Eggshells',
      'Wilted flowers'
    ],
    tips: [
      'Drain liquids before disposing.',
      'Compost at home if your barangay supports it.'
    ]
  },
  {
    key: 'recyclable',
    items: [
      'Paper, cardboard, and newspaper',
      'PET bottles and clear plastic containers',
      'Aluminum and tin cans',
      'Glass bottles and jars',
      'Clean plastic containers marked 1 to 7'
    ],
    tips: [
      'Rinse containers and let them dry.',
      'Flatten boxes and remove plastic tape.'
    ]
  },
  {
    key: 'residual',
    items: [
      'Chip wrappers and sachets',
      'Styrofoam and foam packaging',
      'Diapers and sanitary pads',
      'Used tissues and cotton buds',
      'Broken ceramics',
      'Cigarette butts'
    ],
    tips: [
      'Wrap sharp items so collectors stay safe.',
      'Tie bags securely to prevent spills.'
    ]
  },
  {
    key: 'hazardous',
    items: [
      'Batteries',
      'Fluorescent bulbs and tubes',
      'Expired or unused medicines',
      'Paint and solvents',
      'Used motor oil',
      'Electronic waste (e-waste)'
    ],
    tips: [
      'Keep items in their original containers when possible.',
      'Ask your barangay or drop-off hub about special collection days.'
    ]
  }
];

// Used by search. Add items that residents ask about most.
const wasteItems = [
  { name: 'Banana peel', category: 'biodegradable', disposal: 'Put in the biodegradable bin or compost it.', keywords: ['fruit', 'peel'] },
  { name: 'Eggshell', category: 'biodegradable', disposal: 'Crush and put in the biodegradable bin or compost.', keywords: ['egg'] },
  { name: 'Coffee grounds', category: 'biodegradable', disposal: 'Biodegradable bin or compost. Empty the filter first.', keywords: ['coffee', 'kape'] },
  { name: 'Leftover rice', category: 'biodegradable', disposal: 'Biodegradable bin. Do not pour it down the drain.', keywords: ['rice', 'kanin', 'food'] },
  { name: 'Dried leaves', category: 'biodegradable', disposal: 'Biodegradable bin or compost pile.', keywords: ['leaves', 'dahon', 'yard'] },
  { name: 'PET bottle', category: 'recyclable', disposal: 'Rinse, crush, and put in the recyclable bin. Remove the cap if required locally.', keywords: ['plastic bottle', 'bote', 'water bottle'] },
  { name: 'Aluminum can', category: 'recyclable', disposal: 'Rinse and put in the recyclable bin.', keywords: ['soda can', 'lata', 'can'] },
  { name: 'Cardboard box', category: 'recyclable', disposal: 'Flatten, remove tape, and keep dry. Put in the recyclable bin.', keywords: ['box', 'carton', 'karton'] },
  { name: 'Newspaper', category: 'recyclable', disposal: 'Keep dry and bundle. Put in the recyclable bin.', keywords: ['paper', 'dyaryo'] },
  { name: 'Glass bottle', category: 'recyclable', disposal: 'Rinse and put in the recyclable bin. Handle broken glass separately.', keywords: ['glass', 'bote ng salamin'] },
  { name: 'Chip wrapper', category: 'residual', disposal: 'Put in the residual bin. Not recyclable in most areas.', keywords: ['chichirya', 'snack', 'plastic wrapper'] },
  { name: 'Styrofoam', category: 'residual', disposal: 'Put in the residual bin unless your hub accepts it separately.', keywords: ['foam', 'styro'] },
  { name: 'Diapers', category: 'residual', disposal: 'Wrap securely and put in the residual bin.', keywords: ['diaper', 'lampin'] },
  { name: 'Used tissue', category: 'residual', disposal: 'Residual bin.', keywords: ['tissue', 'tisyu'] },
  { name: 'Cigarette butt', category: 'residual', disposal: 'Put out fully and put in the residual bin.', keywords: ['cigarette', 'sigarilyo', 'stub'] },
  { name: 'Batteries', category: 'hazardous', disposal: 'Never put in regular bins. Keep aside for a special collection or drop-off.', keywords: ['battery', 'baterya', 'lithium'] },
  { name: 'Fluorescent bulb', category: 'hazardous', disposal: 'Handle carefully and take to a hazardous waste drop-off. Do not break it.', keywords: ['bulb', 'ilaw', 'tube light'] },
  { name: 'Expired medicine', category: 'hazardous', disposal: 'Take to a pharmacy or designated drop-off point. Do not flush or throw in regular bins.', keywords: ['gamot', 'medicine', 'tablet'] },
  { name: 'Paint', category: 'hazardous', disposal: 'Keep in original container and take to a hazardous waste drop-off.', keywords: ['pintura', 'solvent', 'thinner'] },
  { name: 'Used motor oil', category: 'hazardous', disposal: 'Store in a sealed container and take to a hazardous waste drop-off.', keywords: ['oil', 'langis', 'engine oil'] },
  { name: 'Old phone or charger', category: 'hazardous', disposal: 'Take to an e-waste collection point.', keywords: ['e-waste', 'cellphone', 'charger', 'laptop', 'electronics'] }
];

// Question bank for the quiz. Picks 5 random questions each round.
const quizBank = [
  {
    question: 'Where should chip wrappers go?',
    options: ['Biodegradable', 'Recyclable', 'Residual', 'Hazardous'],
    answer: 2,
    explanation: 'Chip wrappers are usually multi-layer plastic and not recyclable, so they go in the residual bin.'
  },
  {
    question: 'Where should a banana peel go?',
    options: ['Biodegradable', 'Recyclable', 'Residual', 'Hazardous'],
    answer: 0,
    explanation: 'Food waste breaks down naturally, so it belongs in the biodegradable bin or a compost pile.'
  },
  {
    question: 'What is the correct way to dispose of used batteries?',
    options: [
      'Put them in the residual bin',
      'Put them in the recyclable bin',
      'Keep them aside for a hazardous waste drop-off',
      'Bury them in the garden'
    ],
    answer: 2,
    explanation: 'Batteries can leak toxic materials, so they must never go in regular bins.'
  },
  {
    question: 'Should you rinse plastic bottles before putting them in the recyclable bin?',
    options: ['Yes', 'No'],
    answer: 0,
    explanation: 'Rinsing removes food residue that can contaminate other recyclables.'
  },
  {
    question: 'Why should you flatten cardboard boxes?',
    options: [
      'To make them look neat',
      'To save space in the collection truck',
      'To make them biodegradable',
      'To turn them into hazardous waste'
    ],
    answer: 1,
    explanation: 'Flattened boxes take up less space, so more material fits in each trip.'
  },
  {
    question: 'Where do eggshells belong?',
    options: ['Biodegradable', 'Recyclable', 'Residual', 'Hazardous'],
    answer: 0,
    explanation: 'Eggshells break down over time, so they can go in the biodegradable bin or a compost pile.'
  },
  {
    question: 'Which of these is hazardous waste?',
    options: ['Newspaper', 'Used motor oil', 'Banana peel', 'Chip wrapper'],
    answer: 1,
    explanation: 'Used motor oil can contaminate soil and water, so it needs a hazardous waste drop-off.'
  },
  {
    question: 'What should you do with a glass bottle before recycling it?',
    options: [
      'Wrap it in plastic',
      'Rinse it and keep it dry',
      'Fill it with water',
      'Break it into small pieces'
    ],
    answer: 1,
    explanation: 'Rinsing removes residue, and keeping it dry helps the material stay clean for recycling.'
  },
  {
    question: 'Where should used tissues go?',
    options: ['Biodegradable', 'Recyclable', 'Residual', 'Hazardous'],
    answer: 2,
    explanation: 'Used tissues are soiled and usually not accepted in recycling, so they go in the residual bin.'
  }
];

// Shuffles the order of the questions and options so every quiz round is different
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuiz(count = 5) {
  return shuffle(quizBank)
    .slice(0, count)
    .map((q) => {
      const correctText = q.options[q.answer];
      const options = shuffle(q.options);
      return {
        question: q.question,
        explanation: q.explanation,
        options,
        answer: options.indexOf(correctText)
      };
    });
}

const guideTabs = [
  ['basics', 'Categories'],
  ['search', 'Search item'],
  ['quiz', 'Quiz']
];

function WasteGuide() {
  const [sub, setSub] = useState('basics');

  return (
    <div className="stack">
      <Card title="Waste segregation guide">
        <p className="muted">
          Sort your waste at home before collection. Bin colors vary by local
          government unit, so follow the color code your barangay uses.
          When in doubt, ask before you throw it out.
        </p>
      </Card>

      <nav className="tabs">
        {guideTabs.map(([k, label]) => (
          <button
            key={k}
            className={sub === k ? 'active' : ''}
            onClick={() => setSub(k)}
          >
            {label}
          </button>
        ))}
      </nav>

      {sub === 'basics' && <WasteBasics />}
      {sub === 'search' && <WasteSearch />}
      {sub === 'quiz' && <WasteQuiz />}
    </div>
  );
}

// ---------- Categories ----------

function WasteBasics() {
  return (
    <div className="stack">
      <Card title="Four types of waste">
        <img
          src="/images/waste-types.png"
          alt="Four bins: green for compostable, blue for recyclable, yellow for residual, and red for hazardous"
          style={{
            width: '100%',
            maxWidth: 720,
            borderRadius: 14,
            display: 'block',
            margin: '0 auto'
          }}
        />
      </Card>

      <div className="grid-2">
        {wasteCategories.map((cat) => {
          const info = CATEGORY_INFO[cat.key];
          return (
            <Card key={cat.key} title={info.label}>
              <p className="muted">
                <strong>Bin:</strong> {info.bin}
              </p>

              <p className="muted">{info.description}</p>

              <h3>Examples</h3>
              <ul>
                {cat.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h3>Tips</h3>
              <ul>
                {cat.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Search (waste item lookup, not the dashboard search) ----------

function WasteSearch() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const results = q
    ? wasteItems.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.toLowerCase().includes(q))
      )
    : [];

  return (
    <Card title="Search a waste item">
      <label>
        What do you want to throw away?
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. banana peel, battery, chichirya"
        />
      </label>

      {q && results.length === 0 && (
        <p className="muted">
          No match found. Try another word or ask your barangay.
        </p>
      )}

      <div className="stack">
        {results.map((item) => {
          const info = CATEGORY_INFO[item.category];
          return (
            <div className="card" key={item.name}>
              <h3>{item.name}</h3>
              <p className="muted">
                <strong>Category:</strong> {info.label}
              </p>
              <p className="muted">
                <strong>Bin:</strong> {info.bin}
              </p>
              <p>{item.disposal}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------- Quiz ----------

function WasteQuiz() {
  const [questions, setQuestions] = useState(() => buildQuiz());
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[index];

  function choose(i) {
    if (selected !== null) return;
    setSelected(i);
    if (i === q.answer) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setFinished(true);
    } else {
      setIndex(index + 1);
      setSelected(null);
    }
  }

  function restart() {
    setQuestions(buildQuiz());
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }

  if (finished) {
    return (
      <Card title="Quiz complete">
        <p className="big">
          {score} / {questions.length}
        </p>
        <p className="muted">
          {score === questions.length
            ? 'Perfect score. Great job sorting!'
            : 'Try again for a new set of questions.'}
        </p>
        <button className="btn primary" type="button" onClick={restart}>
          Try again
        </button>
      </Card>
    );
  }

  return (
    <Card
      title={`Question ${index + 1} of ${questions.length}`}
      actions={<span className="muted">Score: {score}</span>}
    >
      <p>{q.question}</p>

      <div className="stack">
        {q.options.map((opt, i) => {
          let cls = 'btn ghost';
          if (selected !== null) {
            if (i === q.answer) cls = 'btn primary';
            else if (i === selected) cls = 'btn danger';
          }
          return (
            <button
              key={opt}
              type="button"
              className={cls}
              disabled={selected !== null}
              onClick={() => choose(i)}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="stack">
          <Notice kind={selected === q.answer ? 'success' : 'error'}>
            {selected === q.answer ? 'Correct!' : 'Not quite.'} {q.explanation}
          </Notice>
          <button className="btn primary" type="button" onClick={next}>
            {index + 1 >= questions.length ? 'See results' : 'Next question'}
          </button>
        </div>
      )}
    </Card>
  );
}

// ==========================================
// MY TICKETS
// ==========================================

function MyTickets() {
  const reports = useLoader(() => api('/dumping-reports'));

  return (
    <Card
      title="My dumping reports"
      actions={
        <button
          className="btn ghost"
          type="button"
          onClick={reports.reload}
        >
          Refresh
        </button>
      }
    >
      <Table
        columns={[
          { key: 'ticket_no', label: 'Ticket' },
          { key: 'location', label: 'Location' },
          {
            key: 'created_at',
            label: 'Filed',
            render: (r) => fmtDate(r.created_at)
          },
          {
            key: 'status',
            label: 'Status',
            render: (r) => (
              <span className={`badge s-${r.status}`}>
                {cap(r.status)}
              </span>
            )
          },
          {
            key: 'photo_url',
            label: 'Photo',
            render: (r) => (
              r.photo_url ? (
                <a
                  href={r.photo_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </a>
              ) : '—'
            )
          }
        ]}
        rows={reports.data?.reports}
        empty="You haven't filed any reports."
      />
    </Card>
  );
}