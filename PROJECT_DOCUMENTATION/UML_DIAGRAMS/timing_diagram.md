# Timing Diagram: Appointment Lifecycle

```mermaid
gantt
    dateFormat  YYYY-MM-DD
    section Appointment
    Requested    :a1, 2026-03-23, 1d
    Confirmed    :a2, after a1, 1d
    Completed    :a3, after a2, 1d
```

---

**Description:**
This timing diagram shows the time-based progression of an appointment:
- Requested: Initial state.
- Confirmed: After request is accepted.
- Completed: After appointment is fulfilled.