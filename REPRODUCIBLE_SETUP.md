# 🚀 LocalKnowledge - Reproducible Setup Guide

> **Note:** This doc is partially legacy. For current setup use **README.md** and **QUICK_REFERENCE.md**. The app runs on **microservices + PostgreSQL** (no MongoDB, no `server/`).

## 📋 **Complete Configuration Documentation**

This guide ensures you can reproduce the working LocalKnowledge app consistently.

## 🛠 **System Requirements**

- **Node.js**: v16 or higher
- **Docker**: Optional, for PostgreSQL container
- **PostgreSQL**: Required (local or Docker)
- **npm**: Package manager
- **Operating System**: macOS, Linux, or Windows
- **Ollama** (optional): For AI-powered card regeneration (local/offline)

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
├── services/               # Microservices + API Gateway
│   ├── gateway/            # API Gateway (port 8000)
│   ├── auth-service/      # Auth, JWT
│   ├── card-service/      # Cards
│   ├── shared/postgres/   # Models, DB
│   ├── start-all.sh       # Start all services
│   └── .env               # DATABASE_URL, JWT_SECRET, etc.
├── package.json            # Root package.json
└── .env files              # services/.env, etc.
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

# Install backend (microservices) dependencies
cd services && npm install

# Install frontend dependencies
cd ../client && npm install

# Return to root
cd ..
```

### **3. Environment Configuration**

#### **Backend Environment (services/.env)**
Create `services/.env`:
```env
DATABASE_URL=postgresql://localknowledge:localknowledge@localhost:5432/localknowledge
JWT_SECRET=your-secret-key-here-make-this-secure-in-production
CLIENT_URL=http://localhost:3000

# Email Configuration (Local Development)
MAILHOG_HOST=127.0.0.1
MAILHOG_PORT=1025

# For Gmail SMTP (Optional - for production):
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# AI Configuration (Optional - for AI-powered card regeneration)
# OLLAMA_ENABLED=true
# OLLAMA_API_URL=http://localhost:11434
# OLLAMA_MODEL=llama2
```

#### **Frontend Proxy Configuration**
The `client/package.json` already includes:
```json
{
  "proxy": "http://localhost:8000"
}
```
(API Gateway runs on port 8000.)

### **4. Database Setup (PostgreSQL)**

The app uses **PostgreSQL** only. See **services/POSTGRES_MIGRATION.md** for full details.

#### **Start PostgreSQL (Docker)**
```bash
docker run -d -p 5432:5432 \
  -e POSTGRES_USER=localknowledge \
  -e POSTGRES_PASSWORD=localknowledge \
  -e POSTGRES_DB=localknowledge \
  --name localknowledge-postgres \
  postgres:16-alpine

# Verify container is running
docker ps | grep localknowledge-postgres
```

#### **Sync schema and seed (first run)**
```bash
cd services
DATABASE_URL=postgresql://localknowledge:localknowledge@localhost:5432/localknowledge npm run sync-postgres
DATABASE_URL=postgresql://localknowledge:localknowledge@localhost:5432/localknowledge npm run seed-postgres
```

#### **Alternative: Start existing container**
```bash
docker start localknowledge-postgres
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
- **SMTP Server**: 127.0.0.1:1025

All password reset emails will appear in MailHog during development.

**Note**: For production, configure Gmail SMTP or custom SMTP in `services/.env` (see Step 3).

### **5.5 AI Setup (Optional - Ollama / Local AI)**

This app supports **optional AI-powered card regeneration** using Ollama running locally (no data sharing).

#### **Install Ollama**
```bash
# macOS
brew install ollama
```

#### **Start Ollama**
```bash
ollama serve
```

#### **Install a model (recommended: llama2)**
```bash
ollama pull llama2
```

#### **Verify AI status endpoint**
```bash
curl http://localhost:8000/api/ai/status
```

See `AI_VERIFICATION.md` for detailed verification steps and troubleshooting.

### **5.6 Role-Based Access Control (RBAC) Setup**

The application includes a role-based access control system with default roles:

#### **Default Roles**
- **Super Administrator**: Full system access, immutable role (cannot be modified or deleted). Assigned to default admin user.
- **Administrator**: Full system access (manage users, roles, all cards/collections)
- **User**: Standard access (own cards/collections only)

#### **Default Superadmin User**
After running `setup.sh`, a default superadmin user is automatically created:

- **Email**: `admin@localknowledge.local`
- **Password**: `admin123`
- **Role**: Super Administrator (immutable, full access)

⚠️ **IMPORTANT**: Password change is **REQUIRED** on first login! You will be automatically redirected to the Settings page to change your password.

#### **Manual Role/Superadmin Setup**
If you need to manually initialize roles or create a superadmin user:

```bash
# Initialize default roles and admin user (from services/)
cd services
DATABASE_URL=postgresql://localknowledge:localknowledge@localhost:5432/localknowledge npm run seed-postgres
```
(Seed creates default roles and the superadmin user.)

**Note**: The superadmin role is immutable and cannot be modified, deleted, or deactivated through the UI.

#### **Role Management**
- Admins can access the **Roles** page (`/roles`) to:
  - View all roles
  - Create custom roles with granular permissions
  - Edit role permissions
  - Assign roles to users
  - View users assigned to each role

### **6. Verify Required Files**

Ensure all critical files exist in the project:

#### **Backend (services/)**
- ✅ `services/shared/postgres/models` - Sequelize models (User, Role, Card, Collection, etc.)
- ✅ `services/gateway` - API Gateway (port 8000)
- ✅ `services/*-service` - Microservices (auth, user, role, card, collection, upload, etc.)

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

