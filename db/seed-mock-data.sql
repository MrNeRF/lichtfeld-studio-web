-- =============================================================================
-- Mock Data Seed for Development/Testing
-- =============================================================================
--
-- Generates ~2 years of realistic download statistics for testing the
-- statistics page without real GitHub release data.
--
-- Usage:
--   pnpm run db:seed
--
-- This creates:
--   - 4 releases (v0.8.0, v0.9.0, v1.0.0, v1.1.0)
--   - Daily snapshots for the last 90 days
--   - Weekly aggregates for the last 6 months
--   - Monthly aggregates for the last 2 years
--
-- The data simulates realistic adoption patterns:
--   - New versions spike on release then settle
--   - Older versions decline as users migrate to newer versions
--   - Latest stable version has the most activity
-- =============================================================================

-- Clear existing data
DELETE FROM downloads_monthly;
DELETE FROM downloads_weekly;
DELETE FROM downloads_daily;
DELETE FROM releases;

-- =============================================================================
-- Insert Releases
-- =============================================================================

INSERT INTO releases (id, tag, name, total_downloads, first_seen, last_updated) VALUES
    (1, 'v0.8.0', 'LichtFeld Studio v0.8.0 - Initial Release', 2450, strftime('%s', 'now', '-24 months') * 1000, strftime('%s', 'now') * 1000),
    (2, 'v0.9.0', 'LichtFeld Studio v0.9.0 - Performance Update', 5820, strftime('%s', 'now', '-18 months') * 1000, strftime('%s', 'now') * 1000),
    (3, 'v1.0.0', 'LichtFeld Studio v1.0.0 - Stable Release', 12350, strftime('%s', 'now', '-12 months') * 1000, strftime('%s', 'now') * 1000),
    (4, 'v1.1.0', 'LichtFeld Studio v1.1.0 - Feature Update', 8430, strftime('%s', 'now', '-6 months') * 1000, strftime('%s', 'now') * 1000);

-- =============================================================================
-- Generate Daily Data (last 90 days)
-- At this point: v0.8.0 and v0.9.0 are nearly dead, v1.0.0 is declining, v1.1.0 is dominant
-- =============================================================================

WITH RECURSIVE dates(day_offset) AS (
    SELECT 89
    UNION ALL
    SELECT day_offset - 1 FROM dates WHERE day_offset > 0
),
daily_data AS (
    SELECT
        (strftime('%s', 'now', 'start of day', '-' || day_offset || ' days') * 1000) as date_ts,
        day_offset
    FROM dates
)
INSERT INTO downloads_daily (date, release_id, count)
SELECT
    date_ts,
    1 as release_id,
    -- v0.8.0: Nearly dead, only 2-5 downloads per day (legacy users)
    2 + ABS(RANDOM() % 4) as count
FROM daily_data
UNION ALL
SELECT
    date_ts,
    2 as release_id,
    -- v0.9.0: Very low activity, 5-12 downloads per day
    5 + ABS(RANDOM() % 8) as count
FROM daily_data
UNION ALL
SELECT
    date_ts,
    3 as release_id,
    -- v1.0.0: Declining as users move to v1.1.0, 40-80 per day trending down
    CAST(80 - (90 - day_offset) * 0.4 + ABS(RANDOM() % 20) AS INTEGER) as count
FROM daily_data
UNION ALL
SELECT
    date_ts,
    4 as release_id,
    -- v1.1.0: Dominant, 150-250 downloads per day, slight upward trend
    CAST(150 + (90 - day_offset) * 0.8 + ABS(RANDOM() % 50) AS INTEGER) as count
FROM daily_data;

-- =============================================================================
-- Generate Weekly Data (last 26 weeks / ~6 months)
-- Shows v1.1.0 release impact: spike then settle, v1.0.0 declining
-- =============================================================================

WITH RECURSIVE weeks(week_offset) AS (
    SELECT 25
    UNION ALL
    SELECT week_offset - 1 FROM weeks WHERE week_offset > 0
),
weekly_data AS (
    SELECT
        (strftime('%s', 'now', 'weekday 1', '-7 days', '-' || (week_offset * 7) || ' days') * 1000) as week_ts,
        week_offset
    FROM weeks
)
INSERT INTO downloads_weekly (week, release_id, count)
SELECT
    week_ts,
    1 as release_id,
    -- v0.8.0: ~15-25 downloads per week (minimal legacy usage)
    15 + ABS(RANDOM() % 12) as count
FROM weekly_data
UNION ALL
SELECT
    week_ts,
    2 as release_id,
    -- v0.9.0: ~40-70 downloads per week
    40 + ABS(RANDOM() % 35) as count
