#!/bin/sh

# Script to run the Paperboy scraper
# This script determines the date range to scrape and runs the scraper

cd /app

# Get current date in YYYY-MM-DD format
CURRENT_DATE=$(date +%Y-%m-%d)

# Get yesterday's date (in case we want to scrape recent dates)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)

# Log start time
echo "$(date): Starting Paperboy scraper for date: $CURRENT_DATE"

# Run the scraper for the current date
# You can modify this to scrape a date range if needed
node scraper.js "$CURRENT_DATE"

# Check exit code
if [ $? -eq 0 ]; then
    echo "$(date): Scraper completed successfully for $CURRENT_DATE"
else
    echo "$(date): Scraper failed for $CURRENT_DATE"
fi

# Optional: Also try yesterday's date if current date has no content
# Uncomment the lines below if you want this behavior
# echo "$(date): Also trying yesterday's date: $YESTERDAY"
# node scraper.js "$YESTERDAY"

echo "$(date): Scraper run completed"
