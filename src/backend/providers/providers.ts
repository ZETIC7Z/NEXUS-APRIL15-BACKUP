import {
  buildProviders,
  makeStandardFetcher,
  targets,
} from "@p-stream/providers";

import { isExtensionActiveCached } from "@/backend/extension/messaging";
import {
  makeExtensionFetcher,
  makeLoadBalancedSimpleProxyFetcher,
  setupM3U8Proxy,
} from "@/backend/providers/fetchers";
import {
  febboxScraper,
  fsonlineDoodstreamEmbed,
  fsonlineScraper,
  vidlinkScraper,
  vidnestEmbeds,
  vidnestScraper,
  vidrockScraper,
  yesmoviesScraper,
  zeticuzApiScraper,
} from "@/backend/providers/custom";

// Initialize M3U8 proxy on module load
setupM3U8Proxy();

/**
 * Patch builtin provider names so we can add emojis without touching the package.
 * Called after .build() or on getCachedMetadata() results.
 */
const PROVIDER_NAME_PATCHES: Record<string, string> = {
  tugaflix: "Tugaflix 🔥",
  "vidlink-custom": "VidLink 🔥",
  "zeticuzapi-custom": "ZeticuzApi 🔥",
};

function patchProviderNames<T extends { id: string; name: string }[]>(
  providers: T,
): T {
  providers.forEach((p) => {
    if (PROVIDER_NAME_PATCHES[p.id]) {
      p.name = PROVIDER_NAME_PATCHES[p.id];
    }
  });
  return providers;
}

function buildBase() {
  const builder = buildProviders()
    .setFetcher(makeStandardFetcher(fetch))
    .addBuiltinProviders()
    // === CUSTOM SOURCES (sorted by rank — providers engine tries highest rank first) ===
    // 1. VidLink 🔥  rank: 890
    .addSource(vidlinkScraper)
    // 2. ZeticuzApi 🔥  rank: 880
    .addSource(zeticuzApiScraper)
    // 3. YesMovies 🔥 rank: 870
    .addSource(yesmoviesScraper)
    // 4. VidRock 🔥 rank: 860
    .addSource(vidrockScraper)
    // 5. FSOnline 🔥 rank: 850
    .addSource(fsonlineScraper)
    // 6. VidNest 🔥 rank: 840
    .addSource(vidnestScraper)
    // 7. FebBox 4K ⭐  rank: 900 (placed last by default)
    // .addSource(febboxScraper)

  vidnestEmbeds.forEach((embed) => builder.addEmbed(embed));

  return builder;
}

export function getProviders() {
  const builder = buildBase();

  if (isExtensionActiveCached()) {
    return builder
      .setProxiedFetcher(makeExtensionFetcher())
      .setTarget(targets.BROWSER_EXTENSION)
      .enableConsistentIpForRequests()
      .build();
  }

  setupM3U8Proxy();

  return builder
    .setProxiedFetcher(makeLoadBalancedSimpleProxyFetcher())
    .setTarget(targets.BROWSER)
    .build();
}

export function getAllProviders() {
  return buildBase()
    .setTarget(targets.BROWSER_EXTENSION)
    .enableConsistentIpForRequests()
    .build();
}

/**
 * Returns cached metadata with patched names (Tugaflix 🔥 etc.)
 * Use this instead of getCachedMetadata() from @p-stream/providers directly.
 */
export { patchProviderNames };
