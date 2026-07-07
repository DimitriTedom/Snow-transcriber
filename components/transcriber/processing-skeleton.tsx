type ProcessingSkeletonProps = {
  phase?: "waiting_engine" | "transcribing";
};

const phaseCopy: Record<NonNullable<ProcessingSkeletonProps["phase"]>, { title: string; detail: string }> = {
  waiting_engine: {
    title: "Waiting for Whisper engine",
    detail: "The model is loading or Docker is starting. Transcription begins once the engine is ready.",
  },
  transcribing: {
    title: "Transcribing and assembling scenes",
    detail: "Long voiceovers on CPU can take several minutes. Use Stop to cancel.",
  },
};

export function ProcessingSkeleton({ phase = "transcribing" }: ProcessingSkeletonProps) {
  const copy = phaseCopy[phase];

  return (
    <div className="snow-panel space-y-4 p-6" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-primary/20" />
        <div className="space-y-2">
          <p className="text-sm font-medium">{copy.title}</p>
          <p className="text-xs text-muted-foreground">{copy.detail}</p>
        </div>
      </div>
      <div className="h-10 animate-pulse rounded-xl bg-white/5" />
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}