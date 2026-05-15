import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useAsyncFn, useInterval } from "react-use";

import { sendPage } from "@/backend/extension/messaging";
import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { Loading } from "@/components/layout/Loading";
import { Stepper } from "@/components/layout/Stepper";
import { CenterContainer } from "@/components/layout/ThinContainer";
import { Heading2, Paragraph } from "@/components/utils/Text";
import { MinimalPageLayout } from "@/pages/layouts/MinimalPageLayout";
import {
  useNavigateOnboarding,
  useRedirectBack,
} from "@/pages/onboarding/onboardingHooks";
import { Card, Link } from "@/pages/onboarding/utils";
import { PageTitle } from "@/pages/parts/util/PageTitle";
import { conf } from "@/setup/config";
import {
  ExtensionDetectionResult,
  detectExtensionInstall,
} from "@/utils/detectFeatures";
import { getExtensionState } from "@/utils/extension";
import type { ExtensionStatus as ExtensionStatusType } from "@/utils/extension";

// --- Configuration ---
const CHROME_EXTENSION_URL = "https://chromewebstore.google.com/detail/lordflix-extension/kadaciphkadjdmibffgjlgnomecepmke";
const FIREFOX_EXTENSION_URL = "https://addons.mozilla.org/en-US/firefox/addon/lordflix-extension-v1/";
const USERSCRIPT_URL = "https://raw.githubusercontent.com/p-stream/Userscript/main/p-stream.user.js";

// --- Helper Components ---

function BreathingButton({ 
  onClick, 
  children, 
  className, 
  variant = "blue",
  glow = false
}: { 
  onClick?: () => void; 
  children: React.ReactNode; 
  className?: string;
  variant?: "blue" | "emerald" | "purple";
  glow?: boolean;
}) {
  const colors = {
    blue: { glow: "rgba(99, 102, 241, 0.7)", border: "rgba(99, 102, 241, 1)", bg: "bg-indigo-600/30" },
    emerald: { glow: "rgba(16, 185, 129, 0.7)", border: "rgba(16, 185, 129, 1)", bg: "bg-emerald-600/30" },
    purple: { glow: "rgba(168, 85, 247, 0.7)", border: "rgba(168, 85, 247, 1)", bg: "bg-purple-600/30" }
  };
  
  const c = colors[variant];
  
  return (
    <motion.button
      whileHover={{ scale: 1.05, filter: "brightness(1.2)" }}
      whileTap={{ scale: 0.95 }}
      animate={glow ? {
        boxShadow: [
          `0 0 10px 2px ${c.glow.replace("0.7", "0.2")}`,
          `0 0 30px 10px ${c.glow}`,
          `0 0 10px 2px ${c.glow.replace("0.7", "0.2")}`,
        ],
        borderColor: [
          c.border.replace("1", "0.3"),
          c.border,
          c.border.replace("1", "0.3"),
        ],
      } : {}}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      onClick={onClick}
      className={`relative py-4 px-12 rounded-2xl font-black text-white transition-all border-2 overflow-hidden ${c.bg} ${className}`}
    >
      <div className={`absolute inset-0 opacity-20 ${variant === "blue" ? "bg-indigo-500" : variant === "emerald" ? "bg-emerald-500" : "bg-purple-500"} blur-xl`} />
      <span className="relative z-10 flex items-center justify-center gap-3 tracking-widest uppercase text-sm">
        {children}
      </span>
    </motion.button>
  );
}

function RefreshBar() {
  const { t } = useTranslation();
  const reload = useCallback(() => {
    window.location.reload();
  }, []);
  return (
    <Card className="mt-4 !bg-white/5 !backdrop-blur-xl !border-white/10">
      <div className="flex items-center space-x-7">
        <p className="flex-1 text-gray-300">{t("onboarding.extension.notDetecting")}</p>
        <Button theme="secondary" onClick={reload}>
          {t("onboarding.extension.notDetectingAction")}
        </Button>
      </div>
    </Card>
  );
}

