import { FullScraperEvents, RunOutput, ScrapeMedia } from "@p-stream/providers";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";

import {
  isExtensionActive,
  isExtensionActiveCached,
} from "@/backend/extension/messaging";
import { prepareStream } from "@/backend/extension/streams";
import {
  connectServerSideEvents,
  getCachedMetadata,
  makeProviderUrl,
} from "@/backend/helpers/providerApi";
import { getLoadbalancedProviderApiUrl } from "@/backend/providers/fetchers";
import { getProviders } from "@/backend/providers/providers";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

export interface ScrapingItems {
  id: string;
  children: string[];
}

export interface ScrapingSegment {
  name: string;
  id: string;
  embedId?: string;
  status: "failure" | "pending" | "notfound" | "success" | "waiting";
  reason?: string;
  error?: any;
  percentage: number;
}

type ScraperEvent<Event extends keyof FullScraperEvents> = Parameters<
  NonNullable<FullScraperEvents[Event]>
>[0];

// Source name overrides for builtin providers (adds emojis etc.)
const SOURCE_NAME_OVERRIDES: Record<string, string> = {
  tugaflix: "Tugaflix 🔥",
  "vidlink-custom": "VidLink 🔥",
  "zeticuzapi-custom": "ZeticuzApi 🔥",
  febbox: "FebBox (4K) ⭐",
};

function applyNameOverrides(
  metadata: { id: string; name: string }[],
): { id: string; name: string }[] {
  return metadata.map((s) =>
    SOURCE_NAME_OVERRIDES[s.id] ? { ...s, name: SOURCE_NAME_OVERRIDES[s.id] } : s,
  );
}

function useBaseScrape() {
  const [sources, setSources] = useState<Record<string, ScrapingSegment>>({});
  const [sourceOrder, setSourceOrder] = useState<ScrapingItems[]>([]);
  const [currentSource, setCurrentSource] = useState<string>();
  const lastId = useRef<string | null>(null);

  const initEvent = useCallback((evt: ScraperEvent<"init">) => {
    // Initialize spinner state from the providers engine source list (FebBox is now a real provider)
    setSources((existingSources) => {
      const allSources: Record<string, ScrapingSegment> = {};

      // Add all provider sources (with name overrides applied, e.g. Tugaflix 🔥)
      const patchedMeta = applyNameOverrides(getCachedMetadata());
      evt.sourceIds.forEach((v) => {
        // Preserve existing status if already set (e.g. from resume)
        if (existingSources[v]) {
          allSources[v] = existingSources[v];
          return;
        }
        const source = patchedMeta.find((s) => s.id === v);
        const out: ScrapingSegment = {
          name: source?.name || v,
          id: v,
          status: "waiting",
          percentage: 0,
        };
        allSources[v] = out;
      });

      return allSources;
    });

    setSourceOrder((existingOrder) => {
      const allSourceOrder: ScrapingItems[] = [];

      // Add provider sources in order
      evt.sourceIds.forEach((v) => {
        if (!allSourceOrder.find((o) => o.id === v)) {
          allSourceOrder.push({ id: v, children: [] });
        }
      });

      // Keep any existing entries not in this list (e.g. from resume)
      existingOrder.forEach((o) => {
        if (!allSourceOrder.find((ao) => ao.id === o.id)) {
          allSourceOrder.push(o);
        }
      });

      return allSourceOrder;
    });
  }, []);

  const startEvent = useCallback((id: ScraperEvent<"start">) => {
    const lastIdTmp = lastId.current;
    setSources((s) => {
      if (s[id]) s[id].status = "pending";
      if (lastIdTmp && s[lastIdTmp] && s[lastIdTmp].status === "pending")
        s[lastIdTmp].status = "notfound";
      return { ...s };
    });
    setCurrentSource(id);
    lastId.current = id;
  }, []);

  const updateEvent = useCallback((evt: ScraperEvent<"update">) => {
    setSources((s) => {
      if (s[evt.id]) {
        s[evt.id].status = evt.status;
        s[evt.id].reason = evt.reason;
        s[evt.id].error = evt.error;
        s[evt.id].percentage = evt.percentage;
      }
      return { ...s };
    });
  }, []);

  const discoverEmbedsEvent = useCallback(
    (evt: ScraperEvent<"discoverEmbeds">) => {
      setSources((s) => {
        evt.embeds.forEach((v) => {
          const source = getCachedMetadata().find(
            (src) => src.id === v.embedScraperId,
          );
          const out: ScrapingSegment = {
            embedId: v.embedScraperId,
            name: source?.name ?? v.embedScraperId,
            id: v.id,
            status: "waiting",
            percentage: 0,
          };
          s[v.id] = out;
        });
        return { ...s };
      });
      setSourceOrder((s) => {
        const source = s.find((v) => v.id === evt.sourceId);
        if (!source) {
          console.error("invalid source id for discoverEmbeds", evt.sourceId);
          return s;
        }
        source.children = evt.embeds.map((v) => v.id);
        return [...s];
      });
    },
    [],
  );

  const startScrape = useCallback(() => {
    lastId.current = null;
  }, []);

  const getResult = useCallback((output: RunOutput | null) => {
    if (output && lastId.current) {
      setSources((s) => {
        if (!lastId.current) return s;
        if (s[lastId.current]) s[lastId.current].status = "success";
        return { ...s };
      });
    }
    return output;
  }, []);

  return {
    initEvent,
    startEvent,
    updateEvent,
    discoverEmbedsEvent,
    startScrape,
    getResult,
    sources,
    sourceOrder,
    currentSource,
    setSources,
    setSourceOrder,
    setCurrentSource,
  };
}

