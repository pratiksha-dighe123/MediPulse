import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { apiFetch } from '../lib/api';
import { requestBrowserLocation } from '../lib/geolocation';

const initialForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  website: '',
  licenseNumber: '',
  beds: '',
  departments: '',
  building: '',
  lane: '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  lng: '',
  lat: '',
  description: '',
};

function HospitalRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');

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

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    fillLocationFromBrowser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await apiFetch('/hospitals/register', {
        method: 'POST',
        body: {
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          website: form.website,
          licenseNumber: form.licenseNumber,
          beds: Number(form.beds || 0),
          departments: form.departments
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          description: form.description,
          address: {
            building: form.building,
            lane: form.lane,
            street: form.street,
            city: form.city,
            state: form.state,
            zipCode: form.zipCode,
            country: form.country,
          },
          lng: Number(form.lng),
          lat: Number(form.lat),
        },
      });

      setMessage('Hospital registered successfully. Wait for admin approval before login.');
      setForm(initialForm);
      setTimeout(() => navigate('/login'), 1800);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <TopNav />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <form onSubmit={onSubmit} className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-8">
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">Hospital / Clinic Registration</h1>
            <p className="mt-2 text-sm text-slate-300">Register your institution. Access is enabled only after admin approval.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input name="name" value={form.name} onChange={onChange} placeholder="Hospital Name" required className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
            <input name="email" type="email" value={form.email} onChange={onChange} placeholder="Official Email" required className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
            <input name="password" type="password" value={form.password} onChange={onChange} placeholder="Password" required className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
            <input name="phone" value={form.phone} onChange={onChange} placeholder="Contact Number" required className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
            <input name="licenseNumber" value={form.licenseNumber} onChange={onChange} placeholder="License Number" required className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
            <input name="website" value={form.website} onChange={onChange} placeholder="Website" className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
            <input name="beds" type="number" value={form.beds} onChange={onChange} placeholder="Number of Beds" className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
            <input name="departments" value={form.departments} onChange={onChange} placeholder="Departments (comma separated)" className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
            <input name="building" value={form.building} onChange={onChange} placeholder="Building / House No." className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" required />
            <input name="lane" value={form.lane} onChange={onChange} placeholder="Lane / Area" className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" required />
            <input name="street" value={form.street} onChange={onChange} placeholder="Street" className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
            <input name="city" value={form.city} onChange={onChange} placeholder="City" className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
            <input name="state" value={form.state} onChange={onChange} placeholder="State" className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
            <input name="zipCode" value={form.zipCode} onChange={onChange} placeholder="Zip Code" className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
            <input name="country" value={form.country} onChange={onChange} placeholder="Country" className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
            <input name="lng" value={form.lng} onChange={onChange} placeholder="Longitude" required className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
            <input name="lat" value={form.lat} onChange={onChange} placeholder="Latitude" required className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-300">Allow browser location once and latitude/longitude will auto-fill here.</p>
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

          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            placeholder="Hospital description"
            className="h-28 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3"
          />

          {message && <p className="rounded-xl border border-neon/50 bg-neon/10 px-4 py-3 text-sm text-neon">{message}</p>}
          {error && <p className="rounded-xl border border-coral/50 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</p>}

          <button disabled={loading} className="rounded-xl bg-neon px-6 py-3 text-sm font-black text-ink">
            {loading ? 'Submitting...' : 'Register Hospital'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default HospitalRegisterPage;
