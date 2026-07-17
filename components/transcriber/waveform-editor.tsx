"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TranscriberScene } from "@/lib/transcriber/types";

type WaveformEditorProps = {
  audioUrl: string;
  scenes: TranscriberScene[];
  onScenesChange: (scenes: TranscriberScene[]) => void;
};

export function WaveformEditor({ audioUrl, scenes, onScenesChange }: WaveformEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const skipUpdateRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "hsl(var(--primary) / 0.4)",
      progressColor: "hsl(var(--primary))",
      cursorColor: "hsl(var(--accent))",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 100,
      normalize: true,
    });

    const regions = ws.registerPlugin(RegionsPlugin.create());

    wavesurferRef.current = ws;
    regionsRef.current = regions;

    ws.on("ready", () => setIsReady(true));
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));

    ws.load(audioUrl);

    return () => {
      ws.destroy();
    };
  }, [audioUrl]);

  useEffect(() => {
    const regions = regionsRef.current;
    if (!regions || !isReady) return;

    // Clear existing
    regions.getRegions().forEach(r => r.remove());

    scenes.forEach((scene, index) => {
      // Alternate colors for visibility
      const color = index % 2 === 0 ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)";
      
      regions.addRegion({
        id: `scene-${scene.id}`,
        start: scene.start,
        end: scene.end,
        color,
        drag: false, // Don't drag the whole region
        resize: true, // Allow resizing edges
      });
    });

    const onRegionUpdateEnd = (region: any) => {
      if (skipUpdateRef.current) return;
      
      const regionIdStr = region.id.replace('scene-', '');
      const sceneId = parseInt(regionIdStr, 10);
      
      onScenesChange(
        scenes.map((s) => {
          if (s.id === sceneId) {
            return {
              ...s,
              start: Number(region.start.toFixed(3)),
              end: Number(region.end.toFixed(3)),
            };
          }
          return s;
        })
      );
    };

    regions.on('region-updated', onRegionUpdateEnd);

    return () => {
      regions.un('region-updated', onRegionUpdateEnd);
    };
  }, [scenes, isReady, onScenesChange]);

  const togglePlay = () => {
    wavesurferRef.current?.playPause();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Interactive Waveform</h3>
        <Button variant="secondary" size="sm" onClick={togglePlay} disabled={!isReady} className="h-8">
          {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
          {isPlaying ? "Pause" : "Play"}
        </Button>
      </div>
      
      <div className="rounded-xl border border-white/10 bg-secondary/30 p-4">
        <div ref={containerRef} className="w-full overflow-hidden" />
      </div>
      
      <p className="text-xs text-muted-foreground">
        Drag the edges of the regions on the waveform to fine-tune the exact start and end boundaries of each scene.
      </p>
    </div>
  );
}
