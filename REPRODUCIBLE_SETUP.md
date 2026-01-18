# 🚀 LocalKnowledge - Reproducible Setup Guide

## 📋 **Complete Configuration Documentation**

This guide ensures you can reproduce the working LocalKnowledge app consistently.

## 🛠 **System Requirements**

- **Node.js**: v16 or higher
- **Docker**: For MongoDB container
- **npm**: Package manager
- **Operating System**: macOS, Linux, or Windows

## 📁 **Project Structure**

```
LocalKnowledge/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store
│   │   └── ...
│   └── package.json
├── server/                 # Node.js backend
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
│   ├── uploads/            # File storage
│   └── package.json
├── package.json            # Root package.json
└── .env files             # Environment configurations
```

## 🔧 **Step-by-Step Setup**

### **1. Clone/Download Project**
```bash
# Navigate to your project directory
cd /path/to/your/project
```

### **2. Install Dependencies**
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install

# Return to root
cd ..
```

### **3. Environment Configuration**

#### **Backend Environment (.env)**
Create `server/.env`:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/local-knowledge
JWT_SECRET=your-secret-key-here-make-this-secure-in-production
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Email Configuration (Local Development)
MAILHOG_HOST=127.0.0.1
MAILHOG_PORT=1025

# For Gmail SMTP (Optional - for production):
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
```

#### **Frontend Proxy Configuration**
The `client/package.json` already includes:
```json
{
  "proxy": "http://localhost:5001"
}
```

### **4. Database Setup (MongoDB with Docker)**

#### **Start MongoDB Container**
```bash
# Start Docker Desktop first, then:
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Verify container is running
docker ps | grep mongodb
```

#### **Alternative: Start existing container**
```bash
# If container already exists but is stopped
docker start mongodb
```

### **5. Email Setup (Optional - for Password Reset)**

For password reset functionality, you can use MailHog for local email testing:

#### **Install and Start MailHog (macOS)**
```bash
# Install MailHog via Homebrew
brew install mailhog

# Start MailHog as a service
brew services start mailhog
```

#### **Access MailHog Web UI**
- **Web Interface**: http://localhost:8025
- **SMTP Server**: localhost:1025

All password reset emails will appear in MailHog during development.

**Note**: For production, configure Gmail SMTP or custom SMTP in `server/.env` (see Step 3).

### **6. Verify Required Files**

Ensure all critical files exist in the project:

#### **Backend Files**
- ✅ `server/models/Collection.js` - Collection model
- ✅ `server/models/Card.js` - Card model  
- ✅ `server/models/User.js` - User model

#### **Frontend Files**
- ✅ `client/src/store/slices/authSlice.js` - Authentication slice
- ✅ `client/src/store/slices/cardSlice.js` - Card management slice
- ✅ `client/src/store/slices/collectionSlice.js` - Collection slice
- ✅ `client/src/store/index.js` - Redux store configuration
- ✅ `client/src/pages/Dashboard.js` - Main dashboard page
- ✅ `client/src/pages/Login.js` - Login page
- ✅ `client/src/pages/Register.js` - Registration page
- ✅ `client/src/pages/ForgotPassword.js` - Password reset request page
- ✅ `client/src/pages/ResetPassword.js` - Password reset with token page
- ✅ `client/src/pages/Settings.js` - Account settings and profile management
- ✅ `client/src/pages/Upload.js` - File upload page
- ✅ `client/src/pages/Cards.js` - Cards table view
- ✅ `client/src/pages/View.js` - Cards grid view
- ✅ `client/src/pages/Collections.js` - Collections management

All required files are included in the project. No additional file creation is needed.

#### **Backend Utility Files**
- ✅ `server/utils/contentProcessor.js` - File processing and card generation
- ✅ `server/utils/email.js` - Email sending utility (MailHog/SMTP)
- ✅ `server/middleware/auth.js` - JWT authentication middleware

#### **Frontend Component Files**
- ✅ `client/src/components/Layout.js` - Main layout with navigation
- ✅ `client/src/components/Card.js` - Reusable card component
- ✅ `client/src/components/UploadZone.js` - File upload component
- ✅ `client/src/components/ImageZoomViewer.js` - Image viewing component

### **7. Start the Application**

#### **Option 1: Start Both Services (Recommended)**
```bash
# From root directory
npm run dev
```

