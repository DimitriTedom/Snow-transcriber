#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { checkEngineHealth, getEngineUrl, transcribeAudio } from "./client.js";
import {
  agentJsonFromFilePayload,
  estimateSceneCount,
  formatSceneBlocks,
  paginateScenes,
  summarizeTranscription,
} from "./format.js";
import type { AgentJson, TranscriptionResult } from "./types.js";
import { SNOW_TRANSCRIBER_WORKFLOW } from "./workflow.js";

function textResult(text: string, structured?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text }],
    ...(structured ? { structuredContent: structured } : {}),
  };
}

function resolvePath(inputPath: string): string {
  return resolve(inputPath);
}

async function loadAgentJson(jsonPath: string): Promise<AgentJson> {
  const raw = await readFile(resolvePath(jsonPath), "utf8");
  const payload = JSON.parse(raw) as AgentJson | { agentJson: AgentJson };
  if ("agentJson" in payload && payload.agentJson) {
    return payload.agentJson;
  }
  return payload as AgentJson;
}

const server = new McpServer({
  name: "snow-transcriber-mcp-server",
  version: "0.1.0",
});

server.registerResource(
  "workflow-guide",
  "snow://workflow/guide",
  {
    title: "Snow Transcriber Agent Workflow",
    description: "Step-by-step guide for AI agents using Snow Transcriber in a Veo3 video pipeline",
    mimeType: "text/markdown",
  },
  async () => ({
    contents: [
      {
        uri: "snow://workflow/guide",
        mimeType: "text/markdown",
        text: SNOW_TRANSCRIBER_WORKFLOW,
      },
    ],
  }),
);

