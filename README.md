# LocalKnowledge

A full-stack React and Node.js application that automatically creates interactive learning cards from uploaded content. Perfect for leadership, management, and educational content.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-5+-green.svg)](https://mongodb.com/)
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
- **AI-Powered Regeneration**: Optional AI-driven card regeneration using Ollama (local LLM) for improved quality
- **Rule-Based Processing**: Fast, deterministic card generation as default option
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
- **Node.js** with Express
- **MongoDB** with Mongoose
- **JWT Authentication**
- **bcryptjs** for password hashing
- **Multer** for file uploads
- **Nodemailer** for email sending
- **Natural** for text processing
- **PDF-parse** and **Mammoth** for document processing
- **Helmet** for security headers
- **express-rate-limit** for rate limiting

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
- MongoDB (local or cloud)
- npm or yarn
- Docker (for MongoDB container)

### 🐳 Docker Setup (Recommended)
```bash
# Start MongoDB with Docker
docker run -d --name mongodb -p 27017:27017 mongo:latest
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ifigenblat/local-knowledge.git
   cd local-knowledge
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd server && npm install
   
   # Install frontend dependencies
   cd ../client && npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the `server` directory:
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
   
   # AI Configuration (Optional - for AI-powered card regeneration)
   # OLLAMA_ENABLED=true
   # OLLAMA_API_URL=http://localhost:11434
   # OLLAMA_MODEL=llama2
   ```

4. **Start the application**
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

## Project Structure

```
local-knowledge/
├── server/                 # Backend Node.js application
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   ├── utils/             # Utility functions
│   └── uploads/           # Uploaded files storage
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Redux store
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # CSS and styling
│   └── public/            # Static assets
├── package.json           # Root package.json
└── README.md             # This file
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

### Cards
- `GET /api/cards` - Get all cards (with filters, pagination)
- `GET /api/cards/:id` - Get single card by ID
- `GET /api/cards/category/:category` - Get cards by category
- `GET /api/cards/type/:type` - Get cards by type
- `POST /api/cards` - Create a new card
- `PUT /api/cards/:id` - Update a card
- `DELETE /api/cards/:id` - Delete a card

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
- **Full Card View**: Click any card to open a full-screen modal with complete content
- **Scrollable Content**: Long content is displayed in scrollable areas for better readability
- **Create Cards**: Use "Add Card" button to manually create cards
- **Edit Cards**: Click the edit button to modify card content, tags, and metadata
- **Delete Cards**: Remove unwanted cards
- **Filter & Search**: Filter by type, category, tags, or search by title/content

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

## Content Processing

The app uses natural language processing to:

1. **Extract Text**: Parse various file formats
2. **Analyze Content**: Identify key concepts and patterns
3. **Categorize**: Determine card type and category
4. **Generate Tags**: Extract relevant keywords
5. **Create Cards**: Generate structured card content

## Customization

### Adding New Card Types

1. Update the `CARD_TYPE_KEYWORDS` in `server/utils/contentProcessor.js`
2. Add corresponding icons in `client/src/components/Card.js`
3. Update the card type colors and styling

### Custom File Processing

1. Add new file type handlers in `server/utils/contentProcessor.js`
2. Update the file filter in `server/routes/upload.js`
3. Add corresponding MIME types and extensions

## Deployment

### Backend Deployment

1. Set up environment variables for production
2. Configure MongoDB connection
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
- Uses MongoDB for data storage
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

### Technical Improvements
- **Improved Modal Structure**: Fixed header with scrollable content area
- **Better Performance**: Optimized rendering and scrolling
- **Enhanced UX**: Smooth interactions and clear visual feedback
- **Mobile-Friendly**: Touch-friendly scrolling and responsive layout
- **Email System**: Nodemailer integration with MailHog (dev) and SMTP (prod)
- **Security**: Helmet.js, rate limiting, secure password reset tokens

## Roadmap

- [ ] AI-powered content summarization
- [ ] Spaced repetition learning system
- [ ] Collaborative features
- [ ] Mobile app
- [ ] Advanced analytics
- [ ] Export to various formats
- [ ] Integration with external learning platforms

