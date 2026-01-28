# LocalKnowledge - Complete Feature Documentation

## Overview

LocalKnowledge is a comprehensive knowledge management system that automatically transforms uploaded content into interactive learning cards. The application provides intelligent content processing, role-based access control, AI-powered enhancements, and robust user management capabilities.

---

## Core Features

### 1. File Upload & Processing

**Supported File Types:**
- **Documents**: PDF, DOCX, DOC, TXT, MD, JSON
- **Spreadsheets**: XLSX, XLS
- **Images**: PNG, JPG, JPEG, GIF

**Processing Capabilities:**
- Automatic text extraction from all supported formats
- Content validation to prevent empty or non-meaningful cards
- Duplicate detection using content hashing
- File size limit: 10MB per file
- Multiple file upload support (up to 5 files at once)
- Progress tracking for upload operations

**File Storage:**
- Files stored in `server/uploads/` directory
- Original files preserved for provenance tracking
- File metadata stored in database

---

### 2. Automatic Card Generation

**Card Types:**
- **Concept Cards**: Key ideas, definitions, and explanations
- **Action Cards**: Step-by-step processes, procedures, and workflows
- **Quote Cards**: Inspirational quotes, insights, and notable statements
- **Checklist Cards**: Task lists, requirements, and action items
- **Mind Map Cards**: Visual relationship cards and concept maps

**Intelligent Processing:**
- Automatic title extraction from content
- Content type detection based on keywords and patterns
- Category assignment (Technology, Business, AI, General, etc.)
- Automatic tag generation using natural language processing
- Provenance tracking (source file, location, snippet)
- Content validation (filters out dates, times, mostly numeric content, and non-meaningful phrases)

**Card Metadata:**
- Unique 6-character Card ID for easy sharing
- Source file reference
- Creation and modification timestamps
- Content hash for duplicate detection
- Difficulty rating
- Tags and categories

---

### 3. Card Management

**Viewing Options:**
- **Dashboard View**: Overview with recent cards and statistics
- **Grid View**: Visual card layout with thumbnails (View page)
- **Table View**: Detailed list with sorting and filtering (Cards page)
- **Card Detail Modal**: Full-screen modal with complete card information

**Card Operations:**
- **View**: Full card details including provenance, attachments, and source file
- **Create**: Manually create cards with custom content
- **Edit**: Modify card title, content, type, category, tags, and difficulty
- **Delete**: Remove cards (with permission checks)
- **Regenerate**: Regenerate card content from provenance snippet
  - **Rule-Based**: Fast, deterministic regeneration (always available)
  - **AI-Powered**: Optional AI regeneration using Ollama (if enabled)
  - **Comparison View**: Side-by-side comparison of rule-based vs AI-generated versions

**Search & Filter:**
- Full-text search across card titles and content
- Filter by card type (concept, action, quote, checklist, mind map)
- Filter by category
- Filter by tags
- Combined filters for precise results
- Pagination support for large result sets

**Card Sharing:**
- Unique 6-character Card ID for easy sharing
- Copy-to-clipboard functionality
- Public/private card visibility options

---

### 4. Collections Management

**Collection Features:**
- Create collections with names and descriptions
- Add multiple cards to collections
- Remove cards from collections
- Bulk add cards to collections
- View collections with associated cards
- Edit collection details
- Delete collections

**Organization:**
- Organize learning content by topic or theme
- Group related cards together
- Track collection creation and modification dates

---

### 5. Authentication & User Management

**Authentication:**
- User registration with email verification
- Secure login with JWT tokens (7-day expiration)
- Password hashing with bcryptjs
- Protected routes requiring authentication
- Session management via localStorage

**Password Management:**
- Change password (requires current password)
- Forgot password functionality
- Email-based password reset with secure tokens
- Token expiration (1 hour)
- Password change requirement for default admin user

**User Profile:**
- Update name and email
- View account information
- Password management interface
- User preferences (theme, card view, notifications)

**User Management (Admin Only):**
- View all users with search and filtering
- Create new users with role assignment
- Edit user details (name, email, password, role)
- Assign roles to users
- Delete users (with safety checks)
- View user status (active, password change required)
- Protection for superadmin users
- Prevention of self-deletion

---

### 6. Role-Based Access Control (RBAC)

**Default Roles:**
- **Super Administrator**: Immutable role with full system access. Cannot be modified, deleted, or deactivated. Assigned to default admin user.
- **Administrator**: Full system access (manage users, roles, all cards/collections)
- **User**: Standard access (own cards/collections only)

**Permission System:**
The system supports granular permissions across six main categories:

