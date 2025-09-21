# 🔒 Secure Local Build & Server Deployment

This guide helps you build the Docker container locally and deploy it to your server without exposing credentials over the internet.

## 🏗️ **Step 1: Build Locally (on your laptop)**

**Prerequisites:**
- Docker installed and running
- pnpm installed (`npm install -g pnpm`)

```bash
# Make scripts executable
chmod +x build.sh build/*.sh

# Build the Docker image (automatically generates pnpm-lock.yaml if needed)
./build.sh local
# Or directly: ./build/build-local.sh
```

This creates:
- `pnpm-lock.yaml` (if it doesn't exist)
- `paperboy-scraper-YYYYMMDD-HHMM.tar.gz` (Docker image)
- Tagged as `paperboy-scraper:latest`

## 📡 **Step 2: Configure Transfer Script**

Edit `build/transfer-to-server.sh` and update these variables:
```bash
SERVER_USER="your-username"        # Your server username
SERVER_HOST="192.168.1.100"       # Your server IP address
SERVER_PATH="/opt/paperboy"        # Where to install on server
```

## 📤 **Step 3: Transfer Files**

```bash
# Transfer everything except credentials
./build.sh transfer
# Or directly: ./build/transfer-to-server.sh
```

This transfers:
- ✅ Docker image (tar.gz)
- ✅ docker-compose.yml
- ✅ Deployment scripts
- ❌ **NOT** your .env file (keeps credentials secure)

## 🖥️ **Step 4: Deploy on Server**

SSH to your server and complete the deployment:

```bash
# SSH to your server
ssh your-username@your-server-ip

# Navigate to the project directory
cd /opt/paperboy

# Create .env file with your actual credentials
cat > .env << 'EOF'
GOOGLE_API_KEY=your_actual_google_api_key
DISCORD_ENDPOINT=https://discord.com/api/webhooks/your_webhook_url
GITHUB_TOKEN=your_actual_github_token
GITHUB_REPO=username/repository-name
NODE_ENV=production
EOF

# Make deploy script executable and run it
chmod +x deploy-server.sh
./deploy-server.sh
```

## 🔒 **Security Benefits**

1. **Credentials Never Leave Your Network**: .env file is created directly on the server
2. **No Internet Exposure**: Image is built locally and transferred via SSH
3. **Version Control Safe**: No sensitive data in your repository
4. **Audit Trail**: You control exactly what gets transferred

## 📊 **Verification Commands**

After deployment, verify everything is working:

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f paperboy-scraper

# Test scraper manually
docker-compose exec paperboy-scraper /app/run-scraper.sh

# Monitor with provided script
./monitor.sh
```

## 🔄 **Updates Process**

When you need to update the scraper:

1. **On Laptop**: Make changes, run `./build.sh local`
2. **Transfer**: Run `./build.sh transfer` 
3. **On Server**: Run `./deploy-server.sh` (it will use the new image)

## 🛠️ **Troubleshooting**

If something goes wrong:

```bash
# On server - run troubleshooting script
./troubleshoot.sh

# Check Docker logs
docker-compose logs paperboy-scraper

# Restart everything
docker-compose down
docker-compose up -d
```

## 📁 **File Structure**

After deployment, your server will have:
```
/opt/paperboy/
├── paperboy-scraper-YYYYMMDD-HHMM.tar.gz  # Docker image (can delete after loading)
├── docker-compose.yml                      # Service configuration
├── .env                                    # Your credentials (created on server)
├── deploy-server.sh                        # Deployment script
├── monitor.sh                              # Monitoring script
├── troubleshoot.sh                         # Troubleshooting script
├── public/news/                            # Scraped articles
└── logs/                                   # Application logs
```

## ⚡ **Quick Reference**

| Action | Command |
|--------|---------|
| Build locally | `./build.sh local` |
| Transfer to server | `./build.sh transfer` |
| Deploy on server | `./deploy-server.sh` |
| Monitor | `./monitor.sh` |
| View logs | `docker-compose logs -f paperboy-scraper` |
| Stop service | `docker-compose down` |
