import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api, newIdempotencyKey } from '../../api/client.js';
import { useAuth } from '../../lib/auth.jsx';
import { Card, Notice, Table, useLoader, fmtDate, cap } from '../../components/ui.jsx';
import { compressImage } from '../../lib/image.js';
import './CollectorHome.css';

// Must mirror the backend config (app/config/eco.php 'dropoff_materials'): label, unit, points per unit.
const DROP_MATERIALS = [
  ['plastic', 'Plastic', 'kg', 10],
  ['plastic_bottle', 'Plastic bottles', 'pcs', 0.5],
  ['paper', 'Paper', 'kg', 5],
  ['cardboard', 'Cardboard & cartons', 'kg', 5],
  ['metal', 'Scrap metal', 'kg', 20],
  ['aluminum', 'Aluminum cans', 'kg', 15],
  ['glass', 'Glass', 'kg', 8],
  ['ewaste', 'E-waste', 'kg', 25],
  ['textile', 'Textiles / tela', 'kg', 4],
];
const MATERIAL_MAP = Object.fromEntries(DROP_MATERIALS.map(([k, label, unit, rate]) => [k, { label, unit, rate }]));

// Dot color per material (breakdown table)
const MATERIAL_COLORS = {
  plastic: '#4f8fdd',
  plastic_bottle: '#2ea8c7',
  paper: '#d8a94e',
  cardboard: '#b98548',
  metal: '#77808c',
  aluminum: '#9fb0bc',
  glass: '#59b19e',
  ewaste: '#a06cd5',
  textile: '#d77fb1',
};
const MaterialCell = ({ material, label }) => {
  const text = label ?? MATERIAL_MAP[material]?.label ?? cap(material);
  return (
    <span className="cd-mat">
      <span className="cd-mat-dot" style={{ background: MATERIAL_COLORS[material] || '#8b95a1' }} />
      {text}
    </span>
  );
};
const PointsCell = ({ value }) => <span className="cd-pts">{value} <small>pts</small></span>;
const STEP_LABELS = ['Identify resident', 'Recyclable details', 'Review & confirm', 'Credited'];
const STEP_INDEX = { identify: 0, details: 1, review: 2, done: 3 };
const EMPTY_FORM = { material: 'plastic', quantity: '', hub_id: '' };

const NAV_ITEMS = [
  ['overview', '🏠', 'Collector Dashboard'],
  ['route', '📅', 'My Route'],
  ['dropoff', '♻️', 'Log Drop-off'],
  ['history', '🕘', 'Drop-off History'],
  ['tickets', '⚠️', 'Dumping Reports'],
  ['analytics', '📊', 'Analytics'],
];

const todayISO = () => new Date().toLocaleDateString('en-CA');
const isThisMonth = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};
const extractEcoId = (raw) => {
  const match = String(raw).match(/ECO-[A-Z0-9]+/i);
  return (match ? match[0] : String(raw)).trim().toUpperCase();
};

export default function CollectorHome() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [navOpen, setNavOpen] = useState(false);
  const firstName = (user?.name || '').split(' ')[0] || 'Collector';
  const initial = firstName.charAt(0).toUpperCase();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  const weekday = now.toLocaleDateString('en-PH', { weekday: 'long' });

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
    <div className="cd-shell">
      <aside className={`cd-sidebar${navOpen ? ' open' : ''}`}>
        <div className="cd-brand">
          <div className="cd-brand-tile">♻️</div>
          <div className="cd-brand-name">Eco<span>Bin</span></div>
        </div>

        <div className="cd-user">
          <div className="cd-user-avatar">{initial}</div>
          <div>
            <div className="cd-user-name">{user?.name || 'Collector'}</div>
            <div className="cd-user-role">Collector</div>
          </div>
        </div>

        <nav className="cd-nav">
          {NAV_ITEMS.map(([key, icon, label]) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'active' : ''}
              onClick={() => navTo(key)}
            >
              <span className="cd-nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <button type="button" className="cd-logout" onClick={() => logout?.()}>
          <span className="cd-nav-icon">⎋</span>
          Logout
        </button>

        <div className="cd-tagline">
          Clean Community,<br />
          Greener Tomorrow
        </div>
      </aside>

      {navOpen && <div className="cd-overlay" onClick={() => setNavOpen(false)} aria-hidden="true" />}

      <main className="cd-main">
        <button type="button" className="cd-burger" onClick={() => setNavOpen(v => !v)} aria-expanded={navOpen} aria-controls="cd-drawer">
          <span aria-hidden="true">☰</span> Menu
        </button>
        <header className="cd-topbar">
          <div className="cd-bell" aria-label="Notifications">
            🔔
            <span className="cd-bell-dot" />
          </div>
          <div className="cd-date">
            <strong>{dateStr}</strong>
            <span>{weekday}</span>
          </div>
        </header>

        <section className="cd-hero">
          <h1>Hello, {firstName}! 🌱</h1>
          <p>Let's keep our community clean and green today!</p>
        </section>

        {tab === 'overview' && <Overview onNavigate={setTab} />}
        {tab === 'route' && <RoutePage />}
        {tab === 'dropoff' && <LogDropoff />}
        {tab === 'history' && <History />}
        {tab === 'tickets' && <Tickets />}
        {tab === 'analytics' && <Analytics />}
      </main>
    </div>
  );
}

