import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../lib/auth.jsx';
import { Notice } from '../components/ui.jsx';
import PageHero from '../components/PageHero.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import Modal from '../components/Modal.jsx';
import RegisterForm from '../components/RegisterForm.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

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
      <ThemeToggle floating />
      <PageHero
        eyebrow="Smart waste collection"
        title="Smarter collection. Stronger communities."
        text="Eco-Bin connects residents and municipal teams around responsible waste collection and recycling rewards."
        actions={<button type="button" className="btn lime" onClick={() => setShowSignup(true)}>Create a resident account</button>}
      />
      <div className="auth-wrap">
        <form className="card auth-card" onSubmit={submit}>
          <h2>Sign in</h2>
          <p className="muted">Your role decides which dashboard you see.</p>
          <Notice kind="error">{error}</Notice>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
          <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="muted center">New resident? <a href="#signup" onClick={(e) => { e.preventDefault(); setShowSignup(true); }}>Create an account</a></p>
        </form>
      </div>

      <Modal open={showSignup} onClose={() => setShowSignup(false)} title="Create a resident account">
        <RegisterForm
          footer={<p className="muted center">Already registered? <a href="#signin" onClick={(e) => { e.preventDefault(); setShowSignup(false); }}>Sign in</a></p>}
        />
      </Modal>
    </div>
  );
}