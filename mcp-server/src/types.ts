export type SceneMode = "fixed" | "pause";

export type TranscriberScene = {
  id: number;
  start: number;
  end: number;
  text: string;
  wordCount: number;
  timestampRange: string;
};

export type AgentJson = {
  totalDuration: number;
  sceneCount: number;
  sceneMode: SceneMode;
  sceneDuration: number | null;
  pauseThreshold: number | null;
  detectedLanguage: string;
  scriptProvided: boolean;
  scenes: Array<{
    id: number;
    start: number;
    end: number;
    duration: number;
    text: string;
    wordCount: number;
    timestampRange: string;
  }>;
};

export type TranscriptionResult = {
  totalDuration: number;
  sceneCount: number;
  sceneMode: SceneMode;
  sceneDuration: number | null;
  pauseThreshold: number | null;
  detectedLanguage: string;
  scriptProvided: boolean;
  scenes: TranscriberScene[];
  formattedText: string;
  agentJson: AgentJson;
};