import type { AgentJson, TranscriberScene } from "./types.js";

export function formatTimestampRange(start: number, end: number): string {
  const format = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = (seconds % 60).toFixed(1);
    return `${minutes.toString().padStart(2, "0")}:${remainder.padStart(4, "0")}`;
  };
  return `${format(start)} – ${format(end)}`;
}

export function formatSceneBlocks(scenes: TranscriberScene[], sceneType = "?"): string {
  return scenes
    .map((scene) =>
      [
        "=".repeat(57),
        `[SCENE ${String(scene.id).padStart(2, "0")}] [${scene.timestampRange}] [${sceneType}]`,
        "",
        scene.text,
        "=".repeat(57),
      ].join("\n"),
    )
    .join("\n\n");
}

export function estimateSceneCount(totalDurationSeconds: number, sceneDurationSeconds: number): number {
  if (sceneDurationSeconds <= 0) return 0;
  return Math.ceil(totalDurationSeconds / sceneDurationSeconds);
}

export function paginateScenes<T extends { id: number }>(
  scenes: T[],
  offset: number,
  limit: number,
): { scenes: T[]; total: number; offset: number; limit: number; hasMore: boolean } {
  const slice = scenes.slice(offset, offset + limit);
  return {
    scenes: slice,
    total: scenes.length,
    offset,
    limit,
    hasMore: offset + limit < scenes.length,
  };
}

export function summarizeTranscription(result: {
  sceneCount: number;
  totalDuration: number;
  sceneMode: string;
  sceneDuration: number | null;
  detectedLanguage: string;
  savedTo?: string;
}): string {
  const durationMin = Math.floor(result.totalDuration / 60);
  const durationSec = (result.totalDuration % 60).toFixed(1);
  return [
    `# Snow Transcriber result`,
    `- **Scenes:** ${result.sceneCount}`,
    `- **Duration:** ${durationMin}m ${durationSec}s`,
    `- **Mode:** ${result.sceneMode}${result.sceneDuration ? ` (${result.sceneDuration}s clips)` : ""}`,
    `- **Language:** ${result.detectedLanguage}`,
    result.savedTo ? `- **Full JSON saved to:** ${result.savedTo}` : "",
    ``,
    `Use \`snow_list_scenes\` to paginate scenes, or \`snow_format_veo3_blocks\` to export prompt-ready blocks.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function agentJsonFromFilePayload(payload: AgentJson): TranscriberScene[] {
  return payload.scenes.map((scene) => ({
    id: scene.id,
    start: scene.start,
    end: scene.end,
    text: scene.text,
    wordCount: scene.wordCount,
    timestampRange: scene.timestampRange,
  }));
}