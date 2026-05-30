
# Object Diagram

```mermaid
classDiagram
    class Admin {
      username = "admin1"
      password = "***"
    }
    class Hospital {
      name = "City Hospital"
      address = "123 Main St"
    }
    class Doctor {
      name = "Dr. Smith"
      specialization = "Cardiology"
      hospitalId = "hosp1"
    }
    class Patient {
      name = "John Doe"
      age = 30
    }
    class Appointment {
      doctorId = "doc1"
      patientId = "pat1"
      date = "2026-03-23"
      status = "Scheduled"
    }
    class Ambulance {
      hospitalId = "hosp1"
      driverName = "Mike"
    }
    class EmergencyRequest {
      patientId = "pat1"
      ambulanceId = "amb1"
      status = "Pending"
    }
```

---

**Description:**
This object diagram shows a snapshot of the system after a patient books an appointment, with example attribute values and links between objects.

**Explanation:**
- Shows example objects and their attribute values at a specific time.