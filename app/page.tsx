import Link from "next/link";
import { ArrowRight, Cpu, FileJson, Lock, Waves } from "lucide-react";

import { WorkflowSteps } from "@/components/transcriber/workflow-steps";
import NumberTicker from "@/components/ui/number-ticker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Waves,
    title: "Rhythm from audio",
    description: "Timestamps come from real TTS pacing — not script guesses.",
  },
  {
    icon: FileJson,
    title: "Agent-ready export",
    description: "Scene blocks + JSON with exact counts for AI video prompt batches.",
  },
  {
    icon: Lock,
    title: "100% local",
    description: "Whisper runs on your machine. No upload limits. No API bills.",
  },
  {
    icon: Cpu,
    title: "CPU optimized",
    description: "Works on AMD GPUs via CPU int8. 2GB VRAM is too tight for Whisper GPU.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/50 p-8 sm:p-12">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative max-w-3xl space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge>Universal AI Video Toolchain</Badge>
            <Badge variant="secondary">FoziScribe alternative</Badge>
          </div>

          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Stop guessing scene counts.
            <span className="mt-2 block bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              Let the voiceover decide.
            </span>
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Snow Transcriber turns your generated narration into timestamped scene blocks — so your
            AI agent knows exactly how many scene prompts to generate. Fixed 6-second math or natural pause
            cuts. Free. Local. Unlimited.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="cursor-pointer snow-glow">
              <Link href="/transcriber">
                Open workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="cursor-pointer border-white/15">
              <Link href="/mcp">Connect AI (MCP)</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="cursor-pointer border-white/15">
              <a href="https://github.com/DimitriTedom/Snow-transcriber" target="_blank" rel="noreferrer">
                View on GitHub
              </a>
            </Button>
          </div>
        </div>

        <div className="relative mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-background/40 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Scene modes</p>
            <p className="mt-2 text-2xl font-semibold">
              <NumberTicker value={2} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Fixed + Pause</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/40 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Export formats</p>
            <p className="mt-2 text-2xl font-semibold">
              <NumberTicker value={2} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">.txt + JSON</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/40 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Cost</p>
            <p className="mt-2 text-2xl font-semibold text-accent">$0</p>
            <p className="mt-1 text-xs text-muted-foreground">Unlimited minutes</p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">The right workflow</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Most creators build scenes before the voice exists. Snow Transcriber flips that — like
            FoziScribe, but local and tuned for your AI video pipeline.
          </p>
        </div>
        <WorkflowSteps />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="snow-panel group cursor-default p-5 transition-colors duration-200 hover:border-primary/25"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary/25">
              <feature.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </section>

      <section className="snow-panel flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">Ready to batch your AI prompts?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload a voiceover, get scene timestamps, hand the JSON to your agent.
          </p>
        </div>
        <Button asChild size="lg" className="cursor-pointer snow-glow shrink-0">
          <Link href="/transcriber">
            Start transcribing
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}