1. **Cards Permissions:**
   - `view`: View own cards
   - `create`: Create new cards
   - `edit`: Edit own cards
   - `delete`: Delete own cards
   - `viewAll`: View all users' cards
   - `editAll`: Edit all users' cards
   - `deleteAll`: Delete all users' cards

2. **Collections Permissions:**
   - `view`: View own collections
   - `create`: Create new collections
   - `edit`: Edit own collections
   - `delete`: Delete own collections
   - `viewAll`: View all users' collections
   - `editAll`: Edit all users' collections
   - `deleteAll`: Delete all users' collections

3. **Users Permissions:**
   - `view`: View user list
   - `create`: Create new users
   - `edit`: Edit user details
   - `delete`: Delete users
   - `assignRoles`: Assign roles to users

4. **Roles Permissions:**
   - `view`: View roles
   - `create`: Create new roles
   - `edit`: Edit role permissions
   - `delete`: Delete custom roles

5. **System Permissions:**
   - `viewSettings`: View system settings
   - `editSettings`: Edit system settings
   - `viewLogs`: View system logs

6. **Upload Permissions:**
   - `upload`: Upload files
   - `uploadMultiple`: Upload multiple files
   - `viewAll`: View all users' uploads

**Role Management:**
- View all roles with descriptions
- Create custom roles with granular permissions
- Edit role permissions and details
- Delete custom roles (system roles protected)
- View users assigned to each role
- Assign roles to users
- Immutable superadmin role protection

---

### 7. AI-Powered Card Regeneration

**AI Integration (Optional):**
- Local AI processing using Ollama (no data sharing)
- Support for multiple AI models (llama2 recommended)
- Configurable AI settings via environment variables

**Regeneration Modes:**
- **Rule-Based Regeneration** (Default):
  - Fast and deterministic
  - Always produces the same output for the same input
  - No external dependencies
  - Instant results

- **AI-Powered Regeneration** (Optional):
  - Uses local Ollama instance
  - Enhanced content generation
  - Side-by-side comparison view
  - User can choose between rule-based and AI-generated versions
  - Timeout protection (30 seconds)
  - Fallback to rule-based if AI fails

**Comparison View:**
- Side-by-side display of rule-based vs AI-generated versions
- Visual distinction between versions
- "Use This Version" buttons for each option
- Cancel option to dismiss comparison
- Real-time loading indicators

**AI Configuration:**
- Enable/disable via `OLLAMA_ENABLED` environment variable
- Configurable API URL and model selection
- Status endpoint for checking AI availability
- Automatic fallback if AI is unavailable

---

### 8. Email System

**Email Functionality:**
- Password reset emails
- Secure token generation and validation
- Token expiration (1 hour)

**Development Setup:**
- MailHog for local email testing
- Web interface at http://localhost:8025
- SMTP server at 127.0.0.1:1025

**Production Setup:**
- Gmail SMTP support
- Custom SMTP configuration
- Secure email delivery

**Email Features:**
- Password reset links with secure tokens
- Email validation
- Error handling and logging

---

### 9. User Interface & Experience

**Design Features:**
- Modern, responsive design
- Dark mode support
- Mobile-friendly interface
- Accessible UI components

**Navigation:**
- Sidebar navigation with collapsible menu
- User profile section in sidebar
- Administration section for admins
- Active route highlighting

**Components:**
- **CardDetailModal**: Shared modal for card viewing, editing, and regeneration
- **UploadZone**: Drag-and-drop file upload interface
- **ImageZoomViewer**: Image viewing with zoom capabilities
- **Layout**: Consistent layout with navigation and user menu

**User Experience:**
- Toast notifications for user feedback
- Loading indicators for async operations
- Error handling with user-friendly messages
- Smooth transitions and animations
- Keyboard navigation support

---

### 10. Security Features

**Authentication Security:**
- JWT token-based authentication
- Secure password hashing (bcryptjs)
- Token expiration (7 days)
- Protected API routes

**Authorization:**
- Role-based access control
- Permission-based route protection
- Middleware for permission checking
- Granular permission system

**Data Protection:**
- Password reset token hashing
- Secure file upload validation
- Rate limiting on API endpoints
- Helmet.js security headers
- CORS configuration

**User Protection:**
- Superadmin user protection
- Self-deletion prevention
- Immutable role protection
- Password change requirements

---

### 11. Content Processing Intelligence

**Content Analysis:**
- Natural language processing for tag generation
- Keyword detection for card type classification
- Pattern matching for category assignment
- Content validation to filter non-meaningful data

