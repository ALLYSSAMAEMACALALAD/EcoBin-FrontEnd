import { useState } from 'react';
import { useAuth, ROLE_HOME } from '../lib/auth.jsx';
import { Notice } from './ui.jsx';

// Shared sign-up form (used by the Register page and the sign-up modal).
export default function RegisterForm({ footer }) {
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
    <form className="card auth-card" onSubmit={submit}>
      <h2>Create a resident account</h2>
      <Notice kind="error">{error}</Notice>
      <label>Full name<input value={form.name} onChange={set('name')} required autoFocus /></label>
      <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
      <label>Mobile number (for SMS reminders)<input value={form.phone} onChange={set('phone')} placeholder="09xxxxxxxxx" /></label>
      <label>Barangay / zone<input value={form.barangay} onChange={set('barangay')} required /></label>
      <label>Password (min. 8 characters)<input type="password" value={form.password} onChange={set('password')} minLength={8} required /></label>
      <button className="btn primary block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      {footer}
    </form>
  );
}