import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { apiFetch } from '../lib/api';
import { requestBrowserLocation } from '../lib/geolocation';

const patientInitial = {
  role: 'patient',
  name: '',
  email: '',
  age: '',
  contactNumber: '',
  bloodGroup: '',
  password: '',
  address: '',
  buildingAddress: '',
  laneAddress: '',
  lng: '',
  lat: '',
};

const doctorInitial = {
  role: 'doctor',
  name: '',
  email: '',
  age: '',
  contactNumber: '',
  bloodGroup: '',
  password: '',
  specialization: '',
  experience: '',
  hospitalId: '',
  licenseNumber: '',
  homeAddress: '',
  buildingAddress: '',
  laneAddress: '',
  lng: '',
  lat: '',
  available: true,
  unavailableReason: '',
  activeHoursStart: '09:00',
  activeHoursEnd: '17:00',
};

const driverInitial = {
  role: 'driver',
  driverName: '',
  vehicleNumber: '',
  driverPhone: '',
  email: '',
  password: '',
  driverBloodGroup: '',
  address: '',
  hospitalId: '',
  hospitalName: '',
  lng: '',
  lat: '',
};

function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState(patientInitial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');

  const activeTemplate = useMemo(() => {
    if (role === 'doctor') return doctorInitial;
    if (role === 'driver') return driverInitial;
    return patientInitial;
  }, [role]);

  const fillLocationFromBrowser = async () => {
    setLocating(true);
    setLocationMessage('Requesting location permission...');

    try {
      const coords = await requestBrowserLocation();
      setForm((prev) => ({
        ...prev,
        lng: coords.lng,
        lat: coords.lat,
      }));
      setLocationMessage('Location auto-filled from your browser.');
    } catch (requestError) {
      setLocationMessage(requestError.message);
    } finally {
      setLocating(false);
    }
  };

  const changeRole = (newRole) => {
    setRole(newRole);
    const template = newRole === 'patient' ? patientInitial : newRole === 'doctor' ? doctorInitial : driverInitial;
    setForm({
      ...template,
      lng: form.lng || '',
      lat: form.lat || '',
    });
    setError('');
  };

  useEffect(() => {
    if (!['doctor', 'driver'].includes(role)) return;

    apiFetch('/hospitals')
      .then((result) => setHospitals(result))
      .catch(() => setHospitals([]));
  }, [role]);

  useEffect(() => {
    fillLocationFromBrowser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { activeHoursStart, activeHoursEnd, ...restForm } = form;

      await apiFetch('/auth/register', {
        method: 'POST',
        body: {
          ...restForm,
          ...(role !== 'driver' ? { age: Number(restForm.age) } : {}),
          ...(role === 'doctor'
            ? {
                experience: Number(restForm.experience),
                available: Boolean(restForm.available),
                unavailableReason: restForm.available ? '' : restForm.unavailableReason,
                activeHours: {
                  start: activeHoursStart,
                  end: activeHoursEnd,
                },
              }
            : {}),
        },
      });
      navigate('/login');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <TopNav />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-8">
          <h1 className="text-2xl font-black sm:text-3xl">Create Account</h1>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button type="button" onClick={() => changeRole('patient')} className={`rounded-full px-5 py-2 text-sm font-bold ${role === 'patient' ? 'bg-neon text-ink' : 'border border-white/20 text-slate-200'}`}>
              Patient
            </button>
            <button type="button" onClick={() => changeRole('doctor')} className={`rounded-full px-5 py-2 text-sm font-bold ${role === 'doctor' ? 'bg-neon text-ink' : 'border border-white/20 text-slate-200'}`}>
              Doctor
            </button>
            <button type="button" onClick={() => changeRole('driver')} className={`rounded-full px-5 py-2 text-sm font-bold ${role === 'driver' ? 'bg-neon text-ink' : 'border border-white/20 text-slate-200'}`}>
              Ambulance Driver
            </button>
          </div>

          {['doctor', 'driver'].includes(role) && hospitals.length > 0 && (
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-200">Associated Hospital</span>
              <select
                name="hospitalId"
                value={form.hospitalId}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none transition focus:border-neon"
              >
                <option value="">Select approved hospital</option>
                {hospitals.map((hospital) => (
                  <option key={hospital._id} value={hospital._id}>
                    {hospital.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {['doctor', 'driver'].includes(role) && hospitals.length === 0 && (
            <p className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
              No approved hospitals are available right now. Ask your hospital admin to register and get approved first.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {Object.keys(activeTemplate).map((key) => {
              if (key === 'role') return null;
              if (['available', 'unavailableReason', 'activeHoursStart', 'activeHoursEnd'].includes(key)) return null;

              const isPassword = key === 'password';
              const type = isPassword ? 'password' : key === 'email' ? 'email' : 'text';

              if (['doctor', 'driver'].includes(role) && key === 'hospitalId') return null;

              if (key === 'hospitalName' && hospitals.length > 0) return null;

              if (key === 'driverBloodGroup') {
                return (
                  <label key={key} className="block space-y-2">
                    <span className="text-sm font-semibold capitalize text-slate-200">Driver Blood Group</span>
                    <select
                      name={key}
                      value={form[key] || ''}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none transition focus:border-neon"
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </label>
                );
              }

              return (
                <label key={key} className="block space-y-2">
                  <span className="text-sm font-semibold capitalize text-slate-200">
                    {key === 'homeAddress' ? 'Doctor Home Address' : key === 'buildingAddress' ? 'Building / House No.' : key === 'laneAddress' ? 'Lane / Area' : key === 'bloodGroup' ? 'Blood Group' : key === 'driverName' ? 'Driver Name' : key === 'hospitalName' ? 'Hospital Name' : key === 'lng' ? 'Longitude (Auto)' : key === 'lat' ? 'Latitude (Auto)' : key}
                  </span>
                  <input
                    type={type}
                    name={key}
                    value={form[key] || ''}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none transition focus:border-neon"
                  />
                </label>
              );
            })}
          </div>

          {role !== 'driver' && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-300">Location is fetched from browser permission so users do not need to enter coordinates manually.</p>
                <button
                  type="button"
                  onClick={fillLocationFromBrowser}
                  disabled={locating}
                  className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {locating ? 'Fetching location...' : 'Use Current Location'}
                </button>
              </div>
              {locationMessage && <p className="mt-2 text-xs text-cyan-200">{locationMessage}</p>}
            </div>
          )}

          {role === 'driver' && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-300">Driver registration can create ambulance profile with mapped hospital details.</p>
                <button
                  type="button"
                  onClick={fillLocationFromBrowser}
                  disabled={locating}
                  className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {locating ? 'Fetching location...' : 'Use Current Location'}
                </button>
              </div>
              {locationMessage && <p className="mt-2 text-xs text-cyan-200">{locationMessage}</p>}
            </div>
          )}

          {role === 'doctor' && (
            <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-200">Availability Status</span>
                <select
                  value={form.available ? 'present' : 'absent'}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      available: event.target.value === 'present',
                    }))
                  }
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none transition focus:border-neon"
                >
                  <option value="present">Present in Hospital</option>
                  <option value="absent">Not Present in Hospital</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-200">Reason if Not Present</span>
                <input
                  type="text"
                  value={form.unavailableReason}
                  onChange={(event) => setForm((prev) => ({ ...prev, unavailableReason: event.target.value }))}
                  required={!form.available}
                  placeholder="On leave, emergency round, etc."
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none transition focus:border-neon"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-200">Active From</span>
                <input
                  type="time"
                  value={form.activeHoursStart}
                  onChange={(event) => setForm((prev) => ({ ...prev, activeHoursStart: event.target.value }))}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none transition focus:border-neon"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-200">Active Until</span>
                <input
                  type="time"
                  value={form.activeHoursEnd}
                  onChange={(event) => setForm((prev) => ({ ...prev, activeHoursEnd: event.target.value }))}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none transition focus:border-neon"
                  required
                />
              </label>
            </div>
          )}

          {error && <p className="rounded-xl border border-coral/50 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-xl bg-neon px-4 py-3 text-sm font-black uppercase tracking-wider text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
