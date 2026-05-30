# Doctor Module Use Case Diagram

```mermaid
usecase
  actor Admin
  actor Doctor
  actor Patient
  Admin --> (Add Doctor)
  Admin --> (Remove Doctor)
  Doctor --> (Login)
  Doctor --> (Update Profile)
  Doctor --> (View Appointments)
  Doctor --> (Set Availability)
  Doctor --> (Respond to Appointment)
  Patient --> (View Doctor Profile)
  Patient --> (Book Appointment)
```

---

**Explanation:**
- Admin manages doctors.
- Doctors manage their profile, availability, and appointments.
- Patients interact with doctors for booking and viewing profiles.