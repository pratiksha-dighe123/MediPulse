import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { apiFetch, getDefaultRouteByRole } from '../lib/api';
import { setAuthSession } from '../lib/auth';

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', role: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiFetch('/auth/login', {
        method: 'POST',
        body: {
          email: form.email,
          password: form.password,
          ...(form.role ? { role: form.role } : {}),
        },
      });

      const session = setAuthSession(result.token);
      navigate(getDefaultRouteByRole(session.role));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <TopNav />
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-16">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-8">
          <h1 className="text-2xl font-black sm:text-3xl">Welcome Back</h1>
          <p className="text-sm text-slate-300">Login using your doctor, patient, hospital, driver, or admin credentials.</p>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-200">Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none transition focus:border-neon"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-200">Password</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none transition focus:border-neon"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-200">Login As</span>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none transition focus:border-neon"
            >
              <option value="">Auto detect</option>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="hospital">Hospital</option>
              <option value="driver">Ambulance Driver</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {error && <p className="rounded-xl border border-coral/50 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-xl bg-neon px-4 py-3 text-sm font-black uppercase tracking-wider text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
