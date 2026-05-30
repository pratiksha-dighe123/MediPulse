import { useEffect, useMemo, useState } from 'react';
import TopNav from '../components/TopNav';
import { apiFetch } from '../lib/api';
import { getAuthSession } from '../lib/auth';
import { getSmsHref, getTelHref } from '../lib/mobileActions';
import { requestBrowserLocation } from '../lib/geolocation';
import { useSocket } from '../lib/useSocket';

const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const doctorInitial = {
  name: '',
  email: '',
  age: '',
  contactNumber: '',
  bloodGroup: '',
  password: '',
  specialization: '',
  experience: '',
  homeAddress: '',
  buildingAddress: '',
  laneAddress: '',
  lng: '',
  lat: '',
  licenseNumber: '',
};

const patientInitial = {
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

const formatCurrency = (amount) => {
  const value = Number(amount || 0);
  return `Rs ${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

function HospitalDashboardPage() {
  const session = getAuthSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [doctorForm, setDoctorForm] = useState(doctorInitial);
  const [patientForm, setPatientForm] = useState(patientInitial);
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const [statusUpdatingAlertId, setStatusUpdatingAlertId] = useState('');
  const [removingAlertId, setRemovingAlertId] = useState('');
  const [donorSearchGroup, setDonorSearchGroup] = useState('O+');
  const [donorSearchRadius, setDonorSearchRadius] = useState('10000');
  const [donorSearchLoading, setDonorSearchLoading] = useState(false);
  const [donorSearchResults, setDonorSearchResults] = useState([]);
  const [donorSearchError, setDonorSearchError] = useState('');
  const { on } = useSocket();

  const loadDashboard = async () => {
    try {
      const result = await apiFetch('/hospitals/me/dashboard', { token: session?.token });
      setData(result);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [session?.token]);

  const loadEmergencyAlerts = async () => {
    try {
      const result = await apiFetch('/api/emergency/alerts/my?status=ALL', { token: session?.token });
      setEmergencyAlerts(Array.isArray(result) ? result : []);
    } catch {
      setEmergencyAlerts([]);
    }
  };

  useEffect(() => {
    loadEmergencyAlerts();

    const intervalHandle = setInterval(() => {
      loadEmergencyAlerts();
    }, 10000);

    return () => clearInterval(intervalHandle);
  }, [session?.token]);

  useEffect(() => {
    const offHospitalStatus = on?.('emergency:statusChangedHospital', () => {
      loadEmergencyAlerts();
    });

    const offGlobalStatus = on?.('emergency:statusChanged', () => {
      loadEmergencyAlerts();
    });

    const offNewAlert = on?.('emergency:newAlert', () => {
      loadEmergencyAlerts();
    });

    return () => {
      if (typeof offHospitalStatus === 'function') offHospitalStatus();
      if (typeof offGlobalStatus === 'function') offGlobalStatus();
      if (typeof offNewAlert === 'function') offNewAlert();
    };
  }, [on, session?.id]);

  const visitedPatients = useMemo(() => {
    if (!data?.appointments) return [];
    return data.appointments.filter((appointment) => appointment.status === 'completed');
  }, [data]);

  const createDoctor = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await apiFetch('/doctors', {
        method: 'POST',
        token: session?.token,
        body: {
          ...doctorForm,
          age: Number(doctorForm.age),
          experience: Number(doctorForm.experience),
        },
      });

      setDoctorForm(doctorInitial);
      setMessage('Doctor created successfully');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const createPatient = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await apiFetch('/patients', {
        method: 'POST',
        token: session?.token,
        body: {
          ...patientForm,
          age: Number(patientForm.age),
        },
      });

      setPatientForm(patientInitial);
      setMessage('Patient created successfully');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateDoctorApproval = async (doctorId, action) => {
    setError('');
    setMessage('');

    try {
      await apiFetch(`/doctors/${doctorId}/${action}`, {
        method: 'PATCH',
        token: session?.token,
      });
      setMessage(`Doctor ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const editDoctor = async (doctor) => {
    const name = window.prompt('Doctor name', doctor.name);
    if (!name) return;

    const specialization = window.prompt('Specialization', doctor.specialization || '');
    if (!specialization) return;

    const contactNumber = window.prompt('Contact number', doctor.contactNumber || '');
    if (!contactNumber) return;

    const bloodGroup = window.prompt('Blood group', doctor.bloodGroup || '');
    if (!bloodGroup) return;

    const buildingAddress = window.prompt('Building / House No.', doctor.buildingAddress || '');
    if (!buildingAddress) return;

    const laneAddress = window.prompt('Lane / Area', doctor.laneAddress || '');
    if (!laneAddress) return;

    try {
      await apiFetch(`/doctors/${doctor._id}`, {
        method: 'PUT',
        token: session?.token,
        body: {
          name,
          specialization,
          contactNumber,
          contact: contactNumber,
          bloodGroup,
          buildingAddress,
          laneAddress,
        },
      });
      setMessage('Doctor updated successfully');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteDoctor = async (doctorId) => {
    if (!window.confirm('Delete this doctor?')) return;

    try {
      await apiFetch(`/doctors/${doctorId}`, {
        method: 'DELETE',
        token: session?.token,
      });
      setMessage('Doctor deleted successfully');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const editPatient = async (patient) => {
    const name = window.prompt('Patient name', patient.name);
    if (!name) return;

    const contactNumber = window.prompt('Contact number', patient.contactNumber || '');
    if (!contactNumber) return;

    const address = window.prompt('Address', patient.address || '');
    if (!address) return;

    const bloodGroup = window.prompt('Blood group', patient.bloodGroup || '');
    if (!bloodGroup) return;

    const buildingAddress = window.prompt('Building / House No.', patient.buildingAddress || '');
    if (!buildingAddress) return;

    const laneAddress = window.prompt('Lane / Area', patient.laneAddress || '');
    if (!laneAddress) return;

    try {
      await apiFetch(`/patients/${patient._id}`, {
        method: 'PUT',
        token: session?.token,
        body: {
          name,
          contactNumber,
          address,
          bloodGroup,
          buildingAddress,
          laneAddress,
        },
      });
      setMessage('Patient updated successfully');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deletePatient = async (patientId) => {
    if (!window.confirm('Delete this patient?')) return;

    try {
      await apiFetch(`/patients/${patientId}`, {
        method: 'DELETE',
        token: session?.token,
      });
      setMessage('Patient deleted successfully');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateEmergencyStatus = async (alertId, action) => {
    setError('');
    setMessage('');
    setStatusUpdatingAlertId(alertId);

    try {
      const result = await apiFetch(`/api/emergency/${alertId}/${action}`, {
        method: 'POST',
        token: session?.token,
      });

      setMessage(result?.message || 'Emergency status updated.');
      await loadEmergencyAlerts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setStatusUpdatingAlertId('');
    }
  };

  const removeCompletedAlert = async (alertId) => {
    setError('');
    setMessage('');
    setRemovingAlertId(alertId);

    try {
      const result = await apiFetch(`/api/emergency/${alertId}`, {
        method: 'DELETE',
        token: session?.token,
      });

      setMessage(result?.message || 'Emergency alert removed.');
      setEmergencyAlerts((prev) => prev.filter((item) => item._id !== alertId));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRemovingAlertId('');
    }
  };

  const getEmergencyStatusMeta = (status) => {
    if (status === 'ACCEPTED') {
      return {
        label: 'IN PROCESS',
        className: 'border-amber-300/50 bg-amber-300/20 text-amber-100',
      };
    }

    if (status === 'COMPLETED') {
      return {
        label: 'SUCCESSFULLY COMPLETED',
        className: 'border-emerald-300/50 bg-emerald-300/20 text-emerald-100',
      };
    }

    if (status === 'CANCELLED') {
      return {
        label: 'CANCELLED',
        className: 'border-rose-300/50 bg-rose-300/20 text-rose-100',
      };
    }

    return {
      label: 'PENDING',
      className: 'border-cyan-300/50 bg-cyan-300/20 text-cyan-100',
    };
  };

  const searchNearbyBloodDonors = async () => {
    setDonorSearchError('');
    setDonorSearchLoading(true);

    try {
      const liveCoords = await requestBrowserLocation();
      const lng = Number(liveCoords?.lng);
      const lat = Number(liveCoords?.lat);

      const result = await apiFetch(
        `/api/donors/search?group=${encodeURIComponent(donorSearchGroup)}&lng=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}&radius=${encodeURIComponent(donorSearchRadius)}`,
        { token: session?.token }
      );

      setDonorSearchResults(Array.isArray(result?.data) ? result.data : []);
    } catch (requestError) {
      setDonorSearchResults([]);
      setDonorSearchError(requestError.message || 'Unable to search donors right now.');
    } finally {
      setDonorSearchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <TopNav />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        {!data && !error && <p className="text-slate-300">Loading hospital dashboard...</p>}
        {error && <p className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-coral">{error}</p>}
        {message && <p className="rounded-xl border border-neon/40 bg-neon/10 px-4 py-3 text-neon">{message}</p>}

        {data && (
          <>
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
              <h1 className="text-2xl font-black sm:text-3xl">{data.hospital?.name} Dashboard</h1>
              <p className="mt-2 text-sm text-slate-300">Manage your doctors, patients, and hospital activity.</p>
              <p className="mt-1 text-xs text-slate-300">
                Address: {[
                  data.hospital?.address?.building,
                  data.hospital?.address?.lane,
                  data.hospital?.address?.street,
                  data.hospital?.address?.city,
                  data.hospital?.address?.state,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Not provided'}
              </p>

              <div className="mt-5 rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4">
                <h2 className="text-lg font-black text-rose-100">Latest Emergency Alerts</h2>
                <p className="mt-1 text-xs text-rose-100/90">Latest incidents with status and action controls.</p>

                <div className="mt-3 space-y-2">
                  {emergencyAlerts.slice(0, 5).map((alert) => (
                    <article key={alert._id} className="rounded-xl border border-white/20 bg-white/10 p-3">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-white">{alert.patientSnapshot?.name || alert.patientId?.name || 'Patient'}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${getEmergencyStatusMeta(alert.status).className}`}>
                          {getEmergencyStatusMeta(alert.status).label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200">Blood Group: {alert.patientSnapshot?.bloodGroup || alert.patientId?.bloodGroup || '-'}</p>
                      <p className="text-xs text-slate-200">Contact: {alert.patientSnapshot?.contactNumber || alert.patientId?.contactNumber || '-'}</p>
                      <p className="text-xs text-slate-200">Address: {alert.patientSnapshot?.address || alert.patientId?.address || '-'}</p>
                      <p className="mt-1 text-xs text-slate-200">Ambulance: {alert.ambulanceId?.vehicleNumber || '-'}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {getTelHref(alert.patientSnapshot?.contactNumber || alert.patientId?.contactNumber) && (
                          <a
                            href={getTelHref(alert.patientSnapshot?.contactNumber || alert.patientId?.contactNumber)}
                            className="rounded-lg border border-emerald-300/50 bg-emerald-300/20 px-2 py-1 text-[11px] font-bold text-emerald-100"
                          >
                            Call Patient
                          </a>
                        )}

                        {getSmsHref(
                          alert.patientSnapshot?.contactNumber || alert.patientId?.contactNumber,
                          `Emergency verification from ${data?.hospital?.name || 'Hospital'}: We received your emergency request. Please share landmark/location now.`
                        ) && (
                          <a
                            href={getSmsHref(
                              alert.patientSnapshot?.contactNumber || alert.patientId?.contactNumber,
                              `Emergency verification from ${data?.hospital?.name || 'Hospital'}: We received your emergency request. Please share landmark/location now.`
                            )}
                            className="rounded-lg border border-blue-300/50 bg-blue-300/20 px-2 py-1 text-[11px] font-bold text-blue-100"
                          >
                            SMS Patient
                          </a>
                        )}

                        {Array.isArray(alert?.location?.coordinates) && alert.location.coordinates.length === 2 && (
                          <a
                            href={`https://www.google.com/maps?q=${alert.location.coordinates[1]},${alert.location.coordinates[0]}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-fuchsia-300/50 bg-fuchsia-300/20 px-2 py-1 text-[11px] font-bold text-fuchsia-100"
                          >
                            Track Incident
                          </a>
                        )}

                        {alert.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => updateEmergencyStatus(alert._id, 'accept')}
                            disabled={statusUpdatingAlertId === alert._id}
                            className="rounded-lg border border-amber-300/50 bg-amber-300/20 px-2 py-1 text-[11px] font-bold text-amber-100 disabled:opacity-70"
                          >
                            {statusUpdatingAlertId === alert._id ? 'Updating...' : 'Mark In Process'}
                          </button>
                        )}

                        {alert.status === 'ACCEPTED' && (
                          <button
                            type="button"
                            onClick={() => updateEmergencyStatus(alert._id, 'complete')}
                            disabled={statusUpdatingAlertId === alert._id}
                            className="rounded-lg border border-emerald-300/50 bg-emerald-300/20 px-2 py-1 text-[11px] font-bold text-emerald-100 disabled:opacity-70"
                          >
                            {statusUpdatingAlertId === alert._id ? 'Updating...' : 'Mark Completed'}
                          </button>
                        )}

                        {(alert.status === 'COMPLETED' || alert.status === 'CANCELLED') && (
                          <button
                            type="button"
                            onClick={() => removeCompletedAlert(alert._id)}
                            disabled={removingAlertId === alert._id}
                            className="rounded-lg border border-rose-300/50 bg-rose-300/20 px-2 py-1 text-[11px] font-bold text-rose-100 disabled:opacity-70"
                          >
                            {removingAlertId === alert._id ? 'Removing...' : 'Remove Alert'}
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                  {emergencyAlerts.length === 0 && <p className="text-xs text-slate-200">No latest emergency alerts right now.</p>}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-red-300/30 bg-red-300/10 p-4">
                <h2 className="text-lg font-black text-red-100">Emergency Blood Donor Search</h2>
                <p className="mt-1 text-xs text-red-100/90">Find nearest matching blood-group donors around hospital live location.</p>

                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <select
                    value={donorSearchGroup}
                    onChange={(event) => setDonorSearchGroup(event.target.value)}
                    className="rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-xs"
                  >
                    {BLOOD_GROUP_OPTIONS.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                  <input
                    value={donorSearchRadius}
                    onChange={(event) => setDonorSearchRadius(event.target.value)}
                    placeholder="Radius (meters)"
                    className="rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={searchNearbyBloodDonors}
                    disabled={donorSearchLoading}
                    className="rounded-lg border border-red-300/50 bg-red-300/20 px-3 py-2 text-xs font-bold text-red-100 disabled:opacity-60"
                  >
                    {donorSearchLoading ? 'Searching...' : 'Search Nearby'}
                  </button>
                </div>

                {donorSearchError && <p className="mt-2 text-xs text-coral">{donorSearchError}</p>}

                <div className="mt-3 space-y-2">
                  {donorSearchResults.slice(0, 12).map((item, index) => (
                    <article key={`${item.role}-${item.phone}-${index}`} className="rounded-lg border border-white/15 bg-white/10 p-2">
                      <p className="text-xs font-bold text-white">{item.name} <span className="text-slate-300">({item.role})</span></p>
                      <p className="text-[11px] text-slate-200">Phone: {item.phone || '-'}</p>
                      <p className="text-[11px] text-slate-200">Distance: {Number.isFinite(item.distanceInMeters) ? `${Math.round(item.distanceInMeters)} m` : 'N/A'}</p>
                      {Array.isArray(item?.location?.coordinates) && item.location.coordinates.length === 2 && (
                        <a
                          href={`https://www.google.com/maps?q=${item.location.coordinates[1]},${item.location.coordinates[0]}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex rounded-lg border border-fuchsia-300/50 bg-fuchsia-300/20 px-2 py-1 text-[10px] font-bold text-fuchsia-100"
                        >
                          Track Donor
                        </a>
                      )}
                    </article>
                  ))}
                  {donorSearchResults.length === 0 && !donorSearchLoading && <p className="text-xs text-slate-200">No matching donors found in this radius.</p>}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase text-slate-400">Doctors</p>
                  <p className="mt-2 text-2xl font-black sm:text-3xl">{data.stats?.totalDoctors || 0}</p>
                </div>
                <div className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4">
                  <p className="text-xs uppercase text-emerald-200">Approved Doctors</p>
                  <p className="mt-2 text-2xl font-black text-emerald-100 sm:text-3xl">{data.stats?.approvedDoctors || 0}</p>
                </div>
                <div className="rounded-xl border border-blue-300/30 bg-blue-300/10 p-4">
                  <p className="text-xs uppercase text-blue-200">Visited Patients</p>
                  <p className="mt-2 text-2xl font-black text-blue-100 sm:text-3xl">{data.stats?.totalPatientsVisited || 0}</p>
                </div>
                <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4">
                  <p className="text-xs uppercase text-amber-200">Total Appointments</p>
                  <p className="mt-2 text-2xl font-black text-amber-100 sm:text-3xl">{data.stats?.totalAppointments || 0}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4">
                  <p className="text-xs uppercase text-emerald-200">Today Revenue</p>
                  <p className="mt-2 text-xl font-black text-emerald-100 sm:text-2xl">{formatCurrency(data.revenue?.dailyRevenue)}</p>
                </div>
                <div className="rounded-xl border border-blue-300/30 bg-blue-300/10 p-4">
                  <p className="text-xs uppercase text-blue-200">Month Revenue</p>
                  <p className="mt-2 text-xl font-black text-blue-100 sm:text-2xl">{formatCurrency(data.revenue?.monthlyRevenue)}</p>
                </div>
                <div className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/10 p-4">
                  <p className="text-xs uppercase text-fuchsia-200">Total Revenue</p>
                  <p className="mt-2 text-xl font-black text-fuchsia-100 sm:text-2xl">{formatCurrency(data.revenue?.totalRevenue)}</p>
                </div>
              </div>
            </section>

            <section className="flex gap-2 overflow-x-auto border-b border-white/10 pb-2 sm:gap-3">
              {['overview', 'revenue', 'doctors', 'patients'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold uppercase sm:px-4 sm:text-sm ${activeTab === tab ? 'bg-neon text-ink' : 'border border-white/20 text-slate-200'}`}
                >
                  {tab}
                </button>
              ))}
            </section>

            {activeTab === 'overview' && (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
                <h2 className="text-xl font-black sm:text-2xl">Visited Patients</h2>

                <div className="mt-4 space-y-3 md:hidden">
                  {visitedPatients.map((appointment) => (
                    <article key={appointment._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-bold text-slate-100">{appointment.patientId?.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-300">{appointment.patientId?.email || '-'}</p>
                      <p className="mt-1 text-xs text-slate-300">Contact: {appointment.patientId?.contactNumber || '-'}</p>
                      <p className="mt-1 text-xs text-slate-300">Visited On: {appointment.visitedAt ? new Date(appointment.visitedAt).toLocaleDateString() : '-'}</p>
                    </article>
                  ))}

                  {visitedPatients.length === 0 && (
                    <p className="rounded-xl border border-white/10 px-3 py-6 text-center text-sm text-slate-300">No patient visits recorded yet.</p>
                  )}
                </div>

                <div className="-mx-2 mt-4 hidden overflow-x-auto rounded-xl border border-white/10 sm:mx-0 md:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-white/10 text-xs uppercase tracking-wider text-slate-300">
                      <tr>
                        <th className="px-3 py-2">Patient</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Contact</th>
                        <th className="px-3 py-2">Visited On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitedPatients.map((appointment) => (
                        <tr key={appointment._id} className="border-t border-white/10">
                          <td className="px-3 py-2">{appointment.patientId?.name || 'Unknown'}</td>
                          <td className="px-3 py-2">{appointment.patientId?.email || '-'}</td>
                          <td className="px-3 py-2">{appointment.patientId?.contactNumber || '-'}</td>
                          <td className="px-3 py-2">{appointment.visitedAt ? new Date(appointment.visitedAt).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                      {visitedPatients.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-slate-300">No patient visits recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'revenue' && (
              <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
                <div>
                  <h2 className="text-xl font-black sm:text-2xl">Revenue Dashboard</h2>
                  <p className="mt-2 text-sm text-slate-300">Track earnings by day, month, payment method, and doctor.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4">
                    <p className="text-xs uppercase text-emerald-200">Daily Earning</p>
                    <p className="mt-2 text-xl font-black text-emerald-100">{formatCurrency(data.revenue?.dailyRevenue)}</p>
                  </div>
                  <div className="rounded-xl border border-blue-300/30 bg-blue-300/10 p-4">
                    <p className="text-xs uppercase text-blue-200">Monthly Earning</p>
                    <p className="mt-2 text-xl font-black text-blue-100">{formatCurrency(data.revenue?.monthlyRevenue)}</p>
                  </div>
                  <div className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/10 p-4">
                    <p className="text-xs uppercase text-fuchsia-200">Total Earning</p>
                    <p className="mt-2 text-xl font-black text-fuchsia-100">{formatCurrency(data.revenue?.totalRevenue)}</p>
                  </div>
                  <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4">
                    <p className="text-xs uppercase text-amber-200">Cash Earning</p>
                    <p className="mt-2 text-xl font-black text-amber-100">{formatCurrency(data.revenue?.cashRevenue)}</p>
                  </div>
                  <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-4">
                    <p className="text-xs uppercase text-cyan-200">UPI Earning</p>
                    <p className="mt-2 text-xl font-black text-cyan-100">{formatCurrency(data.revenue?.upiRevenue)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-lg font-black">Doctor Wise Earnings</h3>

                  <div className="mt-4 space-y-3 md:hidden">
                    {(data.revenue?.doctorWiseRevenue || []).map((item) => (
                      <article key={item.doctorId || item.doctorName} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="font-bold text-slate-100">{item.doctorName}</p>
                        <p className="text-xs text-slate-300">{item.specialization}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
                          <p>Total: {formatCurrency(item.totalRevenue)}</p>
                          <p>Today: {formatCurrency(item.todayRevenue)}</p>
                          <p>Month: {formatCurrency(item.monthRevenue)}</p>
                          <p>Paid Visits: {item.paidAppointments}</p>
                        </div>
                      </article>
                    ))}
                    {(data.revenue?.doctorWiseRevenue || []).length === 0 && (
                      <p className="rounded-xl border border-white/10 px-3 py-6 text-center text-sm text-slate-300">No revenue records yet.</p>
                    )}
                  </div>

                  <div className="-mx-2 mt-4 hidden overflow-x-auto rounded-xl border border-white/10 sm:mx-0 md:block">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-white/10 text-xs uppercase tracking-wider text-slate-300">
                        <tr>
                          <th className="px-3 py-2">Doctor</th>
                          <th className="px-3 py-2">Specialization</th>
                          <th className="px-3 py-2">Today</th>
                          <th className="px-3 py-2">Month</th>
                          <th className="px-3 py-2">Total</th>
                          <th className="px-3 py-2">Paid Visits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.revenue?.doctorWiseRevenue || []).map((item) => (
                          <tr key={item.doctorId || item.doctorName} className="border-t border-white/10">
                            <td className="px-3 py-2 font-semibold text-slate-100">{item.doctorName}</td>
                            <td className="px-3 py-2 text-slate-300">{item.specialization}</td>
                            <td className="px-3 py-2 text-emerald-200">{formatCurrency(item.todayRevenue)}</td>
                            <td className="px-3 py-2 text-blue-200">{formatCurrency(item.monthRevenue)}</td>
                            <td className="px-3 py-2 text-neon">{formatCurrency(item.totalRevenue)}</td>
                            <td className="px-3 py-2 text-slate-200">{item.paidAppointments}</td>
                          </tr>
                        ))}
                        {(data.revenue?.doctorWiseRevenue || []).length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-6 text-center text-slate-300">No revenue records yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-lg font-black">Payment Transactions</h3>
                  <p className="mt-1 text-xs text-slate-300">Dedicated payment ledger for cash and Razorpay UPI collections.</p>

                  <div className="mt-4 space-y-3 md:hidden">
                    {(data.paymentTransactions || []).map((payment) => (
                      <article key={payment._id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-slate-100">{payment.patientId?.name || 'Patient'}</p>
                          <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase text-slate-200">{payment.paymentMethod}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-300">Doctor: {payment.doctorId?.name || '-'}</p>
                        <p className="mt-1 text-xs text-slate-300">Amount: {formatCurrency(payment.amount)}</p>
                        <p className="mt-1 text-xs text-slate-300">Gateway: {payment.paymentGateway || 'manual'}</p>
                        <p className="mt-1 text-xs text-slate-300">Transaction: {payment.transactionId || '-'}</p>
                        <p className="mt-1 text-xs text-slate-300">Paid At: {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '-'}</p>
                      </article>
                    ))}
                    {(data.paymentTransactions || []).length === 0 && (
                      <p className="rounded-xl border border-white/10 px-3 py-6 text-center text-sm text-slate-300">No payment transactions available yet.</p>
                    )}
                  </div>

                  <div className="-mx-2 mt-4 hidden overflow-x-auto rounded-xl border border-white/10 sm:mx-0 md:block">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-white/10 text-xs uppercase tracking-wider text-slate-300">
                        <tr>
                          <th className="px-3 py-2">Paid At</th>
                          <th className="px-3 py-2">Patient</th>
                          <th className="px-3 py-2">Doctor</th>
                          <th className="px-3 py-2">Method</th>
                          <th className="px-3 py-2">Gateway</th>
                          <th className="px-3 py-2">Amount</th>
                          <th className="px-3 py-2">Transaction ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.paymentTransactions || []).map((payment) => (
                          <tr key={payment._id} className="border-t border-white/10">
                            <td className="px-3 py-2 text-slate-300">{payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '-'}</td>
                            <td className="px-3 py-2 text-slate-100">{payment.patientId?.name || '-'}</td>
                            <td className="px-3 py-2 text-slate-300">{payment.doctorId?.name || '-'}</td>
                            <td className="px-3 py-2 text-slate-200 uppercase">{payment.paymentMethod || '-'}</td>
                            <td className="px-3 py-2 text-slate-300">{payment.paymentGateway || '-'}</td>
                            <td className="px-3 py-2 text-neon">{formatCurrency(payment.amount)}</td>
                            <td className="px-3 py-2 text-slate-300">{payment.transactionId || '-'}</td>
                          </tr>
                        ))}
                        {(data.paymentTransactions || []).length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-slate-300">No payment transactions available yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'doctors' && (
              <section className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
                <form onSubmit={createDoctor} className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
                  <h2 className="text-xl font-black sm:text-2xl">Add Doctor</h2>
                  <div className="mt-4 grid gap-3">
                    {Object.entries(doctorForm).map(([key, value]) => (
                      <input
                        key={key}
                        name={key}
                        value={value}
                        onChange={(event) => setDoctorForm((prev) => ({ ...prev, [key]: event.target.value }))}
                        placeholder={key}
                        type={key === 'password' ? 'password' : 'text'}
                        required
                        className="rounded-xl border border-white/20 bg-white/10 px-3 py-2"
                      />
                    ))}
                  </div>
                  <button className="mt-4 w-full rounded-xl bg-neon px-4 py-2 text-sm font-black text-ink sm:w-auto">Create Doctor</button>
                </form>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
                  <h2 className="text-xl font-black sm:text-2xl">Associated Doctors</h2>
                  <div className="mt-4 space-y-3">
                    {data.doctors?.map((doctor) => (
                      <div key={doctor._id} className="rounded-xl border border-white/15 bg-white/5 p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-bold text-slate-100">{doctor.name}</p>
                            <p className="text-xs text-slate-300">{doctor.specialization}</p>
                            <p className="text-xs text-slate-300">{doctor.email}</p>
                            <p className="text-xs text-slate-300">{doctor.contactNumber}</p>
                            <p className="text-xs text-slate-300">Blood Group: {doctor.bloodGroup || '-'}</p>
                            <p className="text-xs text-slate-300">Address: {[doctor.buildingAddress, doctor.laneAddress, doctor.homeAddress || doctor.address].filter(Boolean).join(', ') || '-'}</p>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${doctor.isApproved ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200' : 'border-amber-300/40 bg-amber-300/10 text-amber-200'}`}>
                            {doctor.isApproved ? 'approved' : doctor.approvalStatus}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {!doctor.isApproved && (
                            <>
                              <button onClick={() => updateDoctorApproval(doctor._id, 'approve')} className="rounded-lg border border-emerald-300/50 px-2 py-1 text-xs font-bold text-emerald-200">
                                Approve
                              </button>
                              <button onClick={() => updateDoctorApproval(doctor._id, 'reject')} className="rounded-lg border border-rose-300/50 px-2 py-1 text-xs font-bold text-rose-200">
                                Reject
                              </button>
                            </>
                          )}
                          <button onClick={() => editDoctor(doctor)} className="rounded-lg border border-blue-300/50 px-2 py-1 text-xs font-bold text-blue-200">
                            Edit
                          </button>
                          <button onClick={() => deleteDoctor(doctor._id)} className="rounded-lg border border-rose-300/50 px-2 py-1 text-xs font-bold text-rose-200">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!data.doctors || data.doctors.length === 0) && <p className="text-sm text-slate-300">No doctors associated yet.</p>}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'patients' && (
              <section className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
                <form onSubmit={createPatient} className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
                  <h2 className="text-xl font-black sm:text-2xl">Add Patient</h2>
                  <div className="mt-4 grid gap-3">
                    {Object.entries(patientForm).map(([key, value]) => (
                      <input
                        key={key}
                        name={key}
                        value={value}
                        onChange={(event) => setPatientForm((prev) => ({ ...prev, [key]: event.target.value }))}
                        placeholder={key}
                        type={key === 'password' ? 'password' : 'text'}
                        required
                        className="rounded-xl border border-white/20 bg-white/10 px-3 py-2"
                      />
                    ))}
                  </div>
                  <button className="mt-4 w-full rounded-xl bg-neon px-4 py-2 text-sm font-black text-ink sm:w-auto">Create Patient</button>
                </form>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
                  <h2 className="text-xl font-black sm:text-2xl">Hospital Patients</h2>
                  <div className="mt-4 space-y-3">
                    {data.patients?.map((patient) => (
                      <div key={patient._id} className="rounded-xl border border-white/15 bg-white/5 p-3">
                        <p className="font-bold text-slate-100">{patient.name}</p>
                        <p className="text-xs text-slate-300">{patient.email}</p>
                        <p className="text-xs text-slate-300">{patient.contactNumber}</p>
                        <p className="text-xs text-slate-300">Blood Group: {patient.bloodGroup || '-'}</p>
                        <p className="text-xs text-slate-300">Address: {[patient.buildingAddress, patient.laneAddress, patient.address].filter(Boolean).join(', ') || '-'}</p>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => editPatient(patient)} className="rounded-lg border border-blue-300/50 px-2 py-1 text-xs font-bold text-blue-200">
                            Edit
                          </button>
                          <button onClick={() => deletePatient(patient._id)} className="rounded-lg border border-rose-300/50 px-2 py-1 text-xs font-bold text-rose-200">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!data.patients || data.patients.length === 0) && <p className="text-sm text-slate-300">No patients associated yet.</p>}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default HospitalDashboardPage;
