"use client";

import { useMemo, useState } from "react";
import { Copy, Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TranscriberResult, TranscriberSettings } from "@/lib/transcriber/types";

const defaultSettings: TranscriberSettings = {
  mode: "fixed",
  sceneDuration: 6,
  pauseThreshold: 0.5,
  maxSceneDuration: 0,
  language: "",
  sceneType: "?",
};

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

  const audioLabel = useMemo(() => {
    if (!audioFile) return "No file selected";
    const sizeMb = (audioFile.size / (1024 * 1024)).toFixed(1);
    return `${audioFile.name} (${sizeMb} MB)`;
  }, [audioFile]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!audioFile) {
      toast.error("Upload a voiceover file first.");
      return;
    }

    setIsProcessing(true);
    setResult(null);

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
      toast.success(`Done — ${payload.sceneCount} scenes generated.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transcription failed.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Voiceover</CardTitle>
              <CardDescription>
                Upload the audio generated from your script. MP3, WAV, M4A, OGG, FLAC, WebM.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center transition hover:bg-muted/50">
                <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Drop audio here or click to browse</span>
                <span className="mt-1 text-xs text-muted-foreground">{audioLabel}</span>
                <input
                  type="file"
                  accept="audio/*,video/webm"
                  className="hidden"
                  onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Original Script</CardTitle>
              <CardDescription>
                Optional. Paste your source script so your agent keeps narrative context while
                timestamps come from the real audio pacing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={script}
                onChange={(event) => setScript(event.target.value)}
                placeholder="Paste your narration script here..."
                className="min-h-[220px]"
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Scene Settings</CardTitle>
            <CardDescription>
              Fixed mode splits every N seconds (best for Veo3 clip math). Pause mode follows
              natural voiceover rhythm like FoziScribe.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="mode">Scene mode</Label>
              <select
                id="mode"
                value={settings.mode}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    mode: event.target.value as TranscriberSettings["mode"],
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="fixed">Fixed duration (Veo3)</option>
                <option value="pause">Natural pauses</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sceneDuration">Scene length (seconds)</Label>
              <Input
                id="sceneDuration"
                type="number"
                min={1}
                step={0.5}
                value={settings.sceneDuration}
                disabled={settings.mode !== "fixed"}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    sceneDuration: Number(event.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pauseThreshold">Pause threshold (seconds)</Label>
              <Input
                id="pauseThreshold"
                type="number"
                min={0.1}
                step={0.1}
                value={settings.pauseThreshold}
                disabled={settings.mode !== "pause"}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    pauseThreshold: Number(event.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxSceneDuration">Max scene duration (pause mode)</Label>
              <Input
                id="maxSceneDuration"
                type="number"
                min={0}
                step={1}
                value={settings.maxSceneDuration}
                disabled={settings.mode !== "pause"}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    maxSceneDuration: Number(event.target.value),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">0 = no cap. Use 6–8 for long monologues.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language code (optional)</Label>
              <Input
                id="language"
                placeholder="en"
                value={settings.language}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, language: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sceneType">Scene type letter</Label>
              <Input
                id="sceneType"
                maxLength={1}
                value={settings.sceneType}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, sceneType: event.target.value || "?" }))
                }
              />
              <p className="text-xs text-muted-foreground">Placeholder for your Veo3 A–G scene types.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transcribing...
              </>
            ) : (
              "Generate timestamped scenes"
            )}
          </Button>
        </div>
      </form>

      {result ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total duration</div>
                <div className="mt-1 text-2xl font-semibold">{formatDuration(result.totalDuration)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Scene count</div>
                <div className="mt-1 text-2xl font-semibold">{result.sceneCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Mode</div>
                <div className="mt-1 text-2xl font-semibold capitalize">{result.sceneMode}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Language</div>
                <div className="mt-1 text-2xl font-semibold uppercase">{result.detectedLanguage}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Formatted output</CardTitle>
                <CardDescription>Ready for CRAVE &amp; CONQUER scene prompt files.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await copyToClipboard(result.formattedText);
                    toast.success("Formatted text copied.");
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy text
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTextFile("snow-transcriber-scenes.txt", result.formattedText)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download .txt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadTextFile(
                      "snow-transcriber-agent.json",
                      JSON.stringify(result.agentJson, null, 2),
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea value={result.formattedText} readOnly className="min-h-[320px] font-mono text-xs" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scene breakdown</CardTitle>
              <CardDescription>Each row is one video prompt target for your agent.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.scenes.map((scene) => (
                <div key={scene.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">
                      Scene {String(scene.id).padStart(2, "0")} · {scene.timestampRange}
                    </div>
                    <div className="text-xs text-muted-foreground">{scene.wordCount} words</div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{scene.text || "(no speech in range)"}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}