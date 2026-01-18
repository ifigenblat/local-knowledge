#!/bin/bash

# LocalKnowledge - Automated Setup Script
# This script sets up the complete environment for reproducible deployment

echo "🚀 Setting up LocalKnowledge..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    print_status "Checking Node.js installation..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js v16 or higher."
        exit 1
    fi
}

# Check if Docker is installed and running
check_docker() {
    print_status "Checking Docker installation..."
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            print_success "Docker is installed and running"
        else
            print_error "Docker is installed but not running. Please start Docker Desktop."
            exit 1
        fi
    else
        print_error "Docker is not installed. Please install Docker Desktop."
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd server && npm install && cd ..
    
    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd client && npm install && cd ..
    
    print_success "All dependencies installed successfully"
}

# Setup MongoDB container
setup_mongodb() {
    print_status "Setting up MongoDB container..."
    
    # Check if mongodb container already exists
    if docker ps -a --format "table {{.Names}}" | grep -q "mongodb"; then
        print_status "MongoDB container exists, starting it..."
        docker start mongodb
    else
        print_status "Creating new MongoDB container with authentication..."
        docker run -d --name mongodb -p 27017:27017 \
            -e MONGO_INITDB_ROOT_USERNAME=localknowledge \
            -e MONGO_INITDB_ROOT_PASSWORD=myknowledge \
            -e MONGO_INITDB_DATABASE=local-knowledge \
            mongo:latest --auth
        
        # Wait for MongoDB to initialize
        sleep 5
        
        # Create database user
        print_status "Creating database user..."
        docker exec mongodb mongosh local-knowledge -u localknowledge -p myknowledge --authenticationDatabase admin --eval "
        db.createUser({
          user: 'localknowledge',
          pwd: 'myknowledge',
          roles: [
            { role: 'readWrite', db: 'local-knowledge' },
            { role: 'dbAdmin', db: 'local-knowledge' }
          ]
        })
        " > /dev/null 2>&1
    fi
    
    # Wait for MongoDB to be ready
    print_status "Waiting for MongoDB to be ready..."
    sleep 5
    
    # Verify MongoDB is running
    if docker ps --format "table {{.Names}}" | grep -q "mongodb"; then
        print_success "MongoDB container is running"
    else
        print_error "Failed to start MongoDB container"
        exit 1
    fi
}

# Create environment files
create_env_files() {
    print_status "Creating environment files..."
    
    # Backend .env file
    if [ ! -f "server/.env" ]; then
        cat > server/.env << EOF
PORT=5001
MONGODB_URI=mongodb://localknowledge:myknowledge@localhost:27017/local-knowledge?authSource=admin
JWT_SECRET=your-secret-key-here-make-this-secure-in-production
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Email Configuration (Local Development)
MAILHOG_HOST=127.0.0.1
MAILHOG_PORT=1025

# For Gmail SMTP (Optional - uncomment to use):
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
EOF
        print_success "Created server/.env file"
    else
        print_warning "server/.env already exists, skipping..."
    fi
}

# Verify required files exist
verify_files() {
    print_status "Verifying required files..."
    
    REQUIRED_FILES=(
        "server/models/Collection.js"
        "server/models/Card.js"
        "server/models/User.js"
        "server/utils/contentProcessor.js"
        "server/utils/email.js"
        "server/middleware/auth.js"
        "client/src/store/slices/authSlice.js"
        "client/src/store/slices/cardSlice.js"
        "client/src/store/slices/collectionSlice.js"
        "client/src/store/index.js"
        "client/src/pages/Dashboard.js"
        "client/src/pages/Login.js"
        "client/src/pages/Register.js"
        "client/src/pages/ForgotPassword.js"
        "client/src/pages/ResetPassword.js"
        "client/src/pages/Settings.js"
        "client/src/pages/Upload.js"
        "client/src/pages/Cards.js"
        "client/src/pages/View.js"
        "client/src/pages/Collections.js"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ -f "$file" ]; then
            print_success "✓ $file exists"
        else
            print_error "✗ $file is missing"
            print_warning "Please ensure all required files are created (see REPRODUCIBLE_SETUP.md)"
        fi
    done
}

# Test the setup
test_setup() {
    print_status "Testing the setup..."
    
    # Start the application in background
    print_status "Starting the application..."
    npm run dev &
    APP_PID=$!
    
    # Wait for services to start
    print_status "Waiting for services to start..."
    sleep 15
    
    # Test backend
    print_status "Testing backend..."
    if curl -s http://localhost:5001/api/health | grep -q "OK"; then
        print_success "Backend is running"
    else
        print_error "Backend is not responding"
    fi
    
    # Test frontend
    print_status "Testing frontend..."
    if curl -s -I http://localhost:3000 | grep -q "200 OK"; then
        print_success "Frontend is running"
    else
        print_error "Frontend is not responding"
    fi
    
    # Test proxy
    print_status "Testing proxy..."
    if curl -s http://localhost:3000/api/health | grep -q "OK"; then
        print_success "Proxy is working"
    else
        print_error "Proxy is not working"
    fi
    
    # Stop the application
    print_status "Stopping test application..."
    kill $APP_PID 2>/dev/null
    pkill -f "npm run dev" 2>/dev/null
}

# Main setup function
main() {
    echo "🎯 LocalKnowledge Setup"
    echo "=================================="
    
    check_node
    check_docker
    install_dependencies
    setup_mongodb
    create_env_files
    verify_files
    test_setup
    
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. (Optional) Install MailHog for email testing: brew install mailhog && brew services start mailhog"
    echo "2. Run 'npm run dev' to start the application"
    echo "3. Open http://localhost:3000 in your browser"
    echo "4. Register a new account or use test@example.com / password"
    echo "5. Upload your files to create cards"
    echo "6. Access MailHog at http://localhost:8025 to view password reset emails"
    echo ""
    echo "📚 For detailed information, see REPRODUCIBLE_SETUP.md"
    echo ""
    print_success "Setup complete! 🚀"
}

# Run main function
main "$@"
