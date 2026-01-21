#!/bin/bash

# Server Health Check and Fix Script
# This script checks for common server startup issues and fixes them

echo "🔍 Checking server startup configuration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    ((WARNINGS++))
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((ERRORS++))
}

# 1. Check for .env file
print_status "Checking for server/.env file..."
if [ ! -f "server/.env" ]; then
    print_error "server/.env file is missing"
    print_status "Creating server/.env file..."
    # Check if Ollama is available to determine default AI config
    OLLAMA_ENABLED_DEFAULT="false"
    if command -v ollama &> /dev/null && curl -s http://localhost:11434/api/tags &> /dev/null 2>&1; then
        OLLAMA_ENABLED_DEFAULT="true"
    fi
    
    cat > server/.env << EOF
PORT=5001
MONGODB_URI=mongodb://localknowledge:myknowledge@localhost:27017/local-knowledge?authSource=admin
JWT_SECRET=$(openssl rand -base64 32)
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
    print_success "Created server/.env file with secure JWT_SECRET"
else
    print_success "server/.env file exists"
    
    # Check if JWT_SECRET is set
    if ! grep -q "JWT_SECRET=" server/.env || grep -q "JWT_SECRET=your-secret-key" server/.env; then
        print_warning "JWT_SECRET is missing or using default value"
        if grep -q "JWT_SECRET=" server/.env; then
            # Update existing JWT_SECRET
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' 's/JWT_SECRET=.*/JWT_SECRET='"$(openssl rand -base64 32)"'/' server/.env
            else
                # Linux
                sed -i 's/JWT_SECRET=.*/JWT_SECRET='"$(openssl rand -base64 32)"'/' server/.env
            fi
        else
            # Add JWT_SECRET
            echo "JWT_SECRET=$(openssl rand -base64 32)" >> server/.env
        fi
        print_success "Updated JWT_SECRET in server/.env"
    fi
fi

# 2. Check MongoDB
print_status "Checking MongoDB container..."
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        if docker ps --format "{{.Names}}" | grep -q "^mongodb$"; then
            print_success "MongoDB container is running"
        elif docker ps -a --format "{{.Names}}" | grep -q "^mongodb$"; then
            print_warning "MongoDB container exists but is stopped"
            print_status "Starting MongoDB container..."
            docker start mongodb
            sleep 3
            if docker ps --format "{{.Names}}" | grep -q "^mongodb$"; then
                print_success "MongoDB container started"
            else
                print_error "Failed to start MongoDB container"
            fi
        else
            print_warning "MongoDB container does not exist"
            print_status "Creating MongoDB container with authentication..."
            docker run -d --name mongodb -p 27017:27017 \
                -e MONGO_INITDB_ROOT_USERNAME=localknowledge \
                -e MONGO_INITDB_ROOT_PASSWORD=myknowledge \
                -e MONGO_INITDB_DATABASE=local-knowledge \
                mongo:latest --auth
            sleep 5
            # Create database user
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
            if docker ps --format "{{.Names}}" | grep -q "^mongodb$"; then
                print_success "MongoDB container created and started"
            else
                print_error "Failed to create MongoDB container"
            fi
        fi
    else
        print_error "Docker is not running. Please start Docker Desktop."
    fi
else
    print_error "Docker is not installed"
fi

# 3. Check uploads directory
print_status "Checking uploads directory..."
if [ ! -d "server/uploads" ]; then
    print_warning "server/uploads directory is missing"
    mkdir -p server/uploads
    print_success "Created server/uploads directory"
else
    print_success "server/uploads directory exists"
fi

# 4. Check for port conflicts
print_status "Checking for port conflicts..."
if command -v lsof &> /dev/null; then
    if lsof -ti:5001 &> /dev/null; then
        print_warning "Port 5001 is already in use"
        print_status "Attempting to free port 5001..."
        lsof -ti:5001 | xargs kill -9 2>/dev/null
        sleep 1
        if ! lsof -ti:5001 &> /dev/null; then
            print_success "Port 5001 is now free"
        else
            print_error "Could not free port 5001. Please manually kill the process."
        fi
    else
        print_success "Port 5001 is available"
    fi
    
    if lsof -ti:3000 &> /dev/null; then
        print_warning "Port 3000 is already in use (frontend port)"
    else
        print_success "Port 3000 is available"
    fi
else
    print_warning "lsof command not available, skipping port check"
fi

# 5. Check Node.js dependencies
print_status "Checking Node.js dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "Root node_modules missing"
    print_status "Run: npm install"
fi

if [ ! -d "server/node_modules" ]; then
    print_warning "Server node_modules missing"
    print_status "Run: cd server && npm install"
fi

if [ ! -d "client/node_modules" ]; then
    print_warning "Client node_modules missing"
    print_status "Run: cd client && npm install"
fi

# 6. Check required route files
print_status "Checking required route files..."
REQUIRED_ROUTES=(
    "server/routes/auth.js"
    "server/routes/cards.js"
    "server/routes/upload.js"
    "server/routes/collections.js"
    "server/routes/preview.js"
)

for route in "${REQUIRED_ROUTES[@]}"; do
    if [ -f "$route" ]; then
        print_success "$route exists"
    else
        print_error "$route is missing"
    fi