#### **Option 2: Start Services Separately**
```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm start
```

### **8. Verify Setup**

#### **Check Services**
```bash
# Backend health check
curl http://localhost:5001/api/health

# Frontend check
curl -I http://localhost:3000

# Proxy test
curl http://localhost:3000/api/health
```

#### **Expected Output**
- Backend: `{"status":"OK","message":"Server is running"}`
- Frontend: `HTTP/1.1 200 OK`
- Proxy: `{"status":"OK","message":"Server is running"}`

## 🎯 **Access the Application**

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **Database**: MongoDB on localhost:27017
- **MailHog** (Email Testing): http://localhost:8025

## 🔐 **Default Test Account**

If you need a test account:
- **Email**: `test@example.com`
- **Password**: Try `password`, `test123`, or `123456`

## 🛠 **Management Commands**

### **Start/Stop Services**
```bash
# Start app
npm run dev

# Stop app
pkill -f "npm run dev"

# Kill specific ports
lsof -ti:3000 | xargs kill -9
lsof -ti:5001 | xargs kill -9
```

### **Database Management**
```bash
# View MongoDB container
docker ps

# Start MongoDB
docker start mongodb

# Stop MongoDB
docker stop mongodb

# Remove MongoDB (fresh start)
docker rm mongodb
```

### **View Logs**
```bash
# Backend logs
cd server && npm run dev

# Frontend logs
cd client && npm start
```

## 🚨 **Common Issues & Solutions**

### **Port Conflicts**
- Backend port 5001 already in use: Kill process with `lsof -ti:5001 | xargs kill -9`
- Frontend port 3000 already in use: Kill process with `lsof -ti:3000 | xargs kill -9`

### **MongoDB Connection Issues**
- Docker not running: Start Docker Desktop
- Container not running: `docker start mongodb`
- Fresh container: `docker run -d --name mongodb -p 27017:27017 mongo:latest`

### **File Issues**
- Verify all required files exist (see Step 5)
- Check file paths and permissions

### **Proxy Errors**
- Verify `client/package.json` has `"proxy": "http://localhost:5001"`
- Ensure backend is running on port 5001

## 📦 **Package Dependencies**

### **Root package.json**
```json
{
  "name": "local-knowledge",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "cd server && npm run dev",
    "client": "cd client && npm start"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### **Backend Dependencies (server/package.json)**
Key dependencies:
- express
- mongoose
- bcryptjs
- jsonwebtoken
- multer
- nodemailer (email sending)
- cors
- helmet
- express-rate-limit
- pdf-parse (PDF processing)
- mammoth (Word document processing)
- xlsx (Excel processing)
- natural (NLP for tag generation)

### **Frontend Dependencies (client/package.json)**
Key dependencies:
- react
- react-dom
- react-router-dom
- @reduxjs/toolkit
- react-redux
- axios
- tailwindcss
- react-dropzone (file uploads)
- react-hot-toast (notifications)
- lucide-react (icons)

## 🎉 **Success Indicators**

You'll know the setup is successful when:
1. ✅ Both servers start without errors
2. ✅ Frontend loads at http://localhost:3000
3. ✅ Backend responds at http://localhost:5001/api/health
4. ✅ Proxy works (frontend can reach backend)
5. ✅ You can register/login
6. ✅ You can upload files and create cards
7. ✅ Password reset emails appear in MailHog (http://localhost:8025)
8. ✅ Settings page accessible for profile/password management

## 📝 **Notes**

- This setup uses MongoDB in Docker for consistency
- All passwords are properly hashed with bcryptjs
- JWT tokens are used for authentication (7-day expiration)
- File uploads are stored in `server/uploads/` (10MB max per file)
- Supported file types: PDF, DOCX, DOC, TXT, MD, JSON, XLSX, XLS, PNG, JPG, JPEG, GIF
- Email system: MailHog for development (http://localhost:8025), SMTP for production
- Password reset tokens expire after 1 hour
- All required files are included in the project - no manual file creation needed
- **Enhanced Card Viewing**: Full-screen modal with scrollable content for long text
- **No Overlapping Issues**: Fixed card viewing problems with improved modal structure
- **Account Management**: Profile updates and password management via Settings page

---

**LocalKnowledge is now fully reproducible! 🚀**
