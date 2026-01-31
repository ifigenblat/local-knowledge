# Microservices Quick Start Guide

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Ensure MongoDB is running
docker run -d -p 27017:27017 --name mongodb mongo:7

# Or use existing MongoDB instance
```

### 2. Initialize Roles (Important!)

Before starting services, initialize roles in the database:

```bash
cd ../server
node scripts/init-roles.js
```

### 3. Start All Services

```bash
cd services
./start-all.sh
```

This will start:
- Auth Service (port 5001)
- User Service (port 5002)
- Role Service (port 5003)
- API Gateway (port 8000)

### 4. Test Services

```bash
./test-services.sh
```

### 5. Stop All Services

```bash
./stop-all.sh
```

## 📋 Manual Testing

### Health Checks

```bash
# Individual services
curl http://localhost:5001/health
curl http://localhost:5002/health
curl http://localhost:5003/health
curl http://localhost:8000/health

# Gateway service health
curl http://localhost:8000/services/health
```

### Register User

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123456"
  }'
```

### Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

Save the token from the response!

### Get Roles (with token)

```bash
TOKEN="your-token-here"
curl http://localhost:8000/api/roles \
  -H "Authorization: Bearer $TOKEN"
```

### Get Users (with token)

```bash
TOKEN="your-token-here"
curl http://localhost:8000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

## 🔍 Troubleshooting

### Services won't start
- Check MongoDB is running: `docker ps | grep mongo`
- Check ports are available: `lsof -i :5001 -i :5002 -i :5003 -i :8000`
- Check logs: `cat services/logs/*.log`

### Connection errors
- Verify MongoDB URI in `.env` files
- Check service URLs are correct
- Ensure services are started in order

### Authentication fails
- Verify JWT_SECRET matches across all services
- Check token is being sent correctly
- Verify user exists in database

## 📝 Next Steps

1. Test all endpoints
2. Add remaining services (Card, Collection, Upload)
3. Update frontend to use API Gateway
4. Add monitoring and logging
