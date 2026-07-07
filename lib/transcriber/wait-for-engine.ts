export type EngineWaitStatus = "ready" | "warming" | "offline";

type WaitForEngineOptions = {
  signal?: AbortSignal;
  onStatus?: (status: EngineWaitStatus) => void;
  maxWaitMs?: number;
  intervalMs?: number;
};

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Cancelled", "AbortError"));
      return;
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeout);
      reject(new DOMException("Cancelled", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function waitForEngineReady(options: WaitForEngineOptions = {}) {
  const maxWaitMs = options.maxWaitMs ?? 10 * 60 * 1000;
  const intervalMs = options.intervalMs ?? 2000;
  const deadline = Date.now() + maxWaitMs;
  let lastStatus: EngineWaitStatus = "offline";

  while (Date.now() < deadline) {
    if (options.signal?.aborted) {
      throw new DOMException("Cancelled", "AbortError");
    }

    try {
      const response = await fetch("/api/engine-ready", {
        cache: "no-store",
        signal: options.signal,
      });
      const payload = (await response.json()) as {
        ready?: boolean;
        status?: EngineWaitStatus;
        error?: string;
      };

      if (response.ok && payload.ready) {
        options.onStatus?.("ready");
        return;
      }

      lastStatus = response.ok && !payload.ready ? "warming" : "offline";
      options.onStatus?.(lastStatus);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      lastStatus = "offline";
      options.onStatus?.("offline");
    }

    await sleep(intervalMs, options.signal);
  }

  if (lastStatus === "warming") {
    throw new Error(
      "Whisper model is still loading. Wait a minute and try again, or check `npm run engine:logs`.",
    );
  }

  throw new Error("Cannot reach transcription engine. Start it with `npm run engine:up`.");
}