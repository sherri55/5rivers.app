---
name: Two-Model Architecture
description: LM Studio two-model setup — tool-calling model + OCR/vision model
type: architecture
---

# Two-Model Architecture

## Why Two Models
A single 4B tool-calling model is unreliable when processing documents. It hallucinates dates, invents data, grabs cheque totals instead of line items, and asks users to provide tool results. The fix: move all document-processing logic into TypeScript code. The OCR model extracts, code parses + validates + orchestrates tool calls + formats output.

## Models (LM Studio)
- **Tool-calling model:** `google/gemma-4-e2b` — handles free-form conversation ("show me jobs today", "list dispatchers")
- **OCR/Vision model:** `google/gemma-4-e4b` — extracts structured data from document images (tickets, paystubs)

## Environment Variables
```
LLM_PROVIDER=lmstudio
LMSTUDIO_HOST=http://localhost:1234        # tool-calling model
LMSTUDIO_VISION_HOST=http://localhost:1234  # OCR model (can be same host)
LMSTUDIO_VISION_MODEL=<model-name>         # required for OCR to work
```

## Message Flow

```
User sends message (+ optional images)
  │
  ├─ Has images? → Code-driven document pipeline (in llm.ts)
  │   ├─ callOCRModel()          → gemma-4-e4b extracts structured text
  │   ├─ parseOCROutputMulti()   → code parses into typed structs (supports multiple entries)
  │   ├─ processDocuments()      → code resolves entities, validates, builds writes
  │   ├─ Present unified summary → user confirms
  │   └─ Execute writes          → return formatted results
  │
  └─ No images → Tool-calling model (gemma-4-e2b)
      ├─ Simplified system prompt (~15 lines for LM Studio)
      └─ Standard agent loop for free-form queries
```

## System Prompt
- **LM Studio:** Simplified ~15-line prompt (document processing handled by code). Built by `buildSimplifiedPrompt()` in `llm.ts`.
- **Groq/Ollama:** Full ~80-line prompt with workflow instructions. Built by `buildFullPrompt()` in `llm.ts`.

## Supervision Mode
- `SUPERVISION_MODE=true` (default) — any write tool calls require user confirmation before execution
- Two confirmation maps in `llm.ts`:
  - `pendingConfirmations` — for tool-calling model writes (standard agent loop)
  - `pendingDocConfirmations` — for document processor writes (code-driven pipeline)
- User replies "yes"/"no"/"confirm"/"cancel" to proceed or abort
