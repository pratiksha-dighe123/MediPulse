import { useEffect, useState } from 'react';
import { useSocket } from '../lib/useSocket';

export function DoctorAvailabilityBadge({ doctorId, initialAvailable = true }) {
  const { on } = useSocket();
  const [available, setAvailable] = useState(initialAvailable);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!doctorId) return;

    // Listen for doctor availability changes
    const unsubscribe = on('doctor:availabilityUpdated', (data) => {
      if (data.doctorId === doctorId) {
        setAvailable(data.available);
        setReason(data.reason || '');
      }
    });

    return unsubscribe;
  }, [doctorId, on]);

  if (available) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-semibold text-emerald-200">Available</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1" title={reason}>
      <span className="h-2 w-2 rounded-full bg-amber-400" />
      <span className="text-xs font-semibold text-amber-200">{reason || 'Unavailable'}</span>
    </span>
  );
}

export default DoctorAvailabilityBadge;
