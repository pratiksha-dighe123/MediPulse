
# Class Diagram

```mermaid
classDiagram
    Admin <|-- Hospital
    Hospital <|-- Doctor
    Doctor <|-- Appointment
    Patient <|-- Appointment
    Hospital <|-- Ambulance
    Ambulance <|-- EmergencyRequest
    Patient <|-- BloodRequest
    BloodBank <|-- BloodInventory
    BloodBank <|-- BloodRequest
    Donor <|-- BloodRequest
    Doctor <|-- Patient
    Patient <|-- VisitorCounter
    class Admin {
      +String username
      +String password
    }
    class Hospital {
      +String name
      +String address
    }
    class Doctor {
      +String name
      +String specialization
      +String hospitalId
    }
    class Patient {
      +String name
      +int age
    }
    class Appointment {
      +String doctorId
      +String patientId
      +Date date
      +String status
    }
    class Ambulance {
      +String hospitalId
      +String driverName
    }
    class EmergencyRequest {
      +String patientId
      +String ambulanceId
      +String status
    }
    class BloodBank {
      +String hospitalId
      +String name
    }
    class BloodInventory {
      +String bloodBankId
      +String bloodGroup
      +int unitsAvailable
    }
    class BloodRequest {
      +String requesterId
      +String bloodGroup
      +int unitsRequired
    }
    class Donor {
      +String fullName
      +String bloodGroup
    }
    class VisitorCounter {
      +String patientId
      +int visitCount
    }
```

---

**Description:**
This class diagram shows the main classes/entities in the system, their attributes, and relationships (inheritance, association, aggregation) as implemented in the backend models.
      +String hospitalId
      +String driverName
    }
    class EmergencyRequest {
      +String patientId
      +String ambulanceId
      +String status
    }
    class BloodBank {
      +String hospitalId
    }
    class BloodInventory {
      +String bloodBankId
      +String bloodType
      +int units
    }
    class BloodRequest {
      +String patientId
      +String bloodBankId
      +String status
    }
    class Donor {
      +String name
      +String bloodType
    }
    class VisitorCounter {
      +String patientId
      +int count
    }
```

---

**Explanation:**
- Shows main classes/entities and their relationships.