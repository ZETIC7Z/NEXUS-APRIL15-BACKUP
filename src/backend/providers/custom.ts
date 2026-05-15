import * as cheerio from "cheerio";
import CryptoJS from "crypto-js";
import slugify from "slugify";

import {
  EmbedScrapeContext,
  MovieScrapeContext,
  NotFoundError,
  ShowScrapeContext,
  SourcererOutput,
} from "@p-stream/providers";

// --- Local wrappers ---

function makeSourcerer(state: any): any {
  const mediaTypes: string[] = [];
  if (state.scrapeMovie) mediaTypes.push("movie");
  if (state.scrapeShow) mediaTypes.push("show");
  return {
    ...state,
    type: "source",
    disabled: state.disabled ?? false,
    externalSource: state.externalSource ?? false,
    mediaTypes,
  };
}

function makeEmbed(state: any): any {
  return {
    ...state,
    type: "embed",
    disabled: state.disabled ?? false,
    mediaTypes: undefined,
  };
}

// --- Shared Utilities ---

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Stubs for removed anime scrapers
export const zetAnimeScraper = null as any;
export const allAnimeScraper = null as any;

// --- VidLink Scraper ---

const API_BASE = "https://enc-dec.app/api";
const VIDLINK_BASE = "https://vidlink.pro/api/b";

const vidlinkHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  Connection: "keep-alive",
  Referer: "https://vidlink.pro/",
  Origin: "https://vidlink.pro",
};

async function encryptTmdbId(
  ctx: MovieScrapeContext | ShowScrapeContext,
  tmdbId: string,
): Promise<string> {
  const response = await ctx.proxiedFetcher<{ result: string }>(
    `${API_BASE}/enc-vidlink`,
    { method: "GET", query: { text: tmdbId } },
  );
  if (!response?.result) throw new NotFoundError("Failed to encrypt TMDB ID");
  return response.result;
}

async function comboScraper(
  ctx: ShowScrapeContext | MovieScrapeContext,
): Promise<SourcererOutput> {
  const { tmdbId } = ctx.media;
  ctx.progress(10);
  const encryptedId = await encryptTmdbId(ctx, tmdbId.toString());
  ctx.progress(30);
  const apiUrl =
    ctx.media.type === "movie"
      ? `${VIDLINK_BASE}/movie/${encryptedId}`
      : `${VIDLINK_BASE}/tv/${encryptedId}/${ctx.media.season.number}/${ctx.media.episode.number}`;

  const vidlinkRaw = await ctx.proxiedFetcher<any>(apiUrl, { headers: vidlinkHeaders });
  if (!vidlinkRaw) throw new NotFoundError("No response from vidlink API");
  ctx.progress(60);
  const vidlinkData = typeof vidlinkRaw === "string" ? JSON.parse(vidlinkRaw) : vidlinkRaw;
  ctx.progress(80);
  if (!vidlinkData.stream) throw new NotFoundError("No stream data");

  const { stream } = vidlinkData;
  const captions: any[] = (stream.captions || []).map((c: any) => ({
    id: c.id || c.url,
    url: c.url,
    language: c.language || "Unknown",
    type: c.type === "srt" ? "srt" : "vtt",
    hasCorsRestrictions: c.hasCorsRestrictions || false,
  }));

  return {
    embeds: [],
    stream: [
      {
        id: stream.id || "primary",
        type: stream.type || "file",
        qualities: stream.qualities || {},
        playlist: stream.playlist,
        captions,
        flags: [],
        headers: stream.headers || vidlinkHeaders,
      },
    ],
  };
}

export const vidlinkScraper = makeSourcerer({
  id: "vidlink-custom",
  name: "VidLink \uD83D\uDD25",
  rank: 890,
  disabled: false,
  flags: [],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});

// Stub — built-in rgshows handles this
export const rgshowsScraper = null as any;

// --- YesMovies Scraper ---

