"use client";

import { useMemo, useState } from "react";
import {
  Clock3,
  Copy,
  Download,
  Film,
  Languages,
  Loader2,
  Pause,
  Ruler,
  Sparkles,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

import { AudioDropzone } from "@/components/transcriber/audio-dropzone";
import { EngineStatus } from "@/components/transcriber/engine-status";
import { ProcessingSkeleton } from "@/components/transcriber/processing-skeleton";
import { SceneTimeline } from "@/components/transcriber/scene-timeline";
import { WorkflowSteps } from "@/components/transcriber/workflow-steps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { TranscriberResult, TranscriberSettings } from "@/lib/transcriber/types";

const defaultSettings: TranscriberSettings = {
  mode: "fixed",
  sceneDuration: 6,
  pauseThreshold: 0.5,
  maxSceneDuration: 0,
  language: "",
  sceneType: "?",
};

const sceneTypes = ["?", "A", "B", "C", "D", "E", "F", "G"];

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds % 60).toFixed(1);
  return `${minutes}m ${remainder}s`;
}

async function copyToClipboard(value: string) {
  await navigator.clipboard.writeText(value);
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function TranscriberWorkspace() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [script, setScript] = useState("");
  const [settings, setSettings] = useState<TranscriberSettings>(defaultSettings);
  const [result, setResult] = useState<TranscriberResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState<number | undefined>();

  const estimatedScenes = useMemo(() => {
    if (!audioFile || settings.mode !== "fixed") return null;
    return null;
  }, [audioFile, settings.mode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!audioFile) {
      toast.error("Upload a voiceover file first.");
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setActiveSceneId(undefined);

    try {
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("script", script);
      formData.append("mode", settings.mode);
      formData.append("scene_duration", String(settings.sceneDuration));
      formData.append("pause_threshold", String(settings.pauseThreshold));
      formData.append("max_scene_duration", String(settings.maxSceneDuration));
      formData.append("language", settings.language);
      formData.append("scene_type", settings.sceneType);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Transcription failed.");
      }

      setResult(payload as TranscriberResult);
      setActiveSceneId(1);
      toast.success(`${payload.sceneCount} scenes ready for your Veo3 agent.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transcription failed.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-8">
      <WorkflowSteps compact />

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <EngineStatus />

          <div className="snow-panel space-y-5 p-5">
            <div>
              <h2 className="text-sm font-semibold">Scene engine</h2>
              <p className="mt-1 text-xs text-muted-foreground">How cuts are calculated from your voiceover.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["fixed", "pause"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSettings((current) => ({ ...current, mode }))}
                  className={cn(
                    "cursor-pointer rounded-xl border px-3 py-3 text-left transition-colors duration-200",
                    settings.mode === mode
                      ? "border-primary/50 bg-primary/15"
                      : "border-white/10 bg-secondary/40 hover:border-white/20",
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {mode === "fixed" ? <Ruler className="h-4 w-4 text-accent" /> : <Pause className="h-4 w-4 text-accent" />}
                    {mode === "fixed" ? "Fixed" : "Pauses"}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {mode === "fixed" ? "Veo3 clip math" : "FoziScribe rhythm"}
                  </p>
                </button>
              ))}
            </div>

            {settings.mode === "fixed" ? (
              <div className="space-y-2">
                <Label htmlFor="sceneDuration" className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" />
                  Clip length (sec)
                </Label>
                <Input
                  id="sceneDuration"
                  type="number"
                  min={1}
                  step={0.5}
                  value={settings.sceneDuration}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      sceneDuration: Number(event.target.value),
                    }))
                  }
                  className="font-mono"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pauseThreshold" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Pause threshold (sec)
                  </Label>
                  <Input
                    id="pauseThreshold"
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={settings.pauseThreshold}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        pauseThreshold: Number(event.target.value),
                      }))
                    }
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxSceneDuration" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Max scene cap (0 = none)
                  </Label>
                  <Input
                    id="maxSceneDuration"
                    type="number"
                    min={0}
                    step={1}
                    value={settings.maxSceneDuration}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        maxSceneDuration: Number(event.target.value),
                      }))
                    }
                    className="font-mono"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="language" className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <Languages className="h-3.5 w-3.5" />
                Language (optional)
              </Label>
              <Input
                id="language"
                placeholder="auto-detect"
                value={settings.language}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, language: event.target.value }))
                }
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Veo3 scene type</Label>
              <div className="flex flex-wrap gap-1.5">
                {sceneTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSettings((current) => ({ ...current, sceneType: type }))}
                    className={cn(
                      "h-8 w-8 cursor-pointer rounded-lg border font-mono text-sm transition-colors duration-200",
                      settings.sceneType === type
                        ? "border-accent bg-accent/20 text-accent"
                        : "border-white/10 bg-secondary/40 hover:border-white/20",
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="snow-panel p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Voiceover</h2>
                <Badge variant="secondary">Required</Badge>
              </div>
              <AudioDropzone file={audioFile} onFileChange={setAudioFile} />
            </div>

            <div className="snow-panel p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Source script</h2>
                <Badge variant="outline">Optional</Badge>
              </div>
              <Textarea
                value={script}
                onChange={(event) => setScript(event.target.value)}
                placeholder="Paste narration for agent context. Timestamps always come from the real audio pacing..."
                className="min-h-[260px] resize-y border-white/10 bg-secondary/30 font-mono text-sm leading-relaxed"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {script.trim() ? `${script.trim().split(/\s+/).length} words in script` : "Whisper aligns to audio, not this text (forced alignment coming in v2)."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {settings.mode === "fixed"
                ? `Each scene ≈ ${settings.sceneDuration}s — ideal for Veo3 prompt batching.`
                : "Cuts land on natural pauses in the voiceover."}
              {estimatedScenes ? ` · ~${estimatedScenes} scenes est.` : null}
            </p>
            <Button
              type="submit"
              size="lg"
              disabled={isProcessing || !audioFile}
              className="cursor-pointer snow-glow min-w-[220px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate scenes
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {isProcessing ? <ProcessingSkeleton /> : null}

      {result && !isProcessing ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Duration", value: formatDuration(result.totalDuration), icon: Clock3 },
              { label: "Scene count", value: String(result.sceneCount), icon: Film },
              { label: "Mode", value: result.sceneMode, icon: Ruler },
              { label: "Language", value: result.detectedLanguage.toUpperCase(), icon: Languages },
            ].map((stat) => (
              <div key={stat.label} className="snow-panel p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <stat.icon className="h-3.5 w-3.5" />
                  {stat.label}
                </div>
                <p className="mt-2 text-2xl font-semibold capitalize">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="snow-panel p-5">
            <SceneTimeline
              scenes={result.scenes}
              totalDuration={result.totalDuration}
              activeSceneId={activeSceneId}
              onSceneSelect={setActiveSceneId}
            />
          </div>

          <div className="snow-panel overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold">Export for CRAVE &amp; CONQUER</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Feed .txt or JSON into your Veo3 prompt agent — exact scene count included.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={async () => {
                    await copyToClipboard(result.formattedText);
                    toast.success("Scene blocks copied.");
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy .txt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => downloadTextFile("snow-transcriber-scenes.txt", result.formattedText)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download .txt
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() =>
                    downloadTextFile(
                      "snow-transcriber-agent.json",
                      JSON.stringify(result.agentJson, null, 2),
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Agent JSON
                </Button>
              </div>
            </div>
            <Textarea
              value={result.formattedText}
              readOnly
              className="min-h-[280px] resize-y rounded-none border-0 bg-black/20 font-mono text-xs leading-relaxed focus-visible:ring-0"
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Scene breakdown</h2>
            <div className="grid gap-3">
              {result.scenes.map((scene) => {
                const isActive = activeSceneId === scene.id;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => setActiveSceneId(scene.id)}
                    className={cn(
                      "snow-panel w-full cursor-pointer p-4 text-left transition-colors duration-200",
                      isActive && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-accent">
                          SCENE {String(scene.id).padStart(2, "0")}
                        </span>
                        <span className="font-mono text-sm font-medium">{scene.timestampRange}</span>
                      </div>
                      <Badge variant="secondary">{scene.wordCount} words</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {scene.text || "(no speech detected in this range)"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}