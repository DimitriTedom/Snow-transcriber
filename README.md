# Snow Transcriber

Local audio-to-timestamp scene generator for CRAVE & CONQUER and other AI video workflows.

Upload a voiceover, get exact scene counts with timestamps, and export:

- `.txt` blocks matching `[SCENE XX] [TIMESTAMP RANGE] [TYPE]`
- `.json` for your AI prompt agent

Powered by **Next.js** (UI) + **faster-whisper** (local transcription engine in Docker).

## Quick start

> **Windows note:** If the project path contains `&` (e.g. `CRAVE & CONQUER`), Windows cmd breaks npm `.bin` shims. This repo uses `scripts/run-next.mjs` so `npm run dev` and `npm run dev:all` work from the real path. For `npm install` issues, use a subst drive or clone to a path without `&`.

### 1) Install frontend deps

```bash
npm install
```

### 2) Configure env

```bash
cp .env.example .env
```

For local transcription, this is enough:

```env
TRANSCRIBER_ENGINE_URL=http://localhost:8000
```

Supabase/Prisma vars are optional unless you use auth/dashboard features from the template.

### 3) Start the Whisper engine (Docker)

```bash
npm run engine:up
```

First build downloads the Whisper model and can take a few minutes.

### 4) Run the app

```bash
npm run dev
```

Open http://localhost:3000/transcriber

Or run both in one command:

```bash
npm run dev:all
```

## Scene modes

| Mode | Use case |
|------|----------|
| **Fixed duration** | Split every N seconds (default 6s) for Veo3 clip math |
| **Natural pauses** | Cut on voiceover pauses (FoziScribe-style rhythm) |

## Architecture

```
Browser → Next.js /api/transcribe → Python engine :8000 → faster-whisper
```

Docker is used for the Python engine only (FFmpeg + Whisper dependencies). The Next.js app runs locally with `npm run dev`.

## Engine environment

| Variable | Default | Description |
|----------|---------|-------------|
| `WHISPER_MODEL` | `base` | `tiny`, `base`, `small`, `medium`, `large-v3` |
| `WHISPER_DEVICE` | `cpu` | `cpu` or `cuda` (if GPU available in Docker) |
| `WHISPER_COMPUTE_TYPE` | `int8` | `int8`, `float16`, `float32` |
| `MAX_UPLOAD_MB` | `100` | Upload size limit |

## AMD GPU / low VRAM (e.g. 2GB)

Snow Transcriber's Docker engine uses **faster-whisper + CTranslate2**, which in this setup runs on **CPU** (`WHISPER_DEVICE=cpu`, `WHISPER_COMPUTE_TYPE=int8`).

| Your hardware | Recommendation |
|---------------|----------------|
| **AMD 2GB VRAM** | Stay on CPU. VRAM is too small for Whisper `base`+ on GPU anyway. |
| **Faster runs** | Set `WHISPER_MODEL=tiny` in `.env` — less accurate, much quicker. |
| **NVIDIA + CUDA** | Set `WHISPER_DEVICE=cuda` and pass GPU into Docker (advanced). |
| **AMD on Windows** | Native DirectML is possible but not wired yet; Docker won't use your AMD GPU today. |

## MCP server (for AI agents)

Snow Transcriber includes an MCP server so **Cursor, Antigravity, Claude Desktop, Grok**, and other MCP clients can transcribe audio and get exact scene counts programmatically.

```bash
npm run mcp:install
npm run mcp:build
```

**Tools:** `snow_engine_health`, `snow_transcribe_audio`, `snow_list_scenes`, `snow_format_veo3_blocks`, `snow_estimate_scene_count`, `snow_save_export`

See [mcp-server/MCP_SETUP.md](mcp-server/MCP_SETUP.md) for Grok, Antigravity, VS Code, Cursor, and Claude Desktop setup.

## System metrics

The transcriber UI shows live **CPU, RAM, and disk** usage from the Whisper engine (polls every ~2.5s). During transcription, higher CPU usually means Whisper is working at full speed — useful for understanding wait time vs hardware.

## Useful commands

```bash
npm run engine:up      # build + start engine
npm run engine:down    # stop engine
npm run engine:logs    # tail engine logs
npm run dev            # Next.js dev server
npm run mcp:build      # build MCP server for agents
```

## Production docker compose

```bash
docker compose up --build
```

Runs both `engine` and `app` services.

## Output example

```
=========================================================
[SCENE 01] [00:00.0 – 00:06.0] [?]

The Portuguese fleet first reached the coast of Brazil...
=========================================================
```

JSON export includes `sceneCount`, per-scene `start`/`end`/`duration`, and `text` for agent consumption.