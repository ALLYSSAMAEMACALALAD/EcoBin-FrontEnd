import { useState } from 'react';
import { api } from '../../api/client.js';
import { Card, Notice, Table, useLoader, fmtDate, cap } from '../../components/ui.jsx';
import PageHero from '../../components/PageHero.jsx';

const TABS = [
  ['dashboard', 'Dashboard'], ['schedules', 'Schedules'], ['routes', 'Routes & dispatch'],
  ['redemptions', 'Redemptions'], ['tickets', 'Dumping tickets'], ['users', 'Users & staff'], ['audit', 'Audit log'],
];

export default function AdminHome() {
  const [tab, setTab] = useState('dashboard');
  return (
    <>
      <PageHero eyebrow="Admin console" title="Admin dashboard" text="Schedules, dispatch, rewards, dumping tickets, and staff accounts." />
      <nav className="tabs wrap">
        {TABS.map(([k, label]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{label}</button>)}
      </nav>
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'schedules' && <Schedules />}
      {tab === 'routes' && <Routes />}
      {tab === 'redemptions' && <Redemptions />}
      {tab === 'tickets' && <Tickets />}
      {tab === 'users' && <Users />}
      {tab === 'audit' && <Audit />}
    </>
  );
}

// Kinukuha ang count ng isang status mula sa analytics rows
const countOf = (rows = [], status) => Number(rows.find((r) => r.status === status)?.n || 0);

// Format ng petsa bilang YYYY-MM-DD gamit ang local time
const isoLocal = (d) => d.toLocaleDateString('en-CA');

function Dashboard() {
  const a = useLoader(() => api('/analytics'));
  const reports = useLoader(() => api('/dumping-reports'));
  const routes = useLoader(() => api('/routes'));
  const hubs = useLoader(() => api('/hubs'));

  if (a.loading) return <p className="muted">Loading…</p>;
  if (a.error) return <Notice kind="error">{a.error}</Notice>;

  const t = a.data.totals;
  const dumping = a.data.dumping_by_status;
  const redemptions = a.data.redemptions_by_status;

  const stats = [
    ['Open reports', countOf(dumping, 'open')],
    ['In progress', countOf(dumping, 'investigating')],
    ['Pending redemptions', countOf(redemptions, 'pending')],
    ['Residents', t.residents],
    ['Points awarded', t.points_issued],
  ];
  const resolved = countOf(dumping, 'resolved');

  const recent = (reports.data?.reports || []).slice(0, 5);

  const today = new Date();
  const weekEnd = new Date();
  weekEnd.setDate(today.getDate() + 7);
  const startStr = isoLocal(today);
  const endStr = isoLocal(weekEnd);
  const upcoming = (routes.data?.routes || []).filter((r) => r.route_date >= startStr && r.route_date <= endStr);

  return (
    <>
      <div className="stats">
        {stats.map(([k, v]) => (
          <div className="stat" key={k}>
            <span>{Number(v).toLocaleString()}</span>
            <small>{k}</small>
          </div>
        ))}
      </div>
      <div className="stats stats-second">
        <div className="stat">
          <span>{resolved.toLocaleString()}</span>
          <small>Resolved reports</small>
        </div>
      </div>

      <div className="grid-2">
        <Card title="Recent dumping reports">
          <Table columns={[
            { key: 'ticket_no', label: '#' },
            { key: 'location', label: 'Location' },
            { key: 'status', label: 'Status', render: (r) => <span className={`badge s-${r.status}`}>{cap(r.status)}</span> },
          ]} rows={recent} empty="No recent reports." />
        </Card>
        <Card title="Collections in the next 7 days">
          {upcoming.length ? (
            <Table columns={[
              { key: 'name', label: 'Route' },
              { key: 'route_date', label: 'Date' },
              { key: 'status', label: 'Status', render: (r) => cap(r.status) },
            ]} rows={upcoming} />
          ) : <p className="muted">No collections scheduled this week.</p>}
        </Card>
      </div>

      <div className="points-section">
        <Card title="Drop-off hubs">
          <Table columns={[
            { key: 'name', label: 'Name' },
            { key: 'address', label: 'Address', render: (r) => r.address || <span className="muted">Not set</span> },
          ]} rows={hubs.data?.hubs || []} empty="No drop-off hubs yet." />
        </Card>
      </div>
    </>
  );
}

