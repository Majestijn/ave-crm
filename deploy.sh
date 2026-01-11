#!/bin/bash
#------------------------------------------------------------------------------
# AVE CRM - Production Deployment Script
# Used by Laravel Forge or manual deployment
#------------------------------------------------------------------------------

set -e  # Exit on error

echo "🚀 Starting AVE CRM deployment..."
echo "=================================="

# Determine the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}"

# Check if we're in Forge environment
if [ -d "/home/forge" ]; then
    PROJECT_ROOT="/home/forge/ave-crm.nl"
fi

echo "📁 Project root: ${PROJECT_ROOT}"

#------------------------------------------------------------------------------
# Backend Deployment
#------------------------------------------------------------------------------
echo ""
echo "📦 Installing backend dependencies..."
cd "${PROJECT_ROOT}/backend"

composer install --no-dev --optimize-autoloader --no-interaction

echo "⚙️  Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "🗃️  Running database migrations..."
php artisan migrate --force

#------------------------------------------------------------------------------
# Frontend Deployment
#------------------------------------------------------------------------------
echo ""
echo "🎨 Building frontend..."
cd "${PROJECT_ROOT}/frontend"

# Install dependencies
npm ci --silent

# Build production bundle
npm run build

#------------------------------------------------------------------------------
# Copy Frontend to Backend Public
#------------------------------------------------------------------------------
echo ""
echo "📋 Copying frontend build to backend..."

# Remove old build
rm -rf "${PROJECT_ROOT}/backend/public/app"

# Copy new build
cp -r "${PROJECT_ROOT}/frontend/dist" "${PROJECT_ROOT}/backend/public/app"

#------------------------------------------------------------------------------
# Restart Queue Workers
#------------------------------------------------------------------------------
echo ""
echo "🔄 Restarting queue workers..."
cd "${PROJECT_ROOT}/backend"
php artisan queue:restart

#------------------------------------------------------------------------------
# Done
#------------------------------------------------------------------------------
echo ""
echo "=================================="
echo "✅ Deployment completed successfully!"
echo "📅 $(date)"
echo "=================================="
