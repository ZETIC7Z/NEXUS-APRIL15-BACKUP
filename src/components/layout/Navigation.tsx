/* eslint-disable react/forbid-dom-props */
import classNames from "classnames";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link, To, useLocation, useNavigate } from "react-router-dom";
import { useAsyncFn, useClickAway } from "react-use";

import { searchForMedia } from "@/backend/metadata/search";
import { UserAvatar } from "@/components/Avatar";
import { SearchBarInput } from "@/components/form/SearchBar";
import { Icon, Icons } from "@/components/Icon";
import { LinksDropdown } from "@/components/LinksDropdown";
import { DownloadModal } from "@/components/overlays/DownloadModal";
import { useNotifications } from "@/components/overlays/notificationsModal";
import { useAuth } from "@/hooks/auth/useAuth";
import { useBannerSize } from "@/stores/banner";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { useSidebarStore } from "@/stores/sidebar";
import { MediaItem } from "@/utils/mediaTypes";

import { BrandPill } from "./BrandPill";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NavigationProps {
  searchQuery?: string;
  onSearchChange?: (value: string, force: boolean) => void;
  onSearchUnFocus?: (newSearch?: string) => void;
  showSettingsSearch?: boolean;
}

interface NavItem {
  path: string;
  label: string;
  icon?: Icons;
}

// Mobile sidebar items
const navItems: NavItem[] = [
  { path: "/discover", label: "Home", icon: Icons.HOME },
];

// Browse dropdown items (formerly top-level nav items)
const browseItems: NavItem[] = [
  { path: "/movies", label: "Movies", icon: Icons.FILM },
  { path: "/tv", label: "TV Series", icon: Icons.DISPLAY },
  { path: "/anime", label: "Anime", icon: Icons.STAR },
  { path: "/cuts", label: "Cuts", icon: Icons.CUTS },
  { path: "/my-bookmarks", label: "My Favorites", icon: Icons.HEART },
  { path: "/watch-history", label: "Recent Watch", icon: Icons.CLOCK },
];

// Provider items for Watch On dropdown
const watchOnProviders = [
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

// Genre items for Genre dropdown (Full list)
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
  { id: 10402, name: "Music", path: "/discover/more/genre/10402/movie" },
  { id: 9648, name: "Mystery", path: "/discover/more/genre/9648/movie" },
  { id: 10749, name: "Romance", path: "/discover/more/genre/10749/movie" },
  { id: 878, name: "Sci-Fi", path: "/discover/more/genre/878/movie" },
  { id: 53, name: "Thriller", path: "/discover/more/genre/53/movie" },
  { id: 10752, name: "War", path: "/discover/more/genre/10752/movie" },
  { id: 37, name: "Western", path: "/discover/more/genre/37/movie" },
];

