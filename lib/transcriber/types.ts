export type SceneMode = "fixed" | "pause";

export type TranscriberScene = {
  id: number;
  start: number;
  end: number;
  text: string;
  wordCount: number;
  timestampRange: string;
};

export type TranscriberResult = {
  totalDuration: number;
  sceneCount: number;
  sceneMode: SceneMode;
  sceneDuration: number | null;
  pauseThreshold: number | null;
  detectedLanguage: string;
  scriptProvided: boolean;
  scenes: TranscriberScene[];
  formattedText: string;
  agentJson: {
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
};

export type TranscriberSettings = {
  mode: SceneMode;
  sceneDuration: number;
  pauseThreshold: number;
  maxSceneDuration: number;
  language: string;
  sceneType: string;
};