# Deployment Diagram

```mermaid
deploymentDiagram
    node Client
    node Server
    node Database
    Client --> Server
    Server --> Database
```

---

**Description:**
This deployment diagram shows the physical deployment of the system:
- Client: User devices (browsers, mobile apps).
- Server: Application server running backend logic.
- Database: MongoDB server for data storage.
- Connections: Client communicates with server; server communicates with database.