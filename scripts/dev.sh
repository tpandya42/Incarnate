#!/bin/bash

# Incarnate Development Server Script
# Runs both frontend and backend concurrently

echo "🚀 Starting Incarnate Development Servers..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${RED}🛑 Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Check if backend dependencies are installed
if [ ! -d "$PROJECT_ROOT/backend/node_modules" ]; then
    echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
    cd "$PROJECT_ROOT/backend" && npm install
fi

# Check if frontend dependencies are installed
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    cd "$PROJECT_ROOT" && npm install
fi

# Start Backend
echo -e "${GREEN}🔧 Starting Backend Server (Port 8080)...${NC}"
cd "$PROJECT_ROOT/backend" && npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start Frontend
echo -e "${GREEN}🎨 Starting Frontend Server (Port 3000)...${NC}"
cd "$PROJECT_ROOT" && npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}✅ Both servers are running!${NC}"
echo ""
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8080"
echo "   API Docs: http://localhost:8080/api/health"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
