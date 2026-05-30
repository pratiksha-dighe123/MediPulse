# Authentication Module Use Case Diagram

```mermaid
usecase
  actor Admin
  actor Doctor
  actor Patient
  actor Donor
  actor AmbulanceDriver
  Admin --> (Login)
  Doctor --> (Login)
  Patient --> (Register)
  Patient --> (Login)
  Donor --> (Register)
  Donor --> (Login)
  AmbulanceDriver --> (Login)
```

---

**Explanation:**
- All users authenticate via login/register as per their role.