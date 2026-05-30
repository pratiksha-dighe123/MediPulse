import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { clearSession, getSession } from '../lib/auth';

function AdminShell({ children }) {
  const navigate = useNavigate();
  const session = getSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST', token: session?.token });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearSession();
      setMobileMenuOpen(false);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slatex text-slate-100 relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(63,140,255,0.08),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(35,213,171,0.06),transparent_35%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="glass-nav hidden w-72 shrink-0 border-r border-white/10 p-6 lg:block">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-mint">Doctor System</p>
          <h1 className="mt-2 text-2xl font-black">Admin Command</h1>
          <p className="mt-1 text-xs text-slate-400">Central governance for hospitals, fleets, donors, and emergency workflows.</p>
          <nav className="mt-8 space-y-2">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `block rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'border border-mint/50 bg-mint/15 text-mint' : 'border border-transparent hover:border-white/15 hover:bg-white/10'}`
              }
            >
              Dashboard Overview
            </NavLink>
          </nav>
          <button onClick={logout} className="mt-8 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/40">
            Sign out
          </button>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
            <aside
              className="glass-nav h-full w-64 border-r border-white/10 p-5 shadow-glow"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-mint">Doctor System</p>
              <h1 className="mt-2 text-xl font-black">Admin Command</h1>
              <p className="mt-1 text-xs text-slate-400">Central governance panel.</p>
              <nav className="mt-6 space-y-2">
                <NavLink
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'border border-mint/50 bg-mint/15 text-mint' : 'border border-transparent hover:border-white/15 hover:bg-white/10'}`
                  }
                >
                  Dashboard Overview
                </NavLink>
              </nav>
              <button onClick={logout} className="mt-6 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/40">
                Sign out
              </button>
            </aside>
          </div>
        )}

        <div className="flex-1">
          <header className="glass-nav sticky top-0 z-30 px-4 py-3 transition-all duration-300 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Enterprise Panel</p>
                <h2 className="text-base font-bold sm:text-lg">Operations Dashboard</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide lg:hidden"
                >
                  Menu
                </button>
                <button onClick={logout} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold lg:hidden">
                  Logout
                </button>
              </div>
            </div>
          </header>
          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default AdminShell;
