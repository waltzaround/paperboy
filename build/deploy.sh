#!/bin/bash

# Paperboy Scraper Deployment Script
# This script deploys the scraper to your local server

set -e  # Exit on any error

echo "🚀 Starting Paperboy Scraper Deployment..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure your environment variables:"
    echo "cp .env.example .env"
    echo "Then edit .env with your actual values."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose not found!"
    echo "Please install Docker Compose and try again."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p public/news/raw
mkdir -p logs

# Build and start the container
echo "🏗️  Building Docker image..."
docker-compose build

echo "🚀 Starting Paperboy Scraper..."
docker-compose up -d

# Wait a moment for container to start
sleep 5

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Paperboy Scraper deployed successfully!"
    echo ""
    echo "📊 Container Status:"
    docker-compose ps
    echo ""
    echo "📋 Useful Commands:"
    echo "  View logs:           docker-compose logs -f paperboy-scraper"
    echo "  Stop service:        docker-compose down"
    echo "  Restart service:     docker-compose restart"
    echo "  Run scraper now:     docker-compose exec paperboy-scraper /app/run-scraper.sh"
    echo "  Access container:    docker-compose exec paperboy-scraper sh"
    echo ""
    echo "⏰ Schedule: Runs at midnight every Tuesday and Thursday (NZ time)"
    echo "📁 Data stored in: ./public/news/"
    echo "📝 Logs stored in: ./logs/"
else
    echo "❌ Deployment failed! Container is not running."
    echo "Check logs with: docker-compose logs paperboy-scraper"
    exit 1
fi
