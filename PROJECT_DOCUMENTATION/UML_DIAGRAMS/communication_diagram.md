# Communication Diagram: Ambulance Request

```mermaid
sequenceDiagram
    participant Patient
    participant Frontend
    participant Backend
    participant AmbulanceDriver
    Patient->>Frontend: Request Ambulance
    Frontend->>Backend: POST /ambulance/request
    Backend->>AmbulanceDriver: Notify (Socket.IO)
    AmbulanceDriver->>Backend: Update Status
    Backend->>Frontend: Response
    Frontend->>Patient: Show Status
```

---

**Description:**
This communication diagram details the message flow for an ambulance request:
- Patient initiates a request via the frontend.
- Frontend sends the request to the backend.
- Backend notifies the ambulance driver (e.g., via Socket.IO).
- Driver updates status back to backend.
- Backend responds to frontend, which updates the patient.