export const yesmoviesScraper = makeSourcerer({
  id: "yesmovies-custom",
  name: "YesMovies",
  rank: 870,
  flags: [],
  scrapeMovie: async (ctx: MovieScrapeContext) => {
    const res = await ctx.proxiedFetcher<any>(
      `https://api.1anime.app/yesmovies/watch/${ctx.media.tmdbId}`,
    );
    if (!res?.url) throw new NotFoundError("No stream found");
    return {
      embeds: [],
      stream: [{ id: "primary", type: "hls", playlist: res.url, headers: res.headers || {}, flags: [], captions: [] }],
    };
  },
  scrapeShow: async (ctx: ShowScrapeContext) => {
    const res = await ctx.proxiedFetcher<any>(
      `https://api.1anime.app/yesmovies/watch/${ctx.media.tmdbId}/${ctx.media.season.number}/${ctx.media.episode.number}`,
    );
    if (!res?.url) throw new NotFoundError("No stream found");
    return {
      embeds: [],
      stream: [{ id: "primary", type: "hls", playlist: res.url, headers: res.headers || {}, flags: [], captions: [] }],
    };
  },
});

// --- VidRock Scraper ---

const VIDROCK_PASSPHRASE = "x7k9mPqT2rWvY8zA5bC3nF6hJ2lK4mN9";