function Schedules() {
  const list = useLoader(() => api('/schedules'));
  const blank = { zone: '', collection_day: 'Mon', time_slot: '7:00–11:00 AM', waste_type: 'biodegradable' };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const [remind, setRemind] = useState({ zone: '', when: 'tomorrow' });

  async function save(e) {
    e.preventDefault();
    try {
      if (editing) await api(`/schedules/${editing}`, { method: 'PUT', body: form });
      else await api('/schedules', { method: 'POST', body: form });
      setMsg({ kind: 'success', text: 'Schedule saved.' });
      setForm(blank); setEditing(null); list.reload();
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }
  async function remove(id) {
    if (!confirm('Delete this schedule?')) return;
    await api(`/schedules/${id}`, { method: 'DELETE' }); list.reload();
  }
  async function sendReminders(e) {
    e.preventDefault();
    try {
      const d = await api('/schedules/remind', { method: 'POST', body: remind });
      setMsg({ kind: 'success', text: `Reminders queued for ${d.queued} residents.` });
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }

  return (
    <div className="grid-2">
      <Card title={editing ? 'Edit schedule' : 'Add collection schedule'}>
        <Notice kind={msg.kind}>{msg.text}</Notice>
        <form className="stack" onSubmit={save}>
          <label>Zone / barangay<input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} required /></label>
          <label>Day<select value={form.collection_day} onChange={(e) => setForm({ ...form, collection_day: e.target.value })}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <option key={d}>{d}</option>)}</select></label>
          <label>Time slot<input value={form.time_slot} onChange={(e) => setForm({ ...form, time_slot: e.target.value })} required /></label>
          <label>Waste type<select value={form.waste_type} onChange={(e) => setForm({ ...form, waste_type: e.target.value })}>
            {['biodegradable', 'recyclable', 'residual', 'special'].map((w) => <option key={w} value={w}>{cap(w)}</option>)}</select></label>
          <div className="row"><button className="btn primary">{editing ? 'Update' : 'Add schedule'}</button>
            {editing && <button type="button" className="btn ghost" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}</div>
        </form>
        <h3>Send SMS / email reminders</h3>
        <form className="row" onSubmit={sendReminders}>
          <input placeholder="Zone" value={remind.zone} onChange={(e) => setRemind({ ...remind, zone: e.target.value })} required />
          <input placeholder="When (e.g. tomorrow)" value={remind.when} onChange={(e) => setRemind({ ...remind, when: e.target.value })} />
          <button className="btn">Send</button>
        </form>
      </Card>
      <Card title="All schedules">
        <Table columns={[
          { key: 'zone', label: 'Zone' }, { key: 'collection_day', label: 'Day' }, { key: 'time_slot', label: 'Time' },
          { key: 'waste_type', label: 'Type', render: (r) => cap(r.waste_type) },
          { key: 'act', label: '', render: (r) => (<span className="row">
            <button className="btn small" onClick={() => { setEditing(r.id); setForm({ zone: r.zone, collection_day: r.collection_day, time_slot: r.time_slot, waste_type: r.waste_type }); }}>Edit</button>
            <button className="btn small danger" onClick={() => remove(r.id)}>Delete</button></span>) },
        ]} rows={list.data?.schedules} />
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

function Users() {
  const users = useLoader(() => api('/admin/users'));
  const blank = { name: '', email: '', phone: '', barangay: '', password: '', role: 'collector' };
  const [form, setForm] = useState(blank);
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  async function create(e) {
    e.preventDefault();
    try {
      await api('/admin/users', { method: 'POST', body: form });
      setMsg({ kind: 'success', text: `${cap(form.role)} account created.` });
      setForm(blank); users.reload();
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }
  return (
    <div className="grid-2">
      <Card title="Create collector or admin account">
        <p className="muted">Residents sign up themselves. Staff accounts are created here only.</p>
        <Notice kind={msg.kind}>{msg.text}</Notice>
        <form className="stack" onSubmit={create}>
          <label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="collector">Collector / driver</option><option value="admin">Admin</option></select></label>
          <label>Full name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Temporary password (min. 8)<input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
          <button className="btn primary">Create account</button>
        </form>
      </Card>
      <Card title="All users" actions={<button className="btn ghost" onClick={users.reload}>Refresh</button>}>
        <Table columns={[
          { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (r) => <span className={`badge role-${r.role}`}>{cap(r.role)}</span> },
          { key: 'eco_id', label: 'Eco-ID' }, { key: 'barangay', label: 'Barangay' },
        ]} rows={users.data?.users} />
      </Card>
    </div>
  );
}

function Audit() {
  const logs = useLoader(() => api('/admin/audit-logs'));
  return (
    <Card title="Audit log (latest 200)" actions={<button className="btn ghost" onClick={logs.reload}>Refresh</button>}>
      <Table columns={[
        { key: 'created_at', label: 'When', render: (r) => fmtDate(r.created_at) },
        { key: 'user_name', label: 'User', render: (r) => r.user_name || 'System' },
        { key: 'action', label: 'Action', render: (r) => cap(r.action) },
        { key: 'target', label: 'Target' }, { key: 'details', label: 'Details' },
      ]} rows={logs.data?.logs} />
    </Card>
  );
}