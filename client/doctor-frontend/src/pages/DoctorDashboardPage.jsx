import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { apiFetch } from '../lib/api';
import { getAuthSession } from '../lib/auth';
import { requestBrowserLocation } from '../lib/geolocation';

const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const statusStyles = {
  scheduled: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
  completed: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200',
  cancelled: 'border-rose-300/40 bg-rose-300/10 text-rose-200',
};

const statusLabel = {
  scheduled: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const formatCurrency = (amount) => {
  const value = Number(amount || 0);
  return `Rs ${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const loadRazorpayCheckout = () => {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function DoctorDashboardPage() {
  const session = getAuthSession();
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [diagnosisByAppointment, setDiagnosisByAppointment] = useState({});
  const [prescriptionByAppointment, setPrescriptionByAppointment] = useState({});
  const [paymentMethodByAppointment, setPaymentMethodByAppointment] = useState({});
  const [paymentAmountByAppointment, setPaymentAmountByAppointment] = useState({});
  const [paymentTransactionByAppointment, setPaymentTransactionByAppointment] = useState({});
  const [paymentBusyByAppointment, setPaymentBusyByAppointment] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeSection, setActiveSection] = useState('appointments');
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const [donorSearchGroup, setDonorSearchGroup] = useState('O+');
  const [donorSearchRadius, setDonorSearchRadius] = useState('10000');
  const [donorSearchLoading, setDonorSearchLoading] = useState(false);
  const [donorSearchResults, setDonorSearchResults] = useState([]);
  const [donorSearchError, setDonorSearchError] = useState('');

  const loadAppointments = async () => {
    const result = await apiFetch('/appointments/my', { token: session.token });
    setAppointments(result);
  };

  useEffect(() => {
    loadAppointments().catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    const loadEmergencyAlerts = async () => {
      try {
        const result = await apiFetch('/api/emergency/alerts/my?status=PENDING', { token: session.token });
        setEmergencyAlerts(Array.isArray(result) ? result : []);
      } catch {
        setEmergencyAlerts([]);
      }
    };

    loadEmergencyAlerts();
  }, [session.token]);

  const allocatedPatients = useMemo(() => {
    const map = new Map();

    appointments.forEach((appointment) => {
      const patient = appointment.patientId;
      if (patient?._id && !map.has(patient._id)) {
        map.set(patient._id, patient);
      }
    });

    return Array.from(map.values());
  }, [appointments]);

  const statusCounts = useMemo(() => {
    return {
      total: appointments.length,
      pending: appointments.filter((item) => item.status === 'scheduled').length,
      completed: appointments.filter((item) => item.status === 'completed').length,
      cancelled: appointments.filter((item) => item.status === 'cancelled').length,
    };
  }, [appointments]);

  const visibleAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const patientName = appointment.patientId?.name || '';
      const patientEmail = appointment.patientId?.email || '';
      const keywordMatch = `${patientName} ${patientEmail}`.toLowerCase().includes(searchQuery.trim().toLowerCase());
      const statusMatch = statusFilter === 'all' ? true : appointment.status === statusFilter;
      return keywordMatch && statusMatch;
    });
  }, [appointments, searchQuery, statusFilter]);

  const updateAppointment = async (appointmentId, updates) => {
    setError('');
    setMessage('');

    try {
      await apiFetch(`/appointments/${appointmentId}`, {
        method: 'PUT',
        token: session.token,
        body: updates,
      });
      setMessage('Appointment updated successfully');
      await loadAppointments();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const getPaymentPayload = (appointment) => ({
    paymentMethod: paymentMethodByAppointment[appointment._id] ?? appointment.paymentMethod ?? '',
    paymentAmount: Number(paymentAmountByAppointment[appointment._id] ?? appointment.paymentAmount ?? 0),
    paymentTransactionId: paymentTransactionByAppointment[appointment._id] ?? appointment.paymentTransactionId ?? '',
  });

  const isPaymentCompleted = (appointment) => {
    const paymentMethod = paymentMethodByAppointment[appointment._id] ?? appointment.paymentMethod ?? '';
    const paymentAmount = Number(paymentAmountByAppointment[appointment._id] ?? appointment.paymentAmount ?? 0);
    const paymentTransactionId = paymentTransactionByAppointment[appointment._id] ?? appointment.paymentTransactionId ?? '';
    const paymentStatus = appointment.paymentStatus ?? 'unpaid';

    if (paymentStatus !== 'paid') return false;
    if (!['cash', 'online', 'upi'].includes(paymentMethod)) return false;
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) return false;
    if (['online', 'upi'].includes(paymentMethod) && !String(paymentTransactionId).trim()) return false;
    return true;
  };

  const withPaymentBusy = async (appointmentId, task) => {
    setPaymentBusyByAppointment((prev) => ({ ...prev, [appointmentId]: true }));
    try {
      await task();
    } finally {
      setPaymentBusyByAppointment((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  const startRazorpayPayment = async (appointment) => {
    const amount = Number(paymentAmountByAppointment[appointment._id] ?? appointment.paymentAmount ?? 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount before starting UPI payment');
      return;
    }

    const sdkLoaded = await loadRazorpayCheckout();
    if (!sdkLoaded || !window.Razorpay) {
      setError('Unable to load Razorpay checkout. Please try again.');
      return;
    }

    const orderResult = await apiFetch(`/appointments/${appointment._id}/payment/razorpay/order`, {
      method: 'POST',
      token: session.token,
      body: {
        paymentAmount: amount,
      },
    });

    const razorpayOptions = {
      key: orderResult.keyId,
      amount: orderResult.order.amount,
      currency: orderResult.order.currency,
      name: appointment.doctorId?.hospitalId?.name || 'Hospital Payment',
      description: `Appointment payment for ${appointment.patientId?.name || 'patient'}`,
      order_id: orderResult.order.id,
      method: {
        upi: true,
        card: false,
        netbanking: false,
        wallet: false,
      },
      handler: async (response) => {
        try {
          const verifyResult = await apiFetch(`/appointments/${appointment._id}/payment/razorpay/verify`, {
            method: 'POST',
            token: session.token,
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentAmount: amount,
            },
          });

          const resolvedPayment = verifyResult?.payment || {};

          setPaymentMethodByAppointment((prev) => ({
            ...prev,
            [appointment._id]: resolvedPayment.paymentMethod || 'upi',
          }));
          setPaymentAmountByAppointment((prev) => ({
            ...prev,
            [appointment._id]: String(resolvedPayment.paymentAmount ?? amount),
          }));
          setPaymentTransactionByAppointment((prev) => ({
            ...prev,
            [appointment._id]: resolvedPayment.paymentTransactionId || response.razorpay_payment_id,
          }));

          setMessage('UPI payment completed successfully via Razorpay. Prescription save is now enabled.');
          await loadAppointments();
        } catch (requestError) {
          setError(requestError.message);
        }
      },
      prefill: {
        name: appointment.patientId?.name || '',
      },
      theme: {
        color: '#22d3ee',
      },
      modal: {
        ondismiss: () => {
          setMessage('UPI payment was cancelled.');
        },
      },
    };

    const razorpay = new window.Razorpay(razorpayOptions);
    razorpay.on('payment.failed', (response) => {
      const reason = response?.error?.description || response?.error?.reason || 'Payment failed';
      setError(reason);
    });
    razorpay.open();
  };

  const recordPayment = async (appointment) => {
    const paymentPayload = getPaymentPayload(appointment);

    if (!['cash', 'upi'].includes(paymentPayload.paymentMethod)) {
      setError('Select payment method (cash or upi) before recording payment');
      return;
    }

    if (!Number.isFinite(paymentPayload.paymentAmount) || paymentPayload.paymentAmount <= 0) {
      setError('Enter a valid payment amount before recording payment');
      return;
    }

    setError('');
    setMessage('');

    await withPaymentBusy(appointment._id, async () => {
      if (paymentPayload.paymentMethod === 'upi') {
        await startRazorpayPayment(appointment);
        return;
      }

      try {
        const result = await apiFetch(`/appointments/${appointment._id}/payment`, {
          method: 'POST',
          token: session.token,
          body: paymentPayload,
        });

        const resolvedPayment = result?.payment || {};
        setPaymentMethodByAppointment((prev) => ({
          ...prev,
          [appointment._id]: resolvedPayment.paymentMethod || paymentPayload.paymentMethod,
        }));
        setPaymentAmountByAppointment((prev) => ({
          ...prev,
          [appointment._id]: String(resolvedPayment.paymentAmount ?? paymentPayload.paymentAmount),
        }));
        setPaymentTransactionByAppointment((prev) => ({
          ...prev,
          [appointment._id]: resolvedPayment.paymentTransactionId || paymentPayload.paymentTransactionId || '',
        }));

        setMessage('Cash payment recorded successfully. Prescription save is now enabled.');
        await loadAppointments();
      } catch (requestError) {
        setError(requestError.message);
      }
    });
  };

  const getClinicalPayload = (appointment) => ({
    diagnosis: diagnosisByAppointment[appointment._id] ?? appointment.diagnosis ?? '',
    medicalPrescription:
      prescriptionByAppointment[appointment._id] ?? appointment.medicalPrescription ?? appointment.medicineDescription ?? '',
    medicineDescription:
      prescriptionByAppointment[appointment._id] ?? appointment.medicalPrescription ?? appointment.medicineDescription ?? '',
  });

  const searchNearbyBloodDonors = async () => {
    setDonorSearchError('');
    setDonorSearchLoading(true);

    try {
      const liveCoords = await requestBrowserLocation();
      const lng = Number(liveCoords?.lng);
      const lat = Number(liveCoords?.lat);

      const result = await apiFetch(
        `/api/donors/search?group=${encodeURIComponent(donorSearchGroup)}&lng=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}&radius=${encodeURIComponent(donorSearchRadius)}`,
        { token: session.token }
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
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6 sm:py-10">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">Doctor Dashboard</h1>
              <p className="mt-2 text-sm text-slate-300">Structured workspace for appointments, billing, diagnosis, and prescription updates.</p>
            </div>
            <Link to="/doctor/profile" className="w-full rounded-xl border border-white/25 px-4 py-2 text-center text-sm font-bold text-slate-100 transition hover:bg-white/10 sm:w-auto">
              Open Profile Page
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Allocated Patients</p>
              <p className="mt-2 text-2xl font-black sm:text-3xl">{allocatedPatients.length}</p>
            </div>
            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-200">Pending</p>
              <p className="mt-2 text-2xl font-black text-amber-100 sm:text-3xl">{statusCounts.pending}</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">Completed</p>
              <p className="mt-2 text-2xl font-black text-emerald-100 sm:text-3xl">{statusCounts.completed}</p>
            </div>
            <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-200">Cancelled</p>
              <p className="mt-2 text-2xl font-black text-rose-100 sm:text-3xl">{statusCounts.cancelled}</p>
            </div>
          </div>
          {message && <p className="mt-4 text-sm text-neon">{message}</p>}
          {error && <p className="mt-4 text-sm text-coral">{error}</p>}

          <div className="mt-5 rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4">
            <h2 className="text-lg font-black text-rose-100">Emergency Alerts Near You</h2>
            <p className="mt-1 text-xs text-rose-100/90">If emergency is valid, call patient immediately and coordinate ambulance dispatch.</p>

            <div className="mt-3 space-y-2">
              {emergencyAlerts.slice(0, 5).map((alert) => (
                <article key={alert._id} className="rounded-xl border border-white/20 bg-white/10 p-3">
                  <p className="text-sm font-bold text-white">{alert.patientSnapshot?.name || alert.patientId?.name || 'Patient'}</p>
                  <p className="text-xs text-slate-200">Blood Group: {alert.patientSnapshot?.bloodGroup || alert.patientId?.bloodGroup || '-'}</p>
                  <p className="text-xs text-slate-200">Contact: {alert.patientSnapshot?.contactNumber || alert.patientId?.contactNumber || '-'}</p>
                  <p className="text-xs text-slate-200">Address: {alert.patientSnapshot?.address || alert.patientId?.address || '-'}</p>
                  {Array.isArray(alert?.location?.coordinates) && alert.location.coordinates.length === 2 && (
                    <a
                      href={`https://www.google.com/maps?q=${alert.location.coordinates[1]},${alert.location.coordinates[0]}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex rounded-lg border border-fuchsia-300/50 bg-fuchsia-300/20 px-2 py-1 text-[11px] font-bold text-fuchsia-100"
                    >
                      Track Incident
                    </a>
                  )}
                </article>
              ))}
              {emergencyAlerts.length === 0 && <p className="text-xs text-slate-200">No pending emergency alerts right now.</p>}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-red-300/30 bg-red-300/10 p-4">
            <h2 className="text-lg font-black text-red-100">Emergency Blood Donor Search</h2>
            <p className="mt-1 text-xs text-red-100/90">Find nearest matching blood-group donors around your live location.</p>

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
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('patients')}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeSection === 'patients' ? 'bg-neon text-ink' : 'border border-white/20 text-slate-200 hover:bg-white/10'
              }`}
            >
              Allocated Patients
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('appointments')}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeSection === 'appointments' ? 'bg-neon text-ink' : 'border border-white/20 text-slate-200 hover:bg-white/10'
              }`}
            >
              Appointment Workflow
            </button>
          </div>
        </section>

        {activeSection === 'appointments' && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by patient name or email"
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </section>
        )}

        <section className="grid gap-6">
          <div className={`rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6 ${activeSection === 'patients' ? '' : 'hidden'}`}>
            <h2 className="text-xl font-black sm:text-2xl">Allocated Patients</h2>
            <p className="mt-2 text-sm text-slate-300">Patients automatically derived from your appointment allocations.</p>
            <div className="mt-4 grid max-h-[520px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-1">
              {allocatedPatients.map((patient) => (
                <div key={patient._id} className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="font-bold text-slate-100">{patient.name}</p>
                  <p className="text-xs text-slate-300">{patient.email}</p>
                </div>
              ))}
              {allocatedPatients.length === 0 && <p className="text-sm text-slate-300">No allocated patients yet.</p>}
            </div>
          </div>

          <div className={`rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6 ${activeSection === 'appointments' ? '' : 'hidden'}`}>
            <h2 className="text-xl font-black sm:text-2xl">Appointment Workflow</h2>
            <p className="mt-2 text-sm text-slate-300">Record payment first (cash or UPI via Razorpay), then save diagnosis and prescription.</p>

            <div className="mt-4 space-y-3 lg:hidden">
              {visibleAppointments.map((appointment) => (
                <article key={appointment._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-100">{appointment.patientId?.name || 'Unknown patient'}</p>
                      <p className="text-xs text-slate-300">{appointment.patientId?.email || ''}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusStyles[appointment.status] || statusStyles.scheduled}`}>
                      {statusLabel[appointment.status] || appointment.status}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <p>Date: {new Date(appointment.appointmentDate).toLocaleDateString()}</p>
                    <p>Time: {appointment.appointmentTime}</p>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment</p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <select
                        value={paymentMethodByAppointment[appointment._id] ?? appointment.paymentMethod ?? ''}
                        onChange={(event) =>
                          setPaymentMethodByAppointment((prev) => ({
                            ...prev,
                            [appointment._id]: event.target.value,
                          }))
                        }
                        disabled={appointment.paymentStatus === 'paid'}
                        className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm"
                      >
                        <option value="">Payment Method</option>
                        <option value="cash">Cash</option>
                        <option value="upi">UPI (Razorpay)</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmountByAppointment[appointment._id] ?? appointment.paymentAmount ?? ''}
                        onChange={(event) =>
                          setPaymentAmountByAppointment((prev) => ({
                            ...prev,
                            [appointment._id]: event.target.value,
                          }))
                        }
                        disabled={appointment.paymentStatus === 'paid'}
                        placeholder="Amount"
                        className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm"
                      />
                      <input
                        value={paymentTransactionByAppointment[appointment._id] ?? appointment.paymentTransactionId ?? ''}
                        readOnly
                        placeholder="UPI Txn ID (auto after payment)"
                        className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-300">
                        Payment: <span className="font-semibold text-slate-200">{appointment.paymentStatus || 'unpaid'}</span>
                      </p>
                      <button
                        onClick={() => recordPayment(appointment)}
                        disabled={appointment.paymentStatus === 'paid' || paymentBusyByAppointment[appointment._id]}
                        className="rounded-lg border border-blue-300/50 px-3 py-1.5 text-xs font-bold text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {appointment.paymentStatus === 'paid'
                          ? 'Payment Done'
                          : paymentBusyByAppointment[appointment._id]
                            ? 'Processing...'
                            : (paymentMethodByAppointment[appointment._id] ?? appointment.paymentMethod ?? '') === 'upi'
                              ? 'Pay UPI'
                              : 'Record Cash'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Clinical Notes</p>
                    <div className="mt-2 space-y-2">
                    <textarea
                      value={diagnosisByAppointment[appointment._id] ?? appointment.diagnosis ?? ''}
                      onChange={(event) =>
                        setDiagnosisByAppointment((prev) => ({
                          ...prev,
                          [appointment._id]: event.target.value,
                        }))
                      }
                      placeholder="Add diagnosis notes"
                      className="h-20 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm"
                    />
                    <textarea
                      value={prescriptionByAppointment[appointment._id] ?? appointment.medicalPrescription ?? appointment.medicineDescription ?? ''}
                      onChange={(event) =>
                        setPrescriptionByAppointment((prev) => ({
                          ...prev,
                          [appointment._id]: event.target.value,
                        }))
                      }
                      placeholder="Add medicine name, dosage, instructions"
                      className="h-20 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm"
                    />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      onClick={() =>
                        updateAppointment(appointment._id, {
                          status: 'completed',
                          ...getClinicalPayload(appointment),
                          ...getPaymentPayload(appointment),
                        })
                      }
                      disabled={!isPaymentCompleted(appointment)}
                      className="rounded-lg border border-emerald-300/50 px-3 py-1.5 text-xs font-bold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Mark Completed
                    </button>
                    <button
                      onClick={() => updateAppointment(appointment._id, { status: 'cancelled' })}
                      className="rounded-lg border border-rose-300/50 px-3 py-1.5 text-xs font-bold text-rose-200"
                    >
                      Mark Cancelled
                    </button>
                    <button
                      onClick={() =>
                        updateAppointment(appointment._id, {
                          ...getClinicalPayload(appointment),
                          ...getPaymentPayload(appointment),
                        })
                      }
                      disabled={!isPaymentCompleted(appointment)}
                      className="rounded-lg border border-neon/50 px-3 py-1.5 text-xs font-bold text-neon disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
                    >
                      Save Diagnosis & Prescription
                    </button>
                  </div>
                </article>
              ))}

              {visibleAppointments.length === 0 && (
                <p className="rounded-xl border border-white/10 px-3 py-6 text-center text-sm text-slate-300">No appointments allocated yet.</p>
              )}
            </div>

            <div className="-mx-2 mt-4 hidden overflow-x-auto rounded-xl border border-white/10 sm:mx-0 lg:block">
              <table className="min-w-full table-fixed text-left text-sm">
                <thead className="bg-white/10 text-xs uppercase tracking-wider text-slate-300">
                  <tr>
                    <th className="w-[18%] px-3 py-2">Patient</th>
                    <th className="w-[14%] px-3 py-2">Schedule</th>
                    <th className="w-[10%] px-3 py-2">Status</th>
                    <th className="w-[24%] px-3 py-2">Billing</th>
                    <th className="w-[22%] px-3 py-2">Clinical Notes</th>
                    <th className="w-[12%] px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAppointments.map((appointment) => (
                    <tr key={appointment._id} className="border-t border-white/10 align-top">
                      <td className="px-3 py-2">
                        <p className="truncate text-sm font-semibold text-slate-100">{appointment.patientId?.name || 'Unknown patient'}</p>
                        <p className="truncate text-xs text-slate-300">{appointment.patientId?.email || ''}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-xs lg:text-sm">{new Date(appointment.appointmentDate).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-300">{appointment.appointmentTime}</p>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold lg:text-xs ${statusStyles[appointment.status] || statusStyles.scheduled}`}>
                          {statusLabel[appointment.status] || appointment.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="space-y-1.5">
                          <select
                            value={paymentMethodByAppointment[appointment._id] ?? appointment.paymentMethod ?? ''}
                            onChange={(event) =>
                              setPaymentMethodByAppointment((prev) => ({
                                ...prev,
                                [appointment._id]: event.target.value,
                              }))
                            }
                            disabled={appointment.paymentStatus === 'paid'}
                            className="w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs"
                          >
                            <option value="">Payment Method</option>
                            <option value="cash">Cash</option>
                            <option value="upi">UPI (Razorpay)</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={paymentAmountByAppointment[appointment._id] ?? appointment.paymentAmount ?? ''}
                            onChange={(event) =>
                              setPaymentAmountByAppointment((prev) => ({
                                ...prev,
                                [appointment._id]: event.target.value,
                              }))
                            }
                            disabled={appointment.paymentStatus === 'paid'}
                            placeholder="Amount"
                            className="w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs"
                          />
                          <input
                            value={paymentTransactionByAppointment[appointment._id] ?? appointment.paymentTransactionId ?? ''}
                            readOnly
                            placeholder="UPI Txn ID (auto after payment)"
                            className="w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-slate-300">{appointment.paymentStatus || 'unpaid'}</p>
                            <button
                              onClick={() => recordPayment(appointment)}
                              disabled={appointment.paymentStatus === 'paid' || paymentBusyByAppointment[appointment._id]}
                              className="rounded-lg border border-blue-300/50 px-2 py-1 text-xs font-bold text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {appointment.paymentStatus === 'paid'
                                ? 'Done'
                                : paymentBusyByAppointment[appointment._id]
                                  ? 'Processing'
                                  : (paymentMethodByAppointment[appointment._id] ?? appointment.paymentMethod ?? '') === 'upi'
                                    ? 'Pay UPI'
                                    : 'Record Cash'}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="space-y-1.5">
                          <textarea
                            value={diagnosisByAppointment[appointment._id] ?? appointment.diagnosis ?? ''}
                            onChange={(event) =>
                              setDiagnosisByAppointment((prev) => ({
                                ...prev,
                                [appointment._id]: event.target.value,
                              }))
                            }
                            placeholder="Diagnosis"
                            className="h-16 w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-xs"
                          />
                          <textarea
                            value={prescriptionByAppointment[appointment._id] ?? appointment.medicalPrescription ?? appointment.medicineDescription ?? ''}
                            onChange={(event) =>
                              setPrescriptionByAppointment((prev) => ({
                                ...prev,
                                [appointment._id]: event.target.value,
                              }))
                            }
                            placeholder="Prescription"
                            className="h-16 w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-xs"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() =>
                              updateAppointment(appointment._id, {
                                status: 'completed',
                                ...getClinicalPayload(appointment),
                                ...getPaymentPayload(appointment),
                              })
                            }
                            disabled={!isPaymentCompleted(appointment)}
                            className="rounded-lg border border-emerald-300/50 px-2 py-1 text-xs font-bold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => updateAppointment(appointment._id, { status: 'cancelled' })}
                            className="rounded-lg border border-rose-300/50 px-2 py-1 text-xs font-bold text-rose-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() =>
                              updateAppointment(appointment._id, {
                                ...getClinicalPayload(appointment),
                                ...getPaymentPayload(appointment),
                              })
                            }
                            disabled={!isPaymentCompleted(appointment)}
                            className="rounded-lg border border-neon/50 px-2 py-1 text-xs font-bold text-neon disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Save Rx
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleAppointments.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-slate-300" colSpan={6}>No appointments matched your filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-slate-300">
                Visible appointments: <span className="font-bold text-slate-100">{visibleAppointments.length}</span> • Total billed: <span className="font-bold text-neon">{formatCurrency(visibleAppointments.reduce((sum, item) => sum + Number(item.paymentAmount || 0), 0))}</span>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DoctorDashboardPage;
