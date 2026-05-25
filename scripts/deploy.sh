#!/bin/bash
# Deploy script for CSEC Compass
# Usage: bash scripts/deploy.sh

set -e

echo "🚀 CSEC Compass — Deployment Script"
echo ""

# 1. Sync content from content/ to public/content/
echo "📦 Syncing content JSON files..."
cp -r content/* public/content/ 2>/dev/null || true

# 2. Install dependencies
echo "📥 Installing dependencies..."
npm install

# 3. Build production bundle
echo "🔨 Building production bundle..."
npm run build

# 4. Deploy
echo ""
echo "✅ Build complete!"
echo ""
echo "To deploy:"
echo "  Option A: Serve locally — npm run preview -- --host 0.0.0.0"
echo "  Option B: Deploy to Vercel — npx vercel"
echo "  Option C: Deploy to Netlify — npx netlify deploy"
echo "  Option D: Deploy to GitHub Pages — npx gh-pages -d dist"
echo ""
echo "Build output:"
du -sh dist/
echo ""
echo "Live at: http://localhost:4173/"
