# LocalKnowledge Application Architecture

## Overview
LocalKnowledge is a web application that transforms uploaded content (PDFs, Word documents, Excel files, images, etc.) into interactive learning cards. Users can organize cards into collections, manage their knowledge base, and access their content through various viewing modes.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Dashboard  │  │   Upload     │  │   Cards      │        │
│  │   View       │  │   View       │  │   Management │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Collections │  │   Settings   │  │ Auth Pages   │        │
│  │   Management │  │  (Profile/   │  │ (Login/Reg/  │        │
│  │              │  │   Password)  │  │  Reset Pwd)  │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Redux)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Redux Store   │  │   API Client    │  │   Components    │ │
│  │   - authSlice   │  │   (Axios)       │  │   - Layout      │ │
│  │   - cardSlice   │  │   - JWT Auth    │  │   - Card        │ │
│  │   - collection  │  │   - Error       │  │   - UploadZone  │ │
│  │     Slice       │  │     Handling    │  │   - ImageViewer │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   API Routes    │  │   Middleware    │  │   Utilities     │ │
│  │   - /api/auth   │  │   - Auth (JWT)  │  │   - Content     │ │
│  │   - /api/cards  │  │   - Rate Limit  │  │     Processor   │ │
│  │   - /api/upload │  │   - Security    │  │   - Email       │ │
│  │   - /api/       │  │     (Helmet)    │  │     (Nodemailer)│ │
│  │     collections │  │                 │  │                 │ │
│  │   - /api/       │  │                 │  │                 │ │
│  │     preview     │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (MongoDB)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Users         │  │   Cards         │  │   Collections   │ │
│  │   - Auth data   │  │   - Content     │  │   - Card groups │ │
│  │   - Profile     │  │   - Metadata    │  │   - Metadata    │ │
│  │   - Preferences │  │   - Provenance  │  │                 │ │
│  │   - Reset tokens│  │   - Tags        │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │   Email Service │  │   File Storage  │                      │
│  │   - MailHog     │  │   - Local       │                      │
│  │     (Dev)       │  │     uploads/    │                      │
│  │   - Gmail SMTP  │  │     directory   │                      │
│  │     (Prod)      │  │                 │                      │
│  └─────────────────┘  └─────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: File Upload & Card Creation

```
1. User uploads file (PDF, DOCX, XLSX, etc.)
   ↓
2. Frontend → Backend: POST /api/upload (multipart/form-data)
   ↓
3. Backend: Save file to /server/uploads/
   ↓
4. Backend: Process file content
   - PDF → pdf-parse
   - DOCX → mammoth
   - XLSX → xlsx
   - Images → Extract metadata
   ↓
5. Content Processor: Extract text/data → Card format
   - Title extraction
   - Content validation
   - Type/category detection
   - Tag generation
   ↓
6. Backend: Create/Update cards in database
   - Check for duplicates (content hash)
   - Save with provenance
   ↓
7. Backend → Frontend: Success response with card data
   ↓
8. Frontend: Update Redux store → Refresh UI
```

## Data Flow: Password Reset via Email

```
1. User clicks "Forgot Password" on login page
   ↓
2. Frontend → Backend: POST /api/auth/forgot-password {email}
   ↓
3. Backend: Find user by email
   ↓
4. Backend: Generate reset token (crypto.randomBytes)
   - Hash token with SHA-256
   - Store hash + expiration in user document
   ↓
5. Backend: Send email via Email Utility
   - MailHog (development) → localhost:8025
   - Gmail SMTP (production)
   ↓
6. User receives email with reset link
   ↓
7. User clicks link → /reset-password?token=...
   ↓
8. Frontend → Backend: POST /api/auth/reset-password {token, newPassword}
   ↓
9. Backend: Verify token & expiration
   - Hash provided token
   - Compare with stored hash
   - Check expiration
   ↓
10. Backend: Update password (bcrypt hash)
    ↓
11. Backend → Frontend: Success response
    ↓
12. Frontend: Redirect to login
```

## Frontend Components

### Pages
- **Login** - User authentication
- **Register** - New user registration
- **ForgotPassword** - Request password reset email
- **ResetPassword** - Reset password with token from email
- **Dashboard** - Overview of recent cards and collections
- **Upload** - File upload interface with drag-and-drop
- **Cards** - Table view of all cards with filtering/sorting
- **View** - Grid view of cards with modal details
- **Collections** - Create and manage card collections
- **Settings** - User profile and password management

### Components
- **Layout** - Main app layout with sidebar navigation
- **Card** - Reusable card display component
- **UploadZone** - Drag-and-drop file upload area
- **ImageZoomViewer** - Image viewing with zoom functionality

### State Management (Redux)
- **authSlice** - Authentication state (user, token, login/logout)
- **cardSlice** - Card CRUD operations and state
- **collectionSlice** - Collection management and state

## Backend API Routes

### Authentication (`/api/auth`)
- `POST /register` - Create new user account
- `POST /login` - User login (returns JWT token)
- `GET /me` - Get current user profile
- `PUT /profile` - Update user profile (name, email)
- `PUT /password` - Change password (requires current password)
- `POST /forgot-password` - Request password reset email
- `POST /reset-password` - Reset password with token

### Cards (`/api/cards`)
- `GET /` - Get all cards (with filtering/pagination)
- `GET /:id` - Get single card by ID
- `POST /` - Create new card
- `PUT /:id` - Update card
- `DELETE /:id` - Delete card

### Upload (`/api/upload`)
- `POST /` - Upload and process file(s)
  - Supports: PDF, DOCX, XLSX, TXT, JSON, Images
  - Extracts content and creates cards automatically

