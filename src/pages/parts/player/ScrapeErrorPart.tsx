import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import {
  isExtensionActiveCached,
  sendPage,
} from "@/backend/extension/messaging";
import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { IconPill } from "@/components/layout/IconPill";
import { useModal } from "@/components/overlays/Modal";
import { Paragraph } from "@/components/text/Paragraph";
import { Title } from "@/components/text/Title";
import { ScrapingItems, ScrapingSegment } from "@/hooks/useProviderScrape";
import { ErrorContainer, ErrorLayout } from "@/pages/layouts/ErrorLayout";
import { conf } from "@/setup/config";
import { useOnboardingStore } from "@/stores/onboarding";
import { usePreferencesStore } from "@/stores/preferences";
import { getExtensionState } from "@/utils/extension";
import type { ExtensionStatus } from "@/utils/extension";
import { getProviderApiUrls } from "@/utils/proxyUrls";

import { ErrorCardInModal } from "../errors/ErrorCard";

export interface ScrapeErrorPartProps {
  data: {
    sources: Record<string, ScrapingSegment>;
    sourceOrder: ScrapingItems[];
  };
}

export function ScrapeErrorPart(props: ScrapeErrorPartProps) {
  const { t } = useTranslation();
  const modal = useModal("error");
  const location = useLocation();
  const [extensionState, setExtensionState] =
    useState<ExtensionStatus>("unknown");
  const setOnboardingCompleted = useOnboardingStore((s) => s.setCompleted);
  const febboxKey = usePreferencesStore((s) => s.febboxKey);

  const error = useMemo(() => {
    const data = props.data;
    let str = "";
    const apiUrls = getProviderApiUrls();
    str += `URL - ${location.pathname}\n`;
    str += `API - ${apiUrls.length > 0}\n\n`;
    Object.values(data.sources).forEach((v) => {
      str += `${v.id}: ${v.status}\n`;
      if (v.reason) str += `${v.reason}\n`;
      if (v.error?.message)
        str += `${v.error?.name ?? "unknown"}: ${v.error.message}\n`;
      else if (v.error) str += `${v.error.toString()}\n`;
    });
    return str;
  }, [props, location]);

  useEffect(() => {
    getExtensionState().then((state: ExtensionStatus) => {
      setExtensionState(state);
    });
  }, [t]);

  // Periodically check if extension is enabled - auto reload if it becomes success
  useEffect(() => {
    if (extensionState === "success") return;

    const interval = setInterval(async () => {
      const state = await getExtensionState();
      if (state === "success") {
        window.location.reload();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [extensionState]);

  function handleOnboarding() {
    setOnboardingCompleted(false);
    window.location.reload();
  }

  if (extensionState === "disallowed") {
    return (
      <ErrorLayout>
        <ErrorContainer>
          <IconPill icon={Icons.LOCK}>
            {t("player.scraping.extensionFailure.badge")}
          </IconPill>
          <Title>{t("player.scraping.extensionFailure.title")}</Title>
          <Paragraph>
            <Trans
              i18nKey="player.scraping.extensionFailure.text"
              components={{
                bold: (
                  <span className="font-bold" style={{ color: "#cfcfcf" }} />
                ),
              }}
            />
          </Paragraph>
          <div className="flex gap-3">
            <Button
              href="/"
              theme="secondary"
              padding="md:px-12 p-2.5"
              className="mt-6"
            >
              {t("player.scraping.extensionFailure.homeButton")}
            </Button>
            <Button
              onClick={() => {
                sendPage({
                  page: "PermissionGrant",
                  redirectUrl: window.location.href,
                });
              }}
              theme="purple"
              padding="md:px-12 p-2.5"
              className="mt-6"
            >
              {t("player.scraping.extensionFailure.enableExtension")}
            </Button>
          </div>
        </ErrorContainer>
      </ErrorLayout>
    );
  }

  return (
    <ErrorLayout>
      <ErrorContainer>
        <IconPill icon={Icons.WAND}>
          {t("player.scraping.notFound.badge")}
        </IconPill>
        <Title>{t("player.scraping.notFound.title")}</Title>
        <Paragraph>{t("player.scraping.notFound.text")}</Paragraph>
        <div className="flex gap-3">
          <Button
            href="/"
            theme="secondary"
            padding="md:px-12 p-2.5"
            className="mt-6"
          >
            {t("player.scraping.notFound.homeButton")}
          </Button>
          <Button
            onClick={() => modal.show()}
            theme="purple"
            padding="md:px-12 p-2.5"
            className="mt-6"
          >
            {t("player.scraping.notFound.detailsButton")}
          </Button>
        </div>

        {(!isExtensionActiveCached() || !febboxKey) && conf().HAS_ONBOARDING ? (
          <div className="mt-6 p-4 rounded-lg bg-video-scraping-error/20 border border-video-scraping-error/30 max-w-lg">
            <div className="flex items-start gap-3">
              <Icon
                icon={Icons.CIRCLE_EXCLAMATION}
                className="text-amber-500 text-xl mt-0.5 flex-shrink-0"
              />
              <div className="text-left">
                <p className="text-white font-medium mb-2">
                  {extensionState === "unknown"
                    ? "Extension Not Detected"
                    : t("player.scraping.notFound.onboardingTitle") ||
                      "Need More Sources?"}
                </p>
                {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                  navigator.userAgent,
                ) ? (
                  <>
                    <p className="text-sm text-type-dimmed mb-2">
                      You&apos;re on a <strong className="text-white">mobile device</strong>.
                      Browser extensions aren&apos;t available on mobile
                      browsers.
                    </p>
                    <ul className="text-sm text-type-dimmed ml-4 list-disc space-y-1 mb-3">
                      <li>Try refreshing the page or come back later</li>
                      <li>
                        Some content may not be available from all sources
                      </li>
                      <li>
                        <strong className="text-white">Android tip:</strong> Use
                        Kiwi Browser which supports Chrome extensions
                      </li>
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-type-dimmed mb-2">
                    {extensionState === "unknown"
                      ? "Install our browser extension to unlock more sources and better quality providers like FebBox, VidLink, and more."
                      : t("player.scraping.notFound.onboarding")}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {extensionState === "unknown" &&
                  !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                    navigator.userAgent,
                  ) ? (
                    <Button
                      href="/onboarding/extension"
                      theme="purple"
                      className="text-sm px-6"
                    >
                      Install Extension
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleOnboarding()}
                      theme="purple"
                      className="text-sm"
                    >
                      {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                        navigator.userAgent,
                      )
                        ? "View Setup Guide"
                        : t("player.scraping.notFound.onboardingButton")}
                    </Button>
                  )}
                  {(extensionState as string) === "disallowed" && (
                    <Button
                      onClick={() => {
                        sendPage({
                          page: "PermissionGrant",
                          redirectUrl: window.location.href,
                        });
                      }}
                      theme="purple"
                      className="text-sm px-6"
                    >
                      Enable Extension
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </ErrorContainer>
      {error ? (
        <ErrorCardInModal
          id={modal.id}
          onClose={() => modal.hide()}
          error={error}
        />
      ) : null}
    </ErrorLayout>
  );
}
