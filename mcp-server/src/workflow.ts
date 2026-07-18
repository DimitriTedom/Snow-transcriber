export const SNOW_TRANSCRIBER_WORKFLOW = `# Snow Transcriber — Agent Workflow

Use Snow Transcriber to convert TTS voiceover into exact scene counts for AI video prompt generation.

## Prerequisites
1. Whisper engine running: \`npm run engine:up\` (Docker, port 8000)
2. MCP server configured in your agent (stdio)

## Recommended pipeline

### Step 1 — Health check
Call \`snow_engine_health\`. If offline, tell the user to run \`npm run engine:up\`.

### Step 2 — Transcribe voiceover
Call \`snow_transcribe_audio\` with:
- \`audio_path\`: absolute path to MP3/WAV from TTS
- \`mode\`: \`fixed\` for fixed-interval clip splits
- \`scene_duration\`: \`6\` (seconds per clip)
- \`save_json_to\`: optional path to persist full result (recommended for long episodes)

### Step 3 — Review scene count
The tool returns \`sceneCount\` and \`totalDuration\`. This is the exact number of video prompts to generate.

### Step 4 — Paginate scenes (long episodes)
For 100+ scenes, use \`snow_list_scenes\` with \`json_path\` + \`offset\` + \`limit\` instead of loading all scenes at once.

### Step 5 — Export scene blocks
Call \`snow_format_veo3_blocks\` to produce:
\`\`\`
[SCENE 01] [00:00.0 – 00:06.0] [C]
<narration text for this clip>
\`\`\`

### Step 6 — Generate AI prompts
Feed scene blocks into your prompt writer. One detailed prompt per scene.

## Tool reference

| Tool | When to use |
|------|-------------|
| \`snow_engine_health\` | Before transcribing |
| \`snow_transcribe_audio\` | Main transcription + scene split |
| \`snow_estimate_scene_count\` | Quick math without running Whisper |
| \`snow_list_scenes\` | Paginate saved JSON |
| \`snow_format_veo3_blocks\` | Export standard scene template |
| \`snow_save_export\` | Write .txt or .json to disk |

## Environment variables
- \`SNOW_ENGINE_URL\` or \`TRANSCRIBER_ENGINE_URL\` — default \`http://localhost:8000\`
`;