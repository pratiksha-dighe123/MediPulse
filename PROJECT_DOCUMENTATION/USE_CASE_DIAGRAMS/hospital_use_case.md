# Hospital Module Use Case Diagram

```mermaid
usecase
  actor Admin
  actor HospitalStaff
  actor Doctor
  Admin --> (Add Hospital)
  Admin --> (Remove Hospital)
  HospitalStaff --> (Update Hospital Info)
  HospitalStaff --> (Manage Resources)
  Doctor --> (Associate with Hospital)
```

---

**Explanation:**
- Admin manages hospitals.
- Staff update info and resources.
- Doctors are associated with hospitals.