#!/bin/bash

# Main build script - runs from project root
# This is a convenience wrapper for the build scripts in the build/ folder

echo "🏗️  Paperboy Build System"
echo "======================="

case "$1" in
    "local"|"build")
        echo "Building Docker image locally..."
        ./build/build-local.sh
        ;;
    "transfer"|"deploy")
        echo "Transferring to server..."
        ./build/transfer-to-server.sh
        ;;
    "test"|"connection")
        echo "Testing server connection..."
        ./build/test-connection.sh
        ;;
    *)
        echo "Usage: $0 {local|transfer|test}"
        echo ""
        echo "Commands:"
        echo "  local     - Build Docker image locally"
        echo "  transfer  - Transfer files to server"
        echo "  test      - Test server connection"
        echo ""
        echo "Examples:"
        echo "  $0 local     # Build the Docker image"
        echo "  $0 transfer  # Transfer to server"
        echo "  $0 test      # Test connection"
        echo ""
        echo "Direct script access:"
        echo "  ./build/build-local.sh"
        echo "  ./build/transfer-to-server.sh"
        echo "  ./build/test-connection.sh"
        exit 1
        ;;
esac
