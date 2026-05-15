import { proxiedFetch } from "@/backend/helpers/fetch";
import { conf } from "@/setup/config";
import { usePreferencesStore } from "@/stores/preferences";

export interface FemboxSource {
  url: string;
  quality: string;
  type?: string;
}

export interface FemboxSubtitle {
  language: string;
  url: string;
  name?: string;
}

export interface FemboxResponse {
  sources: FemboxSource[];
  subtitles: FemboxSubtitle[];
}

// Legacy interface for backwards compatibility
export interface FemboxStream {
  url: string;
  quality: string;
  name: string;
  speed: string;
  size: string;
}

// FebBox/Fembox CDN headers required for playback — must be sent with every
// manifest request and with every HLS segment request.
const FEMBOX_HEADERS = {
  Referer: "https://www.febbox.com/",
  Origin: "https://www.febbox.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
};

/**
 * Scrape movie from Fembox API (fembox.aether.mom)
 */
export async function scrapeFemboxMovie(
  tmdbId: string,
  turnstileToken?: string,
): Promise<FemboxResponse | null> {
  const userToken = usePreferencesStore.getState().febboxKey;
  const sharedToken = conf().VITE_DEFAULT_FEBBOX_KEY;

  // Use user's token if available, otherwise use shared token
  const febboxKey = userToken || sharedToken;

  if (!febboxKey) {
    return null;
  }

  const url = `https://fembox.aether.mom/movie/${tmdbId}?ui=${febboxKey}${turnstileToken ? `&turnstile_token=${turnstileToken}` : ""}`;

  try {
    const data = await proxiedFetch<FemboxResponse>(url, {});
    if (data && data.sources && data.sources.length > 0) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Scrape TV show episode from Fembox API (fembox.aether.mom)
 */
export async function scrapeFemboxTV(
  tmdbId: string,
  season: number,
  episode: number,
  turnstileToken?: string,
): Promise<FemboxResponse | null> {
  const userToken = usePreferencesStore.getState().febboxKey;
  const sharedToken = conf().VITE_DEFAULT_FEBBOX_KEY;

  const febboxKey = userToken || sharedToken;

  if (!febboxKey) {
    return null;
  }

  const url = `https://fembox.aether.mom/tv/${tmdbId}-${season}-${episode}?ui=${febboxKey}${turnstileToken ? `&turnstile_token=${turnstileToken}` : ""}`;

  try {
    const data = await proxiedFetch<FemboxResponse>(url, {});
    if (data && data.sources && data.sources.length > 0) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert a Fembox API response to the internal stream format.
 *
 * FebBox CDN streams are almost always HLS (.m3u8) and require specific
 * Referer/Origin headers.  Previously the converter wrapped them inside a
 * "file" type with qualities, which silently dropped the headers and caused
 * HLS.js to fail with a "humanity verification" error because the CDN saw
 * requests without the correct Referer.
 *
 * Fix: if the best available source is HLS, return it as `type: "hls"` with
 * the full headers object.  The player's base.ts will then pass those headers
 * to the extension domain-rule so every segment request carries them.
 * If all sources happen to be MP4 we fall back to the "file" approach.
 */
export function convertFemboxToStream(femboxData: FemboxResponse) {
  if (!femboxData || !femboxData.sources || femboxData.sources.length === 0) {
    return null;
  }

  // Sort by quality — 4K first
  const qualityOrder: Record<string, number> = {
    "4K": 4,
    "2160p": 4,
    "1080p": 3,
    "1080": 3,
    "720p": 2,
    "720": 2,
    "480p": 1,
    "480": 1,
  };

  const sortedSources = [...femboxData.sources].sort((a, b) => {
    const aQ = qualityOrder[a.quality] ?? 0;
    const bQ = qualityOrder[b.quality] ?? 0;
    return bQ - aQ;
  });

  const primarySource = sortedSources[0];

  // Build captions
  const captions = (femboxData.subtitles || []).map((sub) => ({
    id: sub.language,
    url: sub.url,
    type: "vtt" as const,
    hasCorsRestrictions: true,
    language: sub.language,
  }));

  // ── HLS path ────────────────────────────────────────────────────────────────
  // Return as a proper "hls" stream so the player passes headers to HLS.js and
  // the extension domain-rule attaches them to every segment request.
  if (primarySource.url.includes(".m3u8")) {
    return {
      type: "hls" as const,
      playlist: primarySource.url,
      headers: FEMBOX_HEADERS,
      flags: [],
      captions,
    };
  }

  // ── MP4 / file path ─────────────────────────────────────────────────────────
  const mapQuality = (q: string): string => {
    if (q.includes("4K") || q.includes("2160")) return "4k";
    if (q.includes("1080")) return "1080";
    if (q.includes("720")) return "720";
    if (q.includes("480")) return "480";
    if (q.includes("360")) return "360";
    return "unknown";
  };

  const qualities: Record<string, { type: "mp4" | "hls"; url: string }> = {};
  for (const source of sortedSources) {
    const quality = mapQuality(source.quality);
    if (!qualities[quality]) {
      qualities[quality] = {
        type: source.url.includes(".m3u8") ? ("hls" as const) : ("mp4" as const),
        url: source.url,
      };
    }
  }

  if (Object.keys(qualities).length === 0) {
    qualities.unknown = { type: "mp4" as const, url: primarySource.url };
  }

  return {
    type: "file" as const,
    id: "fembox",
    flags: [],
    qualities,
    headers: FEMBOX_HEADERS,
    captions,
  };
}
