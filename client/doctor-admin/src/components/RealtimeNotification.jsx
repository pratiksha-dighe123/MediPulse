import { useEffect, useState } from 'react';
import { useSocket } from '../lib/useSocket';

export function RealtimeNotification({ appointmentId, onStatusChange }) {
  const { on } = useSocket();
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!appointmentId) return;

    // Listen for appointment status changes (admin version)
    const unsubscribe = on('appointment:statusChangedAdmin', (data) => {
      if (data.appointmentId === appointmentId) {
        setNotification({
          type: 'success',
          message: `${data.doctorName} updated appointment to ${data.status}`,
          timestamp: data.updatedAt,
        });

        if (onStatusChange) {
          onStatusChange(data);
        }

        // Auto-dismiss after 5 seconds
        setTimeout(() => setNotification(null), 5000);
      }
    });

    return unsubscribe;
  }, [appointmentId, on, onStatusChange]);

  if (!notification) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <div className="rounded-lg border border-emerald-300/40 bg-emerald-300/10 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-200">{notification.message}</p>
            <p className="mt-1 text-xs text-emerald-300/70">
              {new Date(notification.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RealtimeNotification;
