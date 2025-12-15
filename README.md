# SmartTutor AI

Interactive AI-powered learning app. Upload a photo of a textbook page  AI will create a quiz based on the material and help you work through your mistakes.

**Live Demo:** [smarttutor-ai.pages.dev](https://smarttutor-ai.pages.dev)

## Features

- Upload photos of textbook pages
- Automatic text recognition (OCR) and content analysis
- Quiz generation based on material (20 questions)
- "Mistake Review" mode - AI creates additional questions on topics where you made errors
- Multi-language support (English, Polish, Belarusian)

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Google Gemini API

## Quick Start

### Requirements

- Node.js 18+
- Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))

### Local Development

```bash
# Clone the repository
git clone https://github.com/zebrig/smarttutor-ai.git
cd smarttutor-ai

# Install dependencies
npm install

# Create .env.local from example
cp .env.example .env.local

# Start dev server
npm run dev
```

The app will be available at http://localhost:3000

**Note:** The Gemini API key is entered by the user in the app interface and stored only in the browser's localStorage.

## Deploy to Cloudflare Pages

### Setup

1. Fill in variables in `.env.local`:

```bash
# Gemini model (optional, defaults to gemini-3-pro-preview)
GEMINI_MODEL=gemini-3-pro-preview

# Cloudflare Pages
CLOUDFLARE_API_TOKEN=your_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_PROJECT_NAME=smarttutor-ai
```

2. Get Cloudflare API Token:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
   - Create Token → Edit Cloudflare Workers (template)
   - Or create a custom token with `Cloudflare Pages:Edit` permissions

### Deploy

```bash
# Build and deploy
./deploy.sh
```

To deploy from a zip archive (full code replacement):

```bash
# Place .zip file in the project folder
./deploy-zip.sh
```

## Project Structure

```
├── App.tsx                 # Main component
├── components/
│   ├── ApiKeyModal.tsx     # API key input modal
│   ├── Dashboard.tsx       # Main screen
│   ├── MaterialView.tsx    # Material view
│   ├── SessionView.tsx     # Quiz session
│   └── UploadView.tsx      # Photo upload
├── services/
│   └── geminiService.ts    # Gemini API integration
├── types.ts                # TypeScript types
├── deploy.sh               # Deploy script
└── deploy-zip.sh           # Deploy from zip script
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_MODEL` | Gemini model for generation | No (default: `gemini-3-pro-preview`) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | For deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | For deploy |
| `CLOUDFLARE_PROJECT_NAME` | Pages project name | For deploy |

## License

MIT
