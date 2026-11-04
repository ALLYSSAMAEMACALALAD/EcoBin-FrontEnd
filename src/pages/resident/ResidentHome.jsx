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
import PageHero from '../../components/PageHero.jsx';
import { downloadCertificate } from '../../lib/certificate.js';

// ==========================================
// REWARDS CATALOG
// ==========================================

const rewardCatalog = [
  { name: 'Plant Seedling', points_cost: 50, stock: 30 },
  { name: 'Recycled Pencil Set', points_cost: 50, stock: 30 },
  { name: 'Recycled Notebook', points_cost: 75, stock: 25 },
  { name: 'Bamboo Toothbrush', points_cost: 75, stock: 20 },
  { name: 'Reusable Tote Bag', points_cost: 100, stock: 30 },
  { name: 'Reusable Mesh Bag', points_cost: 100, stock: 25 },
  { name: 'Reusable Food Container', points_cost: 150, stock: 15 },
  { name: 'Reusable Tumbler', points_cost: 200, stock: 15 },
  { name: 'Eco Cleaning Kit', points_cost: 200, stock: 10 },
  { name: 'Gardening Starter Kit', points_cost: 250, stock: 10 },
  { name: 'Grocery Discount Voucher', points_cost: 300, stock: 20 },
  { name: 'School Supplies Bundle', points_cost: 350, stock: 10 },
  { name: 'Grocery Gift Pack', points_cost: 500, stock: 10 },
  { name: 'Transportation Fare Voucher', points_cost: 500, stock: 10 },
  { name: 'Eco-Friendly Household Kit', points_cost: 750, stock: 5 }
];

// ==========================================
// BALANCE HELPER
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
// RESIDENT HOME
// ==========================================

export default function ResidentHome() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');

  const tabs = [
    ['overview', 'Overview'],
    ['schedule', 'Collection schedule'],
    ['rewards', 'Rewards'],
    ['report', 'Report dumping'],
    ['tickets', 'My tickets']
  ];

  return (
    <>
      <PageHero
        eyebrow="Resident dashboard"
        title={`Hello, ${user.name}`}
        text="Track your pickups, points, rewards, and reports in one place."
      />

      <nav className="tabs">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            className={tab === k ? 'active' : ''}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <Overview />}
      {tab === 'schedule' && <Schedule />}
      {tab === 'rewards' && <Rewards />}
      {tab === 'report' && <ReportDumping onFiled={() => setTab('tickets')} />}
      {tab === 'tickets' && <MyTickets />}
    </>
  );
}

// ==========================================
// OVERVIEW
// ==========================================

function Overview() {
  const { user } = useAuth();
  const balance = useLoader(() => api('/balance'));
  const drops = useLoader(() => api('/dropoffs'));
  const schedules = useLoader(() => api('/schedules'));
  const routes = useLoader(() => api('/routes'));

  const points = getBalance(balance.data);

  return (
    <>
      <div className="grid-2">
        <Card title="Your eco-ID">
          <p className="muted">
            Show this QR code at a drop-off hub. The collector scans it to credit your points.
          </p>

          <div className="qr">
            <QRCodeSVG value={user.eco_id} size={180} includeMargin />
          </div>

          <p className="center mono">{user.eco_id}</p>
        </Card>

        <Card title="Available points">
          <p className="big">
            {points !== null ? `${points} pts` : balance.loading ? 'Loading...' : 'Unavailable'}
          </p>

          {balance.error && <Notice kind="error">{balance.error}</Notice>}

          <p className="muted">
            Points you can redeem for rewards.
          </p>

          <button className="btn ghost" type="button" onClick={() => balance.reload()}>
            Refresh points
          </button>

          <h3>Recent drop-offs</h3>

          <Table
            columns={[
              {
                key: 'created_at',
                label: 'Date',
                render: (r) => fmtDate(r.created_at)
              },
              {
                key: 'material',
                label: 'Material',
                render: (r) => cap(r.material)
              },
              { key: 'weight_kg', label: 'kg' },
              { key: 'points', label: 'Points' }
            ]}
            rows={drops.data?.dropoffs?.slice(0, 8)}
            empty="No drop-offs yet. Bring your sorted recyclables to a hub."
          />
        </Card>
      </div>
      <div className="grid-2">
        <CollectionScheduleCard schedules={schedules} zone={user.barangay} />
        <PickupCard routes={routes} />
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

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
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

  // Gumagawa ng preview ng larawan at nililinis ang memory kapag nagbago o tinanggal
  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function pickPhoto(file) {
    if (!file) return;

    if (file.type && !ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setMsg({
        kind: 'error',
        text: 'Gamitin ang JPEG, PNG, o WebP lang.'
      });
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setMsg({
        kind: 'error',
        text: 'Masyadong malaki ang larawan. Max 5 MB.'
      });
      return;
    }

    setMsg({ kind: 'info', text: '' });
    setPhoto(file);
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

          {/* Hidden inputs: ang button ang nagbubukas sa mga ito */}
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

          {preview && (
            <div className="stack">
              <img
                src={preview}
                alt="Preview ng ni-report na dumping"
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