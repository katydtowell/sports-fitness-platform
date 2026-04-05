/**
 * PageMenu — three-dot contextual menu placed next to the breadcrumb.
 *
 * Dropdown structure:
 *
 *   [pushpin] Profile          ← pinned pages (only shown when pins exist)
 *   [pushpin] Billing          ← clicking pushpin opens Manage Pins panel
 *   ─────────────────────────  ← divider (only when pinned items exist)
 *   Clients                    ← contextual related pages (no icons, fixed)
 *
 * Pinned pages are globally-persisted app-level pages the user has chosen to
 * bookmark (e.g. Clients, Schedule).  Clicking a pinned item navigates there.
 * Clicking its pushpin icon opens the Manage Pins side panel.
 *
 * Contextual pages are whatever pages are naturally related to this view
 * (passed as a prop).  For the Client Profile the only one is "Clients".
 * These cannot be pinned or removed from this section.
 */

import { useState, useRef, useEffect } from "react";
import { useTheme } from "../layout/ThemeContext";
import { useSidePanel } from "../layout/SidePanelContext";
import { usePinnedPages } from "../layout/PinnedPagesContext";
import { ManagePinsPanel } from "./ManagePinsPanel";
import { ALL_NAV_ITEMS, ADMIN_SUBPAGE_ITEMS } from "../layout/navItems";

export interface ContextualPage {
  id: string;
  label: string;
}

interface PageMenuProps {
  /** Called when the user clicks a contextual or pinned page link. */
  onNavigateToPage?: (pageId: string) => void;
  /** Pages always shown in the contextual section (no pins, no icons). */
  contextualPages?: ContextualPage[];
}

// ── SVG icons ────────────────────────────────────────────────────────────────

function DotsIcon({ color }: { color: string }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="5"  cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

function PushpinFilledIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M16 2L18 4L14.5 7.5L17 14H13V22L11 22V14H7L9.5 7.5L6 4L8 2H16Z" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function PageMenu({ onNavigateToPage, contextualPages = [] }: PageMenuProps) {
  const { palette } = useTheme();
  const { openPanel } = useSidePanel();
  const { pinnedPages } = usePinnedPages();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build a label lookup map from ALL_NAV_ITEMS + admin subpages
  const labelMap = Object.fromEntries(
    [...ALL_NAV_ITEMS, ...ADMIN_SUBPAGE_ITEMS].map((item) => [item.id, item.label])
  );

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function openManagePins() {
    setIsOpen(false);
    openPanel(<ManagePinsPanel />, { size: "quarter", title: "Manage Pins" });
  }

  function handlePageClick(pageId: string) {
    setIsOpen(false);
    onNavigateToPage?.(pageId);
  }

  const hasPins = pinnedPages.length > 0;
  const sortedContextual = [...contextualPages].sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  const hasContextual = sortedContextual.length > 0;

  const sharedRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    fontFamily: "var(--font-family)",
  };

  return (
    <div ref={containerRef} style={{ position: "relative", flexShrink: 0 }}>

      {/* ── Three-dot trigger ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Page menu"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "30px",
          height: "30px",
          background: palette.hoverBg,
          border: `1px solid ${palette.borderMedium}`,
          borderRadius: "6px",
          cursor: "pointer",
          flexShrink: 0,
          transition: "background 0.15s ease, border-color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = palette.outlineAction;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = palette.borderMedium;
        }}
      >
        <DotsIcon color={palette.textTertiary} />
      </button>

      {/* ── Dropdown ── */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: "200px",
            background: palette.surfacePrimary,
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "8px",
            boxShadow: `0 8px 24px ${palette.shadow}`,
            zIndex: 200,
            overflow: "hidden",
            fontFamily: "var(--font-family)",
            paddingBottom: "4px",
          }}
        >

          {/* ── Pinned section — items when pins exist, link when empty ── */}
          <div
            style={{
              padding: "8px 12px 4px",
              color: palette.textTertiary,
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Pinned
          </div>

          {hasPins ? (
            pinnedPages.map((pageId) => {
              const label = labelMap[pageId] ?? pageId;
              return (
                <div
                  key={pageId}
                  style={sharedRowStyle}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = palette.hoverBg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {/* Pushpin button → opens Manage Pins panel */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openManagePins();
                    }}
                    aria-label="Manage pins"
                    title="Manage pins"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "30px",
                      height: "30px",
                      flexShrink: 0,
                      marginLeft: "10px",
                      background: `${palette.primary}20`,
                      border: `1px solid ${palette.primary}60`,
                      borderRadius: "5px",
                      cursor: "pointer",
                      transition: "background 0.15s ease, border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${palette.primary}35`;
                      e.currentTarget.style.borderColor = palette.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `${palette.primary}20`;
                      e.currentTarget.style.borderColor = `${palette.primary}60`;
                    }}
                  >
                    <PushpinFilledIcon color={palette.primary} />
                  </button>

                  {/* Page name → navigate */}
                  <button
                    onClick={() => handlePageClick(pageId)}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      background: "transparent",
                      border: "none",
                      color: palette.textPrimary,
                      fontSize: "var(--text-base)",
                      fontWeight: 400,
                      fontFamily: "var(--font-family)",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                </div>
              );
            })
          ) : (
            /* No pins yet — show a Manage Pins link */
            <div
              style={sharedRowStyle}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = palette.hoverBg)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <button
                onClick={openManagePins}
                style={{
                  flex: 1,
                  padding: "9px 16px",
                  background: "transparent",
                  border: "none",
                  color: palette.primary,
                  fontSize: "var(--text-base)",
                  fontFamily: "var(--font-family)",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                Manage Pins…
              </button>
            </div>
          )}

          {/* ── Divider (only when contextual pages also present) ── */}
          {hasContextual && (
            <div
              style={{
                height: "1px",
                background: palette.borderMedium,
                margin: "4px 0",
              }}
            />
          )}

          {/* ── Contextual subpages ── */}
          {hasContextual && (
            <>
              <div
                style={{
                  padding: "4px 12px 4px",
                  color: palette.textTertiary,
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Related
              </div>

              {sortedContextual.map((page) => (
                <div
                  key={page.id}
                  style={sharedRowStyle}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = palette.hoverBg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <button
                    onClick={() => handlePageClick(page.id)}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      background: "transparent",
                      border: "none",
                      color: palette.textPrimary,
                      fontSize: "var(--text-base)",
                      fontFamily: "var(--font-family)",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    {page.label}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
