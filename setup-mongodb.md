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

### Option 1: Simple Setup (No Authentication)

```bash
# Install Docker Desktop first, then run:
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Start existing container
docker start mongodb
```

**Connection String**: `mongodb://localhost:27017/local-knowledge`

### Option 2: With Authentication (Recommended for Production)

```bash
# Create MongoDB container with authentication
docker run -d --name mongodb -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=localknowledge \
  -e MONGO_INITDB_ROOT_PASSWORD=myknowledge \
  -e MONGO_INITDB_DATABASE=local-knowledge \
  mongo:latest --auth
```

**Connection String**: `mongodb://localknowledge:myknowledge@localhost:27017/local-knowledge?authSource=admin`

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
# Connect to MongoDB (without auth)
docker exec -it mongodb mongosh local-knowledge

# Or with authentication
docker exec -it mongodb mongosh local-knowledge -u localknowledge -p myknowledge --authenticationDatabase admin
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

---

**Note**: For local development, Option 1 (no authentication) is simpler. For production or shared environments, use Option 2 (with authentication).