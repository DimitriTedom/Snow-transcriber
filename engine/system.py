from __future__ import annotations

import os
import platform
import time
from pathlib import Path

import psutil

# Warm up CPU sampling so the first reading is meaningful.
psutil.cpu_percent(interval=None)
psutil.Process().cpu_percent(interval=None)

ACTIVE_CORE_THRESHOLD = 5.0


def _format_bytes(value: int) -> dict[str, float | str]:
    gib = value / (1024**3)
    return {
        "bytes": value,
        "gib": round(gib, 2),
        "display": f"{gib:.1f} GiB",
    }


def _cpu_frequency() -> dict[str, float | None] | None:
    try:
        freq = psutil.cpu_freq()
        if not freq:
            return None
        return {
            "currentMhz": round(freq.current, 0) if freq.current else None,
            "minMhz": round(freq.min, 0) if freq.min else None,
            "maxMhz": round(freq.max, 0) if freq.max else None,
        }
    except (OSError, AttributeError):
        return None


def get_system_stats() -> dict:
    memory = psutil.virtual_memory()
    swap = psutil.swap_memory()
    disk_path = os.getenv("TRANSCRIBER_CACHE_DIR", "/tmp")
    disk = psutil.disk_usage(disk_path)

    per_cpu = psutil.cpu_percent(interval=0.12, percpu=True)
    logical_count = len(per_cpu) if per_cpu else (psutil.cpu_count(logical=True) or 1)
    physical_count = psutil.cpu_count(logical=False) or logical_count
    cpu_percent = round(sum(per_cpu) / logical_count, 1) if per_cpu else 0.0

    active_cores = sum(1 for value in per_cpu if value >= ACTIVE_CORE_THRESHOLD)
    cores = [
        {
            "index": index,
            "percent": round(value, 1),
            "active": value >= ACTIVE_CORE_THRESHOLD,
        }
        for index, value in enumerate(per_cpu)
    ]

    load_avg: list[float] | None = None
    if hasattr(os, "getloadavg"):
        load_avg = [round(value, 2) for value in os.getloadavg()]

    proc = psutil.Process()
    proc_mem = proc.memory_info()

    return {
        "timestamp": time.time(),
        "host": platform.node(),
        "platform": platform.system(),
        "context": "docker" if Path("/.dockerenv").exists() else "host",
        "hostInfo": {
            "processor": platform.processor() or platform.machine(),
            "architecture": platform.machine(),
            "pythonVersion": platform.python_version(),
        },
        "cpu": {
            "percent": cpu_percent,
            "count": logical_count,
            "physicalCount": physical_count,
            "logicalCount": logical_count,
            "activeCores": active_cores,
            "activeThreshold": ACTIVE_CORE_THRESHOLD,
            "cores": cores,
            "loadAverage": load_avg,
            "frequency": _cpu_frequency(),
        },
        "memory": {
            "total": _format_bytes(memory.total),
            "used": _format_bytes(memory.used),
            "available": _format_bytes(memory.available),
            "percent": round(memory.percent, 1),
            "swap": {
                "total": _format_bytes(swap.total),
                "used": _format_bytes(swap.used),
                "percent": round(swap.percent, 1) if swap.total > 0 else 0.0,
            },
        },
        "disk": {
            "path": disk_path,
            "total": _format_bytes(disk.total),
            "used": _format_bytes(disk.used),
            "free": _format_bytes(disk.free),
            "percent": round(disk.percent, 1),
        },
        "process": {
            "pid": proc.pid,
            "name": proc.name(),
            "cpuPercent": round(proc.cpu_percent(interval=0), 1),
            "memoryPercent": round(proc.memory_percent(), 2),
            "memoryRss": _format_bytes(proc_mem.rss),
            "threads": proc.num_threads(),
        },
    }