**Smart Filtering:**
- Filters out dates (e.g., "Dec 22, 2025")
- Filters out times (e.g., "10:30 AM")
- Filters out mostly numeric content
- Filters out very short, non-meaningful phrases
- Validates minimum content length

**Duplicate Detection:**
- Content hash-based duplicate detection
- Prevents creating duplicate cards from same content
- Updates existing cards if content matches

---

### 12. Data Management

**Database:**
- MongoDB with Mongoose ODM
- User, Card, Collection, and Role models
- Indexed fields for performance
- Timestamps on all documents

**Data Models:**
- **User**: Authentication, profile, preferences, role assignment
- **Card**: Content, metadata, provenance, tags, categories
- **Collection**: Card groupings, metadata
- **Role**: Permissions, descriptions, system flags

**Data Integrity:**
- Unique constraints on email and card IDs
- Referential integrity for roles
- Cascade considerations for deletions
- Validation on all inputs

---

## Pages & Routes

### Public Pages
- **Login** (`/login`): User authentication
- **Register** (`/register`): New user registration
- **Forgot Password** (`/forgot-password`): Password reset request
- **Reset Password** (`/reset-password`): Password reset with token

### Protected Pages
- **Dashboard** (`/dashboard`): Overview with recent cards and statistics
- **Upload** (`/upload`): File upload interface
- **View** (`/view`): Grid view of cards
- **Cards** (`/cards`): Table view of cards with advanced filtering
- **Collections** (`/collections`): Collection management
- **Settings** (`/settings`): Account settings and password management
- **Roles** (`/roles`): Role management (admin only)
- **Users** (`/users`): User management (admin only)

---

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Cards (`/api/cards`)
- `GET /api/cards` - Get all cards (with filters, pagination)
- `GET /api/cards/:id` - Get single card by ID or Card ID
- `POST /api/cards` - Create a new card
- `PUT /api/cards/:id` - Update a card
- `DELETE /api/cards/:id` - Delete a card
- `POST /api/cards/:id/regenerate` - Regenerate card from provenance

### Upload (`/api/upload`)
- `POST /api/upload` - Upload and process a single file
- `POST /api/upload/multiple` - Upload multiple files (up to 5)
- `GET /api/upload/progress/:id` - Get upload progress

### Collections (`/api/collections`)
- `GET /api/collections` - Get all collections
- `GET /api/collections/:id` - Get collection with cards
- `POST /api/collections` - Create a collection
- `PUT /api/collections/:id` - Update a collection
- `DELETE /api/collections/:id` - Delete a collection
- `POST /api/collections/:id/cards` - Add card to collection
- `DELETE /api/collections/:id/cards/:cardId` - Remove card from collection

### Preview (`/api/preview`)
- `GET /api/preview/:filename` - Preview uploaded file content

### Roles (`/api/roles`)
- `GET /api/roles` - Get all roles
- `GET /api/roles/:id` - Get single role
- `POST /api/roles` - Create new role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role
- `POST /api/roles/:id/assign` - Assign role to user
- `GET /api/roles/:id/users` - Get users with role

