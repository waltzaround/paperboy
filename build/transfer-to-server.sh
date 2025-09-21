#!/bin/bash

# Transfer Script - Run this on your laptop
# Transfers necessary files to your server (excluding credentials)

# Configuration - Update these values for your server
SERVER_USER="fillmein"  # Just the username, not username:password
SERVER_HOST="fillmein"
SERVER_PATH="fillmein"

# Note: SSH doesn't use username:password format in the command
# If you need password authentication, SSH will prompt for it
# For key-based auth, make sure your SSH key is set up

echo "📡 Transferring Paperboy Scraper to server..."
echo "Server: $SERVER_USER@$SERVER_HOST:$SERVER_PATH"

# Test SSH connection first
echo "🔍 Testing SSH connection..."
echo "Note: You may be prompted for password if SSH keys aren't set up"

# Try connection test (allow password prompt)
if ssh -o ConnectTimeout=10 "$SERVER_USER@$SERVER_HOST" "echo 'Connection test successful'" 2>/dev/null; then
    echo "✅ SSH connection successful"
else
    echo "❌ SSH connection failed"
    echo ""
    echo "Let's try with password authentication..."
    echo "You'll be prompted for the password for user '$SERVER_USER'"
    
    if ssh -o ConnectTimeout=10 -o PreferredAuthentications=password "$SERVER_USER@$SERVER_HOST" "echo 'Connection test with password successful'"; then
        echo "✅ SSH connection with password successful"
    else
        echo "❌ Error: Cannot connect to $SERVER_USER@$SERVER_HOST"
        echo "Please check:"
        echo "  1. Server IP address is correct: $SERVER_HOST"
        echo "  2. Username is correct: $SERVER_USER"
        echo "  3. Password is correct"
        echo "  4. SSH service is running on the server"
        echo ""
        echo "Try manually: ssh $SERVER_USER@$SERVER_HOST"
        exit 1
    fi
fi

# Change to project root to find tar files
cd "$(dirname "$0")/.."

# Check if we have the required files
TAR_FILES=(paperboy-scraper-*.tar.gz)
if [ ! -f "${TAR_FILES[0]}" ] || [ "${TAR_FILES[0]}" = "paperboy-scraper-*.tar.gz" ]; then
    echo "❌ Error: No Docker image found!"
    echo "Run build/build-local.sh first to build the image."
    echo "Looking for: paperboy-scraper-*.tar.gz"
    echo "Current directory contents:"
    ls -la *.tar.gz 2>/dev/null || echo "No .tar.gz files found"
    exit 1
fi

# Find the most recent tar.gz file
TAR_FILE=$(ls -t paperboy-scraper-*.tar.gz 2>/dev/null | head -1)
if [ -z "$TAR_FILE" ]; then
    echo "❌ Error: Could not find paperboy-scraper tar.gz file!"
    exit 1
fi

echo "📦 Files to transfer:"
echo "  - $TAR_FILE (Docker image)"
echo "  - docker-compose.yml"
echo "  - deploy-server.sh"
echo "  - Supporting scripts"

# Create directory on server
echo "📁 Creating directory on server..."
ssh "$SERVER_USER@$SERVER_HOST" "mkdir -p $SERVER_PATH"

# Transfer files (excluding .env and other sensitive files)
echo "📤 Transferring files..."
scp "$TAR_FILE" \
    docker-compose.yml \
    build/deploy-server.sh \
    build/monitor.sh \
    build/troubleshoot.sh \
    build/debug-server.sh \
    crontab \
    build/run-scraper.sh \
    build/start.sh \
    "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"

# Also transfer package files if they exist (for reference)
if [ -f "package.json" ]; then
    scp package.json "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/" 2>/dev/null || true
fi
if [ -f "pnpm-lock.yaml" ]; then
    scp pnpm-lock.yaml "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/" 2>/dev/null || true
fi

# Make scripts executable on server
echo "🔧 Setting permissions..."
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && chmod +x *.sh"

echo "✅ Transfer complete!"
echo ""
echo "📋 Next steps on your server:"
echo "1. SSH to your server: ssh $SERVER_USER@$SERVER_HOST"
echo "2. Navigate to: cd $SERVER_PATH"
echo "3. Create .env file with your credentials (see .env.example)"
echo "4. Run deployment: ./deploy-server.sh"
echo ""
echo "🔒 Security note: Your .env file with credentials stays local!"

# Optional: Show how to create .env on server
echo ""
echo "💡 To create .env on server:"
echo "ssh $SERVER_USER@$SERVER_HOST"
echo "cd $SERVER_PATH"
echo "cat > .env << 'EOF'"
echo "GOOGLE_API_KEY=your_actual_key_here"
echo "DISCORD_ENDPOINT=your_actual_webhook_here"
echo "GITHUB_TOKEN=your_actual_token_here"
echo "GITHUB_REPO=username/repo-name"
echo "NODE_ENV=production"
echo "EOF"