#### **Backend (services/)**
- ✅ `services/shared/postgres` - DB connection, models, sync/seed scripts
- ✅ `services/scripts/sync-postgres-schema.js`, `seed-postgres.js` - Schema and default roles/admin
- ✅ Per-service routes, middleware, and utilities (auth, cards, upload, email, AI, etc.)

#### **Frontend Component Files**
- ✅ `client/src/components/Layout.js` - Main layout with navigation
- ✅ `client/src/components/CardDetailModal.js` - Shared card modal (view/edit/regenerate/AI compare)
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
# Backend (API Gateway) health check
curl http://localhost:8000/health

# Frontend check
curl -I http://localhost:3000

# Proxy test
curl http://localhost:3000/api/health
```

#### **Expected Output**
- Backend/Gateway: `{"status":"OK"}` or similar
- Frontend: `HTTP/1.1 200 OK`
- Proxy: `{"status":"OK","message":"Server is running"}`

## 🎯 **Access the Application**

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **Database**: PostgreSQL on localhost:5432
- **MailHog** (Email Testing): http://localhost:8025
- **AI Status**: http://localhost:8000/api/ai/status
- **Ollama** (AI, optional): http://localhost:11434

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
npm run stop

# Kill specific ports
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

### **Database Management**
```bash
# View PostgreSQL container
docker ps | grep localknowledge-postgres

# Start PostgreSQL
docker start localknowledge-postgres

# Stop PostgreSQL
docker stop localknowledge-postgres

# Remove container (fresh start)
docker rm localknowledge-postgres
```

### **View Logs**
```bash
# Backend (microservices)
cd services && ./start-all.sh

# Frontend logs
cd client && npm start
```

## 🚨 **Common Issues & Solutions**

### **Port Conflicts**
- Gateway port 8000 already in use: Kill process with `lsof -ti:8000 | xargs kill -9`
- Frontend port 3000 already in use: Kill process with `lsof -ti:3000 | xargs kill -9`

### **PostgreSQL Connection Issues**
- Docker not running: Start Docker Desktop
- Container not running: `docker start localknowledge-postgres`
- Fresh container:
  ```bash
  docker run -d -p 5432:5432 -e POSTGRES_USER=localknowledge -e POSTGRES_PASSWORD=localknowledge -e POSTGRES_DB=localknowledge --name localknowledge-postgres postgres:16-alpine
  ```
- Then from `services/`: `DATABASE_URL=postgresql://localknowledge:localknowledge@localhost:5432/localknowledge npm run sync-postgres npm run seed-postgres`

### **AI (Ollama) Issues**
- AI button disabled: Ensure `OLLAMA_ENABLED=true` in `services/.env` and restart the gateway/services
- Ollama not reachable: Start Ollama with `ollama serve`
- Model missing: `ollama pull llama2` (or whatever `OLLAMA_MODEL` is set to)
- Verify: `curl http://localhost:8000/api/ai/status`

### **File Issues**
- Verify all required files exist (see Step 5)
- Check file paths and permissions

### **Proxy Errors**
- Verify `client/package.json` has `"proxy": "http://localhost:8000"`
- Ensure API Gateway is running on port 8000 (`cd services && ./start-all.sh`)

## 📦 **Package Dependencies**

### **Root package.json**
```json
{
  "name": "local-knowledge",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \"npm run gateway\" \"npm run client\"",
    "gateway": "cd services/gateway && npm run dev",
    "client": "cd client && npm start"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### **Backend Dependencies (services/)**
Key dependencies (microservices use shared/postgres):
- express
- sequelize, pg (PostgreSQL)
- bcryptjs
- jsonwebtoken
- multer
- nodemailer (email sending)
- cors, helmet, express-rate-limit
- pdf-parse, mammoth, xlsx, natural

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
3. ✅ Backend (gateway) responds at http://localhost:8000/health
4. ✅ Proxy works (frontend can reach backend)
5. ✅ Default roles (superadmin, admin, user) are initialized
6. ✅ Default superadmin user is created (email: admin@localknowledge.local)
7. ✅ You can login with admin account or register new users
8. ✅ You can upload files and create cards
9. ✅ Password reset emails appear in MailHog (http://localhost:8025)
10. ✅ Settings page accessible for profile/password management
11. ✅ Admins can access Roles page to manage roles and permissions

## 📝 **Notes**

- This setup uses **PostgreSQL** (Docker or local). See **services/POSTGRES_MIGRATION.md** for details.
- All passwords are properly hashed with bcryptjs
- JWT tokens are used for authentication (7-day expiration)
- File uploads are stored in services upload directories (per-service; 10MB max per file)
- Supported file types: PDF, DOCX, DOC, TXT, MD, JSON, XLSX, XLS, PNG, JPG, JPEG, GIF
- Email system: MailHog for development (http://localhost:8025), SMTP for production
- Password reset tokens expire after 1 hour
- All required files are included in the project - no manual file creation needed
- **Enhanced Card Viewing**: Full-screen modal with scrollable content for long text
- **No Overlapping Issues**: Fixed card viewing problems with improved modal structure
- **Account Management**: Profile updates and password management via Settings page
- **Role-Based Access Control**: Default superadmin, admin, and user roles with granular permissions
- **Default Superadmin User**: Created automatically during setup (password change required on first login!)
- **Immutable Superadmin Role**: Full access role that cannot be modified or deleted

---

**LocalKnowledge is now fully reproducible! 🚀**
