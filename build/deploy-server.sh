#!/bin/bash

# Server Deployment Script - Run this on your server
# Loads the Docker image and starts the service

set -e

echo "🚀 Deploying Paperboy Scraper on server..."

# Check if we have the required files
echo "🔍 Checking for Docker image files..."
echo "Current directory: $(pwd)"
echo "Files in directory:"
ls -la

TAR_FILES=(paperboy-scraper-*.tar.gz)
if [ ! -f "${TAR_FILES[0]}" ] || [ "${TAR_FILES[0]}" = "paperboy-scraper-*.tar.gz" ]; then
    echo "❌ Error: No Docker image tar.gz file found!"
    echo "Expected: paperboy-scraper-YYYYMMDD-HHMM.tar.gz"
    echo "Files matching pattern:"
    ls -la paperboy-scraper-*.tar.gz 2>/dev/null || echo "No matching files found"
    echo "All .tar.gz files:"
    ls -la *.tar.gz 2>/dev/null || echo "No .tar.gz files found"
    exit 1
fi

echo "✅ Found Docker image: ${TAR_FILES[0]}"

if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found!"
    echo "Please transfer docker-compose.yml from your laptop."
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with your credentials:"
    echo ""
    cat << 'EOF'
# Create .env file with these variables:
GOOGLE_API_KEY=your_google_api_key_here
DISCORD_ENDPOINT=your_discord_webhook_url
GITHUB_TOKEN=your_github_token  # Optional
GITHUB_REPO=username/repo-name  # Optional
NODE_ENV=production
EOF
    exit 1
fi

# Find the most recent tar.gz file
TAR_FILE=$(ls -t paperboy-scraper-*.tar.gz | head -1)
echo "📦 Loading Docker image: $TAR_FILE"

# Load the Docker image
docker load -i "$TAR_FILE"

echo "✅ Image loaded successfully!"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p public/news/raw
mkdir -p logs

# Start the service
echo "🚀 Starting Paperboy Scraper service..."
docker-compose up -d

# Wait for container to start
sleep 5

# Check status
echo "📊 Deployment Status:"
docker-compose ps

if docker-compose ps | grep -q "Up"; then
    echo "✅ Paperboy Scraper deployed successfully!"
    echo ""
    echo "📋 Management Commands:"
    echo "  View logs:           docker-compose logs -f paperboy-scraper"
    echo "  Stop service:        docker-compose down"
    echo "  Restart service:     docker-compose restart"
    echo "  Run scraper now:     docker-compose exec paperboy-scraper /app/run-scraper.sh"
    echo ""
    echo "⏰ Schedule: Runs at midnight every Tuesday and Thursday (NZ time)"
    echo "📁 Data: ./public/news/"
    echo "📝 Logs: ./logs/"
    
    # Clean up the tar file
    read -p "🗑️  Delete the image tar file? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm "$TAR_FILE"
        echo "✅ Cleaned up $TAR_FILE"
    fi
else
    echo "❌ Deployment failed!"
    echo "Check logs: docker-compose logs paperboy-scraper"
fi
