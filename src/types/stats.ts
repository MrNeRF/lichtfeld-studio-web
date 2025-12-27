/**
 * stats.ts
 *
 * Types for download statistics API.
 */

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Response from GET /api/stats.
 */
export interface StatsResponse {
    totals: {
        allTime: number;
        last7Days: number;
        last30Days: number;
        last90Days: number;
    };
    releases: Array<{
        tag: string;
        name: string;
        downloads: number;
    }>;
    timeSeries: {
        daily: Array<{ date: number; downloads: number }>;
        weekly: Array<{ week: number; downloads: number }>;
        monthly: Array<{ month: number; downloads: number }>;
    };
}
