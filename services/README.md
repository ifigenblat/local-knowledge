# Microservices Architecture

This directory contains the microservices implementation for LocalKnowledge.

## Services

- **auth-service** (Port 5001): Authentication and authorization
- **user-service** (Port 5002): User management
- **role-service** (Port 5003): Role and permission management
- **gateway** (Port 8000): API Gateway

## Shared Modules

- **shared/database.js**: MongoDB connection shared across services
- **shared/repository-pattern.js**: Base repository class for database abstraction

## Running Services

### Development (Individual Services)

```bash
# Auth Service
cd services/auth-service
npm install
npm run dev

# User Service
cd services/user-service
npm install
npm run dev

# Role Service
cd services/role-service
npm install
npm run dev

# API Gateway
cd services/gateway
npm install
npm run dev
```

### Environment Variables

Each service needs a `.env` file:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/local-knowledge

# Service URLs (for inter-service communication)
AUTH_SERVICE_URL=http://localhost:5001
USER_SERVICE_URL=http://localhost:5002
ROLE_SERVICE_URL=http://localhost:5003

# JWT
JWT_SECRET=your-secret-key

# Ports
PORT=5001  # Service-specific port
```

## Architecture

```
Frontend → API Gateway (8000) → Services (5001-5003) → MongoDB
```

## Testing

Test each service individually:

```bash
# Auth Service
curl http://localhost:5001/health

# User Service
curl http://localhost:5002/health

# Role Service
curl http://localhost:5003/health

# API Gateway
curl http://localhost:8000/health
curl http://localhost:8000/services/health
```

## Repository Pattern

All services use the repository pattern for database abstraction:

- `BaseRepository`: Common database operations
- Service-specific repositories extend `BaseRepository`
- Services use repositories, not direct database access

This makes it easy to swap MongoDB for PostgreSQL later.
