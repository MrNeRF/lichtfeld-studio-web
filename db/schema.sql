-- =============================================================================
-- LichtFeld Studio - Download Statistics Schema
-- =============================================================================

-- Release metadata with lifetime statistics
CREATE TABLE IF NOT EXISTS releases (
    id INTEGER PRIMARY KEY,            -- Auto-increment ID
    tag TEXT NOT NULL UNIQUE,          -- e.g., "v1.0.0"
    name TEXT,                         -- e.g., "LichtFeld Studio v1.0.0"
    total_downloads INTEGER DEFAULT 0, -- Lifetime download count (updated on each collection)
    first_seen INTEGER,                -- Unix timestamp when release was first tracked
    last_updated INTEGER               -- Unix timestamp of last update
);

-- Daily snapshots (cumulative count)
CREATE TABLE IF NOT EXISTS downloads_daily (
    date INTEGER NOT NULL,             -- Unix timestamp (start of day UTC)
    release_id INTEGER NOT NULL,       -- FK to releases.id
    count INTEGER NOT NULL,
    PRIMARY KEY (date, release_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_date ON downloads_daily(date);
CREATE INDEX IF NOT EXISTS idx_daily_release_date ON downloads_daily(release_id, date);

-- Weekly aggregates (delta)
CREATE TABLE IF NOT EXISTS downloads_weekly (
    week INTEGER NOT NULL,             -- Unix timestamp (Monday 00:00 UTC)
    release_id INTEGER NOT NULL,       -- FK to releases.id
    count INTEGER NOT NULL,
    PRIMARY KEY (week, release_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_week ON downloads_weekly(week);
CREATE INDEX IF NOT EXISTS idx_weekly_release_week ON downloads_weekly(release_id, week);

-- Monthly aggregates (delta)
CREATE TABLE IF NOT EXISTS downloads_monthly (
    month INTEGER NOT NULL,            -- Unix timestamp (1st 00:00 UTC)
    release_id INTEGER NOT NULL,       -- FK to releases.id
    count INTEGER NOT NULL,
    PRIMARY KEY (month, release_id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_month ON downloads_monthly(month);
CREATE INDEX IF NOT EXISTS idx_monthly_release_month ON downloads_monthly(release_id, month);
