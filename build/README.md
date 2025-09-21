# 🏗️ Build Scripts

This folder contains all the build and deployment scripts for the Paperboy scraper.

## 📋 Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `build-local.sh` | Build Docker image locally | `./build-local.sh` |
| `transfer-to-server.sh` | Transfer files to server | `./transfer-to-server.sh` |
| `deploy-server.sh` | Deploy on server | Run on server |
| `monitor.sh` | Monitor deployment | Run on server |
| `troubleshoot.sh` | Debug issues | Run on server |
| `test-connection.sh` | Test SSH connection | `./test-connection.sh` |
| `debug-server.sh` | Debug server files | Run on server |
| `run-scraper.sh` | Manual scraper execution | Run in container |
| `start.sh` | Container startup script | Used by Docker |

## 🚀 Quick Usage

From the project root directory:

```bash
# Build Docker image
./build.sh local

# Transfer to server
./build.sh transfer

# Test connection
./build.sh test
```

Or run scripts directly:

```bash
# Build locally
./build/build-local.sh

# Transfer to server
./build/transfer-to-server.sh

# Test connection
./build/test-connection.sh
```

## 📁 File Organization

- **Local scripts**: Run from your laptop
  - `build-local.sh` - Build Docker image
  - `transfer-to-server.sh` - Transfer files
  - `test-connection.sh` - Test connection

- **Server scripts**: Transferred to and run on server
  - `deploy-server.sh` - Deploy container
  - `monitor.sh` - Monitor status
  - `troubleshoot.sh` - Debug issues
  - `debug-server.sh` - File debugging

- **Container scripts**: Used inside Docker container
  - `run-scraper.sh` - Execute scraper
  - `start.sh` - Container startup

## 🔧 Configuration

Before using, configure your server details in `transfer-to-server.sh`:

```bash
SERVER_USER="your-username"
SERVER_HOST="192.168.1.82"
SERVER_PATH="~/apps/paperboy"
```

## 📚 Documentation

See the main project documentation:
- `../SECURE_DEPLOYMENT.md` - Complete deployment guide
- `../PORTAINER_DEPLOYMENT.md` - Portainer-specific guide
- `../DOCKER_README.md` - Docker usage guide
