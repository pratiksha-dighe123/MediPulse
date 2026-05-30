# Composite Structure Diagram

```mermaid
classDiagram
    class Admin {
      +Hospital[] hospitals
    }
    class Hospital {
      +Doctor[] doctors
      +Ambulance[] ambulances
      +BloodBank bloodBank
    }
    class Doctor {
      +Appointment[] appointments
    }
    class Patient {
      +Appointment[] appointments
      +BloodRequest[] bloodRequests
    }
```

---

**Description:**
This composite structure diagram shows how main entities are composed of or aggregate other entities:
- Admin manages multiple hospitals.
- Hospital contains doctors, ambulances, and a blood bank.
- Doctor and patient have lists of appointments; patient also has blood requests.