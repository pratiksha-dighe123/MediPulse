# Module Flows & Explanations

For each module, this file explains:
- The main flow (step-by-step)
- Key functions/services/middleware
- How data moves through the stack

## Example: Doctor Module
1. Admin adds a doctor (form in admin panel → POST `/doctors`)
2. Backend validates and saves doctor in DB
3. Doctor can log in, update profile, view appointments
4. Doctor status/availability managed via real-time updates

## Example: Ambulance Module
1. Patient requests ambulance (frontend form → POST `/ambulance/request`)
2. Backend matches nearest ambulance, updates status
3. Real-time tracking via Socket.IO
4. Driver and patient get notifications

---

See USE_CASE_DIAGRAMS/ for visual use cases per module.