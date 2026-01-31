# Microservices Architecture Proposal

## Overview

This document outlines a microservices architecture for LocalKnowledge, where services handle database access instead of direct application connections. This provides better separation of concerns, scalability, and maintainability.

---

## Current Architecture (Monolithic)

```
Frontend (React)
    ↓
API Gateway / Express Server
    ↓
MongoDB (Direct Access)
```

**Issues:**
- Tight coupling between routes and database
- Difficult to scale individual features
- Single point of failure
- Hard to deploy independently

---

## Proposed Microservices Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                    http://localhost:3000                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                               │
│              (Kong / Express Gateway / Nginx)                  │
│                    http://localhost:8000                        │
│  - Authentication                                              │
│  - Rate Limiting                                               │
│  - Request Routing                                             │
│  - Load Balancing                                              │
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
│   :5007      │      │   :5008       │      │   :5009      │
└──────────────┘      └──────────────┘      └──────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                          │
│                    (Shared or Per-Service)                       │
│                  postgresql://localhost:5432                    │
└─────────────────────────────────────────────────────────────────┘
```

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
- Calls User Service for user creation/validation
- Publishes events: `user.registered`, `user.logged_in`

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
- Called by Auth Service
- Calls Role Service for role assignment
- Publishes events: `user.created`, `user.updated`, `user.deleted`

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
- Called by User Service for role assignment
- Called by other services for permission checks
- Publishes events: `role.created`, `role.updated`, `role.assigned`

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
- Publishes events: `card.created`, `card.updated`, `card.deleted`

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
- Publishes events: `collection.created`, `collection.updated`, `card.added_to_collection`

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
- Publishes events: `file.uploaded`, `file.processed`

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
- Publishes events: `content.processed`, `content.validated`

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
- Publishes events: `ai.regenerated`, `ai.comparison_generated`

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
- Called by Auth Service for password reset
- Called by other services for notifications
- Uses MailHog (dev) or SMTP (prod)
- Publishes events: `email.sent`, `email.failed`

---

### 10. **Preview Service** (Port 5010) - Optional
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

### Option 1: Shared Database (Recommended for Start)
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

### Option 2: Database Per Service (True Microservices)
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

**Recommendation**: Start with Option 1 (Shared Database), migrate to Option 2 later if needed.

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
5. **Load Balancing**: Distribute load across service instances
6. **Request/Response Transformation**: Format data
7. **CORS**: Handle cross-origin requests
8. **Logging**: Centralized logging

### Implementation Options:

#### Option 1: Express Gateway (Recommended)
```javascript
// gateway/index.js
const gateway = require('express-gateway');

gateway()
  .load(path.join(__dirname, 'config'))
  .run();
```

**Config:**
```yaml
# config/gateway.config.yml
http:
  port: 8000

apiEndpoints:
  api:
    host: localhost
    paths: ['/api/*']

serviceEndpoints:
  auth:
    url: 'http://auth-service:5001'
  user:
    url: 'http://user-service:5002'
  # ... other services

policies:
  - jwt
  - rate-limit
  - proxy

pipelines:
  default:
    apiEndpoints:
      - api
    policies:
      - jwt:
          - action:
              secretOrPublicKey: process.env.JWT_SECRET
      - rate-limit:
          - action:
              max: 100
              windowMs: 900000
      - proxy:
          - action:
              serviceEndpoint: user
              changeOrigin: true
```

#### Option 2: Kong
- More features, more complex
- Better for production

#### Option 3: Nginx
- Simple, performant
- Less features

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

### Problem:
Services need to find each other

### Solutions:

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

#### Option 3: Configuration
- Hardcode service URLs in config
- Simple but not flexible

---

## Deployment

### Option 1: Docker Compose (Development)
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

### Option 2: Kubernetes (Production)
- Deploy each service as a pod
- Use services for load balancing
- Use ingress for API Gateway

---

## Migration Path

### Phase 1: Extract Services (2-3 weeks)
1. Extract Auth Service
2. Extract User Service
3. Extract Role Service
4. Set up API Gateway
5. Test integration

### Phase 2: Extract Core Services (2-3 weeks)
1. Extract Card Service
2. Extract Collection Service
3. Extract Upload Service
4. Test file upload flow

### Phase 3: Extract Supporting Services (1-2 weeks)
1. Extract Content Processing Service
2. Extract AI Service
3. Extract Email Service
4. Test end-to-end flows

### Phase 4: Optimize & Scale (Ongoing)
1. Add message queue
2. Implement caching
3. Add monitoring
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

## Next Steps

1. **Decision**: Confirm microservices approach
2. **Design**: Finalize service boundaries
3. **Prototype**: Build one service (Auth) as proof of concept
4. **Plan**: Create detailed migration plan
5. **Execute**: Follow phased approach
6. **Monitor**: Set up observability from day one

---

## Conclusion

Moving to microservices provides significant benefits but adds complexity. The key is to start simple and add complexity only when needed. A phased approach with shared database initially, then migrating to database-per-service if needed, is recommended.

The architecture proposed here provides:
- Clear service boundaries
- Scalability
- Maintainability
- Technology flexibility
- Team autonomy

With proper planning and execution, this migration can be completed successfully and provide a solid foundation for future growth.
