# Blood Bank Module Use Case Diagram

```mermaid
usecase
  actor Patient
  actor Donor
  actor Admin
  actor BloodBankStaff
  Patient --> (Request Blood)
  Donor --> (Donate Blood)
  BloodBankStaff --> (Manage Inventory)
  BloodBankStaff --> (Approve Request)
  Admin --> (Oversee Blood Bank)
```

---

**Explanation:**
- Patients request blood.
- Donors donate blood.
- Staff manage inventory and requests.
- Admin oversees operations.