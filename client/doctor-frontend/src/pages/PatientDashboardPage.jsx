import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import TopNav from '../components/TopNav';
import { apiFetch } from '../lib/api';
import { getAuthSession } from '../lib/auth';
import { requestBrowserLocation, reverseGeocodeCoordinates } from '../lib/geolocation';
import { useSocket } from '../lib/useSocket';

const statusStyles = {
  scheduled: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
  completed: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200',
  cancelled: 'border-rose-300/40 bg-rose-300/10 text-rose-200',
};

const statusLabel = {
  scheduled: 'Pending',
  completed: 'Fulfilled',
  cancelled: 'Rejected/Cancelled',
};

const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const formatActiveHours = (doctor) => {
  const start = doctor?.activeHours?.start || '09:00';
  const end = doctor?.activeHours?.end || '17:00';
  return `${start} - ${end}`;
};

const downloadPrescription = (appointment) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 96;
  const left = 48;
  const right = pageWidth - left;
  let y = 40;

  const hospitalName = appointment.doctorId?.hospitalId?.name || 'Associated Hospital';
  const doctorName = appointment.doctorId?.name || 'N/A';
  const doctorSpecialization = appointment.doctorId?.specialization || 'N/A';
  const doctorPhone = appointment.doctorId?.contactNumber || appointment.doctorId?.contact || 'N/A';
  const doctorEmail = appointment.doctorId?.email || 'N/A';
  const patientName = appointment.patientId?.name || 'N/A';
  const patientPhone = appointment.patientId?.contactNumber || 'N/A';
  const diagnosisText = appointment.diagnosis || 'No diagnosis provided.';
  const prescriptionText = appointment.medicalPrescription || appointment.medicineDescription || 'No medical prescription provided.';
  const paymentStatus = appointment.paymentStatus || 'unpaid';
  const paymentMethod = appointment.paymentMethod || 'N/A';
  const paymentAmount = Number(appointment.paymentAmount || 0);
  const paymentTransactionId = appointment.paymentTransactionId || 'N/A';
  const paidAtText = appointment.paidAt ? new Date(appointment.paidAt).toLocaleString() : 'N/A';

  const formatCurrency = (amount) => `Rs ${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const drawHorizontalLine = () => {
    doc.setDrawColor(80, 120, 200);
    doc.line(left, y, right, y);
    y += 18;
  };

  // ===== HOSPITAL HEADER =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(20, 80, 160);
  doc.text(hospitalName.toUpperCase(), left, y);
  y += 20;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text('Your Health, Our Priority', left, y);
  y += 14;

  doc.setTextColor(0, 0, 0);
  drawHorizontalLine();

  // ===== DOCTOR SECTION =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Dr. ' + doctorName, left, y);
  y += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(doctorSpecialization, left, y);
  y += 12;
  doc.text('Phone: ' + doctorPhone, left, y);
  y += 12;
  doc.text('Email: ' + doctorEmail, left, y);
  y += 14;

  drawHorizontalLine();

  // ===== PATIENT SECTION =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Patient Name: ', left, y);
  doc.setFont('helvetica', 'normal');
  doc.text(patientName, left + 120, y);
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.text('Patient Phone: ', left, y);
  doc.setFont('helvetica', 'normal');
  doc.text(patientPhone, left + 120, y);
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.text('Date: ', left, y);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(appointment.appointmentDate).toLocaleDateString(), left + 120, y);
  y += 14;

  drawHorizontalLine();

  // ===== DIAGNOSIS SECTION =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Diagnosis:', left, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const diagnosisLines = doc.splitTextToSize(diagnosisText, contentWidth);
  doc.text(diagnosisLines, left, y);
  y += diagnosisLines.length * 12 + 14;

  drawHorizontalLine();

  // ===== PRESCRIPTION SECTION =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Medical Prescription:', left, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const prescriptionItems = prescriptionText.split('\n').map((item, idx) => `${idx + 1}.  ${item.trim()}`);
  prescriptionItems.forEach((item) => {
    const wrappedItem = doc.splitTextToSize(item, contentWidth - 20);
    doc.text(wrappedItem, left + 10, y);
    y += wrappedItem.length * 12 + 6;
  });

  y += 8;
  drawHorizontalLine();

  // ===== PAYMENT HISTORY SECTION =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment History:', left, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Status: ${paymentStatus.toUpperCase()}`, left, y);
  y += 12;
  doc.text(`Method: ${paymentMethod.toUpperCase()}`, left, y);
  y += 12;
  doc.text(`Amount: ${formatCurrency(paymentAmount)}`, left, y);
  y += 12;
  doc.text(`Paid At: ${paidAtText}`, left, y);
  y += 12;
  doc.text(`Transaction ID: ${['online', 'upi'].includes(paymentMethod) ? paymentTransactionId : 'N/A (Cash Payment)'}`, left, y);

  y += 20;

  // ===== SIGNATURE SECTION =====
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('_________________________________', left, y);
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Dr. ' + doctorName, left, y);

  doc.save(`receipt-${appointment._id}.pdf`);
};