done

# 7. Check required model files
print_status "Checking required model files..."
REQUIRED_MODELS=(
    "server/models/User.js"
    "server/models/Card.js"
    "server/models/Collection.js"
)

for model in "${REQUIRED_MODELS[@]}"; do
    if [ -f "$model" ]; then
        print_success "$model exists"
    else
        print_error "$model is missing"
    fi
done

# 8. Check middleware
print_status "Checking middleware..."
if [ -f "server/middleware/auth.js" ]; then
    print_success "server/middleware/auth.js exists"
else
    print_error "server/middleware/auth.js is missing"
fi

# 9. Check utility files
print_status "Checking utility files..."
REQUIRED_UTILS=(
    "server/utils/contentProcessor.js"
    "server/utils/aiProcessor.js"
    "server/utils/email.js"
)

for util in "${REQUIRED_UTILS[@]}"; do
    if [ -f "$util" ]; then
        print_success "$util exists"
    else
        print_error "$util is missing"
    fi
done

# 10. Check AI/Ollama configuration
print_status "Checking AI (Ollama) configuration..."
if grep -q "OLLAMA_ENABLED=true" server/.env 2>/dev/null; then
    print_success "AI (Ollama) is enabled in .env"
    
    # Check if Ollama is installed
    if command -v ollama &> /dev/null; then
        print_success "Ollama is installed"
        
        # Check if Ollama service is running
        if curl -s http://localhost:11434/api/tags &> /dev/null; then
            print_success "Ollama service is running"
            
            # Check if model is installed
            OLLAMA_MODEL=$(grep "OLLAMA_MODEL=" server/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "llama2")
            if ollama list 2>/dev/null | grep -q "$OLLAMA_MODEL"; then
                print_success "Ollama model '$OLLAMA_MODEL' is installed"
            else
                print_warning "Ollama model '$OLLAMA_MODEL' is not installed"
                print_status "Run: ollama pull $OLLAMA_MODEL"
            fi
        else
            print_warning "Ollama service is not running"
            print_status "Start Ollama with: ollama serve"
            if [[ "$OSTYPE" == "darwin"* ]]; then
                print_status "Or: brew services start ollama"
            fi
        fi
    else
        print_warning "Ollama is not installed but enabled in .env"
        print_status "Install Ollama from https://ollama.ai or run: brew install ollama"
    fi
else
    print_status "AI (Ollama) is disabled (optional feature)"
fi

# 11. Check frontend components
print_status "Checking frontend components..."
if [ -f "client/src/components/CardDetailModal.js" ]; then
    print_success "CardDetailModal.js exists"
else
    print_error "CardDetailModal.js is missing"
fi

# 12. Check if server is running and test endpoints
print_status "Checking if server is running..."
if curl -s http://localhost:5001/api/health &> /dev/null; then
    print_success "Server is running"
    
    # Test AI status endpoint if enabled
    if grep -q "OLLAMA_ENABLED=true" server/.env 2>/dev/null; then
        print_status "Testing AI status endpoint..."
        AI_STATUS=$(curl -s http://localhost:5001/api/ai/status 2>/dev/null)
        if echo "$AI_STATUS" | grep -q "enabled"; then
            if echo "$AI_STATUS" | grep -q '"available":true'; then
                print_success "AI status endpoint: AI is available"
            elif echo "$AI_STATUS" | grep -q '"enabled":true'; then
                print_warning "AI status endpoint: AI is enabled but not available"
            else
                print_status "AI status endpoint: AI is disabled"
            fi
        else
            print_warning "Could not test AI status endpoint"
        fi
    fi
else
    print_status "Server is not running (this is normal if you haven't started it yet)"
fi

# Summary
echo ""
echo "=================================="
echo "📊 Summary"
echo "=================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "You can now start the server with:"
    echo "  npm run dev"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Found $WARNINGS warning(s)${NC}"
    echo "The server should still work, but review the warnings above."
    echo ""
    echo "You can start the server with:"
    echo "  npm run dev"
else
    echo -e "${RED}✗ Found $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo "Please fix the errors above before starting the server."
    exit 1
fi

# AI-specific information
if grep -q "OLLAMA_ENABLED=true" server/.env 2>/dev/null; then
    echo ""
    echo "🤖 AI Features:"
    if command -v ollama &> /dev/null && curl -s http://localhost:11434/api/tags &> /dev/null; then
        echo -e "   ${GREEN}✓ AI (Ollama) is configured and ready${NC}"
        echo "   - Use 'Regenerate (AI)' button on cards to try AI regeneration"
        echo "   - See AI_VERIFICATION.md for verification steps"
    else
        echo -e "   ${YELLOW}⚠ AI is enabled but Ollama is not running${NC}"
        echo "   - Start Ollama: ollama serve"
        echo "   - Or disable AI: Set OLLAMA_ENABLED=false in server/.env"
    fi
else
    echo ""
    echo "🤖 AI Features:"
    echo "   - AI (Ollama) is disabled (optional feature)"
    echo "   - To enable: Set OLLAMA_ENABLED=true in server/.env"
    echo "   - See AI_VERIFICATION.md for setup instructions"
fi

echo ""
