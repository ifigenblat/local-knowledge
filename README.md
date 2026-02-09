# LocalKnowledge

A full-stack React and Node.js application that automatically creates interactive learning cards from uploaded content. Perfect for leadership, management, and educational content.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue.svg)](https://postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- **File Upload & Processing**: Support for PDF, DOCX, DOC, TXT, MD, JSON, XLSX, XLS, and image files (PNG, JPG, JPEG, GIF)
- **Automatic Card Generation**: Content analysis to create different card types
- **Interactive Card Viewing**: Full-screen modal with scrollable content for long text
- **Smart Categorization**: Automatic tagging and categorization based on content
- **Search & Filter**: Advanced search and filtering capabilities
- **Collections**: Organize cards into collections
- **Account Management**: Profile updates and password management
- **Email Password Reset**: Secure password reset via email (MailHog for development, SMTP for production)
- **Role-Based Access Control (RBAC)**: Admin and user roles with granular permissions
- **Role Management**: Admins can create custom roles and define access levels
- **AI-Powered Card Regeneration**: Optional AI-driven card regeneration using Ollama (local LLM) with side-by-side comparison
- **Rule-Based Processing**: Fast, deterministic card generation as default option
- **Card Regeneration**: Regenerate cards from provenance snippets with rule-based or AI-powered options
- **Comparison View**: Side-by-side comparison of rule-based vs AI-generated card versions
- **Shared Card Modal**: Consistent card viewing, editing, and regeneration across all pages
- **Responsive Design**: Modern UI with dark mode support
- **Enhanced User Experience**: Improved card viewing with no overlapping issues

## Card Types

- **Concept Cards**: Key ideas and definitions
- **Action Cards**: Step-by-step processes and procedures
- **Quote Cards**: Inspirational quotes and insights
- **Checklist Cards**: Task lists and requirements
- **Mind Map Cards**: Visual relationship cards

## Tech Stack

### Backend
- **Node.js** with Express (microservices)
- **PostgreSQL** with Sequelize
- **JWT Authentication**
- **bcryptjs** for password hashing
- **Multer** for file uploads
- **Nodemailer** for email sending
- **Natural** for text processing
- **PDF-parse** and **Mammoth** for document processing
- **Helmet** for security headers
- **express-rate-limit** for rate limiting
- **Ollama** (optional) for AI-powered card regeneration

### Frontend
- **React 18** with hooks
- **Redux Toolkit** for state management
- **React Router v6** for navigation
- **Axios** for HTTP requests
- **Tailwind CSS** for styling
- **React Dropzone** for file uploads
- **Lucide React** for icons
- **React Hot Toast** for notifications

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (local or Docker)
- npm or yarn
- Docker (optional, for PostgreSQL container)
- Ollama (optional, for AI-powered card regeneration)

### 🐳 Docker Setup (PostgreSQL)
```bash
# Start PostgreSQL with Docker
docker run -d -p 5432:5432 -e POSTGRES_USER=localknowledge -e POSTGRES_PASSWORD=localknowledge -e POSTGRES_DB=localknowledge --name postgres postgres:16-alpine
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ifigenblat/local-knowledge.git
   cd local-knowledge
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install
   cd ../services && npm install
   # Install dependencies in individual services as needed (start-all.sh can run from services/)
   ```

3. **Environment Setup**
   
   Create a `.env` file in the `services` directory (or set `DATABASE_URL` when running):
   ```env
   DATABASE_URL=postgresql://localknowledge:localknowledge@localhost:5432/localknowledge
   JWT_SECRET=your-secret-key-here-make-this-secure-in-production
   CLIENT_URL=http://localhost:3000
   
   # Email (development)
   MAILHOG_HOST=127.0.0.1
   MAILHOG_PORT=1025
   
   # AI (optional)
   # OLLAMA_ENABLED=true
   # OLLAMA_API_URL=http://localhost:11434
   # OLLAMA_MODEL=llama2
   ```
   
   **Note**: For AI-powered regeneration, you need to install and run Ollama:
   ```bash
   # Install Ollama (macOS)
   brew install ollama
   
   # Or visit https://ollama.ai for other platforms
   
   # Start Ollama service
   ollama serve
   
   # Pull a model
   # llama2 (recommended, stable, slower): ~3.8GB
   ollama pull llama2
   
   # phi (faster, smaller, but less stable - may crash): ~1.6GB
   # Note: phi was tested but found to be unstable, crashing on some content
   # ollama pull phi
   ```
   
   **Model Recommendations**:
   - **llama2** (recommended): More stable, produces better results, slower (~10-30s per regeneration)
   - **phi**: Faster (~3-8s per regeneration), but **not recommended** - may crash on complex content or resource constraints
   
   See [AI_VERIFICATION.md](AI_VERIFICATION.md) for detailed AI setup instructions.

4. **Initialize roles and create superadmin user** (if using setup.sh, this is done automatically)
   ```bash
   # Initialize default roles (superadmin, admin, and user)
   cd server
   node scripts/init-roles.js
   
   # Create default superadmin user
   node scripts/create-admin-user.js
   cd ..
   ```
   
   **Default Superadmin Credentials**:
   - Email: `admin@localknowledge.local`
   - Password: `admin123`
   - Role: Super Administrator (immutable, full access)
   - ⚠️ **IMPORTANT**: Password change is **required** on first login!

5. **Start the application**
   ```bash
   # From the root directory
   npm run dev
   ```
   
   This will start both the backend server (port 5001) and frontend (port 3000).

### Alternative Setup

You can also run the servers separately:

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm start
```

### Microservices + Frontend

To run all microservices and the API Gateway:

```bash
# Terminal 1 - All microservices (auth, user, role, cards, collections, upload, content, AI, email, preview, files, uploads-static, gateway)
cd services
./start-all.sh

# Terminal 2 - Frontend
cd client
npm start
```

Or from repo root: `npm run dev:microservices` (starts all services then frontend). Ensure PostgreSQL is running first (e.g. Docker: `docker run -d -p 5432:5432 -e POSTGRES_USER=localknowledge -e POSTGRES_PASSWORD=localknowledge -e POSTGRES_DB=localknowledge postgres:16-alpine`).

**Services** (all proxied via API Gateway on port 8000):
| Service | Port | Description |
|---------|------|-------------|
| Auth | 5001 | Login, register, password reset |
| User | 5002 | User CRUD |
| Role | 5003 | Role & permission management |
| Card | 5004 | Card CRUD, regenerate |
| Collection | 5005 | Collection CRUD |
| Upload | 5006 | File upload (→ content + card services) |
| Content Processing | 5007 | Extract content from files |
| AI | 5008 | Ollama-based card regeneration |
| Email | 5009 | Password reset emails |
| Preview | 5011 | File preview (DOCX→HTML, PDF, etc.) |
| Files | 5012 | List/delete uploaded files |
| Uploads Static | 5013 | Serve static uploaded files |

**Observability**: `GET /health`, `GET /services/health`, `GET /metrics` (Prometheus format)

**Testing**: `cd services && ./test-services.sh` or `node test-integration-upload-files.js`

### Docker (All Services)

```bash
cd services
docker-compose up -d
```

Starts PostgreSQL + all microservices. See `services/docker-compose.yml` for configuration.

## Project Structure

```
local-knowledge/
├── server/                 # (Deprecated) Legacy monolith; use services/ instead
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   ├── utils/             # Utility functions
│   │   ├── contentProcessor.js  # Rule-based card generation
│   │   ├── aiProcessor.js       # AI-powered card generation (Ollama)
│   │   └── email.js             # Email utilities
│   └── uploads/           # Uploaded files storage
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   │   └── CardDetailModal.js  # Shared card modal component
│   │   ├── pages/         # Page components
│   │   ├── store/         # Redux store
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # CSS and styling
│   └── public/            # Static assets
├── package.json           # Root package.json
├── README.md             # This file
├── AI_VERIFICATION.md     # AI setup and verification guide
└── architecture-diagram.md  # System architecture documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile (name, email)
- `PUT /api/auth/password` - Change password (requires current password)
- `POST /api/auth/forgot-password` - Request password reset email
- `POST /api/auth/reset-password` - Reset password with token from email (token in request body)

### Role Management (Admin Only)
- `GET /api/roles` - Get all roles (requires `roles.view` permission)
- `GET /api/roles/:id` - Get single role (requires `roles.view` permission)
- `POST /api/roles` - Create new role (requires `roles.create` permission)
- `PUT /api/roles/:id` - Update role (requires `roles.edit` permission)
- `DELETE /api/roles/:id` - Delete role (requires `roles.delete` permission)
- `POST /api/roles/:id/assign` - Assign role to user (requires `users.assignRoles` permission)
- `GET /api/roles/:id/users` - Get users with role (requires `users.view` permission)

### Cards
- `GET /api/cards` - Get all cards (with filters, pagination)
- `GET /api/cards/:id` - Get single card by ID
- `GET /api/cards/category/:category` - Get cards by category
- `GET /api/cards/type/:type` - Get cards by type
- `POST /api/cards` - Create a new card
- `PUT /api/cards/:id` - Update a card
- `DELETE /api/cards/:id` - Delete a card
- `POST /api/cards/:id/regenerate` - Regenerate card from provenance snippet
  - Body: `{ useAI: boolean, comparisonMode: boolean, selectedVersion: string, comparisonData: object }`
  - Returns: Single card or comparison object with both rule-based and AI versions

### Upload
- `POST /api/upload` - Upload and process a single file
- `POST /api/upload/multiple` - Upload multiple files (up to 5)
- `GET /api/upload/progress/:id` - Get upload progress

### Collections
- `GET /api/collections` - Get all collections
- `GET /api/collections/:id` - Get collection with cards
- `POST /api/collections` - Create a collection
- `PUT /api/collections/:id` - Update a collection
- `DELETE /api/collections/:id` - Delete a collection
- `POST /api/collections/:id/cards` - Add card to collection
- `DELETE /api/collections/:id/cards/:cardId` - Remove card from collection

### Preview
- `GET /api/preview/:filename` - Preview uploaded file content

### AI
- `GET /api/ai/status` - Check Ollama availability and configuration
  - Returns: `{ enabled: boolean, available: boolean, error: string | null }`

## Usage

### Uploading Content

1. Navigate to the Upload page
2. Drag and drop files or click to select
3. Supported formats: PDF, DOCX, DOC, TXT, MD, JSON, XLSX, XLS, PNG, JPG, JPEG, GIF
4. Files are automatically processed and cards are generated
5. Review and edit generated cards as needed
6. Maximum file size: 10MB per file

### Managing Cards

- **View Cards**: Browse all cards with search and filter options
  - **Grid View**: Visual card layout (View page)
  - **Table View**: Detailed list with sorting (Cards page)
- **Full Card View**: Click any card to open a shared modal component with complete content
- **Scrollable Content**: Long content is displayed in scrollable areas for better readability
- **Create Cards**: Use "Add Card" button to manually create cards
- **Edit Cards**: Click the edit button to modify card content, tags, and metadata
- **Delete Cards**: Remove unwanted cards
- **Filter & Search**: Filter by type, category, tags, or search by title/content
- **Regenerate Cards**: Regenerate card content from its provenance snippet
  - **Rule-Based**: Fast, deterministic regeneration (always available)
  - **AI-Powered**: Optional AI regeneration using Ollama (if enabled)
  - **Comparison View**: Side-by-side comparison of both versions to choose the best one
- **Card Detail Modal**: Consistent interface across Dashboard, Cards, and View pages with:
  - Full card details and provenance
  - Source file viewer
  - Edit and delete actions
  - Regeneration options

### Creating Collections

- Group related cards into collections
- Create collections with names and descriptions
- Add/remove cards from collections
- Organize learning content by topic

### Account Management

- **Profile Settings**: Update your name and email in the Settings page
- **Password Management**: 
  - Change password (requires current password)
  - Reset password via email ("Forgot password?" on login page)
- **Email Reset Flow**: Secure token-based password reset with 1-hour expiration

### Role Management (Admin Only)

- **Default Roles**: 
  - **Admin**: Full system access (manage users, roles, all cards/collections)
  - **User**: Standard access (own cards/collections only)
- **Role Management Page**: Access via `/roles` (visible in sidebar for admins)
  - View all roles and their permissions
  - Create custom roles with granular permissions
  - Edit role permissions
  - Delete custom roles (system roles are protected)
  - View users assigned to each role
- **Permission System**: Granular permissions for:
  - Cards (view, create, edit, delete, viewAll, editAll, deleteAll)
  - Collections (view, create, edit, delete, viewAll, editAll, deleteAll)
  - Users (view, create, edit, delete, assignRoles)
  - Roles (view, create, edit, delete)
  - System (viewSettings, editSettings, viewLogs)
  - Upload (upload, uploadMultiple, viewAll)
- **Default Superadmin User**: Created automatically during setup
  - Email: `admin@localknowledge.local`
  - Password: `admin123`
  - Role: Super Administrator (immutable, full access)
  - ⚠️ **Password change is REQUIRED on first login** - you will be redirected to Settings

## Content Processing

The app uses natural language processing and optional AI to:

1. **Extract Text**: Parse various file formats
2. **Analyze Content**: Identify key concepts and patterns
3. **Categorize**: Determine card type and category
4. **Generate Tags**: Extract relevant keywords
5. **Create Cards**: Generate structured card content

### Card Regeneration

Cards can be regenerated from their provenance snippets using two methods:

- **Rule-Based Regeneration** (Default):
  - Fast and deterministic
  - Always produces the same result for the same input
  - No external dependencies required
  - Uses pattern matching and keyword detection

- **AI-Powered Regeneration** (Optional):
  - Uses Ollama (local LLM) for enhanced card generation
  - Runs completely offline - no data sharing
  - Produces potentially improved content structure
  - Requires Ollama to be installed and running
  - Can generate different results for the same input

**Comparison Mode**: When using AI regeneration, you can compare both versions side-by-side and choose which one to apply to your card.

## Customization

### Adding New Card Types

1. Update the `CARD_TYPE_KEYWORDS` in `services/content-processing-service` (content processor)
2. Add corresponding icons in `client/src/components/Card.js`
3. Update the card type colors and styling

### Custom File Processing

1. Add new file type handlers in `services/content-processing-service`
2. Update the file filter in `services/upload-service` and gateway routing
3. Add corresponding MIME types and extensions

## Deployment

### Backend Deployment

1. Set up environment variables for production
2. Configure PostgreSQL connection (DATABASE_URL)
3. Set up file storage (consider cloud storage for production)
4. Deploy to your preferred platform (Heroku, AWS, etc.)

### Frontend Deployment

1. Build the production version: `npm run build`
2. Deploy the `build` folder to your hosting service
3. Update the API base URL for production

## 🤝 Contributing

We welcome contributions! 

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with React and Node.js
- Uses PostgreSQL for data storage (microservices)
- Styled with Tailwind CSS
- Icons by Lucide React

## 📞 Support

For support and questions, please:
- Open an [issue](https://github.com/ifigenblat/local-knowledge/issues)
- Check our [documentation](https://github.com/ifigenblat/local-knowledge)
- Review [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for common commands

---

⭐ **Star this repository if you found it helpful!**

## Recent Improvements

### Account Management (Latest)
- **Settings Page**: Complete account management interface
- **Profile Updates**: Update name and email
- **Password Management**: Change password with current password verification
- **Email Password Reset**: Secure password reset via email
- **MailHog Integration**: Local email testing for development

### Enhanced Card Viewing Experience
- **Full-Screen Modal**: Click any card to view complete content in a beautiful modal
- **Scrollable Content**: Long text content is displayed in dedicated scrollable areas
- **No Overlapping Issues**: Fixed previous card overlapping problems
- **Better Image Handling**: Improved image display with dedicated scrolling for multiple images
- **Responsive Design**: Works perfectly on all screen sizes
- **Visual Indicators**: Clear hints when content is scrollable

### AI-Powered Card Regeneration (Latest)
- **Ollama Integration**: Local AI service for enhanced card generation
- **Hybrid Approach**: Rule-based default with optional AI enhancement
- **Comparison View**: Side-by-side comparison of rule-based vs AI-generated versions
- **Version Selection**: Choose the best version from comparison
- **Offline Operation**: Complete privacy - all AI processing runs locally
- **Configurable**: Enable/disable AI features via environment variables

### Shared Components (Latest)
- **CardDetailModal**: Unified modal component used across all pages
- **Consistent UX**: Same interface and functionality on Dashboard, Cards, and View pages
- **State Management**: Improved state handling during card refresh
- **Modal Persistence**: Modals stay visible during background data loading

### Technical Improvements
- **Improved Modal Structure**: Fixed header with scrollable content area
- **Better Performance**: Optimized rendering and scrolling
- **Enhanced UX**: Smooth interactions and clear visual feedback
- **Mobile-Friendly**: Touch-friendly scrolling and responsive layout
- **Email System**: Nodemailer integration with MailHog (dev) and SMTP (prod)
- **Security**: Helmet.js, rate limiting, secure password reset tokens
- **State Management**: Improved Redux state handling for AI features

## Roadmap

- [x] AI-powered card regeneration (with Ollama)
- [x] Side-by-side comparison view for regenerated cards
- [x] Shared card modal component
- [ ] Spaced repetition learning system
- [ ] Collaborative features
- [ ] Mobile app
- [ ] Advanced analytics
- [ ] Export to various formats
- [ ] Integration with external learning platforms
- [ ] Additional AI models support

