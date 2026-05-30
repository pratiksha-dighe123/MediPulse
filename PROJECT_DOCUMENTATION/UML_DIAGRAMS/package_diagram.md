# Package Diagram

```mermaid
package "Client" {
  [doctor-admin]
  [doctor-frontend]
  [ambulance-frontend]
}
package "Server" {
  [controllers]
  [models]
  [routes]
  [services]
  [middleware]
  [utils]
}
Client ..> Server
Server ..> Database
```

---

**Description:**
This package diagram shows the logical grouping of code into modules/packages:
- Client: Contains all frontend applications.
- Server: Contains backend logic, organized into controllers, models, routes, services, middleware, and utilities.
- Arrows show dependencies between packages.