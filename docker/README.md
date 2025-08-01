# Docker Configuration

This directory contains all Docker-related configuration files for the Wheel application, organized by environment.

## Directory Structure

```text
docker/
├── dev/
│   ├── Dockerfile          # Development Docker image
│   ├── nginx.conf          # Nginx config for development
│   └── .env                # Development environment variables
├── prod/
│   ├── docker-compose.yml  # Production Docker Compose
│   └── nginx.conf          # Nginx config for production
├── docker-test.sh          # Test script
└── README.md               # This file
```

## Usage

### Development Environment

From the project root directory:

```bash
# Start development services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Access:**

- Via Nginx: <http://localhost>
- Direct app: <http://localhost:3000>

### Production Environment

From the project root directory:

```bash
# Start production services
docker compose -f docker/prod/docker-compose.yml up -d --build

# View logs
docker compose -f docker/prod/docker-compose.yml logs -f

# Stop services
docker compose -f docker/prod/docker-compose.yml down
```

**Access:**

- Production app: <http://localhost>

### Test Docker Setup

```bash
# Run the test script
./docker/docker-test.sh
```

## Services

### Development Stack

- **app**: Next.js development server with hot reload
- **redis**: Redis server with persistence
- **nginx**: Reverse proxy optimized for development (no caching)

### Production Stack

- **app**: Next.js production server (standalone build)
- **redis**: Redis server with persistence
- **nginx**: Reverse proxy with compression and security headers

## Configuration Notes

- Development uses volume mounts for hot reload
- Development nginx disables caching for better development experience
- Production uses optimized standalone Next.js build
- Production nginx includes gzip compression and security headers
- Redis data persists across container restarts in both environments
