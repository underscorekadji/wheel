#!/bin/bash

# Simple nginx HTTPS validation test
# Tests core requirements: HTTPS, SSL certificates, WebSocket proxy, and rate limiting

set -e

echo "🧪 Running nginx HTTPS validation test..."

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Test 1: SSL certificates exist
echo "🔐 Checking SSL certificates..."
if [ -f "$PROJECT_ROOT/docker/ssl/localhost.crt" ] && [ -f "$PROJECT_ROOT/docker/ssl/localhost.key" ]; then
    echo "✅ SSL certificates present"
else
    echo "❌ SSL certificates missing"
    exit 1
fi

# Test 2: Nginx configuration syntax
echo "📋 Testing nginx configuration syntax..."
docker run --rm \
  -v "$PROJECT_ROOT/docker/ssl/localhost.crt":/etc/ssl/certs/localhost.crt:ro \
  -v "$PROJECT_ROOT/docker/ssl/localhost.key":/etc/ssl/private/localhost.key:ro \
  -v "$PROJECT_ROOT/docker/dev/nginx.conf":/tmp/nginx-test.conf:ro \
  nginx:alpine sh -c "
    # Create a testable version by replacing the upstream with localhost
    sed 's/app:3000/127.0.0.1:3000/g' /tmp/nginx-test.conf > /etc/nginx/conf.d/default.conf
    nginx -t
  "
echo "✅ Development nginx configuration syntax is valid"

docker run --rm \
  -v "$PROJECT_ROOT/docker/ssl/localhost.crt":/etc/ssl/certs/localhost.crt:ro \
  -v "$PROJECT_ROOT/docker/ssl/localhost.key":/etc/ssl/private/localhost.key:ro \
  -v "$PROJECT_ROOT/docker/prod/nginx.conf":/tmp/nginx-test.conf:ro \
  nginx:alpine sh -c "
    # Create a testable version by replacing the upstream with localhost
    sed 's/app:3000/127.0.0.1:3000/g' /tmp/nginx-test.conf > /etc/nginx/conf.d/default.conf
    nginx -t
  "
echo "✅ Production nginx configuration syntax is valid"

# Test 3: Docker compose configurations
echo "📋 Testing docker-compose configurations..."
cd "$PROJECT_ROOT/docker/dev"
if docker compose config --quiet; then
    echo "✅ Development docker-compose configuration is valid"
else
    echo "❌ Development docker-compose configuration is invalid"
    exit 1
fi

cd "$PROJECT_ROOT/docker/prod"
if docker compose config --quiet; then
    echo "✅ Production docker-compose configuration is valid"
else
    echo "❌ Production docker-compose configuration is invalid"
    exit 1
fi

# Test 4: Verify configuration features
echo "🔍 Verifying nginx configuration features..."

DEV_CONFIG="$PROJECT_ROOT/docker/dev/nginx.conf"
PROD_CONFIG="$PROJECT_ROOT/docker/prod/nginx.conf"

# Check for HTTPS (port 443)
if grep -q "listen 443 ssl" "$DEV_CONFIG" && grep -q "listen 443 ssl" "$PROD_CONFIG"; then
    echo "✅ HTTPS configuration present"
else
    echo "❌ HTTPS configuration missing"
    exit 1
fi

# Check for HTTP to HTTPS redirect
if grep -q "return 301 https" "$DEV_CONFIG" && grep -q "return 301 https" "$PROD_CONFIG"; then
    echo "✅ HTTP to HTTPS redirect configured"
else
    echo "❌ HTTP to HTTPS redirect missing"
    exit 1
fi

# Check for WebSocket proxy configuration
if grep -q "socket.io" "$DEV_CONFIG" && grep -q "socket.io" "$PROD_CONFIG" && \
   grep -q "proxy_set_header Upgrade" "$DEV_CONFIG" && grep -q "proxy_set_header Upgrade" "$PROD_CONFIG"; then
    echo "✅ WebSocket proxy configuration present"
else
    echo "❌ WebSocket proxy configuration missing"
    exit 1
fi

# Check for rate limiting
if grep -q "limit_req_zone" "$DEV_CONFIG" && grep -q "limit_req_zone" "$PROD_CONFIG" && \
   grep -q "limit_req zone=" "$DEV_CONFIG" && grep -q "limit_req zone=" "$PROD_CONFIG"; then
    echo "✅ Rate limiting configuration present"
else
    echo "❌ Rate limiting configuration missing"
    exit 1
fi

# Check for SSL certificate paths
if grep -q "ssl_certificate" "$DEV_CONFIG" && grep -q "ssl_certificate" "$PROD_CONFIG"; then
    echo "✅ SSL certificate configuration present"
else
    echo "❌ SSL certificate configuration missing"
    exit 1
fi

# Check for security headers
if grep -q "add_header.*Strict-Transport-Security" "$DEV_CONFIG" && \
   grep -q "add_header.*Strict-Transport-Security" "$PROD_CONFIG"; then
    echo "✅ Security headers (HSTS) configured"
else
    echo "❌ Security headers missing"
    exit 1
fi

echo ""
echo "🎉 All nginx HTTPS validation tests passed!"
echo ""
echo "✅ Requirements fulfilled:"
echo "   ✓ HTTPS configured with self-signed certificates"
echo "   ✓ WebSocket proxy configured for Socket.IO"
echo "   ✓ Basic rate limiting implemented"
echo "   ✓ Configuration works with docker-compose"
echo "   ✓ HTTP to HTTPS redirect"
echo "   ✓ Security headers (HSTS)"
echo ""
echo "🚀 Ready for deployment with 'docker compose up'!"