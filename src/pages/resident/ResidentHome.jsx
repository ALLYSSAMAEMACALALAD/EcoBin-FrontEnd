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
import { downloadCertificate } from '../../lib/certificate.js';
import { compressImage } from '../../lib/image.js';
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

// Eco status based on points. Used in the "Eco Status" card.
const ECO_TIERS = [
  { min: 0, name: 'Eco Starter' },
  { min: 100, name: 'Eco Helper' },
  { min: 300, name: 'Green Champion' },
  { min: 750, name: 'Eco Hero' }
];

function ecoTier(points) {
  if (points == null) return { name: '—', progress: 0, next: null, needed: 0 };

  let idx = 0;
  ECO_TIERS.forEach((t, i) => { if (points >= t.min) idx = i; });

  const cur = ECO_TIERS[idx];
  const nxt = ECO_TIERS[idx + 1];
  const progress = nxt ? (points - cur.min) / (nxt.min - cur.min) : 1;

  return {
    name: cur.name,
    progress: Math.min(1, Math.max(0, progress)),
    next: nxt?.name ?? null,
    needed: nxt ? nxt.min - points : 0
  };
}

// Finds the next upcoming pickup from the resident's routes
function nextPickupFrom(routes = []) {
  const today = new Date().toLocaleDateString('en-CA');
  const upcoming = routes
    .filter((r) => r.route_date >= today && r.status !== 'completed')
    .sort((a, b) => a.route_date.localeCompare(b.route_date));
  return upcoming[0] || null;
}

function formatLongDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

// ==========================================
// RESIDENT HOME (SHELL)
// ==========================================

const NAV_ITEMS = [
  ['overview', '🏠', 'Dashboard'],
  ['schedule', '📅', 'Collection Schedule'],
  ['rewards', '🎁', 'Rewards'],
  ['report', '⚠️', 'Report Dumping'],
  ['tickets', '🎫', 'My Tickets'],
  ['guide', '📖', 'Segregation Guide']
];

