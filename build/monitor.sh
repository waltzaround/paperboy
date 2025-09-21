#!/bin/bash

# Paperboy Scraper Monitoring Script
# Quick commands to monitor your deployment

echo "📊 Paperboy Scraper Status"
echo "=========================="

# Container status
echo "🐳 Container Status:"
docker-compose ps

echo ""
echo "📈 Resource Usage:"
docker stats paperboy-scraper --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

echo ""
echo "📝 Recent Logs (last 20 lines):"
docker-compose logs --tail=20 paperboy-scraper

echo ""
echo "⏰ Next Scheduled Runs:"
echo "Tuesday and Thursday at midnight (NZ time)"

echo ""
echo "📁 Local Files:"
if [ -d "public/news" ]; then
    echo "Articles: $(find public/news -name "*.json" -not -name "index.json" | wc -l)"
    echo "Latest: $(ls -t public/news/*.json 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "None")"
else
    echo "No articles directory found"
fi

echo ""
echo "🔧 Quick Commands:"
echo "  Full logs:           docker-compose logs -f paperboy-scraper"
echo "  Run scraper now:     docker-compose exec paperboy-scraper /app/run-scraper.sh"
echo "  Restart service:     docker-compose restart"
echo "  Stop service:        docker-compose down"
