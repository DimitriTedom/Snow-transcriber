# Snow Transcriber MCP Setup

Connect **Grok, Antigravity, VS Code, Cursor, Claude Desktop, Gemini CLI**, and any stdio MCP client to Snow Transcriber.

## Prerequisites

1. **Whisper engine running** (port `8000`):

   ```bash
   cd Snow-transcriber
   npm run engine:up
   ```

2. **MCP server built**:

   ```bash
   npm run mcp:install
   npm run mcp:build
   ```

3. Replace `ABSOLUTE_PATH_TO_REPO` in the templates below with your install path, e.g.:

   ```
   D:/SnowDev/Videos/Youtube/CRAVE & CONQUER/Snow-transcriber
   ```

   Use forward slashes on Windows — paths with `&` break npm `.bin` shims; the MCP server uses `node` directly and is unaffected.

## Tools exposed

| Tool | Description |
|------|-------------|
| `snow_engine_health` | Check Whisper engine status |
| `snow_transcribe_audio` | Transcribe audio → timestamped scenes + `agentJson` |
| `snow_estimate_scene_count` | Quick math: duration ÷ clip length |
| `snow_list_scenes` | Paginate scenes from saved JSON |
| `snow_format_veo3_blocks` | Export `[SCENE XX] [TIMESTAMP] [TYPE]` blocks |
| `snow_save_export` | Save `.txt` or `.json` to disk |

**Resource:** `snow://workflow/guide` — agent workflow for Veo3 pipelines.

---

## Grok

**Config file:** `~/.grok/config.toml` (user) or `.grok/config.toml` (project)

Copy the snippet from `config/grok-config.toml`, or run:

```bash
grok mcp add snow-transcriber -e SNOW_ENGINE_URL=http://localhost:8000 -- node ABSOLUTE_PATH_TO_REPO/mcp-server/dist/index.js
```

Verify:

```bash
grok mcp list
grok mcp doctor snow-transcriber
```

---

## Antigravity IDE & Gemini CLI

Antigravity shares MCP config across IDE and CLI via:

```
~/.gemini/config/mcp_config.json
```

Merge the entry from `config/antigravity.mcp.json`:

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

Restart Antigravity IDE or Antigravity CLI after editing. Ask the agent: *"What MCP servers do we have?"* to confirm.

**Project-scoped:** some Antigravity versions also read workspace `.gemini/config/mcp_config.json` — copy the same `mcpServers` block there if you want per-repo config.

---

## VS Code

**Workspace config:** `.vscode/mcp.json` is preconfigured in this repo (uses `${workspaceFolder}`).

**User config:** run **MCP: Open User Configuration** and paste from `config/vscode.mcp.json`.

```json
{
  "servers": {
    "snow-transcriber": {
      "type": "stdio",
      "command": "node",
      "args": ["D:/SnowDev/Videos/Youtube/CRAVE & CONQUER/Snow-transcriber/mcp-server/dist/index.js"],
      "env": {
        "SNOW_ENGINE_URL": "http://localhost:8000"
      }
    }
  }
}
```

Trust and start the server when prompted. Use **MCP: List Servers** → **Show Output** if tools do not appear.

---

## Cursor

**Project config:** `.cursor/mcp.json` is preconfigured (relative path to `mcp-server/dist/index.js`).

Enable MCP in Cursor settings. Ensure `npm run engine:up` is running.

---

## Claude Desktop

Merge into `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

See `config/claude-desktop.mcp.json`.

Restart Claude Desktop after saving.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SNOW_ENGINE_URL` | `http://localhost:8000` | Whisper engine base URL |
| `TRANSCRIBER_ENGINE_URL` | (fallback) | Same as above |

---

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

3. snow_list_scenes({ json_path: "D:/episodes/ep01-scenes.json", offset: 0, limit: 20 })

4. snow_format_veo3_blocks({
     json_path: "D:/episodes/ep01-scenes.json",
     scene_type: "?",
     save_to: "D:/episodes/ep01-veo3-blocks.txt"
   })
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Tools not listed | Run `npm run mcp:build`; confirm `mcp-server/dist/index.js` exists |
| Engine offline | `npm run engine:up` then `curl http://localhost:8000/health` |
| Transcription slow on CPU | Check system metrics in UI; consider `WHISPER_MODEL=small` or GPU setup |
| Windows `&` in path breaks npm scripts | MCP uses `node` directly — OK. For Next.js use `node scripts/run-next.mjs` |
| VS Code server won't start | Check MCP output log; verify `node` is on PATH |