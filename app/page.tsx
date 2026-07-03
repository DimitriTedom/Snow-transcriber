import Link from "next/link";

import InteractiveGridPattern from "@/components/ui/interactive-grid-pattern";
import TypingAnimation from "@/components/ui/typing-animation";
import NumberTicker from "@/components/ui/number-ticker";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-8">
      <InteractiveGridPattern interactive className="opacity-100" />
      <div className="relative">
        <p className="text-sm text-muted-foreground">Snow Transcriber · Next.js + Whisper</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight">
          Voiceover-first timestamps for exact scene counts.
        </h1>
        <div className="mt-2 text-muted-foreground">
          <TypingAnimation
            text="Upload TTS audio, get timestamped scenes, export JSON for your Veo3 prompt agent."
            loop={false}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild size="lg">
            <Link href="/transcriber">Open transcriber</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auth/login">Log in</Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-background p-4">
            <div className="text-sm text-muted-foreground">Engine</div>
            <div className="mt-2 text-2xl font-semibold">Whisper local</div>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <div className="text-sm text-muted-foreground">Scene modes</div>
            <div className="mt-2 text-2xl font-semibold">Fixed + Pause</div>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <div className="text-sm text-muted-foreground">Export</div>
            <div className="mt-2 text-2xl font-semibold">
              <NumberTicker value={2} /> formats
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}