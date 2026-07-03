import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { TranscriberWorkspace } from "@/components/transcriber/transcriber-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Workspace",
  description: "Turn voiceover audio into timestamped scenes for Veo3 prompt generation.",
};

export default function TranscriberPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 cursor-pointer px-2 text-muted-foreground">
            <Link href="/">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Home
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">CRAVE &amp; CONQUER</Badge>
            <Badge variant="secondary">Local Whisper</Badge>
            <Badge variant="outline">Veo3 ready</Badge>
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Voiceover → <span className="text-primary">timestamped scenes</span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Upload generated narration, split into exact scene counts, and export prompt-ready blocks
            for your AI video agent. No guessing. No FoziScribe minute limits.
          </p>
        </div>
      </div>

      <TranscriberWorkspace />
    </div>
  );
}