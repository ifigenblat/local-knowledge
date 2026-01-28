# 🚀 LocalKnowledge - Quick Reference

## 📋 **Essential Commands**

### **Setup & Installation**
```bash
# Automated setup (recommended)
npm run setup

# Server health check / auto-fix (recommended if something feels broken)
./check-server.sh

# Full system API smoke test
./test-system.sh

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
- **AI Status**: http://localhost:5001/api/ai/status
- **MailHog** (Email Testing): http://localhost:8025
- **Ollama** (AI, optional): http://localhost:11434

## 🔐 **Default Accounts**

### **Superadmin Account** (Created automatically)
- **Email**: `admin@localknowledge.local`
- **Password**: `admin123`
- **Role**: Super Administrator (immutable, full access)
- ⚠️ **Password change is REQUIRED on first login!**

### **Test Account** (Create manually)
- **Email**: `test@example.com`
- **Password**: `password` (or `test123`, `123456`)

## 📁 **Key Files & Locations**

### **Configuration Files**
- `server/.env` - Backend environment variables
- `client/package.json` - Frontend proxy configuration
- `package.json` - Root scripts and dependencies

### **Critical Components**
- `server/models/` - User, Card, Collection models
- `server/routes/` - Auth, Cards, Upload, Collections, Preview routes
- `client/src/store/slices/` - Redux slices (auth, cards, collections)
- `client/src/pages/` - All page components (Dashboard, Cards, View, Upload, Collections, Settings, Auth pages)
- `client/src/components/` - Reusable components (Layout, CardDetailModal, UploadZone, ImageZoomViewer)

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

# Create new MongoDB container (matches setup.sh / check-server.sh)
docker run -d --name mongodb -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=localknowledge \
  -e MONGO_INITDB_ROOT_PASSWORD=myknowledge \
  -e MONGO_INITDB_DATABASE=local-knowledge \
  mongo:latest --auth
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

- **Documents**: PDF, DOCX, DOC, TXT, MD, JSON
- **Spreadsheets**: XLSX, XLS (Excel files)
- **Images**: PNG, JPG, JPEG, GIF

## 🎯 **Typical Workflow**

1. **Start the app**: `npm run dev`
2. **Open browser**: http://localhost:3000
3. **Login/Register**: Use test account or create new one
4. **Upload files**: Go to Upload page, drag & drop files
5. **View cards**: Check View (grid) or Cards (table) pages
6. **Click cards**: Open full-screen modal to view complete content
7. **Scroll content**: Long text is scrollable within the modal
8. **Create collections**: Organize cards by topic
9. **Manage account**: Update profile and password in Settings
10. **Reset password**: Use "Forgot password?" link on login page
11. **Regenerate a card (AI)**: Open a card → click **Regenerate (AI)** → compare both versions → **Use This Version**

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

### **Backend (server/.env)**
```env
PORT=5001
MONGODB_URI=mongodb://localknowledge:myknowledge@localhost:27017/local-knowledge?authSource=admin
JWT_SECRET=your-secret-key-here
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Email Configuration (Local Development)
MAILHOG_HOST=127.0.0.1
MAILHOG_PORT=1025

# For Gmail SMTP (Optional - uncomment to use):
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# AI Configuration (Optional - for AI-powered card regeneration)
# OLLAMA_ENABLED=true
# OLLAMA_API_URL=http://localhost:11434
# OLLAMA_MODEL=llama2
```

## 🎉 **Success Indicators**

✅ Backend responds: `{"status":"OK","message":"Server is running"}`  
✅ Frontend loads: HTTP 200 OK  
✅ Proxy works: Frontend can reach backend  
✅ Can register/login  
✅ Can upload files  
✅ Cards are created from uploads  
✅ Password reset emails appear in MailHog (http://localhost:8025)  
✅ Settings page accessible for profile/password management
✅ AI status endpoint responds: `GET /api/ai/status`
✅ AI compare view appears when clicking **Regenerate (AI)** (if enabled/available)

## 🔐 **Authentication Features**

- **User Registration** - Create new accounts
- **Login/Logout** - JWT-based authentication
- **Profile Management** - Update name and email in Settings
- **Password Management** - Change password (Settings) or reset via email
- **Forgot Password** - Email-based password reset flow
- **Protected Routes** - All main pages require authentication

## 📧 **Email System**

- **Development**: MailHog captures emails locally (http://localhost:8025)
- **Production**: Configure Gmail SMTP or custom SMTP in `.env`
- **Password Reset**: Emails sent with secure reset tokens (1 hour expiration)  

## 🤖 **AI / Ollama**

- **Docs**: `AI_VERIFICATION.md`
- **Status endpoint**: `GET /api/ai/status`
- **Enable AI**: set `OLLAMA_ENABLED=true` in `server/.env` and restart the server
- **Comparison mode**: Clicking **Regenerate (AI)** shows a side-by-side comparison (rule-based vs AI). Click **Use This Version** to apply.

---

**Quick Reference - Keep this handy! 📚**
