# Postman Setup Guide for User Service

## Prerequisites

- **API Gateway** must be running on port 8000 (e.g. `cd services/gateway && npm start`), and auth/user/role services on their ports. All requests go through the gateway; login and user endpoints are proxied correctly.

## Quick Start

1. **Import the Collection**
   - Open Postman
   - Click **Import** button
   - Select `User_Service_Postman_Collection.json`
   - Click **Import**

2. **Import the Environment** (Optional but Recommended)
   - Click **Import** button
   - Select `Postman_Environment.json`
   - Click **Import**
   - Select the "LocalKnowledge - Local" environment from the dropdown (top right)

3. **Get Your Authentication Token**
   - In the collection, go to **Authentication** folder
   - Run **"Login (Get Token)"** request
   - The token will be automatically saved to your environment variables
   - You can now use all other endpoints!

## Environment Variables

The collection uses these variables (auto-set if using the environment file):

- `baseUrl`: `http://localhost:8000` (API Gateway)
- `token`: Auto-populated after login
- `userId`: Auto-populated after login
- `roleId`: Set manually if needed for role operations
- `adminEmail`: `admin@localknowledge.local`
- `adminPassword`: `admin123`

## Manual Setup (Without Environment File)

If you prefer to set variables manually:

1. In Postman, click the **eye icon** (top right) to view variables
2. Add these variables:
   - `baseUrl`: `http://localhost:8000`
   - `token`: (leave empty, will be set after login)

## Endpoints Overview

### Authentication
- **Login (Get Token)** - Get authentication token (saves to environment)

### Users
- **Get All Users** - List all users with pagination
- **Get All Users (with search)** - Search users by name/email
- **Get User by ID** - Get specific user details
- **Create User** - Create new user without role
- **Create User (with Role)** - Create new user with role assignment
- **Update User** - Update user name/email
- **Update User (Change Role)** - Change user's role
- **Update User (Change Password)** - Update user password
- **Delete User** - Delete a user

## Usage Examples

### 1. First Time Setup
```
1. Run "Login (Get Token)" → Token saved automatically
2. Run "Get All Users" → See all users
3. Copy a user ID from response
4. Use that ID in "Get User by ID"
```

### 2. Create a New User
```
1. Run "Create User" with your desired data
2. Copy the returned user ID
3. Update userId variable or use directly in other requests
```

### 3. Update User Role
```
1. Get a role ID (from Roles service or database)
2. Set roleId variable or replace {{roleId}} in request body
3. Run "Update User (Change Role)"
```

## Authentication

All user endpoints require Bearer token authentication. The collection is pre-configured with:
- **Type**: Bearer Token
- **Token**: `{{token}}` (from environment)

If you get `401 Unauthorized`:
1. Make sure you've run "Login (Get Token)" first
2. Check that the token variable is set in your environment
3. Verify the token hasn't expired (tokens typically last 24 hours)

## Direct Service Access

If you want to test directly against the user-service (bypassing gateway):

1. Change `baseUrl` to `http://localhost:5002`
2. Note: Direct service access may not have authentication middleware

## Troubleshooting

### "No token provided" error
- Run "Login (Get Token)" first
- Check that environment is selected (top right dropdown)

### "Invalid token" error
- Token may have expired
- Run "Login (Get Token)" again to get a new token

### Connection refused
- Make sure services are running: `cd services && ./start-all.sh`
- Check that API Gateway is on port 8000: `curl http://localhost:8000/health`

### 404 Not Found
- Verify `baseUrl` is set to `http://localhost:8000`
- Check that you're using the correct endpoint path

## Response Examples

### Get All Users Response
```json
{
  "users": [
    {
      "_id": "...",
      "name": "Administrator",
      "email": "admin@localknowledge.local",
      "role": {
        "_id": "...",
        "displayName": "Super Administrator"
      }
    }
  ],
  "pagination": {
    "current": 1,
    "total": 1,
    "hasNext": false,
    "hasPrev": false,
    "totalUsers": 2
  }
}
```

### Create User Request Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "roleId": null
}
```

### Update User Request Body (Partial)
```json
{
  "name": "John Updated",
  "email": "john.updated@example.com"
}
```
