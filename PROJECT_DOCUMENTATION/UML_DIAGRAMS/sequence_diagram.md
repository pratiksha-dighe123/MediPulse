# Sequence Diagram: Appointment Booking

```mermaid
sequenceDiagram
    participant Patient
    participant Frontend
    participant Backend
    participant Doctor
    Patient->>Frontend: Book Appointment
    Frontend->>Backend: POST /appointments
    Backend->>Doctor: Notify (Socket.IO)
    Backend->>Backend: Save Appointment
    Backend->>Frontend: Response
    Frontend->>Patient: Show Confirmation
```

---

**Description:**
This sequence diagram shows the flow of booking an appointment:
- Patient initiates booking via frontend.
- Frontend sends booking request to backend.
- Backend notifies doctor and saves appointment.
- Backend responds to frontend, which confirms to patient.