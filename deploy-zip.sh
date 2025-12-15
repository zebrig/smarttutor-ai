#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Load env
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Check required vars
if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo "Error: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set in .env.local"
    exit 1
fi

PROJECT_NAME="${CLOUDFLARE_PROJECT_NAME:-smarttutor-ai}"

# Find the only zip file
ZIP_FILE=$(find . -maxdepth 1 -name "*.zip" -type f | head -1)

if [ -z "$ZIP_FILE" ]; then
    echo "Error: No zip file found in current directory"
    exit 1
fi

ZIP_FILE=$(basename "$ZIP_FILE")
echo "Found zip file: $ZIP_FILE"

# Remove everything except: scripts, zip file, node_modules, .env.local, .git
echo "Cleaning up old files..."
for item in *; do
    if [ "$item" != "deploy.sh" ] && \
       [ "$item" != "deploy-zip.sh" ] && \
       [ "$item" != "$ZIP_FILE" ] && \
       [ "$item" != "node_modules" ]; then
        rm -rf "$item"
    fi
done

# Also clean hidden files except .env.local and .git
for item in .*; do
    if [ "$item" != "." ] && \
       [ "$item" != ".." ] && \
       [ "$item" != ".env.local" ] && \
       [ "$item" != ".git" ] && \
       [ "$item" != ".gitignore" ]; then
        rm -rf "$item"
    fi
done

# Unzip
echo "Extracting $ZIP_FILE..."
unzip -o "$ZIP_FILE"

# Install dependencies
echo "Installing dependencies..."
npm install

# Build
echo "Building project..."
npm run build

# Deploy to production branch
echo "Deploying to Cloudflare Pages (production)..."
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" \
npx wrangler pages deploy dist --project-name="$PROJECT_NAME" --branch=main --commit-dirty=true

echo ""
echo "Done! Project deployed to https://${PROJECT_NAME}.pages.dev"
