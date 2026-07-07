"use client";

import { useEffect, useState } from "react";
import { Cpu, RefreshCw, Server, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type EngineHealth = {
  status: "online" | "warming" | "offline" | "checking";
  ready?: boolean;
  whisperModel?: string;
  whisperDevice?: string;
  error?: string;
};

export function EngineStatus() {
  const [health, setHealth] = useState<EngineHealth>({ status: "checking" });

  async function checkHealth() {
    setHealth({ status: "checking" });
    try {
      const response = await fetch("/api/engine-health");
      const payload = await response.json();
      setHealth({
        status: response.ok ? (payload.ready ? "online" : "warming") : "offline",
        ready: payload.ready,
        whisperModel: payload.whisperModel,
        whisperDevice: payload.whisperDevice,
        error: payload.error,
      });
    } catch {
      setHealth({ status: "offline", error: "Engine unreachable" });
    }
  }

  useEffect(() => {
    void checkHealth();
    const interval = setInterval(() => void checkHealth(), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="snow-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Server className="h-4 w-4 text-primary" />
          Whisper engine
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 cursor-pointer p-0"
          onClick={() => void checkHealth()}
          aria-label="Refresh engine status"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${health.status === "checking" ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge
          variant={
            health.status === "online"
              ? "success"
              : health.status === "checking" || health.status === "warming"
                ? "warning"
                : "outline"
          }
        >
          {health.status === "checking"
            ? "Checking..."
            : health.status === "online"
              ? "Ready"
              : health.status === "warming"
                ? "Loading model"
                : "Offline"}
        </Badge>
        {health.whisperModel ? (
          <Badge variant="secondary" className="font-mono">
            {health.whisperModel}
          </Badge>
        ) : null}
        {health.whisperDevice ? (
          <Badge variant="secondary" className="gap-1">
            {health.whisperDevice === "cpu" ? <Cpu className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
            {health.whisperDevice}
          </Badge>
        ) : null}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {health.status === "online"
          ? "Local faster-whisper is ready for transcription."
          : health.status === "warming"
            ? "Whisper model is loading. Transcription will start once it is ready."
            : health.error ?? "Start with npm run engine:up"}
      </p>

      <p className="mt-2 text-xs text-muted-foreground/80">
        AMD 2GB VRAM: Docker uses CPU mode. GPU acceleration needs NVIDIA CUDA or native DirectML (not wired yet).
      </p>
    </div>
  );
}