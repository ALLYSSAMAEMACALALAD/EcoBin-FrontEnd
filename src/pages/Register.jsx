import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../lib/auth.jsx';
import { Notice } from '../components/ui.jsx';
import PageHero from '../components/PageHero.jsx';

// Public sign-up always creates a Resident. Collector and admin accounts are created by an admin.
export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', barangay: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const user = await register(form);
      window.location.assign(ROLE_HOME[user.role]);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="public-page">
      <PageHero
        eyebrow="Resident sign-up"
        title="Get your eco-ID in one step."
        text="Show your QR eco-ID at a drop-off hub to earn points, redeem rewards, and report illegal dumping."
        actions={<Link className="btn outline-light" to="/login">I already have an account</Link>}
      />
      <div className="auth-wrap">
        <form className="card auth-card" onSubmit={submit}>
          <h2>Create a resident account</h2>
          <Notice kind="error">{error}</Notice>
          <label>Full name<input value={form.name} onChange={set('name')} required /></label>
          <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
          <label>Mobile number (for SMS reminders)<input value={form.phone} onChange={set('phone')} placeholder="09xxxxxxxxx" /></label>
          <label>Barangay / zone<input value={form.barangay} onChange={set('barangay')} required /></label>
          <label>Password (min. 8 characters)<input type="password" value={form.password} onChange={set('password')} minLength={8} required /></label>
          <button className="btn primary block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
          <p className="muted center">Already registered? <Link to="/login">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
