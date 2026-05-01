import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async () => {
    try {
      setError('');
      await login(form);
      navigate('/smart-hub');
    } catch (e) {
      console.log(e);
      setError('We couldn’t load this section. Try refreshing or check your connection.');
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Churvox</h1>
        <p>Premium command centre for tradies and service businesses.</p>
        <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error ? <p>{error}</p> : null}
        <button className="modern-button primary" onClick={submit}>Log in</button>
        <p><Link to="/signup">Create an account</Link></p>
      </div>
    </div>
  );
}
