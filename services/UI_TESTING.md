# UI Testing with Microservices

## ✅ What Works with UI

The following features can be tested through the UI:

1. **Authentication** (Auth Service)
   - ✅ User Registration
   - ✅ User Login
   - ✅ Password Reset (Forgot Password)
   - ✅ Token Validation

2. **User Management** (User Service)
   - ✅ View Users (Users page)
   - ✅ Create User
   - ✅ Edit User
   - ✅ Delete User
   - ✅ Assign Roles

3. **Role Management** (Role Service)
   - ✅ View Roles (Roles page)
   - ✅ Create Role
   - ✅ Edit Role
   - ✅ Delete Role

## ❌ What Doesn't Work Yet

These features require additional services that haven't been implemented yet:

1. **Cards** (Card Service - Not Implemented)
   - ❌ View Cards
   - ❌ Create Card
   - ❌ Edit Card
   - ❌ Delete Card
   - ❌ Card Search/Filter

2. **Collections** (Collection Service - Not Implemented)
   - ❌ View Collections
   - ❌ Create Collection
   - ❌ Add Cards to Collection

3. **Upload** (Upload Service - Not Implemented)
   - ❌ File Upload
   - ❌ File Processing

4. **Dashboard** (Requires Cards Service)
   - ❌ Card Statistics
   - ❌ Recent Cards

## 🚀 How to Test

### 1. Start Services

```bash
cd services
./start-all.sh
```

### 2. Initialize Roles (IMPORTANT!)

Before testing, initialize roles:

```bash
cd ../server
node scripts/init-roles.js
```

### 3. Start Frontend

```bash
cd ../client
npm start
```

The frontend will now connect to the API Gateway on port 8000.

### 4. Test Features

#### Authentication
1. Go to http://localhost:3000
2. Click "Register" to create a new account
3. Or use existing credentials to login
4. Test "Forgot Password" flow

#### User Management
1. Login as admin/superadmin
2. Navigate to "Users" in the sidebar
3. Test:
   - View all users
   - Create new user
   - Edit user details
   - Assign role to user
   - Delete user

#### Role Management
1. Navigate to "Roles" in the sidebar
2. Test:
   - View all roles
   - Create new role
   - Edit role permissions
   - Delete role

## 🔧 Troubleshooting

### Frontend can't connect
- Check API Gateway is running: `curl http://localhost:8000/health`
- Check proxy in `client/package.json` is set to `http://localhost:8000`
- Restart frontend after changing proxy

### Authentication fails
- Check Auth Service is running: `curl http://localhost:8000/health`
- Check JWT_SECRET matches in all services
- Check roles are initialized

### 404 errors for Cards/Collections
- This is expected - those services aren't implemented yet
- Only Auth, User, and Role services are available

## 📝 Next Steps

To make all UI features work, implement:
1. Card Service
2. Collection Service
3. Upload Service
4. Content Processing Service
