# MongoDB Atlas Setup Instructionss

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
6. Replace `<dbname>` with `card-app`

## Step 6: Update Environment File
Update your `server/.env` file with the MongoDB Atlas connection string:

```env
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/card-app?retryWrites=true&w=majority
```

## Alternative: Use Local MongoDB with Docker
If you prefer to use Docker:

```bash
# Install Docker Desktop first, then run:
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

Then use: `mongodb://localhost:27017/card-app` in your .env file.

