import { useState, useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "../ui/use-mobile";
import { HelpCircle, Sparkles, Moon, Sun, Bell, Search, X } from "lucide-react";
import { useSidePanel } from "./SidePanelContext";
import { SupportPanelContent } from "./SupportPanel";
import { AIChatPanelContent } from "./AIChatPanel";
import { NotificationsPanelContent } from "./NotificationsPanel";
import { useNotifications } from "./NotificationsContext";
import { useTheme } from "./ThemeContext";
import type { NavItem } from "./navTypes";
import { HOME_ITEM, ALL_NAV_ITEMS } from "./navItems";
import { OnboardingModal } from "./OnboardingModal";

// ── Sub-components ──────────────────────────────────────────────────────────

function HamburgerIcon() {
  const { palette } = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px", width: "20px" }}>
      <span style={{ display: "block", height: "2px", background: palette.textPrimary, borderRadius: "2px" }} />
      <span style={{ display: "block", height: "2px", background: palette.textPrimary, borderRadius: "2px" }} />
      <span style={{ display: "block", height: "2px", background: palette.textPrimary, borderRadius: "2px" }} />
    </div>
  );
}

interface SearchResult {
  type: "search" | "navigate";
  text: string;
  id?: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
}

function SearchField({
  allItems,
  onNavigate,
}: {
  allItems: NavItem[];
  onNavigate: (id: string) => void;
}) {
  const { palette } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [lastSearch, setLastSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update results when query changes
  useEffect(() => {
    if (query.trim()) {
      const built: SearchResult[] = [];
      // Always add "Search for" option first
      built.push({ type: "search", text: `Search for "${query}"` });
      // Filter matching pages
      const matches = allItems.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      );
      matches.forEach((item) => {
        built.push({ type: "navigate", text: item.label, id: item.id, icon: item.icon });
      });
      setResults(built);
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query, allItems]);

  const clearSearch = () => {
    setQuery("");
    setShowResults(false);
  };

  const handleSearchSubmit = (q: string) => {
    setLastSearch(q);
    // Placeholder — would trigger a real search in production
    console.log("Search submitted:", q);
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "navigate" && result.id) {
      onNavigate(result.id);
    } else {
      handleSearchSubmit(query);
    }
    setShowResults(false);
    setQuery("");
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (query) {
      setShowResults(true);
    } else if (lastSearch) {
      setShowResults(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      handleSearchSubmit(query);
      setShowResults(false);
      setQuery("");
    }
    if (e.key === "Escape") {
      setShowResults(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  // Show "last search" dropdown when field is focused, empty, and there's a previous search
  const showLastSearch = showResults && !query && lastSearch && isFocused;

  return (
    <div ref={wrapperRef} style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
      {/* Search icon */}
      <Search
        size={14}
        strokeWidth={1.5}
        style={{
          position: "absolute",
          left: "10px",
          color: palette.textTertiary,
          pointerEvents: "none",
        }}
      />
      <input
        type="text"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          height: "30px",
          background: palette.hoverBg,
          border: `1px solid ${palette.borderMedium}`,
          borderRadius: "6px",
          color: palette.textPrimary,
          fontSize: "13px",
          fontFamily: "var(--font-family)",
          padding: query ? "0 30px 0 30px" : "0 10px 0 30px",
          outline: "none",
        }}
      />

      {/* Clear button */}
      {query && (
        <button
          onClick={clearSearch}
          aria-label="Clear search"
          style={{
            position: "absolute",
            right: "3px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "transparent",
            border: "none",
            borderRadius: "4px",
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: palette.textTertiary,
            padding: 0,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = palette.textPrimary;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = palette.textTertiary;
          }}
        >
          <X size={14} />
        </button>
      )}

      {/* ── Search results dropdown ── */}
      {showResults && results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: palette.surfacePrimary,
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: `0 8px 24px ${palette.shadow}`,
            zIndex: 310,
          }}
        >
          {results.map((result, index) => (
            <button
              key={index}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur before click
                handleResultClick(result);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                borderBottom:
                  index < results.length - 1
                    ? `1px solid ${palette.borderLight}`
                    : "none",
                color: palette.textPrimary,
                fontSize: "13px",
                fontFamily: "var(--font-family)",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = palette.hoverBg;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              {result.type === "search" ? (
                <>
                  <Search size={14} strokeWidth={1.5} style={{ color: palette.textTertiary, flexShrink: 0 }} />
                  <span style={{ fontSize: "13px" }}>{result.text}</span>
                </>
              ) : (
                <>
                  {result.icon && <result.icon size={16} strokeWidth={1.5} style={{ color: palette.textTertiary, flexShrink: 0 }} />}
                  <span style={{ fontSize: "13px" }}>{result.text}</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Last search dropdown ── */}
      {showLastSearch && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: palette.surfacePrimary,
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: `0 8px 24px ${palette.shadow}`,
            zIndex: 310,
          }}
        >
          <div style={{ padding: "8px 14px 4px" }}>
            <span style={{ fontSize: "10px", fontWeight: 600, color: palette.textTertiary, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Last Search
            </span>
          </div>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setQuery(lastSearch);
              setShowResults(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "10px 14px",
              background: "transparent",
              border: "none",
              color: palette.textPrimary,
              fontSize: "13px",
              fontFamily: "var(--font-family)",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = palette.hoverBg;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <Search size={14} strokeWidth={1.5} style={{ color: palette.textTertiary, flexShrink: 0 }} />
            <span>{lastSearch}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function AvatarButton({ isMobile, isOpen, onClick }: { isMobile: boolean; isOpen: boolean; onClick: () => void }) {
  const { palette } = useTheme();
  return (
    <div
      onClick={isMobile ? onClick : undefined}
      style={{
        width: "30px",
        height: "30px",
        borderRadius: "50%",
        background: palette.primary,
        border: isOpen ? `2px solid ${palette.textPrimary}` : "2px solid transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: palette.textReversed,
        fontSize: "11px",
        fontWeight: 700,
        cursor: isMobile ? "pointer" : "default",
        flexShrink: 0,
        transition: "border-color 0.15s",
        fontFamily: "var(--font-family)",
      }}
    >
      JS
    </div>
  );
}

function UserDropdown({ onClose, onShowOnboarding }: { onClose: () => void; onShowOnboarding: () => void }) {
  const { palette } = useTheme();
  return (
    <div style={{
      position: "absolute",
      top: "calc(100% + 6px)",
      right: 0,
      background: palette.surfacePrimary,
      border: `1px solid ${palette.borderMedium}`,
      borderRadius: "8px",
      overflow: "hidden",
      boxShadow: `0 8px 24px ${palette.shadow}`,
      zIndex: 300,
      minWidth: "220px",
      fontFamily: "var(--font-family)",
    }}>
      <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${palette.borderLight}` }}>
        <div style={{ color: palette.textPrimary, fontSize: "13px", fontWeight: 600 }}>Joe Smith</div>
        <div style={{ color: palette.textTertiary, fontSize: "11px", marginTop: "2px" }}>Administrator</div>
      </div>
      {/* Show the onboarding modal — prototype-only link */}
      <button
        onClick={() => { onShowOnboarding(); onClose(); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          width: "100%",
          padding: "11px 16px",
          background: "transparent",
          border: "none",
          borderBottom: `1px solid ${palette.borderLight}`,
          color: palette.textPrimary,
          fontSize: "13px",
          fontFamily: "var(--font-family)",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: "14px", opacity: 0.7 }}>▶</span>
        <span style={{ flex: 1 }}>Show the onboarding modal</span>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            color: "#f59e0b",
            background: "rgba(245,158,11,0.15)",
            padding: "2px 6px",
            borderRadius: "4px",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          Prototype
        </span>
      </button>
      {[
        { label: "Edit profile", icon: "✎" },
        { label: "Log out",      icon: "⇥" },
      ].map(({ label, icon }) => (
        <button
          key={label}
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "100%",
            padding: "11px 16px",
            background: "transparent",
            border: "none",
            borderBottom: label === "Edit profile" ? `1px solid ${palette.borderLight}` : "none",
            color: label === "Log out" ? palette.textError : palette.textPrimary,
            fontSize: "13px",
            fontFamily: "var(--font-family)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: "14px", opacity: 0.7 }}>{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Utility icon button ────────────────────────────────────────────────────
function UtilityIconButton({
  icon: Icon,
  label,
  size = 18,
  badge,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  label: string;
  size?: number;
  badge?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const { palette } = useTheme();
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        position: "relative",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        borderRadius: "6px",
        color: active ? palette.primary : palette.textTertiary,
        padding: 0,
        transition: "color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = palette.hoverBg;
        if (!active) (e.currentTarget as HTMLButtonElement).style.color = palette.textPrimary;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        if (!active) (e.currentTarget as HTMLButtonElement).style.color = palette.textTertiary;
      }}
    >
      <Icon size={size} strokeWidth={1.5} />
      {badge && (
        <span
          style={{
            position: "absolute",
            top: "5px",
            right: "5px",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: palette.primary,
            border: `2px solid ${palette.surfacePrimary}`,
          }}
        />
      )}
    </button>
  );
}

/** Desktop / tablet utility icon row (support, AI, dark mode, notifications). */
function UtilityIcons({
  hasNotifications,
  onSupportClick,
  isSupportOpen,
  onAIChatClick,
  isAIChatOpen,
  onThemeToggle,
  isDarkMode,
  onNotificationsClick,
  isNotificationsOpen,
}: {
  hasNotifications: boolean;
  onSupportClick: () => void;
  isSupportOpen: boolean;
  onAIChatClick: () => void;
  isAIChatOpen: boolean;
  onThemeToggle: () => void;
  isDarkMode: boolean;
  onNotificationsClick: () => void;
  isNotificationsOpen: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        flexShrink: 0,
      }}
    >
      <UtilityIconButton icon={HelpCircle} label="Support" onClick={onSupportClick} active={isSupportOpen} />
      <UtilityIconButton icon={Sparkles} label="AI Assistant" onClick={onAIChatClick} active={isAIChatOpen} />
      <UtilityIconButton icon={isDarkMode ? Moon : Sun} label={isDarkMode ? "Dark mode" : "Light mode"} active={isDarkMode} onClick={onThemeToggle} />
      <UtilityIconButton icon={Bell} label="Notifications" badge={hasNotifications} onClick={onNotificationsClick} active={isNotificationsOpen} />
    </div>
  );
}

/** Fixed bottom bar for mobile with utility icons. */
function MobileUtilityBar({
  hasNotifications,
  onSupportClick,
  isSupportOpen,
  onAIChatClick,
  isAIChatOpen,
  onThemeToggle,
  isDarkMode,
  onNotificationsClick,
  isNotificationsOpen,
}: {
  hasNotifications: boolean;
  onSupportClick: () => void;
  isSupportOpen: boolean;
  onAIChatClick: () => void;
  isAIChatOpen: boolean;
  onThemeToggle: () => void;
  isDarkMode: boolean;
  onNotificationsClick: () => void;
  isNotificationsOpen: boolean;
}) {
  const { palette } = useTheme();
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "52px",
        background: palette.surfacePrimary,
        borderTop: `1px solid ${palette.borderMedium}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        zIndex: 100,
        fontFamily: "var(--font-family)",
        transition: "background 0.25s ease",
      }}
    >
      <UtilityIconButton icon={HelpCircle} label="Support" size={20} onClick={onSupportClick} active={isSupportOpen} />
      <UtilityIconButton icon={Sparkles} label="AI Assistant" size={20} onClick={onAIChatClick} active={isAIChatOpen} />
      <UtilityIconButton icon={isDarkMode ? Moon : Sun} label={isDarkMode ? "Dark mode" : "Light mode"} size={20} active={isDarkMode} onClick={onThemeToggle} />
      <UtilityIconButton icon={Bell} label="Notifications" size={20} badge={hasNotifications} onClick={onNotificationsClick} active={isNotificationsOpen} />
    </div>
  );
}

// ── Badge chip ──────────────────────────────────────────────────────────────
function MobileBadge({ text }: { text: string }) {
  const { palette } = useTheme();
  return (
    <span
      style={{
        background: palette.primary,
        color: palette.textReversed,
        fontSize: "9px",
        fontWeight: 700,
        lineHeight: 1,
        padding: "2px 5px",
        borderRadius: "6px",
        whiteSpace: "nowrap",
        fontFamily: "var(--font-family)",
        marginLeft: "auto",
        flexShrink: 0,
      }}
    >
      {text}
    </span>
  );
}

// ── Mobile nav item row ─────────────────────────────────────────────────────
function MobileNavRow({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const { palette } = useTheme();
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        textAlign: "left",
        padding: "13px 20px",
        background: isActive ? "rgba(0,196,160,0.12)" : "transparent",
        borderLeft: isActive ? `3px solid ${palette.primary}` : "3px solid transparent",
        borderTop: "none",
        borderRight: "none",
        borderBottom: "none",
        color: isActive ? palette.primary : palette.textPrimary,
        fontSize: "var(--text-base)",
        fontWeight: isActive ? 600 : 400,
        fontFamily: "var(--font-family)",
        cursor: "pointer",
      }}
    >
      <Icon size={18} strokeWidth={isActive ? 2 : 1.5} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && <MobileBadge text={item.badge} />}
    </button>
  );
}

// ── TopNav ──────────────────────────────────────────────────────────────────
interface TopNavProps {
  /** Fixed Home item — always first, cannot be removed. */
  homeItem: NavItem;
  /** Items pinned to the user's main menu (shown after Home on mobile). */
  pinnedItems: NavItem[];
  /** Remaining items (shown below divider on mobile). */
  moreItems: NavItem[];
  /** Currently active nav item id. */
  activeId: string;
  /** Callback when a nav item is selected. */
  onSelect: (id: string) => void;
}

export function TopNav({ homeItem, pinnedItems, moreItems, activeId, onSelect }: TopNavProps) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { isOpen: panelOpen, title: panelTitle, openPanel, closePanel } = useSidePanel();
  const { unreadCount } = useNotifications();
  const hasNotifications = unreadCount > 0;
  const { mode, palette, toggleTheme } = useTheme();
  const isDarkMode = mode === "dark";
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Complete list of navigable pages for search
  const allNavItems = [HOME_ITEM, ...ALL_NAV_ITEMS];

  const isSupportOpen = panelOpen && panelTitle === "Support";
  const isAIChatOpen = panelOpen && panelTitle === "AI Assistant";
  const isNotificationsOpen = panelOpen && panelTitle === "Notifications";

  const handleToggleSupport = useCallback(() => {
    if (isSupportOpen) {
      closePanel();
    } else {
      openPanel(<SupportPanelContent />, { size: "third", title: "Support" });
    }
  }, [isSupportOpen, openPanel, closePanel]);

  const handleToggleAIChat = useCallback(() => {
    if (isAIChatOpen) {
      closePanel();
    } else {
      openPanel(<AIChatPanelContent />, { size: "third", title: "AI Assistant" });
    }
  }, [isAIChatOpen, openPanel, closePanel]);

  const handleToggleNotifications = useCallback(() => {
    if (isNotificationsOpen) {
      closePanel();
    } else {
      openPanel(<NotificationsPanelContent />, { size: "third", title: "Notifications" });
    }
  }, [isNotificationsOpen, openPanel, closePanel]);

  // Close everything when switching to desktop
  useEffect(() => {
    if (!isMobile) { setMenuOpen(false); setUserMenuOpen(false); }
  }, [isMobile]);

  // Lock body scroll while nav drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // Close user menu on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userMenuOpen]);

  return (
    <>
      <header
        className="flex items-center shrink-0"
        style={{
          height: "44px",
          background: palette.surfacePrimary,
          borderBottom: `1px solid ${palette.borderMedium}`,
          fontFamily: "var(--font-family)",
          padding: "0 10px",
          gap: "10px",
          transition: "background 0.25s ease",
        }}
      >
        {isMobile ? (
          <>
            {/* ── Left: hamburger ── */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                color: palette.textPrimary,
                fontSize: "22px",
                lineHeight: 1,
                padding: 0,
                flexShrink: 0,
              }}
            >
              {menuOpen ? "✕" : <HamburgerIcon />}
            </button>

            {/* ── Centre: search ── */}
            <SearchField allItems={allNavItems} onNavigate={onSelect} />

            {/* ── Right: avatar ── */}
            <div ref={userMenuRef} style={{ position: "relative", flexShrink: 0 }}>
              <AvatarButton isMobile={true} isOpen={userMenuOpen} onClick={() => setUserMenuOpen(v => !v)} />
              {userMenuOpen && <UserDropdown onClose={() => setUserMenuOpen(false)} onShowOnboarding={() => setShowOnboarding(true)} />}
            </div>
          </>
        ) : (
          /* ── Desktop / Tablet ── */
          <>
            {/* ── Left: logo ── */}
            <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "16px", flexShrink: 0 }}>
              EZFacility
            </span>

            {/* ── Centre: search ── */}
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: "600px" }}>
                <SearchField allItems={allNavItems} onNavigate={onSelect} />
              </div>
            </div>

            {/* ── Right: utility icons + avatar ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <UtilityIcons
                hasNotifications={hasNotifications}
                onSupportClick={handleToggleSupport}
                isSupportOpen={isSupportOpen}
                onAIChatClick={handleToggleAIChat}
                isAIChatOpen={isAIChatOpen}
                onThemeToggle={toggleTheme}
                isDarkMode={isDarkMode}
                onNotificationsClick={handleToggleNotifications}
                isNotificationsOpen={isNotificationsOpen}
              />
              <div
                ref={userMenuRef}
                style={{ position: "relative", flexShrink: 0 }}
              >
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  aria-label="User menu"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <AvatarButton isMobile={false} isOpen={userMenuOpen} onClick={() => {}} />
                </button>
                {userMenuOpen && <UserDropdown onClose={() => setUserMenuOpen(false)} onShowOnboarding={() => setShowOnboarding(true)} />}
              </div>
            </div>
          </>
        )}
      </header>

      {/* ── Mobile utility bottom bar ─────────────────────────────────── */}
      {isMobile && (
        <MobileUtilityBar
          hasNotifications={hasNotifications}
          onSupportClick={handleToggleSupport}
          isSupportOpen={isSupportOpen}
          onAIChatClick={handleToggleAIChat}
          isAIChatOpen={isAIChatOpen}
          onThemeToggle={toggleTheme}
          isDarkMode={isDarkMode}
          onNotificationsClick={handleToggleNotifications}
          isNotificationsOpen={isNotificationsOpen}
        />
      )}

      {/* ── Mobile nav drawer ──────────────────────────────────────────── */}
      {isMobile && menuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              top: "44px",
              background: palette.backdrop,
              zIndex: 200,
            }}
          />

          {/* Drawer panel */}
          <div
            style={{
              position: "fixed",
              top: "44px",
              left: 0,
              bottom: 0,
              width: "260px",
              background: palette.surfacePrimary,
              borderRight: `1px solid ${palette.borderLight}`,
              zIndex: 201,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              fontFamily: "var(--font-family)",
              transition: "background 0.25s ease",
            }}
          >
            {/* Logo header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${palette.borderLight}`,
              marginBottom: "4px",
            }}>
              <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "18px", fontFamily: "var(--font-family)" }}>
                EZFacility
              </span>
            </div>

            {/* ── Fixed Home item ── */}
            <MobileNavRow
              item={homeItem}
              isActive={homeItem.id === activeId}
              onClick={() => {
                onSelect(homeItem.id);
                setMenuOpen(false);
              }}
            />

            {/* ── Pinned items (user's main menu) ── */}
            {pinnedItems.map(item => (
              <MobileNavRow
                key={item.id}
                item={item}
                isActive={item.id === activeId}
                onClick={() => {
                  onSelect(item.id);
                  setMenuOpen(false);
                }}
              />
            ))}

            {/* ── Divider ── */}
            {moreItems.length > 0 && (
              <div
                style={{
                  margin: "6px 20px",
                  borderTop: `1px solid ${palette.borderMedium}`,
                }}
              />
            )}

            {/* ── Remaining items ── */}
            {moreItems.map(item => (
              <MobileNavRow
                key={item.id}
                item={item}
                isActive={item.id === activeId}
                onClick={() => {
                  onSelect(item.id);
                  setMenuOpen(false);
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Onboarding Modal (prototype only) ──────────────────────────── */}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} onNavigate={onSelect} />
    </>
  );
}
