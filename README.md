# Card Creation App

A full-stack React and Node.js application that automatically creates interactive learning cards from uploaded content. Perfect for leadership, management, and educational content.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-5+-green.svg)](https://mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- **File Upload & Processing**: Support for PDF, DOCX, TXT, MD, JSON, XLSX, and image files
- **Automatic Card Generation**: AI-powered content analysis to create different card types
- **Interactive Card Viewing**: Full-screen modal with scrollable content for long text
- **Smart Categorization**: Automatic tagging and categorization based on content
- **Search & Filter**: Advanced search and filtering capabilities
- **Collections**: Organize cards into collections and decks
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
- **Multer** for file uploads
- **Natural** for text processing
- **PDF-parse** and **Mammoth** for document processing

### Frontend
- **React 18** with hooks
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Dropzone** for file uploads
- **Lucide React** for icons

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
   git clone https://github.com/tataravi/card-creator-app.git
   cd card-creator-app
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
   MONGODB_URI=mongodb://localhost:27017/card-creator-app
   JWT_SECRET=your-secret-key-here-make-this-secure-in-production
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000
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
card-creator-app/
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
- `GET /api/auth/me` - Get current user

### Cards
- `GET /api/cards` - Get all cards (with filters)
- `POST /api/cards` - Create a new card
- `PUT /api/cards/:id` - Update a card
- `DELETE /api/cards/:id` - Delete a card
- `PATCH /api/cards/:id/review` - Mark card as reviewed
- `PATCH /api/cards/:id/rate` - Rate a card

### Upload
- `POST /api/upload` - Upload and process a single file
- `POST /api/upload/multiple` - Upload multiple files

### Collections
- `GET /api/collections` - Get all collections
- `POST /api/collections` - Create a collection
- `PUT /api/collections/:id` - Update a collection
- `DELETE /api/collections/:id` - Delete a collection

## Usage

### Uploading Content

1. Navigate to the Upload page
2. Drag and drop files or click to select
3. Supported formats: PDF, DOCX, TXT, MD, JSON, XLSX, images
4. Files are automatically processed and cards are generated
5. Review and edit generated cards as needed

### Managing Cards

- **View Cards**: Browse all cards with search and filter options
- **Full Card View**: Click any card to open a full-screen modal with complete content
- **Scrollable Content**: Long content is displayed in scrollable areas for better readability
- **Edit Cards**: Click the edit button to modify card content
- **Rate Cards**: Use the star rating system to rate cards
- **Review Cards**: Mark cards as reviewed to track progress
- **Delete Cards**: Remove unwanted cards

### Creating Collections

- Group related cards into collections
- Share collections with others
- Export collections for offline use

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

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

If you have any questions or need help, please:
- Open an [issue](https://github.com/yourusername/card-creator-app/issues)
- Check our [documentation](https://github.com/yourusername/card-creator-app/wiki)
- Contact the maintainers

---

⭐ **Star this repository if you found it helpful!**

## Support

For support and questions, please open an issue on GitHub or contact the development team.

## Recent Improvements

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

## Roadmap

- [ ] AI-powered content summarization
- [ ] Spaced repetition learning system
- [ ] Collaborative features
- [ ] Mobile app
- [ ] Advanced analytics
- [ ] Export to various formats
- [ ] Integration with external learning platforms