export function useScrape() {
  const {
    sources,
    sourceOrder,
    currentSource,
    updateEvent,
    discoverEmbedsEvent,
    initEvent,
    getResult,
    startEvent,
    startScrape,
    setSources,
    setSourceOrder,
    setCurrentSource,
  } = useBaseScrape();

  const preferredSourceOrder = usePreferencesStore((s) => s.sourceOrder);
  const enableSourceOrder = usePreferencesStore((s) => s.enableSourceOrder);
  const lastSuccessfulSource = usePreferencesStore(
    (s) => s.lastSuccessfulSource,
  );
  const setLastSuccessfulSource = usePreferencesStore(
    (s) => s.setLastSuccessfulSource,
  );
  const enableLastSuccessfulSource = usePreferencesStore(
    (s) => s.enableLastSuccessfulSource,
  );
  const disabledSources = usePreferencesStore((s) => s.disabledSources);
  const preferredEmbedOrder = usePreferencesStore((s) => s.embedOrder);
  const enableEmbedOrder = usePreferencesStore((s) => s.enableEmbedOrder);
  const disabledEmbeds = usePreferencesStore((s) => s.disabledEmbeds);

  const startScraping = useCallback(
    async (media: ScrapeMedia, startFromSourceId?: string) => {
      const providerInstance = getProviders();
      const allSources = providerInstance.listSources();
      const playerState = usePlayerStore.getState();

      // Get media-specific failed sources/embeds using the new per-media tracking
      const { getMediaKey } = await import("@/stores/player/slices/source");
      let mediaKey = getMediaKey(playerState.meta);
      if (!mediaKey) {
        // Derive media key from ScrapeMedia if meta is not set yet
        if (media.type === "movie") {
          mediaKey = `movie-${media.tmdbId}`;
        } else if (media.type === "show" && media.season && media.episode) {
          mediaKey = `show-${media.tmdbId}-${media.season.tmdbId}-${media.episode.tmdbId}`;
        } else if (media.type === "show") {
          mediaKey = `show-${media.tmdbId}`;
        }
      }
      const failedSources = mediaKey
        ? playerState.failedSourcesPerMedia[mediaKey] || []
        : [];
      const failedEmbeds = mediaKey
        ? playerState.failedEmbedsPerMedia[mediaKey] || {}
        : {};

      // All sources from the providers engine
      // Filtered by: media type, not disabled, not already failed for this media
      const availableSources = allSources
        .filter((source) => {
          const isMovie = media.type === "movie";
          const supportsMovie = source.mediaTypes?.includes("movie");
          const supportsShow = source.mediaTypes?.includes("show");
          if (isMovie && !supportsMovie) return false;
          if (!isMovie && !supportsShow) return false;

          return (
            !(disabledSources || []).includes(source.id) &&
            !failedSources.includes(source.id)
          );
        })
        .map((source) => source.id);

      let baseSourceOrder = availableSources;

      // Apply custom source ordering if enabled (from settings)
      if (enableSourceOrder && (preferredSourceOrder || []).length > 0) {
        const orderedSources: string[] = [];
        const remainingSources = [...baseSourceOrder];

        // Add sources in preferred order
        for (const sourceId of preferredSourceOrder) {
          const sourceIndex = remainingSources.indexOf(sourceId);
          if (sourceIndex !== -1) {
            orderedSources.push(sourceId);
            remainingSources.splice(sourceIndex, 1);
          }
        }

        // Add remaining sources
        baseSourceOrder = [...orderedSources, ...remainingSources];
      }

      // Dynamic prioritization: last successful source goes to the very top
      if (enableLastSuccessfulSource && lastSuccessfulSource) {
        const lastSourceIndex = baseSourceOrder.indexOf(lastSuccessfulSource);
        if (lastSourceIndex !== -1) {
          baseSourceOrder = [
            lastSuccessfulSource,
            ...baseSourceOrder.filter((id) => id !== lastSuccessfulSource),
          ];
        }
      }
      // Otherwise: natural rank-based ordering is used (VidLink 900 > ZeticuzApi 890 > FebBox 880 > Tugaflix > FSOnline...)

      // If starting from a specific source ID, filter the order to start AFTER that source
      let filteredSourceOrder = baseSourceOrder;
      if (startFromSourceId) {
        let startIndex = filteredSourceOrder.indexOf(startFromSourceId);

        // If the source was removed (e.g., due to failing previously), find its index in the unfiltered list
        if (startIndex === -1) {
          // Disabled FebBox injection: the FebBox source is temporarily hidden.
          // const unfilteredOrder = allSources.map((s) => s.id);
          // // Add custom sources to unfiltered order for reference
          // const febboxKeyPresent =
          //   usePreferencesStore.getState().febboxKey ||
          //   import.meta.env.VITE_DEFAULT_FEBBOX_KEY;
          // if (febboxKeyPresent && !unfilteredOrder.includes("febbox")) {
          //   unfilteredOrder.unshift("febbox");
          // }
          const unfilteredOrder = allSources.map((s) => s.id);

          const rawIndex = unfilteredOrder.indexOf(startFromSourceId);
          if (rawIndex !== -1) {
            // Find the next available source in the filtered list that comes AFTER the rawIndex
            const nextAvailable = unfilteredOrder
              .slice(rawIndex + 1)
              .find((id) => filteredSourceOrder.includes(id));
            if (nextAvailable) {
              startIndex = filteredSourceOrder.indexOf(nextAvailable) - 1; // -1 because we slice(startIndex + 1) below
            }
          }
        }

        if (startIndex !== -1) {
          filteredSourceOrder = filteredSourceOrder.slice(startIndex + 1);
        }

        // If we reached the end of the list, DO NOT loop back — return empty so error screen shows
        if (filteredSourceOrder.length === 0) {
          filteredSourceOrder = [];
        }
      }

      // Collect all failed embed IDs across all sources
      const allFailedEmbedIds = Object.values(failedEmbeds).flat();

      // Filter out disabled and failed embeds from the embed order
      const filteredEmbedOrder = enableEmbedOrder
        ? (preferredEmbedOrder || []).filter(
            (id) =>
              !(disabledEmbeds || []).includes(id) &&
              !allFailedEmbedIds.includes(id),
          )
        : undefined;

      // Use filteredSourceOrder for spinner when resuming, baseSourceOrder for fresh start
      const spinnerSourceOrder = startFromSourceId
        ? filteredSourceOrder
        : baseSourceOrder;

      // Initialize sources in spinner â€” only show what we'll actually try
      const allSourcesInit: Record<string, ScrapingSegment> = {};
      const allSourceOrder: ScrapingItems[] = [];

      // Map spinnerSourceOrder to ScrapingSegment items (all sources come from the providers engine)
      const patchedMetaForSpinner = applyNameOverrides(
        allSources.map((s) => ({ id: s.id, name: s.name })),
      );
      const combinedSources: ScrapingSegment[] = spinnerSourceOrder.map(
        (id) => {
          const source = patchedMetaForSpinner.find((s) => s.id === id);
          const rawName = source?.name || id;
          const patchedName = SOURCE_NAME_OVERRIDES[id] ?? rawName;
          return {
            id,
            name: patchedName,
            status: "waiting" as const,
            percentage: 0,
          };
        },
      );

      // Build the sources and order for the spinner
      combinedSources.forEach((source) => {
        allSourcesInit[source.id] = { ...source };
        allSourceOrder.push({ id: source.id, children: [] });
      });

      setSources(allSourcesInit);
      setSourceOrder(allSourceOrder);

      // Run all providers in the correct order (FebBox is now a proper provider at rank 880)
      // The providers engine handles NotFoundError silently — no error modal for missing streams
      const providerSourceOrder = filteredSourceOrder;

      const providerApiUrl = getLoadbalancedProviderApiUrl();
      const extensionActive = await isExtensionActive();
      if (providerApiUrl && !extensionActive) {
        startScrape();
        const baseUrlMaker = makeProviderUrl(providerApiUrl);
        const conn = await connectServerSideEvents<RunOutput | "">(
          baseUrlMaker.scrapeAll(
            media,
            providerSourceOrder,
            filteredEmbedOrder,
          ),
          ["completed", "noOutput"],
        );
        conn.on("init", initEvent);
        conn.on("start", startEvent);
        conn.on("update", updateEvent);
        conn.on("discoverEmbeds", discoverEmbedsEvent);
        const sseOutput = await conn.promise();
        if (sseOutput && isExtensionActiveCached())
          await prepareStream(sseOutput.stream);

        return getResult(sseOutput === "" ? null : sseOutput);
      }

      startScrape();
      const providers = getProviders();
      const output = await providers.runAll({
        media,
        sourceOrder: providerSourceOrder,
        embedOrder: filteredEmbedOrder,
        events: {
          init: initEvent,
          start: startEvent,
          update: updateEvent,
          discoverEmbeds: discoverEmbedsEvent,
        },
      });

      if (output && isExtensionActiveCached())
        await prepareStream(output.stream);
      return getResult(output);
    },
    [
      initEvent,
      startEvent,
      updateEvent,
      discoverEmbedsEvent,
      getResult,
      startScrape,
      preferredSourceOrder,
      enableSourceOrder,
      enableLastSuccessfulSource,
      lastSuccessfulSource,
      setLastSuccessfulSource,
      disabledSources,
      preferredEmbedOrder,
      enableEmbedOrder,
      disabledEmbeds,
      setSources,
      setSourceOrder,
      setCurrentSource,
    ],
  );

  const resumeScraping = useCallback(
    async (media: ScrapeMedia, startFromSourceId: string) => {
      return startScraping(media, startFromSourceId);
    },
    [startScraping],
  );

  return {
    startScraping,
    resumeScraping,
    sourceOrder,
    sources,
    currentSource,
  };
}

