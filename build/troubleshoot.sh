#!/bin/bash

# Paperboy Scraper Troubleshooting Script
# Run this if you encounter issues

echo "🔍 Paperboy Scraper Troubleshooting"
echo "==================================="

echo "1. 🐳 Docker Status:"
if docker info > /dev/null 2>&1; then
    echo "   ✅ Docker is running"
else
    echo "   ❌ Docker is not running - please start Docker"
    exit 1
fi

echo ""
echo "2. 📦 Container Status:"
if docker-compose ps | grep -q paperboy-scraper; then
    STATUS=$(docker-compose ps paperboy-scraper | grep paperboy-scraper | awk '{print $4}')
    echo "   Container status: $STATUS"
    
    if echo "$STATUS" | grep -q "Up"; then
        echo "   ✅ Container is running"
    else
        echo "   ❌ Container is not running properly"
        echo "   Recent logs:"
        docker-compose logs --tail=10 paperboy-scraper
    fi
else
    echo "   ❌ Container not found"
fi

echo ""
echo "3. 🔧 Environment Check:"
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    echo "   Variables configured:"
    grep -E "^[A-Z_]+=.+" .env | sed 's/=.*/=***/' | sed 's/^/     /'
else
    echo "   ❌ .env file missing - copy .env.example to .env"
fi

echo ""
echo "4. 📁 Directory Structure:"
for dir in "public/news" "public/news/raw" "logs"; do
    if [ -d "$dir" ]; then
        echo "   ✅ $dir exists"
    else
        echo "   ❌ $dir missing - creating..."
        mkdir -p "$dir"
    fi
done

echo ""
echo "5. 🕐 Cron Status (if container is running):"
if docker-compose ps | grep -q "Up"; then
    echo "   Cron processes:"
    docker-compose exec paperboy-scraper ps aux | grep -E "(cron|PID)" || echo "   No cron processes found"
    
    echo "   Cron logs:"
    docker-compose exec paperboy-scraper tail -5 /var/log/cron.log 2>/dev/null || echo "   No cron logs yet"
fi

echo ""
echo "6. 🧪 Test Commands:"
echo "   Test scraper manually:"
echo "   docker-compose exec paperboy-scraper /app/run-scraper.sh"
echo ""
echo "   View all logs:"
echo "   docker-compose logs -f paperboy-scraper"
echo ""
echo "   Restart everything:"
echo "   docker-compose down && docker-compose up -d"
