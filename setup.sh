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

# Check and install Ollama (optional, for AI features)
check_and_install_ollama() {
    print_status "Checking Ollama installation (optional, for AI-powered card regeneration)..."
    
    if command -v ollama &> /dev/null; then
        OLLAMA_VERSION=$(ollama --version 2>/dev/null || echo "installed")
        print_success "Ollama is installed: $OLLAMA_VERSION"
        
        # Check if Ollama service is running
        if curl -s http://localhost:11434/api/tags &> /dev/null; then
            print_success "Ollama service is running"
            
            # Check if llama2 model is installed
            print_status "Checking for llama2 model..."
            if ollama list 2>/dev/null | grep -q "llama2"; then
                print_success "llama2 model is installed"
            else
                print_warning "llama2 model not found. Installing..."
                if ollama pull llama2; then
                    print_success "llama2 model installed successfully"
                else
                    print_warning "Failed to install llama2 model. You can install it later with: ollama pull llama2"
                fi
            fi
        else
            print_warning "Ollama service is not running. Starting Ollama..."
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS - try to start via brew service
                if brew services list | grep -q ollama; then
                    brew services start ollama
                else
                    print_warning "Please start Ollama manually: ollama serve"
                    print_warning "Or install as a service: brew services install ollama"
                fi
            else
                print_warning "Please start Ollama manually: ollama serve"
            fi
            sleep 3
        fi
    else
        print_warning "Ollama is not installed (optional for AI features)"
        print_status "Would you like to install Ollama? (y/n)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                print_status "Installing Ollama via Homebrew..."
                if command -v brew &> /dev/null; then
                    brew install ollama
                    brew services start ollama
                    print_success "Ollama installed and started"
                    
                    # Wait for Ollama to start
                    sleep 5
                    
                    # Install llama2 model
                    print_status "Installing llama2 model (this may take a few minutes)..."
                    if ollama pull llama2; then
                        print_success "llama2 model installed successfully"
                    else
                        print_warning "Failed to install llama2 model. You can install it later with: ollama pull llama2"
                    fi
                else
                    print_error "Homebrew is not installed. Please install Ollama manually from https://ollama.ai"
                fi
            else
                print_status "Please install Ollama manually from https://ollama.ai"
                print_status "After installation, run: ollama pull llama2"
            fi
        else
            print_warning "Skipping Ollama installation. AI features will not be available."
            print_warning "You can install Ollama later and enable it in server/.env"
        fi
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
        # Check if Ollama is available to determine default AI config
        OLLAMA_ENABLED_DEFAULT="false"
        if command -v ollama &> /dev/null && curl -s http://localhost:11434/api/tags &> /dev/null; then
            OLLAMA_ENABLED_DEFAULT="true"
        fi
        
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

# AI Configuration (Optional - for AI-powered card regeneration)
# Uncomment and configure if you want to use Ollama for AI regeneration
OLLAMA_ENABLED=${OLLAMA_ENABLED_DEFAULT}
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama2
EOF
        print_success "Created server/.env file"
        if [ "$OLLAMA_ENABLED_DEFAULT" = "true" ]; then
            print_success "AI (Ollama) is enabled in .env since Ollama is available"
        else
            print_warning "AI (Ollama) is disabled in .env. Enable it by setting OLLAMA_ENABLED=true"
        fi
    else
        print_warning "server/.env already exists, skipping..."
        print_status "Note: To enable AI features, add the following to server/.env:"
        print_status "  OLLAMA_ENABLED=true"
        print_status "  OLLAMA_API_URL=http://localhost:11434"
        print_status "  OLLAMA_MODEL=llama2"
    fi
}

# Verify required files exist
# Initialize roles and create admin user
initialize_roles_and_admin() {
    print_status "Initializing roles and creating admin user..."
    
    cd server
    
    # Initialize roles
    print_status "Creating default roles (admin and user)..."
    if node scripts/init-roles.js; then
        print_success "Roles initialized successfully"
    else
        print_error "Failed to initialize roles"
        cd ..
        return 1
    fi
    
    # Create admin user
    print_status "Creating default admin user..."
    if node scripts/create-admin-user.js; then
        print_success "Admin user created successfully"
        print_warning "Default superadmin credentials:"
        print_warning "  Email: admin@localknowledge.local"
        print_warning "  Password: admin123"
        print_warning "  Role: Super Administrator (immutable, full access)"
        print_warning "  ⚠️  Password change is REQUIRED on first login!"
    else
        print_warning "Failed to create admin user (may already exist)"
    fi
    
    cd ..
}

verify_files() {
    print_status "Verifying required files..."
    
    REQUIRED_FILES=(
        "server/models/Collection.js"
        "server/models/Card.js"
        "server/models/Role.js"
        "server/models/User.js"
        "server/models/User.js"
        "server/utils/contentProcessor.js"
        "server/utils/aiProcessor.js"
        "server/utils/email.js"
        "server/middleware/auth.js"
        "server/routes/cards.js"
        "client/src/components/CardDetailModal.js"
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
    
    # Test AI status endpoint if enabled
    print_status "Testing AI status endpoint..."
    AI_STATUS=$(curl -s http://localhost:5001/api/ai/status 2>/dev/null)
    if echo "$AI_STATUS" | grep -q "enabled"; then
        if echo "$AI_STATUS" | grep -q '"available":true'; then
            print_success "AI (Ollama) is available"
        elif echo "$AI_STATUS" | grep -q '"enabled":true'; then
            print_warning "AI is enabled but Ollama is not available. Check Ollama installation."
        else
            print_status "AI is disabled (this is optional)"
        fi
    else
        print_warning "Could not test AI status endpoint"
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
    check_and_install_ollama
    create_env_files
    verify_files
    initialize_roles_and_admin
    test_setup
    
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. (Optional) Install MailHog for email testing: brew install mailhog && brew services start mailhog"
    echo "2. Run 'npm run dev' to start the application"
    echo "3. Open http://localhost:3000 in your browser"
    echo "4. Login with default superadmin account:"
    echo "   Email: admin@localknowledge.local"
    echo "   Password: admin123"
    echo "   Role: Super Administrator (immutable, full access)"
    echo "   ⚠️  IMPORTANT: Password change is REQUIRED on first login!"
    echo "5. Or register a new account (will get 'user' role)"
    echo "6. Upload your files to create cards"
    echo "7. Access MailHog at http://localhost:8025 to view password reset emails"
    echo ""
    
    # Check if AI is enabled and provide info
    if grep -q "OLLAMA_ENABLED=true" server/.env 2>/dev/null; then
        echo "🤖 AI Features:"
        echo "   - AI-powered card regeneration is enabled"
        echo "   - Use 'Regenerate (AI)' button on cards to try AI regeneration"
        echo "   - Access Ollama at http://localhost:11434"
        echo "   - See AI_VERIFICATION.md for verification steps"
        echo ""
    else
        echo "🤖 AI Features (Optional):"
        echo "   - AI-powered card regeneration is disabled"
        echo "   - To enable: Set OLLAMA_ENABLED=true in server/.env"
        echo "   - Ensure Ollama is installed and running"
        echo "   - See AI_VERIFICATION.md for setup instructions"
        echo ""
    fi
    
    echo "📚 For detailed information, see:"
    echo "   - REPRODUCIBLE_SETUP.md - Complete setup guide"
    echo "   - AI_VERIFICATION.md - AI setup and verification"
    echo "   - README.md - General documentation"
    echo ""
    print_success "Setup complete! 🚀"
}

# Run main function
main "$@"