### Collections (`/api/collections`)
- `GET /` - Get all collections
- `GET /:id` - Get collection with cards
- `POST /` - Create new collection
- `PUT /:id` - Update collection
- `DELETE /:id` - Delete collection

### Preview (`/api/preview`)
- `GET /:filename` - Preview uploaded file content
  - Converts Office docs to HTML
  - Serves PDFs, images directly
  - Displays text files

## Database Models

### User Model
```javascript
{
  name: String (required)
  email: String (required, unique, indexed)
  password: String (hashed with bcrypt)
  resetPasswordToken: String (hashed)
  resetPasswordExpires: Date
  preferences: {
    theme: String (light/dark/auto)
    cardView: String (grid/list)
    notifications: Boolean
  }
  timestamps: createdAt, updatedAt
}
```

### Card Model
```javascript
{
  title: String (required)
  content: String (required)
  type: String (concept/question/example/etc.)
  category: String
  tags: [String]
  source: String (filename or manual)
  isPublic: Boolean
  difficulty: Number (1-5)
  provenance: {
    location: String
    snippet: String
    model_name: String
    prompt_version: String
    confidence_score: Number
  }
  attachments: [String] (file paths)
  contentHash: String (for duplicate detection)
  userId: ObjectId (required, indexed)
  timestamps: createdAt, updatedAt
}
```

### Collection Model
```javascript
{
  name: String (required)
  description: String
  cards: [ObjectId] (references to Card documents)
  tags: [String]
  isPublic: Boolean
  userId: ObjectId (required, indexed)
  timestamps: createdAt, updatedAt
}
```

## Security Features

### Authentication & Authorization
- **JWT Tokens** - Secure API authentication (7-day expiration)
- **Password Hashing** - bcrypt with salt rounds
- **Protected Routes** - Middleware validates JWT on all protected endpoints
- **Password Reset** - Secure token generation (crypto.randomBytes) with expiration

### Security Middleware
- **Helmet.js** - Security headers (CSP, XSS protection)
- **CORS** - Configured for specific origin
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Input Validation** - Content validation before card creation

### Data Protection
- **Password Hashing** - Passwords never stored in plain text
- **Token Hashing** - Reset tokens hashed before storage
- **User Isolation** - Users can only access their own data
- **Content Validation** - Prevents empty/meaningless cards

## File Processing Pipeline

### Supported File Types
- **PDF** - Text extraction via pdf-parse
- **Word (.docx, .doc)** - HTML conversion via mammoth
- **Excel (.xlsx, .xls)** - Row-by-row processing, schema detection
- **Text (.txt, .md)** - Direct text extraction
- **JSON** - Structured data extraction
- **Images (.jpg, .png, .gif)** - Metadata extraction

### Content Processing Steps
1. **File Validation** - Check type, size (10MB limit)
2. **Content Extraction** - Type-specific extraction
3. **Content Validation** - Minimum length, placeholder detection
4. **Card Generation** - Create card objects with:
   - Title extraction/derivation
   - Type detection (keyword matching)
   - Category assignment
   - Tag generation (Natural language processing)
5. **Duplicate Detection** - Hash-based duplicate checking
6. **Database Storage** - Save with provenance tracking

## Email System

### Email Utility (`server/utils/email.js`)
- **Development** - MailHog (localhost:1025) for local testing
- **Production** - Gmail SMTP or custom SMTP server
- **Fallback** - Ethereal Email test accounts

### Email Features
- HTML email templates
- Password reset links with secure tokens
- Token expiration (1 hour)
- Development mode logging

## Technology Stack

### Frontend
- **React 18** - UI framework
- **Redux Toolkit** - State management
- **React Router v6** - Navigation
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Nodemailer** - Email sending
- **Helmet** - Security headers
- **express-rate-limit** - Rate limiting

### File Processing Libraries
- **pdf-parse** - PDF text extraction
- **mammoth** - Word document conversion
- **xlsx** - Excel file processing
- **natural** - NLP for tag generation

## Deployment Architecture

### Development
```
Local Machine:
├── Frontend (React) - localhost:3000
├── Backend (Express) - localhost:5001
├── MongoDB - Docker container (localhost:27017)
└── MailHog - localhost:8025 (email testing)
```

### Production (Recommended)
```
Cloud Infrastructure:
├── Frontend - Static hosting (Vercel/Netlify)
├── Backend - Node.js server (Heroku/AWS/Railway)
├── MongoDB - Managed database (MongoDB Atlas)
└── SMTP - Production email service (SendGrid/Mailgun)
```

## Key Features

### User Management
- User registration and authentication
- Profile management (update name/email)
- Password management (change/reset)
- Email-based password reset flow

### Content Management
- Multi-format file upload (PDF, Word, Excel, etc.)
- Automatic content extraction and card creation
- Duplicate detection and prevention
- Content validation (meaningful content only)

### Card Management
- Create, read, update, delete cards
- Tag and categorize cards
- Filter and search functionality
- Grid and table viewing modes
- Provenance tracking

### Collections
- Organize cards into collections
- Collection CRUD operations
- Public/private collections

### File Preview
- Preview uploaded files in browser
- Office document to HTML conversion
- PDF and image viewing

## Performance Optimizations

- **Content Validation** - Prevents storing empty/meaningless data
- **Duplicate Detection** - Hash-based duplicate checking
- **Pagination** - Limits data transfer for large datasets
- **File Size Limits** - 10MB max per file
- **Rate Limiting** - Prevents API abuse
- **Efficient Queries** - Indexed database queries

## Error Handling

### Frontend
- User-friendly error messages (React Hot Toast)
- Form validation
- Loading states
- Graceful error handling

### Backend
- Structured error responses
- Detailed error logging
- Input validation
- File processing error handling
