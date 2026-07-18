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
  hookDuration?: number;
  hookSceneDuration?: number;
};

export type ByteMetric = {
  bytes: number;
  gib: number;
  display: string;
};

export type CpuCoreStat = {
  index: number;
  percent: number;
  active: boolean;
};

export type SystemStats = {
  timestamp: number;
  host: string;
  platform: string;
  context: "docker" | "host";
  hostInfo?: {
    processor: string;
    architecture: string;
    pythonVersion: string;
  };
  cpu: {
    percent: number;
    count: number;
    physicalCount: number;
    logicalCount: number;
    activeCores: number;
    activeThreshold: number;
    cores: CpuCoreStat[];
    loadAverage: number[] | null;
    frequency: {
      currentMhz: number | null;
      minMhz: number | null;
      maxMhz: number | null;
    } | null;
  };
  memory: {
    total: ByteMetric;
    used: ByteMetric;
    available: ByteMetric;
    percent: number;
    swap: {
      total: ByteMetric;
      used: ByteMetric;
      percent: number;
    };
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
    name: string;
    cpuPercent: number;
    memoryPercent: number;
    memoryRss: ByteMetric;
    threads: number;
  };
};