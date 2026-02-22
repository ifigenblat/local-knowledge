# Microservices Architecture

## Overview

LocalKnowledge runs on a **microservices architecture**: an API Gateway (port 8000) routes requests to multiple services, each with a single responsibility. All services use a **shared PostgreSQL** database. This document describes the current design.

---

## Previous Architecture (Monolithic) – for context

The app previously used a single backend with direct DB access. That had tight coupling, scaling limits, and a single point of failure. The sections below describe the **current** microservices setup.

---

## Current Architecture (Microservices – implemented)

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                    http://localhost:3000                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                               │
│            Express + http-proxy-middleware                     │
│                    http://localhost:8000                        │
│  - JWT validation (auth)                                       │
│  - Request routing (proxy to services)                         │
│  - CORS, logging                                               │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Auth Service │      │ User Service │      │ Role Service │
│   :5001      │      │   :5002      │      │   :5003      │
└──────────────┘      └──────────────┘      └──────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Card Service │      │Collection Svc│     │ Upload Svc   │
│   :5004      │      │   :5005       │      │   :5006      │
└──────────────┘      └──────────────┘      └──────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│Content Proc  │      │  AI Service  │      │Email Service │
│   :5007      │      │   :5008      │      │   :5009      │
└──────────────┘      └──────────────┘      └──────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│Preview Svc   │      │ Files Service│      │Uploads Static│
│   :5011      │      │   :5012      │      │   :5013      │
└──────────────┘      └──────────────┘      └──────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                          │
│                    (Shared – services/shared/postgres)          │
│                  postgresql://localhost:5432                     │
└─────────────────────────────────────────────────────────────────┘
```
**All services:** auth (5001), user (5002), role (5003), card (5004), collection (5005), upload (5006), content (5007), ai (5008), email (5009), preview (5011), files (5012), uploads-static (5013), gateway (8000).

---

## Service Breakdown

### 1. **Auth Service** (Port 5001)
**Responsibilities:**
- User authentication (login, register)
- JWT token generation and validation
- Password hashing and verification
- Session management
- Token refresh

**API Endpoints:**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/validate
```

**Database Access:**
- Reads from `users` table (email, password)
- No direct writes (delegates to User Service)

**Communication:**
- Calls User Service (HTTP) for registration; uses shared DB (UserRepository) for login

---

### 2. **User Service** (Port 5002)
**Responsibilities:**
- User CRUD operations
- User profile management
- User preferences
- Password reset token management
- User search and filtering

**API Endpoints:**
```
GET    /api/users              # List users (admin)
GET    /api/users/:id          # Get user
POST   /api/users              # Create user
PUT    /api/users/:id          # Update user
DELETE /api/users/:id          # Delete user
PUT    /api/users/:id/password # Change password
GET    /api/users/me           # Get current user
PUT    /api/users/me/profile   # Update profile
```

**Database Access:**
- Full CRUD on `users` table
- Owns user data

**Communication:**
- Called by Auth Service for registration
- Calls Role Service (HTTP) for role info; has own assign-role endpoint

---

### 3. **Role Service** (Port 5003)
**Responsibilities:**
- Role CRUD operations
- Permission management
- Role assignment to users
- Permission checking

**API Endpoints:**
```
GET    /api/roles              # List roles
GET    /api/roles/:id          # Get role
POST   /api/roles              # Create role
PUT    /api/roles/:id          # Update role
DELETE /api/roles/:id          # Delete role
POST   /api/roles/:id/assign  # Assign role to user
GET    /api/roles/:id/users    # Get users with role
POST   /api/roles/check        # Check permissions
```

**Database Access:**
- Full CRUD on `roles` table
- Reads from `users` table (for role assignment)
- Owns role and permission data

**Communication:**
- Called by User Service for role assignment; fetches users from User Service for role membership

---

### 4. **Card Service** (Port 5004)
**Responsibilities:**
- Card CRUD operations
- Card search and filtering
- Card sharing (cardId)
- Card metadata management
- Card relationships (related cards)

**API Endpoints:**
```
GET    /api/cards              # List cards (with filters)
GET    /api/cards/:id          # Get card (by ID or cardId)
POST   /api/cards              # Create card
PUT    /api/cards/:id          # Update card
DELETE /api/cards/:id          # Delete card
POST   /api/cards/:id/regenerate # Regenerate card
GET    /api/cards/search       # Full-text search
```

**Database Access:**
- Full CRUD on `cards` table
- Reads from `users` table (for ownership)
- Owns card data

**Communication:**
- Called by Upload Service after processing
- Calls AI Service for regeneration
- Calls Content Processing Service for rule-based regeneration

