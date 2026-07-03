"use client";

import type { TranscriberScene } from "@/lib/transcriber/types";
import { cn } from "@/lib/utils";

type SceneTimelineProps = {
  scenes: TranscriberScene[];
  totalDuration: number;
  activeSceneId?: number;
  onSceneSelect?: (sceneId: number) => void;
};

export function SceneTimeline({
  scenes,
  totalDuration,
  activeSceneId,
  onSceneSelect,
}: SceneTimelineProps) {
  if (!scenes.length || totalDuration <= 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Scene timeline</span>
        <span className="font-mono">{scenes.length} cuts</span>
      </div>

      <div className="flex h-10 overflow-hidden rounded-xl border border-white/10 bg-secondary/50">
        {scenes.map((scene) => {
          const widthPercent = ((scene.end - scene.start) / totalDuration) * 100;
          const isActive = activeSceneId === scene.id;

          return (
            <button
              key={scene.id}
              type="button"
              title={`Scene ${scene.id}: ${scene.timestampRange}`}
              onClick={() => onSceneSelect?.(scene.id)}
              style={{ width: `${Math.max(widthPercent, 0.4)}%` }}
              className={cn(
                "group relative h-full min-w-[2px] cursor-pointer border-r border-black/20 transition-colors duration-200 last:border-r-0",
                isActive ? "bg-primary" : "bg-primary/35 hover:bg-primary/55",
              )}
            >
              <span className="sr-only">
                Scene {scene.id} {scene.timestampRange}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>00:00.0</span>
        <span>
          {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toFixed(1).padStart(4, "0")}
        </span>
      </div>
    </div>
  );
}