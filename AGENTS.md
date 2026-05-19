# 5Rivers App — Codex working context

## Stack
Monorepo, orchestrated via `concurrently` from the root `package.json`:
- **5rivers.server** — Backend (Node.js + Express + SQL Server + Neo4j migration in progress)
- **5rivers.app.ui** — Frontend (Vite + React + TypeScript)
- **5rivers.app.agent** — LLM agent (LM Studio integration + Telegram interface)
- **5rivers.app.mcp** — Custom MCP server exposing fleet-app tools

## Dev servers
- Server: `npm run dev` (port 4000)
- UI: `cd 5rivers.app.ui && npm run dev` (port 5174, Vite)
- Both at once: root `npm run dev`

## Project memory
The `memory/` directory holds living architectural knowledge. **Always check `memory/MEMORY.md`** before answering questions about:
- stack overview
- two-model LM Studio architecture
- OCR document pipeline (tickets, paystubs, multi-entry)
- timezone handling (UTC storage, Eastern display)
- rate-pending job feature
- past architectural decisions

When you learn something new about my preferences, project decisions, or workflows that will outlive this session, run `/memory-update`.

## Conventions
- **Timezones:** UTC storage, Eastern display — see `memory/timezone_architecture.md`
- **Rate-pending jobs** have nullable rates with backfill logic — see `memory/rate_pending.md`
- **LM Studio:** two models — tool-calling primary + OCR/vision secondary — see `memory/two_model_architecture.md`
- **OCR pipeline** is code-driven, not LLM-driven for document classification — see `memory/ocr_document_pipeline.md`

## Reminders
- If `graphify-out/graph.json` exists in the cwd, read `graphify-out/GRAPH_REPORT.md` before doing grep-heavy exploration. (Replaces the disabled PreToolUse hook from the Claude Code setup.)
- **SQL Server:** LocalDB (`(localdb)\MSSQLLocalDB`) for dev, `192.168.68.63\MSSQL2025` for remote. Credentials live in `.env` files — never inline them in shell commands and never commit them.
- **Test auth (dev only):** `admin@5rivers.app` / `Demo123!`

## Cloud Codex notes
Cloud Codex can read and edit code but **cannot reach the local SQL Server or LM Studio**. Use Cloud for code review, refactors, and planning. Save integration testing for the local CLI.

## Available slash commands
`/explore` `/plan` `/architect` `/review` `/debug` `/cache-audit` `/memory-update`
