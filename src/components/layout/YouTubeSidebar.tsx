import classNames from "classnames";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { UserAvatar } from "@/components/Avatar";
import { Icon, Icons } from "@/components/Icon";
import { LinksDropdown } from "@/components/LinksDropdown";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { useAuth } from "@/hooks/auth/useAuth";
import { useSidebarStore } from "@/stores/sidebar";

import { DownloadModal } from "../overlays/DownloadModal";

interface SidebarItem {
  id: string;
  label: string;
  icon: Icons;
  path?: string;
  badge?: string;
  hasSubmenu?: boolean;
}

interface ProviderItem {
  id: string;
  name: string;
  path: string;
}

const mainNavItems: SidebarItem[] = [
  { id: "home", label: "Home", icon: Icons.HOME, path: "/discover" },
  { id: "movies", label: "Movies", icon: Icons.FILM, path: "/movies" },
  { id: "tv", label: "TV Series", icon: Icons.DISPLAY, path: "/tv" },
  { id: "anime", label: "Anime", icon: Icons.DRAGON, path: "/anime" },
  { id: "cuts", label: "Cuts", icon: Icons.CUTS, path: "/cuts" },
  { id: "genre", label: "Genre", icon: Icons.BOOKMARK, hasSubmenu: true },
  {
    id: "favorites",
    label: "My Favorites",
    icon: Icons.HEART,
    path: "/bookmarks",
  },
  { id: "history", label: "Recent Watch", icon: Icons.CLOCK, path: "/history" },
  {
    id: "discover",
    label: "Discover Nexus",
    icon: Icons.SEARCH,
    hasSubmenu: true,
  },
];

// Full provider list (same as PC navbar)
const providerItems: ProviderItem[] = [
  { id: "netflix", name: "Netflix", path: "/discover/more/provider/8/movie" },
  {
    id: "appletv",
    name: "Apple TV+",
    path: "/discover/more/provider/350/movie",
  },
  {
    id: "prime",
    name: "Amazon Prime Video",
    path: "/discover/more/provider/119/movie",
  },
  { id: "hulu", name: "Hulu", path: "/discover/more/provider/15/movie" },
  {
    id: "disney",
    name: "Disney Plus",
    path: "/discover/more/provider/337/movie",
  },
  { id: "max", name: "Max", path: "/discover/more/provider/1899/movie" },
  {
    id: "paramount",
    name: "Paramount Plus",
    path: "/discover/more/provider/531/movie",
  },
  { id: "peacock", name: "Peacock", path: "/discover/more/provider/386/movie" },
  { id: "shudder", name: "Shudder", path: "/discover/more/provider/99/movie" },
  {
    id: "crunchyroll",
    name: "Crunchyroll",
    path: "/discover/more/provider/283/movie",
  },
  { id: "fubotv", name: "fuboTV", path: "/discover/more/provider/257/movie" },
  { id: "amcplus", name: "AMC+", path: "/discover/more/provider/526/movie" },
];

// Full genre list (same as PC navbar)
const genreItems = [
  { id: 28, name: "Action", path: "/discover/more/genre/28/movie" },
  { id: 12, name: "Adventure", path: "/discover/more/genre/12/movie" },
  { id: 16, name: "Animation", path: "/discover/more/genre/16/movie" },
  { id: 35, name: "Comedy", path: "/discover/more/genre/35/movie" },
  { id: 80, name: "Crime", path: "/discover/more/genre/80/movie" },
  { id: 99, name: "Documentary", path: "/discover/more/genre/99/movie" },
  { id: 18, name: "Drama", path: "/discover/more/genre/18/movie" },
  { id: 10751, name: "Family", path: "/discover/more/genre/10751/movie" },
  { id: 14, name: "Fantasy", path: "/discover/more/genre/14/movie" },
  { id: 36, name: "History", path: "/discover/more/genre/36/movie" },
  { id: 27, name: "Horror", path: "/discover/more/genre/27/movie" },

  { id: 9648, name: "Mystery", path: "/discover/more/genre/9648/movie" },
  { id: 10749, name: "Romance", path: "/discover/more/genre/10749/movie" },
  { id: 878, name: "Sci-Fi", path: "/discover/more/genre/878/movie" },
  { id: 53, name: "Thriller", path: "/discover/more/genre/53/movie" },
  { id: 10752, name: "War", path: "/discover/more/genre/10752/movie" },
  { id: 37, name: "Western", path: "/discover/more/genre/37/movie" },
];

