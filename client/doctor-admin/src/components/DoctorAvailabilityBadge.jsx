import { useEffect, useState } from 'react';
import { useSocket } from '../lib/useSocket';

export function DoctorAvailabilityBadge({ doctorId, doctorName, initialAvailable = true }) {
  const { on } = useSocket();
  const [available, setAvailable] = useState(initialAvailable);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!doctorId) return;

    // Listen for doctor availability changes
    const unsubscribe = on('doctor:availabilityUpdated', (data) => {
      if (data.doctorId === doctorId) {
        setAvailable(data.available);
      }
    });

    return unsubscribe;
  }, [doctorId, on]);

  if (available) {
    return (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-semibold text-emerald-200">Available</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2" title={reason}>
      <span className="h-2 w-2 rounded-full bg-amber-400" />
      <span className="text-xs font-semibold text-amber-200">{reason || 'Unavailable'}</span>
    </div>
  );
}

export default DoctorAvailabilityBadge;
