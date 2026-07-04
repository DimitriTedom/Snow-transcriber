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

export type ByteMetric = {
  bytes: number;
  gib: number;
  display: string;
};

export type SystemStats = {
  timestamp: number;
  host: string;
  platform: string;
  context: "docker" | "host";
  cpu: {
    percent: number;
    count: number;
    loadAverage: number[] | null;
  };
  memory: {
    total: ByteMetric;
    used: ByteMetric;
    available: ByteMetric;
    percent: number;
  };
  disk: {
    path: string;
    total: ByteMetric;
    used: ByteMetric;
    free: ByteMetric;
    percent: number;
  };
  process: {
    pid: number;
    memoryPercent: number;
  };
};