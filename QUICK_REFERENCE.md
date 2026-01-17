# 🚀 LocalKnowledge - Quick Reference

## 📋 **Essential Commands**

### **Setup & Installation**
```bash
# Automated setup (recommended)
npm run setup

# Manual setup
npm run install-all
npm run dev
```

### **Start/Stop Application**
```bash
# Start both frontend and backend
npm run dev

# Stop all services
npm run stop

# Start services separately
npm run server    # Backend only
npm run client    # Frontend only
```

### **Docker Management**
```bash
# MongoDB container
npm run docker:start     # Start MongoDB
npm run docker:stop      # Stop MongoDB
npm run docker:restart   # Restart MongoDB
npm run docker:logs      # View MongoDB logs
```

### **Testing & Health Checks**
```bash
# Test services
npm run test:backend     # Test backend API
npm run test:frontend    # Test frontend
npm run test:proxy       # Test proxy connection
```

### **Maintenance**
```bash
# Clean install (remove all node_modules)
npm run clean
npm run install-all

# Build for production
npm run build
```

## 🌐 **Access Points**

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **Health Check**: http://localhost:5001/api/health

## 🔐 **Default Test Account**

- **Email**: `test@example.com`
- **Password**: `password` (or `test123`, `123456`)

## 📁 **Key Files & Locations**

### **Configuration Files**
- `server/.env` - Backend environment variables
- `client/package.json` - Frontend proxy configuration
- `package.json` - Root scripts and dependencies

### **Critical Components**
- `server/models/Collection.js` - Collection model
- `client/src/store/slices/authSlice.js` - Authentication
- `client/src/store/index.js` - Redux store
- `client/src/pages/Dashboard.js` - Main dashboard

### **File Storage**
- `server/uploads/` - Uploaded files storage
- MongoDB - Database storage

## 🚨 **Troubleshooting**

### **Port Conflicts**
```bash
# Kill processes on ports 3000 and 5001
lsof -ti:3000 | xargs kill -9
lsof -ti:5001 | xargs kill -9
```

### **MongoDB Issues**
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Start MongoDB if stopped
docker start mongodb

# Create new MongoDB container
docker run -d --name mongodb -p 27017:27017 mongo:latest
```

### **Dependency Issues**
```bash
# Clean and reinstall
npm run clean
npm run install-all
```

### **Proxy Errors**
- Verify `client/package.json` has `"proxy": "http://localhost:5001"`
- Ensure backend is running on port 5001
- Check that both services are running

## 📊 **File Types Supported**

- **Documents**: PDF, DOCX, TXT, MD, JSON
- **Spreadsheets**: XLSX (Excel files)
- **Images**: PNG, JPG, JPEG

## 🎯 **Typical Workflow**

1. **Start the app**: `npm run dev`
2. **Open browser**: http://localhost:3000
3. **Login/Register**: Use test account or create new one
4. **Upload files**: Go to Upload page, drag & drop files
5. **View cards**: Check View or Cards pages
6. **Click cards**: Open full-screen modal to view complete content
7. **Scroll content**: Long text is scrollable within the modal
8. **Create collections**: Organize cards by topic
9. **Rate & review**: Track learning progress

## 🔧 **Development Commands**

```bash
# View backend logs
cd server && npm run dev

# View frontend logs
cd client && npm start

# Check database
docker exec -it mongodb mongosh local-knowledge
```

## 📝 **Environment Variables**

### **Backend (.env)**
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/local-knowledge
JWT_SECRET=your-secret-key-here
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

## 🎉 **Success Indicators**

✅ Backend responds: `{"status":"OK","message":"Server is running"}`  
✅ Frontend loads: HTTP 200 OK  
✅ Proxy works: Frontend can reach backend  
✅ Can register/login  
✅ Can upload files  
✅ Cards are created from uploads  

---

**Quick Reference - Keep this handy! 📚**
