# 5Rivers AI Agent

AI-powered assistant for the 5Rivers fleet operations app. Supports Telegram, WhatsApp, web chat, and a CLI test mode — all powered by a locally hosted LLM via Ollama.

## Architecture

```
Telegram / WhatsApp / Web Chat / CLI
            │
      ┌─────▼──────┐
      │ Agent Core  │  ← conversation + tool loop
      └─────┬──────┘
            │
   ┌────────▼────────┐
   │  Tool Layer     │  ← shared with MCP server
   │  REST → :4000   │
   └────────┬────────┘
            │
   ┌────────▼────────┐
   │  Ollama (LLM)   │  ← separate machine
   └─────────────────┘
```

## Prerequisites

1. **5Rivers backend** running on port 4000
2. **Ollama** installed on your LLM machine
3. **Node.js** >= 18

## Setup

### 1. Install Ollama (on your LLM machine)

Download from https://ollama.ai and install.

```bash
# Pull a model with tool-use support
ollama pull llama3.1

# Start Ollama (if not running as a service)
ollama serve

# To allow remote access, set:
OLLAMA_HOST=0.0.0.0:11434
```

**Recommended models for tool-use:**
- `llama3.1` (8B) — minimum recommended, good tool-use support
- `llama3.1:70b` — better accuracy, needs more VRAM
- `qwen2.5` — good alternative with strong tool-use
- `mistral` — lighter option

### 2. Install dependencies

```bash
cd 5rivers.app.agent
npm install
```

### 3. Build the MCP server (required — agent imports from it)

```bash
cd ../5rivers.app.mcp
npm install
npm run build
```

### 4. Build the agent

```bash
cd ../5rivers.app.agent
npm run build
```

### 5. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

**Required variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `OLLAMA_HOST` | URL of your Ollama instance | `http://192.168.1.100:11434` |
| `OLLAMA_MODEL` | Model to use | `llama3.1` |
| `FIVE_RIVERS_API_URL` | Backend API URL | `http://localhost:4000/api` |
| `FIVE_RIVERS_TOKEN` | JWT token for CLI mode | `eyJhbG...` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | `123456:ABC...` |

### 6. Get a JWT token

Log into the 5Rivers web app, then extract your token from browser DevTools:
```
localStorage.getItem('token')
```

## Running

### CLI mode (for testing)

```bash
FIVE_RIVERS_TOKEN=<your-jwt> npm run cli
```

Type messages and see the agent respond. Good for testing before setting up messaging bots.

### Telegram bot

1. **Create a bot:** Message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot` → follow prompts → get token
2. **Set token:** Add `TELEGRAM_BOT_TOKEN=<token>` to `.env`
3. **Run:**
   ```bash
   npm run telegram
   ```
4. **Register in chat:** Send `/register <your-jwt-token>` to the bot
5. **Start chatting:** Send messages like "show today's jobs" or paste job entries

### WhatsApp bot

1. **Run:**
   ```bash
   npm run whatsapp
   ```
2. **Scan QR code** with your WhatsApp phone (like WhatsApp Web)
3. **Register in chat:** Send `!register <your-jwt-token>` to the bot
4. **Start chatting:** Same as Telegram but commands use `!` prefix

### Web chat widget

The chat widget is built into the 5Rivers web app (bottom-right corner). It uses the authenticated user's session — no separate registration needed.

**Backend setup:** The agent route (`/api/agent/chat`) uses a dynamic import to load the agent. Make sure the agent package is built before starting the server.

## Usage examples

### Structured commands
- "Show me all jobs for today"
- "List drivers"
- "Add expense $500 truck maintenance today"
- "Create a new job type hourly $85/hr for company ABC"

### Casual / unstructured input (primary use case)
```
28th November
Wrooms dispatching
Birnam to St Thomas
7am to 4pm
MH 6:30am to 4:30pm
```

The agent will parse this, match entities (company, driver by initials), confirm the details, and create the job.

### Multi-job entries
```
2 jobs friday

Wrooms - birnam to st thomas - 7am-4pm - MH
Acme - ajax to whitby - 8am-3pm - SK
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Can't reach 5Rivers server" | Ensure backend is running on port 4000 |
| "Session expired" | Re-register with a fresh JWT token |
| Ollama connection refused | Check `OLLAMA_HOST` is correct and Ollama is running |
| Tool calls fail | Check backend logs for errors |
| Slow responses | Try a smaller model or ensure GPU acceleration is enabled |
