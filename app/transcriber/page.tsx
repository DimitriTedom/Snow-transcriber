import { TranscriberWorkspace } from "@/components/transcriber/transcriber-workspace";

export const metadata = {
  title: "Transcriber",
  description: "Turn voiceover audio into timestamped scenes for Veo3 prompt generation.",
};

export default function TranscriberPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Snow Transcriber · Local Whisper engine</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Audio to timestamped scenes</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Upload your generated voiceover, choose fixed 6-second chunks or natural pause cuts, and
          export scene blocks your AI agent can turn into exact Veo3 prompt counts.
        </p>
      </div>
      <TranscriberWorkspace />
    </div>
  );
}