# Snow Transcriber MCP Server

MCP server so **Cursor, Antigravity, Claude Desktop, Grok**, and any MCP-compatible agent can transcribe voiceovers and get exact Veo3 scene counts.

Uses **stdio** transport (local process) → talks to the Whisper engine at `http://localhost:8000`.

## Prerequisites

1. **Whisper engine running:**
   ```bash
   npm run engine:up
   ```
2. **Build the MCP server:**
   ```bash
   cd mcp-server
   npm install
   npm run build
   ```

## Tools

| Tool | Description |
|------|-------------|
| `snow_engine_health` | Check if Whisper engine is online |
| `snow_transcribe_audio` | Transcribe audio → timestamped scenes + `agentJson` |
| `snow_estimate_scene_count` | Quick math: duration ÷ clip length |
| `snow_list_scenes` | Paginate scenes from saved JSON |
| `snow_format_veo3_blocks` | Export `[SCENE XX] [TIMESTAMP] [TYPE]` blocks |
| `snow_save_export` | Save .txt or .json to disk |

## Resource

- `snow://workflow/guide` — Agent workflow markdown for Veo3 pipelines

## Configure your agent

Replace `ABSOLUTE_PATH_TO_REPO` with your Snow Transcriber install path.

### Cursor

Add to `.cursor/mcp.json` (project) or global Cursor MCP settings:

```json
{
  "mcpServers": {
    "snow-transcriber": {
      "command": "node",
      "args": ["D:/SnowDev/Videos/Youtube/CRAVE & CONQUER/Snow-transcriber/mcp-server/dist/index.js"],
      "env": {
        "SNOW_ENGINE_URL": "http://localhost:8000"
      }
    }
  }
}
```

### Claude Desktop

Merge into `%APPDATA%/Claude/claude_desktop_config.json` — see `config/claude-desktop.mcp.json`.

### Antigravity / other MCP clients

Any client that supports **stdio MCP** with a `command` + `args` config works the same way. Point `args` at:

```
<mcp-server>/dist/index.js
```

## Example agent flow

```
1. snow_engine_health()
2. snow_transcribe_audio({
     audio_path: "D:/episodes/ep01-voiceover.mp3",
     mode: "fixed",
     scene_duration: 6,
     save_json_to: "D:/episodes/ep01-scenes.json"
   })
   → sceneCount: 214

3. snow_list_scenes({ json_path: "...", offset: 0, limit: 20 })

4. snow_format_veo3_blocks({
     json_path: "D:/episodes/ep01-scenes.json",
     scene_type: "?",
     save_to: "D:/episodes/ep01-veo3-blocks.txt"
   })
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `SNOW_ENGINE_URL` | `http://localhost:8000` | Whisper engine base URL |
| `TRANSCRIBER_ENGINE_URL` | (fallback) | Same as above |

## Dev

```bash
npm run dev    # tsx, stdio — attach via MCP client
npm run build  # compile to dist/
```