function Overview({ onNavigate }) {
  const routes = useLoader(() => api('/routes'));
  const drops = useLoader(() => api('/dropoffs'));
  const today = todayISO();

  const todaysRoutes = (routes.data?.routes || []).filter((r) => r.route_date === today);
  const all = drops.data?.dropoffs || [];
  const thisMonthKg = all.filter((d) => isThisMonth(d.created_at)).reduce((sum, d) => sum + Number(d.weight_kg || 0), 0);
  const totalPoints = all.reduce((sum, d) => sum + Number(d.points || 0), 0);
  const recent = all.slice(0, 4);
  const last7 = all.slice(0, 7).reverse();
  const maxKg = Math.max(1, ...last7.map((d) => Number(d.weight_kg) || 0));

  return (
    <>
      {routes.error && <Notice kind="error">{routes.error}</Notice>}

      <div className="cd-grid-top">
        <div className="cd-tile">
          <div className="cd-tile-head">
            <div className="cd-tile-icon">📅</div>
            <h3 className="cd-tile-title">Today's Schedule</h3>
          </div>
          {routes.loading ? (
            <p className="cd-sub">Loading…</p>
          ) : (
            <>
              <div className="cd-big-row">
                <span className="cd-big">{todaysRoutes.length}</span>
                <span className="cd-unit">{todaysRoutes.length === 1 ? 'Collection' : 'Collections'}</span>
              </div>
              <p className="cd-sub">
                {todaysRoutes.length ? todaysRoutes.map((r) => r.name).join(' · ') : 'Walang nakatakdang collection ngayon.'}
              </p>
            </>
          )}
          <button className="cd-btn-green" type="button" onClick={() => onNavigate('route')}>View Details →</button>
        </div>

        <div className="cd-tile">
          <div className="cd-tile-head">
            <div className="cd-tile-icon">📊</div>
            <h3 className="cd-tile-title">Collection Stats</h3>
          </div>
          <div className="cd-stats-body">
            <div>
              <div className="cd-big-row">
                <span className="cd-big">{thisMonthKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                <span className="cd-unit">kg</span>
              </div>
              <p className="cd-sub">Total recyclables this month</p>
            </div>
            <div className="cd-bars">
              {last7.length ? last7.map((d) => (
                <div
                  className="cd-bar"
                  key={d.id ?? d.created_at}
                  title={`${d.weight_kg} kg`}
                  style={{ height: `${(Number(d.weight_kg) / maxKg) * 100}%` }}
                />
              )) : <p className="cd-sub">Wala pang data.</p>}
            </div>
          </div>
        </div>

        <div className="cd-tile cd-dark">
          <div className="cd-tile-head">
            <div className="cd-tile-icon cd-tile-icon-dark">🔳</div>
            <h3 className="cd-tile-title">Scan QR</h3>
          </div>
          <p className="cd-sub">Scan resident's QR Eco-ID to log collection.</p>
          <button className="cd-btn-lime" type="button" onClick={() => onNavigate('dropoff')}>📷 Open Scanner</button>
        </div>
      </div>

      <div className="cd-grid-bottom">
        <div className="cd-tile">
          <div className="cd-tile-head">
            <div className="cd-tile-icon">🕘</div>
            <h3 className="cd-tile-title">Recent Activities</h3>
            <button className="cd-link" type="button" onClick={() => onNavigate('history')}>See All →</button>
          </div>
          {recent.length ? (
            <ul className="cd-list">
              {recent.map((d) => (
                <li key={d.id ?? d.created_at}>
                  <div className="cd-list-icon">♻️</div>
                  <div className="cd-list-main">
                    <div className="cd-list-title">Collected {cap(d.material)}</div>
                    <div className="cd-list-sub">
                      {d.resident_name || 'Resident'} · {d.unit === 'pcs' ? `${d.quantity} pcs` : `${parseFloat(d.weight_kg)} kg`}
                    </div>
                  </div>
                  <div className="cd-list-meta">
                    {fmtDate(d.created_at)}
                    <div>
                      <span className="cd-pill">+{d.points} pts</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cd-sub">Wala pang aktibidad. Mag-log ng drop-off para makita dito.</p>
          )}
        </div>

        <div className="cd-tile cd-points">
          <div className="cd-tile-head">
            <div className="cd-tile-icon">⭐</div>
            <h3 className="cd-tile-title">Points Credited</h3>
          </div>
          <div className="cd-big-row">
            <span className="cd-big">{totalPoints.toLocaleString()}</span>
            <span className="cd-unit">pts</span>
          </div>
          <p className="cd-sub">Kabuuang points na na-credit ng residents mula sa iyong drop-offs.</p>
          <button className="cd-btn-green" type="button" onClick={() => onNavigate('history')}>View History →</button>
        </div>
      </div>

      <div className="cd-banner">
        <div>
          <h3>Together for a Greener Community</h3>
          <p>Reduce. Reuse. Recycle. 🌍</p>
        </div>
      </div>
    </>
  );
}

function RoutePage() {
  const routes = useLoader(() => api('/routes'));
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const [sharing, setSharing] = useState(false);
  const watchRef = useRef(null);

  function startSharing(routeId) {
    if (!navigator.geolocation) {
      setMsg({ kind: 'error', text: 'Hindi sinusuportahan ng browser na ito ang location.' });
      return;
    }
    if (!window.isSecureContext) {
      setMsg({ kind: 'error', text: 'Kailangang HTTPS ang site para ma-share ang location.' });
      return;
    }
    if (watchRef.current != null) return;
    setSharing(true);
    setMsg({ kind: 'info', text: '' });
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        api(`/routes/${routeId}/location`, {
          method: 'PATCH',
          body: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        }).then(() => routes.reload()).catch((err) => setMsg({ kind: 'error', text: err.message }));
      },
      (err) => {
        setMsg({ kind: 'error', text: `Location denied: ${err.message}` });
        stopSharing();
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }

  function stopSharing() {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setSharing(false);
  }

  useEffect(() => () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
  }, []);

  async function completeStop(routeId, stopId) {
    try {
      const d = await api(`/routes/${routeId}/stops/${stopId}/complete`, { method: 'PATCH' });
      setMsg({
        kind: 'success',
        text: d.route_completed ? 'All stops done. Route completed.' : 'Stop marked as collected.',
      });
      routes.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: err.message });
    }
  }

  if (routes.loading) return <p className="cd-sub">Loading routes…</p>;

  const list = routes.data?.routes || [];
  return (
    <>
      <Notice kind={msg.kind}>{msg.text}</Notice>
      {!list.length && (
        <Card>
          <p className="muted">No routes assigned to you today.</p>
        </Card>
      )}
      {list.map((r) => (
        <Card
          key={r.id}
          title={`${r.name} · ${r.route_date}`}
          actions={(
            <>
              <span className={`badge s-${r.status}`}>{cap(r.status)}</span>
              {r.status !== 'completed' && (
                <button className="btn primary" onClick={() => (sharing ? stopSharing() : startSharing(r.id))}>
                  {sharing ? 'Stop sharing' : 'Share truck location'}
                </button>
              )}
            </>
          )}
        >
          {r.truck_lat && (
            <iframe
              className="map"
              title="Truck location"
              loading="lazy"
              src={`https://www.google.com/maps?q=${r.truck_lat},${r.truck_lng}&z=15&output=embed`}
            />
          )}
          <Table
            columns={[
              { key: 'sequence_no', label: '#' },
              { key: 'address', label: 'Stop' },
              { key: 'status', label: 'Status', render: (s) => <span className={`badge s-${s.status}`}>{cap(s.status)}</span> },
              { key: 'nav', label: 'Navigate', render: (s) => (s.lat ? <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`} target="_blank" rel="noreferrer">Directions</a> : '—') },
              { key: 'act', label: '', render: (s) => (s.status === 'pending' && r.status !== 'pending'
                ? <button className="btn small" onClick={() => completeStop(r.id, s.id)}>Mark collected</button> : null) },
            ]}
            rows={r.stops}
          />
        </Card>
      ))}
    </>
  );
}

function Stepper({ stage }) {
  const current = STEP_INDEX[stage];
  return (
    <ol className="dp-steps">
      {STEP_LABELS.map((label, i) => (
        <li key={label} className={i < current ? 'done' : i === current ? 'active' : ''}>
          <span className="dp-step-dot">{i < current ? '✓' : i + 1}</span>
          <span className="dp-step-label">{label}</span>
        </li>
      ))}
    </ol>
  );
}

function LogDropoff() {
  const hubs = useLoader(() => api('/hubs'));
  const [step, setStep] = useState('identify');
  const [ecoId, setEcoId] = useState('');
  const [resident, setResident] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [txId, setTxId] = useState(null);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const photoInputRef = useRef(null);
  const scannerRef = useRef(null);
  const submitRef = useRef(false);

  const active = MATERIAL_MAP[form.material] || MATERIAL_MAP.plastic;
  const qty = Number(form.quantity);
  const qtyValid = form.quantity !== '' && Number.isFinite(qty) && qty > 0;
  const estimated = qtyValid ? Math.round(qty * active.rate * 100) / 100 : 0;
  const hubName = (hubs.data?.hubs || []).find((h) => String(h.id) === String(form.hub_id))?.name || '—';

  function error(text) { setMsg({ kind: 'error', text }); }
  function clearMsg() { setMsg({ kind: 'info', text: '' }); }
  function patch(partial) { setForm((f) => ({ ...f, ...partial })); setTxId(null); }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview('');
    setTxId(null);
  }

  async function onPhotoPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const compressed = await compressImage(file);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(compressed.type)) {
      error('Hindi ma-read ng browser ang larawan. I-save o i-convert bilang JPEG/PNG at subukan ulit.');
      return;
    }
    if (compressed.size > 5 * 1024 * 1024) { error('Photo must be 5 MB or smaller.'); return; }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(compressed);
    setPhotoPreview(URL.createObjectURL(compressed));
    setTxId(null);
    clearMsg();
  }

  function resetAll() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview('');
    setEcoId('');
    setResident(null);
    setForm(EMPTY_FORM);
    setTxId(null);
    setResult(null);
    setStep('identify');
    clearMsg();
  }

  async function lookup(raw = ecoId) {
    const id = extractEcoId(raw);
    if (!id) return;
    setBusy(true);
    clearMsg();
    try {
      const d = await api(`/dropoffs/lookup/${encodeURIComponent(id)}`);
      const r = d.resident;
      if (!r) throw new Error('Resident not found.');
      if (r.is_active === false || r.is_active === 0) throw new Error('This resident account is inactive. Transaction blocked.');
      setEcoId(id);
      setResident(r);
      setStep('details');
    } catch (err) {
      setResident(null);
      error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function stopScanner() {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try { await s.stop(); s.clear(); } catch { /* already stopped */ }
    }
    setScanning(false);
  }

  // Binubuksan ang camera kapag naka-scan mode, at sinasara kapag tapos na o umalis sa page.
  useEffect(() => {
    if (!scanning) return undefined;
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        if (scannerRef.current) {
          await stopScanner();
          lookup(decodedText);
        }
      },
      () => { /* frame had no QR */ }
    ).catch(() => {
      error('Hindi mabuksan ang camera. Siguraduhing may permission ka at HTTPS ang site.');
      setScanning(false);
    });
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  function toReview(e) {
    e.preventDefault();
    if (busy) return;
    if (!qtyValid) { error('Enter a valid quantity.'); return; }
    if (!photo) { error('Take a photo of the recyclables before continuing.'); return; }
    clearMsg();
    setTxId((prev) => prev || newIdempotencyKey());
    setStep('review');
  }

  async function submit() {
    if (submitRef.current || !txId) return;
    submitRef.current = true;
    setBusy(true);
    clearMsg();
    try {
      const fd = new FormData();
      fd.append('transaction_id', txId);
      fd.append('eco_id', ecoId);
      fd.append('material', form.material);
      fd.append('quantity', String(qty));
      fd.append('hub_id', form.hub_id || '');
      fd.append('photo', photo);

      const d = await api('/dropoffs', { method: 'POST', headers: { 'Idempotency-Key': txId }, body: fd });
      setResult({ txId, points: d.points, balance: d.balance, resident: d.resident ?? resident?.name ?? ecoId });
      setStep('done');
    } catch (err) {
      if (err.status === 409) {
        setTxId(null);
        error('Transaction already exists! Points were not added twice. Please start a new collection.');
        setStep('details');
      } else {
        error(err.message);
      }
    } finally {
      submitRef.current = false;
      setBusy(false);
    }
  }

  return (
    <Card title="Log a recyclable collection">
      <Stepper stage={step} />
      <Notice kind={msg.kind}>{msg.text}</Notice>

      {step === 'identify' && (
        <div className="dp-stage">
          <h3>Scan the resident's QR code</h3>
          <div className="dropoff-scan-row">
            <label className="grow">
              Resident eco-ID (scan or type)
              <input
                value={ecoId}
                onChange={(e) => setEcoId(e.target.value)}
                placeholder="ECO-XXXXXXXX"
                autoComplete="off"
              />
            </label>
            <div className="dropoff-scan-actions">
              <button type="button" className="btn primary" onClick={() => lookup()} disabled={busy || !ecoId}>
                {busy ? 'Verifying…' : 'Verify resident'}
              </button>
              <button type="button" className="btn ghost" onClick={() => setScanning((s) => !s)}>
                {scanning ? 'Stop scan' : 'Scan QR'}
              </button>
            </div>
          </div>
          {scanning && <div id="qr-reader" className="qr-box" />}
        </div>
      )}

      {step === 'details' && resident && (
        <form className="dropoff-form" onSubmit={toReview}>
          <p className="notice info dropoff-resident">
            <span>Resident</span>
            <strong>{resident.name}</strong>
            <span className="dropoff-balance">Balance {resident.balance} pts</span>
          </p>

          <div className="dropoff-grid">
            <label>
              Material
              <select value={form.material} onChange={(e) => patch({ material: e.target.value, quantity: '' })}>
                {DROP_MATERIALS.map(([key, label, unit, rate]) => (
                  <option key={key} value={key}>
                    {label} ({unit === 'pcs' ? `${rate} pt/piece` : `${rate} pts/kg`})
                  </option>
                ))}
              </select>
            </label>

            <label>
              {active.unit === 'pcs' ? 'How many pieces?' : 'Weight (kg)'}
              <input
                type="number"
                step={active.unit === 'pcs' ? '1' : '0.01'}
                min={active.unit === 'pcs' ? '1' : '0.01'}
                inputMode={active.unit === 'pcs' ? 'numeric' : 'decimal'}
                placeholder={active.unit === 'pcs' ? 'e.g. 24 bottles' : 'e.g. 3.5'}
                value={form.quantity}
                onChange={(e) => patch({ quantity: e.target.value })}
                required
              />
            </label>

            <label className="dropoff-span-2">
              Drop-off hub
              <select value={form.hub_id} onChange={(e) => patch({ hub_id: e.target.value })}>
                <option value="">—</option>
                {(hubs.data?.hubs || []).map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="dropoff-preview">
            <span>{active.label} — {active.unit === 'pcs' ? '0.5 pt per piece' : `${active.rate} pts per kg`}</span>
            <strong>Estimated: {estimated.toLocaleString(undefined, { maximumFractionDigits: 2 })} pts</strong>
          </div>

          <div className="dropoff-photo-block">
            <span className="dropoff-photo-label">
              Photo of the recyclables <em>(required)</em>
            </span>
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhotoPick} />
            {photoPreview ? (
              <div className="dropoff-photo-preview">
                <img src={photoPreview} alt="Recyclables to be collected" />
                <div className="dropoff-photo-meta">
                  <strong>{photo?.name && photo.name.length > 42 ? `…${photo.name.slice(-42)}` : photo?.name}</strong>
                  <small>{photo ? `${Math.max(1, Math.round(photo.size / 1024))} KB · image ready` : ''}</small>
                  <button type="button" className="btn ghost small" onClick={clearPhoto}>Retake photo</button>
                </div>
              </div>
            ) : (
              <button type="button" className="dropoff-photo-btn" onClick={() => photoInputRef.current?.click()}>
                <span className="dropoff-photo-icon">📷</span>
                <span className="dropoff-photo-title">Take a photo</span>
                <small>The camera opens on your phone, or pick a file</small>
              </button>
            )}
          </div>

          <div className="dropoff-actions">
            <button type="button" className="btn ghost" onClick={resetAll} disabled={busy}>Cancel</button>
            <button className="btn primary" disabled={busy || !qtyValid || !photo}>
              {busy ? 'Checking…' : 'Continue to review'}
            </button>
          </div>
        </form>
      )}

      {step === 'review' && resident && (
        <div className="dp-stage">
          <dl className="dp-summary">
            <div><dt>Resident</dt><dd>{resident.name}</dd></div>
            <div><dt>Material</dt><dd>{active.label}</dd></div>
            <div><dt>Quantity</dt><dd>{active.unit === 'pcs' ? `${qty} pcs` : `${qty} kg`}</dd></div>
            <div><dt>Hub</dt><dd>{hubName}</dd></div>
            <div><dt>Points to credit</dt><dd>{estimated.toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd></div>
            <div><dt>Photo</dt><dd>{photoPreview ? <img className="dp-photo-thumb" src={photoPreview} alt="Recyclables" /> : '—'}</dd></div>
          </dl>
          <div className="dp-txid">
            <span>Transaction ID</span>
            <code>{txId}</code>
          </div>
          <div className="dropoff-actions">
            <button type="button" className="btn ghost" onClick={() => setStep('details')} disabled={busy}>Edit details</button>
            <button type="button" className="btn primary" onClick={submit} disabled={busy}>
              {busy ? 'Crediting…' : 'Confirm & credit points'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="dp-result">
          <div className="dp-result-icon">✓</div>
          <h3>Points credited</h3>
          <p>
            {result.points} pts credited to <strong>{result.resident}</strong>. New balance: {result.balance} pts.
          </p>
          <div className="dp-txid">
            <span>Transaction ID</span>
            <code>{result.txId}</code>
          </div>
          <button type="button" className="btn primary" onClick={resetAll}>Log another collection</button>
        </div>
      )}
    </Card>
  );
}

function History() {
  const drops = useLoader(() => api('/dropoffs'));
  return (
    <Card title="Latest drop-offs">
      <Table
        columns={[
          { key: 'created_at', label: 'When', render: (r) => fmtDate(r.created_at) },
          { key: 'resident_name', label: 'Resident' },
          { key: 'material', label: 'Material', render: (r) => (r.unit === 'pcs' ? 'Plastic bottles' : cap(r.material)) },
          { key: 'qty', label: 'Qty', render: (r) => (r.unit === 'pcs' ? `${r.quantity} pcs` : `${parseFloat(r.quantity ?? r.weight_kg)} kg`) },
          { key: 'points', label: 'Points', render: (r) => Number(r.points) },
          { key: 'photo', label: 'Photo', render: (r) => (r.photo_url ? <img className="table-thumb" src={r.photo_url} alt="Recyclables" /> : '—') },
        ]}
        rows={drops.data?.dropoffs}
      />
    </Card>
  );
}

function Tickets() {
  const reports = useLoader(() => api('/dumping-reports'));
  async function setStatus(id, status) {
    await api(`/dumping-reports/${id}/status`, { method: 'PATCH', body: { status } });
    reports.reload();
  }
  return (
    <Card title="Illegal dumping tickets" actions={<button className="btn ghost" onClick={reports.reload}>Refresh</button>}>
      <Table
        columns={[
          { key: 'ticket_no', label: 'Ticket' },
          { key: 'location', label: 'Location' },
          { key: 'resident_name', label: 'Reported by' },
          { key: 'status', label: 'Status', render: (r) => <span className={`badge s-${r.status}`}>{cap(r.status)}</span> },
          { key: 'act', label: 'Update', render: (r) => (r.status === 'resolved' || r.status === 'rejected' ? null : (
            <select value="" onChange={(e) => e.target.value && setStatus(r.id, e.target.value)}>
              <option value="">Set status…</option>
              {r.status === 'open' && <option value="investigating">Investigating</option>}
              {r.status === 'investigating' && <option value="resolved">Resolved</option>}
              <option value="rejected">Rejected</option>
            </select>
          )) },
        ]}
        rows={reports.data?.reports}
        empty="No dumping reports yet."
      />
    </Card>
  );
}

// ==========================================
// REPORT HELPERS (catalog/export)
// ==========================================

const qtyOf = (r) => Number(r.quantity ?? r.weight_kg) || 0;
const isPcs = (r) => r.unit === 'pcs';
const pointOf = (r) => Number(r.points) || 0;
const fmtNum = (n, max = 2) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: max });

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ==========================================
// ANALYTICS (drop-off logs, filter, export)
// ==========================================

function Analytics() {
  const drops = useLoader(() => api('/dropoffs'));
  const hubs = useLoader(() => api('/hubs'));
  const today = todayISO();
  const defaultFrom = new Date(Date.now() - 13 * 864e5).toLocaleDateString('en-CA');
  const [filters, setFilters] = useState({ from: defaultFrom, to: today, material: 'all', hub_id: 'all' });

  const rows = drops.data?.dropoffs || [];
  const hubName = (id) => (hubs.data?.hubs || []).find((h) => String(h.id) === String(id))?.name || '—';

  const filtered = rows.filter((r) => {
    const d = String(r.created_at || '').slice(0, 10);
    if (filters.from && d && d < filters.from) return false;
    if (filters.to && d && d > filters.to) return false;
    if (filters.material !== 'all' && r.material !== filters.material) return false;
    if (filters.hub_id !== 'all' && String(r.hub_id ?? '') !== String(filters.hub_id)) return false;
    return true;
  });

  const totals = filtered.reduce(
    (acc, r) => {
      const qty = qtyOf(r);
      if (isPcs(r)) acc.pieces += qty; else acc.kg += qty;
      acc.points += pointOf(r);
      acc.count += 1;
      return acc;
    },
    { kg: 0, pieces: 0, points: 0, count: 0 }
  );

  const byMaterial = DROP_MATERIALS.map(([key, label]) => {
    const list = filtered.filter((r) => r.material === key);
    return {
      key,
      label,
      kg: list.filter((r) => !isPcs(r)).reduce((s, r) => s + qtyOf(r), 0),
      pieces: list.filter(isPcs).reduce((s, r) => s + qtyOf(r), 0),
      points: list.reduce((s, r) => s + pointOf(r), 0),
      count: list.length,
    };
  }).filter((m) => m.count > 0);

  const chartData = byMaterial.map((m) => ({ name: m.label.replace('Plastic bottles', 'Bottles'), points: Math.round(m.points * 100) / 100, key: m.key }));

  function exportRows() {
    return filtered.map((r) => [
      fmtDate(r.created_at),
      r.resident_name || '',
      MATERIAL_MAP[r.material]?.label || cap(r.material),
      String(qtyOf(r)),
      isPcs(r) ? 'pcs' : 'kg',
      fmtNum(pointOf(r)),
      r.hub_id ? hubName(r.hub_id) : '—',
    ]);
  }

  function csvReport() {
    const lines = [
      ['Eco-Bin Drop-off Report'],
      [`Period: ${filters.from} to ${filters.to}`],
      [],
      ['Date', 'Resident', 'Material', 'Quantity', 'Unit', 'Points', 'Hub'],
      ...exportRows(),
      [],
      ['TOTALS', `${totals.count} drop-offs`, '', `${fmtNum(totals.kg, 1)} kg + ${totals.pieces} pcs`, '', fmtNum(totals.points), ''],
    ];
    const csv = '\uFEFF' + lines.map((l) => l.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    downloadFile(`ecobin-dropoffs-${filters.from}-to-${filters.to}.csv`, csv, 'text/csv;charset=utf-8');
  }

  function pdfReport() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(23, 49, 31);
    doc.rect(0, 0, W, 64, 'F');
    doc.setTextColor(200, 240, 126);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Eco-Bin Drop-off Report', 40, 38);
    doc.setTextColor(23, 49, 31);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${filters.from} to ${filters.to}`, 40, 84);
    doc.text(`Drop-offs: ${totals.count}    Kilograms: ${fmtNum(totals.kg, 1)} kg    Pieces: ${totals.pieces}    Points: ${fmtNum(totals.points)}`, 40, 100);

    autoTable(doc, {
      startY: 116,
      head: [['Date', 'Resident', 'Material', 'Qty', 'Unit', 'Points', 'Hub']],
      body: exportRows(),
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [23, 73, 49], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 239] },
    });
    doc.save(`ecobin-dropoffs-${filters.from}-to-${filters.to}.pdf`);
  }

  return (
    <Card
      title="Drop-off analytics"
      actions={
        <div className="cd-export">
          <button className="btn ghost" type="button" onClick={csvReport}>Download CSV</button>
          <button className="btn primary" type="button" onClick={pdfReport}>Download PDF</button>
        </div>
      }
    >
      {/* Filters */}
      <div className="cd-analytics-filters">
        <label>From
          <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </label>
        <label>To
          <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </label>
        <label>Material
          <select value={filters.material} onChange={(e) => setFilters({ ...filters, material: e.target.value })}>
            <option value="all">All materials</option>
            {DROP_MATERIALS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label>Hub
          <select value={filters.hub_id} onChange={(e) => setFilters({ ...filters, hub_id: e.target.value })}>
            <option value="all">All hubs</option>
            {(hubs.data?.hubs || []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </label>
      </div>
      <p className="cd-sub" style={{ margin: 0 }}>
        {filters.from} — {filters.to} · {filtered.length} record{filtered.length === 1 ? '' : 's'}
        {' · '}
        <button type="button" className="link-like" onClick={() => setFilters({ from: defaultFrom, to: today, material: 'all', hub_id: 'all' })}>Reset filters</button>
      </p>

      {/* Summary tiles */}
      <div className="cd-grid-4">
        <div className="cd-tile">
          <h3 className="cd-tile-title">Drop-offs</h3>
          <div className="cd-big-row"><span className="cd-big">{totals.count.toLocaleString()}</span><span className="cd-unit">records</span></div>
        </div>
        <div className="cd-tile">
          <h3 className="cd-tile-title">Kilograms</h3>
          <div className="cd-big-row"><span className="cd-big">{fmtNum(totals.kg, 1)}</span><span className="cd-unit">kg</span></div>
        </div>
        <div className="cd-tile">
          <h3 className="cd-tile-title">Pieces</h3>
          <div className="cd-big-row"><span className="cd-big">{totals.pieces.toLocaleString()}</span><span className="cd-unit">pcs</span></div>
        </div>
        <div className="cd-tile">
          <h3 className="cd-tile-title">Points Credited</h3>
          <div className="cd-big-row"><span className="cd-big">{fmtNum(totals.points)}</span><span className="cd-unit">pts</span></div>
        </div>
      </div>

      {/* Chart: points by material */}
      <div className="cd-tile" style={{ marginBottom: 18 }}>
        <div className="cd-tile-head"><div className="cd-tile-icon">📊</div><h3 className="cd-tile-title">Points by material</h3></div>
        {chartData.length ? (
          <div className="cd-chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e8da" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v} pts`} />
                <Bar dataKey="points" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={MATERIAL_COLORS[entry.key] || '#2d7a4f'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="cd-sub">No records in the selected period.</p>
        )}
      </div>

      {/* Per-material breakdown table */}
      <Table
        className="cd-table"
        columns={[
          { key: 'label', label: 'Material', render: (r) => <MaterialCell material={r.key} label={r.label} /> },
          { key: 'kg', label: 'Kg', render: (r) => fmtNum(r.kg, 1) },
          { key: 'pieces', label: 'Pcs', render: (r) => r.pieces.toLocaleString() },
          { key: 'points', label: 'Points', render: (r) => <PointsCell value={fmtNum(r.points)} /> },
          { key: 'count', label: 'Drop-offs' },
        ]}
        rows={byMaterial}
        empty="No material data for this period."
      />

      <h3 style={{ marginTop: 18 }}>Drop-off records</h3>
      <Table
        className="cd-table"
        columns={[
          { key: 'created_at', label: 'When', render: (r) => fmtDate(r.created_at) },
          { key: 'resident_name', label: 'Resident' },
          { key: 'material', label: 'Material', render: (r) => <MaterialCell material={r.material} /> },
          { key: 'qty', label: 'Qty', render: (r) => (r.unit === 'pcs' ? `${r.quantity} pcs` : `${parseFloat(r.quantity ?? r.weight_kg)} kg`) },
          { key: 'points', label: 'Points', render: (r) => <PointsCell value={fmtNum(pointOf(r))} /> },
          { key: 'hub', label: 'Hub', render: (r) => (r.hub_id ? hubName(r.hub_id) : <span className="muted">—</span>) },
        ]}
        rows={filtered}
        empty="No drop-offs in the selected period."
      />
    </Card>
  );
}