---

### 5. **Collection Service** (Port 5005)
**Responsibilities:**
- Collection CRUD operations
- Card-to-collection relationships
- Collection sharing
- Bulk operations

**API Endpoints:**
```
GET    /api/collections         # List collections
GET    /api/collections/:id     # Get collection with cards
POST   /api/collections         # Create collection
PUT    /api/collections/:id     # Update collection
DELETE /api/collections/:id     # Delete collection
POST   /api/collections/:id/cards/:cardId    # Add card
DELETE /api/collections/:id/cards/:cardId   # Remove card
POST   /api/collections/:id/cards/bulk      # Bulk add cards
```

**Database Access:**
- Full CRUD on `collections` table
- Full CRUD on `collection_cards` junction table
- Reads from `cards` table (for validation)
- Reads from `users` table (for ownership)

**Communication:**
- Calls Card Service to validate card existence

---

### 6. **Upload Service** (Port 5006)
**Responsibilities:**
- File upload handling
- File storage management
- File validation
- Upload progress tracking
- File metadata extraction

**API Endpoints:**
```
POST   /api/upload              # Upload single file
POST   /api/upload/multiple    # Upload multiple files
GET    /api/upload/progress/:id # Get upload progress
DELETE /api/upload/:id         # Delete uploaded file
```

**Database Access:**
- Writes to file storage (local/S3)
- No direct database access (delegates to other services)

**Communication:**
- Calls Content Processing Service to process files
- Calls Card Service to create cards

---

### 7. **Content Processing Service** (Port 5007)
**Responsibilities:**
- Extract content from files (PDF, DOCX, XLSX, images)
- Content validation
- Card type detection
- Category and tag generation
- Content hash generation

**API Endpoints:**
```
POST   /api/process/content    # Process file content
POST   /api/process/validate   # Validate content
POST   /api/process/regenerate # Regenerate from snippet
```

**Database Access:**
- No direct database access (stateless service)

**Communication:**
- Called by Upload Service
- Called by Card Service for regeneration

---

### 8. **AI Service** (Port 5008)
**Responsibilities:**
- AI-powered card regeneration
- Ollama integration
- Comparison generation (rule-based vs AI)
- AI status checking

**API Endpoints:**
```
POST   /api/ai/regenerate      # Regenerate card with AI
POST   /api/ai/compare         # Generate comparison
GET    /api/ai/status          # Check AI availability
```

**Database Access:**
- No direct database access (stateless service)

**Communication:**
- Called by Card Service
- Calls Ollama API

---

### 9. **Email Service** (Port 5009)
**Responsibilities:**
- Send emails (password reset, notifications)
- Email template management
- Email queue management
- Email delivery tracking

**API Endpoints:**
```
POST   /api/email/send         # Send email
POST   /api/email/reset-password # Send password reset
GET    /api/email/status/:id   # Get email status
```

**Database Access:**
- No direct database access (stateless service)

**Communication:**
- Called by Auth Service for password reset emails
- Uses MailHog (dev) or SMTP (prod); stateless

---

### 10. **Preview Service** (Port 5011)
**Responsibilities:**
- File preview generation
- Image thumbnail generation
- Document preview rendering

**API Endpoints:**
```
GET    /api/preview/:filename  # Get file preview
GET    /api/preview/:filename/thumbnail # Get thumbnail
```

**Database Access:**
- Reads from file storage
- No database access

---

## Database Strategy

**Current implementation:** This project uses a **single shared PostgreSQL** database (`services/shared/postgres`). The options below describe that and a possible future alternative.

### Option 1: Shared Database — *current*
**Single PostgreSQL database shared by all services**

**Pros:**
- Simpler to implement
- Easier transactions across services
- Single source of truth
- Easier to query across services