### Users (`/api/users`)
- `GET /api/users` - Get all users (with search, filters, pagination)
- `GET /api/users/:id` - Get single user
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/:id/assign-role` - Assign role to user

### AI (`/api/ai`)
- `GET /api/ai/status` - Check Ollama availability and configuration

---

## Technical Architecture

### Frontend Stack
- **React 18** with functional components and hooks
- **Redux Toolkit** for state management
- **React Router v6** for navigation
- **Axios** for HTTP requests
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Hot Toast** for notifications
- **React Dropzone** for file uploads

### Backend Stack
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads
- **Nodemailer** for email sending
- **Natural** for NLP and tag generation
- **PDF-parse** for PDF processing
- **Mammoth** for Word document processing
- **xlsx** for Excel processing
- **Helmet** for security headers
- **express-rate-limit** for rate limiting
- **Ollama** (optional) for AI processing

### External Services
- **MongoDB**: Database (local Docker or cloud)
- **MailHog**: Local email testing (development)
- **Ollama**: Local AI processing (optional)

---

## Default Configuration

### Default Superadmin User
- **Email**: `admin@localknowledge.local`
- **Password**: `admin123`
- **Role**: Super Administrator (immutable, full access)
- **Password Change**: Required on first login

### Default Roles
- **Super Administrator**: Immutable, full access, cannot be modified
- **Administrator**: Full system access, can manage users and roles
- **User**: Standard access, own cards and collections only

---

## Workflows

### File Upload Workflow
1. User selects or drags files to upload zone
2. Files validated (type, size)
3. Files uploaded to server
4. Content extracted from files
5. Content processed and validated
6. Cards generated with metadata
7. Duplicate detection performed
8. Cards saved to database
9. User notified of results

### Card Regeneration Workflow
1. User clicks "Regenerate" on a card
2. System retrieves provenance snippet
3. User chooses regeneration mode:
   - **Rule-Based**: Instant regeneration using deterministic rules
   - **AI-Powered**: AI regeneration with comparison view
4. If AI mode:
   - Both rule-based and AI versions generated
   - Side-by-side comparison displayed
   - User selects preferred version
5. Selected version saved to database
6. Card updated and UI refreshed

### Password Reset Workflow
1. User clicks "Forgot Password" on login page
2. User enters email address
3. System generates secure reset token
4. Token hashed and stored with expiration
5. Email sent with reset link
6. User clicks link in email
7. User enters new password
8. Token validated and password updated
9. User redirected to login

### Role Assignment Workflow
1. Admin navigates to Users page
2. Admin selects user
3. Admin clicks "Assign Role"
4. Admin selects role from dropdown
5. Role assigned to user
6. User permissions updated immediately
7. User sees changes on next action

---

## Security & Permissions

### Access Control
- All API routes protected with JWT authentication
- Role-based authorization middleware
- Permission checks on sensitive operations
- Superadmin protection (immutable)

### Data Security
- Passwords hashed with bcryptjs (salt rounds: 10)
- JWT tokens with 7-day expiration
- Password reset tokens with 1-hour expiration
- Secure token generation using crypto
- File upload validation and sanitization

### User Protection
- Users cannot delete their own accounts
- Superadmin users cannot be modified (except by superadmin)
- Immutable roles cannot be deleted or deactivated
- Password change required for default admin

---

## Performance & Scalability

### Optimization Features
- Pagination for large datasets
- Indexed database fields
- Efficient content processing
- Lazy loading of components
- Optimized Redux state management

### Caching
- JWT tokens cached in localStorage
- User data cached in Redux store
- Role and permission data cached

### Rate Limiting
- API rate limiting (100 requests per 15 minutes per IP)
- File upload size limits (10MB per file)
- Request timeout protection

---

## Error Handling

### Frontend Error Handling
- User-friendly error messages
- Toast notifications for feedback
- Loading states for async operations
- Graceful degradation for missing features
- Error boundaries for component errors

### Backend Error Handling
- Comprehensive error logging
- Validation error messages
- Permission error responses
- Database error handling
- File processing error recovery

---

## Testing & Quality Assurance

### Automated Testing
- System test script (`test-system.sh`)
- Health check script (`check-server.sh`)
- API endpoint testing
- Integration testing for workflows

### Manual Testing
- User registration and login
- File upload and processing
- Card creation and management
- Role assignment and permissions
- Password reset flow
- AI regeneration (if enabled)

---

## Deployment & Configuration

### Environment Variables
- `PORT`: Server port (default: 5001)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `CLIENT_URL`: Frontend URL
- `MAILHOG_HOST`: MailHog host (development)
- `MAILHOG_PORT`: MailHog port (development)
- `SMTP_USER`: SMTP username (production)
- `SMTP_PASS`: SMTP password (production)
- `OLLAMA_ENABLED`: Enable AI features
- `OLLAMA_API_URL`: Ollama API URL
- `OLLAMA_MODEL`: AI model name

### Setup Scripts
- `setup.sh`: Automated setup script
- `check-server.sh`: Health check and auto-fix
- `test-system.sh`: System testing script
- `init-roles.js`: Initialize default roles
- `create-admin-user.js`: Create default superadmin user

---

## Future Enhancements

### Potential Features
- Card sharing via public links
- Card export functionality
- Advanced analytics and reporting
- Bulk operations on cards
- Card templates
- Custom card types
- Integration with external services
- Mobile app support
- Offline mode support

---

## Support & Documentation

### Documentation Files
- `README.md`: Main project documentation
- `LOCALKNOWLEDGE.md`: This file - complete feature documentation
- `REPRODUCIBLE_SETUP.md`: Detailed setup instructions
- `QUICK_REFERENCE.md`: Quick command reference
- `AI_VERIFICATION.md`: AI setup and verification guide
- `EMAIL_SETUP.md`: Email configuration guide
- `setup-mongodb.md`: MongoDB setup instructions
- `architecture-diagram.md`: System architecture documentation

### Getting Help
- Check documentation files
- Review error messages and logs
- Run `check-server.sh` for diagnostics
- Run `test-system.sh` for system verification

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**LocalKnowledge** - Transform your content into interactive learning cards with intelligent processing and powerful management tools.
