#!/bin/sh

# Start script for the Docker container
echo "Starting Paperboy scraper container..."

# Create log files
touch /var/log/scraper.log
touch /var/log/cron.log

# Start cron daemon
echo "Starting cron daemon..."
crond -f -d 8 &

# Keep the container running and show logs
echo "Container started. Monitoring logs..."
echo "Cron schedule: Midnight every Tuesday and Thursday"
echo "Current time: $(date)"
echo "Next Tuesday: $(date -d 'next tuesday' 2>/dev/null || echo 'N/A')"
echo "Next Thursday: $(date -d 'next thursday' 2>/dev/null || echo 'N/A')"

# Tail logs to keep container alive and show output
tail -f /var/log/scraper.log /var/log/cron.log