**Cons:**
- Tight coupling (services know about each other's data)
- Harder to scale independently
- Schema changes affect multiple services

**Implementation:**
```sql
-- Single database: localknowledge
-- Tables:
- users
- roles
- cards
- collections
- collection_cards
- card_related_cards
```

---

### Option 2: Database Per Service — *not implemented (future alternative)*
**Each service has its own database**

**Pros:**
- True service independence
- Independent scaling
- Technology diversity (different DBs per service)
- Better isolation

**Cons:**
- Complex data consistency
- Harder to query across services
- More complex deployment
- Eventual consistency challenges

**Implementation:**
```sql
-- Auth Service DB: auth_db
- users (email, password, tokens)

-- User Service DB: user_db
- users (profile, preferences)
- user_roles (junction)

-- Role Service DB: role_db
- roles
- permissions

-- Card Service DB: card_db
- cards
- card_related_cards

-- Collection Service DB: collection_db
- collections
- collection_cards
```

**Note:** The project uses Option 1. Option 2 is a possible future evolution if service independence or scaling demands it.

---

## Communication Patterns

### 1. Synchronous Communication (REST API)
**Use for:**
- Request-response patterns
- Immediate feedback needed
- Simple operations

**Example:**
```javascript
// Card Service calls User Service
const user = await axios.get(`http://user-service:5002/api/users/${userId}`);
```

**Tools:**
- Axios / Fetch
- Service discovery (Consul, Eureka)
- Load balancer

---

### 2. Asynchronous Communication (Message Queue)
**Use for:**
- Event-driven operations
- Non-critical operations
- Decoupling services

**Example:**
```javascript
// User Service publishes event
await messageQueue.publish('user.created', {
  userId: user.id,
  email: user.email
});

// Card Service subscribes
messageQueue.subscribe('user.created', async (event) => {
  // Create default collection for new user
});
```

**Tools:**
- RabbitMQ
- Apache Kafka
- Redis Pub/Sub
- AWS SQS

---

### 3. Service Mesh (Advanced)
**Use for:**
- Service-to-service communication
- Load balancing
- Circuit breaking
- Observability

**Tools:**
- Istio
- Linkerd
- Consul Connect

---

## API Gateway

### Responsibilities:
1. **Authentication**: Validate JWT tokens
2. **Authorization**: Check permissions (calls Role Service)
3. **Rate Limiting**: Per-user/IP rate limits
4. **Request Routing**: Route to appropriate service
5. **Request/Response Transformation**: Forward as-is (no load balancing in current setup)
6. **CORS**: Handle cross-origin requests
7. **Logging**: Centralized logging

### Actual implementation (this project)

The gateway is **Express + http-proxy-middleware** (see `services/gateway/index.js`):
- Single Express app on port 8000
- JWT validation middleware for protected routes
- `createProxyMiddleware` per service (auth, user, role, cards, etc.)
- No Kong, Nginx, or express-gateway package; no load balancing (one instance per service)

---

## Service Implementation Structure

```
services/
├── auth-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
├── user-service/
│   └── ...
├── card-service/
│   └── ...
└── ...
```

**Each Service:**
- Independent codebase
- Own package.json
- Own database connection (to shared or own DB)
- Own Dockerfile
- Own tests
- Own deployment

---

## Data Consistency

### Challenges:
1. **Distributed Transactions**: Hard to implement
2. **Eventual Consistency**: Data may be temporarily inconsistent
3. **Saga Pattern**: For complex workflows

### Solutions:

#### 1. Event Sourcing
Store all events, rebuild state from events

#### 2. Saga Pattern
```javascript
// Upload Service orchestrates saga
async function uploadFileSaga(file) {
  try {
    // Step 1: Upload file
    const fileId = await uploadService.upload(file);
    
    // Step 2: Process content
    const content = await contentService.process(fileId);
    
    // Step 3: Create cards
    const cards = await cardService.createMany(content);
    
    // All steps succeed
    return { success: true, cards };
  } catch (error) {
    // Compensating transactions
    await uploadService.delete(fileId);
    throw error;
  }
}
```

#### 3. Two-Phase Commit (Not Recommended)
Too complex, not recommended for microservices

---

## Service Discovery

**Current implementation:** The gateway and services use **configuration** (environment variables / hardcoded localhost URLs in `services/gateway/index.js`). No service registry or DNS-based discovery.

### Alternatives (not used in this project):

#### Option 1: Service Registry (Consul, Eureka)
```javascript
// Service registers itself
await consul.agent.service.register({
  name: 'user-service',
  address: 'localhost',
  port: 5002
});

// Other services discover
const services = await consul.health.service({
  service: 'user-service',
  passing: true
});
```

#### Option 2: DNS-Based
- Use Kubernetes DNS
- Use Docker Compose service names

#### Option 3: Configuration — *current*
- Service URLs in gateway config (env vars: `USER_SERVICE_URL`, etc., or defaults like `http://localhost:5002`)
- Simple, no discovery service required

---

## Deployment

**Current implementation:** Services are started as **local processes** via `./start-all.sh` (or `npm run backend`). PostgreSQL can be Docker or local. No Docker Compose or Kubernetes for the app today.

### Alternatives (optional / future):

#### Option 1: Docker Compose — *not implemented*
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: localknowledge
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
  
  auth-service:
    build: ./services/auth-service
    ports:
      - "5001:5001"
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/localknowledge
      JWT_SECRET: secret
  
  user-service:
    build: ./services/user-service
    ports:
      - "5002:5002"
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/localknowledge
  
  # ... other services
  
  api-gateway:
    build: ./gateway
    ports:
      - "8000:8000"
    depends_on:
      - auth-service
      - user-service
      # ... other services
```

#### Option 2: Kubernetes — *not implemented*
- Deploy each service as a pod
- Use services for load balancing
- Use ingress for API Gateway

---

## Migration Path (historical / reference)

*The microservices below are already extracted. This section is kept for reference.*

### Phase 1: Extract Services (done)
1. ~~Extract Auth Service~~ ✓
2. ~~Extract User Service~~ ✓
3. ~~Extract Role Service~~ ✓
4. ~~Set up API Gateway~~ ✓
5. ~~Test integration~~ ✓

### Phase 2: Extract Core Services (done)
1. ~~Extract Card Service~~ ✓
2. ~~Extract Collection Service~~ ✓
3. ~~Extract Upload Service~~ ✓
4. ~~Test file upload flow~~ ✓

### Phase 3: Extract Supporting Services (done)
1. ~~Extract Content Processing Service~~ ✓
2. ~~Extract AI Service~~ ✓
3. ~~Extract Email Service~~ ✓
4. ~~Preview, Files, Uploads-static~~ ✓

### Phase 4: Optimize & Scale (optional / future)
1. Add message queue (optional)
2. Implement caching (optional)
3. Add monitoring (optional)
4. Optimize performance

---

## Benefits

### 1. Scalability
- Scale services independently
- Scale only what's needed
- Better resource utilization

### 2. Maintainability
- Smaller codebases
- Clear boundaries
- Easier to understand

### 3. Technology Diversity
- Use different tech per service
- Choose best tool for each job

### 4. Team Autonomy
- Teams work independently
- Faster development
- Less conflicts

### 5. Fault Isolation
- Service failure doesn't break everything
- Better resilience

---

## Challenges

### 1. Complexity
- More moving parts
- Harder to debug
- More infrastructure

### 2. Network Latency
- Service-to-service calls
- More network hops
- Need caching

### 3. Data Consistency
- Distributed transactions hard
- Eventual consistency
- Need careful design

### 4. Testing
- Integration testing harder
- Need service mocks
- End-to-end testing complex

### 5. Deployment
- More services to deploy
- Need orchestration
- More monitoring

---

## Monitoring & Observability

### Required:
1. **Logging**: Centralized logging (ELK, Loki)
2. **Metrics**: Service metrics (Prometheus, Grafana)
3. **Tracing**: Distributed tracing (Jaeger, Zipkin)
4. **Health Checks**: Service health endpoints
5. **Alerting**: Alert on failures

### Tools:
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Prometheus + Grafana**: Metrics
- **Jaeger**: Distributed tracing
- **Sentry**: Error tracking

---

## Security

### Considerations:
1. **Service-to-Service Auth**: mTLS, API keys
2. **Network Security**: Service mesh, firewalls
3. **Data Encryption**: At rest and in transit
4. **Secrets Management**: Vault, AWS Secrets Manager
5. **Rate Limiting**: Per service and global

---

## Cost Estimation

### Development:
- **Time**: 6-8 weeks for full migration
- **Complexity**: High
- **Team Size**: 2-3 developers

### Infrastructure:
- **Development**: Docker Compose (free)
- **Production**: 
  - Multiple service instances
  - Load balancers
  - Message queue
  - Monitoring tools
  - **Estimated**: 2-3x current infrastructure cost

---

## Recommendation

### Start Simple:
1. **Phase 1**: Extract 3-4 core services (Auth, User, Card, Collection)
2. **Phase 2**: Add API Gateway
3. **Phase 3**: Add message queue for async operations
4. **Phase 4**: Extract remaining services

### Don't Over-Engineer:
- Start with shared database
- Use REST for communication
- Add complexity only when needed

---

## Running the stack

- **Start all services:** From repo root `npm run backend`, or from `services/` run `./start-all.sh`. See **README.md** and **QUICK_REFERENCE.md** for commands.
- **Database:** PostgreSQL (Docker or local). Schema and seed: from `services/` run `npm run sync-postgres` and `npm run seed-postgres`. See **services/POSTGRES_MIGRATION.md**.

---

## Conclusion

The current architecture provides:
- Clear service boundaries (auth, user, role, cards, collections, upload, content, AI, email, preview, files, uploads-static)
- Single API Gateway (port 8000) for the frontend
- Shared PostgreSQL with schema and models in `services/shared/postgres`
- Scalability and maintainability; optional future evolution to database-per-service if needed
