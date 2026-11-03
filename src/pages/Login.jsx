import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../lib/auth.jsx';
import { Notice } from '../components/ui.jsx';
import PageHero from '../components/PageHero.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const user = await login(email, password);
      window.location.assign(ROLE_HOME[user.role]);
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="public-page">
      <PageHero
        eyebrow="Smart waste collection"
        title="Smarter collection. Stronger communities."
        text="Eco-Bin connects residents and municipal teams around responsible waste collection and recycling rewards."
        actions={<Link className="btn lime" to="/register">Create a resident account</Link>}
      />
      <div className="auth-wrap">
        <form className="card auth-card" onSubmit={submit}>
          <h2>Sign in</h2>
          <p className="muted">Your role decides which dashboard you see.</p>
          <Notice kind="error">{error}</Notice>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
          <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="muted center">New resident? <Link to="/register">Create an account</Link></p>
        </form>
      </div>
    </div>
  );
}
