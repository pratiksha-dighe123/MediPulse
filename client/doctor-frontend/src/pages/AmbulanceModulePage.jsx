import { useEffect, useMemo, useState } from 'react';
import TopNav from '../components/TopNav';
import { apiFetch } from '../lib/api';
import { getAuthSession } from '../lib/auth';
import { requestBrowserLocation } from '../lib/geolocation';
import { getSmsHref, getTelHref } from '../lib/mobileActions';

const initialForm = {
  vehicleNumber: '',
  driverName: '',
  driverPhone: '',
  driverEmail: '',
  password: '',
  driverBloodGroup: '',
  address: '',
  hospitalId: '',
  status: 'AVAILABLE',
  isActive: true,
  lng: '',
  lat: '',
};

const initialEmergencyForm = {
  patientId: '',
  lng: '',
  lat: '',
};

function AmbulanceModulePage() {
  const session = getAuthSession();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const [hospitalFilter, setHospitalFilter] = useState('all');
  const [emergencyForm, setEmergencyForm] = useState(initialEmergencyForm);
  const [targetEmergencyId, setTargetEmergencyId] = useState('');
  const [form, setForm] = useState(initialForm);
  const [statusDrafts, setStatusDrafts] = useState({});
  const [locationDrafts, setLocationDrafts] = useState({});
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');

  const canManage = ['admin', 'hospital'].includes(session?.role || '');

  const loadHospitals = async () => {
    try {
      const result = await apiFetch('/hospitals');
      setHospitals(Array.isArray(result) ? result : []);
    } catch {
      setHospitals([]);
    }
  };

  const loadAmbulances = async () => {
    try {
      if (canManage && session?.token) {
        const result = await apiFetch('/api/ambulances', { token: session.token });
        const all = Array.isArray(result) ? result : [];
        const scoped = session?.role === 'hospital'
          ? all.filter((item) => {
              const hospitalId = typeof item?.hospitalId === 'object' ? item?.hospitalId?._id : item?.hospitalId;
              return String(hospitalId || '') === String(session?.id || '');
            })
          : all;
        setAmbulances(scoped);
        return;
      }

      const result = await apiFetch('/api/ambulances/public');
      setAmbulances(Array.isArray(result) ? result : []);
    } catch {
      setAmbulances([]);
    }
  };

  const loadEmergencyAlerts = async () => {
    if (!canManage || !session?.token) {
      setEmergencyAlerts([]);
      return;
    }

    try {
      const result = await apiFetch('/api/emergency/alerts/my?status=ALL', { token: session.token });
      setEmergencyAlerts(Array.isArray(result) ? result : []);
    } catch {
      setEmergencyAlerts([]);
    }
  };

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

  useEffect(() => {
    loadHospitals();
    loadAmbulances();
    loadEmergencyAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.role, session?.token]);

  useEffect(() => {
    fillLocationFromBrowser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => ({
    total: ambulances
      .filter((item) => {
        if (hospitalFilter === 'all') return true;
        const hospitalId = typeof item?.hospitalId === 'object' ? item?.hospitalId?._id : item?.hospitalId;
        return String(hospitalId || '') === String(hospitalFilter);
      })
      .length,
    available: ambulances
      .filter((item) => {
        if (hospitalFilter !== 'all') {
          const hospitalId = typeof item?.hospitalId === 'object' ? item?.hospitalId?._id : item?.hospitalId;
          if (String(hospitalId || '') !== String(hospitalFilter)) return false;
        }
        return item.status === 'AVAILABLE';
      })
      .length,
    busy: ambulances
      .filter((item) => {
        if (hospitalFilter !== 'all') {
          const hospitalId = typeof item?.hospitalId === 'object' ? item?.hospitalId?._id : item?.hospitalId;
          if (String(hospitalId || '') !== String(hospitalFilter)) return false;
        }
        return item.status === 'BUSY';
      })
      .length,
    offline: ambulances
      .filter((item) => {
        if (hospitalFilter !== 'all') {
          const hospitalId = typeof item?.hospitalId === 'object' ? item?.hospitalId?._id : item?.hospitalId;
          if (String(hospitalId || '') !== String(hospitalFilter)) return false;
        }
        return item.status === 'OFFLINE';
      })
      .length,
  }), [ambulances, hospitalFilter]);

  const filteredAmbulances = useMemo(() => {
    if (hospitalFilter === 'all') return ambulances;

    return ambulances.filter((item) => {
      const hospitalId = typeof item?.hospitalId === 'object' ? item?.hospitalId?._id : item?.hospitalId;
      return String(hospitalId || '') === String(hospitalFilter);
    });
  }, [ambulances, hospitalFilter]);

  const allocatedCasesByAmbulance = useMemo(() => {
    const result = {};

    emergencyAlerts.forEach((item) => {
      const ambulanceId = item?.ambulanceId?._id || item?.ambulanceId;
      if (!ambulanceId) return;

      if (!result[ambulanceId]) {
        result[ambulanceId] = [];
      }

      result[ambulanceId].push(item);
    });

    return result;
  }, [emergencyAlerts]);

  const submitRegistration = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!canManage || !session?.token) {
      setError('Only hospital/admin users can register ambulance. Please login with correct role.');
      return;
    }

    try {
      await apiFetch('/api/ambulances', {
        method: 'POST',
        token: session.token,
        body: {
          vehicleNumber: form.vehicleNumber,
          driverName: form.driverName,
          driverPhone: form.driverPhone,
          driverEmail: form.driverEmail,
          password: form.password,
          driverBloodGroup: form.driverBloodGroup,
          address: form.address,
          hospitalId: session?.role === 'hospital' ? session?.id : form.hospitalId,
          status: form.status,
          isActive: form.isActive,
          lng: Number(form.lng),
          lat: Number(form.lat),
        },
      });
      setMessage('Ambulance registered successfully.');
      setForm(initialForm);
      await loadAmbulances();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateStatus = async (ambulanceId, fallbackStatus) => {
    setError('');
    setMessage('');

    if (!canManage || !session?.token) {
      setError('Only hospital/admin users can update status.');
      return;
    }

    try {
      await apiFetch(`/api/ambulances/${ambulanceId}/status`, {
        method: 'PUT',
        token: session.token,
        body: {
          status: statusDrafts[ambulanceId] || fallbackStatus,
        },
      });
      setMessage('Ambulance status updated.');
      await loadAmbulances();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateLocation = async (ambulanceId, currentCoordinates) => {
    setError('');
    setMessage('');

    if (!canManage || !session?.token) {
      setError('Only hospital/admin users can update location.');
      return;
    }

    const draft = locationDrafts[ambulanceId] || {};
    const lng = Number(draft.lng ?? currentCoordinates?.[0]);
    const lat = Number(draft.lat ?? currentCoordinates?.[1]);

    try {
      await apiFetch(`/api/ambulances/${ambulanceId}/location`, {
        method: 'PUT',
        token: session.token,
        body: { lng, lat },
      });
      setMessage('Ambulance location updated.');
      await loadAmbulances();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const createEmergency = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!canManage || !session?.token) {
      setError('Only hospital/admin users can create emergency from this panel.');
      return;
    }

    try {
      const result = await apiFetch('/api/emergency', {
        method: 'POST',
        token: session.token,
        body: {
          patientId: emergencyForm.patientId,
          lng: Number(emergencyForm.lng),
          lat: Number(emergencyForm.lat),
        },
      });

      setTargetEmergencyId(result?.emergency?._id || '');
      setEmergencyForm(initialEmergencyForm);
      setMessage('Emergency created. You can assign nearest ambulance now.');
      await loadEmergencyAlerts();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const runEmergencyAction = async (actionPath, successMessage) => {
    setError('');
    setMessage('');

    if (!targetEmergencyId) {
      setError('Enter emergency ID first.');
      return;
    }

    try {
      await apiFetch(actionPath, {
        method: 'POST',
        token: session?.token,
      });

      setMessage(successMessage);
      await loadAmbulances();
      await loadEmergencyAlerts();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <TopNav />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/15 via-emerald-300/10 to-indigo-500/15 p-6">
          <h1 className="text-2xl font-black sm:text-3xl">Ambulance Operations</h1>
          <p className="mt-2 text-sm text-slate-200">
            One place to register ambulances, connect hospitals, and monitor fleet response status.
          </p>
          {!canManage && (
            <p className="mt-3 rounded-xl border border-amber-300/40 bg-amber-300/10 p-3 text-xs text-amber-100">
              You are in viewer mode. Login as hospital/admin to register and manage ambulances.
            </p>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Total Fleet</p>
            <p className="mt-2 text-3xl font-black">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4">
            <p className="text-xs uppercase tracking-wider text-emerald-200">Available</p>
            <p className="mt-2 text-3xl font-black text-emerald-100">{stats.available}</p>
          </div>
          <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
            <p className="text-xs uppercase tracking-wider text-amber-200">Busy</p>
            <p className="mt-2 text-3xl font-black text-amber-100">{stats.busy}</p>
          </div>
          <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4">
            <p className="text-xs uppercase tracking-wider text-rose-200">Offline</p>
            <p className="mt-2 text-3xl font-black text-rose-100">{stats.offline}</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={submitRegistration} className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h2 className="text-xl font-black">Register Ambulance</h2>
            <p className="mt-2 text-sm text-slate-300">Map a vehicle with all required profile details for emergency assignment.</p>
            <div className="mt-4 grid gap-3">
              <input
                className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                placeholder="Vehicle Number"
                value={form.vehicleNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, vehicleNumber: event.target.value }))}
                required
              />
              <input
                className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                placeholder="Driver Name"
                value={form.driverName}
                onChange={(event) => setForm((prev) => ({ ...prev, driverName: event.target.value }))}
                required
              />
              <input
                className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                placeholder="Driver Phone"
                value={form.driverPhone}
                onChange={(event) => setForm((prev) => ({ ...prev, driverPhone: event.target.value }))}
                required
              />
              <input
                type="email"
                className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                placeholder="Driver Login Email"
                value={form.driverEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, driverEmail: event.target.value }))}
                required
              />
              <input
                type="password"
                className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                placeholder="Driver Login Password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
              <select
                className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                value={form.driverBloodGroup}
                onChange={(event) => setForm((prev) => ({ ...prev, driverBloodGroup: event.target.value }))}
                required
              >
                <option value="">Select Driver Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              <input
                className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                placeholder="Ambulance Base Address"
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              />
              <select
                value={session?.role === 'hospital' ? session?.id : form.hospitalId}
                onChange={(event) => setForm((prev) => ({ ...prev, hospitalId: event.target.value }))}
                className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm"
                required
                disabled={session?.role === 'hospital'}
              >
                <option value="">Select hospital</option>
                {hospitals.map((hospital) => (
                  <option key={hospital._id} value={hospital._id}>
                    {hospital.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="BUSY">BUSY</option>
                  <option value="OFFLINE">OFFLINE</option>
                </select>
                <select
                  className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                  value={form.isActive ? 'true' : 'false'}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.value === 'true' }))}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                  placeholder="Longitude"
                  value={form.lng}
                  onChange={(event) => setForm((prev) => ({ ...prev, lng: event.target.value }))}
                  required
                />
                <input
                  className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                  placeholder="Latitude"
                  value={form.lat}
                  onChange={(event) => setForm((prev) => ({ ...prev, lat: event.target.value }))}
                  required
                />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-300">Allow browser location to auto-fill ambulance coordinates.</p>
                  <button
                    type="button"
                    onClick={fillLocationFromBrowser}
                    disabled={locating}
                    className="rounded-lg border border-white/20 px-2 py-1 text-[11px] font-bold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {locating ? 'Fetching...' : 'Use Current Location'}
                  </button>
                </div>
                {locationMessage && <p className="mt-2 text-xs text-cyan-200">{locationMessage}</p>}
              </div>
              <button
                type="submit"
                className="mt-2 h-11 rounded-xl bg-neon px-4 text-sm font-black uppercase tracking-wider text-ink transition hover:brightness-110"
              >
                Register Ambulance
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
            {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
          </form>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h2 className="text-xl font-black">Fleet Details</h2>
            <p className="mt-2 text-sm text-slate-300">All registered ambulances with hospital mapping, live controls, and allocated cases.</p>
            <div className="mt-4">
              <select
                value={hospitalFilter}
                onChange={(event) => setHospitalFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-white/20 bg-white/5 px-3 text-sm sm:w-72"
              >
                <option value="all">All Hospitals</option>
                {hospitals.map((hospital) => (
                  <option key={hospital._id} value={hospital._id}>
                    {hospital.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 space-y-3">
              {filteredAmbulances.length === 0 && <p className="text-sm text-slate-400">No ambulances found.</p>}
              {filteredAmbulances.map((item) => {
                const hospitalName = typeof item.hospitalId === 'object' ? item.hospitalId?.name : item.hospitalId;
                const coordinates = item?.location?.coordinates || [];
                const locationDraft = locationDrafts[item._id] || {
                  lng: coordinates?.[0] ?? '',
                  lat: coordinates?.[1] ?? '',
                };
                const casesForAmbulance = allocatedCasesByAmbulance[item._id] || [];

                return (
                  <article key={item._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black">{item.vehicleNumber}</h3>
                        <p className="text-sm text-slate-200">{item.driverName} • {item.driverPhone}</p>
                        <p className="text-xs text-slate-300">Driver Login: {item.driverEmail || '-'}</p>
                        <p className="text-xs text-slate-300">Driver Blood Group: {item.driverBloodGroup || '-'}</p>
                        <p className="mt-1 text-xs text-slate-400">Hospital: {hospitalName || 'Not mapped'}</p>
                        <p className="text-xs text-slate-400">Address: {item.address || 'N/A'}</p>
                        <p className="text-xs text-slate-400">Location: {coordinates[0] ?? '-'}, {coordinates[1] ?? '-'}</p>
                        <p className="text-xs text-slate-400">Active: {item.isActive ? 'Yes' : 'No'}</p>
                        <p className="mt-2 text-xs font-bold text-cyan-200">Allocated Cases: {casesForAmbulance.length}</p>
                      </div>
                      <div className="flex min-w-[140px] flex-col gap-2">
                        <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-center text-xs font-bold text-cyan-200">
                          {item.status}
                        </span>
                        {canManage && (
                          <>
                            <select
                              value={statusDrafts[item._id] || item.status}
                              onChange={(event) =>
                                setStatusDrafts((prev) => ({
                                  ...prev,
                                  [item._id]: event.target.value,
                                }))
                              }
                              className="h-9 rounded-lg border border-white/20 bg-white/5 px-2 text-xs"
                            >
                              <option value="AVAILABLE">AVAILABLE</option>
                              <option value="BUSY">BUSY</option>
                              <option value="OFFLINE">OFFLINE</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => updateStatus(item._id, item.status)}
                              className="h-9 rounded-lg border border-white/20 px-2 text-xs font-bold transition hover:bg-white/10"
                            >
                              Update Status
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                              <input
                                value={locationDraft.lng}
                                onChange={(event) =>
                                  setLocationDrafts((prev) => ({
                                    ...prev,
                                    [item._id]: {
                                      ...(prev[item._id] || {}),
                                      lng: event.target.value,
                                    },
                                  }))
                                }
                                className="h-9 rounded-lg border border-white/20 bg-white/5 px-2 text-xs"
                                placeholder="Lng"
                              />
                              <input
                                value={locationDraft.lat}
                                onChange={(event) =>
                                  setLocationDrafts((prev) => ({
                                    ...prev,
                                    [item._id]: {
                                      ...(prev[item._id] || {}),
                                      lat: event.target.value,
                                    },
                                  }))
                                }
                                className="h-9 rounded-lg border border-white/20 bg-white/5 px-2 text-xs"
                                placeholder="Lat"
                              />
                              <button
                                type="button"
                                onClick={() => updateLocation(item._id, coordinates)}
                                className="col-span-2 h-9 rounded-lg border border-white/20 px-2 text-xs font-bold transition hover:bg-white/10"
                              >
                                Update Location
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {casesForAmbulance.length > 0 ? (
                        casesForAmbulance.map((caseItem) => (
                          <div key={caseItem._id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="text-xs font-bold text-slate-100">Case: {caseItem._id}</p>
                            <p className="text-xs text-slate-300">Status: {caseItem.status || 'PENDING'}</p>
                            <p className="text-xs text-slate-300">Patient: {caseItem?.patientSnapshot?.name || caseItem?.patientId?.name || 'Unknown'}</p>
                            <p className="text-xs text-slate-300">Contact: {caseItem?.patientSnapshot?.contactNumber || caseItem?.patientId?.contactNumber || 'N/A'}</p>
                            <p className="text-xs text-slate-300">Address: {caseItem?.patientSnapshot?.address || caseItem?.patientId?.address || 'N/A'}</p>
                            <p className="text-xs text-slate-400">
                              Incident Location: {caseItem?.location?.coordinates?.[0] ?? '-'}, {caseItem?.location?.coordinates?.[1] ?? '-'}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No allocated cases.</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {canManage && (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h2 className="text-xl font-black">Emergency Dispatch</h2>
            <p className="mt-2 text-sm text-slate-300">Create emergency and run assignment flow from this module.</p>

            <form onSubmit={createEmergency} className="mt-4 grid gap-3 md:max-w-xl">
              <input
                className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                placeholder="Patient ID"
                value={emergencyForm.patientId}
                onChange={(event) => setEmergencyForm((prev) => ({ ...prev, patientId: event.target.value }))}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                  placeholder="Longitude"
                  value={emergencyForm.lng}
                  onChange={(event) => setEmergencyForm((prev) => ({ ...prev, lng: event.target.value }))}
                  required
                />
                <input
                  className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                  placeholder="Latitude"
                  value={emergencyForm.lat}
                  onChange={(event) => setEmergencyForm((prev) => ({ ...prev, lat: event.target.value }))}
                  required
                />
              </div>
              <button
                type="submit"
                className="h-11 rounded-xl bg-neon px-4 text-sm font-black uppercase tracking-wider text-ink transition hover:brightness-110"
              >
                Create Emergency
              </button>
            </form>

            <div className="mt-5 grid gap-3 md:max-w-xl">
              <input
                className="h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-sm outline-none focus:border-neon/70"
                placeholder="Emergency ID"
                value={targetEmergencyId}
                onChange={(event) => setTargetEmergencyId(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => runEmergencyAction(`/api/emergency/${targetEmergencyId}/assign`, 'Nearest ambulance assigned.')}
                  className="h-10 rounded-lg border border-cyan-300/50 bg-cyan-300/20 px-2 text-xs font-bold text-cyan-100"
                >
                  Assign Nearest
                </button>
                <button
                  type="button"
                  onClick={() => runEmergencyAction(`/api/emergency/${targetEmergencyId}/accept`, 'Emergency accepted.')}
                  className="h-10 rounded-lg border border-amber-300/50 bg-amber-300/20 px-2 text-xs font-bold text-amber-100"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => runEmergencyAction(`/api/emergency/${targetEmergencyId}/complete`, 'Emergency completed.')}
                  className="h-10 rounded-lg border border-emerald-300/50 bg-emerald-300/20 px-2 text-xs font-bold text-emerald-100"
                >
                  Complete
                </button>
                <button
                  type="button"
                  onClick={() => runEmergencyAction(`/api/emergency/${targetEmergencyId}/cancel`, 'Emergency cancelled.')}
                  className="h-10 rounded-lg border border-rose-300/50 bg-rose-300/20 px-2 text-xs font-bold text-rose-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}

        {canManage && (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h2 className="text-xl font-black">Allocated Emergency Cases</h2>
            <p className="mt-2 text-sm text-slate-300">All allocated cases with quick patient/driver contact actions and case context.</p>

            <div className="mt-4 space-y-3">
              {emergencyAlerts.map((alert) => {
                const patientCallHref = getTelHref(alert.patientSnapshot?.contactNumber || alert.patientId?.contactNumber);
                const patientSmsHref = getSmsHref(
                  alert.patientSnapshot?.contactNumber || alert.patientId?.contactNumber,
                  `Emergency response team here. Please confirm your exact location for incident ${alert._id}.`
                );
                const driverCallHref = getTelHref(alert.ambulanceId?.driverPhone);
                const driverSmsHref = getSmsHref(
                  alert.ambulanceId?.driverPhone,
                  `Emergency dispatch reminder: patient ${alert.patientSnapshot?.name || alert.patientId?.name || 'Patient'} needs immediate response.`
                );

                return (
                  <article key={alert._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-100">{alert.patientSnapshot?.name || alert.patientId?.name || 'Patient'}</p>
                      <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                        {String(alert.status || 'PENDING').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">Case ID: {alert._id}</p>
                    <p className="text-xs text-slate-300">Blood Group: {alert.patientSnapshot?.bloodGroup || alert.patientId?.bloodGroup || '-'}</p>
                    <p className="text-xs text-slate-300">Address: {alert.patientSnapshot?.address || alert.patientId?.address || '-'}</p>
                    <p className="text-xs text-slate-300">Hospital: {alert.hospitalId?.name || '-'}</p>
                    <p className="text-xs text-slate-300">Doctor: {alert.doctorId?.name || '-'}</p>
                    <p className="text-xs text-slate-300">Driver: {alert.ambulanceId?.driverName || '-'} ({alert.ambulanceId?.vehicleNumber || '-'})</p>
                    <p className="text-xs text-slate-400">Created: {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '-'}</p>
                    <p className="text-xs text-slate-400">
                      Incident Location: {alert?.location?.coordinates?.[0] ?? '-'}, {alert?.location?.coordinates?.[1] ?? '-'}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {patientCallHref && (
                        <a href={patientCallHref} className="rounded-lg border border-emerald-300/50 bg-emerald-300/20 px-2 py-1 text-[11px] font-bold text-emerald-100">
                          Call Patient
                        </a>
                      )}

                      {patientSmsHref && (
                        <a href={patientSmsHref} className="rounded-lg border border-blue-300/50 bg-blue-300/20 px-2 py-1 text-[11px] font-bold text-blue-100">
                          SMS Patient
                        </a>
                      )}

                      {driverCallHref && (
                        <a href={driverCallHref} className="rounded-lg border border-cyan-300/50 bg-cyan-300/20 px-2 py-1 text-[11px] font-bold text-cyan-100">
                          Call Driver
                        </a>
                      )}

                      {driverSmsHref && (
                        <a href={driverSmsHref} className="rounded-lg border border-indigo-300/50 bg-indigo-300/20 px-2 py-1 text-[11px] font-bold text-indigo-100">
                          SMS Driver
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}

              {emergencyAlerts.length === 0 && (
                <p className="text-sm text-slate-400">No allocated emergency cases at the moment.</p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default AmbulanceModulePage;