export const vidrockScraper = makeSourcerer({
  id: "vidrock-custom",
  name: "VidRock",
  rank: 860,
  flags: [],
  scrapeMovie: async (ctx: MovieScrapeContext) => {
    const key = CryptoJS.enc.Utf8.parse(VIDROCK_PASSPHRASE);
    const iv = CryptoJS.enc.Utf8.parse(VIDROCK_PASSPHRASE.substring(0, 16));
    const encrypted = CryptoJS.AES.encrypt(ctx.media.tmdbId.toString(), key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const encryptedBase64 = encrypted.ciphertext
      .toString(CryptoJS.enc.Base64)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const res = await ctx.proxiedFetcher<any>(
      `https://vidrock.net/api/movie/${encodeURIComponent(encryptedBase64)}`,
      {
        headers: {
          Referer: "https://vidrock.net/",
          Origin: "https://vidrock.net",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        },
      },
    );
    const streamUrl = res?.Atlas?.url || res?.url || res?.stream?.url;
    if (!streamUrl) throw new NotFoundError("No stream found");
    return {
      embeds: [],
      stream: [{ id: "primary", type: "hls", playlist: streamUrl, headers: { Referer: "https://vidrock.net/" }, flags: [], captions: [] }],
    };
  },
  scrapeShow: async (ctx: ShowScrapeContext) => {
    const key = CryptoJS.enc.Utf8.parse(VIDROCK_PASSPHRASE);
    const iv = CryptoJS.enc.Utf8.parse(VIDROCK_PASSPHRASE.substring(0, 16));
    const itemId = `${ctx.media.tmdbId}_${ctx.media.season.number}_${ctx.media.episode.number}`;
    const encrypted = CryptoJS.AES.encrypt(itemId, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const encryptedBase64 = encrypted.ciphertext
      .toString(CryptoJS.enc.Base64)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const res = await ctx.proxiedFetcher<any>(
      `https://vidrock.net/api/show/${encodeURIComponent(encryptedBase64)}`,
      {
        headers: {
          Referer: "https://vidrock.net/",
          Origin: "https://vidrock.net",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        },
      },
    );
    const streamUrl = res?.Atlas?.url || res?.url || res?.stream?.url;
    if (!streamUrl) throw new NotFoundError("No stream found");
    return {
      embeds: [],
      stream: [{ id: "primary", type: "hls", playlist: streamUrl, headers: { Referer: "https://vidrock.net/" }, flags: [], captions: [] }],
    };
  },
});

// Stubs for removed anime scrapers
export const animekaiEmbed = null as any;
export const animekaiScraper = null as any;
export const watchanimeworldScraper = null as any;

// --- Tugaflix Scraper (Streamtape) ---
// Searches tugaflix.best for the movie/show, extracts Streamtape embed, returns stream.

const TUGAFLIX_BASE = "https://tugaflix.best";

async function scrapeTugaflixMovie(ctx: MovieScrapeContext): Promise<SourcererOutput> {
  const slug = normalizeTitle(ctx.media.title);
  const searchUrl = `${TUGAFLIX_BASE}/?s=${encodeURIComponent(ctx.media.title)}`;
  const searchRes = await ctx.proxiedFetcher.full(searchUrl, {
    headers: { Referer: TUGAFLIX_BASE },
  });
  const $ = cheerio.load(searchRes.body);

  let movieUrl: string | undefined;
  $("article a[href]").each((_: any, el: any) => {
    if (movieUrl) return;
    const href = $(el).attr("href") || "";
    const hrefSlug = href.toLowerCase();
    if (hrefSlug.includes(slug) || (ctx.media.releaseYear && hrefSlug.includes(String(ctx.media.releaseYear)))) {
      movieUrl = href;
    }
  });

  if (!movieUrl) throw new NotFoundError("Tugaflix: movie page not found");
  return scrapeTugaflixPage(ctx, movieUrl);
}

async function scrapeTugaflixShow(ctx: ShowScrapeContext): Promise<SourcererOutput> {
  const slug = normalizeTitle(ctx.media.title);
  const searchUrl = `${TUGAFLIX_BASE}/?s=${encodeURIComponent(ctx.media.title)}`;
  const searchRes = await ctx.proxiedFetcher.full(searchUrl, {
    headers: { Referer: TUGAFLIX_BASE },
  });
  const $ = cheerio.load(searchRes.body);

  let showUrl: string | undefined;
  $("article a[href]").each((_: any, el: any) => {
    if (showUrl) return;
    const href = $(el).attr("href") || "";
    if (href.toLowerCase().includes(slug)) showUrl = href;
  });

  if (!showUrl) throw new NotFoundError("Tugaflix: show page not found");

  const sNum = String(ctx.media.season.number).padStart(2, "0");
  const eNum = String(ctx.media.episode.number).padStart(2, "0");
  const episodeUrl = `${showUrl.replace(/\/$/, "")}/s${sNum}e${eNum}/`;

  return scrapeTugaflixPage(ctx, episodeUrl);
}

async function scrapeTugaflixPage(
  ctx: MovieScrapeContext | ShowScrapeContext,
  pageUrl: string,
): Promise<SourcererOutput> {
  const res = await ctx.proxiedFetcher.full(pageUrl, {
    headers: { Referer: TUGAFLIX_BASE },
  });
  const $ = cheerio.load(res.body);

  let streamtapeUrl: string | undefined;
  $("iframe[src]").each((_: any, el: any) => {
    const src = $(el).attr("src") || "";
    if (src.includes("streamtape") || src.includes("streamtp")) {
      streamtapeUrl = src.startsWith("//") ? `https:${src}` : src;
    }
  });

  if (!streamtapeUrl) throw new NotFoundError("Tugaflix: Streamtape embed not found");

  // Fetch the Streamtape embed page
  const stRes = await ctx.proxiedFetcher.full(streamtapeUrl, {
    headers: {
      Referer: pageUrl,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
    },
  });
  const stHtml = stRes.body as string;

  // Streamtape obfuscation: the /get_video URL is split across two JS string parts.
  // Pattern: robotlink innerHTML = "//streamtape.com/get_video?..." + "token-suffix"
  // Or: innerHTML = "..." + document.getElementById('...').innerHTML
  let getVideoPath: string | undefined;

  // Modern pattern: two adjacent string literals joined with +
  const twoPartMatch = stHtml.match(
    /innerHTML\s*=\s*"([^"]+)"\s*\+\s*"([^"]+)"/
  );
  if (twoPartMatch) {
    getVideoPath = twoPartMatch[1] + twoPartMatch[2];
  }

  // Older robotlink pattern
  if (!getVideoPath) {
    const robotMatch = stHtml.match(
      /id="robotlink"[^>]*>([^<]+)<\/[^>]+>\s*<[^>]+>'\s*\+\s*'([^']+)'/s
    );
    if (robotMatch) {
      getVideoPath = robotMatch[1].trim() + robotMatch[2].trim();
    }
  }

  // Fallback: look for get_video path directly in script
  if (!getVideoPath) {
    const directMatch = stHtml.match(/(\/get_video\?[^"'\s&]+(?:&[^"'\s]+)*)/i);
    if (directMatch) {
      getVideoPath = directMatch[1];
    }
  }

  if (!getVideoPath) throw new NotFoundError("Tugaflix: could not extract Streamtape video path");

  // Build the full get_video URL (normalise leading //)
  const getVideoUrl = getVideoPath.startsWith("//")
    ? `https:${getVideoPath}`
    : getVideoPath.startsWith("/")
    ? `https://streamtape.com${getVideoPath}`
    : getVideoPath;

  // Follow the 302 redirect to the real tapecontent.net MP4
  // Streamtape redirects /get_video → final CDN MP4 — follow with proxied fetcher
  const redirectRes = await ctx.proxiedFetcher.full(getVideoUrl, {
    headers: {
      Referer: "https://streamtape.com/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
    },
  });
  // finalUrl is the redirected CDN URL (tapecontent.net)
  const finalMp4 = redirectRes.finalUrl || getVideoUrl;

  return {
    embeds: [],
    stream: [
      {
        id: "primary",
        type: "file",
        qualities: {
          unknown: { type: "mp4", url: finalMp4 },
        },
        headers: {
          Referer: "https://streamtape.com/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
        },
        flags: [],
        captions: [],
      },
    ],
  };
}

export const tugaflixScraper = makeSourcerer({
  id: "tugaflix-custom",
  name: "Tugaflix 🔥",
  rank: 806,
  flags: [],
  scrapeMovie: scrapeTugaflixMovie,
  scrapeShow: scrapeTugaflixShow,
});

// --- ZeticuzApi Scraper (GoatAPI Lightning + FebBox) ---
// Lightning: { success, streams:[{source, type:"hls", url, quality, referer}] }
// GoatAPI supports CORS (*) — fetch directly (no proxy), wrap m3u8 through GoatAPI /api/proxy.
// FebBox fallback: { success, streams:[{quality,url,codec}] }
// Token shared with FebBox 4K: Settings febboxKey OR .env VITE_DEFAULT_FEBBOX_KEY

const GOATAPI_BASE = "https://goatapi.imreallydagoatt.workers.dev";

function getZeticuzToken(): string {
  try {
    const prefData =
      typeof window !== "undefined"
        ? window.localStorage.getItem("__MW::preferences")
        : null;
    if (prefData) {
      const parsed = JSON.parse(prefData);
      const token =
        parsed?.state?.febboxKey || parsed?.state?.preferences?.febboxKey;
      if (token) return token;
    }
  } catch {
    // fall through
  }
  return import.meta.env.VITE_DEFAULT_FEBBOX_KEY || "";
}

// Wrap m3u8 URL through GoatAPI proxy (same method as their own player)
function goatProxyUrl(url: string, referer: string): string {
  return `${GOATAPI_BASE}/api/proxy?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer)}`;
}

async function zeticuzApiLogic(
  ctx: MovieScrapeContext | ShowScrapeContext,
): Promise<SourcererOutput> {
  const { tmdbId } = ctx.media;
  const isMovie = ctx.media.type === "movie";
  const showCtx = ctx as ShowScrapeContext;

  // Lightning: no token needed, GoatAPI has CORS(*) so use direct fetch
  const lightningUrl = isMovie
    ? `${GOATAPI_BASE}/api/lightning/movie/${tmdbId}`
    : `${GOATAPI_BASE}/api/lightning/tv/${tmdbId}/${showCtx.media.season.number}/${showCtx.media.episode.number}`;

  try {
    // Use proxiedFetcher first, fall back to direct fetch if it fails
    let data: any = null;
    try {
      data = await ctx.proxiedFetcher<any>(lightningUrl);
    } catch {
      // proxied fetch failed — try direct (GoatAPI has CORS *)
      const res = await fetch(lightningUrl);
      data = await res.json();
    }

    if (data?.success && Array.isArray(data.streams)) {
      for (const s of data.streams) {
        if (s?.url && (s.type === "hls" || s.url.includes(".m3u8"))) {
          const referer = s.referer || "https://goatapi.imreallydagoatt.workers.dev/";
          // Use GoatAPI's own proxy for the m3u8 so segments load correctly
          const proxiedPlaylist = goatProxyUrl(s.url, referer);
          return {
            embeds: [],
            stream: [
              {
                id: "primary",
                type: "hls",
                playlist: proxiedPlaylist,
                headers: {
                  Referer: "https://goatapi.imreallydagoatt.workers.dev/",
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
                },
                flags: [],
                captions: [],
              },
            ],
          };
        }
      }
    }
  } catch {
    // lightning failed — try febbox
  }

  // FebBox fallback (requires token, higher quality)
  const token = getZeticuzToken();
  if (token) {
    const febboxUrl = isMovie
      ? `${GOATAPI_BASE}/api/febbox/movie/${tmdbId}?token=${encodeURIComponent(token)}`
      : `${GOATAPI_BASE}/api/febbox/tv/${tmdbId}/${showCtx.media.season.number}/${showCtx.media.episode.number}?token=${encodeURIComponent(token)}`;
    try {
      let fb: any = null;
      try {
        fb = await ctx.proxiedFetcher<any>(febboxUrl);
      } catch {
        const res = await fetch(febboxUrl);
        fb = await res.json();
      }
      if (fb?.success && Array.isArray(fb.streams)) {
        const qualities: Record<
          string,
          { type: "hls" | "mp4"; url: string }
        > = {};
        for (const s of fb.streams) {
          if (!s.url) continue;
          const q = (s.quality || "").toUpperCase();
          const key =
            q.includes("4K") || q.includes("2160")
              ? "4k"
              : q.includes("1080")
              ? "1080"
              : q.includes("720")
              ? "720"
              : q.includes("480")
              ? "480"
              : "1080";
          if (!qualities[key]) {
            qualities[key] = {
              type: s.url.includes(".m3u8") ? "hls" : "mp4",
              url: s.url,
            };
          }
        }
        if (Object.keys(qualities).length > 0) {
          return {
            embeds: [],
            stream: [
              {
                id: "primary",
                type: "file",
                qualities,
                headers: {
                  Referer: "https://www.febbox.com/",
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
                },
                flags: [],
                captions: [],
              },
            ],
          };
        }
      }
    } catch {
      // febbox also failed
    }
  }

  throw new NotFoundError("ZeticuzApi: no streams available");
}

export const zeticuzApiScraper = makeSourcerer({
  id: "zeticuzapi-custom",
  name: "ZeticuzApi 🔥",
  rank: 880,
  flags: [],
  scrapeMovie: zeticuzApiLogic,
  scrapeShow: zeticuzApiLogic,
});

// --- FebBox 4K Scraper (rank 880: after ZeticuzApi 890, before Tugaflix ~806) ---
// By being a proper makeSourcerer provider, FebBox runs in the correct position in the
// providers engine — no special loop needed. When no video, throws NotFoundError and the
// engine silently moves to the next source (no error modal).

async function febboxScraperLogic(
  ctx: MovieScrapeContext | ShowScrapeContext,
): Promise<SourcererOutput> {
  const { scrapeFemboxMovie, scrapeFemboxTV, convertFemboxToStream } =
    await import("@/backend/providers/fembox");

  let turnstileToken = "";
  try {
    const { getTurnstileToken } = await import("@/stores/turnstile");
    turnstileToken = await getTurnstileToken();
  } catch {
    // Ignore turnstile error
  }

  let femboxData = null;
  if (ctx.media.type === "movie") {
    femboxData = await scrapeFemboxMovie(ctx.media.tmdbId, turnstileToken);
  } else if (
    ctx.media.type === "show" &&
    (ctx.media as any).season &&
    (ctx.media as any).episode
  ) {
    const showCtx = ctx as ShowScrapeContext;
    femboxData = await scrapeFemboxTV(
      showCtx.media.tmdbId,
      showCtx.media.season.number,
      showCtx.media.episode.number,
      turnstileToken,
    );
  }

  if (!femboxData) {
    throw new NotFoundError("FebBox: no stream available for this title");
  }

  const stream = convertFemboxToStream(femboxData);
  if (!stream) {
    throw new NotFoundError("FebBox: could not convert stream data");
  }

  return {
    embeds: [],
    stream: [{ ...stream, id: "febbox-stream" }],
  };
}

export const febboxScraper = makeSourcerer({
  id: "febbox",
  name: "FebBox (4K) ⭐",
  rank: 900,
  flags: [],
  scrapeMovie: febboxScraperLogic,
  scrapeShow: febboxScraperLogic,
});

// --- FSOnline Scraper ---

const fsonlineOrigin = "https://www3.fsonline.app";
const fsonlineEmbedUrl = "https://www3.fsonline.app/wp-admin/admin-ajax.php";

async function scrapeDoodstream(ctx: any, url: string): Promise<any> {
  const response = await ctx.proxiedFetcher.full(url, {
    headers: {
      Referer: fsonlineOrigin,
      Origin: fsonlineOrigin,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
    },
  });
  const $ = cheerio.load(response.body);
  const streamHost = new URL(response.finalUrl).hostname;
  const scriptText = $("script")
    .map((_: any, s: any) => $(s).text())
    .get()
    .join("\n");

  // Try pass_md5 pattern (classic Doodstream)
  const streamReq = scriptText.match(/\$\.get\('(\/pass_md5\/.+?)'/)?.[1];
  const tokenParams =
    scriptText.match(/\?\s*(token=[^&'"\s]+(?:&[^'"\s]+)*)/)?.[1] ||
    scriptText.match(/\+ "\?(token=.+?)"/)?.[1];

  if (!streamReq) {
    // Newer Doodstream: look for direct expiry URL pattern
    const directUrl = scriptText.match(
      /(https?:\/\/[a-z0-9]+\.(?:cloudatacdn|doods|doodcdn)\.com\/[^'"\s]+)/i
    )?.[1];
    if (directUrl) {
      return {
        type: "file",
        id: "primary",
        flags: [],
        captions: [],
        qualities: { unknown: { type: "mp4", url: directUrl } },
        headers: {
          Referer: `https://${streamHost}/`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
        },
      };
    }
    return null;
  }

  const streamKey = Math.random().toString(36).substring(2, 12);
  const finalToken = tokenParams
    ? `${streamKey}?${tokenParams}${Date.now()}`
    : streamKey;

  const streamResponse = await ctx.proxiedFetcher.full(
    `https://${streamHost}${streamReq}`,
    {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Referer: response.finalUrl,
        Origin: fsonlineOrigin,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
      },
    },
  );

  const streamUrl = (streamResponse.body as string).trim() + finalToken;
  return {
    type: "file",
    id: "primary",
    flags: [],
    captions: [],
    qualities: { unknown: { type: "mp4", url: streamUrl } },
    headers: {
      Referer: `https://${streamHost}/`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
    },
  };
}

export const fsonlineScraper = makeSourcerer({
  id: "fsonline-custom",
  name: "FSOnline",
  rank: 850,
  flags: [],
  scrapeMovie: async (ctx: MovieScrapeContext) => {
    const movieUrl = `https://www3.fsonline.app/film/${slugify(ctx.media.title, { lower: true, strict: true })}/`;
    const response = await ctx.proxiedFetcher.full(movieUrl, {
      headers: { Referer: fsonlineOrigin, Origin: fsonlineOrigin },
    });
    const $ = cheerio.load(response.body);
    const movieId = $("#show_player_lazy").attr("movie-id");
    if (!movieId) throw new NotFoundError("Movie ID not found");

    const sourcesRes = await ctx.proxiedFetcher.full(fsonlineEmbedUrl, {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Referer: movieUrl,
        Origin: fsonlineOrigin,
      },
      body: `action=lazy_player&movieID=${movieId}`,
    });

    const $sources = cheerio.load(sourcesRes.body);
    const embeds: any[] = [];
    $sources("li.dooplay_player_option").each((_: any, el: any) => {
      const embedUrl = $sources(el).attr("data-vs");
      if (embedUrl) embeds.push({ embedId: "fsonline-doodstream-custom", url: embedUrl });
    });

    return { embeds };
  },
  scrapeShow: async (ctx: ShowScrapeContext) => {
    const showUrl = `https://www3.fsonline.app/episoade/${slugify(ctx.media.title, { lower: true, strict: true })}-sezonul-${ctx.media.season.number}-episodul-${ctx.media.episode.number}/`;
    const response = await ctx.proxiedFetcher.full(showUrl, {
      headers: { Referer: fsonlineOrigin, Origin: fsonlineOrigin },
    });
    const $ = cheerio.load(response.body);
    const movieId = $("#show_player_lazy").attr("movie-id");
    if (!movieId) throw new NotFoundError("Episode ID not found");

    const sourcesRes = await ctx.proxiedFetcher.full(fsonlineEmbedUrl, {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Referer: showUrl,
        Origin: fsonlineOrigin,
      },
      body: `action=lazy_player&movieID=${movieId}`,
    });

    const $sources = cheerio.load(sourcesRes.body);
    const embeds: any[] = [];
    $sources("li.dooplay_player_option").each((_: any, el: any) => {
      const embedUrl = $sources(el).attr("data-vs");
      if (embedUrl) embeds.push({ embedId: "fsonline-doodstream-custom", url: embedUrl });
    });

    return { embeds };
  },
});

export const fsonlineDoodstreamEmbed = makeEmbed({
  id: "fsonline-doodstream-custom",
  name: "FSOnline Doodstream",
  rank: 801,
  flags: [],
  scrape: async (ctx: EmbedScrapeContext) => {
    const stream = await scrapeDoodstream(ctx, ctx.url);
    if (!stream) throw new NotFoundError("Stream not found");
    return { stream: [stream] };
  },
});

// --- VidNest Embed Scraper (iframe player) ---

const VIDNEST_EMBED_BASE = "https://vidnest.fun";

export const vidnestScraper = makeSourcerer({
  id: "vidnest-custom",
  name: "VidNest",
  rank: 840,
  flags: [],
  scrapeMovie: async (ctx: MovieScrapeContext) => ({
    embeds: [{ embedId: "vidnest-iframe-custom", url: `${VIDNEST_EMBED_BASE}/movie/${ctx.media.tmdbId}` }],
  }),
  scrapeShow: async (ctx: ShowScrapeContext) => {
    const s = (ctx as ShowScrapeContext).media.season.number;
    const e = (ctx as ShowScrapeContext).media.episode.number;
    return {
      embeds: [{ embedId: "vidnest-iframe-custom", url: `${VIDNEST_EMBED_BASE}/tv/${ctx.media.tmdbId}/${s}/${e}` }],
    };
  },
});

export const vidnestEmbeds = [
  makeEmbed({
    id: "vidnest-iframe-custom",
    name: "VidNest",
    rank: 799,
    flags: [],
    async scrape(ctx: EmbedScrapeContext) {
      return {
        stream: [
          {
            id: "vidnest",
            type: "hls" as const,
            playlist: ctx.url,
            flags: [],
            captions: [],
          },
        ],
      };
    },
  }),
];
