#!/bin/bash
set -e

cd "$(dirname "$0")" || exit

echo "🔨 Building Angular frontend..."
node ./node_modules/@angular/cli/bin/ng build --configuration production

echo "📦 Installing server dependencies..."
npm --prefix server install

echo "🔨 Building server backend..."
npm --prefix server run build

echo "✅ Build complete!"
