"use client";

import { useEffect, useState } from "react";
import { Activity, Cpu, Gauge, HardDrive, MemoryStick, Microchip } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CpuCoreStat, SystemStats } from "@/lib/transcriber/types";

type SystemMonitorProps = {
  active?: boolean;
  pollIntervalMs?: number;
};

function barTone(value: number) {
  if (value >= 90) return "bg-rose-500";
  if (value >= 70) return "bg-amber-500";
  if (value >= 25) return "bg-sky-500";
  return "bg-emerald-500/80";
}

function MetricBar({
  label,
  value,
  icon: Icon,
  detail,
  highlight,
  suffix = "%",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  detail: string;
  highlight?: boolean;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className={cn("font-medium tabular-nums", highlight && "text-primary")}>
          {value.toFixed(1)}
          {suffix}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barTone(value))}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">{detail}</p>
    </div>
  );
}

function CoreGrid({ cores }: { cores: CpuCoreStat[] }) {
  const compact = cores.length > 12;
  return (
    <div
      className={cn(
        "grid gap-1.5",
        compact ? "grid-cols-8 sm:grid-cols-12" : "grid-cols-4 sm:grid-cols-8",
      )}
    >
      {cores.map((core) => (
        <div
          key={core.index}
          className={cn(
            "flex flex-col items-center gap-1 rounded-md border px-1 py-1.5 transition-colors",
            core.active
              ? "border-primary/35 bg-primary/10"
              : "border-white/8 bg-white/[0.02]",
          )}
          title={`Core ${core.index}: ${core.percent.toFixed(1)}%`}
        >
          <span className="text-[9px] font-medium text-muted-foreground">C{core.index}</span>
          <div
            className={cn(
              "w-full overflow-hidden rounded-sm bg-white/8",
              compact ? "h-8" : "h-12",
            )}
          >
            <div
              className={cn(
                "w-full rounded-sm transition-all duration-500",
                barTone(core.percent),
                core.active && "shadow-[0_0_6px_rgba(56,189,248,0.35)]",
              )}
              style={{ height: `${Math.max(core.percent, 4)}%`, marginTop: `${100 - Math.max(core.percent, 4)}%` }}
            />
          </div>
          <span
            className={cn(
              "text-[9px] tabular-nums",
              core.active ? "font-semibold text-primary" : "text-muted-foreground",
            )}
          >
            {core.percent.toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-muted-foreground">
      <span className="text-foreground/70">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </span>
  );
}

export function SystemMonitor({ active = false, pollIntervalMs }: SystemMonitorProps) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const interval = pollIntervalMs ?? (active ? 1000 : 2500);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const response = await fetch("/api/system-stats", { cache: "no-store" });
        const payload = await response.json();

        if (!mounted) return;

        if (!response.ok) {
          setError(payload.error ?? "System stats unavailable.");
          setStats(null);
          return;
        }

        setStats(payload as SystemStats);
        setError(null);
      } catch {
        if (mounted) {
          setError("Cannot reach engine for system stats.");
          setStats(null);
        }
      }
    }

    poll();
    const timer = window.setInterval(poll, interval);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [interval]);

  if (error) {
    return (
      <div className="rounded-xl border border-white/8 bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-xl border border-white/8 bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
        Reading engine hardware metrics...
      </div>
    );
  }

  const cores = stats.cpu.cores ?? [];
  const physical = stats.cpu.physicalCount ?? stats.cpu.count;
  const logical = stats.cpu.logicalCount ?? stats.cpu.count;
  const activeCores = stats.cpu.activeCores ?? cores.filter((c) => c.active).length;
  const freq = stats.cpu.frequency?.currentMhz;
  const contextLabel = stats.context === "docker" ? "Docker engine container" : "Engine host";
  const loadLabel = stats.cpu.loadAverage
    ? `Load avg ${stats.cpu.loadAverage.map((v) => v.toFixed(2)).join(" / ")}`
    : null;

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border px-4 py-4 transition-colors",
        active ? "border-primary/35 bg-primary/5 shadow-lg shadow-primary/5" : "border-white/8 bg-secondary/20",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Gauge className="h-4 w-4 text-primary" />
            Hardware monitor
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {contextLabel}
            {active ? " · Whisper transcription running" : " · live engine telemetry"}
            {stats.host ? ` · ${stats.host}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatChip label="Active cores" value={`${activeCores} / ${logical}`} />
          <StatChip label="Physical" value={`${physical} cores`} />
          {freq ? <StatChip label="Clock" value={`${freq} MHz`} /> : null}
        </div>
      </div>

      <MetricBar
        label="CPU total"
        value={stats.cpu.percent}
        icon={Cpu}
        detail={[
          `${activeCores} of ${logical} logical cores above ${stats.cpu.activeThreshold ?? 5}%`,
          loadLabel,
          "Higher usage = Whisper is using more CPU threads",
        ]
          .filter(Boolean)
          .join(" · ")}
        highlight={active}
      />

      {cores.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Microchip className="h-3.5 w-3.5" />
              Per-core usage
            </p>
            <p className="text-[11px] text-muted-foreground">
              <Activity className="mr-1 inline h-3 w-3 text-primary" />
              Highlighted = core working
            </p>
          </div>
          <CoreGrid cores={cores} />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricBar
          label="RAM"
          value={stats.memory.percent}
          icon={MemoryStick}
          detail={`${stats.memory.used.display} used · ${stats.memory.available.display} free · ${stats.memory.total.display} total${
            stats.memory.swap?.total.bytes
              ? ` · Swap ${stats.memory.swap.used.display}/${stats.memory.swap.total.display}`
              : ""
          }`}
          highlight={active}
        />
        <MetricBar
          label="Disk"
          value={stats.disk.percent}
          icon={HardDrive}
          detail={`${stats.disk.free.display} free on cache volume`}
          highlight={active}
        />
      </div>

      <div className="rounded-lg border border-white/8 bg-background/30 px-3 py-2.5">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Engine process</p>
        <div className="grid gap-2 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="text-muted-foreground">PID </span>
            <span className="font-medium tabular-nums">{stats.process.pid}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Process CPU </span>
            <span className="font-medium tabular-nums">{stats.process.cpuPercent?.toFixed(1) ?? "—"}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">RSS memory </span>
            <span className="font-medium">{stats.process.memoryRss?.display ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Threads </span>
            <span className="font-medium tabular-nums">{stats.process.threads ?? "—"}</span>
          </div>
        </div>
      </div>

      {stats.hostInfo ? (
        <p className="text-[10px] text-muted-foreground/80">
          {stats.hostInfo.processor} · {stats.hostInfo.architecture} · Python {stats.hostInfo.pythonVersion}
        </p>
      ) : null}
    </div>
  );
}