server.registerTool(
  "snow_engine_health",
  {
    title: "Check Whisper Engine Health",
    description:
      "Check if the local Snow Transcriber Whisper engine is running and reachable. Call this before transcribe_audio.",
    inputSchema: z.object({}).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  async () => {
    const health = await checkEngineHealth();
    const markdown =
      health.status === "online"
        ? `Engine **online** at ${health.engineUrl} (${health.service ?? "snow-transcriber-engine"})`
        : `Engine **offline** at ${health.engineUrl}. Run \`npm run engine:up\` in the Snow Transcriber repo. Error: ${health.error ?? "unknown"}`;

    return textResult(markdown, health);
  },
);

server.registerTool(
  "snow_estimate_scene_count",
  {
    title: "Estimate Scene Count",
    description:
      "Estimate how many fixed-duration scenes a voiceover will produce without running Whisper. Useful for planning Veo3 prompt batches.",
    inputSchema: z
      .object({
        total_duration_seconds: z
          .number()
          .positive()
          .describe("Total voiceover duration in seconds"),
        scene_duration_seconds: z
          .number()
          .positive()
          .default(6)
          .describe("Target clip length in seconds (default 6 for Veo3)"),
      })
      .strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  async ({ total_duration_seconds, scene_duration_seconds }) => {
    const sceneCount = estimateSceneCount(total_duration_seconds, scene_duration_seconds);
    const structured = {
      totalDurationSeconds: total_duration_seconds,
      sceneDurationSeconds: scene_duration_seconds,
      estimatedSceneCount: sceneCount,
    };
    return textResult(
      `Estimated **${sceneCount}** scenes (${total_duration_seconds}s ÷ ${scene_duration_seconds}s clips)`,
      structured,
    );
  },
);

server.registerTool(
  "snow_transcribe_audio",
  {
    title: "Transcribe Voiceover to Scenes",
    description:
      "Transcribe a local audio file with Whisper and split into timestamped scenes. Returns sceneCount for exact Veo3 prompt planning. For long episodes, set save_json_to to persist the full result.",
    inputSchema: z
      .object({
        audio_path: z
          .string()
          .min(1)
          .describe("Absolute path to voiceover audio (MP3, WAV, M4A, OGG, FLAC, WebM)"),
        script_path: z
          .string()
          .optional()
          .describe("Optional absolute path to source narration script for agent context"),
        mode: z
          .enum(["fixed", "pause"])
          .default("fixed")
          .describe("fixed = every N seconds (Veo3). pause = natural voiceover pauses"),
        scene_duration: z.number().positive().default(6).describe("Clip length in seconds (fixed mode)"),
        pause_threshold: z.number().positive().default(0.5).describe("Pause gap in seconds (pause mode)"),
        max_scene_duration: z
          .number()
          .nonnegative()
          .default(0)
          .describe("Cap scene length in pause mode. 0 = no cap"),
        language: z.string().optional().describe("ISO language code, e.g. en. Empty = auto-detect"),
        scene_type: z
          .string()
          .max(1)
          .default("?")
          .describe("Veo3 scene type letter placeholder (A-G or ?)"),
        save_json_to: z
          .string()
          .optional()
          .describe("Optional absolute path to save full agentJson for later pagination"),
        include_scene_preview: z
          .boolean()
          .default(true)
          .describe("Include first 5 scenes in the response preview"),
      })
      .strict(),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  async (input) => {
    const result = await transcribeAudio({
      audioPath: resolvePath(input.audio_path),
      scriptPath: input.script_path ? resolvePath(input.script_path) : undefined,
      mode: input.mode,
      sceneDuration: input.scene_duration,
      pauseThreshold: input.pause_threshold,
      maxSceneDuration: input.max_scene_duration,
      language: input.language,
      sceneType: input.scene_type,
    });

    if (input.save_json_to) {
      const savePath = resolvePath(input.save_json_to);
      await writeFile(savePath, JSON.stringify(result.agentJson, null, 2), "utf8");
    }

    const previewScenes = input.include_scene_preview ? result.scenes.slice(0, 5) : [];
    const summary = summarizeTranscription({
      sceneCount: result.sceneCount,
      totalDuration: result.totalDuration,
      sceneMode: result.sceneMode,
      sceneDuration: result.sceneDuration,
      detectedLanguage: result.detectedLanguage,
      savedTo: input.save_json_to ? resolvePath(input.save_json_to) : undefined,
    });

    const preview =
      previewScenes.length > 0
        ? `\n\n## Preview (first ${previewScenes.length} scenes)\n${JSON.stringify(previewScenes, null, 2)}`
        : "";

    return textResult(`${summary}${preview}`, {
      sceneCount: result.sceneCount,
      totalDuration: result.totalDuration,
      sceneMode: result.sceneMode,
      sceneDuration: result.sceneDuration,
      detectedLanguage: result.detectedLanguage,
      savedJsonPath: input.save_json_to ? resolvePath(input.save_json_to) : null,
      agentJson: result.agentJson,
      formattedText: result.formattedText,
      previewScenes,
    });
  },
);

server.registerTool(
  "snow_list_scenes",
  {
    title: "List Scenes from Saved JSON",
    description:
      "Paginate scenes from a saved snow_transcribe_audio JSON export. Use for long episodes to avoid loading hundreds of scenes at once.",
    inputSchema: z
      .object({
        json_path: z.string().min(1).describe("Absolute path to saved agentJson .json file"),
        offset: z.number().int().nonnegative().default(0).describe("Scene index offset"),
        limit: z.number().int().positive().max(100).default(20).describe("Max scenes to return (max 100)"),
      })
      .strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  async ({ json_path, offset, limit }) => {
    const agentJson = await loadAgentJson(json_path);
    const scenes = agentJsonFromFilePayload(agentJson);
    const page = paginateScenes(scenes, offset, limit);

    return textResult(
      `Scenes ${offset + 1}–${offset + page.scenes.length} of ${page.total}${page.hasMore ? " (more available)" : ""}\n\n${JSON.stringify(page.scenes, null, 2)}`,
      page,
    );
  },
);

server.registerTool(
  "snow_format_veo3_blocks",
  {
    title: "Format Veo3 Scene Blocks",
    description:
      "Format scenes into CRAVE & CONQUER style blocks: [SCENE XX] [TIMESTAMP RANGE] [TYPE]. Read from saved JSON or pass scene IDs.",
    inputSchema: z
      .object({
        json_path: z.string().min(1).describe("Absolute path to saved agentJson .json file"),
        scene_type: z.string().max(1).default("?").describe("Scene type letter A-G or ?"),
        scene_ids: z
          .array(z.number().int().positive())
          .optional()
          .describe("Optional subset of scene IDs to format. Default = all scenes"),
        save_to: z.string().optional().describe("Optional absolute path to save formatted .txt"),
      })
      .strict(),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  async ({ json_path, scene_type, scene_ids, save_to }) => {
    const agentJson = await loadAgentJson(json_path);
    let scenes = agentJsonFromFilePayload(agentJson);

    if (scene_ids?.length) {
      const idSet = new Set(scene_ids);
      scenes = scenes.filter((scene) => idSet.has(scene.id));
    }

    const formatted = formatSceneBlocks(scenes, scene_type ?? "?");

    if (save_to) {
      await writeFile(resolvePath(save_to), formatted, "utf8");
    }

    const truncated = formatted.length > 12_000 ? `${formatted.slice(0, 12_000)}\n\n...[truncated]...` : formatted;

    return textResult(
      `Formatted **${scenes.length}** scene blocks${save_to ? ` → saved to ${resolvePath(save_to)}` : ""}\n\n${truncated}`,
      { sceneCount: scenes.length, savedTo: save_to ? resolvePath(save_to) : null, formattedText: formatted },
    );
  },
);

server.registerTool(
  "snow_save_export",
  {
    title: "Save Transcription Export",
    description: "Save formatted scene blocks or agentJson from a transcription result file to disk.",
    inputSchema: z
      .object({
        json_path: z.string().min(1).describe("Absolute path to agentJson or full transcription JSON"),
        output_path: z.string().min(1).describe("Absolute path for output file (.txt or .json)"),
        format: z.enum(["txt", "json", "agent_json"]).describe("txt = Veo3 blocks, json = full result, agent_json = agent payload only"),
        scene_type: z.string().max(1).default("?").describe("Scene type letter for txt format"),
      })
      .strict(),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  async ({ json_path, output_path, format, scene_type }) => {
    const raw = await readFile(resolvePath(json_path), "utf8");
    const payload = JSON.parse(raw) as TranscriptionResult | AgentJson | { agentJson: AgentJson };

    const agentJson: AgentJson =
      "agentJson" in payload && payload.agentJson
        ? payload.agentJson
        : "sceneCount" in payload && "scenes" in payload && "totalDuration" in payload
          ? (payload as AgentJson)
          : (payload as TranscriptionResult).agentJson;

    let content: string;
    if (format === "txt") {
      content = formatSceneBlocks(agentJsonFromFilePayload(agentJson), scene_type ?? "?");
    } else if (format === "agent_json") {
      content = JSON.stringify(agentJson, null, 2);
    } else {
      content = JSON.stringify(payload, null, 2);
    }

    const out = resolvePath(output_path);
    await writeFile(out, content, "utf8");

    return textResult(`Saved ${format} export to ${out}`, { outputPath: out, format, bytes: content.length });
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`snow-transcriber-mcp-server running (engine: ${getEngineUrl()})`);
}

main().catch((error) => {
  console.error("MCP server failed:", error);
  process.exit(1);
});