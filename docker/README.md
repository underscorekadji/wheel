# Docker Configuration

This directory contains all Docker-related configuration files for the Wheel application, organized by environment.

## Directory Structure

```text
docker/
├── ssl/
│   ├── generate-certs.sh      # SSL certificate generation script
│   ├── localhost.crt          # SSL certificate
│   ├── localhost.key          # Private key
│   └── README.md              # SSL documentation
├── dev/
│   ├── Dockerfile             # Development Docker image
│   ├── docker-compose.yml     # Development environment
│   ├── nginx.conf             # Development nginx config with HTTPS
│   └── .env                   # Development environment variables
├── prod/
│   ├── docker-compose.yml     # Production Docker Compose
│   └── nginx.conf             # Production nginx config with HTTPS
├── docker-test.sh             # Test script
├── validate-nginx.sh          # Nginx configuration validation
├── smoke-test.sh              # Full functionality test
└── README.md                  # This file
```

## 🚀 Quick Start

### 1. Generate SSL Certificates (One Time)

```bash
./docker/ssl/generate-certs.sh
```

### 2. Development Environment

```bash
cd docker/dev
docker compose up -d
```

**Access:**
- **HTTPS**: https://localhost (recommended)
- **HTTP**: http://localhost (redirects to HTTPS)

### 3. Production Environment

```bash
cd docker/prod
docker compose up -d --build
```

**Access:**
- **Production app**: https://localhost

## 🔧 Features

### ✅ HTTPS with Self-Signed Certificates
- TLS 1.2/1.3 support with modern cipher suites
- HTTP automatically redirects to HTTPS
- Self-signed certificates for localhost development

### ✅ WebSocket Proxy for Socket.IO
- Dedicated `/socket.io/` location block
- Proper WebSocket headers and connection upgrade
- Optimized for real-time communication

### ✅ Rate Limiting
- **General**: 10 req/s (burst: 20)
- **API endpoints**: 5 req/s (burst: 10)
- **WebSocket**: 20 req/s (burst: 50)

### ✅ Security Features
- HSTS headers with 1-year max-age
- XSS protection headers
- Modern SSL/TLS configuration

## 🧪 Testing & Validation

### Validate Configuration
```bash
./docker/validate-nginx.sh
```

### Full Smoke Test
```bash
./docker/smoke-test.sh
```

### Test Docker Setup
```bash
./docker/docker-test.sh
```

## 📋 Services

### Development Stack
- **app**: Next.js development server with hot reload
- **redis**: Redis server with persistence
- **nginx**: HTTPS reverse proxy (development optimized)

### Production Stack
- **app**: Next.js production server (standalone build)
- **redis**: Redis server with persistence  
- **nginx**: HTTPS reverse proxy with compression and security headers

## 🛠️ Configuration Notes

### Development Environment
- Volume mounts for hot reload
- Nginx caching disabled for development
- Self-signed SSL certificates
- Rate limiting enabled but permissive

### Production Environment
- Optimized standalone Next.js build
- Gzip compression enabled
- Stricter security headers
- Production-tuned rate limiting

### SSL/TLS Configuration
- **Protocols**: TLSv1.2, TLSv1.3
- **Ciphers**: ECDHE with AES-GCM
- **HSTS**: Enabled with includeSubDomains
- **HTTP/2**: Enabled for better performance

## 🔍 Troubleshooting

### Certificate Warnings
Self-signed certificates will show browser warnings - this is expected for development.

### Rate Limiting Issues
If you see 429 errors, you're hitting rate limits. Check the nginx configuration for rate adjustments.

### WebSocket Connection Issues
Ensure the Socket.IO client connects to the correct `/socket.io/` endpoint with HTTPS.

## 🔄 CI Integration

The nginx configuration is automatically validated in CI:
- SSL certificate generation
- Configuration syntax validation
- Feature requirement verification
- Docker Compose validation