export default function ResidentHome() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('overview');

  const firstName = (user?.name || '').split(' ')[0] || 'Resident';
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <div className="rd-shell">
      <aside className="rd-sidebar">
        <div className="rd-logo">
          <div className="rd-logo-mark">♻️</div>
          <div>
            <div className="rd-logo-name">EcoBin</div>
            <div className="rd-logo-tag">Recycle. Earn. Keep it Green.</div>
          </div>
        </div>

        <nav className="rd-nav">
          {NAV_ITEMS.map(([key, icon, label]) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              <span className="rd-nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="rd-logout"
          onClick={() => logout?.()}
        >
          Logout
        </button>
      </aside>

      <main className="rd-main">
        <header className="rd-topbar">
          <div className="rd-bell" aria-label="Notifications">🔔</div>
          <div className="rd-user">
            <div className="rd-avatar">{initial}</div>
            <div>
              <div className="rd-user-name">Hi, {firstName}!</div>
              <div className="rd-user-role">Resident</div>
            </div>
          </div>
        </header>

        <section className="rd-hero">
          <h1>Good day, {firstName}! 🌱</h1>
          <p>Let's keep our community clean and green together! 🍃</p>
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
// OVERVIEW
// ==========================================

function Overview({ onNavigate }) {
  const { user } = useAuth();
  const balance = useLoader(() => api('/balance'));
  const drops = useLoader(() => api('/dropoffs'));
  const schedules = useLoader(() => api('/schedules'));
  const routes = useLoader(() => api('/routes'));

  const points = getBalance(balance.data);
  const tier = ecoTier(points);
  const dropRows = drops.data?.dropoffs || [];
  const totalKg = dropRows.reduce((sum, d) => sum + Number(d.weight_kg || 0), 0);
  const recentBars = dropRows.slice(0, 8).reverse();
  const maxKg = Math.max(1, ...recentBars.map((d) => Number(d.weight_kg) || 0));
  const nextPickup = nextPickupFrom(routes.data?.routes || []);

  return (
    <>
      {/* Stat cards */}
      <div className="rd-stats">
        <div className="card rd-glow">
          <div className="rd-stat-label">Your Points</div>
          <div className="rd-stat-value">
            {points !== null ? `${points} pts` : balance.loading ? '...' : '—'}
          </div>
          {balance.error && <Notice kind="error">{balance.error}</Notice>}
          <button
            className="btn primary"
            type="button"
            style={{ marginTop: 14 }}
            onClick={() => onNavigate('rewards')}
          >
            View Rewards →
          </button>
        </div>

        <div className="card rd-glow">
          <div className="rd-stat-label">Your Eco Status</div>
          <div className="rd-stat-value" style={{ fontSize: 30 }}>{tier.name}</div>
          <div className="rd-stat-sub">
            {tier.next ? `${tier.needed} pts to go until ${tier.next}` : "You've reached the highest level!"}
          </div>
          <div className="rd-progress">
            <span style={{ width: `${tier.progress * 100}%` }} />
          </div>
        </div>

        <div className="card rd-glow">
          <div className="rd-stat-label">Next Collection</div>
          {routes.loading ? (
            <div className="rd-stat-sub">Loading…</div>
          ) : nextPickup ? (
            <>
              <div className="rd-stat-value" style={{ fontSize: 26 }}>
                {formatLongDate(nextPickup.route_date)}
              </div>
              <div className="rd-stat-sub">{nextPickup.name}</div>
            </>
          ) : (
            <div className="rd-stat-sub">No pickup scheduled.</div>
          )}
          <button
            className="btn ghost"
            type="button"
            style={{ marginTop: 14 }}
            onClick={() => onNavigate('schedule')}
          >
            View Schedule →
          </button>
        </div>
      </div>

      {/* Impact, quick actions, rewards preview */}
      <div className="rd-row">
        <div className="card">
          <div className="rd-card-head">
            <h3 className="rd-card-title">Recycling Impact</h3>
          </div>
          <div className="rd-stat-value" style={{ marginTop: 0 }}>
            {totalKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
          </div>
          <div className="rd-stat-sub">Total recyclables</div>
          <div className="rd-bars">
            {recentBars.length ? recentBars.map((d) => (
              <div
                key={d.id ?? d.created_at}
                className="rd-bar"
                title={`${d.weight_kg} kg`}
                style={{ height: `${(Number(d.weight_kg) / maxKg) * 100}%` }}
              />
            )) : <p className="muted">No drop-offs yet.</p>}
          </div>
        </div>

        <div className="card">
          <div className="rd-card-head">
            <h3 className="rd-card-title">Quick Actions</h3>
          </div>
          <div className="rd-actions">
            <button type="button" className="rd-action" onClick={() => onNavigate('report')}>
              <span className="rd-action-icon">📷</span>
              Report Dumping
            </button>
            <button type="button" className="rd-action" onClick={() => onNavigate('rewards')}>
              <span className="rd-action-icon">🎁</span>
              Check Rewards
            </button>
            <button type="button" className="rd-action" onClick={() => onNavigate('guide')}>
              <span className="rd-action-icon">📖</span>
              View Guide
            </button>
            <button type="button" className="rd-action" onClick={() => onNavigate('schedule')}>
              <span className="rd-action-icon">🗓️</span>
              View Schedule
            </button>
          </div>
        </div>

        <div className="card">
          <div className="rd-card-head">
            <h3 className="rd-card-title">Your Rewards</h3>
            <button type="button" className="btn ghost small" onClick={() => onNavigate('rewards')}>
              See All →
            </button>
          </div>
          <div className="rd-reward-grid">
            {rewardCatalog.slice(0, 3).map((r) => (
              <button
                key={r.name}
                type="button"
                className="rd-reward"
                onClick={() => onNavigate('rewards')}
              >
                <span className="rd-reward-icon">{r.icon}</span>
                <span className="rd-reward-name">{r.name}</span>
                <span className="rd-reward-pts">{r.points_cost} pts</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity and eco-ID */}
      <div className="rd-row-2">
        <div className="card">
          <div className="rd-card-head">
            <h3 className="rd-card-title">Recent Activity</h3>
          </div>
          {dropRows.length ? (
            <ul className="rd-activity">
              {dropRows.slice(0, 4).map((d) => (
                <li key={d.id ?? d.created_at}>
                  <span className="rd-dot" />
                  <div>
                    <div className="rd-activity-text">
                      You earned {d.points} pts for a {cap(d.material)} drop-off ({d.unit === 'pcs' ? `${d.quantity} pcs` : `${parseFloat(d.weight_kg)} kg`})
                    </div>
                    <div className="rd-activity-date">{fmtDate(d.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No activity yet. Bring recyclables to the hub.</p>
          )}
        </div>

        <div className="card">
          <div className="rd-card-head">
            <h3 className="rd-card-title">Your Eco-ID</h3>
          </div>
          <div className="rd-eco-qr">
            <p className="muted" style={{ textAlign: 'center', margin: 0 }}>
              Show this QR code at the drop-off hub so your points can be credited.
            </p>
            <QRCodeSVG value={user.eco_id} size={160} includeMargin />
            <p className="mono" style={{ margin: 0 }}>{user.eco_id}</p>
          </div>
        </div>
      </div>

      {/* Drop-off history */}
      <Card title="Recent drop-offs">
        {drops.error && <Notice kind="error">{drops.error}</Notice>}
        <Table
          columns={[
            { key: 'created_at', label: 'Date', render: (r) => fmtDate(r.created_at) },
            { key: 'material', label: 'Material', render: (r) => cap(r.material) },
            { key: 'qty', label: 'Qty', render: (r) => (r.unit === 'pcs' ? `${r.quantity} pcs` : `${parseFloat(r.quantity ?? r.weight_kg)} kg`) },
            { key: 'points', label: 'Points', render: (r) => Number(r.points) },
            { key: 'photo', label: 'Photo', render: (r) => (r.photo_url ? <img className="table-thumb" src={r.photo_url} alt="Recyclables" /> : '—') }
          ]}
          rows={dropRows.slice(0, 8)}
          empty="No drop-offs yet. Bring your sorted recyclables to a hub."
        />
      </Card>

      <div className="rd-banner">
        <h3>Together for a Cleaner Community</h3>
        <p>Reduce. Reuse. Recycle. 🌍</p>
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
  const routes = useLoader(() => api('/routes'));

  return (
    <div className="grid-2">
      <CollectionScheduleCard schedules={schedules} zone={user.barangay} />
      <PickupCard routes={routes} />
    </div>
  );
}

function PickupCard({ routes }) {
  const pickups = (routes.data?.routes || []).flatMap((r) =>
    (r.stops || []).map((s) => ({
      ...s,
      route: r.name,
      date: r.route_date
    }))
  );

  return (
    <Card title="Your pickup schedule">
      {routes.loading ? (
        <p className="muted">Loading pickups…</p>
      ) : routes.error ? (
        <Notice kind="error">{routes.error}</Notice>
      ) : (
        <Table
          columns={[
            { key: 'route', label: 'Route' },
            { key: 'date', label: 'Pickup date' },
            { key: 'address', label: 'Pickup location' },
            {
              key: 'status',
              label: 'Pickup status',
              render: (r) => (
                <span className={`badge s-${r.status}`}>
                  {cap(r.status)}
                </span>
              )
            }
          ]}
          rows={pickups}
          empty="No pickup routes have been published yet."
        />
      )}
    </Card>
  );
}

function CollectionScheduleCard({ schedules, zone }) {
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
          rows={schedules.data?.schedules || []}
          empty="No schedule published for your barangay yet."
        />
      )}

      <p className="muted">
        You'll receive SMS and email reminders before each pickup.
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