FROM weekly_data
UNION ALL
SELECT
    week_ts,
    3 as release_id,
    -- v1.0.0: Was dominant, now declining. 600 -> 400 over 6 months
    CASE
        WHEN week_offset > 20 THEN 550 + ABS(RANDOM() % 100)  -- Before v1.1.0 took over
        WHEN week_offset > 12 THEN 450 + ABS(RANDOM() % 80)   -- Transition period
        ELSE 350 + ABS(RANDOM() % 60)                          -- Current (lower)
    END as count
FROM weekly_data
UNION ALL
SELECT
    week_ts,
    4 as release_id,
    -- v1.1.0: Released 6 months ago, spiked then settled high
    CASE
        WHEN week_offset > 22 THEN 800 + ABS(RANDOM() % 200)   -- Initial release spike
        WHEN week_offset > 16 THEN 1000 + ABS(RANDOM() % 250)  -- Peak adoption
        WHEN week_offset > 8 THEN 1200 + ABS(RANDOM() % 200)   -- Settling high
        ELSE 1400 + ABS(RANDOM() % 300)                        -- Current dominant
    END as count
FROM weekly_data;

-- =============================================================================
-- Generate Monthly Data (last 24 months / 2 years)
-- Shows full lifecycle: release -> growth -> peak -> decline as newer versions arrive
-- =============================================================================

WITH RECURSIVE months(month_offset) AS (
    SELECT 23
    UNION ALL
    SELECT month_offset - 1 FROM months WHERE month_offset > 0
),
monthly_data AS (
    SELECT
        (strftime('%s', 'now', 'start of month', '-' || month_offset || ' months') * 1000) as month_ts,
        month_offset
    FROM months
)
INSERT INTO downloads_monthly (month, release_id, count)
SELECT
    month_ts,
    1 as release_id,
    -- v0.8.0: Started 24 months ago
    -- Peak at months 20-18, declined when v0.9.0 released, nearly dead now
    CASE
        WHEN month_offset >= 22 THEN 150 + ABS(RANDOM() % 50)   -- Initial release
        WHEN month_offset >= 18 THEN 300 + ABS(RANDOM() % 80)   -- Peak before v0.9.0
        WHEN month_offset >= 12 THEN 120 + ABS(RANDOM() % 40)   -- Declining (v0.9.0 out)
        WHEN month_offset >= 6 THEN 60 + ABS(RANDOM() % 25)     -- Low (v1.0.0 out)
        ELSE 20 + ABS(RANDOM() % 15)                             -- Nearly dead
    END as count
FROM monthly_data
UNION ALL
SELECT
    month_ts,
    2 as release_id,
    -- v0.9.0: Started 18 months ago
    -- Peak at months 15-12, declined when v1.0.0 released
    CASE
        WHEN month_offset > 18 THEN 0                            -- Not released yet
        WHEN month_offset >= 15 THEN 400 + ABS(RANDOM() % 100)   -- Initial adoption
        WHEN month_offset >= 12 THEN 600 + ABS(RANDOM() % 120)   -- Peak before v1.0.0
        WHEN month_offset >= 6 THEN 200 + ABS(RANDOM() % 60)     -- Declining (v1.0.0 out)
        ELSE 80 + ABS(RANDOM() % 30)                              -- Low activity
    END as count
FROM monthly_data
UNION ALL
SELECT
    month_ts,
    3 as release_id,
    -- v1.0.0: Started 12 months ago (stable release = big adoption)
    -- Peak at months 8-6, declining since v1.1.0 released
    CASE
        WHEN month_offset > 12 THEN 0                             -- Not released yet
        WHEN month_offset >= 9 THEN 1200 + ABS(RANDOM() % 300)    -- Big initial adoption
        WHEN month_offset >= 6 THEN 1800 + ABS(RANDOM() % 400)    -- Peak popularity
        WHEN month_offset >= 3 THEN 1200 + ABS(RANDOM() % 250)    -- Declining (v1.1.0 out)
        ELSE 800 + ABS(RANDOM() % 150)                             -- Current (still popular)
    END as count
FROM monthly_data
UNION ALL
SELECT
    month_ts,
    4 as release_id,
    -- v1.1.0: Started 6 months ago, now dominant
    CASE
        WHEN month_offset > 6 THEN 0                              -- Not released yet
        WHEN month_offset >= 4 THEN 2000 + ABS(RANDOM() % 500)    -- Big release spike
        WHEN month_offset >= 2 THEN 2800 + ABS(RANDOM() % 600)    -- Rapid adoption
        ELSE 3500 + ABS(RANDOM() % 800)                            -- Current dominant
    END as count
FROM monthly_data;

-- =============================================================================
-- Verify the data
-- =============================================================================

SELECT 'Releases:' as info, COUNT(*) as count FROM releases
UNION ALL
SELECT 'Daily records:', COUNT(*) FROM downloads_daily
UNION ALL
SELECT 'Weekly records:', COUNT(*) FROM downloads_weekly
UNION ALL
SELECT 'Monthly records:', COUNT(*) FROM downloads_monthly;
