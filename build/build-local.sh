#!/bin/bash

# Local Build Script - Run this on your laptop
# Builds the Docker image locally without exposing credentials

set -e

echo "🏗️  Building Paperboy Scraper locally..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed!"
    echo "Install pnpm with: npm install -g pnpm"
    exit 1
fi

# Change to project root directory
cd "$(dirname "$0")/.."

# Generate pnpm-lock.yaml if it doesn't exist
if [ ! -f "pnpm-lock.yaml" ]; then
    echo "📦 Generating pnpm-lock.yaml..."
    pnpm install --lockfile-only
fi

# Build the image with a specific tag
IMAGE_NAME="paperboy-scraper"
VERSION=$(date +%Y%m%d-%H%M)
FULL_TAG="${IMAGE_NAME}:${VERSION}"
LATEST_TAG="${IMAGE_NAME}:latest"

echo "Building image: $FULL_TAG"

# Build the image specifically for x86_64/AMD64 (most servers)
echo "Building image for AMD64 architecture (server compatibility)..."
docker buildx create --use --name amd64-builder 2>/dev/null || true
docker buildx build --platform linux/amd64 -t "$FULL_TAG" -t "$LATEST_TAG" --load .

echo "✅ Build complete!"
echo "Image tags created:"
echo "  - $FULL_TAG"
echo "  - $LATEST_TAG"

# Save image to tar file
TAR_FILE="${IMAGE_NAME}-${VERSION}.tar.gz"
echo "📦 Saving image to: $TAR_FILE"

docker save "$LATEST_TAG" | gzip > "$TAR_FILE"

echo "✅ Image saved successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Transfer $TAR_FILE to your server"
echo "2. Transfer docker-compose.yml to your server"
echo "3. Create .env file on your server (don't transfer it!)"
echo "4. Load and run the image on your server"
echo ""
echo "Transfer command example:"
echo "scp $TAR_FILE docker-compose.yml user@your-server:/path/to/paperboy/"
