import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { setSession } from '../lib/auth';

function AdminLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiFetch('/auth/login', {
        method: 'POST',
        body: { ...form, role: 'admin' },
      });

      const session = setSession(result.token);
      if (session.role !== 'admin') {
        throw new Error('This portal is restricted to admins');
      }

      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-slatex px-4 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.22),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(245,158,11,0.2),transparent_35%)]" />
      <form onSubmit={onSubmit} className="relative w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-mint">Doctor System</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Admin Login</h1>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-200">Email</span>
          <input name="email" type="email" required value={form.email} onChange={onChange} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none transition focus:border-mint" />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-200">Password</span>
          <input name="password" type="password" required value={form.password} onChange={onChange} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none transition focus:border-mint" />
        </label>

        {error && <p className="rounded-lg border border-rosex/40 bg-rosex/10 px-3 py-2 text-sm text-rosex">{error}</p>}

        <button type="submit" disabled={loading} className="w-full rounded-xl bg-mint px-4 py-3 text-sm font-black uppercase tracking-wider text-slatex transition hover:brightness-110 disabled:opacity-60">
          {loading ? 'Authenticating...' : 'Enter Admin Console'}
        </button>
      </form>
    </div>
  );
}

export default AdminLoginPage;
