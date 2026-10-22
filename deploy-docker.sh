#!/bin/bash
# ==============================================================================
# AuraMarket Multi-Vendor Platform — 1-Click Docker Production Deployment
# ==============================================================================

set -e

echo "🚀 Starting AuraMarket Multi-Vendor Platform Deployment..."

# Verify Docker installation
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed. Please install Docker and try again."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed. Please install Docker Compose."
    exit 1
fi

echo "📦 Building and starting multi-container orchestration..."
docker compose up -d --build

echo "⏳ Waiting for containers to become healthy..."
sleep 15

echo ""
echo "================================================================================"
echo "✨ AuraMarket Platform Successfully Deployed!"
echo "================================================================================"
echo "🌐 Customer Storefront & Apps:  http://localhost:80"
echo "⚙️ Backend API & Webhooks:      http://localhost:5000/api"
echo "🏥 System Health Status:        http://localhost:5000/api/health"
echo "📊 Database:                    mongodb://localhost:27017"
echo "⚡ Redis In-Memory Cache:       redis://localhost:6379"
echo "================================================================================"
echo "To view live logs: docker compose logs -f"
echo "To stop platform:  docker compose down"
echo "================================================================================"
