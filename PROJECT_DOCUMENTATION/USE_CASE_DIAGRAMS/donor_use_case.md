# Donor Module Use Case Diagram

```mermaid
usecase
  actor Donor
  actor BloodBankStaff
  actor Admin
  Donor --> (Register as Donor)
  Donor --> (Donate Blood)
  Donor --> (View Donation History)
  BloodBankStaff --> (Approve Donation)
  Admin --> (Manage Donors)
```

---

**Explanation:**
- Donors register and donate.
- Staff approve donations.
- Admin manages donor records.