export function useListCenter(
  containerRef: RefObject<HTMLDivElement | null>,
  listRef: RefObject<HTMLDivElement | null>,
  sourceOrder: ScrapingItems[],
  currentSource: string | undefined,
) {
  const [renderedOnce, setRenderedOnce] = useState(false);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    if (!listRef.current) return;

    const elements = [
      ...listRef.current.querySelectorAll("div[data-source-id]"),
    ] as HTMLDivElement[];

    const currentIndex = elements.findIndex(
      (e) => e.getAttribute("data-source-id") === currentSource,
    );

    const currentElement = elements[currentIndex];

    if (!currentElement) return;

    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const listWidth = listRef.current.getBoundingClientRect().width;

    const containerHeight = containerRef.current.getBoundingClientRect().height;

    const listTop = listRef.current.getBoundingClientRect().top;

    const currentTop = currentElement.getBoundingClientRect().top;
    const currentHeight = currentElement.getBoundingClientRect().height;

    const topDifference = currentTop - listTop;

    const listNewLeft = containerWidth / 2 - listWidth / 2;
    const listNewTop = containerHeight / 2 - topDifference - currentHeight / 2;

    listRef.current.style.transform = `translateY(${listNewTop}px) translateX(${listNewLeft}px)`;
    setTimeout(() => {
      setRenderedOnce(true);
    }, 150);
  }, [currentSource, containerRef, listRef, setRenderedOnce]);

  const updatePositionRef = useRef(updatePosition);

  useEffect(() => {
    updatePosition();
    updatePositionRef.current = updatePosition;
  }, [updatePosition, sourceOrder]);

  useEffect(() => {
    function resize() {
      updatePositionRef.current();
    }
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return renderedOnce;
}
