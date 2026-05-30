# Database Schema Design

This file describes the main collections/tables and their key fields. For full details, see the models in `server/models/`.

## Main Collections

### Admin
- _id
- username
- password
- ...

### Hospital
- _id
- name
- address
- ...

### Doctor
- _id
- name
- specialization
- hospitalId
- ...

### Patient
- _id
- name
- age
- ...

### Appointment
- _id
- doctorId
- patientId
- date
- status
- ...

### Ambulance
- _id
- hospitalId
- driverName
- ...

### EmergencyRequest
- _id
- patientId
- ambulanceId
- status
- ...

### BloodBank
- _id
- hospitalId
- ...

### BloodInventory
- _id
- bloodBankId
- bloodType
- units
- ...

### BloodRequest
- _id
- patientId
- bloodBankId
- status
- ...

### Donor
- _id
- name
- bloodType
- ...

### VisitorCounter
- _id
- patientId
- count
- ...

---

See ER_DIAGRAM.md for relationships.