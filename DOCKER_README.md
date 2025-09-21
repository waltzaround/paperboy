# Paperboy Scraper Docker Setup

This Docker setup runs the Paperboy scraper automatically at midnight every Tuesday and Thursday (New Zealand time).

## Files Created

- `Dockerfile` - Docker image definition
- `docker-compose.yml` - Docker Compose configuration
- `crontab` - Cron schedule configuration
- `run-scraper.sh` - Script that runs the scraper
- `start.sh` - Container startup script
- `.dockerignore` - Files to exclude from Docker build

## Prerequisites

1. Docker and Docker Compose installed
2. Your `.env` file with required environment variables:
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   DISCORD_ENDPOINT=your_discord_webhook_url_here
   GITHUB_TOKEN=your_github_personal_access_token
   GITHUB_REPO=owner/repository-name
   ```

## Quick Start

1. **Build and start the container:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f paperboy-scraper
   ```

3. **Check container status:**
   ```bash
   docker-compose ps
   ```

## Manual Commands

### Build the image manually:
```bash
docker build -t paperboy-scraper .
```

### Run container manually:
```bash
docker run -d \
  --name paperboy-scraper \
  --env-file .env \
  -v $(pwd)/public/news:/app/public/news \
  -v $(pwd)/logs:/var/log \
  paperboy-scraper
```

### Run scraper immediately (for testing):
```bash
docker-compose exec paperboy-scraper /app/run-scraper.sh
```

## Schedule Details

- **When**: Midnight (00:00) New Zealand time
- **Days**: Tuesday and Thursday
- **Timezone**: Pacific/Auckland (handles NZST/NZDT automatically)

## Data Persistence

- Scraped articles are stored in `./public/news/` (mounted as volume)
- Logs are stored in `./logs/` (mounted as volume)
- Articles are automatically pushed to GitHub repository (if configured)

## GitHub Integration

The scraper automatically pushes new articles to a GitHub repository after each successful scraping run.

### Setup GitHub Integration:

1. **Create a Personal Access Token:**
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` scope (full repository access)
   - Copy the token

2. **Set Environment Variables:**
   ```bash
   GITHUB_TOKEN=ghp_your_personal_access_token_here
   GITHUB_REPO=yourusername/your-repo-name
   ```

3. **Repository Structure:**
   The scraper will push files to your repository maintaining the same structure:
   ```
   public/
   └── news/
       ├── index.json           # Updated index of all articles
       ├── 20250921.json        # Processed articles
       ├── 20250922.json
       └── raw/
           ├── 20250921.json    # Raw scraped data
           └── 20250922.json
   ```

### What Gets Pushed:
- **Processed articles** (e.g., `20250921.json`) - AI-summarized content
- **Raw articles** (e.g., `raw/20250921.json`) - Original scraped data
- **Index file** (`index.json`) - Updated list of all available articles
- **Commit message** includes date and article count

### GitHub Push Status:
- Success/failure is reported in Discord webhook notifications
- Check logs for detailed GitHub API responses
- If GitHub is not configured, scraper continues normally without pushing

## Monitoring

### View scraper logs:
```bash
docker-compose exec paperboy-scraper tail -f /var/log/scraper.log
```

### View cron logs:
```bash
docker-compose exec paperboy-scraper tail -f /var/log/cron.log
```

### Check if cron is running:
```bash
docker-compose exec paperboy-scraper ps aux | grep cron
```

## Customization

### Change Schedule
Edit the `crontab` file to modify when the scraper runs:
```
# Current: Midnight on Tuesday and Thursday
0 0 * * 2,4 /app/run-scraper.sh >> /var/log/scraper.log 2>&1

# Example: 6 AM every day
0 6 * * * /app/run-scraper.sh >> /var/log/scraper.log 2>&1

# Example: Every 4 hours
0 */4 * * * /app/run-scraper.sh >> /var/log/scraper.log 2>&1
```

### Change Date Range
Edit `run-scraper.sh` to modify which dates to scrape:
```bash
# Current: Scrapes current date
node scraper.js "$CURRENT_DATE"

# Example: Scrape date range
node scraper.js "$YESTERDAY" "$CURRENT_DATE"

# Example: Scrape specific date
node scraper.js "2025-09-21"
```

## Troubleshooting

### Container won't start:
```bash
docker-compose logs paperboy-scraper
```

### Scraper not running at scheduled time:
1. Check if cron is running: `docker-compose exec paperboy-scraper ps aux | grep cron`
2. Check cron logs: `docker-compose exec paperboy-scraper cat /var/log/cron.log`
3. Verify timezone: `docker-compose exec paperboy-scraper date`

### Test scraper manually:
```bash
docker-compose exec paperboy-scraper node scraper.js 2025-09-21
```

### Access container shell:
```bash
docker-compose exec paperboy-scraper sh
```

## Stopping the Service

```bash
# Stop the container
docker-compose down

# Stop and remove volumes (WARNING: This deletes scraped data)
docker-compose down -v
```

## Production Deployment

For production deployment, consider:

1. **Resource limits** in docker-compose.yml:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 1G
         cpus: '0.5'
   ```

2. **Log rotation** to prevent log files from growing too large

3. **Monitoring** with tools like Prometheus or health check endpoints

4. **Backup strategy** for the scraped data in `./public/news/`
