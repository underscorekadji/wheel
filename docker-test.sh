#!/bin/bash

# Docker Compose Development Setup Script
# This script helps test the Docker Compose setup

echo "🐳 Setting up Wheel app with Docker Compose..."

# Check if docker and docker compose are available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available"
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Build the services
echo "🏗️ Building services..."
docker compose build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

# Start the services
echo "🚀 Starting services..."
docker compose up -d

if [ $? -eq 0 ]; then
    echo "✅ Services started successfully!"
    echo ""
    echo "🌐 Application should be available at:"
    echo "   - Direct app: http://localhost:3000"
    echo "   - Via nginx: http://localhost"
    echo ""
    echo "🔍 To check service status:"
    echo "   docker compose ps"
    echo ""
    echo "📋 To view logs:"
    echo "   docker compose logs -f"
    echo ""
    echo "🛑 To stop services:"
    echo "   docker compose down"
else
    echo "❌ Failed to start services!"
    exit 1
fi