import type { Asset } from "playcanvas";

/**
 * Normalized aggregate progress payload.
 * - percent ∈ [0, 100]
 * - received/total bytes are summed across streaming assets (e.g., GSplat).
 *   They may be undefined if servers omit Content-Length.
 */
export interface AggregateProgress {
  percent: number;
  receivedBytes?: number;
  totalBytes?: number;
}

/**
 * Aggregates progress across heterogeneous PlayCanvas assets.
 * - GSplat assets: use byte-level progress via Asset.EVENT_PROGRESS.
 * - Other assets (e.g., json): update on ready() to 100%.
 *
 * Each asset contributes with a configurable weight so large payloads (GSplat)
 * can dominate the perceived bar while tiny JSON manifests don't.
 */
export class ProgressAggregator {
  /** Internal per-asset state. */
  private entries = new Map<
    number,
    {
      weight: number; // contribution to overall percent
      progress01: number; // normalized [0..1]
      isStreaming: boolean; // true for assets that emit byte progress (e.g., gsplat)
      receivedBytes?: number; // latest received bytes (streaming assets)
      totalBytes?: number; // latest total bytes (streaming assets)
      offHandlers: Array<() => void>; // registered event unbinders for cleanup
    }
  >();

  /** Optional listener invoked whenever aggregate progress changes. */
  public onProgress?: (p: AggregateProgress) => void;

  /** Registers a PlayCanvas asset with an optional weight (default 1). */
  public register(asset: Asset, weight = 1): void {
    const isStreaming = asset.type === "gsplat";

    const entry = {
      weight: Math.max(0, weight),
      progress01: 0,
      isStreaming,
      receivedBytes: undefined as number | undefined,
      totalBytes: undefined as number | undefined,
      offHandlers: [] as Array<() => void>,
    };

    // Byte-level streaming progress (GSplat only in current engine versions).
    if (isStreaming) {
      const off = asset.on(
        "progress",
        (receivedBytes: number, totalBytes?: number) => {
          entry.receivedBytes = receivedBytes;
          entry.totalBytes = totalBytes;
          // Guard: when totalBytes is known, compute a smooth fraction; else clamp to [0,1).
          if (typeof totalBytes === "number" && totalBytes > 0) {
            entry.progress01 = Math.min(0.999, Math.max(0, receivedBytes / totalBytes));
          } else {
            // Without a reliable total, advance conservatively but never hit 100% before ready().
            entry.progress01 = Math.min(0.95, Math.max(entry.progress01, 0.01));
          }

          this._emit();
        },
        this,
      );
      entry.offHandlers.push(() => off.off());
    }

    // When asset is ready, mark as fully loaded (count-based fallback for non-streaming).
    asset.ready(() => {
      entry.progress01 = 1;
      this._emit();
    });

    this.entries.set(asset.id, entry);
  }

  /** Cleans up all listeners (optional in short-lived use). */
  public dispose(): void {
    for (const e of this.entries.values()) {
      for (const off of e.offHandlers) {
        try {
          off();
        } catch {
          /* no-op */
        }
      }
      e.offHandlers.length = 0;
    }
  }

  /** Emits the current aggregate to `onProgress`, if set. */
  private _emit(): void {
    if (!this.onProgress) {
      return;
    }

    // Weighted average across all assets.
    let wsum = 0;
    let acc = 0;

    // Sum streaming bytes where available.
    let bytesKnown = false;
    let sumReceived = 0;
    let sumTotal = 0;

    for (const e of this.entries.values()) {
      wsum += e.weight;
      acc += e.progress01 * e.weight;

      if (e.isStreaming && typeof e.receivedBytes === "number") {
        sumReceived += e.receivedBytes;
        if (typeof e.totalBytes === "number") {
          sumTotal += e.totalBytes;
          bytesKnown = true;
        }
      }
    }

    const percent = wsum > 0 ? (acc / wsum) * 100 : 0;
    this.onProgress({
      percent: Math.max(0, Math.min(100, percent)),
      receivedBytes: bytesKnown ? sumReceived : undefined,
      totalBytes: bytesKnown ? sumTotal : undefined,
    });
  }
}