function NavItemComponent({
  item,
  isExpanded,
  isActive,
  handleNavigation,
  onClick,
}: {
  item: SidebarItem;
  isExpanded: boolean;
  isActive: boolean;
  handleNavigation: (path: string) => void;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (onClick) {
          onClick();
        } else if (item.path) {
          handleNavigation(item.path);
        }
      }}
      className={classNames(
        "relative flex items-center w-full rounded-xl transition-all duration-300 group overflow-hidden",
        isExpanded ? "px-4 py-3 gap-4" : "px-0 py-3 justify-center",
        isActive
          ? "bg-[hsla(var(--colors-active),0.2)] text-white shadow-[inset_0_0_20px_hsla(var(--colors-active),0.1)]"
          : "text-gray-400 hover:bg-white/5 hover:text-white",
      )}
    >
      {/* Active Indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[hsl(var(--colors-active))] rounded-r-full shadow-[0_0_10px_hsla(var(--colors-active),0.8)]" />
      )}

      <Icon
        icon={item.icon}
        className={classNames(
          "text-lg flex-shrink-0 transition-transform duration-300",
          isActive
            ? "text-[hsl(var(--colors-active))] scale-110"
            : "group-hover:scale-110",
        )}
      />

      {isExpanded && (
        <span
          className={classNames(
            "font-medium whitespace-nowrap transition-colors duration-300 flex-1 text-left",
            isActive ? "text-white" : "text-gray-400",
          )}
        >
          {item.label}
        </span>
      )}

      {/* Badge */}
      {isExpanded && item.badge && (
        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full uppercase font-semibold tracking-wide">
          {item.badge}
        </span>
      )}

      {/* Submenu Arrow */}
      {isExpanded && item.hasSubmenu && (
        <Icon icon={Icons.CHEVRON_DOWN} className="text-sm text-gray-500" />
      )}
    </button>
  );
}

// Genre Dropdown Component
function GenreDropdown({
  isOpen,
  isExpanded,
  handleNavigation,
}: {
  isOpen: boolean;
  isExpanded: boolean;
  handleNavigation: (path: string) => void;
}) {
  if (!isOpen || !isExpanded) return null;

  return (
    <div className="ml-8 mt-1 space-y-1 animate-fadeIn max-h-64 overflow-y-auto scrollbar-thin">
      {genreItems.map((genre) => (
        <button
          key={genre.id}
          type="button"
          onClick={() => handleNavigation(genre.path)}
          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
        >
          <span>{genre.name}</span>
        </button>
      ))}
    </div>
  );
}

// Discover Nexus Dropdown Component
function DiscoverNexusDropdown({
  isOpen,
  isExpanded,
  watchOnOpen,
  setWatchOnOpen,
  handleNavigation,
}: {
  isOpen: boolean;
  isExpanded: boolean;
  watchOnOpen: boolean;
  setWatchOnOpen: (open: boolean) => void;
  handleNavigation: (path: string) => void;
}) {
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  if (!isOpen || !isExpanded) return null;

  return (
    <div className="ml-8 mt-1 space-y-1 animate-fadeIn">
      {/* Download Nexus App */}
      <button
        type="button"
        onClick={() => setIsDownloadOpen(true)}
        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200 group/download glow-pulse"
      >
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--colors-active)/0.2)] flex items-center justify-center group-hover/download:bg-[hsl(var(--colors-active)/0.3)] transition-colors shadow-[0_0_15px_hsla(var(--colors-active),0.3)]">
          <Icon
            icon={Icons.DOWNLOAD}
            className="text-base text-[hsl(var(--colors-active))]"
          />
        </div>
        <span className="font-medium">Download Nexus App</span>
      </button>

      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
      />

      {/* Join a Watch Party */}
      <button
        type="button"
        onClick={() => handleNavigation("/watch-party")}
        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
      >
        <Icon icon={Icons.WATCH_PARTY} className="text-sm" />
        <span>Join a Watch Party</span>
      </button>

      {/* Watch On */}
      <button
        type="button"
        onClick={() => setWatchOnOpen(!watchOnOpen)}
        className="flex items-center justify-between gap-3 w-full px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <Icon icon={Icons.PLAY} className="text-sm" />
          <span>Watch On</span>
        </div>
        <Icon
          icon={Icons.CHEVRON_DOWN}
          className={classNames(
            "text-xs transition-transform duration-200",
            watchOnOpen ? "rotate-180" : "",
          )}
        />
      </button>

      {/* Watch On Providers */}
      {watchOnOpen && (
        <div className="ml-4 space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
          {providerItems.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => handleNavigation(provider.path)}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
            >
              <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">
                <Icon icon={Icons.PLAY} className="text-[10px]" />
              </div>
              <span>{provider.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* PWA Install Button */}
      <PWAInstallButton isSidebarItem />

      {/* International Cable TV */}
      <button
        type="button"
        onClick={() => handleNavigation("/live")}
        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
      >
        <Icon icon={Icons.DISPLAY} className="text-sm" />
        <span>International Cable TV</span>
      </button>

      {/* Drama Box */}
      <a
        href="https://zetflix-tv.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 w-full px-4 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <img
            src="/ZETFLIX.png"
            alt="Zetflix"
            className="w-5 h-5 object-contain"
          />
          <span className="font-medium uppercase tracking-tight">
            WATCH ON ZETFLIX
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-0 py-0.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
            <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40 scale-150" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_10px_#22c55e,0_0_20px_#22c55e]" />
          </span>
          <span className="text-[10px] uppercase font-black tracking-wider text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">
            LIVE
          </span>
        </div>
      </a>
    </div>
  );
}

