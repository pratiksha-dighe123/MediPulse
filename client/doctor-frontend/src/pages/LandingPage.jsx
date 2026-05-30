import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav';
import LiveAnalytics from '../components/LiveAnalytics';
import { apiFetch } from '../lib/api';
import { getAuthSession } from '../lib/auth';
import { requestBrowserLocation } from '../lib/geolocation';

const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function LandingPage() {
  const session = getAuthSession();
  const [donorForm, setDonorForm] = useState({
    fullName: '',
    age: '',
    weightKg: '',
    bloodGroup: 'O+',
    contactNumber: '',
    lng: '',
    lat: '',
  });
  const [donorSubmitting, setDonorSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [donorLocationLoading, setDonorLocationLoading] = useState(false);

  useEffect(() => {
    apiFetch('/visitor-counter/track', { method: 'POST' }).catch(() => null);
  }, []);

  const updateDonorFormValue = (event) => {
    const { name, value } = event.target;
    setDonorForm((prev) => ({ ...prev, [name]: value }));
  };

  const captureDonorLiveLocation = async () => {
    setDonorLocationLoading(true);
    try {
      const liveCoords = await requestBrowserLocation();
      setDonorForm((prev) => ({
        ...prev,
        lng: String(liveCoords?.lng || ''),
        lat: String(liveCoords?.lat || ''),
      }));
    } finally {
      setDonorLocationLoading(false);
    }
  };

  const submitDonorForm = async (event) => {
    event.preventDefault();
    setStatusMessage({ type: '', text: '' });

    const age = Number(donorForm.age);
    const weightKg = Number(donorForm.weightKg);

    if (age < 18) {
      setStatusMessage({ type: 'error', text: 'You must be 18 or older to donate blood.' });
      return;
    }
    if (weightKg <= 50) {
      setStatusMessage({ type: 'error', text: 'Weight must be greater than 50 kg.' });
      return;
    }

    setDonorSubmitting(true);
    try {
      let lng = Number(donorForm.lng);
      let lat = Number(donorForm.lat);

      if (!lng || !lat) {
        const liveCoords = await requestBrowserLocation();
        lng = Number(liveCoords?.lng);
        lat = Number(liveCoords?.lat);
      }
      
      if (!lng || !lat) throw new Error('Live GPS required to proceed.');

      await apiFetch('/api/donors/public/register', {
        method: 'POST',
        body: {
          fullName: donorForm.fullName,
          age,
          weightKg,
          bloodGroup: donorForm.bloodGroup,
          contactNumber: donorForm.contactNumber,
          lng,
          lat,
        },
      });

      setStatusMessage({ type: 'success', text: 'Thank you! You are now registered as a lifesaver.' });
      setDonorForm({ fullName: '', age: '', weightKg: '', bloodGroup: 'O+', contactNumber: '', lng: '', lat: '' });
    } catch (error) {
      setStatusMessage({ type: 'error', text: error.message || 'Failed to register.' });
    } finally {
      setDonorSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-slate-100 flex flex-col">
      <TopNav />
      <main className="relative flex-1 pb-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(35,213,171,0.15),transparent_60%),radial-gradient(circle_at_80%_80%,rgba(63,140,255,0.1),transparent_50%)]" />

        {/* HERO SECTION */}
        <section className="relative px-4 pt-20 pb-16 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-6 animate-fadeUp">
            <h1 className="text-5xl font-black leading-tight sm:text-6xl text-white">
              Medical Help, <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon to-sky">Made Simple.</span>
            </h1>
            <p className="text-lg text-slate-300 sm:text-xl">
              Choose an option below to get started immediately.
            </p>
          </div>
        </section>

        {/* FOUR PILLARS */}
        <section className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 animate-fadeUp" style={{ animationDelay: '0.1s' }}>
            
            <Link to={session?.role === 'patient' ? '/patient/dashboard' : '/register'} className="ui-panel flex flex-col items-center p-8 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(255,107,107,0.3)] hover:border-coral/50 group">
              <div className="text-7xl mb-4 transition-transform group-hover:scale-110">🚑</div>
              <h2 className="text-xl font-black text-white">Call Ambulance</h2>
              <p className="mt-2 text-sm text-slate-300">Get an emergency ride instantly.</p>
            </Link>

            <Link to={session?.role === 'doctor' ? '/doctor/dashboard' : '/login'} className="ui-panel flex flex-col items-center p-8 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(63,140,255,0.3)] hover:border-sky/50 group">
              <div className="text-7xl mb-4 transition-transform group-hover:scale-110">👨‍⚕️</div>
              <h2 className="text-xl font-black text-white">Doctor Portal</h2>
              <p className="mt-2 text-sm text-slate-300">Login and manage patients.</p>
            </Link>

            <Link to={session?.role === 'hospital' ? '/hospital/dashboard' : '/hospital/register'} className="ui-panel flex flex-col items-center p-8 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(35,213,171,0.3)] hover:border-neon/50 group">
              <div className="text-7xl mb-4 transition-transform group-hover:scale-110">🏥</div>
              <h2 className="text-xl font-black text-white">Hospital Login</h2>
              <p className="mt-2 text-sm text-slate-300">Command your entire fleet.</p>
            </Link>

            <a href="#blood-donor" className="ui-panel flex flex-col items-center p-8 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(255,107,107,0.3)] hover:border-coral/50 group">
              <div className="text-7xl mb-4 transition-transform group-hover:scale-110">🩸</div>
              <h2 className="text-xl font-black text-white">Donate Blood</h2>
              <p className="mt-2 text-sm text-slate-300">Register to save lives.</p>
            </a>

          </div>
        </section>

        {/* ANALYTICS SECTION */}
        <section className="relative mx-auto mt-6 max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <LiveAnalytics />
        </section>

        {/* HOW IT WORKS SECTION */}
        <section className="relative mx-auto mt-6 max-w-6xl px-4 py-8 sm:px-6 lg:px-8 animate-fadeUp">
          <div className="text-center mb-10">
             <h2 className="text-3xl font-black text-white">How It Works</h2>
             <p className="mt-2 text-slate-300">A seamless flow from emergency to immediate care.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3 text-center">
            <div className="ui-panel p-6 border-sky/30 transition-transform hover:-translate-y-1">
               <div className="text-5xl mb-4">🚨</div>
               <h3 className="text-xl font-bold text-white mb-2">1. Request Aid</h3>
               <p className="text-slate-400 text-sm">Send an immediate distress signal or call an ambulance to your precise location.</p>
            </div>
            <div className="ui-panel p-6 border-neon/30 transition-transform hover:-translate-y-1">
               <div className="text-5xl mb-4">⚡</div>
               <h3 className="text-xl font-bold text-white mb-2">2. Smart Match</h3>
               <p className="text-slate-400 text-sm">Our system locates the nearest available hospital and active ambulance instantly.</p>
            </div>
            <div className="ui-panel p-6 border-coral/30 transition-transform hover:-translate-y-1">
               <div className="text-5xl mb-4">💖</div>
               <h3 className="text-xl font-bold text-white mb-2">3. Receive Care</h3>
               <p className="text-slate-400 text-sm">Monitor your ambulance live while receiving critical first-aid instructions.</p>
            </div>
          </div>
        </section>

        {/* FIRST AID GUIDELINES */}
        <section className="relative mx-auto mt-6 max-w-6xl px-4 py-8 sm:px-6 lg:px-8 animate-fadeUp">
          <div className="text-center mb-8">
             <h2 className="text-3xl font-black text-white">Critical First-Aid</h2>
             <p className="mt-2 text-slate-300">Basic actions to stabilize victims while awaiting dispatch.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="ui-panel p-5 bg-gradient-to-br from-rose-500/10 to-transparent">
              <h4 className="font-bold text-rose-400 mb-2 flex items-center gap-2">🩸 Bleeding</h4>
              <p className="text-xs text-slate-300 leading-relaxed">Apply firm, direct pressure over the wound using a clean cloth. Do not remove the cloth if soaked; add another layer.</p>
            </div>
            <div className="ui-panel p-5 bg-gradient-to-br from-sky-500/10 to-transparent">
              <h4 className="font-bold text-sky-400 mb-2 flex items-center gap-2">🫀 CPR</h4>
              <p className="text-xs text-slate-300 leading-relaxed">If unresponsive and not breathing, push hard and fast in the center of the chest (100-120 compressions per minute).</p>
            </div>
            <div className="ui-panel p-5 bg-gradient-to-br from-amber-500/10 to-transparent">
              <h4 className="font-bold text-amber-400 mb-2 flex items-center gap-2">🔥 Burns</h4>
              <p className="text-xs text-slate-300 leading-relaxed">Cool the burn under cool (not cold) running water for 10 minutes. Cover loosely with cling film or clean plastic.</p>
            </div>
            <div className="ui-panel p-5 bg-gradient-to-br from-purple-500/10 to-transparent">
              <h4 className="font-bold text-purple-400 mb-2 flex items-center gap-2">😮‍💨 Choking</h4>
              <p className="text-xs text-slate-300 leading-relaxed">Give up to 5 back blows followed by 5 abdominal thrusts (Heimlich maneuver) if they cannot cough or breathe.</p>
            </div>
          </div>
        </section>

        {/* BLOOD DONATION SECTION */}
        <section id="blood-donor" className="relative mx-auto mt-12 max-w-3xl px-4 py-10 sm:px-6 lg:px-8 animate-fadeUp" style={{ animationDelay: '0.2s' }}>
          <div className="glass-panel p-6 sm:p-10 border-coral/30">
            <div className="text-center mb-8 gap-3 flex flex-col items-center">
              <div className="text-6xl">❤️</div>
              <h2 className="text-3xl font-black text-white">Be a Hero. Donate Blood.</h2>
              <p className="text-slate-300">We contact you only when there is a critical emergency near your location.</p>
            </div>

            {statusMessage.text && (
              <div className={`mb-6 p-4 rounded-xl font-bold text-center border ${statusMessage.type === 'error' ? 'bg-rose-500/10 text-rose-300 border-rose-500/50' : 'bg-neon/10 text-neon border-neon/50'}`}>
                {statusMessage.text}
              </div>
            )}

            <form onSubmit={submitDonorForm} className="grid sm:grid-cols-2 gap-5">
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-bold text-slate-300">Your Full Name</span>
                <input name="fullName" value={donorForm.fullName} onChange={updateDonorFormValue} required className="rounded-xl border border-white/20 bg-black/40 px-4 py-3.5 text-white focus:border-neon focus:ring-1 focus:ring-neon outline-none transition" />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-300">Age</span>
                <input type="number" min="18" name="age" value={donorForm.age} onChange={updateDonorFormValue} required className="rounded-xl border border-white/20 bg-black/40 px-4 py-3.5 text-white focus:border-neon focus:ring-1 focus:ring-neon outline-none transition" />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-300">Weight (kg)</span>
                <input type="number" min="51" name="weightKg" value={donorForm.weightKg} onChange={updateDonorFormValue} required className="rounded-xl border border-white/20 bg-black/40 px-4 py-3.5 text-white focus:border-neon focus:ring-1 focus:ring-neon outline-none transition" />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-300">Blood Group</span>
                <select name="bloodGroup" value={donorForm.bloodGroup} onChange={updateDonorFormValue} required className="rounded-xl border border-white/20 bg-black/40 px-4 py-3.5 text-white focus:border-neon focus:ring-1 focus:ring-neon outline-none transition">
                  {BLOOD_GROUP_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-300">Phone Number</span>
                <input type="tel" name="contactNumber" value={donorForm.contactNumber} onChange={updateDonorFormValue} required className="rounded-xl border border-white/20 bg-black/40 px-4 py-3.5 text-white focus:border-neon focus:ring-1 focus:ring-neon outline-none transition" />
              </label>

              <div className="sm:col-span-2 pt-2">
                <button type="button" onClick={captureDonorLiveLocation} disabled={donorLocationLoading} className="w-full rounded-xl border border-sky/50 bg-sky/10 px-4 py-3.5 text-sm font-bold tracking-wide text-sky hover:bg-sky/20 transition">
                  {donorLocationLoading ? 'Finding Location...' : donorForm.lng ? 'Location Saved ✅' : '📍 Click to Attach Location (Required)'}
                </button>
              </div>

              <button type="submit" disabled={donorSubmitting} className="sm:col-span-2 mt-2 rounded-xl bg-coral px-6 py-4 text-base sm:text-lg font-black tracking-wider text-white hover:brightness-110 transition shadow-[0_10px_30px_rgba(255,107,107,0.3)] hover:shadow-[0_10px_40px_rgba(255,107,107,0.5)] disabled:opacity-50 uppercase">
                {donorSubmitting ? 'Registering...' : 'Register as Donor'}
              </button>
            </form>
          </div>
        </section>

      </main>
      <footer className="w-full text-center py-8 text-slate-500 text-sm border-t border-white/10 mt-auto">
        &copy; {new Date().getFullYear()} MediPulse. All rights reserved. Built for immediate emergency response.
      </footer>
    </div>
  );
}

export default LandingPage;
