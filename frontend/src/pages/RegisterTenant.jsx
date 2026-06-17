import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api/client';

export default function RegisterTenant() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await signUp(form);
      navigate('/');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand">Register your company</div>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={submit}>
          <label className="field"><span>Company name</span><input required value={form.companyName} onChange={set('companyName')} placeholder="Acme Pvt Ltd" /></label>
          <label className="field"><span>Your full name</span><input required value={form.name} onChange={set('name')} /></label>
          <label className="field"><span>Work email</span><input type="email" required value={form.email} onChange={set('email')} /></label>
          <label className="field"><span>Password (min 8 chars)</span><input type="password" required minLength={8} value={form.password} onChange={set('password')} /></label>
          <button className="btn" disabled={busy} style={{ width: '100%' }}>{busy ? 'Creating…' : 'Create company account'}</button>
        </form>
        <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
