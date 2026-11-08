import { useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { api } from '../../api/client.js';
import { Card, Notice, Table, useLoader, fmtDate, cap } from '../../components/ui.jsx';
import PageHero from '../../components/PageHero.jsx';

const TABS = [
  ['dashboard', 'Dashboard'], ['schedules', 'Schedules'], ['routes', 'Routes & dispatch'],
  ['redemptions', 'Redemptions'], ['tickets', 'Dumping tickets'], ['users', 'Users & staff'],
  ['inventory', 'Rewards inventory'], ['reports', 'Reports & analytics'],
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
      {tab === 'inventory' && <RewardsInventory />}
      {tab === 'reports' && <ReportsHub />}
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

// ==========================================
// REWARDS INVENTORY MANAGEMENT
// ==========================================

const REWARD_CATEGORIES = [
  'Eco essentials', 'Household', 'Groceries', 'Vouchers', 'School supplies', 'Plants & gardening',
];

const STATUS_LABEL = { available: 'Available', low: 'Low Stock', out: 'Out of Stock' };
const STATUS_CLASS = { available: 's-approved', low: 's-pending', out: 's-rejected' };

// Available, Low Stock, o Out of Stock base sa dami ng stock at minimum level
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
  const [filter, setFilter] = useState('');

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
    if (!confirm(`Delete "${r.name}"? Hindi na ito lalabas sa mga resident.`)) return;
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
                    ? 'Out of stock. Mag-restock o i-hide ang reward.'
                    : `${r.quantity_available} na lang (minimum ${r.min_stock}).`}
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

            <label>Image URL
              <input value={form.image_url} onChange={setField('image_url')} placeholder="https://…" />
            </label>
            {form.image_url && (
              <img
                src={form.image_url}
                alt="Preview ng reward"
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
            <p className="muted">Awtomatikong nakukuha ang status base sa available stock at minimum stock:</p>
            <div className="row"><span className="badge s-approved">Available</span><span className="muted">Mas mataas sa minimum</span></div>
            <div className="row"><span className="badge s-pending">Low Stock</span><span className="muted">Katumbas o mas mababa sa minimum</span></div>
            <div className="row"><span className="badge s-rejected">Out of Stock</span><span className="muted">Wala nang stock</span></div>
            <p className="muted">
              Awtomatikong binabawasan ng system ang stock tuwing may successful redemption.
              Hindi ito binabago nang manu-mano dito.
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
          empty={filter ? 'Walang rewards sa status na ito.' : 'Wala pang rewards. Mag-add ng bago sa itaas.'}
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
          empty="Wala pang redemption."
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

// Assumption: bahagi ng recovered recyclables na itinuturing na na-divert sa landfill. Ayusin ayon sa datos ng LGU.
const DIVERSION_RATE = 0.8;

const EMPTY_FILTERS = { from: '', to: '', barangay: '', category: '', status: '', driver: '' };

// Kulay ng mga chart. Pumipili ayon sa index ng series o slice.
const CHART_COLORS = ['#4a7c3a', '#3b5b9a', '#e0b93c', '#d9534f', '#8e6bbf', '#2a9d8f', '#f08a4b'];

// Paano i-chart ang bawat table sa section. Ang index ay tumutugma sa tables[section][index].
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

// Tinutukoy ang date range base sa napiling period
function periodRange(period) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'weekly') start.setDate(now.getDate() - 6);
  if (period === 'monthly') start.setDate(1);
  if (period === 'yearly') start.setMonth(0, 1);
  return { from: isoLocal(start), to: isoLocal(now) };
}

// Iisang pinagmumulan ng lahat ng report tables: ginagamit ng screen, CSV, PDF, at history
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

  // Collections per barangay at driver
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

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

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

// Nagbubukas ng printable page; sa print dialog, piliin ang "Save as PDF"
function openPrintable(title, meta, tables) {
  const w = window.open('', '_blank');
  if (!w) return false;
  const body = tables.map((t) => `
    <h2>${escapeHtml(t.title)}</h2>
    <table>
      <thead><tr>${t.cols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
      <tbody>${t.rows.length
        ? t.rows.map((r) => `<tr>${t.cols.map((c) => `<td>${escapeHtml(r[c.key])}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${t.cols.length}">No data</td></tr>`}</tbody>
    </table>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#1f2d1f}
      h1{font-size:20px;margin-bottom:4px} p.meta{color:#555;font-size:12px}
      h2{font-size:15px;margin-top:24px}
      table{border-collapse:collapse;width:100%;font-size:12px;margin-top:6px}
      th,td{border:1px solid #bbb;padding:6px;text-align:left}
      th{background:#eef5e6}
    </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">${escapeHtml(meta)}</p>
    ${body}
    <script>window.onload=()=>window.print();<\/script>
  </body></html>`);
  w.document.close();
  return true;
}

// ---------- Chart ----------

// Ginagawang chart ang isang table ayon sa spec. Ang "cols" ang nagbibigay ng label ng bawat series.
function ChartView({ spec, cols: tableCols, rows }) {
  const data = rows.map((r) => {
    const o = { ...r };
    spec.series.forEach((k) => { o[k] = Number(r[k]) || 0; });
    return o;
  });

  if (!data.length) {
    return <p className="muted">Walang datos para sa chart.</p>;
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
      <Card title="Report filters">
        <div className="row wrap">
          <label>From<input type="date" value={filters.from} onChange={setFilter('from')} /></label>
          <label>To<input type="date" value={filters.to} onChange={setFilter('to')} /></label>
          <label>Barangay<input value={filters.barangay} onChange={setFilter('barangay')} placeholder="All" /></label>
          <label>Waste category
            <select value={filters.category} onChange={setFilter('category')}>
              <option value="">All</option>
              {WASTE_CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
            </select></label>
          <label>Status
            <select value={filters.status} onChange={setFilter('status')}>
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
            </select></label>
          <label>Driver
            <select value={filters.driver} onChange={setFilter('driver')}>
              <option value="">All drivers</option>
              {data.collectorList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></label>
          <button type="button" className="btn ghost" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>
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
      setMsg({ kind: 'error', text: 'Pumili ng kahit isang category.' });
      return;
    }

    const range = periodRange(period);
    const all = buildTables(data, { ...filters, from: range.from, to: range.to });
    const tables = cats.flatMap((k) =>
      all[k].map((t) => ({ ...t, title: `${labelOf(k)}: ${t.title}` })));
    const title = `EcoBin ${PERIODS.find(([p]) => p === period)[1]} Report`;
    const meta = `Period: ${range.from} to ${range.to}${filters.barangay ? ` · Barangay: ${filters.barangay}` : ''}`;

    if (format === 'excel') {
      downloadFile(
        `ecobin-report-${period}-${range.to}.csv`,
        '\uFEFF' + tablesToCsv(tables),
        'text/csv;charset=utf-8'
      );
    } else if (!openPrintable(title, meta, tables)) {
      setMsg({ kind: 'error', text: 'Pinigilan ng browser ang popup. Payagan ito at subukan muli.' });
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
      setMsg({ kind: 'success', text: 'Na-generate ang report at na-save sa history.' });
      onSaved?.();
    } catch (err) {
      setMsg({ kind: 'error', text: `Na-generate ang report pero hindi na-save sa history: ${err.message}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Generate report">
      <Notice kind={msg.kind}>{msg.text}</Notice>

      <p className="muted">Ang mga filter sa itaas ay ginagamit sa report. Ang period ang nagtatakda ng date range.</p>

      <div className="stack">
        <span>Categories</span>
        <div className="row wrap">
          {REPORT_SECTIONS.map(([k, label]) => (
            <label key={k} className="row">
              <input type="checkbox" checked={cats.includes(k)} onChange={() => toggle(k)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="row wrap">
        <label>Period
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select></label>
        <label>Format
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            {FORMATS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select></label>
      </div>

      <button className="btn primary" type="button" disabled={busy} onClick={generate}>
        {busy ? 'Saving…' : 'Generate report'}
      </button>
    </Card>
  );
}

function ReportHistory({ history }) {
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const list = history.data?.reports || [];

  function view(r) {
    if (!openPrintable(r.title, `Period: ${r.from} to ${r.to}`, r.tables || [])) {
      setMsg({ kind: 'error', text: 'Pinigilan ng browser ang popup.' });
    }
  }

  function download(r) {
    downloadFile(
      `ecobin-report-${r.period}-${r.to}.csv`,
      '\uFEFF' + tablesToCsv(r.tables || []),
      'text/csv;charset=utf-8'
    );
  }

  return (
    <Card title="Report history" actions={<button className="btn ghost" onClick={history.reload}>Refresh</button>}>
      <Notice kind={msg.kind}>{msg.text}</Notice>
      <Table
        columns={[
          { key: 'created_at', label: 'Generated', render: (r) => fmtDate(r.created_at) },
          { key: 'title', label: 'Title' },
          { key: 'range', label: 'Range', render: (r) => `${r.from} to ${r.to}` },
          { key: 'format', label: 'Format', render: (r) => (r.format === 'excel' ? 'Excel (CSV)' : 'PDF') },
          { key: 'act', label: '', render: (r) => (
            <span className="row">
              <button className="btn small" onClick={() => view(r)}>View / PDF</button>
              <button className="btn small ghost" onClick={() => download(r)}>Download CSV</button>
            </span>) },
        ]}
        rows={list}
        empty="No reports generated yet."
      />
    </Card>
  );
}