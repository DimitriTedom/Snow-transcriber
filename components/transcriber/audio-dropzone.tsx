"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileAudio, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AudioDropzoneProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
};

export function AudioDropzone({ file, onFileChange }: AudioDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const meta = useMemo(() => {
    if (!file) return null;
    return {
      name: file.name,
      sizeMb: (file.size / (1024 * 1024)).toFixed(1),
      type: file.type || "audio",
    };
  }, [file]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const next = files?.[0];
      if (next) onFileChange(next);
    },
    [onFileChange],
  );

  return (
    <div className="space-y-4">
      <label
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed px-6 py-10 text-center transition-colors duration-200",
          isDragging
            ? "border-primary bg-primary/10"
            : "border-white/15 bg-secondary/30 hover:border-primary/40 hover:bg-secondary/50",
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_hsl(var(--primary)/0.08),_transparent_70%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

        <div className="relative">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Upload className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium">Drop voiceover here or click to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">MP3 · WAV · M4A · OGG · FLAC · WebM · up to 100MB</p>
          {meta ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-card/80 px-3 py-1.5 text-xs">
              <FileAudio className="h-3.5 w-3.5 text-accent" />
              <span className="max-w-[220px] truncate font-medium">{meta.name}</span>
              <span className="text-muted-foreground">{meta.sizeMb} MB</span>
            </div>
          ) : null}
        </div>

        <input
          type="file"
          accept="audio/*,video/webm"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </label>

      {file && previewUrl ? (
        <div className="snow-panel space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Preview</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 cursor-pointer px-2 text-muted-foreground hover:text-foreground"
              onClick={() => onFileChange(null)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
          <audio controls src={previewUrl} className="w-full" preload="metadata" />
        </div>
      ) : null}
    </div>
  );
}