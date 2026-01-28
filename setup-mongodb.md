# MongoDB Setup Instructions

## Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/atlas
2. Click "Try Free" and create an account
3. Choose the "Free" tier (M0)

## Step 2: Create a Cluster
1. Click "Build a Database"
2. Choose "FREE" tier (M0)
3. Select your preferred cloud provider (AWS, Google Cloud, or Azure)
4. Choose a region close to you
5. Click "Create"

## Step 3: Set Up Database Access
1. In the left sidebar, click "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and password (save these!)
5. Select "Read and write to any database"
6. Click "Add User"

## Step 4: Set Up Network Access
1. In the left sidebar, click "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
4. Click "Confirm"

## Step 5: Get Connection String
1. Go back to "Database" in the sidebar
2. Click "Connect"
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password
6. Replace `<dbname>` with `local-knowledge`

## Step 6: Update Environment File
Update your `server/.env` file with the MongoDB Atlas connection string:

```env
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/local-knowledge?retryWrites=true&w=majority
```

## Alternative: Use Local MongoDB with Docker

If you prefer to use a local MongoDB instance with Docker:

### Option 1 (Recommended / Matches this repo): With Authentication (Default)

```bash
# Create MongoDB container with authentication (matches setup.sh / check-server.sh)
docker run -d --name mongodb -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=localknowledge \
  -e MONGO_INITDB_ROOT_PASSWORD=myknowledge \
  -e MONGO_INITDB_DATABASE=local-knowledge \
  mongo:latest --auth

# If the container already exists but is stopped:
docker start mongodb
```

**Connection String (use in `server/.env`)**:

`mongodb://localknowledge:myknowledge@localhost:27017/local-knowledge?authSource=admin`

### Option 2 (Alternative): Simple Setup (No Authentication)

This is **not** what the repo scripts use by default. Only use this if you also change your `MONGODB_URI`.

```bash
# Create MongoDB container without authentication
docker run -d --name mongodb -p 27017:27017 mongo:latest
```

**Connection String (use in `server/.env`)**:

`mongodb://localhost:27017/local-knowledge`

### Docker Management Commands

```bash
# Start MongoDB container
docker start mongodb

# Stop MongoDB container
docker stop mongodb

# View MongoDB logs
docker logs mongodb

# Remove MongoDB container (fresh start)
docker rm mongodb

# Check if MongoDB is running
docker ps | grep mongodb
```

### Verify MongoDB Connection

After starting MongoDB, verify it's working:

```bash
# Connect with authentication (recommended)
docker exec -it mongodb mongosh local-knowledge -u localknowledge -p myknowledge --authenticationDatabase admin

# If using the no-auth option:
# docker exec -it mongodb mongosh local-knowledge
```

## Troubleshooting

### MongoDB Connection Issues

- **Docker not running**: Start Docker Desktop
- **Container not running**: `docker start mongodb`
- **Port already in use**: Stop the process using port 27017 or remove the container
- **Connection refused**: Check if MongoDB container is running with `docker ps`
- **Authentication failed**: Ensure you're using the correct username/password and `authSource=admin`

### Check MongoDB Status

```bash
# Check if container exists and is running
docker ps -a | grep mongodb

# View container logs
docker logs mongodb

# Test connection from application
curl http://localhost:5001/api/health
```

## Default Superadmin User

After running `setup.sh`, a default superadmin user is automatically created:

- **Email**: `admin@localknowledge.local`
- **Password**: `admin123`
- **Role**: Super Administrator (immutable, full system access, cannot be modified or deleted)

⚠️ **IMPORTANT**: Password change is **REQUIRED** on first login! You will be automatically redirected to the Settings page.

To manually create the superadmin user:

```bash
# Create superadmin user (if roles are initialized)
cd server
node scripts/create-admin-user.js
```

**Note**: The superadmin role is immutable and cannot be modified, deleted, or deactivated. It provides full system access across all features.

---

**Note**: This repo's default scripts (`setup.sh`, `check-server.sh`) use **authentication enabled** for local MongoDB. Keep your Docker setup and `MONGODB_URI` consistent to avoid connection issues.