// Genre Dropdown Component
function GenreDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className={classNames(
          "flex items-center gap-2 px-4 py-2.5 text-base font-medium rounded-full transition-all duration-200",
          isOpen
            ? "text-white bg-white/10"
            : "text-gray-400 hover:text-white hover:bg-white/5",
        )}
      >
        Genre
        <Icon
          icon={Icons.CHEVRON_DOWN}
          className={classNames(
            "text-sm transition-transform duration-200",
            isOpen ? "rotate-180" : "",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl shadow-black/50 z-50 animate-fadeIn p-1 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {genreItems.map((genre) => (
            <button
              key={genre.id}
              type="button"
              onClick={() => handleNavigation(genre.path)}
              className="w-full flex items-center px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors duration-200 text-left"
            >
              {genre.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Browse Dropdown Component — contains Movies, TV Series, Anime, Favorites, Recent Watch
function BrowseDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isBrowseActive = browseItems.some((item) =>
    location.pathname.startsWith(item.path),
  );

  const handleNavigation = (path: string) => {
    if (path === "/cuts") {
      alert("Coming Soon");
      setIsOpen(false);
      return;
    }
    navigate(path);
    setIsOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className={classNames(
          "flex items-center gap-2 px-4 py-2.5 text-base font-medium rounded-full transition-all duration-200",
          isOpen || isBrowseActive
            ? "text-white bg-white/10"
            : "text-gray-400 hover:text-white hover:bg-white/5",
        )}
      >
        Browse
        <Icon
          icon={Icons.CHEVRON_DOWN}
          className={classNames(
            "text-sm transition-transform duration-200",
            isOpen ? "rotate-180" : "",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl shadow-black/50 z-50 animate-fadeIn p-2">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-bold text-white">Browse</p>
            <p className="text-xs text-gray-500">
              Discover and manage your content
            </p>
          </div>
          <div className="mx-2 border-t border-white/10 mb-1" />
          {browseItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavigation(item.path)}
              className={classNames(
                "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors duration-200 text-left",
                location.pathname.startsWith(item.path)
                  ? "text-white bg-white/10"
                  : "text-gray-300 hover:text-white hover:bg-white/5",
              )}
            >
              {item.icon && (
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <Icon icon={item.icon} className="text-base" />
                </div>
              )}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Live Search Results component — shows poster cards while user types
function LiveSearchResults({
  query,
  onClose,
}: {
  query: string;
  onClose: () => void;
}) {
  const { showModal } = useOverlayStack();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_state, exec] = useAsyncFn(
    (q: { searchQuery: string }) => searchForMedia(q),
    [],
  );
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await exec({ searchQuery: query.trim() });
        if (data) setResults(data.slice(0, 12)); // Show max 12 results
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, exec]);

  if (!query || query.trim().length < 2) return null;

  const handleCardClick = (media: MediaItem) => {
    // Open movie details modal (same as MediaCard behavior)
    showModal("details", {
      id: Number(media.id),
      type: media.type === "movie" ? "movie" : "show",
    });
    onClose();
  };

  return (
    <div className="mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl shadow-black/50 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      {loading && results.length === 0 && (
        <div className="flex items-center justify-center p-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
          <span className="ml-3 text-sm text-gray-400">Searching...</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="p-3">
          <p className="mb-2 text-xs text-gray-500">
            {results.length} result{results.length !== 1 ? "s" : ""} for &quot;
            {query}&quot;
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {results.map((media) => (
              <button
                key={media.id}
                type="button"
                onClick={() => handleCardClick(media)}
                className="group relative overflow-hidden rounded-lg bg-white/5 transition-all duration-200 hover:scale-105 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <div
                  className="aspect-[2/3] w-full bg-cover bg-center"
                  style={{
                    backgroundImage: media.poster
                      ? `url(${media.poster})`
                      : "none",
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                  <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-white">
                    {media.title}
                  </p>
                  {media.year && (
                    <p className="text-[9px] text-gray-400">{media.year}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="p-6 text-center text-sm text-gray-500">
          No results found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}

// Discover Nexus Dropdown Component
function DiscoverNexusDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isWatchOnOpen, setIsWatchOnOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setIsWatchOnOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => {
        setIsOpen(false);
        setIsWatchOnOpen(false);
      }}
    >
      <button
        type="button"
        className={classNames(
          "flex items-center gap-2 px-4 py-2.5 text-base font-medium rounded-full transition-all duration-200",
          isOpen
            ? "text-white bg-white/10"
            : "text-gray-400 hover:text-white hover:bg-white/5",
        )}
      >
        Discover Nexus
        <Icon
          icon={Icons.CHEVRON_DOWN}
          className={classNames(
            "text-sm transition-transform duration-200",
            isOpen ? "rotate-180" : "",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-60 bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-visible z-50 animate-fadeIn">
          <button
            type="button"
            title="Download Nexus App"
            aria-label="Download Nexus App"
            onClick={() => {
              setIsDownloadOpen(true);
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-4 text-gray-300 hover:text-white hover:bg-white/5 transition-colors duration-200 group/download glow-pulse"
          >
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--colors-active)/0.2)] flex items-center justify-center group-hover/download:bg-[hsl(var(--colors-active)/0.3)] transition-colors shadow-[0_0_15px_hsla(var(--colors-active),0.3)]">
              <Icon
                icon={Icons.DOWNLOAD}
                className="text-lg text-[hsl(var(--colors-active))]"
              />
            </div>
            <span className="text-base font-medium">Download Nexus App</span>
          </button>

          <div className="mx-3 border-t border-white/10" />

          <div
            className="relative"
            onMouseEnter={() => setIsWatchOnOpen(true)}
            onMouseLeave={() => setIsWatchOnOpen(false)}
          >
            <button
              type="button"
              title="Watch On Other Platforms"
              aria-label="Watch On Other Platforms"
              className="w-full flex items-center justify-between px-4 py-4 text-gray-300 hover:text-white hover:bg-white/5 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                <Icon icon={Icons.PLAY} className="text-xl" />
                <span className="text-base font-medium">Watch On</span>
              </div>
              <Icon icon={Icons.CHEVRON_RIGHT} className="text-sm" />
            </button>

            {isWatchOnOpen && (
              <div className="absolute left-full top-0 ml-2 w-56 bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl shadow-black/50 z-50 animate-fadeIn max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {watchOnProviders.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleNavigation(provider.path)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 transition-colors duration-200"
                  >
                    <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
                      <Icon icon={Icons.PLAY} className="text-[10px]" />
                    </div>
                    <span className="text-sm">{provider.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mx-3 border-t border-white/10" />

          <button
            type="button"
            onClick={() => handleNavigation("/live")}
            className="w-full flex items-center gap-3 px-4 py-4 text-gray-300 hover:text-white hover:bg-white/5 transition-colors duration-200"
          >
            <Icon icon={Icons.DISPLAY} className="text-xl" />
            <span className="text-base font-medium">
              International Cable TV
            </span>
          </button>

          <a
            href="https://zetflix-tv.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-4 py-4 text-gray-300 hover:text-white hover:bg-white/5 transition-colors duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0" style={{ background: "#000" }}>
                <img
                  src="/ZETFLIX.png"
                  alt="Zetflix"
                  className="w-full h-full object-contain"
                  style={{ mixBlendMode: "screen" }}
                />
              </div>
              <span className="text-base font-medium uppercase tracking-wider">
                WATCH ON ZETFLIX
              </span>
            </div>
            <div className="flex items-center gap-2 px-0 py-0.5 group-hover:scale-105 transition-transform duration-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40 scale-150" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_12px_#22c55e,0_0_24px_#22c55e]" />
              </span>
              <span className="text-[10px] uppercase font-black tracking-wider text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]">
                LIVE
              </span>
            </div>
          </a>
        </div>
      )}

      {/* Download Modal Portal */}
      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
      />
    </div>
  );
}

// Pill Navigation Component with sliding indicator
function PillNavigation({ onSearchToggle }: { onSearchToggle?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const {
    openNotifications: _openNotifications,
    getUnreadCount: _getUnreadCount,
  } = useNotifications();

  // Determine active path
  const getActivePath = useCallback(() => {
    const currentPath = location.pathname;

    // Check if current path starts with any nav item path
    for (const item of navItems) {
      if (item.path === "/discover") {
        // Home is active for "/" and "/discover"
        if (
          currentPath === "/" ||
          currentPath === "/discover" ||
          currentPath.startsWith("/discover")
        ) {
          return item.path;
        }
      } else if (currentPath.startsWith(item.path)) {
        return item.path;
      }
    }

    // Default to home
    return "/discover";
  }, [location.pathname]);

  const activePath = getActivePath();

  // Update indicator position when active item changes
  useLayoutEffect(() => {
    const activeElement = itemRefs.current.get(activePath);
    const indicator = indicatorRef.current;

    if (activeElement && indicator) {
      const width = activeElement.offsetWidth;
      const left = activeElement.offsetLeft;

      indicator.style.width = `${width}px`;
      indicator.style.left = `${left}px`;
    }
  }, [activePath]);

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: string,
  ) => {
    e.preventDefault();
    window.scrollTo(0, 0);
    navigate(path);
  };

  return (
    <nav
      ref={navRef}
      className="relative hidden lg:flex items-center bg-black/80 rounded-full px-2 py-1.5 border border-white/10"
    >
      {/* Sliding Indicator */}
      <div
        ref={indicatorRef}
        className="absolute h-[calc(100%-12px)] rounded-full bg-[hsl(var(--colors-active))] opacity-20 transition-all duration-300 ease-in-out pointer-events-none top-[6px]"
      />

      {/* Nav Items: Home, Browse ▾, Music, Genre ▾ */}
      {navItems.map((item, index) => (
        <React.Fragment key={item.path}>
          <a
            ref={(el) => {
              if (el) itemRefs.current.set(item.path, el);
            }}
            href={item.path}
            onClick={(e) => handleClick(e, item.path)}
            className={classNames(
              "relative z-10 px-5 py-2.5 text-base font-medium whitespace-nowrap transition-all duration-200 rounded-full",
              activePath === item.path
                ? "text-white"
                : "text-gray-400 hover:text-white",
            )}
          >
            {item.label}
          </a>
          {/* Insert Browse dropdown after Home (index 0) */}
          {index === 0 && <BrowseDropdown />}
          {/* Insert Genre dropdown after Music (index 1) */}
          {index === 1 && <GenreDropdown />}
        </React.Fragment>
      ))}

      <div className="flex items-center gap-1 border-l border-white/10 ml-2 pl-2">
        {/* Search Button - triggers expandable search */}
        <button
          type="button"
          onClick={() => onSearchToggle?.()}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
          title="Search"
          aria-label="Search"
        >
          <Icon icon={Icons.SEARCH} className="text-lg" />
        </button>

        {/* Notification Button */}
        <button
          type="button"
          onClick={() => {
            _openNotifications();
          }}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 relative group"
          title="Notifications"
          aria-label="Notifications"
        >
          <Icon
            icon={Icons.BELL}
            className="text-lg group-hover:rotate-12 transition-transform"
          />
          {_getUnreadCount() !== 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
          )}
        </button>

        {/* Discover Nexus Dropdown */}
        <DiscoverNexusDropdown />

        {/* Integrated Profile Menu */}
        <div className="ml-1">
          <LinksDropdown>
            <UserAvatar sizeClass="!w-7 !h-7" />
          </LinksDropdown>
        </div>
      </div>
    </nav>
  );
}

export function Navigation(props: NavigationProps) {
  const bannerHeight = useBannerSize();
  const navigate = useNavigate();
  const location = useLocation();
  const { loggedIn } = useAuth();
  const sidebar = useSidebarStore();
  const [_scrollPosition, setScrollPosition] = useState(0);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [searchBarOpen, setSearchBarOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);
  const {
    openNotifications: _openNotifications,
    getUnreadCount: _getUnreadCount,
  } = useNotifications();

  // Search auto-hide logic
  const searchContainerDesktopRef = useRef<HTMLDivElement>(null);
  const searchContainerMobileRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSearchCloseTimer = useCallback(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchBarOpen(false);
      setMobileSearchOpen(false);
    }, 3000);
  }, []);

  const stopSearchCloseTimer = useCallback(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  }, []);

  useClickAway(searchContainerDesktopRef, () => {
    if (searchBarOpen) setSearchBarOpen(false);
  });

  useClickAway(searchContainerMobileRef, () => {
    if (mobileSearchOpen) setMobileSearchOpen(false);
  });

  // Handle search bar toggle
  const toggleSearchBar = () => {
    setSearchBarOpen(!searchBarOpen);
    if (!searchBarOpen) {
      // Focus will be handled by useLayoutEffect
      startSearchCloseTimer();
    } else {
      stopSearchCloseTimer();
    }
  };

  // Improved Auto-Focus — uses separate refs for desktop vs mobile
  useLayoutEffect(() => {
    if (searchBarOpen) {
      // Two-stage focus: immediate attempt + delayed retry after CSS transition
      requestAnimationFrame(() => {
        desktopSearchInputRef.current?.focus();
      });
      const timer = setTimeout(() => {
        desktopSearchInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [searchBarOpen]);

  useLayoutEffect(() => {
    if (mobileSearchOpen) {
      requestAnimationFrame(() => {
        mobileSearchInputRef.current?.focus();
      });
      const timer = setTimeout(() => {
        mobileSearchInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [mobileSearchOpen]);

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (location.pathname === "/music") {
        navigate(`/music?q=${encodeURIComponent(searchQuery.trim())}`);
      } else {
        navigate(`/browse/${encodeURIComponent(searchQuery.trim())}`);
      }
      setSearchBarOpen(false);
      setMobileSearchOpen(false);
      setSearchQuery("");
      stopSearchCloseTimer();
      // Force scroll to top on search
      window.scrollTo(0, 0);
    }
  };

  // Close search bar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && searchBarOpen) {
        setSearchBarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchBarOpen]);

  // Hide navigation on landing page for non-logged-in users
  const isLandingPage = location.pathname === "/" && !loggedIn;

  // Handle scroll - hide header on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollPosition(currentScrollY);

      // Only apply hide behavior on mobile
      if (window.innerWidth < 768) {
        // Show header when at top or scrolling up
        if (currentScrollY < 50) {
          setIsHeaderHidden(false);
        } else if (
          currentScrollY > lastScrollY.current &&
          currentScrollY > 100
        ) {
          // Scrolling down and past threshold - hide header
          setIsHeaderHidden(true);
        } else if (currentScrollY < lastScrollY.current) {
          // Scrolling up - show header
          setIsHeaderHidden(false);
        }
      } else {
        setIsHeaderHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const _handleClick = (path: To) => {
    window.scrollTo(0, 0);
    navigate(path);
  };

  // Check which nav item is active
  const _isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Hide navigation on landing page
  if (isLandingPage) {
    return null;
  }

  return (
    <>
      {/* Netflix-style navigation header */}
      {/* eslint-disable-next-line react/forbid-dom-props */}
      <div
        className={classNames(
          "fixed left-0 right-0 z-[500] transition-transform duration-300 ease-out flex justify-center",
          isHeaderHidden ? "-translate-y-full" : "translate-y-0",
          "top-[calc(var(--banner-offset)+1.5rem)]",
        )}
        style={
          {
            "--banner-offset": `${bannerHeight}px`,
          } as React.CSSProperties
        }
      >
        {/* Desktop Logo - Absolute Left */}
        <div className="hidden lg:block absolute left-8 top-1/2 -translate-y-1/2 z-[502]">
          <Link to="/" onClick={() => window.scrollTo(0, 0)}>
            <BrandPill clickable />
          </Link>
        </div>
        <div className="transition-all duration-300 ease-in-out w-fit pt-[env(safe-area-inset-top)]">
          {/* Main Navigation - Centered Pill */}
          {!location.pathname.startsWith("/settings") &&
            !location.pathname.startsWith("/register") &&
            !location.pathname.startsWith("/login") &&
            !location.pathname.startsWith("/onboarding") &&
            location.pathname !== "/" && (
              <PillNavigation onSearchToggle={toggleSearchBar} />
            )}

          {/* Settings Search - Centered */}
          {location.pathname.startsWith("/settings") &&
            props.showSettingsSearch &&
            props.onSearchChange && (
              <div className="flex justify-center max-w-xl mx-auto bg-black/80 rounded-full px-6 py-2 border border-white/10 backdrop-blur-md">
                <div className="w-96">
                  <SearchBarInput
                    value={props.searchQuery || ""}
                    onChange={props.onSearchChange}
                    onUnFocus={props.onSearchUnFocus || (() => {})}
                    placeholder="Search settings..."
                    hideTooltip
                  />
                </div>
              </div>
            )}
        </div>

        {/* Expandable Search Bar - Below Header */}
        {/* eslint-disable-next-line react/forbid-dom-props */}
        <div
          ref={searchContainerDesktopRef}
          onMouseEnter={stopSearchCloseTimer}
          onMouseLeave={startSearchCloseTimer}
          className={classNames(
            "fixed left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 transition-all duration-300 ease-out z-[499]",
            "top-[calc(var(--banner-offset)+5rem)] shadow-2xl shadow-black/50 overflow-hidden",
            searchBarOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-4 pointer-events-none",
          )}
        >
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
              <div className="flex items-center px-4 py-3">
                <Icon
                  icon={Icons.SEARCH}
                  className="text-gray-400 text-lg mr-3"
                />
                <input
                  ref={desktopSearchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    stopSearchCloseTimer(); // Keep open while typing

                    // Live update music search
                    if (location.pathname === "/music") {
                      if (val.trim()) {
                        navigate(`/music?q=${encodeURIComponent(val.trim())}`);
                      } else {
                        navigate("/music");
                      }
                    }
                  }}
                  onFocus={stopSearchCloseTimer}
                  onBlur={startSearchCloseTimer}
                  placeholder="Search movies, TV shows, anime..."
                  className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-base"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchBarOpen(false);
                    setSearchQuery("");
                  }}
                  className="ml-3 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
                  title="Close Search"
                  aria-label="Close Search"
                >
                  <Icon icon={Icons.X} className="text-lg" />
                </button>
              </div>
            </div>
          </form>

          {/* Live Search Results */}
          {location.pathname !== "/music" && (
            <LiveSearchResults
              query={searchQuery}
              onClose={() => {
                setSearchBarOpen(false);
                setSearchQuery("");
              }}
            />
          )}
        </div>

        {/* Floating Actions on the right (Optional/Mobile toggle) */}
        <div className="fixed right-8 top-8 hidden lg:flex items-center gap-3">
          {/* Removed PWA Install Button to avoid duplication */}
        </div>
      </div>

      {/* Mobile Header (Hidden on LG) - Positioned at the absolute top, no blur */}
      <div className="lg:hidden fixed top-0 left-0 right-0 px-4 pt-0 pb-4 flex items-center justify-between z-[501] bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          {!location.pathname.startsWith("/settings") &&
            !location.pathname.startsWith("/register") &&
            !location.pathname.startsWith("/login") &&
            !location.pathname.startsWith("/onboarding") &&
            location.pathname !== "/" && (
              <button
                type="button"
                onClick={() => sidebar.toggleMobile()}
                className="text-white p-2 hover:bg-white/10 rounded-full transition-all duration-300 active:scale-95"
                aria-label="Toggle Menu"
                title="Menu"
              >
                <Icon icon={Icons.MENU} className="text-xl" />
              </button>
            )}
          <Link
            to="/"
            onClick={() => window.scrollTo(0, 0)}
            className="transition-transform duration-300 active:scale-95"
          >
            <BrandPill clickable header />
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mobile Search - Toggles internal bar */}
          <button
            type="button"
            title="Search"
            aria-label="Search"
            onClick={() => {
              const opening = !mobileSearchOpen;
              setMobileSearchOpen(opening);
              if (opening) {
                startSearchCloseTimer();
              } else {
                stopSearchCloseTimer();
              }
            }}
            className={classNames(
              "p-2 rounded-full transition-all duration-300 active:scale-90",
              mobileSearchOpen
                ? "bg-white/20 text-white"
                : "text-white/90 hover:bg-white/10",
            )}
          >
            <Icon
              icon={mobileSearchOpen ? Icons.X : Icons.SEARCH}
              className="text-xl"
            />
          </button>

          {/* Notification Button */}
          <button
            type="button"
            title="Notifications"
            aria-label="Notifications"
            onClick={() => _openNotifications()}
            className="p-2 text-white/90 hover:bg-white/10 rounded-full transition-all duration-300 relative active:scale-90"
          >
            <Icon icon={Icons.BELL} className="text-xl" />
            {_getUnreadCount() !== 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-black shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
            )}
          </button>
        </div>

        {/* Mobile Animated Search Bar */}
        <div
          ref={searchContainerMobileRef}
          onMouseEnter={stopSearchCloseTimer}
          onMouseLeave={startSearchCloseTimer}
          className={classNames(
            "absolute top-full left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md transition-all duration-300 ease-out z-[500]",
            mobileSearchOpen
              ? "max-h-[70vh] opacity-100 translate-y-2"
              : "max-h-0 opacity-0 -translate-y-4 pointer-events-none",
          )}
        >
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-lg shadow-black/50 overflow-hidden">
              <div className="flex items-center px-4 py-2.5">
                <Icon icon={Icons.SEARCH} className="text-gray-400 mr-3" />
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    stopSearchCloseTimer(); // Keep open while typing

                    // Live update music search
                    if (location.pathname === "/music") {
                      if (val.trim()) {
                        navigate(`/music?q=${encodeURIComponent(val.trim())}`);
                      } else {
                        navigate("/music");
                      }
                    }
                  }}
                  onFocus={stopSearchCloseTimer}
                  onBlur={startSearchCloseTimer}
                  placeholder="Search..."
                  className="flex-1 bg-transparent text-white outline-none text-base placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setMobileSearchOpen(false);
                    setSearchQuery("");
                  }}
                  title="Close Search"
                  aria-label="Close Search"
                  className="ml-2 p-1 text-gray-400 hover:text-white"
                >
                  <Icon icon={Icons.X} className="text-sm" />
                </button>
              </div>
            </div>
          </form>

          {/* Live Search Results (Mobile) */}
          {location.pathname !== "/music" && (
            <LiveSearchResults
              query={searchQuery}
              onClose={() => {
                setMobileSearchOpen(false);
                setSearchQuery("");
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
