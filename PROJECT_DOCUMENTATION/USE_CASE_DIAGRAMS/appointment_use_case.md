# Appointment Module Use Case Diagram

```mermaid
usecase
  actor Patient
  actor Doctor
  actor Admin
  Patient --> (Book Appointment)
  Patient --> (Cancel Appointment)
  Patient --> (View Appointments)
  Doctor --> (View Appointments)
  Doctor --> (Accept/Reject Appointment)
  Admin --> (View All Appointments)
  Admin --> (Manage Appointments)
```

---

**Explanation:**
- Patients book/cancel appointments.
- Doctors manage their appointments.
- Admin oversees all appointments.