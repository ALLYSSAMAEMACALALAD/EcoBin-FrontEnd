import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../api/client.js';
import { useAuth } from '../../lib/auth.jsx';
import { Card, Notice, Table, useLoader, fmtDate, cap } from '../../components/ui.jsx';
import { compressImage } from '../../lib/image.js';
import './CollectorHome.css';

const NAV_ITEMS = [
  ['overview', '🏠', 'Collector Dashboard'],
  ['route', '📅', 'My Route'],
  ['dropoff', '♻️', 'Log Drop-off'],
  ['history', '🕘', 'Drop-off History'],
  ['tickets', '⚠️', 'Dumping Reports']
];

// ==========================================
// HELPERS
// ==========================================

function todayIso() {
  return new Date().toLocaleDateString('en-CA');
}

function isThisMonth(value) {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

// ==========================================
// COLLECTOR HOME (SHELL)
// ==========================================

export default function CollectorHome() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('overview');

  const firstName = (user?.name || '').split(' ')[0] || 'Collector';
  const initial = firstName.charAt(0).toUpperCase();
  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  const weekday = now.toLocaleDateString('en-PH', { weekday: 'long' });

  return (
    <div className="cd-shell">
      <aside className="cd-sidebar">
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
              onClick={() => setTab(key)}
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

        <div className="cd-tagline">Clean Community,<br />Greener Tomorrow</div>
      </aside>

      <main className="cd-main">
        <header className="cd-topbar">
          <div className="cd-bell" aria-label="Notifications">
            🔔
            <span className="cd-bell-dot" />
          </div>
          <div className="cd-date">
            <strong>{dateLabel}</strong>
            <span>{weekday}</span>
          </div>
        </header>

        <section className="cd-hero">
          <h1>Hello, {firstName}! 🌱</h1>
          <p>Let's keep our community clean and green today!</p>
        </section>

        {tab === 'overview' && <Overview onNavigate={setTab} />}
        {tab === 'route' && <RouteView />}
        {tab === 'dropoff' && <LogDropoff />}
        {tab === 'history' && <History />}
        {tab === 'tickets' && <Tickets />}
      </main>
    </div>
  );
}

// ==========================================
// OVERVIEW (DASHBOARD)
// ==========================================

