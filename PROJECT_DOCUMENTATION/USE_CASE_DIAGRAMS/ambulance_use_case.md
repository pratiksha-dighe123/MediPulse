# Ambulance Module Use Case Diagram

```mermaid
usecase
  actor Patient
  actor AmbulanceDriver
  actor Admin
  Patient --> (Request Ambulance)
  AmbulanceDriver --> (View Requests)
  AmbulanceDriver --> (Update Status)
  Admin --> (Manage Ambulances)
  Admin --> (Assign Ambulance)
```

---

**Explanation:**
- Patients request ambulances.
- Drivers handle requests and update status.
- Admin manages and assigns ambulances.