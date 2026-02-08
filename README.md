# AI Pipeline Assistant

An intelligent, role-based data pipeline builder that enables users to design, configure, and execute ETL pipelines through an intuitive web interface with AI-powered assistance.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Project](#running-the-project)
- [Project Structure](#project-structure)
- [Features](#features)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

---

## Overview

**AI Pipeline Assistant** is a full-stack web application that lets different user roles (Admin, Engineer, Operator, Viewer) design, deploy, and execute data pipelines through an intuitive web UI backed by the University of Paderborn AI Gateway.

### Key Features

✅ **Visual Pipeline Builder** - No coding required; form-based interface  
✅ **AI-Powered Assistance** - Real-time suggestions using LLMs  
✅ **Role-Based Access Control** - 4 distinct permission levels  
✅ **Smart Execution** - Real execution for Google Sheets, simulated for others  
✅ **Execution History** - Complete audit trail and monitoring  
✅ **Google Sheets Integration** - Native read/write capabilities  

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes, Node.js |
| **AI Integration** | OpenAI-compatible API (University AI Gateway) |
| **Storage** | JSON-based (no database required) |
| **Authentication** | Client-side localStorage (demo mode) |

---

## Quick Start

### 1️⃣ Clone & Install (2 minutes)

```bash
git clone <repository-url>
cd AI-Pipeline-Assistant_DDE
npm install
```

### 2️⃣ Configure Environment (1 minute)

Note: API key present in submission document

```bash
# Copy example env file (if exists)
cp .env.example .env.local  # Optional

# Or create .env.local with these variables:
cat > .env.local << 'EOF'
# AI Gateway Configuration
API_BASE=https://ai-gateway.uni-paderborn.de/v1/
API_KEY= api key mentioned in the submission document
API_CHAT_MODEL=gwdg.llama-3.3-70b-instruct

# Anthropic API (Optional - uses API_KEY if not set)
ANTHROPIC_API_KEY=api key mentioned in the submission document

# Python path for pipeline execution
PYTHON_EXECUTABLE=/usr/bin/python3
EOF
```

### 3️⃣ Run Development Server (1 minute)

```bash
npm run dev
```

**Output:**
```
▲ Next.js 16.1.4
- Local:         http://localhost:3000
- Network:       http://192.168.X.X:3000
✓ Ready in 707ms
```

### 4️⃣ Open Browser

Navigate to **http://localhost:3000** and click any demo account:

| Account | Email | Role |
|---------|-------|------|
| 👨‍💼 Admin | admin@company.com | Full access |
| 👨‍💻 Engineer | engineer@company.com | Create & deploy |
| 🎯 Operator | operator@company.com | Execute only |
| 👁️ Viewer | viewer@company.com | View only |

✅ **You're all set!** No password required for demo accounts.

---

## System Requirements

### Minimum Requirements

```
✓ Node.js: v18.17 or v20 (LTS)
✓ npm: v10 or higher
✓ RAM: 512 MB minimum (2 GB recommended)
✓ Disk Space: 500 MB
✓ Internet: Required for AI Gateway API calls
```

### Optional (for pipeline execution)

```
- Python: v3.8+ (for running generated pipeline code)
- Google Sheets API Credentials (for Google Sheets integration)
```

### Verify Installation

```bash
# Check Node.js version
node --version
# Expected: v18.17.x or v20.x.x

# Check npm version
npm --version
# Expected: v10.x.x or higher
```

---

## Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/your-username/ai-pipeline-assistant.git
cd ai-pipeline-assistant
```

### Step 2: Install Dependencies

```bash
npm install
```

**Expected output:**
```
added 456 packages in 45s
```

### Step 3: Verify Installation

```bash
# Check if all files are present
ls -la src/app src/lib package.json

# Should show:
# - src/app/api/     (API routes)
# - src/app/dashboard/ (Pages)
# - src/lib/         (Libraries)
# - package.json     (Dependencies)
```

---

## Configuration

### Environment Variables

Create a `.env.local` file in the project root with the following variables:

```dotenv
# === AI Gateway Configuration ===
# Endpoint for the AI service
API_BASE=https://ai-gateway.uni-paderborn.de/v1/

# API Key for authentication
API_KEY=api_key

# Model to use for AI operations
API_CHAT_MODEL=gwdg.llama-3.3-70b-instruct

# === Anthropic Configuration (Optional) ===
# If using Anthropic's Claude instead of the gateway
# Get from: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=api_key

# === Python Configuration ===
# Path to Python executable for running generated pipelines
PYTHON_EXECUTABLE=/usr/bin/python3
# macOS example: /usr/local/bin/python3
# Windows example: C:\Python39\python.exe
```

### Using Different AI Providers

#### Option 1: University AI Gateway (Default - Free)
```dotenv
API_BASE=https://ai-gateway.uni-paderborn.de/v1/
API_KEY=api_key
API_CHAT_MODEL=gwdg.llama-3.3-70b-instruct
```

#### Option 2: OpenAI (ChatGPT)
```dotenv
API_BASE=https://api.openai.com/v1/
API_KEY=api_key
API_CHAT_MODEL=gpt-4-turbo-preview
```

#### Option 3: Anthropic (Claude)
```dotenv
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
API_CHAT_MODEL=claude-3-opus-20240229
```

### Verify Configuration

```bash
# Check if .env.local exists and is readable
cat .env.local
# Should output your API configuration

# The app will validate on startup
npm run dev
```

---

## Running the Project

### Development Mode

```bash
npm run dev
```

**Features:**
- Hot reload on file changes
- TypeScript compilation on-the-fly
- Full error messages in console
- Turbopack for fast rebuilds

**Access:**
- Local: http://localhost:3000
- Network: http://YOUR_IP:3000

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

**Note:** Production build requires ~100 MB disk space and is optimized for deployment.

### Run Linter

```bash
npm run lint
```

Checks for code quality issues and TypeScript errors.

---

## Project Structure

```
ai-pipeline-assistant/
│
├── src/
│   ├── app/
│   │   ├── api/                    # Backend API routes
│   │   │   ├── ai/                 # AI assistance endpoints
│   │   │   │   ├── assist/         # Real-time AI suggestions
│   │   │   │   └── generate-pipeline/  # Full pipeline generation
│   │   │   ├── pipelines/          # Pipeline CRUD operations
│   │   │   ├── executions/         # Pipeline execution logs
│   │   │   ├── profile/            # Data profiling
│   │   │   └── sheets/             # Google Sheets integration
│   │   │
│   │   ├── dashboard/              # Main dashboard page
│   │   ├── pipelines/
│   │   │   ├── [id]/               # Pipeline detail page
│   │   │   └── new/                # Create new pipeline
│   │   │
│   │   ├── globals.css             # Global styles
│   │   ├── layout.tsx              # Root layout with auth
│   │   └── page.tsx                # Login page
│   │
│   └── lib/
│       ├── aiClient.ts             # AI API client
│       ├── connectors.ts           # Data source connectors
│       ├── db.ts                   # In-memory storage
│       ├── googleSheets.ts         # Google Sheets API
│       ├── types.ts                # TypeScript interfaces
│       ├── validation.ts           # Pipeline validation
│       └── artifacts.ts            # Generated code management
│
├── data/                           # Data directory
│   ├── pipelines.json              # Persistent pipeline storage
│   ├── executions.json             # Execution history
│   └── audit.json                  # Audit logs
│
├── public/                         # Static assets
│
├── .env.local                      # Environment variables (add yourself)
├── .env.example                    # Example env file
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript configuration
├── next.config.ts                  # Next.js configuration
├── tailwind.config.js              # Tailwind CSS configuration
│
└── README.md                       # This file
```

### Key Files Explained

| File | Purpose |
|------|---------|
| `src/lib/types.ts` | TypeScript interfaces for Pipeline, Step, Execution |
| `src/lib/db.ts` | In-memory storage with JSON file persistence |
| `src/lib/aiClient.ts` | OpenAI client configured for the gateway |
| `src/app/api/pipelines/route.ts` | Create/list pipelines endpoint |
| `src/app/api/pipelines/[id]/execute/route.ts` | Execute pipeline logic |
| `src/app/pipelines/[id]/page.tsx` | Pipeline detail page with builder |
| `.env.local` | Configuration (you must create this) |

---

## Features

### 1. Role-Based Access Control

Four distinct user roles with granular permissions:

| Feature | Admin | Engineer | Operator | Viewer |
|---------|-------|----------|----------|--------|
| Create Pipelines | ✅ | ✅ | ❌ | ❌ |
| Edit Pipelines | ✅ | ✅ | ❌ | ❌ |
| Delete Pipelines | ✅ | ✅ | ❌ | ❌ |
| Execute Pipelines | ✅ | ✅ | ✅ | ❌ |
| View Pipelines | ✅ | ✅ | ✅ | ✅ |
| View Execution History | ✅ | ✅ | ✅ | ✅ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |

### 2. Pipeline Builder

**Three-step pipeline structure:**
1. **Source** - Where data comes from (Google Sheets, MySQL, etc.)
2. **Transform** - Data processing and transformations
3. **Destination** - Where results are saved

**Features:**
- Form-based configuration (no YAML/code required)
- Real-time validation
- Step management (add/remove/edit)
- Type-specific configuration forms

### 3. AI-Powered Assistance

Two ways to use AI:

#### Real-time Suggestions
- Type requirements in the right panel
- AI analyzes current pipeline + requirements
- Get instant suggestions without leaving the builder

#### Full Pipeline Generation
- Describe complete pipeline requirements
- AI generates:
  - `config.yaml` - Pipeline configuration
  - `pipeline.py` - Executable Python code
  - `EXECUTION_STRATEGY.md` - Documentation

### 4. Smart Pipeline Execution

**Execution Logic:**
- **Google Sheets → Google Sheets**: Executes real data operations
- **MySQL/PostgreSQL**: Shows simulated execution (no error)
- **Mixed sources**: Simulated execution with clear messaging

**Status Tracking:**
- draft → running → succeeded/failed
- Real-time logs with emoji indicators
- Performance metrics (rows processed, time taken)

### 5. Execution Monitoring

**Track pipeline runs with:**
- Execution history per pipeline
- Detailed step-by-step logs
- Performance metrics
- Error messages with context
- Complete audit trail

---

## API Documentation

### Authentication

Demo authentication is client-side (localStorage):

```typescript
// Login
localStorage.setItem('ai-pipeline-user', JSON.stringify({
  name: 'Admin User',
  email: 'admin@company.com',
  role: 'admin'
}));

// Logout
localStorage.removeItem('ai-pipeline-user');
```

### API Endpoints

#### Pipelines

```bash
# List all pipelines
GET /api/pipelines

# Get pipeline by ID
GET /api/pipelines/:id

# Create new pipeline
POST /api/pipelines
Body: { name, description, steps }

# Update pipeline
PUT /api/pipelines/:id
Body: { name, description, steps, ... }

# Delete pipeline
DELETE /api/pipelines/:id
```

#### Executions

```bash
# List all executions
GET /api/executions

# Execute a pipeline
POST /api/pipelines/:id/execute
```

#### AI Assistance

```bash
# Get real-time suggestions
POST /api/ai/assist
Body: { prompt, pipeline }

# Generate complete pipeline
POST /api/ai/generate-pipeline
Body: { instructions, pipelineName }
```

---

## Troubleshooting

### Installation Issues

**Error: `npm ERR! code EACCES`**
```bash
# Fix: Use npm cache clean
npm cache clean --force
npm install
```

**Error: `Module not found`**
```bash
# Fix: Reinstall node_modules
rm -rf node_modules package-lock.json
npm install
```

### Runtime Issues

**Error: `API key not found`**
```bash
# Check .env.local exists
cat .env.local

# Should contain:
API_KEY=sk-...
API_BASE=https://...
```

**Error: `Port 3000 already in use`**
```bash
# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

**Error: `Failed to fetch from AI Gateway`**
```bash
# Check network connectivity
curl https://ai-gateway.uni-paderborn.de/v1/health

# Verify API key format
echo $API_KEY
# Should start with "sk-"
```

### Performance Issues

**Application is slow on first load:**
- Normal! Next.js compiles TypeScript on first run
- First load: 30-60 seconds
- Subsequent loads: 2-5 seconds

**AI responses are slow:**
- University AI Gateway may have high latency
- Typical response time: 10-30 seconds
- This is normal for large LLMs

---

## Development

### Project Setup for Contributors

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/ai-pipeline-assistant.git
   cd ai-pipeline-assistant
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Make your changes**
   - Write TypeScript code with proper types
   - Follow existing code style
   - Add comments for complex logic

7. **Test your changes**
   ```bash
   npm run lint
   npm run dev
   # Test in browser at http://localhost:3000
   ```

8. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: description of your feature"
   git push origin feature/your-feature-name
   ```

9. **Create a Pull Request**
   - Describe your changes clearly
   - Reference any related issues

### Code Style

This project uses:
- **TypeScript** for type safety
- **ESLint** for code quality
- **Tailwind CSS** for styling
- **React Hooks** for state management

### File Naming Conventions

- **Components**: `PascalCase` (e.g., `PipelineBuilder.tsx`)
- **Utilities**: `camelCase` (e.g., `validatePipeline.ts`)
- **API routes**: `route.ts` in `[endpoint]/` folders
- **Types**: `types.ts` or `[name].types.ts`

---

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel
```

### Deploy to Other Platforms

The application can be deployed to any Node.js hosting:
- Heroku
- AWS Lambda
- Google Cloud Run
- Digital Ocean
- Azure App Service

**Key requirement:** Set `NODE_ENV=production` and configure `.env` variables.

---

## License

MIT License - See LICENSE file for details

---

## Support

For issues and questions:

1. **Check Troubleshooting** section above
2. **Review error messages** in browser console (F12)
3. **Check server logs** in terminal running `npm run dev`
4. **Open an issue** on GitHub with:
   - Error message
   - Steps to reproduce
   - Environment info (Node version, OS)

---

## Acknowledgments

- **Framework**: Next.js 15 (Vercel)
- **UI**: Tailwind CSS + React
- **AI**: University of Paderborn AI Gateway
- **Icons**: Heroicons
- **Fonts**: Geist by Vercel

---

**Happy coding!** 🚀

Questions? Open an issue on GitHub or check the documentation files included in the repository.
		- Calls `client.chat.completions.create` on the AI
Gateway
		- Returns a concise text suggestion that is shown next to the builder

### API Surface

- `GET /api/pipelines`
	- Returns all pipelines (sorted by `updatedAt`)

- `POST /api/pipelines`
	- Creates a new pipeline with basic metadata and an empty steps list
	- Body fields: `name`, `description`, `ownerEmail`, `trigger`, `steps`

- `GET /api/pipelines/:id`
	- Returns a single pipeline

- `PUT /api/pipelines/:id`
	- Updates an existing pipeline (name, description, steps, etc.)

- `DELETE /api/pipelines/:id`
	- Deletes a pipeline and its executions

- `POST /api/pipelines/:id/execute`
	- Simulates a pipeline run and records an execution with logs

- `GET /api/executions?pipelineId=...`
	- Returns execution history (optionally filtered by pipeline)

- `POST /api/ai/assist`
	- Calls the AI
Gateway using the OpenAI client and returns a suggestion text

---

## Frontend Flows

### 1. Sign
In (Figma Login Screen)

- Route: `/`
- File: `src/app/page.tsx`
- Features:
	- Email + password form (password is not validated; demo only)
	- Demo accounts you can click to quick
login:
		- `admin@company.com` (Admin)
		- `engineer@company.com` (Engineer)
		- `operator@company.com` (Operator)
		- `viewer@company.com` (Viewer)
	- Selected user is persisted in `localStorage` under `ai-pipeline-user`
	- Navigates to `/dashboard` after login

### 2. Dashboard

- Route: `/dashboard`
- File: `src/app/dashboard/page.tsx`
- Features:
	- Shows the current user and role
	- Lists pipelines from `/api/pipelines`
	- "New Pipeline" button (Admin + Engineer only) linking to `/pipelines/new`

### 3. Create Pipeline

- Route: `/pipelines/new`
- File: `src/app/pipelines/new/page.tsx`
- Features:
	- Form with `name` and `description`
	- On submit, calls `POST /api/pipelines` and redirects to the pipeline builder

### 4. Pipeline Builder + AI Assistant

- Route: `/pipelines/:id`
- File: `src/app/pipelines/[id]/page.tsx`
- Features:
	- Left side: pipeline metadata + step list
		- Edit name and description (Admin/Engineer)
		- Add steps of type `source`, `transform`, `destination`
		- For each step: edit name and description
		- "Save" button calls `PUT /api/pipelines/:id`
		- "Run Pipeline" button (Admin/Engineer/Operator) calls `POST /api/pipelines/:id/execute`
	- Right side: AI panel
		- Textarea for user prompt (e.g. "Ingest CSV from S3 and load into PostgreSQL")
		- Sends `{ prompt, pipeline }` to `/api/ai/assist`
		- Renders the AI response in a dark card next to the builder

> Note: Role checks are currently enforced in the UI. For a production system you would move that to a server
side auth layer instead of relying on localStorage.

---

## AI
Gateway Configuration

The project expects an OpenAI
compatible endpoint as described in the AI
Gateway documentation.

1. Create a `.env.local` file in the project root (`ai-pipeline-assistant/.env.local`) with:

```bash
API_BASE=https://ai-gateway.uni-paderborn.de/v1/
API_KEY=sk-xxxxxxxxxxxxxxxx
API_CHAT_MODEL=gwdg.llama-3.3-70b-instruct
```

2. Make sure the key you configured from the university works with the `/v1/models` and `/v1/chat/completions` or `/v1/responses` endpoints as described in the AI
Gateway help page.

3. The backend AI route (`/api/ai/assist`) uses these environment variables via `src/lib/aiClient.ts`.

---

## Running the System Locally

1. Install dependencies

```bash
cd ai-pipeline-assistant
npm install
```

2. Configure the AI
Gateway in `.env.local` as described above.

3. Start the dev server

```bash
npm run dev
```

4. Open `http://localhost:3000` and:
	 - Click a demo account on the right or
	 - Enter a demo email in the sign
in form and any password

---

## Limitations & Possible Extensions

- **In
memory storage only**
	- Pipelines and executions are reset when the server restarts.
	- For a more realistic prototype, you can add a database (e.g. SQLite + Prisma).

- **Simple auth**
	- Uses client
side localStorage and only UI
level role enforcement.
	- Can be replaced with a real auth provider (NextAuth, Auth0, university SSO, etc.).

- **AI suggestions only**
	- The AI currently returns textual suggestions; it does not directly mutate the pipeline.
	- You can extend it to return structured JSON for steps and programmatically update the builder.

This README summarizes the architecture and main flows suitable for the Milestone 2 hand
in and for explaining how the approved prototype was implemented end
to
end.
