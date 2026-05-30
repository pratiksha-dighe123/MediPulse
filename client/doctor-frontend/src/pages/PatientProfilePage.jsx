import { useEffect, useState } from 'react';
import TopNav from '../components/TopNav';
import { apiFetch } from '../lib/api';
import { getAuthSession } from '../lib/auth';
import { requestBrowserLocation, reverseGeocodeCoordinates } from '../lib/geolocation';

function PatientProfilePage() {
  const session = getAuthSession();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [placeName, setPlaceName] = useState('');

  const fillLocationFromBrowser = async () => {
    setLocating(true);
    setLocationMessage('Requesting location permission...');

    try {
      const coords = await requestBrowserLocation();
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lng: coords.lng,
          lat: coords.lat,
        };
      });
      try {
        const resolvedPlace = await reverseGeocodeCoordinates(coords.lng, coords.lat);
        setPlaceName(resolvedPlace || 'Place not found');
      } catch {
        setPlaceName('Place not found');
      }
      setLocationMessage('Location auto-filled from your browser.');
    } catch (requestError) {
      setLocationMessage(requestError.message);
    } finally {
      setLocating(false);
    }
  };

  const loadProfile = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await apiFetch(`/patients/${session.id}`, { token: session.token });
      setProfile({
        ...result,
        lng: result.geoLocation?.coordinates?.[0] ?? '',
        lat: result.geoLocation?.coordinates?.[1] ?? '',
        bloodGroup: result.bloodGroup || '',
        buildingAddress: result.buildingAddress || '',
        laneAddress: result.laneAddress || '',
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!profile) return;

    const hasCoords = Number.isFinite(Number(profile.lng)) && Number.isFinite(Number(profile.lat));
    if (!hasCoords) {
      fillLocationFromBrowser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    const lng = Number(profile.lng);
    const lat = Number(profile.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      setPlaceName('');
      return;
    }

    let isCancelled = false;

    reverseGeocodeCoordinates(lng, lat)
      .then((resolvedPlace) => {
        if (!isCancelled) {
          setPlaceName(resolvedPlace || 'Place not found');
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setPlaceName('Place not found');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [profile?.lng, profile?.lat]);

  const updateProfile = async (event) => {
    event.preventDefault();
    if (!profile) return;

    setMessage('');
    setError('');

    try {
      await apiFetch(`/patients/${session.id}`, {
        method: 'PUT',
        token: session.token,
        body: {
          name: profile.name,
          age: Number(profile.age),
          contactNumber: profile.contactNumber,
          bloodGroup: profile.bloodGroup,
          address: profile.address,
          buildingAddress: profile.buildingAddress,
          laneAddress: profile.laneAddress,
          lng: Number(profile.lng),
          lat: Number(profile.lat),
        },
      });

      setMessage('Profile updated successfully');
      await loadProfile();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <h1 className="text-2xl font-black sm:text-3xl">My Profile</h1>
          <p className="mt-2 text-sm text-slate-300">Manage personal information used for appointment records.</p>

          {loading && <p className="mt-6 text-slate-300">Loading profile...</p>}

          {!loading && profile && (
            <form onSubmit={updateProfile} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Name</span>
                <input value={profile.name || ''} onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3" required />
              </label>

              <label className="space-y-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Age</span>
                <input type="number" min="0" value={profile.age || ''} onChange={(event) => setProfile((prev) => ({ ...prev, age: event.target.value }))} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3" required />
              </label>

              <label className="space-y-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Contact Number</span>
                <input value={profile.contactNumber || ''} onChange={(event) => setProfile((prev) => ({ ...prev, contactNumber: event.target.value }))} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3" required />
              </label>

              <label className="space-y-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Address</span>
                <input value={profile.address || ''} onChange={(event) => setProfile((prev) => ({ ...prev, address: event.target.value }))} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3" required />
              </label>

              <label className="space-y-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Building / House No.</span>
                <input value={profile.buildingAddress || ''} onChange={(event) => setProfile((prev) => ({ ...prev, buildingAddress: event.target.value }))} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3" required />
              </label>

              <label className="space-y-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Lane / Area</span>
                <input value={profile.laneAddress || ''} onChange={(event) => setProfile((prev) => ({ ...prev, laneAddress: event.target.value }))} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3" required />
              </label>

              <label className="space-y-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Blood Group</span>
                <input value={profile.bloodGroup || ''} onChange={(event) => setProfile((prev) => ({ ...prev, bloodGroup: event.target.value.toUpperCase() }))} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3" required />
              </label>

              <label className="space-y-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Longitude</span>
                <input value={profile.lng ?? ''} onChange={(event) => setProfile((prev) => ({ ...prev, lng: event.target.value }))} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3" required />
              </label>

              <label className="space-y-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Latitude</span>
                <input value={profile.lat ?? ''} onChange={(event) => setProfile((prev) => ({ ...prev, lat: event.target.value }))} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3" required />
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Detected Place Name</span>
                <input value={placeName} readOnly className="w-full rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100" placeholder="Place will appear from latitude/longitude" />
              </label>

              <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-300">Allow browser location to auto-fill latitude and longitude.</p>
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

              <div className="sm:col-span-2">
                <button className="rounded-xl bg-neon px-5 py-3 text-sm font-black uppercase tracking-wider text-ink">Save Profile</button>
              </div>
            </form>
          )}

          {message && <p className="mt-4 rounded-xl border border-neon/50 bg-neon/10 px-3 py-2 text-sm text-neon">{message}</p>}
          {error && <p className="mt-4 rounded-xl border border-coral/50 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
        </section>
      </main>
    </div>
  );
}

export default PatientProfilePage;
