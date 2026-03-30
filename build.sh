#!/bin/bash
set -e

echo "🔨 Building Angular frontend..."
npx ng build --configuration production

echo "📦 Installing server dependencies..."
npm --prefix server install

echo "🔨 Building server backend..."
npm --prefix server run build

echo "✅ Build complete!"