function PatientDashboardPage() {
  const session = getAuthSession();
  const [appointments, setAppointments] = useState([]);
  const [appointmentMessage, setAppointmentMessage] = useState('');
  const [error, setError] = useState('');
  const [supportInfo, setSupportInfo] = useState({ nearestHospital: null, nearestAmbulance: null, nearestDoctor: null });
  const [latestEmergency, setLatestEmergency] = useState(null);
  const [currentPlaceName, setCurrentPlaceName] = useState('');
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [donorSearchGroup, setDonorSearchGroup] = useState('O+');
  const [donorSearchRadius, setDonorSearchRadius] = useState('10000');
  const [donorSearchLoading, setDonorSearchLoading] = useState(false);
  const [donorSearchResults, setDonorSearchResults] = useState([]);
  const [donorSearchError, setDonorSearchError] = useState('');
  const [hospitalOptions, setHospitalOptions] = useState([]);
  const [doctorOptions, setDoctorOptions] = useState([]);
  const [createForm, setCreateForm] = useState({ hospitalId: '', doctorId: '', appointmentDate: '', appointmentTime: '' });
  const [editingAppointmentId, setEditingAppointmentId] = useState('');
  const [editDoctorOptions, setEditDoctorOptions] = useState([]);
  const [editForm, setEditForm] = useState({ hospitalId: '', doctorId: '', appointmentDate: '', appointmentTime: '' });
  const { on } = useSocket();

  const emergencyStatusMeta = {
    PENDING: { label: 'PENDING', className: 'border-cyan-300/40 bg-cyan-300/10 text-cyan-200' },
    ACCEPTED: { label: 'IN PROCESS', className: 'border-amber-300/40 bg-amber-300/10 text-amber-200' },
    COMPLETED: { label: 'SUCCESSFULLY COMPLETED', className: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200' },
    CANCELLED: { label: 'CANCELLED', className: 'border-rose-300/40 bg-rose-300/10 text-rose-200' },
  };

  const loadMyAppointments = async () => {
    const result = await apiFetch('/appointments/my', { token: session.token });
    setAppointments(result);
  };

  useEffect(() => {
    loadMyAppointments().catch((requestError) => setError(requestError.message));
  }, []);

  const loadLatestEmergency = async () => {
    try {
      const result = await apiFetch('/api/emergency/my/latest', { token: session.token });
      setLatestEmergency(result || null);
    } catch {
      setLatestEmergency(null);
    }
  };

  useEffect(() => {
    loadLatestEmergency();

    const intervalHandle = setInterval(() => {
      loadLatestEmergency();
    }, 10000);

    return () => clearInterval(intervalHandle);
  }, [session.token]);

  useEffect(() => {
    const offPatientStatus = on?.('emergency:statusChangedPatient', () => {
      loadLatestEmergency();
    });

    const offPatientAlert = on?.('emergency:newAlert', () => {
      loadLatestEmergency();
    });

    return () => {
      if (typeof offPatientStatus === 'function') offPatientStatus();
      if (typeof offPatientAlert === 'function') offPatientAlert();
    };
  }, [on, session.id]);

  useEffect(() => {
    const loadNearbySupport = async () => {
      try {
        const patient = await apiFetch(`/patients/${session.id}`, { token: session.token });
        const patientLng = patient?.geoLocation?.coordinates?.[0];
        const patientLat = patient?.geoLocation?.coordinates?.[1];

        if (Number.isFinite(Number(patientLng)) && Number.isFinite(Number(patientLat))) {
          try {
            const place = await reverseGeocodeCoordinates(patientLng, patientLat);
            setCurrentPlaceName(place || 'Unknown place');
          } catch {
            setCurrentPlaceName('Unknown place');
          }
        }

        const data = await apiFetch('/patients/me/nearby-support', { token: session.token });
        setSupportInfo({
          nearestHospital: data?.nearestHospital || null,
          nearestAmbulance: data?.nearestAmbulance || null,
          nearestDoctor: data?.nearestDoctor || null,
        });
        return;
      } catch {
        // Fallback to browser geolocation based lookup.
      }

      try {
        const coords = await requestBrowserLocation();
        try {
          const place = await reverseGeocodeCoordinates(coords.lng, coords.lat);
          setCurrentPlaceName(place || 'Unknown place');
        } catch {
          setCurrentPlaceName('Unknown place');
        }

        const data = await apiFetch(`/api/emergency/support?lng=${coords.lng}&lat=${coords.lat}`, {
          token: session.token,
        });
        setSupportInfo({
          nearestHospital: data?.nearestHospital || null,
          nearestAmbulance: data?.nearestAmbulance || null,
          nearestDoctor: data?.nearestDoctor || null,
        });
      } catch {
        setSupportInfo({ nearestHospital: null, nearestAmbulance: null, nearestDoctor: null });
      }
    };

    loadNearbySupport();
  }, [session.token]);

  useEffect(() => {
    const loadHospitals = async () => {
      try {
        const hospitals = await apiFetch('/hospitals');
        setHospitalOptions(hospitals);
      } catch {
        setHospitalOptions([]);
      }
    };

    loadHospitals();
  }, []);

  useEffect(() => {
    const loadDoctors = async () => {
      if (!createForm.hospitalId) {
        setDoctorOptions([]);
        return;
      }

      try {
        const doctors = await apiFetch(`/doctors/search?hospitalId=${encodeURIComponent(createForm.hospitalId)}`, {
          token: session.token,
        });
        setDoctorOptions(doctors);
      } catch {
        setDoctorOptions([]);
      }
    };

    loadDoctors();
  }, [createForm.hospitalId, session.token]);

  const statusCounts = useMemo(() => {
    return {
      total: appointments.length,
      pending: appointments.filter((item) => item.status === 'scheduled').length,
      fulfilled: appointments.filter((item) => item.status === 'completed').length,
      rejected: appointments.filter((item) => item.status === 'cancelled').length,
    };
  }, [appointments]);

  const selectedDoctor = useMemo(
    () => doctorOptions.find((doctor) => doctor._id === createForm.doctorId) || null,
    [doctorOptions, createForm.doctorId]
  );

  const createAppointment = async (event) => {
    event.preventDefault();
    setAppointmentMessage('');
    setError('');

    if (!createForm.hospitalId || !createForm.doctorId) {
      setError('Please select hospital and doctor');
      return;
    }

    try {
      await apiFetch('/appointments', {
        method: 'POST',
        token: session.token,
        body: {
          doctorId: createForm.doctorId,
          appointmentDate: new Date(`${createForm.appointmentDate}T00:00:00`).toISOString(),
          appointmentTime: createForm.appointmentTime,
        },
      });
      setAppointmentMessage('Appointment request submitted successfully');
      setCreateForm({ hospitalId: '', doctorId: '', appointmentDate: '', appointmentTime: '' });
      await loadMyAppointments();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    setError('');
    setAppointmentMessage('');

    try {
      await apiFetch(`/appointments/${appointmentId}`, {
        method: 'PUT',
        token: session.token,
        body: { status: 'cancelled' },
      });
      setAppointmentMessage('Appointment cancelled successfully');
      await loadMyAppointments();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteAppointment = async (appointmentId) => {
    if (!window.confirm('Delete this appointment permanently?')) return;

    setError('');
    setAppointmentMessage('');

    try {
      await apiFetch(`/appointments/${appointmentId}`, {
        method: 'DELETE',
        token: session.token,
      });
      setAppointmentMessage('Appointment deleted successfully');

      if (editingAppointmentId === appointmentId) {
        setEditingAppointmentId('');
      }

      await loadMyAppointments();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const openEditAppointment = async (appointment) => {
    const hospitalId = appointment.doctorId?.hospitalId?._id || '';

    setEditingAppointmentId(appointment._id);
    setEditForm({
      hospitalId,
      doctorId: appointment.doctorId?._id || '',
      appointmentDate: new Date(appointment.appointmentDate).toISOString().slice(0, 10),
      appointmentTime: appointment.appointmentTime || '',
    });

    if (!hospitalId) {
      setEditDoctorOptions([]);
      return;
    }

    try {
      const doctors = await apiFetch(`/doctors/search?hospitalId=${encodeURIComponent(hospitalId)}`, {
        token: session.token,
      });
      setEditDoctorOptions(doctors);
    } catch {
      setEditDoctorOptions([]);
    }
  };

  const updateEditHospital = async (hospitalId) => {
    setEditForm((prev) => ({ ...prev, hospitalId, doctorId: '' }));

    if (!hospitalId) {
      setEditDoctorOptions([]);
      return;
    }

    try {
      const doctors = await apiFetch(`/doctors/search?hospitalId=${encodeURIComponent(hospitalId)}`, {
        token: session.token,
      });
      setEditDoctorOptions(doctors);
    } catch {
      setEditDoctorOptions([]);
    }
  };

  const saveEditedAppointment = async (appointmentId) => {
    setError('');
    setAppointmentMessage('');

    if (!editForm.hospitalId || !editForm.doctorId || !editForm.appointmentDate || !editForm.appointmentTime) {
      setError('Please fill hospital, doctor, date and time before saving');
      return;
    }

    try {
      await apiFetch(`/appointments/${appointmentId}`, {
        method: 'PUT',
        token: session.token,
        body: {
          doctorId: editForm.doctorId,
          appointmentDate: new Date(`${editForm.appointmentDate}T00:00:00`).toISOString(),
          appointmentTime: editForm.appointmentTime,
        },
      });
      setAppointmentMessage('Appointment updated successfully');
      setEditingAppointmentId('');
      await loadMyAppointments();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const triggerEmergency = async () => {
    setError('');
    setAppointmentMessage('');
    setEmergencyLoading(true);

    try {
      const liveCoords = await requestBrowserLocation();
      const lng = Number(liveCoords?.lng);
      const lat = Number(liveCoords?.lat);

      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        throw new Error('Unable to detect live location. Please enable location access and try again.');
      }

      let liveAddress = '';
      try {
        const place = await reverseGeocodeCoordinates(lng, lat);
        liveAddress = String(place || '').trim();
      } catch {
        liveAddress = '';
      }

      setCurrentPlaceName(liveAddress || `${lat}, ${lng}`);

      const result = await apiFetch('/api/emergency/trigger', {
        method: 'POST',
        token: session.token,
        body: {
          lng,
          lat,
          liveAddress,
        },
      });

      setSupportInfo((prev) => ({
        nearestHospital: result?.support?.nearestHospital || prev.nearestHospital,
        nearestAmbulance: result?.support?.nearestAmbulance || prev.nearestAmbulance,
        nearestDoctor: result?.support?.nearestDoctor || prev.nearestDoctor,
      }));

      await loadLatestEmergency();

      setAppointmentMessage('Emergency alert sent with your live location. Nearest hospital, ambulance, and doctor have been notified.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setEmergencyLoading(false);
    }
  };

  const cancelLatestEmergency = async () => {
    if (!latestEmergency?._id) return;

    setError('');
    setAppointmentMessage('');

    try {
      await apiFetch(`/api/emergency/${latestEmergency._id}/cancel`, {
        method: 'POST',
        token: session.token,
      });

      await loadLatestEmergency();
      setAppointmentMessage('Emergency request cancelled successfully. Hospital and ambulance have been updated.');
    } catch (requestError) {
      setError(requestError.message);
    }
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
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">Patient Dashboard</h1>
              <p className="mt-2 text-sm text-slate-300">Track booking requests, appointment status, and manage care journey.</p>
            </div>
            <Link to="/patient/profile" className="w-full rounded-xl border border-white/25 px-4 py-2 text-center text-sm font-bold text-slate-100 transition hover:bg-white/10 sm:w-auto">
              Open Profile Page
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Applied</p>
              <p className="mt-2 text-2xl font-black sm:text-3xl">{statusCounts.total}</p>
            </div>
            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-200">Pending</p>
              <p className="mt-2 text-2xl font-black text-amber-100 sm:text-3xl">{statusCounts.pending}</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">Fulfilled</p>
              <p className="mt-2 text-2xl font-black text-emerald-100 sm:text-3xl">{statusCounts.fulfilled}</p>
            </div>
            <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-200">Rejected</p>
              <p className="mt-2 text-2xl font-black text-rose-100 sm:text-3xl">{statusCounts.rejected}</p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-rose-300/30 bg-rose-300/10 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black sm:text-2xl">Emergency Assistance</h2>
                <p className="mt-2 text-sm text-rose-100/90">Get nearest hospital, ambulance, and doctor details instantly.</p>
              </div>
              <button
                type="button"
                onClick={triggerEmergency}
                disabled={emergencyLoading}
                className="rounded-xl bg-rose-500 px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-rose-400 disabled:opacity-60"
              >
                {emergencyLoading ? 'Sending Alert...' : 'Emergency Alert'}
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-4 md:col-span-3">
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-100">Your Current Place</p>
                <p className="mt-2 font-semibold text-white">{currentPlaceName || 'Detecting place from your location...'}</p>
              </article>

              <article className="rounded-2xl border border-white/20 bg-white/10 p-4 md:col-span-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-200">My Latest Emergency</p>
                    <p className="mt-1 text-sm text-slate-200">
                      {latestEmergency ? `ID: ${latestEmergency._id}` : 'No emergency raised yet.'}
                    </p>
                  </div>
                  {latestEmergency?.status && (
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${(emergencyStatusMeta[latestEmergency.status] || emergencyStatusMeta.PENDING).className}`}>
                      {(emergencyStatusMeta[latestEmergency.status] || emergencyStatusMeta.PENDING).label}
                    </span>
                  )}
                </div>

                {latestEmergency && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <p className="text-xs text-slate-200">Assigned Hospital: {latestEmergency.hospitalId?.name || 'Pending assignment'}</p>
                    <p className="text-xs text-slate-200">Assigned Ambulance: {latestEmergency.ambulanceId?.vehicleNumber || 'Pending assignment'}</p>
                    <p className="text-xs text-slate-200">Driver: {latestEmergency.ambulanceId?.driverName || 'Pending assignment'}</p>
                    <p className="text-xs text-slate-200">Driver Phone: {latestEmergency.ambulanceId?.driverPhone || '-'}</p>
                  </div>
                )}

                {latestEmergency && ['PENDING', 'ACCEPTED'].includes(String(latestEmergency.status || '').toUpperCase()) && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={cancelLatestEmergency}
                      className="rounded-lg border border-rose-300/50 bg-rose-300/20 px-3 py-2 text-xs font-bold text-rose-100 transition hover:bg-rose-300/30"
                    >
                      Cancel Emergency Request
                    </button>
                  </div>
                )}
              </article>

              <article className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-200">Nearest Hospital</p>
                <p className="mt-2 font-bold text-white">{supportInfo.nearestHospital?.name || 'Unavailable'}</p>
                <p className="text-xs text-slate-200">{supportInfo.nearestHospital?.phone || '-'}</p>
              </article>
              <article className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-200">Nearest Ambulance</p>
                <p className="mt-2 font-bold text-white">{supportInfo.nearestAmbulance?.vehicleNumber || 'Unavailable'}</p>
                <p className="text-xs text-slate-200">{supportInfo.nearestAmbulance?.driverName || '-'}</p>
              </article>
              <article className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-200">Nearest Doctor</p>
                <p className="mt-2 font-bold text-white">{supportInfo.nearestDoctor?.name || 'Unavailable'}</p>
                <p className="text-xs text-slate-200">{supportInfo.nearestDoctor?.specialization || '-'}</p>
              </article>
            </div>

            <div className="mt-5 rounded-2xl border border-red-300/30 bg-red-300/10 p-4">
              <h3 className="text-lg font-black text-red-100">Need Blood? Search Nearby Donors</h3>
              <p className="mt-1 text-xs text-red-100/90">Search matching blood-group donors near your live location.</p>

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
          </div>

          <form onSubmit={createAppointment} className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h2 className="text-xl font-black sm:text-2xl">Book Appointment</h2>
            <p className="mt-2 text-sm text-slate-300">Select hospital, then doctor, then date and time to book your appointment.</p>
            <div className="mt-4 grid gap-3">
              <select
                value={createForm.hospitalId}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    hospitalId: event.target.value,
                    doctorId: '',
                  }))
                }
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2"
                required
              >
                <option value="">Select Hospital</option>
                {hospitalOptions.map((hospital) => (
                  <option key={hospital._id} value={hospital._id}>
                    {hospital.name}
                  </option>
                ))}
              </select>

              <select
                value={createForm.doctorId}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, doctorId: event.target.value }))}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2"
                required
                disabled={!createForm.hospitalId}
              >
                <option value="">Select Doctor</option>
                {doctorOptions.map((doctor) => (
                  <option key={doctor._id} value={doctor._id}>
                    {doctor.name} - {doctor.specialization} ({doctor.available ? 'Present' : 'Not Present'})
                  </option>
                ))}
              </select>

              {selectedDoctor && (
                <div className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs text-slate-200">
                  <p className="font-semibold text-slate-100">Doctor Availability</p>
                  <p className="mt-1">
                    Status: {selectedDoctor.available ? 'Present in hospital' : 'Not present in hospital'}
                  </p>
                  <p className="mt-1">Active Hours: {formatActiveHours(selectedDoctor)}</p>
                  {!selectedDoctor.available && selectedDoctor.unavailableReason && (
                    <p className="mt-1 text-amber-200">Reason: {selectedDoctor.unavailableReason}</p>
                  )}
                </div>
              )}

              <input
                type="date"
                value={createForm.appointmentDate}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, appointmentDate: event.target.value }))}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2"
                required
              />
              <input
                type="time"
                value={createForm.appointmentTime}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, appointmentTime: event.target.value }))}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2"
                required
              />
            </div>
            <button className="mt-4 w-full rounded-xl bg-neon px-4 py-2 text-sm font-black text-ink sm:w-auto">Book</button>
            {appointmentMessage && <p className="mt-3 text-sm text-neon">{appointmentMessage}</p>}
            {error && <p className="mt-3 text-sm text-coral">{error}</p>}
          </form>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h2 className="text-xl font-black sm:text-2xl">My Applied Appointments</h2>
            <p className="mt-2 text-sm text-slate-300">See all requests with status, diagnosis, prescription, and actions.</p>

            <div className="mt-4 space-y-3 md:hidden">
              {appointments.map((appointment) => (
                <article key={appointment._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-100">{appointment.doctorId?.name || 'Unknown doctor'}</p>
                      <p className="text-xs text-slate-300">{appointment.doctorId?.hospitalId?.name || '-'}</p>
                      <p className="text-xs text-slate-300">{appointment.doctorId?.specialization || '-'}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusStyles[appointment.status] || statusStyles.scheduled}`}>
                      {statusLabel[appointment.status] || appointment.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <p>Date: {new Date(appointment.appointmentDate).toLocaleDateString()}</p>
                    <p>Time: {appointment.appointmentTime || '-'}</p>
                  </div>

                  <p className="mt-3 text-xs text-slate-300">Diagnosis: {appointment.diagnosis || '-'}</p>
                  <p className="mt-1 text-xs text-slate-300">Prescription: {appointment.medicalPrescription || appointment.medicineDescription || '-'}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {appointment.medicalPrescription || appointment.diagnosis || appointment.medicineDescription ? (
                      <button
                        onClick={() => downloadPrescription(appointment)}
                        className="rounded-lg border border-neon/50 px-2 py-1 text-xs font-bold text-neon"
                      >
                        Download
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => openEditAppointment(appointment)}
                      disabled={appointment.status === 'completed'}
                      className="rounded-lg border border-blue-300/50 px-2 py-1 text-xs font-bold text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelAppointment(appointment._id)}
                      disabled={appointment.status !== 'scheduled'}
                      className="rounded-lg border border-amber-300/50 px-2 py-1 text-xs font-bold text-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAppointment(appointment._id)}
                      className="rounded-lg border border-rose-300/50 px-2 py-1 text-xs font-bold text-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}

              {appointments.length === 0 && (
                <p className="rounded-xl border border-white/10 px-3 py-6 text-center text-sm text-slate-300">No appointments applied yet.</p>
              )}
            </div>

            <div className="-mx-2 mt-4 hidden overflow-x-auto rounded-xl border border-white/10 sm:mx-0 md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/10 text-xs uppercase tracking-wider text-slate-300">
                  <tr>
                    <th className="px-3 py-2">Hospital</th>
                    <th className="px-3 py-2">Doctor</th>
                    <th className="px-3 py-2">Specialization</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Diagnosis</th>
                    <th className="px-3 py-2">Medical Prescription</th>
                    <th className="px-3 py-2">Prescription</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment._id} className="border-t border-white/10">
                      <td className="px-3 py-2">{appointment.doctorId?.hospitalId?.name || '-'}</td>
                      <td className="px-3 py-2">{appointment.doctorId?.name || 'Unknown doctor'}</td>
                      <td className="px-3 py-2">{appointment.doctorId?.specialization || '-'}</td>
                      <td className="px-3 py-2">{new Date(appointment.appointmentDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{appointment.appointmentTime || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusStyles[appointment.status] || statusStyles.scheduled}`}>
                          {statusLabel[appointment.status] || appointment.status}
                        </span>
                      </td>
                      <td className="max-w-xs px-3 py-2 text-xs text-slate-300">{appointment.diagnosis || '-'}</td>
                      <td className="max-w-xs px-3 py-2 text-xs text-slate-300">{appointment.medicalPrescription || appointment.medicineDescription || '-'}</td>
                      <td className="px-3 py-2">
                        {appointment.medicalPrescription || appointment.diagnosis || appointment.medicineDescription ? (
                          <button
                            onClick={() => downloadPrescription(appointment)}
                            className="rounded-lg border border-neon/50 px-2 py-1 text-xs font-bold text-neon"
                          >
                            Download
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Not available</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditAppointment(appointment)}
                            disabled={appointment.status === 'completed'}
                            className="rounded-lg border border-blue-300/50 px-2 py-1 text-xs font-bold text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelAppointment(appointment._id)}
                            disabled={appointment.status !== 'scheduled'}
                            className="rounded-lg border border-amber-300/50 px-2 py-1 text-xs font-bold text-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAppointment(appointment._id)}
                            className="rounded-lg border border-rose-300/50 px-2 py-1 text-xs font-bold text-rose-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {appointments.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-slate-300" colSpan={10}>No appointments applied yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {editingAppointmentId && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg font-bold text-slate-100">Edit Appointment</h3>
                <p className="mt-1 text-xs text-slate-300">Update hospital, doctor, date, and time for the selected appointment.</p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <select
                    value={editForm.hospitalId}
                    onChange={(event) => updateEditHospital(event.target.value)}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2"
                  >
                    <option value="">Select Hospital</option>
                    {hospitalOptions.map((hospital) => (
                      <option key={hospital._id} value={hospital._id}>
                        {hospital.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={editForm.doctorId}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, doctorId: event.target.value }))}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2"
                    disabled={!editForm.hospitalId}
                  >
                    <option value="">Select Doctor</option>
                    {editDoctorOptions.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                          {doctor.name} - {doctor.specialization} ({doctor.available ? 'Present' : 'Not Present'})
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={editForm.appointmentDate}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, appointmentDate: event.target.value }))}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2"
                  />
                  <input
                    type="time"
                    value={editForm.appointmentTime}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, appointmentTime: event.target.value }))}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => saveEditedAppointment(editingAppointmentId)}
                    className="rounded-lg border border-neon/50 px-3 py-1.5 text-xs font-bold text-neon"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAppointmentId('')}
                    className="rounded-lg border border-white/25 px-3 py-1.5 text-xs font-bold text-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default PatientDashboardPage;
