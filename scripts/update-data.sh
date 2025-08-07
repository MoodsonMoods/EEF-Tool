#!/bin/bash

# EEF Tool Data Update Script
# This script updates all data and rebuilds the application

set -e  # Exit on any error

echo "🔄 Starting EEF Tool data update..."
echo "📅 $(date)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Step 1: Install dependencies (if needed)
echo "📦 Installing dependencies..."
npm install

# Step 2: Run data ingestion
echo "🌐 Fetching fresh data from ESPN..."
npm run ingest

# Step 3: Normalize data
echo "🔧 Processing and normalizing data..."
npm run normalize

# Step 4: Generate types
echo "📝 Generating TypeScript types..."
npm run generate-types

# Step 5: Build the application
echo "🏗️ Building application..."
npm run build

# Step 6: Show update summary
echo ""
echo "✅ Data update completed successfully!"
echo "📊 Summary:"
echo "   - Data ingested: $(date)"
echo "   - Build completed: $(date)"
echo "   - Ready for deployment"
echo ""

# Optional: Deploy if Vercel CLI is available
if command -v vercel &> /dev/null; then
    echo "🚀 Deploying to Vercel..."
    vercel --prod
else
    echo "💡 To deploy, run: npm run deploy"
fi

echo "🎉 Update complete! Your EEF Tool is ready with fresh data." 