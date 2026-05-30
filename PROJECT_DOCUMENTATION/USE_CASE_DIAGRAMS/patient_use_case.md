# Patient Module Use Case Diagram

```mermaid
usecase
  actor Patient
  actor Doctor
  actor Admin
  Patient --> (Register)
  Patient --> (Login)
  Patient --> (Update Profile)
  Patient --> (Book Appointment)
  Patient --> (Request Ambulance)
  Patient --> (Request Blood)
  Patient --> (View Appointments)
  Patient --> (View Medical History)
  Doctor --> (View Patient Profile)
  Admin --> (Manage Patient)
```

---

**Explanation:**
- Patients manage their own data and requests.
- Doctors and admins can view/manage patient data.