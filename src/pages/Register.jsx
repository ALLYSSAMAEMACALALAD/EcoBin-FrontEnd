import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import RegisterForm from '../components/RegisterForm.jsx';

// Direct /register page. Public sign-up always creates a Resident.
export default function Register() {
  return (
    <div className="public-page">
      <ThemeToggle floating />
      <PageHero
        eyebrow="Resident sign-up"
        title="Get your eco-ID in one step."
        text="Show your QR eco-ID at a drop-off hub to earn points, redeem rewards, and report illegal dumping."
        actions={<Link className="btn outline-light" to="/login">I already have an account</Link>}
      />
      <div className="auth-wrap">
        <RegisterForm footer={<p className="muted center">Already registered? <Link to="/login">Sign in</Link></p>} />
      </div>
    </div>
  );
}