# Testing Microservices with UI

## Quick Answer

**YES, you can test the three implemented services (Auth, User, Role) using the UI!**

However, Cards, Collections, and Upload features won't work yet as those services haven't been implemented.

## Setup

### 1. Update Frontend Proxy

The frontend proxy has been updated to point to the API Gateway (port 8000).

### 2. Start Everything

```bash
# Terminal 1: Start MongoDB (if not running)
docker run -d -p 27017:27017 --name mongodb mongo:7

# Terminal 2: Initialize roles
cd server
node scripts/init-roles.js

# Terminal 3: Start microservices
cd services
./start-all.sh

# Terminal 4: Start frontend
cd client
npm start
```

### 3. Test in Browser

Open http://localhost:3000

## What You Can Test

### ✅ Working Features

1. **Login/Register** - Full authentication flow
2. **User Management** - View, create, edit, delete users
3. **Role Management** - View, create, edit, delete roles
4. **Settings** - Profile and password management

### ❌ Not Working Yet

1. **Cards** - Card Service not implemented
2. **Collections** - Collection Service not implemented  
3. **Upload** - Upload Service not implemented
4. **Dashboard** - Requires Cards Service

## Expected Behavior

- **Login/Register**: Should work perfectly
- **Users Page**: Should load and allow CRUD operations
- **Roles Page**: Should load and allow CRUD operations
- **Cards Page**: Will show error (service not implemented)
- **Collections Page**: Will show error (service not implemented)
- **Upload Page**: Will show error (service not implemented)
- **Dashboard**: Will show error (requires Cards Service)

## Testing Checklist

- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Can view users list
- [ ] Can create new user
- [ ] Can edit user
- [ ] Can assign role to user
- [ ] Can view roles list
- [ ] Can create new role
- [ ] Can edit role permissions
- [ ] Can delete role (non-system roles)

## Notes

- The frontend will automatically use the API Gateway
- All authentication flows through Auth Service
- User management flows through User Service
- Role management flows through Role Service
- Cards/Collections/Upload will fail gracefully (service not found)
