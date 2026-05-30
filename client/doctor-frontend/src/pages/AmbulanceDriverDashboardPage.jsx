import { useEffect, useMemo, useState } from 'react';
import TopNav from '../components/TopNav';
import { apiFetch } from '../lib/api';
import { getAuthSession } from '../lib/auth';
import { useSocket } from '../lib/useSocket';
import { getTelHref } from '../lib/mobileActions';

function AmbulanceDriverDashboardPage() {
  const session = getAuthSession();
  const { on } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [driverProfile, setDriverProfile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [statusDraft, setStatusDraft] = useState('AVAILABLE');
  const [statusLoading, setStatusLoading] = useState(false);

  const loadDriverProfile = async () => {
    if (!session?.token) return;

    try {
      const result = await apiFetch('/api/ambulances/me', { token: session.token });
      setDriverProfile(result || null);
      if (result?.status) {
        setStatusDraft(result.status);
      }
    } catch {
      setDriverProfile(null);
    }
  };

  const loadAlerts = async () => {
    if (!session?.token) return;

    try {
      const result = await apiFetch('/api/emergency/alerts/my?status=ALL', { token: session.token });
      setAlerts(Array.isArray(result) ? result : []);
    } catch {
      setAlerts([]);
    }
  };

  useEffect(() => {
    loadAlerts();
    loadDriverProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  useEffect(() => {
    const offAmbulanceAlert = on?.('emergency:newAlertAmbulance', () => {
      loadAlerts();
    });

    const offStatus = on?.('emergency:statusChanged', () => {
      loadAlerts();
    });

    return () => {
      if (typeof offAmbulanceAlert === 'function') offAmbulanceAlert();
      if (typeof offStatus === 'function') offStatus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, session?.id]);

  const allAllocatedAlerts = useMemo(
    () => [...alerts].sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()),
    [alerts]
  );

  const updateMyStatus = async () => {
    if (!session?.token || !session?.id) return;

    setError('');
    setMessage('');
    setStatusLoading(true);

    try {
      await apiFetch(`/api/ambulances/${session.id}/status`, {
        method: 'PUT',
        token: session.token,
        body: { status: statusDraft },
      });

      setMessage('Ambulance status updated.');
      await loadDriverProfile();
      await loadAlerts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleEmergencyAction = async (alertId, action) => {
    setError('');
    setMessage('');

    try {
      await apiFetch(`/api/emergency/${alertId}/${action}`, {
        method: 'POST',
        token: session.token,
      });

      if (action === 'complete') {
        await apiFetch(`/api/emergency/${alertId}/hide-for-driver`, {
          method: 'POST',
          token: session.token,
        });
      }

      setMessage(action === 'accept' ? 'Emergency accepted.' : 'Emergency marked as completed.');
      await loadAlerts();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeForDriver = async (alertId) => {
    setError('');
    setMessage('');

    try {
      await apiFetch(`/api/emergency/${alertId}/hide-for-driver`, {
        method: 'POST',
        token: session.token,
      });

      setMessage('Emergency removed from your dashboard history.');
      await loadAlerts();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <TopNav />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <h1 className="text-2xl font-black sm:text-3xl">Ambulance Driver Dashboard</h1>
          <p className="mt-2 text-sm text-slate-300">
            Manage your allocated emergency queue, accept cases, complete rides, and keep hospital/patient status synchronized.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Driver Name</p>
              <p className="mt-1 text-sm font-bold text-white">{driverProfile?.driverName || '-'}</p>
            </article>
            <article className="rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Phone</p>
              <p className="mt-1 text-sm font-bold text-white">{driverProfile?.driverPhone || '-'}</p>
            </article>
            <article className="rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Email</p>
              <p className="mt-1 text-sm font-bold text-white">{driverProfile?.driverEmail || '-'}</p>
            </article>
            <article className="rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Vehicle Number</p>
              <p className="mt-1 text-sm font-bold text-white">{driverProfile?.vehicleNumber || '-'}</p>
            </article>
            <article className="rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Blood Group</p>
              <p className="mt-1 text-sm font-bold text-white">{driverProfile?.driverBloodGroup || '-'}</p>
            </article>
            <article className="rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Hospital</p>
              <p className="mt-1 text-sm font-bold text-white">{driverProfile?.hospitalId?.name || '-'}</p>
            </article>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={statusDraft}
              onChange={(event) => setStatusDraft(event.target.value)}
              className="h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm"
            >
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="BUSY">BUSY</option>
              <option value="OFFLINE">OFFLINE</option>
            </select>
            <button
              type="button"
              onClick={updateMyStatus}
              disabled={statusLoading}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold transition hover:bg-white/10 disabled:opacity-60"
            >
              {statusLoading ? 'Updating...' : 'Update My Ambulance Status'}
            </button>
          </div>

          {error && <p className="mt-3 rounded-xl border border-rose-300/40 bg-rose-300/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
          {message && <p className="mt-3 rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-200">{message}</p>}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <h2 className="text-xl font-black">All Allocated Cases</h2>
          <p className="mt-2 text-sm text-slate-300">Complete list of cases allocated to this ambulance with key patient and incident details.</p>

          <div className="mt-4 space-y-3">
            {allAllocatedAlerts.map((alert) => {
              const patientName = alert.patientSnapshot?.name || alert.patientId?.name || 'Patient';
              const patientPhone = alert.patientSnapshot?.contactNumber || alert.patientId?.contactNumber || '';
              const patientAddress = alert.patientSnapshot?.address || alert.patientId?.address || 'Address not available';
              const patientCallHref = getTelHref(patientPhone);
              const hasIncidentCoordinates = Array.isArray(alert?.location?.coordinates) && alert.location.coordinates.length === 2;
              const isAccepted = String(alert.status || '').toUpperCase() === 'ACCEPTED';
              const isCompletedOrCancelled = ['COMPLETED', 'CANCELLED'].includes(String(alert.status || '').toUpperCase());
              const showAccept = String(alert.status || '').toUpperCase() === 'PENDING';
              const showComplete = ['PENDING', 'ACCEPTED'].includes(String(alert.status || '').toUpperCase());

              return (
                <article key={alert._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">{patientName}</p>
                      <p className="text-xs text-slate-300">Emergency ID: {alert._id}</p>
                      <p className="text-xs text-slate-300">Blood Group: {alert.patientSnapshot?.bloodGroup || alert.patientId?.bloodGroup || '-'}</p>
                      <p className="text-xs text-slate-300">Hospital: {alert.hospitalId?.name || '-'}</p>
                      <p className="text-xs text-slate-300">Doctor: {alert.doctorId?.name || '-'}</p>
                      <p className="text-xs text-slate-300">Address: {patientAddress}</p>
                      <p className="text-xs text-slate-300">Current Status: {alert.status}</p>
                      <p className="text-xs text-slate-400">Created: {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '-'}</p>
                      <p className="text-xs text-slate-400">
                        Incident Location: {alert?.location?.coordinates?.[0] ?? '-'}, {alert?.location?.coordinates?.[1] ?? '-'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {patientCallHref && (
                        <a href={patientCallHref} className="rounded-lg border border-cyan-300/50 bg-cyan-300/20 px-3 py-2 text-xs font-bold text-cyan-100">
                          Call Patient
                        </a>
                      )}
                      {hasIncidentCoordinates && (
                        <a
                          href={`https://www.google.com/maps?q=${alert.location.coordinates[1]},${alert.location.coordinates[0]}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-fuchsia-300/50 bg-fuchsia-300/20 px-3 py-2 text-xs font-bold text-fuchsia-100"
                        >
                          Track Incident
                        </a>
                      )}
                      {showAccept && (
                        <button
                          type="button"
                          onClick={() => handleEmergencyAction(alert._id, 'accept')}
                          className="rounded-lg border border-amber-300/50 bg-amber-300/20 px-3 py-2 text-xs font-bold text-amber-100"
                        >
                          Accept Case
                        </button>
                      )}
                      {showComplete && (
                        <button
                          type="button"
                          onClick={() => handleEmergencyAction(alert._id, 'complete')}
                          className="rounded-lg border border-emerald-300/50 bg-emerald-300/20 px-3 py-2 text-xs font-bold text-emerald-100"
                        >
                          Mark Completed
                        </button>
                      )}
                      {isCompletedOrCancelled && (
                        <button
                          type="button"
                          onClick={() => removeForDriver(alert._id)}
                          className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-slate-100 transition hover:bg-white/10"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {allAllocatedAlerts.length === 0 && <p className="text-sm text-slate-400">No allocated emergency cases right now.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AmbulanceDriverDashboardPage;
