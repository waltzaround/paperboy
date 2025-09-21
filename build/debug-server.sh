#!/bin/bash

# Debug script to check server files
echo "🔍 Server File Debug Information"
echo "================================"

echo "Current directory: $(pwd)"
echo ""

echo "All files in directory:"
ls -la
echo ""

echo "Looking for .tar.gz files:"
ls -la *.tar.gz 2>/dev/null || echo "No .tar.gz files found"
echo ""

echo "Looking for paperboy-scraper files:"
ls -la paperboy-scraper* 2>/dev/null || echo "No paperboy-scraper files found"
echo ""

echo "Testing glob expansion:"
TAR_FILES=(paperboy-scraper-*.tar.gz)
echo "Glob result: ${TAR_FILES[@]}"
echo "First file: ${TAR_FILES[0]}"
echo "File exists check: $([ -f "${TAR_FILES[0]}" ] && echo "YES" || echo "NO")"
echo ""

echo "Docker status:"
docker --version 2>/dev/null || echo "Docker not found"
docker-compose --version 2>/dev/null || echo "Docker Compose not found"
echo ""

echo "Environment file check:"
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "Variables in .env:"
    grep -E "^[A-Z_]+=.+" .env | sed 's/=.*/=***/' || echo "No variables found"
else
    echo "❌ .env file missing"
fi
