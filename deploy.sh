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

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

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
