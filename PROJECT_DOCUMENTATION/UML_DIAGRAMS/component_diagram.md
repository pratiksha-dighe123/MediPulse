# Component Diagram

```mermaid
componentDiagram
    component Client
    component Server
    component Database
    Client --> Server: REST API / Socket.IO
    Server --> Database: MongoDB
```

---

**Description:**
This component diagram shows the main system components:
- Client: Web/mobile frontend applications.
- Server: Node.js/Express backend API.
- Database: MongoDB for persistent storage.
- Interactions: Client communicates with server via REST API or Socket.IO; server interacts with database.