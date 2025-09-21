#!/bin/bash

# Connection Troubleshooting Script
# This script helps diagnose SSH connection issues

SERVER_HOST="192.168.1.82"
SERVER_USER="walrus"

echo "🔍 Diagnosing connection to $SERVER_USER@$SERVER_HOST"
echo "=================================================="

# Test 1: Basic network connectivity
echo "1. Testing basic network connectivity..."
if ping -c 3 -W 3000 "$SERVER_HOST" > /dev/null 2>&1; then
    echo "   ✅ Server is reachable via ping"
else
    echo "   ❌ Server is not reachable via ping"
    echo "   This could mean:"
    echo "   - Wrong IP address"
    echo "   - Server is down"
    echo "   - Firewall blocking ping"
fi

echo ""

# Test 2: Check if SSH port is open
echo "2. Testing SSH port (22)..."
if nc -z -w5 "$SERVER_HOST" 22 2>/dev/null; then
    echo "   ✅ SSH port 22 is open"
else
    echo "   ❌ SSH port 22 is not accessible"
    echo "   This could mean:"
    echo "   - SSH service is not running"
    echo "   - SSH is running on a different port"
    echo "   - Firewall blocking SSH"
fi

echo ""

# Test 3: Try to discover the correct IP
echo "3. Scanning local network for SSH servers..."
echo "   (This may take a moment...)"

# Get your local network range
LOCAL_IP=$(route -n get default | grep interface | awk '{print $2}' | xargs ifconfig | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}')
NETWORK=$(echo $LOCAL_IP | cut -d. -f1-3)

echo "   Your IP: $LOCAL_IP"
echo "   Scanning network: $NETWORK.1-254"

# Quick scan for SSH on common IPs
for i in {1..254}; do
    IP="$NETWORK.$i"
    if nc -z -w1 "$IP" 22 2>/dev/null; then
        echo "   🔍 Found SSH server at: $IP"
    fi
done

echo ""

# Test 4: Alternative connection methods
echo "4. Suggested troubleshooting steps:"
echo "   a) Check if your server is running:"
echo "      - Is the machine powered on?"
echo "      - Is SSH service enabled?"
echo ""
echo "   b) Find your server's correct IP:"
echo "      - Check your router's admin panel"
echo "      - Run 'arp -a' to see devices on your network"
echo "      - Check server's network settings"
echo ""
echo "   c) Test SSH manually with different options:"
echo "      ssh -v $SERVER_USER@$SERVER_HOST  # Verbose output"
echo "      ssh -p 2222 $SERVER_USER@$SERVER_HOST  # Try different port"
echo ""
echo "   d) If using password auth, try:"
echo "      ssh -o PreferredAuthentications=password $SERVER_USER@$SERVER_HOST"

echo ""
echo "🔧 Quick fixes to try:"
echo "1. Update SERVER_HOST in transfer-to-server.sh with correct IP"
echo "2. Make sure SSH is enabled on your server"
echo "3. Check if server uses a different SSH port"
echo "4. Verify the username is correct"
