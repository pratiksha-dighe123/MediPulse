import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthSession } from '../lib/auth';
import { apiFetch } from '../lib/api';

function TopNav() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const onLogout = async () => {
    try {
      if (session?.token) {
        await apiFetch('/auth/logout', {
          method: 'POST',
          token: session.token,
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthSession();
      setMobileOpen(false);
      navigate('/');
    }
  };

  return (
    <header className="glass-nav sticky top-0 z-50 transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="group flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-neon to-sky shadow-[0_0_15px_rgba(35,213,171,0.3)] transition-all group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(35,213,171,0.6)]">
            <div className="h-3 w-3 rounded-full bg-white shadow-sm" />
          </div>
          <span className="text-lg font-black uppercase tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200 sm:text-xl">
            MediPulse
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-200 md:hidden"
        >
          Menu
        </button>

        <nav className="hidden items-center gap-1 md:flex md:gap-2">
          <NavLink to="/" className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-white/10 text-white shadow-inner' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
            Home
          </NavLink>
          {!session && (
            <>
              <NavLink to="/login" className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-white/10 text-white shadow-inner' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                Login
              </NavLink>
              <NavLink to="/register" className="rounded-full bg-gradient-to-r from-white to-slate-200 px-4 py-2 text-sm font-bold text-ink transition-transform hover:scale-105 hover:shadow-lg">
                Register
              </NavLink>
              <NavLink to="/hospital/register" className="ml-2 rounded-full border border-neon/50 bg-neon/10 px-4 py-2 text-sm font-bold text-neon transition-all hover:bg-neon/20 hover:shadow-glow">
                Register Hospital
              </NavLink>
            </>
          )}
          {session?.role === 'doctor' && (
            <>
              <NavLink to="/doctor/dashboard" className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-white/10 text-white shadow-inner' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                Dashboard
              </NavLink>
              <NavLink to="/doctor/profile" className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-white/10 text-white shadow-inner' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                Profile
              </NavLink>
            </>
          )}
          {session?.role === 'patient' && (
            <>
              <NavLink to="/patient/dashboard" className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-white/10 text-white shadow-inner' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                Dashboard
              </NavLink>
              <NavLink to="/patient/profile" className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-white/10 text-white shadow-inner' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                Profile
              </NavLink>
            </>
          )}
          {session?.role === 'hospital' && (
            <NavLink to="/hospital/dashboard" className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-white/10 text-white shadow-inner' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
              Hospital Dashboard
            </NavLink>
          )}
          {session?.role === 'driver' && (
            <NavLink to="/ambulance/driver/dashboard" className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-white/10 text-white shadow-inner' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
              Driver Dashboard
            </NavLink>
          )}
          {session && (
            <button onClick={onLogout} className="ml-2 rounded-full border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-300 transition-all hover:bg-red-400/20 hover:text-red-200">
              Logout
            </button>
          )}
        </nav>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#0d1324] px-4 py-3 md:hidden">
          <nav className="grid gap-2">
            <NavLink to="/" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              Home
            </NavLink>
            {!session && (
              <>
                <NavLink to="/login" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                  Login
                </NavLink>
                <NavLink to="/register" onClick={() => setMobileOpen(false)} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-ink">
                  Register
                </NavLink>
                <NavLink to="/hospital/register" onClick={() => setMobileOpen(false)} className="rounded-lg border border-neon/60 px-3 py-2 text-sm font-bold text-neon">
                  Register Hospital
                </NavLink>
              </>
            )}
            {session?.role === 'doctor' && (
              <NavLink to="/doctor/dashboard" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                Doctor Dashboard
              </NavLink>
            )}
            {session?.role === 'doctor' && (
              <NavLink to="/doctor/profile" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                Doctor Profile
              </NavLink>
            )}
            {session?.role === 'patient' && (
              <NavLink to="/patient/dashboard" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                Patient Dashboard
              </NavLink>
            )}
            {session?.role === 'patient' && (
              <NavLink to="/patient/profile" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                My Profile
              </NavLink>
            )}
            {session?.role === 'hospital' && (
              <NavLink to="/hospital/dashboard" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                Hospital Dashboard
              </NavLink>
            )}
            {session?.role === 'driver' && (
              <NavLink to="/ambulance/driver/dashboard" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                Driver Dashboard
              </NavLink>
            )}
            {session && (
              <button onClick={onLogout} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/60">
                Logout
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export default TopNav;
