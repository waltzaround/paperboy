# 🐳 Portainer Deployment Guide

This guide shows you how to deploy the Paperboy scraper using Portainer instead of command line.

## 📋 Prerequisites

1. **Docker image loaded on server:**
   ```bash
   # SSH to your server first
   ssh walrus@192.168.1.82
   cd ~/apps/paperboy
   
   # Load the Docker image
   docker load -i paperboy-scraper-20250921-1431.tar.gz
   
   # Verify image is loaded
   docker images | grep paperboy-scraper
   ```

2. **Files in correct location:**
   - Docker image: Loaded into Docker
   - .env file: `/home/walrus/apps/paperboy/.env`
   - Data directories: `/home/walrus/apps/paperboy/public/news` and `/home/walrus/apps/paperboy/logs`

## 🚀 Portainer Stack Deployment

### Step 1: Access Portainer
- Open your browser and go to your Portainer instance
- Navigate to **Stacks** → **Add stack**

### Step 2: Create Stack
- **Name:** `paperboy-scraper`
- **Build method:** Choose "Web editor"

### Step 3: Paste Docker Compose Content
Copy and paste this docker-compose configuration:

```yaml
version: '3.8'

services:
  paperboy-scraper:
    image: paperboy-scraper:latest
    container_name: paperboy-scraper
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - TZ=Pacific/Auckland
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - GITHUB_REPO=${GITHUB_REPO}
    env_file:
      - /home/walrus/apps/paperboy/.env
    volumes:
      - /home/walrus/apps/paperboy/public/news:/app/public/news
      - /home/walrus/apps/paperboy/logs:/var/log
    healthcheck:
      test: ["CMD", "test", "-f", "/var/log/cron.log"]
      interval: 1h
      timeout: 10s
      retries: 3
      start_period: 30s
    labels:
      - "com.paperboy.service=scraper"
      - "com.paperboy.schedule=tuesday-thursday-midnight"
```

### Step 4: Environment Variables (Optional)
If you want to override environment variables in Portainer instead of using the .env file:

**Advanced options** → **Environment variables:**
- `GOOGLE_API_KEY`: `your_google_api_key`
- `DISCORD_ENDPOINT`: `your_discord_webhook_url`
- `GITHUB_TOKEN`: `your_github_token`
- `GITHUB_REPO`: `username/repo-name`
- `NODE_ENV`: `production`

### Step 5: Deploy
- Click **Deploy the stack**
- Wait for deployment to complete

## 📊 Monitoring in Portainer

### Container Management
- **Containers** → **paperboy-scraper**
- View logs, stats, and manage the container

### Logs
- Click on the container → **Logs** tab
- Enable "Auto-refresh logs" to see real-time output

### Health Check
- The container includes a health check that runs every hour
- Status will show as "healthy" when cron is running properly

## 🔧 Troubleshooting

### Common Issues

**1. Image not found:**
```bash
# On server, load the image first:
docker load -i ~/apps/paperboy/paperboy-scraper-20250921-1431.tar.gz
```

**2. .env file not found:**
- Make sure `.env` exists at `/home/walrus/apps/paperboy/.env`
- Check file permissions: `chmod 644 /home/walrus/apps/paperboy/.env`

**3. Volume mount issues:**
```bash
# Create directories if they don't exist:
mkdir -p /home/walrus/apps/paperboy/public/news/raw
mkdir -p /home/walrus/apps/paperboy/logs
chmod 755 /home/walrus/apps/paperboy/public
chmod 755 /home/walrus/apps/paperboy/logs
```

**4. Permission issues:**
```bash
# Fix ownership if needed:
sudo chown -R walrus:walrus /home/walrus/apps/paperboy
```

### Verification Commands

Run these on your server to verify everything is ready:

```bash
# Check if image exists
docker images | grep paperboy-scraper

# Check if .env file exists and has content
cat /home/walrus/apps/paperboy/.env

# Check directories exist
ls -la /home/walrus/apps/paperboy/

# Test the stack manually (optional)
cd /home/walrus/apps/paperboy
docker-compose -f docker-compose-portainer.yml up -d
```

## 📅 Schedule Verification

The scraper will run automatically:
- **When:** Midnight (00:00) New Zealand time
- **Days:** Tuesday and Thursday
- **Timezone:** Pacific/Auckland (handles NZST/NZDT)

## 🔄 Updates

To update the scraper:
1. Build new image on laptop: `./build-local.sh`
2. Transfer to server: `./transfer-to-server.sh`
3. Load new image: `docker load -i paperboy-scraper-YYYYMMDD-HHMM.tar.gz`
4. In Portainer: **Stacks** → **paperboy-scraper** → **Update the stack**

## 📱 Monitoring

- **Discord notifications:** Automatic status reports after each run
- **GitHub integration:** Articles automatically pushed to your repository
- **Portainer logs:** Real-time container logs and health status
- **Local files:** Articles saved to `/home/walrus/apps/paperboy/public/news/`
