import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api, newIdempotencyKey } from '../../api/client.js';
import { useAuth } from '../../lib/auth.jsx';
import { Card, Notice, Table, useLoader, fmtDate, cap } from '../../components/ui.jsx';
import PageHero from '../../components/PageHero.jsx';

export default function CollectorHome() {
  const { user } = useAuth();
  const [tab, setTab] = useState('route');
  return (
    <>
      <PageHero eyebrow="Collector dashboard" title={`Dispatch, ${user.name}`} text="Your routes, live truck location, drop-off logging, and dumping tickets." />
      <nav className="tabs">
        <button className={tab === 'route' ? 'active' : ''} onClick={() => setTab('route')}>My route</button>
        <button className={tab === 'dropoff' ? 'active' : ''} onClick={() => setTab('dropoff')}>Log drop-off</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Drop-off history</button>
        <button className={tab === 'tickets' ? 'active' : ''} onClick={() => setTab('tickets')}>Dumping reports</button>
      </nav>
      {tab === 'route' && <RouteView />}
      {tab === 'dropoff' && <LogDropoff />}
      {tab === 'history' && <History />}
      {tab === 'tickets' && <Tickets />}
    </>
  );
}

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
    } catch (e) { setMsg({ kind: 'error', text: e.message }); }
  }

  if (routes.loading) return <p className="muted">Loading routes…</p>;
  return (
    <>
      <Notice kind={msg.kind}>{msg.text}</Notice>
      {!routes.data?.routes?.length && <Card><p className="muted">No routes assigned to you today.</p></Card>}
      {(routes.data?.routes || []).map((r) => (
        <Card key={r.id} title={`${r.name} · ${r.route_date}`}
          actions={<>
            <span className={`badge s-${r.status}`}>{cap(r.status)}</span>
            {r.status !== 'completed' && (
              <button className="btn primary" onClick={() => (gps ? stopSharing() : startSharing(r.id))}>
                {gps ? 'Stop sharing' : 'Share truck location'}
              </button>
            )}
          </>}>
          {r.truck_lat && (
            <iframe className="map" title="Truck location" loading="lazy"
              src={`https://www.google.com/maps?q=${r.truck_lat},${r.truck_lng}&z=15&output=embed`} />
          )}
          <Table
            columns={[
              { key: 'sequence_no', label: '#' },
              { key: 'address', label: 'Stop' },
              { key: 'status', label: 'Status', render: (s) => <span className={`badge s-${s.status}`}>{cap(s.status)}</span> },
              { key: 'nav', label: 'Navigate', render: (s) => (s.lat ? <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`} target="_blank" rel="noreferrer">Directions</a> : '—') },
              { key: 'act', label: '', render: (s) => (s.status === 'pending' && r.status !== 'pending'
                ? <button className="btn small" onClick={() => complete(r.id, s.id)}>Mark collected</button> : null) },
            ]}
            rows={r.stops}
          />
        </Card>
      ))}
    </>
  );
}

// Kinukuha ang eco-ID mula sa QR. Tinatanggap ang raw ID o URL na may ECO-XXXX sa loob.
function extractEcoId(text) {
  const m = String(text).match(/ECO-[A-Z0-9]+/i);
  return (m ? m[0] : String(text)).trim().toUpperCase();
}

function LogDropoff() {
  const hubs = useLoader(() => api('/hubs'));
  const [form, setForm] = useState({ eco_id: '', material: 'plastic', weight_kg: '', hub_id: '' });
  const [resident, setResident] = useState(null);
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);

  async function lookup(raw = form.eco_id) {
    const id = extractEcoId(raw);
    if (!id) return;
    setMsg({ kind: 'info', text: '' });
    try {
      const d = await api(`/dropoffs/lookup/${encodeURIComponent(id)}`);
      setResident(d.resident);
      setForm((f) => ({ ...f, eco_id: id }));
    } catch (e) { setResident(null); setMsg({ kind: 'error', text: e.message }); }
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
        const id = extractEcoId(text);
        setForm((f) => ({ ...f, eco_id: id }));
        lookup(id);
      },
      () => {} // balewalain ang frames na walang QR
    ).catch((e) => {
      setMsg({ kind: 'error', text: `Hindi mabuksan ang camera. Siguraduhing may permission ka at HTTPS ang site. (${e})` });
      setScanning(false);
    });
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg({ kind: 'info', text: '' });
    try {
      // One key per submission attempt: a double-click or network retry reuses the key and cannot double-credit.
      const key = form.idemKey || newIdempotencyKey();
      setForm((f) => ({ ...f, idemKey: key }));
      const d = await api('/dropoffs', { method: 'POST', body: { ...form, weight_kg: Number(form.weight_kg) }, headers: { 'Idempotency-Key': key } });
      setMsg({ kind: 'success', text: `Credited ${d.points} points to ${d.resident}. New balance: ${d.balance}.` });
      setForm({ eco_id: '', material: 'plastic', weight_kg: '', hub_id: '' }); setResident(null);
    } catch (err) {
      if (err.status === 409) setMsg({ kind: 'error', text: 'This drop-off was already credited. No points were added twice.' });
      else setMsg({ kind: 'error', text: err.message });
    } finally { setBusy(false); }
  }

  return (
    <Card title="Log a recyclable drop-off">
      <Notice kind={msg.kind}>{msg.text}</Notice>

      <div className="row">
        <label className="grow">Resident eco-ID (scan or type)
          <input value={form.eco_id} onChange={(e) => setForm({ ...form, eco_id: e.target.value })} placeholder="ECO-XXXXXXXX" />
        </label>
        <button type="button" className="btn ghost" onClick={() => lookup()} disabled={!form.eco_id}>Look up</button>
        <button type="button" className="btn ghost" onClick={() => setScanning((s) => !s)}>
          {scanning ? 'Stop scan' : 'Scan QR'}
        </button>
      </div>

      {scanning && <div id="qr-reader" className="qr-box" />}

      {resident && <p className="notice info">Resident: <strong>{resident.name}</strong> · balance {resident.balance} pts</p>}

      <form className="stack" onSubmit={submit}>
        <label>Material
          <select value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })}>
            <option value="plastic">Plastic (10 pts/kg)</option><option value="paper">Paper (5 pts/kg)</option>
            <option value="metal">Metal (20 pts/kg)</option><option value="glass">Glass (8 pts/kg)</option>
          </select>
        </label>
        <label>Weight (kg)<input type="number" step="0.01" min="0.01" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} required /></label>
        <label>Drop-off hub
          <select value={form.hub_id} onChange={(e) => setForm({ ...form, hub_id: e.target.value })}>
            <option value="">—</option>
            {(hubs.data?.hubs || []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </label>
        <button className="btn primary" disabled={busy || !form.eco_id}>{busy ? 'Crediting…' : 'Credit points'}</button>
      </form>
    </Card>
  );
}

function History() {
  const drops = useLoader(() => api('/dropoffs'));
  return (
    <Card title="Latest drop-offs">
      <Table columns={[
        { key: 'created_at', label: 'When', render: (r) => fmtDate(r.created_at) },
        { key: 'resident_name', label: 'Resident' },
        { key: 'material', label: 'Material', render: (r) => cap(r.material) },
        { key: 'weight_kg', label: 'kg' },
        { key: 'points', label: 'Points' },
      ]} rows={drops.data?.dropoffs} />
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
      <Table columns={[
        { key: 'ticket_no', label: 'Ticket' },
        { key: 'location', label: 'Location' },
        { key: 'resident_name', label: 'Reported by' },
        { key: 'status', label: 'Status', render: (r) => <span className={`badge s-${r.status}`}>{cap(r.status)}</span> },
        { key: 'act', label: 'Update', render: (r) => (r.status === 'resolved' || r.status === 'rejected' ? null : (
          <select value="" onChange={(e) => e.target.value && setStatus(r.id, e.target.value)}>
            <option value="">Set status…</option>
            {r.status === 'open' && <option value="investigating">Investigating</option>}
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>)) },
      ]} rows={reports.data?.reports} />
    </Card>
  );
}