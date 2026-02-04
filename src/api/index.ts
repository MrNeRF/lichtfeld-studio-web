/**
 * src/api/index.ts
 *
 * Worker Entry Point - Composes the stats API and scheduled collector.
 *
 * This is the main entry point for the Cloudflare Worker deployment.
 * It combines:
 *   - Stats API (fetch handler) from workers/stats-api/
 *   - Stats Collector (scheduled handler) from workers/stats-collector/
 *
 * Endpoints:
 *   GET /api/stats - Download statistics from D1 database
 *
 * Scheduled:
 *   Cron (daily at 02:00 UTC) - Collect GitHub release download stats
 */

import statsApi from "../../workers/stats-api/src/index";
import type { StatsApiEnv } from "../../workers/stats-api/src/index";
import { collectWithStats } from "../../workers/stats-collector/src/index";
import type { CollectorEnv } from "../../workers/stats-collector/src/index";

// =============================================================================
// Types
// =============================================================================

/**
 * Combined environment bindings for the unified worker.
 * Extends both StatsApiEnv and CollectorEnv.
 */
export interface Env extends StatsApiEnv, CollectorEnv {}

// =============================================================================
// Worker Export
// =============================================================================

export default {
  /**
   * Fetch handler - stats API routes + admin endpoints.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/collect" && request.method === "POST") {
      try {
        const result = await collectWithStats(env);
        return Response.json({ status: "collected", ...result });
      } catch (error) {
        return Response.json(
          { status: "error", message: error instanceof Error ? error.message : String(error) },
          { status: 500 },
        );
      }
    }

    return statsApi.fetch(request, env);
  },

  /**
   * Scheduled handler for cron-triggered stats collection.
   * Runs daily at 02:00 UTC per wrangler.toml [triggers].
   */
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(collectWithStats(env));
  },
};
