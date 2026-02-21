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
# Start microservices (from services/)
cd services && ./start-all.sh

# Start frontend
npm run client

# Stop all services (from services/)
cd services && ./stop-all.sh
```

### **Database (PostgreSQL)**
```bash
# Start PostgreSQL (Docker example)
docker run -d -p 5432:5432 -e POSTGRES_USER=localknowledge -e POSTGRES_PASSWORD=localknowledge -e POSTGRES_DB=localknowledge postgres:16-alpine
```

### **Testing & Health Checks**
```bash
# Basic health
npm run test:backend     # Test backend API
npm run test:frontend    # Test frontend
npm run test:proxy       # Test proxy connection

# Service endpoint tests (gateway + services must be running)
npm run test:users             # User service – functional (HTTP)
npm run test:users:integration # User service – integration (real DB + Role Service)
npm run test:auth              # Auth service – functional
npm run test:auth:integration  # Auth service – integration (login + validate)
npm run test:roles             # Role service – functional
npm run test:roles:integration # Role service – integration (CRUD + cleanup)
npm run test:cards             # Card service – functional
npm run test:cards:integration # Card service – integration (CRUD + cleanup)
npm run test:collections       # Collection service – functional
npm run test:collections:integration # Collection service – integration (CRUD + cleanup)
npm run test:uploads           # Upload service – functional
npm run test:uploads:integration # Upload service – integration
npm run test:content           # Content-processing – functional
npm run test:content:integration # Content-processing – integration
npm run test:ai                # AI service – functional
npm run test:ai:integration    # AI service – integration
npm run test:email             # Email service – functional
npm run test:email:integration # Email service – integration
npm run test:preview           # Preview service – functional
npm run test:preview:integration # Preview service – integration
npm run test:files             # Files service – functional
npm run test:files:integration # Files service – integration
npm run test:integration       # Upload flow (services/test-integration-upload-files.js)
```

**Unit tests** (no gateway/DB; run from each service; user, auth, role, card, collection have ≥90% coverage):
```bash
cd services/user-service && npm test
cd services/auth-service && npm test
cd services/role-service && npm test
cd services/card-service && npm test
cd services/collection-service && npm test
cd services/upload-service && npm test
cd services/content-processing-service && npm test
cd services/ai-service && npm test
cd services/email-service && npm test
cd services/preview-service && npm test
cd services/files-service && npm test
```
Each service also has `npm run test:endpoints` (functional) and `npm run test:integration` where applicable. See each service’s README.

### **CI (GitHub Actions)**
- **When:** Every push and PR to `main`
- **What:** Unit tests (all 11 services) and client build
- **Where:** Repo → **Actions** tab
- **Run locally (same as CI):**
  ```bash
  npm ci && npm ci --prefix client && npm ci --prefix services
  for dir in services/ai-service services/auth-service services/card-service \
    services/collection-service services/content-processing-service services/email-service \
    services/files-service services/preview-service services/role-service \
    services/upload-service services/user-service; do
    (cd "$dir" && npm ci --no-audit --no-fund && npm test -- --ci --coverage --passWithNoTests)
  done
  npm run build --prefix client
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
- **API Gateway**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **Services Health**: http://localhost:8000/services/health
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
- `services/.env` - DATABASE_URL, JWT_SECRET, etc.
- `client/package.json` - Frontend proxy configuration
- `package.json` - Root scripts and dependencies

### **Critical Components**
- `services/shared/postgres/` - PostgreSQL models and repositories
- `services/gateway/` - API Gateway (port 8000)
- `client/src/store/slices/` - Redux slices (auth, cards, collections)
- `client/src/pages/` - All page components
- `client/src/components/` - Reusable components

### **File Storage**
- Uploads directory (UPLOAD_DIR in services)
- PostgreSQL - Database storage

## 🚨 **Troubleshooting**

### **Port Conflicts**
```bash
# Kill processes on ports 3000 and 5001
lsof -ti:3000 | xargs kill -9
lsof -ti:5001 | xargs kill -9
```

### **PostgreSQL Issues**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start PostgreSQL (example)
docker run -d -p 5432:5432 -e POSTGRES_USER=localknowledge -e POSTGRES_PASSWORD=localknowledge -e POSTGRES_DB=localknowledge postgres:16-alpine

# Create schema and seed (first run, from services/)
npm run sync-postgres
npm run seed-postgres
```

### **Dependency Issues**
```bash
# Clean and reinstall
npm run clean
npm run install-all
```

### **Proxy Errors**
- Verify frontend proxy points to API Gateway (e.g. port 8000)
- Ensure microservices are running: `cd services && ./start-all.sh`

## 📊 **File Types Supported**

- **Documents**: PDF, DOCX, DOC, TXT, MD, JSON
- **Spreadsheets**: XLSX, XLS (Excel files)
- **Images**: PNG, JPG, JPEG, GIF

## 🎯 **Typical Workflow**

1. **Start the app**: `npm run backend` (then in another terminal: `npm run client`)
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
# Start microservices
cd services && ./start-all.sh

# View frontend
cd client && npm start

# Check database (PostgreSQL)
# Use DBeaver or: psql $DATABASE_URL
```

## 📝 **Environment Variables**

### **Services (services/.env)**
```env
DATABASE_URL=postgresql://localknowledge:localknowledge@localhost:5432/localknowledge
JWT_SECRET=your-secret-key-here
CLIENT_URL=http://localhost:3000

# Email (development)
MAILHOG_HOST=127.0.0.1
MAILHOG_PORT=1025

# AI (optional)
# OLLAMA_ENABLED=true
# OLLAMA_API_URL=http://localhost:11434
# OLLAMA_MODEL=llama2
```

## 🎉 **Success Indicators**

✅ Gateway responds: http://localhost:8000/health  
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
- **Enable AI**: set `OLLAMA_ENABLED=true` in `services/.env` (or gateway/ai-service) and restart services
- **Comparison mode**: Clicking **Regenerate (AI)** shows a side-by-side comparison (rule-based vs AI). Click **Use This Version** to apply.

---

**Quick Reference - Keep this handy! 📚**
