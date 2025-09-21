# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Install Playwright dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Playwright to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json pnpm-lock.yaml* ./

# Install dependencies
# Use pnpm install with frozen lockfile if pnpm-lock.yaml exists, otherwise regular install
RUN if [ -f "pnpm-lock.yaml" ]; then \
        pnpm install --frozen-lockfile --prod; \
    else \
        pnpm install --prod; \
    fi

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p public/news/raw

# Install cron
RUN apk add --no-cache dcron

# Copy crontab file
COPY crontab /etc/crontabs/root

# Make sure the cron service can run
RUN chmod 0644 /etc/crontabs/root

# Create a script to run the scraper
COPY run-scraper.sh /app/run-scraper.sh
RUN chmod +x /app/run-scraper.sh

# Create startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port (if needed for health checks)
EXPOSE 3000

# Start cron daemon and keep container running
CMD ["/app/start.sh"]