export function ExtensionStatus(props: {
  status: ExtensionStatusType;
  loading: boolean;
  showHelp?: boolean;
}) {
  const { t } = useTranslation();
  const [lastKnownStatus, setLastKnownStatus] = useState(props.status);
  useEffect(() => {
    if (!props.loading) setLastKnownStatus(props.status);
  }, [props.status, props.loading]);

  let content: ReactNode = null;
  if (props.loading || props.status === "unknown")
    content = (
      <div className="flex flex-col items-center gap-4">
        <Loading />
        <p className="text-gray-400">{t("onboarding.extension.status.loading")}</p>
      </div>
    );
  if (props.status === "disallowed" || props.status === "noperms")
    content = (
      <div className="flex flex-col items-center gap-4">
        <p className="text-orange-300 font-medium">{t("onboarding.extension.status.disallowed")}</p>
        <BreathingButton
          onClick={() => {
            sendPage({
              page: "PermissionGrant",
              redirectUrl: window.location.href,
            });
          }}
          variant="blue"
          glow
          className="mt-2"
        >
          {t("onboarding.extension.status.disallowedAction")}
        </BreathingButton>
      </div>
    );
  else if (props.status === "failed")
    content = <p className="text-red-400">{t("onboarding.extension.status.failed")}</p>;
  else if (props.status === "outdated")
    content = <p className="text-yellow-400">{t("onboarding.extension.status.outdated")}</p>;
  else if (props.status === "success")
    content = (
      <p className="flex items-center text-emerald-400 font-bold text-lg">
        <Icon icon={Icons.CHECKMARK} className="text-emerald-400 mr-4 text-2xl" />
        {t("onboarding.extension.status.success")}
      </p>
    );

  return (
    <div className="w-full">
      <Card className="!bg-white/5 !backdrop-blur-2xl !border-white/10 !rounded-[2rem] shadow-2xl">
        <div className="flex py-8 flex-col space-y-2 items-center justify-center">
          {content}
        </div>
      </Card>
      {lastKnownStatus === "unknown" ? <RefreshBar /> : null}
      {props.showHelp && props.status !== "success" ? (
        <Card className="mt-6 !bg-orange-500/5 !border-orange-500/20">
          <div className="flex items-center space-x-7 p-2">
            <div className="bg-orange-500/20 p-3 rounded-xl">
              <Icon icon={Icons.WARNING} className="text-orange-400 text-2xl" />
            </div>
            <p className="flex-1 text-orange-200/80 text-sm leading-relaxed">
              <Trans
                i18nKey="onboarding.extension.extensionHelp"
                components={{
                  bold: <span className="text-white font-bold" />,
                }}
              />
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

interface ExtensionPageProps {
  status: ExtensionStatusType;
  loading: boolean;
}

function DefaultExtensionPage(props: ExtensionPageProps) {
  const { t } = useTranslation();
  const installChromeLink = CHROME_EXTENSION_URL;
  const installFirefoxLink = FIREFOX_EXTENSION_URL;

  const browser = useMemo(() => {
    return detectExtensionInstall();
  }, []);

  return (
    <>
      <div className="text-center mb-12">
        <Heading2 className="!mt-0 !text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
          {t("onboarding.extension.title")}
        </Heading2>
        <Paragraph className="max-w-[400px] mx-auto text-gray-400 text-lg leading-relaxed">
          {t("onboarding.extension.explainer")}
        </Paragraph>
      </div>

      {/* Main extension icons */}
      <div className="mb-12 flex flex-col md:flex-row md:space-x-12 space-y-6 md:space-y-0 justify-center items-center">
        {installChromeLink &&
        (browser === "chrome" || browser === "unknown") ? (
          <Link
            href={installChromeLink}
            target="_blank"
            className="flex flex-col items-center space-y-4 p-8 rounded-[2rem] bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-indigo-500/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 text-white group-hover:scale-110 transition-transform duration-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
                width="80px"
                height="80px"
                fill="currentColor"
                className="drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              >
                <path d="M64 320C64 273.4 76.5 229.6 98.3 191.1L208.1 382.3C230 421.5 271.9 448 320 448C334.3 448 347.1 445.7 360.8 441.4L284.5 573.6C159.9 556.3 64 449.3 64 320zM429.1 385.6C441.4 366.4 448 343.1 448 320C448 281.8 431.2 247.5 404.7 224L557.4 224C569.4 253.6 576 286.1 576 320C576 461.4 461.4 575.1 320 576L429.1 385.6zM541.8 192L320 192C257.1 192 206.3 236.1 194.5 294.7L118.2 162.5C165 102.5 238 64 320 64C414.8 64 497.5 115.5 541.8 192zM408 320C408 368.6 368.6 408 320 408C271.4 408 232 368.6 232 320C232 271.4 271.4 232 320 232C368.6 232 408 271.4 408 320z" />
              </svg>
            </span>
            <span className="font-black text-center text-sm uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors relative z-10">
              {t("onboarding.extension.linkChrome")}
            </span>
          </Link>
        ) : null}
        {installFirefoxLink &&
        (browser === "firefox" || browser === "unknown") ? (
          <Link
            href={installFirefoxLink}
            target="_blank"
            className="flex flex-col items-center space-y-4 p-8 rounded-[2rem] bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-orange-500/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 text-white group-hover:scale-110 transition-transform duration-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
                width="80px"
                height="80px"
                fill="currentColor"
                className="drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]"
              >
                <path d="M567.5 305.5C567.4 303.9 567.3 302.4 567.3 300.8L567.3 300.7L566.9 296L566.9 295.9C565.6 282 563.2 268.2 559.6 254.7C559.6 254.6 559.6 254.6 559.5 254.5L558.4 250.5C558.3 250.3 558.3 250 558.2 249.9C557.8 248.7 557.5 247.4 557.1 246.2C557 246 557 245.6 556.9 245.4C556.5 244.2 556.2 243 555.8 241.9C555.7 241.5 555.6 241.3 555.4 240.9C555 239.7 554.7 238.6 554.2 237.4L553.8 236.3C553.4 235.2 553 234 552.6 232.9C552.5 232.6 552.4 232.2 552.2 231.9C551.7 230.8 551.4 229.6 550.9 228.5C550.8 228.3 550.7 227.9 550.5 227.7C550 226.5 549.5 225.4 549.1 224.2C549.1 224.1 549 224 549 223.8C547.4 220 545.8 216.1 544 212.4L543.6 211.7C543.1 210.7 542.8 209.9 542.3 209.1C542.1 208.6 541.8 208 541.6 207.5C541.2 206.7 540.8 205.9 540.4 205.1C540 204.5 539.8 203.9 539.4 203.3C539 202.7 538.6 201.9 538.2 201C537.8 200.4 537.5 199.7 537.1 199.1C536.7 198.5 536.3 197.7 535.9 196.9C535.5 196.2 535.1 195.5 534.7 194.9C534.3 194.2 533.9 193.6 533.5 192.9C533.1 192.2 532.7 191.6 532.3 190.9C531.9 190.2 531.5 189.6 531.1 189C530.7 188.4 530.3 187.6 529.8 186.8C529.4 186.2 529 185.6 528.6 185L527.2 182.9C526.8 182.3 526.4 181.7 526 181.1C525.5 180.4 524.9 179.5 524.4 178.8C524 178.3 523.7 177.7 523.3 177.2L521.5 174.7C521.1 174.2 520.9 173.9 520.5 173.4C519.5 172.1 518.7 170.9 517.7 169.7C510.5 160.3 502.7 151.4 494.2 143.1C488.5 137.1 482.4 131.6 475.9 126.4C471.9 122.9 467.7 119.7 463.4 116.6C455.7 110.8 447.4 105.8 438.8 101.5C436.4 100.2 434 99 431.6 97.8C413.9 89.2 395.3 82.6 376.2 78.2C374.3 77.8 372.4 77.4 370.6 77L370.5 77C369.5 76.9 368.7 76.6 367.7 76.5C355.2 74.1 342.5 72.8 329.7 72.5L319.1 72.5C303.8 72.7 288.6 74.4 273.6 77.5C240 84.6 210.4 98.7 190.7 116.5C189.6 117.5 188.8 118.2 188.3 118.7L187.8 119.2L187.9 119.2C187.9 119.2 188 119.2 188 119.2C188 119.2 188 119.1 188 119.1L187.9 119.2C188 119.1 188 119.1 188.1 119.1C202.7 110.3 223 103.1 237.5 99.5L243.4 98.1C243.8 98 244.2 98 244.6 97.9C246.3 97.5 248 97.2 249.8 96.8C250 96.8 250.4 96.7 250.6 96.7C314.8 85 383.2 104.2 430.8 149.7C441.1 159.5 450.1 170.5 457.7 182.5C488.1 231.7 485.2 293.6 461.5 330.1C427.1 383.1 350.1 401.4 302.5 354.9C286.5 339.4 277.3 318.2 276.9 295.9C276.7 285.2 278.9 274.7 283.1 264.9C284.8 261.1 296.2 239.2 301.3 240.3C288.2 237.5 263.8 242.9 246.6 268.5C231.2 291.4 232.1 326.7 241.6 351.8C235.6 339.4 231.5 326.2 229.5 312.6C217.3 230 272.8 159.6 323.8 142.1C296.3 118.1 227.3 119.8 176.1 157.5C146.2 179.5 124.9 210.7 113.6 247.9C115.3 227 123.2 195.8 139.4 164C122.2 172.9 100.4 201 89.6 226.9C74 264.3 68.6 309.1 73.5 351.7C73.9 354.9 74.2 358.1 74.6 361.3C94.5 478.4 196.6 567.7 319.4 567.7C456.5 567.7 567.7 456.5 567.7 319.3C567.6 314.8 567.5 310.2 567.2 305.8z" />
              </svg>
            </span>
            <span className="font-black text-center text-sm uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors relative z-10">
              {t("onboarding.extension.linkFirefox")}
            </span>
          </Link>
        ) : null}
      </div>

      {/* Secondary userscript option */}
      <div className="mb-12 text-center opacity-60 hover:opacity-100 transition-opacity">
        <div className="flex flex-col items-center space-y-3">
          <Link
            href={USERSCRIPT_URL}
            target="_blank"
            className="text-gray-300 hover:text-white font-bold tracking-wider transition-all border-b border-white/10 hover:border-white/30"
          >
            {t("onboarding.extension.linkUserscript")}
          </Link>
          <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
            {t("onboarding.extension.userscriptNote")}
          </span>
        </div>
      </div>

      <ExtensionStatus status={props.status} loading={props.loading} showHelp />
      
      <div className="mt-12 text-center">
        <Link
          href="https://github.com/xp-technologies-dev/pstream-extension"
          target="_blank"
          className="text-gray-600 hover:text-gray-400 text-xs font-black uppercase tracking-widest transition-colors"
        >
          See extension source code
        </Link>
      </div>
    </>
  );
}

function IosExtensionPage(_props: ExtensionPageProps) {
  const { t } = useTranslation();
  return (
    <div className="text-center">
      <Heading2 className="!mt-0 !text-3xl font-black mb-6 text-white">
        {t("onboarding.extension.title")}
      </Heading2>
      <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-xl">
        <Paragraph className="max-w-[320px] mx-auto text-gray-400 leading-relaxed">
          <Trans
            i18nKey="onboarding.extension.explainerIos"
            components={{ bold: <span className="text-white font-bold" /> }}
          />
        </Paragraph>
      </div>
    </div>
  );
}

export function OnboardingExtensionPage() {
  const { t } = useTranslation();
  const navigate = useNavigateOnboarding();
  const { completeAndRedirect } = useRedirectBack();
  const extensionSupport = useMemo(() => detectExtensionInstall(), []);

  const [{ loading, value }, exec] = useAsyncFn(
    async (triggeredManually: boolean = false) => {
      const status = await getExtensionState();
      if (status === "success" && triggeredManually) completeAndRedirect();
      return status;
    },
    [completeAndRedirect],
  );

  // Poll for state every 1s
  useInterval(() => exec(false), 1000);

  useEffect(() => {
    window.scrollTo(0, 0);
    exec(false);
  }, [exec]);

  const componentMap: Record<
    ExtensionDetectionResult,
    typeof DefaultExtensionPage
  > = {
    chrome: DefaultExtensionPage,
    firefox: DefaultExtensionPage,
    ios: IosExtensionPage,
    unknown: DefaultExtensionPage,
  };
  const PageContent = componentMap[extensionSupport];

  return (
    <MinimalPageLayout>
      <PageTitle subpage k="global.pages.onboarding" />
      <div className="min-h-screen bg-[#06080b] relative overflow-hidden flex flex-col items-center py-20 px-4">
        {/* Cinematic Ambient Glows */}
        <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-indigo-500/10 blur-[200px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[50%] h-[50%] bg-cyan-500/10 blur-[200px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03)_0%,transparent_70%)] pointer-events-none" />

        <div className="w-full max-w-2xl z-10 flex flex-col items-center">
          <Stepper steps={2} current={2} className="mb-16 opacity-60 hover:opacity-100 transition-opacity w-[120px]" />
          
          <div className="w-full">
            <PageContent loading={loading} status={value ?? "unknown"} />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center w-full mt-16 gap-8">
            <button 
              onClick={() => navigate("/onboarding")}
              className="px-10 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black uppercase tracking-widest text-xs transition-all border border-white/5"
            >
              {t("onboarding.extension.back")}
            </button>
            
            {value === "success" && (
              <BreathingButton 
                onClick={() => exec(true)} 
                variant="blue" 
                glow
                className="w-full md:w-auto"
              >
                {t("onboarding.extension.submit")}
              </BreathingButton>
            )}
          </div>
        </div>
      </div>
    </MinimalPageLayout>
  );
}
