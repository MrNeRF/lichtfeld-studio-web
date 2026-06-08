/**
 * Small wrapper around Rybbit custom events.
 *
 * Rybbit exposes `window.rybbit.event(name, properties)`. This helper keeps
 * event names consistent and keeps analytics failures away from page behavior.
 */

export const ANALYTICS_EVENTS = {
  ctaClicked: "cta_clicked",
  sectionViewed: "section_viewed",
  outboundLinkClicked: "outbound_link_clicked",
  contributionPathClicked: "contribution_path_clicked",
  donationAmountSelected: "donation_amount_selected",
  donationProviderSelected: "donation_provider_selected",
  showcaseBrowseToggled: "showcase_browse_toggled",
  showcaseFullscreenToggled: "showcase_fullscreen_toggled",
  showcaseHelpOpened: "showcase_help_opened",
  showcaseSceneSelected: "showcase_scene_selected",
  showcaseShared: "showcase_shared",
  viewerFirstFrame: "viewer_first_frame",
  viewerError: "viewer_error",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsProperties = Record<string, string | number>;

type AnalyticsDataset = Record<string, string | undefined>;

interface PendingAnalyticsEvent {
  /** Stable event name shown in Rybbit. */
  name: AnalyticsEventName | string;

  /** Optional dimensions used for filtering in Rybbit. */
  properties?: AnalyticsProperties;
}

declare global {
  interface RybbitAnalytics {
    /** Tracks a custom event in Rybbit. */
    event: (name: string, properties?: AnalyticsProperties) => void;
  }

  interface Window {
    /** Rybbit global created by the deferred tracking script. */
    rybbit?: RybbitAnalytics;
  }
}

const ANALYTICS_PROP_PREFIX = "analyticsProp";
const MAX_PENDING_EVENTS = 50;
const MAX_FLUSH_ATTEMPTS = 40;
const FLUSH_RETRY_MS = 250;

let pendingEvents: PendingAnalyticsEvent[] = [];
let flushAttempts = 0;
let flushTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Reads the Rybbit global from `globalThis` so tests can mock it without a DOM.
 */
function getRybbit(): RybbitAnalytics | undefined {
  const analyticsGlobal = globalThis as typeof globalThis & {
    rybbit?: RybbitAnalytics;
  };

  return analyticsGlobal.rybbit;
}

/**
 * Converts `data-analytics-prop-*` attributes into Rybbit event properties.
 *
 * @param dataset - Element dataset or test double with dataset-style keys.
 */
export function getAnalyticsPropertiesFromDataset(dataset: AnalyticsDataset): AnalyticsProperties {
  const properties: AnalyticsProperties = {};

  Object.entries(dataset).forEach(([key, value]) => {
    if (!key.startsWith(ANALYTICS_PROP_PREFIX) || value === undefined || value === "") {
      return;
    }

    const rawName = key.slice(ANALYTICS_PROP_PREFIX.length);

    if (!rawName) {
      return;
    }

    const propertyName = `${rawName.charAt(0).toLowerCase()}${rawName.slice(1)}`;
    properties[propertyName] = value;
  });

  return properties;
}

/**
 * Schedules another attempt to flush events captured before Rybbit loaded.
 */
function scheduleFlush(): void {
  if (flushTimer || flushAttempts >= MAX_FLUSH_ATTEMPTS) {
    return;
  }

  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    flushAttempts += 1;
    flushPendingEvents();
  }, FLUSH_RETRY_MS);
}

/**
 * Sends queued events once the deferred Rybbit script has created `window.rybbit`.
 */
function flushPendingEvents(): void {
  const rybbit = getRybbit();

  if (!rybbit) {
    if (flushAttempts >= MAX_FLUSH_ATTEMPTS) {
      pendingEvents = [];

      return;
    }

    scheduleFlush();

    return;
  }

  const eventsToFlush = pendingEvents;
  pendingEvents = [];

  try {
    eventsToFlush.forEach((event) => {
      rybbit.event(event.name, event.properties);
    });
  } catch {
    /* Analytics must never block page behavior. */
  }
}

/**
 * Sends a custom event to Rybbit when the analytics script is available.
 *
 * @param name - Stable event name shown in Rybbit.
 * @param properties - Optional string/number dimensions for filtering.
 */
export function trackEvent(name: AnalyticsEventName | string, properties?: AnalyticsProperties): void {
  try {
    const rybbit = getRybbit();

    if (rybbit) {
      rybbit.event(name, properties);

      return;
    }

    if (pendingEvents.length < MAX_PENDING_EVENTS) {
      pendingEvents.push({ name, properties });
      scheduleFlush();
    }
  } catch {
    /* Analytics must never block page behavior. */
  }
}