function Overview({ onNavigate }) {
  const routes = useLoader(() => api('/routes'));
  const drops = useLoader(() => api('/dropoffs'));

  const today = todayIso();
  const todayRoutes = (routes.data?.routes || []).filter((r) => r.route_date === today);

  const rows = drops.data?.dropoffs || [];
  const monthKg = rows
    .filter((d) => isThisMonth(d.created_at))
    .reduce((sum, d) => sum + Number(d.weight_kg || 0), 0);
  const totalPts = rows.reduce((sum, d) => sum + Number(d.points || 0), 0);
  const recent = rows.slice(0, 4);
  const bars = rows.slice(0, 7).reverse();
  const maxKg = Math.max(1, ...bars.map((d) => Number(d.weight_kg) || 0));

  return (
    <>
      {routes.error && <Notice kind="error">{routes.error}</Notice>}

      <div className="cd-grid-top">
        {/* Today's schedule */}
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
                <span className="cd-big">{todayRoutes.length}</span>
                <span className="cd-unit">{todayRoutes.length === 1 ? 'Collection' : 'Collections'}</span>
              </div>
              <p className="cd-sub">
                {todayRoutes.length
                  ? todayRoutes.map((r) => r.name).join(' · ')
                  : 'Walang nakatakdang collection ngayon.'}
              </p>
            </>
          )}

          <button className="cd-btn-green" type="button" onClick={() => onNavigate('route')}>
            View Details →
          </button>
        </div>

        {/* Collection stats */}
        <div className="cd-tile">
          <div className="cd-tile-head">
            <div className="cd-tile-icon">📊</div>
            <h3 className="cd-tile-title">Collection Stats</h3>
          </div>

          <div className="cd-stats-body">
            <div>
              <div className="cd-big-row">
                <span className="cd-big">
                  {monthKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </span>
                <span className="cd-unit">kg</span>
              </div>
              <p className="cd-sub">Total recyclables this month</p>
            </div>

            <div className="cd-bars">
              {bars.length ? bars.map((d) => (
                <div
                  key={d.id ?? d.created_at}
                  className="cd-bar"
                  title={`${d.weight_kg} kg`}
                  style={{ height: `${(Number(d.weight_kg) / maxKg) * 100}%` }}
                />
              )) : <p className="cd-sub">Wala pang data.</p>}
            </div>
          </div>
        </div>

        {/* Scan QR */}
        <div className="cd-tile cd-dark">
          <div className="cd-tile-head">
            <div className="cd-tile-icon cd-tile-icon-dark">🔳</div>
            <h3 className="cd-tile-title">Scan QR</h3>
          </div>
          <p className="cd-sub">Scan resident's QR Eco-ID to log collection.</p>
          <button className="cd-btn-lime" type="button" onClick={() => onNavigate('dropoff')}>
            📷 Open Scanner
          </button>
        </div>
      </div>

      <div className="cd-grid-bottom">
        {/* Recent activities */}
        <div className="cd-tile">
          <div className="cd-tile-head">
            <div className="cd-tile-icon">🕘</div>
            <h3 className="cd-tile-title">Recent Activities</h3>
            <button className="cd-link" type="button" onClick={() => onNavigate('history')}>
              See All →
            </button>
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

        {/* Points credited */}
        <div className="cd-tile cd-points">
          <div className="cd-tile-head">
            <div className="cd-tile-icon">⭐</div>
            <h3 className="cd-tile-title">Points Credited</h3>
          </div>
          <div className="cd-big-row">
            <span className="cd-big">{totalPts.toLocaleString()}</span>
            <span className="cd-unit">pts</span>
          </div>
          <p className="cd-sub">Kabuuang points na na-credit ng residents mula sa iyong drop-offs.</p>
          <button className="cd-btn-green" type="button" onClick={() => onNavigate('history')}>
            View History →
          </button>
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

// ==========================================
// ROUTE VIEW
// ==========================================

function RouteView() {
  const routes = useLoader(() => api('/routes'));
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const [gps, setGps] = useState(false);
  const watchRef = useRef(null);

  // Patuloy na ipinapadala ang live position ng truck habang gumagalaw.
  function startSharing(routeId) {
    if (!navigator.geolocation) {
      setMsg({ kind: 'error', text: 'Hindi sinusuportahan ng browser na ito ang location.' });
      return;
    }
    if (!window.isSecureContext) {
      setMsg({ kind: 'error', text: 'Kailangang HTTPS ang site para ma-share ang location.' });
      return;
    }
    if (watchRef.current != null) return; // may tumatakbo na

    setGps(true);
    setMsg({ kind: 'info', text: '' });
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        api(`/routes/${routeId}/location`, {
          method: 'PATCH',
          body: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        })
          .then(() => routes.reload())
          .catch((e) => setMsg({ kind: 'error', text: e.message }));
      },
      (e) => {
        setMsg({ kind: 'error', text: `Location denied: ${e.message}` });
        stopSharing();
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }

  function stopSharing() {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setGps(false);
  }

  // Hihinto ang tracking kapag umalis sa page
  useEffect(() => () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
  }, []);

  async function complete(routeId, stopId) {
    try {
      const d = await api(`/routes/${routeId}/stops/${stopId}/complete`, { method: 'PATCH' });
      setMsg({ kind: 'success', text: d.route_completed ? 'All stops done. Route completed.' : 'Stop marked as collected.' });
      routes.reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e.message });
    }
  }

  if (routes.loading) return <p className="cd-sub">Loading routes…</p>;

  return (
    <>
      <Notice kind={msg.kind}>{msg.text}</Notice>
      {!routes.data?.routes?.length && (
        <Card><p className="muted">No routes assigned to you today.</p></Card>
      )}
      {(routes.data?.routes || []).map((r) => (
        <Card
          key={r.id}
          title={`${r.name} · ${r.route_date}`}
          actions={
            <>
              <span className={`badge s-${r.status}`}>{cap(r.status)}</span>
              {r.status !== 'completed' && (
                <button className="btn primary" onClick={() => (gps ? stopSharing() : startSharing(r.id))}>
                  {gps ? 'Stop sharing' : 'Share truck location'}
                </button>
              )}
            </>
          }
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
              {
                key: 'nav',
                label: 'Navigate',
                render: (s) => (s.lat
                  ? <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`} target="_blank" rel="noreferrer">Directions</a>
                  : '—')
              },
              {
                key: 'act',
                label: '',
                render: (s) => (s.status === 'pending' && r.status !== 'pending'
                  ? <button className="btn small" onClick={() => complete(r.id, s.id)}>Mark collected</button>
                  : null)
              },
            ]}
            rows={r.stops}
          />
        </Card>
      ))}
    </>
  );
}

// ==========================================
// LOG DROP-OFF (5-STEP FLOW)
// ==========================================

// Must mirror the backend config: label, unit, points per unit.
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

const STEPS = ['Identify resident', 'Recyclable details', 'Review & confirm', 'Credited'];
const STAGE_INDEX = { identify: 0, details: 1, review: 2, done: 3 };
const EMPTY_FORM = { material: 'plastic', quantity: '', hub_id: '' };

// Kinukuha ang eco-ID mula sa QR. Tinatanggap ang raw ID o URL na may ECO-XXXX sa loob.
function extractEcoId(text) {
  const m = String(text).match(/ECO-[A-Z0-9]+/i);
  return (m ? m[0] : String(text)).trim().toUpperCase();
}

// Unique reference para sa buong collection. Ito ang ginagamit na duplicate key.
function newTransactionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `TX-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
}

function Stepper({ stage }) {
  const current = STAGE_INDEX[stage];
  return (
    <ol className="dp-steps">
      {STEPS.map((label, i) => (
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
  const [stage, setStage] = useState('identify');
  const [eco, setEco] = useState('');
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
  const submittingRef = useRef(false); // guard laban sa double submit sa loob ng iisang render

  const active = MATERIAL_MAP[form.material] || MATERIAL_MAP.plastic;
  const qty = Number(form.quantity);
  const validQty = form.quantity !== '' && Number.isFinite(qty) && qty > 0;
  const estimated = validQty ? Math.round(qty * active.rate * 100) / 100 : 0;
  const hubName = (hubs.data?.hubs || []).find((h) => String(h.id) === String(form.hub_id))?.name || '—';

  function fail(text) { setMsg({ kind: 'error', text }); }
  function clearMsg() { setMsg({ kind: 'info', text: '' }); }

  // Kapag nagbago ang details, bagong transaction ID ang kailangan
  function updateForm(patch) {
    setForm((f) => ({ ...f, ...patch }));
    setTxId(null);
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview('');
    setTxId(null);
  }

  async function onPhotoPick(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // payagan ang pag-repick ng parehong file
    if (!file) return;
    // Phone cameras produce multi-megabyte photos; shrink before uploading.
    const compressed = await compressImage(file);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(compressed.type)) {
      fail('Hindi ma-read ng browser ang larawan. I-save o i-convert bilang JPEG/PNG at subukan ulit.');
      return;
    }
    if (compressed.size > 5 * 1024 * 1024) { fail('Photo must be 5 MB or smaller.'); return; }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(compressed);
    setPhotoPreview(URL.createObjectURL(compressed));
    setTxId(null); // bagong detalye, bagong transaction ID
    clearMsg();
  }

  function resetAll() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview('');
    setEco('');
    setResident(null);
    setForm(EMPTY_FORM);
    setTxId(null);
    setResult(null);
    setStage('identify');
    clearMsg();
  }

  // Step 1 at 2: kilalanin ang resident at i-verify na registered at active ang account
  async function verifyResident(raw) {
    const id = extractEcoId(raw ?? eco);
    if (!id) return;
    setBusy(true);
    clearMsg();
    try {
      const d = await api(`/dropoffs/lookup/${encodeURIComponent(id)}`);
      const r = d.resident;
      if (!r) throw new Error('Resident not found.');
      if (r.is_active === false || r.is_active === 0) {
        throw new Error('This resident account is inactive. Transaction blocked.');
      }
      setEco(id);
      setResident(r);
      setStage('details');
    } catch (e) {
      setResident(null);
      fail(e.message);
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
      async (text) => {
        if (!scannerRef.current) return; // guard laban sa sunod-sunod na scan
        await stopScanner();
        verifyResident(text);
      },
      () => {} // balewalain ang frames na walang QR
    ).catch(() => {
      fail('Hindi mabuksan ang camera. Siguraduhing may permission ka at HTTPS ang site.');
      setScanning(false);
    });
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  // Step 3: gumawa ng transaction ID at ipakita ang review; server ang nagche-check ng duplicate sa confirm.
  function goToReview(e) {
    e.preventDefault();
    if (busy) return;
    if (!validQty) {
      fail('Enter a valid quantity.');
      return;
    }
    if (!photo) {
      fail('Take a photo of the recyclables before continuing.');
      return;
    }
    clearMsg();
    setTxId(txId || newTransactionId());
    setStage('review');
  }

  // Step 5 at 6: kumpirmahin at i-credit ang points. Ang server ang nagkakalkula at nag-e-enforce ng uniqueness.
  async function confirmCollection() {
    if (submittingRef.current || !txId) return;
    submittingRef.current = true;
    setBusy(true);
    clearMsg();
    try {
      const fd = new FormData();
      fd.append('transaction_id', txId);
      fd.append('eco_id', eco);
      fd.append('material', form.material);
      fd.append('quantity', String(qty));
      fd.append('hub_id', form.hub_id || '');
      fd.append('photo', photo);

      const d = await api('/dropoffs', {
        method: 'POST',
        headers: { 'Idempotency-Key': txId },
        body: fd,
      });
      setResult({
        txId,
        points: d.points,
        balance: d.balance,
        resident: d.resident ?? resident?.name ?? eco,
      });
      setStage('done');
    } catch (err) {
      if (err.status === 409) {
        setTxId(null);
        fail('Transaction already exists! Points were not added twice. Please start a new collection.');
        setStage('details');
      } else {
        fail(err.message);
      }
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <Card title="Log a recyclable collection">
      <Stepper stage={stage} />
      <Notice kind={msg.kind}>{msg.text}</Notice>

      {/* STEP 1: Scan / identify resident */}
      {stage === 'identify' && (
        <div className="dp-stage">
          <h3>Scan the resident's QR code</h3>
          <div className="dropoff-scan-row">
            <label className="grow">
              Resident eco-ID (scan or type)
              <input
                value={eco}
                onChange={(e) => setEco(e.target.value)}
                placeholder="ECO-XXXXXXXX"
                autoComplete="off"
              />
            </label>
            <div className="dropoff-scan-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => verifyResident()}
                disabled={busy || !eco}
              >
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

      {/* STEP 2: Recyclable details */}
      {stage === 'details' && resident && (
        <form className="dropoff-form" onSubmit={goToReview}>
          <p className="notice info dropoff-resident">
            <span>Resident</span>
            <strong>{resident.name}</strong>
            <span className="dropoff-balance">Balance {resident.balance} pts</span>
          </p>

          <div className="dropoff-grid">
            <label>
              Material
              <select value={form.material} onChange={(e) => updateForm({ material: e.target.value, quantity: '' })}>
                {DROP_MATERIALS.map(([k, label, unit, rate]) => (
                  <option key={k} value={k}>
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
                onChange={(e) => updateForm({ quantity: e.target.value })}
                required
              />
            </label>

            <label className="dropoff-span-2">
              Drop-off hub
              <select value={form.hub_id} onChange={(e) => updateForm({ hub_id: e.target.value })}>
                <option value="">—</option>
                {(hubs.data?.hubs || []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
          </div>

          <div className="dropoff-preview">
            <span>{active.label} — {active.unit === 'pcs' ? '0.5 pt per piece' : `${active.rate} pts per kg`}</span>
            <strong>Estimated: {estimated.toLocaleString(undefined, { maximumFractionDigits: 2 })} pts</strong>
          </div>

          {/* Step 3 (photo): required before the collector can proceed */}
          <div className="dropoff-photo-block">
            <span className="dropoff-photo-label">Photo of the recyclables <em>(required)</em></span>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={onPhotoPick}
            />
            {!photoPreview ? (
              <button type="button" className="dropoff-photo-btn" onClick={() => photoInputRef.current?.click()}>
                <span className="dropoff-photo-icon">📷</span>
                <span className="dropoff-photo-title">Take a photo</span>
                <small>The camera opens on your phone, or pick a file</small>
              </button>
            ) : (
              <div className="dropoff-photo-preview">
                <img src={photoPreview} alt="Recyclables to be collected" />
                <div className="dropoff-photo-meta">
                  <strong>{photo?.name && photo.name.length > 42 ? `…${photo.name.slice(-42)}` : photo?.name}</strong>
                  <small>{photo ? `${Math.max(1, Math.round(photo.size / 1024))} KB · image ready` : ''}</small>
                  <button type="button" className="btn ghost small" onClick={clearPhoto}>Retake photo</button>
                </div>
              </div>
            )}
          </div>

          <div className="dropoff-actions">
            <button type="button" className="btn ghost" onClick={resetAll} disabled={busy}>Cancel</button>
            <button className="btn primary" disabled={busy || !validQty || !photo}>
              {busy ? 'Checking…' : 'Continue to review'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Review and confirm */}
      {stage === 'review' && resident && (
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
            <button type="button" className="btn ghost" onClick={() => setStage('details')} disabled={busy}>
              Edit details
            </button>
            <button type="button" className="btn primary" onClick={confirmCollection} disabled={busy}>
              {busy ? 'Crediting…' : 'Confirm & credit points'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Credited */}
      {stage === 'done' && result && (
        <div className="dp-result">
          <div className="dp-result-icon">✓</div>
          <h3>Points credited</h3>
          <p>
            {result.points} pts credited to <strong>{result.resident}</strong>.
            New balance: {result.balance} pts.
          </p>
          <div className="dp-txid">
            <span>Transaction ID</span>
            <code>{result.txId}</code>
          </div>
          <button type="button" className="btn primary" onClick={resetAll}>
            Log another collection
          </button>
        </div>
      )}
    </Card>
  );
}

// ==========================================
// DROP-OFF HISTORY
// ==========================================

function History() {
  const drops = useLoader(() => api('/dropoffs'));
  return (
    <Card title="Latest drop-offs">
      <Table
        columns={[
          { key: 'created_at', label: 'When', render: (r) => fmtDate(r.created_at) },
          { key: 'resident_name', label: 'Resident' },
          { key: 'material', label: 'Material', render: (r) => (r.unit === 'pcs' ? 'Plastic bottles' : cap(r.material)) },
          { key: 'qty', label: 'Qty', render: (r) => r.unit === 'pcs' ? `${r.quantity} pcs` : `${parseFloat(r.quantity ?? r.weight_kg)} kg` },
          { key: 'points', label: 'Points', render: (r) => Number(r.points) },
          { key: 'photo', label: 'Photo', render: (r) => (r.photo_url ? <img className="table-thumb" src={r.photo_url} alt="Recyclables" /> : '—') },
        ]}
        rows={drops.data?.dropoffs}
      />
    </Card>
  );
}

// ==========================================
// DUMPING REPORTS
// ==========================================

function Tickets() {
  const reports = useLoader(() => api('/dumping-reports'));

  async function setStatus(id, status) {
    await api(`/dumping-reports/${id}/status`, { method: 'PATCH', body: { status } });
    reports.reload();
  }

  return (
    <Card
      title="Illegal dumping tickets"
      actions={<button className="btn ghost" onClick={reports.reload}>Refresh</button>}
    >
      <Table
        columns={[
          { key: 'ticket_no', label: 'Ticket' },
          { key: 'location', label: 'Location' },
          { key: 'resident_name', label: 'Reported by' },
          { key: 'status', label: 'Status', render: (r) => <span className={`badge s-${r.status}`}>{cap(r.status)}</span> },
          {
            key: 'act',
            label: 'Update',
            render: (r) => (r.status === 'resolved' || r.status === 'rejected' ? null : (
              <select value="" onChange={(e) => e.target.value && setStatus(r.id, e.target.value)}>
                <option value="">Set status…</option>
                {r.status === 'open' && <option value="investigating">Investigating</option>}
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            )),
          },
        ]}
        rows={reports.data?.reports}
      />
    </Card>
  );
}