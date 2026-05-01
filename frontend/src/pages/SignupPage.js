import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const submit = async () => {
    await signup(form);
    navigate('/login');
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Create Churvox Account</h1>
        <input placeholder="Name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="modern-button primary" onClick={submit}>Sign up</button>
        <p><Link to="/login">Back to login</Link></p>
      </div>
    </div>
  );
}
