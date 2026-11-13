import { useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../../api/client.js';
import { useAuth } from '../../lib/auth.jsx';
import { Card, Notice, Table, useLoader, fmtDate, cap } from '../../components/ui.jsx';
import { compressImage } from '../../lib/image.js';
import './AdminHome.css';

const NAV_ITEMS = [
  ['dashboard', '🏠', 'Dashboard'],
  ['users', '👥', 'Users & Staff'],
  ['schedules', '📅', 'Collection Schedules'],
  ['routes', '🚚', 'Routes & Dispatch'],
  ['inventory', '🎁', 'Rewards Management'],
  ['redemptions', '🎟️', 'Redemptions'],
  ['tickets', '⚠️', 'Dumping Tickets'],
  ['reports', '📊', 'Reports & Analytics'],
];

const PAGE_TITLES = Object.fromEntries(NAV_ITEMS.map(([k, , label]) => [k, label]));

const QUICK_ACTIONS = [
  ['users', '👥', 'Manage Users', 'tone-green'],
  ['reports', '📊', 'View Reports', 'tone-blue'],
  ['inventory', '🎁', 'Update Rewards', 'tone-amber'],
  ['schedules', '📅', 'View Schedules', 'tone-blue'],
  ['tickets', '⚠️', 'Check Tickets', 'tone-orange'],
  ['routes', '🚚', 'Dispatch Routes', 'tone-green'],
];

export default function AdminHome() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('dashboard');

  const firstName = (user?.name || '').split(' ')[0] || 'Admin';
  const initial = firstName.charAt(0).toUpperCase();
  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  const weekday = now.toLocaleDateString('en-PH', { weekday: 'long' });

  return (
    <div className="ad-shell">
      <aside className="ad-sidebar">
        <div className="ad-brand">
          <div className="ad-brand-tile">♻️</div>
          <div className="ad-brand-name">Eco<span>Bin</span></div>
          <div className="ad-brand-tag">Recycle. Earn. Keep it Green.</div>
        </div>

        <nav className="ad-nav">
          {NAV_ITEMS.map(([key, icon, label]) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              <span className="ad-nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <button type="button" className="ad-logout" onClick={() => logout?.()}>
          <span className="ad-nav-icon">⎋</span>
          Logout
        </button>
      </aside>

      <main className="ad-main">
        <header className="ad-topbar" style={{ justifyContent: 'flex-end' }}>
          <div className="ad-bell" aria-label="Notifications">
            🔔
            <span className="ad-bell-dot" />
          </div>
          <div className="ad-date">
            <strong>{dateLabel}</strong>
            <span>{weekday}</span>
          </div>
          <div className="ad-user">
            <div className="ad-avatar">{initial}</div>
            <div>
              <div className="ad-user-name">{user?.name || 'Admin'}</div>
              <div className="ad-user-role">{cap(user?.role || 'admin')}</div>
            </div>
          </div>
        </header>

        <div className="ad-page-body">
          {tab === 'dashboard' && <Dashboard firstName={firstName} onNavigate={setTab} />}

          {tab !== 'dashboard' && (
            <>
              <h1 className="ad-page-title">{PAGE_TITLES[tab]}</h1>
              {tab === 'users' && <Users />}
              {tab === 'schedules' && <Schedules />}
              {tab === 'routes' && <Routes />}
              {tab === 'redemptions' && <Redemptions />}
              {tab === 'tickets' && <Tickets />}
              {tab === 'inventory' && <RewardsInventory />}
              {tab === 'reports' && <ReportsHub />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Gets the count for one status from the analytics rows
const countOf = (rows = [], status) => Number(rows.find((r) => r.status === status)?.n || 0);

// Formats a date as YYYY-MM-DD in local time
const isoLocal = (d) => d.toLocaleDateString('en-CA');

function Dashboard({ firstName, onNavigate }) {
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const a = useLoader(() => api('/analytics'));
  const reports = useLoader(() => api('/dumping-reports'));
  const routes = useLoader(() => api('/routes'));
  const hubs = useLoader(() => api('/hubs'));
  const users = useLoader(() => api('/admin/users'));
  const collectors = useLoader(() => api('/admin/users?role=collector'));
  const redemptions = useLoader(() => api('/redemptions'));
  const history = useLoader(() => api('/reports/history'));

  if (a.loading) return <p className="muted">Loading…</p>;
  if (a.error) return <Notice kind="error">{a.error}</Notice>;

  const t = a.data.totals;
  const dumping = a.data.dumping_by_status;
  const redemptionStatus = a.data.redemptions_by_status;

  const stats = [
    { icon: '👤', label: 'Total Users', value: (users.data?.users?.length ?? 0).toLocaleString(), tone: 'tone-green' },
    { icon: '👷', label: 'Total Collectors', value: (collectors.data?.users?.length ?? 0).toLocaleString(), tone: 'tone-amber' },
    { icon: '🎁', label: 'Total Redemptions', value: (redemptions.data?.redemptions?.length ?? 0).toLocaleString(), tone: 'tone-orange' },
    { icon: '♻️', label: 'Total Waste Collected', value: `${Number(t.kg_recycled || 0).toLocaleString()} kg`, tone: 'tone-green' },
  ];

  const strip = [
    ['Open reports', countOf(dumping, 'open')],
    ['In progress', countOf(dumping, 'investigating')],
    ['Resolved reports', countOf(dumping, 'resolved')],
    ['Pending redemptions', countOf(redemptionStatus, 'pending')],
    ['Points awarded', Number(t.points_issued || 0).toLocaleString()],
  ];

  const chartData = (a.data.dropoffs_last_14_days || []).map((d) => ({
    day: String(d.day).slice(5),
    kg: Number(d.kg) || 0,
  }));

  const recentReports = (reports.data?.reports || []).slice(0, 5);

  const activity = [
    ...(redemptions.data?.redemptions || []).map((r) => ({
      key: `r${r.id}`,
      icon: '🎁',
      tone: 'tone-amber',
      title: 'Reward redemption requested',
      sub: `${r.resident_name} · ${r.reward_name}`,
      at: r.created_at,
    })),
    ...(reports.data?.reports || []).map((r) => ({
      key: `d${r.id}`,
      icon: '⚠️',
      tone: 'tone-orange',
      title: 'Dumping ticket filed',
      sub: `${r.ticket_no} · ${r.location}`,
      at: r.created_at,
    })),
  ]
    .sort((x, y) => String(y.at).localeCompare(String(x.at)))
    .slice(0, 5);

  const today = new Date();
  const weekEnd = new Date();
  weekEnd.setDate(today.getDate() + 7);
  const startStr = isoLocal(today);
  const endStr = isoLocal(weekEnd);
  const upcoming = (routes.data?.routes || []).filter((r) => r.route_date >= startStr && r.route_date <= endStr);

  const recentGenerated = (history.data?.reports || []).slice(0, 5);

  function pdfReport(r) {
    try {
      downloadPdf(r.title, `Period: ${r.from} to ${r.to}`, r.tables || [], `ecobin-report-${r.period}-${r.to}.pdf`);
    } catch (err) {
      setMsg({ kind: 'error', text: `Unable to generate PDF: ${err.message}` });
    }
  }

  function csvReport(r) {
    downloadFile(
      `ecobin-report-${r.period}-${r.to}.csv`,
      '\uFEFF' + tablesToCsv(r.tables || []),
      'text/csv;charset=utf-8'
    );
  }

  return (
    <>
      <section className="ad-hero">
        <h1>Welcome back, {firstName}! 🌿</h1>
        <p>Here's what's happening in EcoBin today.</p>
      </section>

      {msg.text && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <div className="ad-stats">
        {stats.map((s) => (
          <div className="ad-stat" key={s.label}>
            <div className={`ad-stat-icon ${s.tone}`}>{s.icon}</div>
            <div>
              <div className="ad-stat-label">{s.label}</div>
              <div className="ad-stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ad-strip">
        {strip.map(([label, value]) => (
          <div className="ad-strip-item" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="ad-row">
        <div className="ad-card">
          <div className="ad-card-head">
            <h3>Collection Overview</h3>
            <span className="ad-chip">Last 14 days</span>
          </div>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2d7a4f" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2d7a4f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e8da" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit=" kg" />
                <Tooltip formatter={(v) => `${v} kg`} />
                <Area type="monotone" dataKey="kg" stroke="#2d7a4f" strokeWidth={2.5} fill="url(#adArea)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted">No drop-offs in the last 14 days.</p>
          )}
        </div>

        <div className="ad-card">
          <div className="ad-card-head">
            <h3>System Activity</h3>
          </div>
          {activity.length ? (
            <ul className="ad-activity">
              {activity.map((item) => (
                <li key={item.key}>
                  <div className={`ad-act-icon ${item.tone}`}>{item.icon}</div>
                  <div className="ad-act-main">
                    <div className="ad-act-title">{item.title}</div>
                    <div className="ad-act-sub">{item.sub}</div>
                  </div>
                  <div className="ad-act-time">{fmtDate(item.at)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No activity yet.</p>
          )}
        </div>
      </div>

      <div className="ad-row">
        <div className="ad-card">
          <div className="ad-card-head">
            <h3>Recent dumping reports</h3>
          </div>
          <Table
            columns={[
              { key: 'ticket_no', label: '#' },
              { key: 'location', label: 'Location' },
              { key: 'status', label: 'Status', render: (r) => <span className={`badge s-${r.status}`}>{cap(r.status)}</span> },
            ]}
            rows={recentReports}
            empty="No recent reports."
          />
        </div>

        <div className="ad-card">
          <div className="ad-card-head">
            <h3>Quick Actions</h3>
          </div>
          <div className="ad-quick">
            {QUICK_ACTIONS.map(([key, icon, label, tone]) => (
              <button
                key={key}
                type="button"
                className={`ad-quick-btn ${tone}`}
                onClick={() => onNavigate(key)}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ad-row">
        <div className="ad-card">
          <div className="ad-card-head">
            <h3>Recent generated reports</h3>
            <button className="btn ghost small" type="button" onClick={() => onNavigate('reports')}>
              See All →
            </button>
          </div>
          <Table
            columns={[
              { key: 'title', label: 'Report Title' },
              { key: 'created_at', label: 'Date Generated', render: (r) => fmtDate(r.created_at) },
              {
                key: 'act',
                label: 'Action',
                render: (r) => (
                  <span className="row">
                    <button className="btn small" type="button" onClick={() => pdfReport(r)}>PDF</button>
                    <button className="btn small ghost" type="button" onClick={() => csvReport(r)}>CSV</button>
                  </span>
                ),
              },
            ]}
            rows={recentGenerated}
            empty="No reports generated yet."
          />
        </div>

        <div className="ad-card">
          <div className="ad-card-head">
            <h3>Collections in the next 7 days</h3>
          </div>
          {upcoming.length ? (
            <Table
              columns={[
                { key: 'name', label: 'Route' },
                { key: 'route_date', label: 'Date' },
                { key: 'status', label: 'Status', render: (r) => cap(r.status) },
              ]}
              rows={upcoming}
            />
          ) : (
            <p className="muted">No collections scheduled this week.</p>
          )}
        </div>
      </div>

      <div className="ad-card">
        <div className="ad-card-head">
          <h3>Drop-off hubs</h3>
        </div>
        <Table
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'address', label: 'Address', render: (r) => r.address || <span className="muted">Not set</span> },
          ]}
          rows={hubs.data?.hubs || []}
          empty="No drop-off hubs yet."
        />
      </div>

      <div className="ad-banner">
        <div>
          <h3>Reduce. Reuse. Recycle.</h3>
          <p>A sustainable future starts with us.</p>
        </div>
        <span className="ad-banner-icon">♻️</span>
      </div>
    </>
  );
}

// ==========================================
// COLLECTION SCHEDULES
// ==========================================

const REMINDER_TIMINGS = [
  ['tomorrow', 'Tomorrow'],
  ['in_2_days', 'In 2 days'],
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WASTE_TYPES = ['biodegradable', 'recyclable', 'residual', 'special'];

function Schedules() {
  const list = useLoader(() => api('/schedules'));
  const residents = useLoader(() => api('/admin/users?role=resident'));
  const blank = { zone: '', collection_day: 'Mon', time_slot: '7:00–11:00 AM', waste_type: 'biodegradable' };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const [remind, setRemind] = useState({ zone: '', timing: 'tomorrow', note: '' });
  const [remindMsg, setRemindMsg] = useState({ kind: 'info', text: '' });
  const [sending, setSending] = useState(false);

  const schedules = list.data?.schedules || [];
  const residentList = residents.data?.users || [];
  const zones = [...new Set([
    ...schedules.map((s) => s.zone),
    ...residentList.map((r) => r.barangay).filter(Boolean),
  ])].sort();
  const zoneRecipients = residentList.filter((r) => r.barangay === remind.zone && r.email);

  async function save(e) {
    e.preventDefault();
    try {
      if (editing) await api(`/schedules/${editing}`, { method: 'PUT', body: form });
      else await api('/schedules', { method: 'POST', body: form });
      setMsg({ kind: 'success', text: 'Schedule saved.' });
      setForm(blank);
      setEditing(null);
      list.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: err.message });
    }
  }

  async function remove(id) {
    if (!confirm('Delete this schedule?')) return;
    try {
      await api(`/schedules/${id}`, { method: 'DELETE' });
      list.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: err.message });
    }
  }

  async function sendReminders(e) {
    e.preventDefault();
    const timingLabel = REMINDER_TIMINGS.find(([k]) => k === remind.timing)?.[1] || remind.timing;
    if (!confirm(`Send a "${timingLabel}" pickup reminder to residents in ${remind.zone}?`)) return;

    setSending(true);
    setRemindMsg({ kind: 'info', text: '' });
    try {
      const d = await api('/schedules/remind', {
        method: 'POST',
        body: { zone: remind.zone, timing: remind.timing, note: remind.note.trim() },
      });

      if (d.message) {
        setRemindMsg({ kind: 'info', text: d.message });
      } else {
        setRemindMsg({
          kind: d.failed ? 'error' : 'success',
          text: `Sent to ${d.sent} of ${d.queued} residents${d.failed ? ` (${d.failed} failed)` : ''}.`,
        });
      }
      if (!d.failed) setRemind((r) => ({ ...r, note: '' }));
    } catch (err) {
      setRemindMsg({ kind: 'error', text: err.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid-2">
      <div className="stack">
        <Card title={editing ? 'Edit schedule' : 'Add collection schedule'}>
          <Notice kind={msg.kind}>{msg.text}</Notice>
          <form className="stack" onSubmit={save}>
            <label>
              Zone / barangay
              <input
                value={form.zone}
                onChange={(e) => setForm({ ...form, zone: e.target.value })}
                required
              />
            </label>

            <label>
              Day
              <select
                value={form.collection_day}
                onChange={(e) => setForm({ ...form, collection_day: e.target.value })}
              >
                {WEEKDAYS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>

            <label>
              Time slot
              <input
                value={form.time_slot}
                onChange={(e) => setForm({ ...form, time_slot: e.target.value })}
                required
              />
            </label>

            <label>
              Waste type
              <select
                value={form.waste_type}
                onChange={(e) => setForm({ ...form, waste_type: e.target.value })}
              >
                {WASTE_TYPES.map((w) => (
                  <option key={w} value={w}>{cap(w)}</option>
                ))}
              </select>
            </label>

            <div className="row">
              <button className="btn primary">{editing ? 'Update' : 'Add schedule'}</button>
              {editing && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => { setEditing(null); setForm(blank); }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </Card>

        <Card title="Send pickup reminder to residents">
          <Notice kind={remindMsg.kind}>{remindMsg.text}</Notice>
          <form className="stack" onSubmit={sendReminders}>
            <label>
              Zone / barangay
              <select
                value={remind.zone}
                onChange={(e) => setRemind({ ...remind, zone: e.target.value })}
                required
              >
                <option value="">Select a zone…</option>
                {zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </label>

            <label>
              When is the pickup?
              <select
                value={remind.timing}
                onChange={(e) => setRemind({ ...remind, timing: e.target.value })}
              >
                {REMINDER_TIMINGS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>

            <label>
              Additional note (optional)
              <textarea
                rows={3}
                maxLength={500}
                placeholder="e.g. Please place your bins by the gate before 7 AM."
                value={remind.note}
                onChange={(e) => setRemind({ ...remind, note: e.target.value })}
              />
            </label>

            <p className="muted">
              {remind.zone
                ? `${zoneRecipients.length} resident${zoneRecipients.length === 1 ? '' : 's'} in ${remind.zone} will receive this email reminder.`
                : 'Residents with an email in the selected zone will receive the reminder.'}
            </p>

            <button className="btn primary" disabled={sending || !remind.zone}>
              {sending ? 'Sending…' : 'Send email reminder'}
            </button>
          </form>
        </Card>
      </div>

      <Card title="All schedules">
        <Table
          columns={[
            { key: 'zone', label: 'Zone' },
            { key: 'collection_day', label: 'Day' },
            { key: 'time_slot', label: 'Time' },
            { key: 'waste_type', label: 'Type', render: (r) => cap(r.waste_type) },
            {
              key: 'act',
              label: '',
              render: (r) => (
                <span className="row">
                  <button
                    className="btn small"
                    onClick={() => {
                      setEditing(r.id);
                      setForm({
                        zone: r.zone,
                        collection_day: r.collection_day,
                        time_slot: r.time_slot,
                        waste_type: r.waste_type,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button className="btn small danger" onClick={() => remove(r.id)}>Delete</button>
                </span>
              ),
            },
          ]}
          rows={schedules}
          empty="No schedules yet."
        />
      </Card>
    </div>
  );
}

function Routes() {
  const routes = useLoader(() => api('/routes'));
  const users = useLoader(() => api('/admin/users?role=collector'));
  const residents = useLoader(() => api('/admin/users?role=resident'));
  const [form, setForm] = useState({ name: '', route_date: new Date().toISOString().slice(0, 10), collector_id: '' });
  const [stops, setStops] = useState([{ address: '', resident_id: '' }]);
  const [msg, setMsg] = useState({ kind: 'info', text: '' });

  async function create(e) {
    e.preventDefault();
    try {
      await api('/routes', { method: 'POST', body: {
        ...form, collector_id: form.collector_id || null,
        stops: stops.filter((s) => s.address.trim()).map((s) => ({ address: s.address, resident_id: s.resident_id || null })),
      } });
      setMsg({ kind: 'success', text: 'Route created.' });
      setForm({ ...form, name: '' }); setStops([{ address: '', resident_id: '' }]); routes.reload();
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }
  async function assign(routeId, collectorId) {
    try { await api(`/routes/${routeId}/assign`, { method: 'PATCH', body: { collector_id: Number(collectorId) } }); routes.reload(); }
    catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }

  return (
    <div className="grid-2">
      <Card title="Create a dispatch route">
        <Notice kind={msg.kind}>{msg.text}</Notice>
        <form className="stack" onSubmit={create}>
          <label>Route name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Date<input type="date" value={form.route_date} onChange={(e) => setForm({ ...form, route_date: e.target.value })} required /></label>
          <label>Assigned collector
            <select value={form.collector_id} onChange={(e) => setForm({ ...form, collector_id: e.target.value })}>
              <option value="">Unassigned</option>
              {(users.data?.users || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select></label>
          <h3>Stops (in order)</h3>
          {stops.map((s, i) => (
            <div className="row" key={i}>
              <input placeholder={`Stop ${i + 1} address`} value={s.address} onChange={(e) => setStops(stops.map((x, j) => j === i ? { ...x, address: e.target.value } : x))} />
              <select value={s.resident_id} onChange={(e) => setStops(stops.map((x, j) => j === i ? { ...x, resident_id: e.target.value } : x))}>
                <option value="">Resident (optional)</option>
                {(residents.data?.users || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          ))}
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setStops([...stops, { address: '', resident_id: '' }])}>+ Add stop</button>
            <button className="btn primary">Create route</button>
          </div>
        </form>
      </Card>
      <Card title="Routes & live truck status">
        {(routes.data?.routes || []).map((r) => (
          <div key={r.id} className="route-item">
            <div className="route-head">
              <strong>{r.name}</strong> <span className="muted">{r.route_date}</span>
              <span className={`badge s-${r.status}`}>{cap(r.status)}</span>
            </div>
            <div className="row">
              <select defaultValue={r.collector_id ?? ''} onChange={(e) => e.target.value && assign(r.id, e.target.value)}>
                <option value="">Unassigned</option>
                {(users.data?.users || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <span className="muted">{r.stops.filter((s) => s.status === 'completed').length}/{r.stops.length} stops</span>
              {r.truck_lat && <a href={`https://www.google.com/maps?q=${r.truck_lat},${r.truck_lng}`} target="_blank" rel="noreferrer">Truck on map</a>}
            </div>
          </div>
        ))}
        {!routes.data?.routes?.length && <p className="muted">No routes yet.</p>}
      </Card>
    </div>
  );
}

function Redemptions() {
  const list = useLoader(() => api('/redemptions'));
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  async function decide(id, decision) {
    try { await api(`/redemptions/${id}/decision`, { method: 'PATCH', body: { decision } }); list.reload(); }
    catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }
  return (
    <Card title="Reward redemptions" actions={<button className="btn ghost" onClick={list.reload}>Refresh</button>}>
      <Notice kind={msg.kind}>{msg.text}</Notice>
      <Table columns={[
        { key: 'created_at', label: 'Requested', render: (r) => fmtDate(r.created_at) },
        { key: 'resident_name', label: 'Resident' }, { key: 'reward_name', label: 'Reward' },
        { key: 'points_cost', label: 'Points' }, { key: 'certificate_code', label: 'Code' },
        { key: 'status', label: 'Status', render: (r) => <span className={`badge s-${r.status}`}>{cap(r.status)}</span> },
        { key: 'act', label: '', render: (r) => r.status === 'pending' ? (
          <span className="row"><button className="btn small" onClick={() => decide(r.id, 'approved')}>Approve</button>
            <button className="btn small danger" onClick={() => decide(r.id, 'rejected')}>Reject</button></span>) : null },
      ]} rows={list.data?.redemptions} />
    </Card>
  );
}

function Tickets() {
  const reports = useLoader(() => api('/dumping-reports'));
  const [filter, setFilter] = useState('');
  const rows = (reports.data?.reports || []).filter((r) => !filter || r.status === filter);
  async function setStatus(id, status) { await api(`/dumping-reports/${id}/status`, { method: 'PATCH', body: { status } }); reports.reload(); }
  return (
    <Card title="Illegal dumping ticket queue" actions={
      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="">All statuses</option>
        {['open', 'investigating', 'resolved', 'rejected'].map((s) => <option key={s} value={s}>{cap(s)}</option>)}
      </select>}>
      <Table columns={[
        { key: 'ticket_no', label: 'Ticket' }, { key: 'created_at', label: 'Filed', render: (r) => fmtDate(r.created_at) },
        { key: 'resident_name', label: 'Reported by' }, { key: 'location', label: 'Location' },
        { key: 'description', label: 'Details' },
        { key: 'photo_url', label: 'Photo', render: (r) => (r.photo_url ? <a href={r.photo_url} target="_blank" rel="noreferrer">View</a> : '—') },
        { key: 'status', label: 'Status', render: (r) => <span className={`badge s-${r.status}`}>{cap(r.status)}</span> },
        { key: 'act', label: 'Update', render: (r) => (
          <select value="" onChange={(e) => e.target.value && setStatus(r.id, e.target.value)}>
            <option value="">Set…</option>
            {['open', 'investigating', 'resolved', 'rejected'].filter((s) => s !== r.status).map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          </select>) },
      ]} rows={rows} empty="No tickets match this filter." />
    </Card>
  );
}

// ==========================================
// USERS & STAFF (CRUD)
// ==========================================

const ROLE_OPTIONS = [['resident', 'Resident'], ['collector', 'Collector / driver'], ['admin', 'Admin']];
const EMPTY_USER = { name: '', email: '', phone: '', barangay: '', password: '', role: 'collector' };

function Users() {
  const users = useLoader(() => api('/admin/users'));
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_USER);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [pwTarget, setPwTarget] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const [busy, setBusy] = useState(false);

  const all = users.data?.users || [];
  const q = search.trim().toLowerCase();
  const visible = all.filter((u) =>
    (!roleFilter || u.role === roleFilter) &&
    (!q || [u.name, u.email, u.eco_id, u.barangay].some((v) => String(v || '').toLowerCase().includes(q)))
  );

  async function run(fn, okText) {
    setBusy(true);
    setMsg({ kind: 'info', text: '' });
    try {
      await fn();
      setMsg({ kind: 'success', text: okText });
      users.reload();
      return true;
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Something went wrong. Please try again.' });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create(e) {
    e.preventDefault();
    const ok = await run(
      () => api('/admin/users', { method: 'POST', body: form }),
      `${cap(form.role)} account created.`
    );
    if (ok) setForm(EMPTY_USER);
  }

  function startEdit(u) {
    setEditing(u);
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      barangay: u.barangay || '',
      role: u.role,
    });
    setMsg({ kind: 'info', text: '' });
  }

  async function saveEdit(e) {
    e.preventDefault();
    const ok = await run(
      () => api(`/admin/users/${editing.id}`, { method: 'PUT', body: editForm }),
      'User updated.'
    );
    if (ok) setEditing(null);
  }

  async function savePassword(e) {
    e.preventDefault();
    const ok = await run(
      () => api(`/admin/users/${pwTarget.id}/password`, { method: 'PATCH', body: { password: newPw } }),
      `Password updated for ${pwTarget.name}.`
    );
    if (ok) { setPwTarget(null); setNewPw(''); }
  }

  async function toggleStatus(u) {
    const next = u.is_active === 0 || u.is_active === false ? 1 : 0;
    await run(
      () => api(`/admin/users/${u.id}/status`, { method: 'PATCH', body: { is_active: next } }),
      `${u.name} ${next ? 'activated' : 'deactivated'}.`
    );
  }

  async function remove(u) {
    if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    const ok = await run(
      () => api(`/admin/users/${u.id}`, { method: 'DELETE' }),
      `${u.name} deleted.`
    );
    if (ok && editing?.id === u.id) setEditing(null);
  }

  return (
    <div className="stack">
      <Notice kind={msg.kind}>{msg.text}</Notice>

      <div className="grid-2">
        <Card title="Create collector or admin account">
          <p className="muted">Residents sign up themselves. Staff accounts are created here only.</p>
          <form className="stack" onSubmit={create}>
            <label>Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="collector">Collector / driver</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label>Full name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Barangay<input value={form.barangay} onChange={(e) => setForm({ ...form, barangay: e.target.value })} /></label>
            <label>Temporary password (min. 8)
              <input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </label>
            <button className="btn primary" disabled={busy}>Create account</button>
          </form>
        </Card>

        {editing ? (
          <Card title={`Edit: ${editing.name}`}>
            <form className="stack" onSubmit={saveEdit}>
              <label>Full name<input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></label>
              <label>Email<input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required /></label>
              <label>Phone<input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></label>
              <label>Barangay<input value={editForm.barangay} onChange={(e) => setEditForm({ ...editForm, barangay: e.target.value })} /></label>
              <label>Role
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                  {ROLE_OPTIONS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </label>
              <div className="row">
                <button className="btn primary" disabled={busy}>Save changes</button>
                <button type="button" className="btn ghost" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </form>
          </Card>
        ) : pwTarget ? (
          <Card title={`Reset password: ${pwTarget.name}`}>
            <form className="stack" onSubmit={savePassword}>
              <label>New password (min. 8)
                <input type="password" minLength={8} value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
              </label>
              <div className="row">
                <button className="btn primary" disabled={busy}>Update password</button>
                <button type="button" className="btn ghost" onClick={() => { setPwTarget(null); setNewPw(''); }}>Cancel</button>
              </div>
            </form>
          </Card>
        ) : (
          <Card title="Edit or reset">
            <p className="muted">Select a user from the list to edit, reset the password, activate or deactivate, or delete.</p>
          </Card>
        )}
      </div>

      <Card
        title="All users"
        actions={
          <span className="row">
            <input placeholder="Search name, email, Eco-ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All roles</option>
              {ROLE_OPTIONS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <button className="btn ghost" onClick={users.reload}>Refresh</button>
          </span>
        }
      >
        <Table
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role', render: (r) => <span className={`badge role-${r.role}`}>{cap(r.role)}</span> },
            { key: 'eco_id', label: 'Eco-ID' },
            { key: 'barangay', label: 'Barangay' },
            {
              key: 'is_active',
              label: 'Status',
              render: (r) => (r.is_active === 0 || r.is_active === false
                ? <span className="badge s-rejected">Inactive</span>
                : <span className="badge s-approved">Active</span>),
            },
            {
              key: 'act',
              label: '',
              render: (r) => (
                <span className="row">
                  <button className="btn small" onClick={() => { setPwTarget(null); startEdit(r); }}>Edit</button>
                  <button className="btn small ghost" onClick={() => { setEditing(null); setPwTarget(r); setNewPw(''); }}>Password</button>
                  <button className="btn small ghost" onClick={() => toggleStatus(r)}>
                    {r.is_active === 0 || r.is_active === false ? 'Activate' : 'Deactivate'}
                  </button>
                  <button className="btn small danger" onClick={() => remove(r)}>Delete</button>
                </span>
              ),
            },
          ]}
          rows={visible}
          empty="No users match your search."
        />
      </Card>
    </div>
  );
}

// ==========================================
// REWARDS INVENTORY MANAGEMENT
// ==========================================

const REWARD_CATEGORIES = [
  'Eco essentials', 'Household', 'Groceries', 'Vouchers', 'School supplies', 'Plants & gardening',
];

const STATUS_LABEL = { available: 'Available', low: 'Low Stock', out: 'Out of Stock' };
const STATUS_CLASS = { available: 's-approved', low: 's-pending', out: 's-rejected' };

// Available, Low Stock, or Out of Stock based on stock quantity and minimum level
function stockStatus(r) {
  const avail = Number(r.quantity_available ?? 0);
  const min = Number(r.min_stock ?? 0);
  if (avail <= 0) return 'out';
  if (avail <= min) return 'low';
  return 'available';
}

function RewardsInventory() {
  const rewards = useLoader(() => api('/rewards'));
  const redemptions = useLoader(() => api('/redemptions'));

  const blank = {
    name: '', image_url: '', description: '', category: REWARD_CATEGORIES[0],
    points_cost: '', quantity_available: '', quantity_reserved: 0, min_stock: 5,
  };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('');

  async function uploadImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMsg({ kind: 'error', text: 'Please choose an image file (JPEG, PNG or WebP).' });
      return;
    }
    setUploading(true);
    setMsg({ kind: 'info', text: '' });
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('photo', compressed);
      const d = await api('/rewards/upload-image', { method: 'POST', body: fd });
      setForm((f) => ({ ...f, image_url: d.image_url }));
      setMsg({ kind: 'success', text: 'Image uploaded and attached to this reward.' });
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Unable to upload the image.' });
    } finally {
      setUploading(false);
    }
  }

  const list = rewards.data?.rewards || [];
  const withStatus = list.map((r) => ({ ...r, _status: stockStatus(r) }));

  const counts = {
    total: withStatus.length,
    available: withStatus.filter((r) => r._status === 'available').length,
    low: withStatus.filter((r) => r._status === 'low').length,
    out: withStatus.filter((r) => r._status === 'out').length,
    redeemed: withStatus.reduce((s, r) => s + Number(r.quantity_redeemed || 0), 0),
  };

  const lowAlerts = withStatus.filter((r) => r._status !== 'available');
  const visible = filter ? withStatus.filter((r) => r._status === filter) : withStatus;

  const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function startEdit(r) {
    setEditing(r.id);
    setForm({
      name: r.name || '',
      image_url: r.image_url || '',
      description: r.description || '',
      category: r.category || REWARD_CATEGORIES[0],
      points_cost: r.points_cost ?? '',
      quantity_available: r.quantity_available ?? '',
      quantity_reserved: r.quantity_reserved ?? 0,
      min_stock: r.min_stock ?? 5,
    });
    setMsg({ kind: 'info', text: '' });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(blank);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ kind: 'info', text: '' });

    const body = {
      name: form.name.trim(),
      image_url: form.image_url.trim() || null,
      description: form.description.trim(),
      category: form.category,
      points_cost: Number(form.points_cost),
      quantity_available: Number(form.quantity_available),
      quantity_reserved: Number(form.quantity_reserved) || 0,
      min_stock: Number(form.min_stock) || 0,
    };

    try {
      if (editing) await api(`/rewards/${editing}`, { method: 'PUT', body });
      else await api('/rewards', { method: 'POST', body });
      setMsg({ kind: 'success', text: editing ? 'Reward updated.' : 'Reward added.' });
      cancelEdit();
      rewards.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Unable to save reward.' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(r) {
    if (!confirm(`Delete "${r.name}"? It will no longer appear to residents.`)) return;
    try {
      await api(`/rewards/${r.id}`, { method: 'DELETE' });
      if (editing === r.id) cancelEdit();
      setMsg({ kind: 'success', text: `"${r.name}" deleted.` });
      rewards.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Unable to delete reward.' });
    }
  }

  const history = (redemptions.data?.redemptions || []).slice().sort((a, b) =>
    String(b.created_at).localeCompare(String(a.created_at)));

  return (
    <div className="stack">
      <div className="stats">
        {[
          ['Total rewards', counts.total],
          ['Available', counts.available],
          ['Low stock', counts.low],
          ['Out of stock', counts.out],
          ['Total redeemed', counts.redeemed],
        ].map(([k, v]) => (
          <div className="stat" key={k}>
            <span>{Number(v).toLocaleString()}</span>
            <small>{k}</small>
          </div>
        ))}
      </div>

      {rewards.loading ? (
        <p className="muted">Loading rewards…</p>
      ) : rewards.error ? (
        <Notice kind="error">{rewards.error}</Notice>
      ) : (
        lowAlerts.length > 0 && (
          <Card title="Low stock notifications">
            <div className="stack">
              {lowAlerts.map((r) => (
                <Notice key={r.id} kind={r._status === 'out' ? 'error' : 'info'}>
                  <strong>{r.name}</strong>: {r._status === 'out'
                    ? 'Out of stock. Restock or hide this reward.'
                    : `${r.quantity_available} left (minimum ${r.min_stock}).`}
                </Notice>
              ))}
            </div>
          </Card>
        )
      )}

      <div className="grid-2">
        <Card title={editing ? 'Edit reward' : 'Add new reward'}>
          <Notice kind={msg.kind}>{msg.text}</Notice>
          <form className="stack" onSubmit={save}>
            <label>Name
              <input value={form.name} onChange={setField('name')} required />
            </label>

            <label>Image
              <span className="reward-image-row">
                <input value={form.image_url} onChange={setField('image_url')} placeholder="Paste an image URL, or upload one →" />
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={uploading}
                  onClick={() => document.getElementById('reward-image-upload')?.click()}
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
                <input
                  id="reward-image-upload"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={uploadImage}
                />
              </span>
            </label>
            {form.image_url && (
              <img
                src={form.image_url}
                alt="Reward preview"
                style={{ width: '100%', maxWidth: 200, borderRadius: 12, objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}

            <label>Description
              <textarea rows={3} value={form.description} onChange={setField('description')} />
            </label>

            <label>Category
              <select value={form.category} onChange={setField('category')}>
                {REWARD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label>Points required
              <input type="number" min="0" value={form.points_cost} onChange={setField('points_cost')} required />
            </label>

            <div className="row wrap">
              <label>Available stock
                <input type="number" min="0" value={form.quantity_available} onChange={setField('quantity_available')} required />
              </label>
              <label>Reserved
                <input type="number" min="0" value={form.quantity_reserved} onChange={setField('quantity_reserved')} />
              </label>
              <label>Minimum stock (alert)
                <input type="number" min="0" value={form.min_stock} onChange={setField('min_stock')} required />
              </label>
            </div>

            <div className="row">
              <button className="btn primary" disabled={busy}>
                {busy ? 'Saving…' : editing ? 'Update reward' : 'Add reward'}
              </button>
              {editing && (
                <button type="button" className="btn ghost" onClick={cancelEdit}>Cancel</button>
              )}
            </div>
          </form>
        </Card>

        <Card title="Reward status guide">
          <div className="stack">
            <p className="muted">Status is set automatically based on available stock and minimum stock:</p>
            <div className="row"><span className="badge s-approved">Available</span><span className="muted">Above minimum</span></div>
            <div className="row"><span className="badge s-pending">Low Stock</span><span className="muted">At or below minimum</span></div>
            <div className="row"><span className="badge s-rejected">Out of Stock</span><span className="muted">No stock left</span></div>
            <p className="muted">
              Stock is reduced automatically after each successful redemption.
              It is not edited manually here.
            </p>
          </div>
        </Card>
      </div>

      <Card
        title="Rewards inventory"
        actions={
          <span className="row">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All status</option>
              <option value="available">Available</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            <button className="btn ghost" onClick={rewards.reload}>Refresh</button>
          </span>
        }
      >
        <Table
          columns={[
            { key: 'id', label: 'ID' },
            {
              key: 'image_url',
              label: 'Image',
              render: (r) => (r.image_url
                ? <img src={r.image_url} alt={r.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                : <span className="muted">—</span>),
            },
            {
              key: 'name',
              label: 'Reward',
              render: (r) => (
                <div>
                  <strong>{r.name}</strong>
                  {r.description && <div className="muted" style={{ fontSize: 12 }}>{r.description}</div>}
                </div>
              ),
            },
            { key: 'category', label: 'Category', render: (r) => r.category || '—' },
            { key: 'points_cost', label: 'Points' },
            { key: 'quantity_available', label: 'Available' },
            { key: 'quantity_reserved', label: 'Reserved', render: (r) => r.quantity_reserved ?? 0 },
            { key: 'quantity_redeemed', label: 'Redeemed', render: (r) => r.quantity_redeemed ?? 0 },
            { key: 'min_stock', label: 'Min.' },
            {
              key: '_status',
              label: 'Status',
              render: (r) => <span className={`badge ${STATUS_CLASS[r._status]}`}>{STATUS_LABEL[r._status]}</span>,
            },
            {
              key: 'act',
              label: '',
              render: (r) => (
                <span className="row">
                  <button className="btn small" onClick={() => startEdit(r)}>Edit</button>
                  <button className="btn small danger" onClick={() => remove(r)}>Delete</button>
                </span>
              ),
            },
          ]}
          rows={visible}
          empty={filter ? 'No rewards with this status.' : 'No rewards yet. Add one above.'}
        />
      </Card>

      <Card
        title="Redemption history"
        actions={<button className="btn ghost" onClick={redemptions.reload}>Refresh</button>}
      >
        <Table
          columns={[
            { key: 'created_at', label: 'Date', render: (r) => fmtDate(r.created_at) },
            { key: 'resident_name', label: 'Resident' },
            { key: 'reward_name', label: 'Reward' },
            { key: 'points_cost', label: 'Points' },
            { key: 'certificate_code', label: 'Code', render: (r) => r.certificate_code || '—' },
            {
              key: 'status',
              label: 'Status',
              render: (r) => <span className={`badge s-${r.status}`}>{cap(r.status)}</span>,
            },
          ]}
          rows={history}
          empty="No redemptions yet."
        />
      </Card>
    </div>
  );
}

// ==========================================
// REPORTS & ANALYTICS
// ==========================================

const REPORT_SECTIONS = [
  ['overview', 'Dashboard overview'],
  ['collections', 'Waste collection'],
  ['recycling', 'Recycling'],
  ['rewards', 'Rewards & redemption'],
  ['dumping', 'Illegal dumping'],
  ['collectors', 'Collector performance'],
  ['environment', 'Environmental impact'],
];

const WASTE_CATEGORY_OPTIONS = ['biodegradable', 'recyclable', 'residual', 'special'];
const STATUS_OPTIONS = ['pending', 'completed', 'missed', 'open', 'investigating', 'resolved', 'rejected', 'approved'];
const PERIODS = [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']];
const FORMATS = [['pdf', 'PDF'], ['excel', 'Excel (CSV)']];

// Assumption: share of recovered recyclables treated as diverted from landfill. Adjust to LGU data.
const DIVERSION_RATE = 0.8;

const EMPTY_FILTERS = { from: '', to: '', barangay: '', category: '', status: '', driver: '' };

// Chart colors. Picked by series or slice index.
const CHART_COLORS = ['#4a7c3a', '#3b5b9a', '#e0b93c', '#d9534f', '#8e6bbf', '#2a9d8f', '#f08a4b'];

// How each table is charted. The index matches tables[section][index].
const CHART_SPECS = {
  overview: [
    { type: 'hbar', x: 'metric', series: ['value'] },
  ],
  collections: [
    { type: 'stacked', x: 'label', series: ['completed', 'pending', 'missed'] },
  ],
  recycling: [
    { type: 'pie', x: 'material', series: ['kg'] },
    { type: 'bar', x: 'period', series: ['kg'] },
    { type: 'bar', x: 'period', series: ['kg'] },
  ],
  rewards: [
    { type: 'hbar', x: 'metric', series: ['value'] },
    { type: 'hbar', x: 'reward', series: ['claims'] },
    { type: 'bar', x: 'reward', series: ['remaining'] },
  ],
  dumping: [
    { type: 'pie', x: 'status', series: ['count'] },
    { type: 'hbar', x: 'location', series: ['incidents'] },
  ],
  collectors: [
    { type: 'stacked', x: 'driver', series: ['stops_completed', 'stops_pending', 'stops_missed'] },
  ],
  environment: [
    { type: 'hbar', x: 'metric', series: ['value'] },
    { type: 'bar', x: 'barangay', series: ['kg'] },
  ],
};

const labelOf = (key) => REPORT_SECTIONS.find(([k]) => k === key)?.[1] || key;
const dayOf = (d) => (d ? String(d).slice(0, 10) : '');
const inRange = (d, from, to) => {
  const x = dayOf(d);
  return (!from || x >= from) && (!to || x <= to);
};
const numSum = (arr, fn) => arr.reduce((s, x) => s + (Number(fn(x)) || 0), 0);
const round1 = (n) => Math.round(n * 10) / 10;
const countBy = (arr, fn) => arr.reduce((m, x) => {
  const k = fn(x) || 'Unspecified';
  m[k] = (m[k] || 0) + 1;
  return m;
}, {});
const kgBy = (arr, fn) => arr.reduce((m, x) => {
  const k = fn(x) || 'Unspecified';
  m[k] = (m[k] || 0) + (Number(x.weight_kg) || 0);
  return m;
}, {});
const topN = (obj, n = 5) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
const cols = (obj) => Object.entries(obj).map(([key, label]) => ({ key, label }));

// Date range based on the selected period
function periodRange(period) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'weekly') start.setDate(now.getDate() - 6);
  if (period === 'monthly') start.setDate(1);
  if (period === 'yearly') start.setMonth(0, 1);
  return { from: isoLocal(start), to: isoLocal(now) };
}

// Single source of all report tables: used by screen, CSV, PDF, and history
function buildTables(data, f) {
  const { drops, routes, reports, reds, rewardList, collectorList, residentList } = data;
  const nameOf = (id) => collectorList.find((c) => String(c.id) === String(id))?.name || 'Unassigned';

  const fDrops = drops.filter((d) =>
    inRange(d.created_at, f.from, f.to) &&
    (!f.barangay || d.barangay === f.barangay) &&
    (!f.category || f.category === 'recyclable'));

  const fRoutes = routes.filter((r) =>
    inRange(r.route_date, f.from, f.to) &&
    (!f.barangay || r.barangay === f.barangay) &&
    (!f.category || r.waste_type === f.category) &&
    (!f.driver || String(r.collector_id) === String(f.driver)));

  const stops = fRoutes
    .flatMap((r) => (r.stops || []).map((s) => ({
      ...s,
      barangay: r.barangay || 'Unspecified',
      driver: nameOf(r.collector_id),
    })))
    .filter((s) => !f.status || s.status === f.status);

  const fReports = reports.filter((r) =>
    inRange(r.created_at, f.from, f.to) &&
    (!f.barangay || r.barangay === f.barangay) &&
    (!f.status || r.status === f.status));

  const fReds = reds.filter((r) =>
    inRange(r.created_at, f.from, f.to) &&
    (!f.status || r.status === f.status));
  const approvedReds = fReds.filter((r) => r.status === 'approved');

  const kgTotal = numSum(fDrops, (d) => d.weight_kg);
  const completed = stops.filter((s) => s.status === 'completed').length;

  // Collections per barangay and driver
  const groups = {};
  stops.forEach((s) => {
    const k = `${s.barangay}|${s.driver}`;
    const g = groups[k] || (groups[k] = {
      label: `${s.barangay} · ${s.driver}`,
      barangay: s.barangay, driver: s.driver,
      scheduled: 0, completed: 0, pending: 0, missed: 0,
    });
    g.scheduled++;
    if (['completed', 'pending', 'missed'].includes(s.status)) g[s.status]++;
  });

  // Recycling
  const byMaterial = Object.entries(kgBy(fDrops, (d) => d.material))
    .map(([material, kg]) => ({ material: cap(material), kg: round1(kg) }));
  const byMonth = Object.entries(kgBy(fDrops, (d) => dayOf(d.created_at).slice(0, 7)))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, kg]) => ({ period, kg: round1(kg) }));
  const byYear = Object.entries(kgBy(fDrops, (d) => dayOf(d.created_at).slice(0, 4)))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, kg]) => ({ period, kg: round1(kg) }));

  // Rewards
  const pointsEarned = numSum(fDrops, (d) => d.points);
  const pointsRedeemed = numSum(approvedReds, (r) => r.points_cost);
  const topRewards = topN(countBy(approvedReds, (r) => r.reward_name))
    .map(([reward, claims]) => ({ reward, claims }));
  const stock = rewardList.map((r) => ({
    reward: r.name,
    remaining: r.remaining_quantity ?? r.stock_remaining ?? r.quantity_available ?? r.stock ?? '—',
  }));

  // Dumping
  const dumpStatus = ['open', 'investigating', 'resolved', 'rejected'].map((s) => ({
    status: cap(s),
    count: fReports.filter((r) => r.status === s).length,
  }));
  const hotspots = topN(countBy(fReports, (r) => r.location))
    .map(([location, incidents]) => ({ location, incidents }));

  // Collector performance
  const drivers = {};
  fRoutes.forEach((r) => {
    const n = nameOf(r.collector_id);
    const d = drivers[n] || (drivers[n] = {
      driver: n, routes: 0, routes_completed: 0, stops_completed: 0, stops_pending: 0, stops_missed: 0,
    });
    d.routes++;
    if (r.status === 'completed') d.routes_completed++;
  });
  stops.forEach((s) => {
    const d = drivers[s.driver];
    if (!d) return;
    if (s.status === 'completed') d.stops_completed++;
    if (s.status === 'pending') d.stops_pending++;
    if (s.status === 'missed') d.stops_missed++;
  });

  // Environmental impact
  const recovered = round1(kgTotal);
  const diverted = round1(kgTotal * DIVERSION_RATE);
  const topBarangays = topN(kgBy(fDrops, (d) => d.barangay))
    .map(([barangay, kg]) => ({ barangay, kg: round1(kg) }));

  return {
    overview: [{
      title: 'Summary',
      cols: cols({ metric: 'Metric', value: 'Value' }),
      rows: [
        { metric: 'Registered residents', value: residentList.length },
        { metric: 'Completed collection stops', value: completed },
        { metric: 'Recyclables collected (kg)', value: recovered },
        { metric: 'Illegal dumping incidents', value: fReports.length },
      ],
    }],
    collections: [{
      title: 'Collections per barangay and driver',
      cols: cols({ barangay: 'Barangay', driver: 'Driver', scheduled: 'Scheduled', completed: 'Completed', pending: 'Pending', missed: 'Missed' }),
      rows: Object.values(groups),
    }],
    recycling: [
      { title: 'By material', cols: cols({ material: 'Material', kg: 'Kg' }), rows: byMaterial },
      { title: 'Monthly', cols: cols({ period: 'Month', kg: 'Kg' }), rows: byMonth },
      { title: 'Yearly', cols: cols({ period: 'Year', kg: 'Kg' }), rows: byYear },
    ],
    rewards: [
      {
        title: 'Summary',
        cols: cols({ metric: 'Metric', value: 'Value' }),
        rows: [
          { metric: 'Points earned', value: pointsEarned },
          { metric: 'Points redeemed', value: pointsRedeemed },
          { metric: 'Successful redemptions', value: approvedReds.length },
        ],
      },
      { title: 'Most claimed rewards', cols: cols({ reward: 'Reward', claims: 'Claims' }), rows: topRewards },
      { title: 'Available stock', cols: cols({ reward: 'Reward', remaining: 'Remaining' }), rows: stock },
    ],
    dumping: [
      { title: 'By status', cols: cols({ status: 'Status', count: 'Count' }), rows: dumpStatus },
      { title: 'Locations with frequent incidents', cols: cols({ location: 'Location', incidents: 'Incidents' }), rows: hotspots },
    ],
    collectors: [{
      title: 'Driver performance',
      cols: cols({
        driver: 'Driver', routes: 'Routes', routes_completed: 'Routes completed',
        stops_completed: 'Stops completed', stops_pending: 'Stops pending', stops_missed: 'Stops missed',
      }),
      rows: Object.values(drivers),
    }],
    environment: [
      {
        title: 'Impact',
        cols: cols({ metric: 'Metric', value: 'Value' }),
        rows: [
          { metric: 'Recyclables recovered (kg)', value: recovered },
          { metric: `Estimated diverted from landfill (kg, ${DIVERSION_RATE * 100}% rate)`, value: diverted },
          { metric: 'Completed collection stops', value: completed },
        ],
      },
      { title: 'Top barangays by recyclables', cols: cols({ barangay: 'Barangay', kg: 'Kg' }), rows: topBarangays },
    ],
  };
}

// ---------- Export helpers ----------

function tablesToCsv(tables) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return tables
    .map((t) => [
      esc(t.title),
      t.cols.map((c) => esc(c.label)).join(','),
      ...t.rows.map((r) => t.cols.map((c) => esc(r[c.key])).join(',')),
    ].join('\n'))
    .join('\n\n');
}

function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// Builds a real PDF file and downloads it directly (no print dialog)
function downloadPdf(title, meta, tables, filename) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(31, 45, 31);
  doc.text(title, 40, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(85, 85, 85);
  doc.text(meta, 40, 68);

  let y = 90;

  tables.forEach((t) => {
    if (y > 740) {
      doc.addPage();
      y = 50;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(31, 45, 31);
    doc.text(t.title, 40, y);

    autoTable(doc, {
      startY: y + 8,
      head: [t.cols.map((c) => c.label)],
      body: t.rows.length
        ? t.rows.map((r) => t.cols.map((c) => String(r[c.key] ?? '')))
        : [[{ content: 'No data', colSpan: t.cols.length }]],
      styles: { fontSize: 9, cellPadding: 5, font: 'helvetica' },
      headStyles: { fillColor: [46, 122, 79], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 239] },
      margin: { left: 40, right: 40 },
      tableWidth: pageWidth - 80,
    });

    y = doc.lastAutoTable.finalY + 28;
  });

  doc.save(filename);
}

// ---------- Chart ----------

// Turns a table into a chart based on the spec. cols provides the label for each series.
function ChartView({ spec, cols: tableCols, rows }) {
  const data = rows.map((r) => {
    const o = { ...r };
    spec.series.forEach((k) => { o[k] = Number(r[k]) || 0; });
    return o;
  });

  if (!data.length) {
    return <p className="muted">No data for the chart.</p>;
  }

  const nameOf = (k) => tableCols.find((c) => c.key === k)?.label || k;

  if (spec.type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey={spec.series[0]}
            nameKey={spec.x}
            outerRadius={100}
            label
          >
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const horizontal = spec.type === 'hbar';
  const stacked = spec.type === 'stacked';
  const rotate = !horizontal && data.length > 4;
  const height = horizontal ? Math.max(240, data.length * 40 + 60) : 300;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        {horizontal ? (
          <>
            <XAxis type="number" />
            <YAxis type="category" dataKey={spec.x} width={200} tick={{ fontSize: 12 }} />
          </>
        ) : (
          <>
            <XAxis
              dataKey={spec.x}
              interval={0}
              angle={rotate ? -20 : 0}
              textAnchor={rotate ? 'end' : 'middle'}
              height={rotate ? 80 : 30}
              tick={{ fontSize: 12 }}
            />
            <YAxis allowDecimals={false} />
          </>
        )}
        <Tooltip />
        {spec.series.length > 1 && <Legend />}
        {spec.series.map((k, i) => (
          <Bar
            key={k}
            dataKey={k}
            name={nameOf(k)}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            stackId={stacked ? 'a' : undefined}
            radius={stacked ? 0 : horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------- Reports UI ----------

function ReportsHub() {
  const dropoffs = useLoader(() => api('/dropoffs'));
  const routes = useLoader(() => api('/routes'));
  const dumping = useLoader(() => api('/dumping-reports'));
  const redemptions = useLoader(() => api('/redemptions'));
  const rewards = useLoader(() => api('/rewards'));
  const residents = useLoader(() => api('/admin/users?role=resident'));
  const collectors = useLoader(() => api('/admin/users?role=collector'));
  const history = useLoader(() => api('/reports/history'));

  const [sub, setSub] = useState('overview');
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const sources = [dropoffs, routes, dumping, redemptions, rewards, residents, collectors];
  const loading = sources.some((s) => s.loading);
  const error = sources.find((s) => s.error)?.error;

  const data = {
    drops: dropoffs.data?.dropoffs || [],
    routes: routes.data?.routes || [],
    reports: dumping.data?.reports || [],
    reds: redemptions.data?.redemptions || [],
    rewardList: rewards.data?.rewards || [],
    collectorList: collectors.data?.users || [],
    residentList: residents.data?.users || [],
  };

  const tables = buildTables(data, filters);
  const barangayOptions = [...new Set(data.residentList.map((r) => r.barangay).filter(Boolean))].sort();
  const setFilter = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  function renderContent() {
    if (loading) return <p className="muted">Loading reports…</p>;
    if (error) return <Notice kind="error">{error}</Notice>;
    if (sub === 'generate') {
      return <ReportGenerate data={data} filters={filters} onSaved={history.reload} />;
    }
    if (sub === 'history') {
      return <ReportHistory history={history} />;
    }
    return tables[sub].map((t, i) => (
      <Card key={t.title} title={t.title}>
        <ChartView spec={CHART_SPECS[sub][i]} cols={t.cols} rows={t.rows} />
        <div style={{ marginTop: 16 }}>
          <Table columns={t.cols} rows={t.rows} empty="No data for the selected filters." />
        </div>
      </Card>
    ));
  }

  return (
    <>
      <Card
        title="Report filters"
        actions={(
          <button type="button" className="btn ghost small" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear filters
          </button>
        )}
      >
        <div className="reports-filters">
          <label>From<input type="date" value={filters.from} onChange={setFilter('from')} /></label>
          <label>To<input type="date" value={filters.to} onChange={setFilter('to')} /></label>
          <label>Barangay
            <select value={filters.barangay} onChange={setFilter('barangay')}>
              <option value="">All barangays</option>
              {barangayOptions.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label>Waste category
            <select value={filters.category} onChange={setFilter('category')}>
              <option value="">All categories</option>
              {WASTE_CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
            </select></label>
          <label>Status
            <select value={filters.status} onChange={setFilter('status')}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
            </select></label>
          <label>Driver
            <select value={filters.driver} onChange={setFilter('driver')}>
              <option value="">All drivers</option>
              {data.collectorList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></label>
        </div>
      </Card>

      <div className="reports-layout">
        <aside className="reports-sidebar">
          <span className="reports-sidebar-label">Reports</span>
          <nav className="reports-menu">
            {REPORT_SECTIONS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={sub === k ? 'active' : ''}
                onClick={() => setSub(k)}
              >
                {label}
              </button>
            ))}
          </nav>

          <span className="reports-sidebar-label">Tools</span>
          <nav className="reports-menu">
            <button
              type="button"
              className={sub === 'generate' ? 'active' : ''}
              onClick={() => setSub('generate')}
            >
              Generate report
            </button>
            <button
              type="button"
              className={sub === 'history' ? 'active' : ''}
              onClick={() => setSub('history')}
            >
              Report history
            </button>
          </nav>
        </aside>

        <div className="reports-content">
          {renderContent()}
        </div>
      </div>
    </>
  );
}

function ReportGenerate({ data, filters, onSaved }) {
  const [cats, setCats] = useState(REPORT_SECTIONS.map(([k]) => k));
  const [period, setPeriod] = useState('monthly');
  const [format, setFormat] = useState('pdf');
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const [busy, setBusy] = useState(false);

  function toggle(k) {
    setCats(cats.includes(k) ? cats.filter((x) => x !== k) : [...cats, k]);
  }

  async function generate() {
    if (!cats.length) {
      setMsg({ kind: 'error', text: 'Select at least one category.' });
      return;
    }

    const range = periodRange(period);
    const all = buildTables(data, { ...filters, from: range.from, to: range.to });
    const tables = cats.flatMap((k) =>
      all[k].map((t) => ({ ...t, title: `${labelOf(k)}: ${t.title}` })));
    const title = `EcoBin ${PERIODS.find(([p]) => p === period)[1]} Report`;
    const meta = `Period: ${range.from} to ${range.to}${filters.barangay ? ` · Barangay: ${filters.barangay}` : ''}`;

    try {
      if (format === 'excel') {
        downloadFile(
          `ecobin-report-${period}-${range.to}.csv`,
          '\uFEFF' + tablesToCsv(tables),
          'text/csv;charset=utf-8'
        );
      } else {
        downloadPdf(title, meta, tables, `ecobin-report-${period}-${range.to}.pdf`);
      }
    } catch (err) {
      setMsg({ kind: 'error', text: `Unable to generate the file: ${err.message}` });
      return;
    }

    setBusy(true);
    try {
      await api('/reports/history', {
        method: 'POST',
        body: {
          title, period, format, categories: cats,
          from: range.from, to: range.to, filters, tables,
        },
      });
      setMsg({ kind: 'success', text: 'Report downloaded and saved to history.' });
      onSaved?.();
    } catch (err) {
      setMsg({ kind: 'error', text: `Report downloaded but not saved to history: ${err.message}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Generate report"
      actions={(
        <span className="row">
          <button
            type="button"
            className="btn ghost small"
            onClick={() => setCats(REPORT_SECTIONS.map(([k]) => k))}
          >
            Select all
          </button>
          <button type="button" className="btn ghost small" onClick={() => setCats([])}>
            Clear
          </button>
        </span>
      )}
    >
      <Notice kind={msg.kind}>{msg.text}</Notice>

      <p className="muted">The filters above are applied to the report. The period sets the date range.</p>

      <div className="report-gen">
        <div className="report-gen-block">
          <div className="report-gen-head">
            <strong>Categories</strong>
            <span className="muted">{cats.length} of {REPORT_SECTIONS.length} selected</span>
          </div>
          <div className="report-gen-cats">
            {REPORT_SECTIONS.map(([k, label]) => (
              <label key={k} className="report-gen-cat">
                <input type="checkbox" checked={cats.includes(k)} onChange={() => toggle(k)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="report-gen-options">
          <label>Period
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select></label>
          <label>Format
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMATS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select></label>
        </div>

        <div className="report-gen-actions">
          <button className="btn primary" type="button" disabled={busy} onClick={generate}>
            {busy ? 'Saving…' : 'Generate & download'}
          </button>
        </div>
      </div>
    </Card>
  );
}

function reportDateParts(v) {
  if (!v) return { date: '—', time: '' };
  const d = new Date(String(v).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return { date: String(v), time: '' };
  return {
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
}

function reportRange(from, to) {
  if (!from || !to) return `${from || '—'} – ${to || '—'}`;
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return `${from} – ${to}`;

  const mf = f.toLocaleDateString(undefined, { month: 'short' });
  const mt = t.toLocaleDateString(undefined, { month: 'short' });
  if (f.getFullYear() === t.getFullYear()) {
    if (f.getMonth() === t.getMonth()) {
      return `${mf} ${f.getDate()}–${t.getDate()}, ${t.getFullYear()}`;
    }
    return `${mf} ${f.getDate()} – ${mt} ${t.getDate()}, ${t.getFullYear()}`;
  }
  return `${mf} ${f.getDate()}, ${f.getFullYear()} – ${mt} ${t.getDate()}, ${t.getFullYear()}`;
}

function ReportHistory({ history }) {
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const list = history.data?.reports || [];

  function pdf(r) {
    try {
      downloadPdf(r.title, `Period: ${r.from} to ${r.to}`, r.tables || [], `ecobin-report-${r.period}-${r.to}.pdf`);
    } catch (err) {
      setMsg({ kind: 'error', text: `Unable to generate PDF: ${err.message}` });
    }
  }

  function csv(r) {
    downloadFile(
      `ecobin-report-${r.period}-${r.to}.csv`,
      '\uFEFF' + tablesToCsv(r.tables || []),
      'text/csv;charset=utf-8'
    );
  }

  return (
    <Card title="Report history" actions={<button className="btn ghost small" onClick={history.reload}>Refresh</button>}>
      <Notice kind={msg.kind}>{msg.text}</Notice>
      <div className="report-history">
        <Table
          columns={[
            {
              key: 'created_at',
              label: 'Generated',
              render: (r) => {
                const { date, time } = reportDateParts(r.created_at);
                return (
                  <span className="report-date">
                    <span>{date}</span>
                    {time && <small>{time}</small>}
                  </span>
                );
              },
            },
            { key: 'title', label: 'Title' },
            { key: 'range', label: 'Range', render: (r) => <span className="report-range">{reportRange(r.from, r.to)}</span> },
            {
              key: 'format',
              label: 'Format',
              render: (r) => (
                <span className={`badge ${r.format === 'excel' ? 's-resolved' : 's-investigating'}`}>
                  {r.format === 'excel' ? 'Excel (CSV)' : 'PDF'}
                </span>
              ),
            },
            {
              key: 'act',
              label: '',
              render: (r) => (
                <span className="report-actions">
                  <button className="btn small" title="Download PDF" onClick={() => pdf(r)}>PDF</button>
                  <button className="btn small ghost" title="Download CSV" onClick={() => csv(r)}>CSV</button>
                </span>
              ),
            },
          ]}
          rows={list}
          empty="No reports generated yet."
        />
      </div>
    </Card>
  );
}