// Extracted NavContent component
function NavContent({
  isExpanded,
  genreOpen,
  setGenreOpen,
  discoverOpen,
  setDiscoverOpen,
  watchOnOpen,
  setWatchOnOpen,
  handleNavigation,
  pathname,
}: {
  isExpanded: boolean;
  genreOpen: boolean;
  setGenreOpen: (open: boolean) => void;
  discoverOpen: boolean;
  setDiscoverOpen: (open: boolean) => void;
  watchOnOpen: boolean;
  setWatchOnOpen: (open: boolean) => void;
  handleNavigation: (path: string) => void;
  pathname: string;
}) {
  return (
    <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
      <div className="px-3 space-y-1">
        {mainNavItems.map((item) => (
          <div key={item.id}>
            <NavItemComponent
              item={item}
              isExpanded={isExpanded}
              isActive={
                item.path
                  ? pathname === item.path || pathname.startsWith(item.path)
                  : item.id === "genre"
                    ? genreOpen
                    : item.id === "discover"
                      ? discoverOpen
                      : false
              }
              handleNavigation={handleNavigation}
              onClick={
                item.id === "genre"
                  ? () => {
                      setGenreOpen(!genreOpen);
                      if (!genreOpen) {
                        setDiscoverOpen(false);
                        setWatchOnOpen(false);
                      }
                    }
                  : item.id === "discover"
                    ? () => {
                        setDiscoverOpen(!discoverOpen);
                        if (!discoverOpen) {
                          setGenreOpen(false);
                        }
                      }
                    : undefined
              }
            />
            {item.id === "genre" && (
              <GenreDropdown
                isOpen={genreOpen}
                isExpanded={isExpanded}
                handleNavigation={handleNavigation}
              />
            )}
            {item.id === "discover" && (
              <DiscoverNexusDropdown
                isOpen={discoverOpen}
                isExpanded={isExpanded}
                watchOnOpen={watchOnOpen}
                setWatchOnOpen={setWatchOnOpen}
                handleNavigation={handleNavigation}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Extracted ProfileSection component
function ProfileSection({
  isExpanded,
  loggedIn,
  profile,
  handleNavigation,
  handleLogout,
}: {
  isExpanded: boolean;
  loggedIn: boolean;
  profile?: { icon?: string; nickname?: string };
  handleNavigation: (path: string) => void;
  handleLogout: () => void;
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  return (
    <div
      className={classNames(
        "p-4 border-t border-white/5 bg-gradient-to-t from-[hsla(var(--colors-active),0.1)] to-transparent",
        isExpanded ? "space-y-2" : "flex flex-col items-center gap-2",
      )}
    >
      {loggedIn ? (
        <>
          {/* User Profile */}
          {/* User Profile Dropdown */}
          {/* User Profile Dropdown */}
          <div className="w-full mt-auto">
            <LinksDropdown
              unstyled
              dropUp
              className="w-full"
              onOpenChange={setIsProfileOpen}
              hideLogout
            >
              <div className="flex items-center gap-3 w-full rounded-xl p-2 hover:bg-white/10 transition-all duration-300 group/profile">
                <div className="relative">
                  <div
                    className={classNames(
                      "transition-all duration-300 transform",
                      isProfileOpen
                        ? "opacity-0 scale-0 w-0"
                        : "opacity-100 scale-100 w-10",
                    )}
                  >
                    <UserAvatar sizeClass="w-10 h-10" />
                  </div>
                </div>
                {isExpanded && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium text-white truncate">
                        {profile?.nickname || "User"}
                      </div>
                    </div>
                    <Icon
                      icon={Icons.CHEVRON_UP}
                      className="text-gray-500 group-hover/profile:text-white transition-colors"
                    />
                  </>
                )}
              </div>
            </LinksDropdown>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className={classNames(
              "flex items-center gap-3 rounded-xl p-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-300",
              isExpanded ? "w-full" : "justify-center w-10 h-10 p-0",
            )}
          >
            <Icon icon={Icons.KEY} className="text-lg" />
            {isExpanded && <span className="text-sm font-medium">Logout</span>}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            handleNavigation("/login");
          }}
          className={classNames(
            "flex items-center justify-center gap-2 rounded-xl p-3 bg-[hsl(var(--colors-active))] hover:opacity-90 text-white font-medium transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-black/20",
            isExpanded ? "w-full" : "w-10 h-10 p-0",
          )}
        >
          <Icon icon={Icons.PROFILE} className="text-lg" />
          {isExpanded && <span>Sign In</span>}
        </button>
      )}
    </div>
  );
}

// Extracted SidebarContent component
function SidebarContent({
  isExpanded,
  setExpanded,
  genreOpen,
  setGenreOpen,
  discoverOpen,
  setDiscoverOpen,
  watchOnOpen,
  setWatchOnOpen,
  handleNavigation,
  handleLogout,
  pathname,
  loggedIn,
  profile,
}: {
  isExpanded: boolean;
  setExpanded: (expanded: boolean) => void;
  genreOpen: boolean;
  setGenreOpen: (open: boolean) => void;
  discoverOpen: boolean;
  setDiscoverOpen: (open: boolean) => void;
  watchOnOpen: boolean;
  setWatchOnOpen: (open: boolean) => void;
  handleNavigation: (path: string) => void;
  handleLogout: () => void;
  pathname: string;
  loggedIn: boolean;
  profile?: { icon?: string; nickname?: string };
}) {
  return (
    <>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setExpanded(!isExpanded)}
        className="absolute -right-3 top-20 w-6 h-6 bg-[#0d0d0d] border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all shadow-lg z-10 hover:scale-110 group"
        title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        aria-label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        <Icon
          icon={Icons.CHEVRON_RIGHT}
          className={classNames(
            "text-xs transition-transform duration-500",
            isExpanded ? "rotate-180" : "",
          )}
        />
      </button>

      {/* Logo Section - Enhanced */}
      <div
        className={classNames(
          "px-5 py-5 border-b border-white/5 flex items-center transition-all duration-500 ease-out",
          "bg-gradient-to-b from-[hsla(var(--colors-active),0.08)] to-transparent",
          isExpanded ? "justify-start gap-4" : "justify-center",
        )}
      >
        <div
          className={classNames(
            "relative flex items-center justify-center transition-all duration-500 ease-out",
            isExpanded ? "w-12 h-12" : "w-10 h-10",
          )}
        >
          {/* Glow effect behind logo */}
          <div
            className={classNames(
              "absolute inset-0 bg-[hsl(var(--colors-active))] rounded-xl blur-xl opacity-0 transition-opacity duration-500",
              isExpanded ? "opacity-20" : "",
            )}
          />
          {isExpanded ? (
            <img
              src="/favicon.ico"
              alt="NEXUS"
              className="relative w-full h-full object-contain drop-shadow-lg animate-fadeIn"
            />
          ) : (
            <div className="relative w-9 h-9 flex items-center justify-center p-1 transition-transform duration-300 hover:scale-110">
              <img
                src="/favicon.ico"
                alt="NEXUS"
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>
        {isExpanded && (
          <div className="flex-1 animate-slideRight overflow-hidden">
            <h1 className="text-xl font-bold text-white tracking-wide">
              NEXUS
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
              Stream Everything
            </p>
          </div>
        )}
      </div>

      <NavContent
        isExpanded={isExpanded}
        genreOpen={genreOpen}
        setGenreOpen={setGenreOpen}
        discoverOpen={discoverOpen}
        setDiscoverOpen={setDiscoverOpen}
        watchOnOpen={watchOnOpen}
        setWatchOnOpen={setWatchOnOpen}
        handleNavigation={handleNavigation}
        pathname={pathname}
      />
      <ProfileSection
        isExpanded={isExpanded}
        loggedIn={loggedIn}
        profile={profile}
        handleNavigation={handleNavigation}
        handleLogout={handleLogout}
      />
    </>
  );
}

export function YouTubeSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loggedIn, profile, logout } = useAuth();
  const { isExpanded, setExpanded, isMobileOpen, setMobileOpen } =
    useSidebarStore();
  const [genreOpen, setGenreOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [watchOnOpen, setWatchOnOpen] = useState(false);

  // Close sidebar when navigating
  const handleNavigation = (path: string) => {
    if (path === "/cuts") {
      alert("Coming Soon");
      return;
    }
    navigate(path);
    if (window.innerWidth < 768) {
      setMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setMobileOpen(false);
  };

  return (
    <>
      {/* 
        1. MOBILE OVERLAY (< md)
        Uses exact same layout as Tablet/Desktop Rail.
        Visibility controlled by isMobileOpen.
        Width controlled by isExpanded.
      */}
      <div className="md:hidden">
        {/* Backdrop overlay with smooth fade */}
        <div
          className={classNames(
            "fixed inset-0 bg-black/70 backdrop-blur-md z-[990] transition-all duration-500",
            isMobileOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
          role="button"
          tabIndex={0}
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
              setMobileOpen(false);
            }
          }}
          aria-label="Close sidebar"
        />
        {/* Sidebar with smooth slide animation */}
        <aside
          className={classNames(
            "fixed left-0 top-0 h-full bg-[#050505]/95 backdrop-blur-lg border-r border-white/5 z-[1000] flex flex-col",
            "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
            "shadow-[0_0_60px_rgba(0,0,0,0.8)]",
            isMobileOpen ? "translate-x-0" : "-translate-x-full",
            isExpanded ? "w-72" : "w-24",
          )}
        >
          {/* Decorative gradient border */}
          <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-[hsla(var(--colors-active),0.3)] via-transparent to-[hsla(var(--colors-active),0.3)]" />

          <SidebarContent
            isExpanded={isExpanded}
            setExpanded={setExpanded}
            genreOpen={genreOpen}
            setGenreOpen={setGenreOpen}
            discoverOpen={discoverOpen}
            setDiscoverOpen={setDiscoverOpen}
            watchOnOpen={watchOnOpen}
            setWatchOnOpen={setWatchOnOpen}
            handleNavigation={handleNavigation}
            handleLogout={handleLogout}
            pathname={location.pathname}
            loggedIn={loggedIn}
            profile={profile}
          />
        </aside>
      </div>

      {/* 
        2. TABLET RAIL (md - lg)
        Visible Rail. Hidden on Desktop.
      */}
      <aside
        className={classNames(
          "fixed left-0 top-0 h-full bg-[#050505] border-r border-white/5 transition-all duration-500 ease-in-out z-[1000] flex flex-col hidden md:flex lg:hidden",
          isExpanded ? "w-64" : "w-20",
        )}
      >
        <SidebarContent
          isExpanded={isExpanded}
          setExpanded={setExpanded}
          genreOpen={genreOpen}
          setGenreOpen={setGenreOpen}
          discoverOpen={discoverOpen}
          setDiscoverOpen={setDiscoverOpen}
          watchOnOpen={watchOnOpen}
          setWatchOnOpen={setWatchOnOpen}
          handleNavigation={handleNavigation}
          handleLogout={handleLogout}
          pathname={location.pathname}
          loggedIn={loggedIn}
          profile={profile}
        />
      </aside>
    </>
  );
}
