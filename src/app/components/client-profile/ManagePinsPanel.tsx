/**
 * ManagePinsPanel — side-panel for pinning/unpinning app-level pages.
 *
 * Pages are organized by parent page.  Each parent page is itself pinnable,
 * and any sub-pages belonging to it are listed below it, indented.
 *
 * Currently only the top-level sidebar / More Tools pages exist, so the list
 * is flat.  As sub-pages are added they can be added to a parent's `children`
 * array and will render indented under their parent.
 *
 * Client Profile *sections* (Profile, Membership, etc.) are intentionally
 * not listed — those are UI sections within a page, not separate pages.
 */

import { useState } from "react";
import { useTheme } from "../layout/ThemeContext";
import { usePinnedPages, MAX_PINS } from "../layout/PinnedPagesContext";
import { ALL_NAV_ITEMS, ADMIN_SUBPAGE_ITEMS, HOME_ITEM } from "../layout/navItems";

// ── Page hierarchy ─────────────────────────────────────────────────────────────
// Each entry is a parent page (must match an id in ALL_NAV_ITEMS or HOME_ITEM).
// Add sub-pages to `children` as they are built out.

interface PageNode {
  id: string;
  children?: PageNode[];
}

const PAGE_HIERARCHY: PageNode[] = [
  {
    id: "admin",
    children: ADMIN_SUBPAGE_ITEMS.map((item) => ({ id: item.id })),
  },
  { id: "check-in" },
  { id: "clients" },       // future: children: [{ id: "client-profile" }]
  { id: "dashboard" },
  { id: "documents" },
  { id: "email-campaigns" },
  { id: "equipment" },
  { id: "forms" },
  { id: "groups" },
  { id: "home" },
  { id: "leagues" },
  { id: "point-of-sale" },
  { id: "rentals" },
  { id: "reports" },
  { id: "schedule" },
  { id: "time-clock" },
];

// Build a label lookup from all nav items (including admin subpages)
const ALL_ITEMS = [HOME_ITEM, ...ALL_NAV_ITEMS, ...ADMIN_SUBPAGE_ITEMS];
const LABEL_MAP = Object.fromEntries(ALL_ITEMS.map((item) => [item.id, item.label]));

// ── Icons ─────────────────────────────────────────────────────────────────────

function PushpinFilledIcon({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2L18 4L14.5 7.5L17 14H13V22L11 22V14H7L9.5 7.5L6 4L8 2H16Z" />
    </svg>
  );
}

function PushpinOutlineIcon({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  );
}

// ── Pin button ────────────────────────────────────────────────────────────────

interface PinButtonProps {
  id: string;
  label: string;
  pinned: boolean;
  disabled: boolean;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  palette: ReturnType<typeof useTheme>["palette"];
}

function PinButton({ id, label, pinned, disabled, onPin, onUnpin, palette }: PinButtonProps) {
  return (
    <button
      onClick={() => pinned ? onUnpin(id) : onPin(id)}
      disabled={disabled}
      title={
        disabled
          ? `Maximum ${MAX_PINS} pins — unpin a page first`
          : pinned
          ? `Unpin ${label}`
          : `Pin ${label}`
      }
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "30px",
        height: "30px",
        flexShrink: 0,
        background: pinned ? `${palette.primary}20` : "transparent",
        border: `1px solid ${pinned ? `${palette.primary}60` : palette.borderMedium}`,
        borderRadius: "5px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        transition: "border-color 0.15s ease, background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = pinned ? palette.textError : palette.primary;
        e.currentTarget.style.background = pinned
          ? `${palette.textError}10`
          : `${palette.primary}10`;
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = pinned ? `${palette.primary}60` : palette.borderMedium;
        e.currentTarget.style.background = pinned ? `${palette.primary}20` : "transparent";
      }}
    >
      {pinned
        ? <PushpinFilledIcon color={palette.primary} />
        : <PushpinOutlineIcon color={palette.textTertiary} />
      }
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nodeMatchesQuery(node: PageNode, q: string): boolean {
  const label = LABEL_MAP[node.id] ?? "";
  if (label.toLowerCase().includes(q)) return true;
  return (node.children ?? []).some((c) => (LABEL_MAP[c.id] ?? "").toLowerCase().includes(q));
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ManagePinsPanel() {
  const { palette } = useTheme();
  const { pinnedPages, pinPage, unpinPage, isPinned, canPin } = usePinnedPages();
  const [query, setQuery] = useState("");

  const pinCount = pinnedPages.length;
  const q = query.trim().toLowerCase();

  // Nodes visible at the top level after filtering
  const visibleNodes = q
    ? PAGE_HIERARCHY.filter((node) => nodeMatchesQuery(node, q))
    : PAGE_HIERARCHY;

  const noResults = q && visibleNodes.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: "var(--font-family)" }}>

      {/* ── Search ── */}
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: "10px", top: "50%",
          transform: "translateY(-50%)", pointerEvents: "none",
          display: "flex", alignItems: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={palette.textTertiary} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search pages…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box",
            background: palette.surfaceBg,
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "6px",
            color: palette.textPrimary,
            fontSize: "var(--text-base)",
            fontFamily: "var(--font-family)",
            padding: "9px 32px 9px 32px",
            outline: "none",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = palette.primary)}
          onBlur={(e) => (e.currentTarget.style.borderColor = palette.borderMedium)}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            style={{
              position: "absolute", right: "8px", top: "50%",
              transform: "translateY(-50%)",
              background: "transparent", border: "none",
              cursor: "pointer", padding: "2px",
              display: "flex", alignItems: "center",
              color: palette.textTertiary,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Counter banner ── */}
      <div style={{
        background: pinCount >= MAX_PINS ? `${palette.textError}14` : `${palette.primary}14`,
        border: `1px solid ${(pinCount >= MAX_PINS ? palette.textError : palette.primary)}40`,
        borderRadius: "8px",
        padding: "11px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ color: palette.textSecondary, fontSize: "var(--text-sm)" }}>
          {pinCount >= MAX_PINS
            ? "Maximum pins reached. Unpin a page to pin another."
            : "Pin pages for quick access from the breadcrumb menu."}
        </span>
        <span style={{
          color: pinCount >= MAX_PINS ? palette.textError : palette.primary,
          fontSize: "var(--text-base)", fontWeight: 700,
          flexShrink: 0, marginLeft: "12px",
        }}>
          {pinCount}&thinsp;/&thinsp;{MAX_PINS}
        </span>
      </div>

      {/* ── No results ── */}
      {noResults && (
        <div style={{
          color: palette.textTertiary,
          fontSize: "var(--text-sm)",
          textAlign: "center",
          padding: "8px 0",
        }}>
          No pages match "{query}"
        </div>
      )}

      {/* ── Page list ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {visibleNodes.map((node) => {
          const label = LABEL_MAP[node.id];
          if (!label) return null;

          const pinned = isPinned(node.id);
          const disabled = !pinned && !canPin;

          // When searching, only show children that match (unless parent matched)
          const parentMatches = !q || label.toLowerCase().includes(q);
          const children = (node.children ?? []).filter(
            (c) => LABEL_MAP[c.id] && (parentMatches || (LABEL_MAP[c.id] ?? "").toLowerCase().includes(q))
          );
          const hasChildren = children.length > 0;

          return (
            <div key={node.id}>
              {/* Parent row */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 4px 9px 8px",
                borderRadius: "6px",
                background: pinned ? `${palette.primary}0d` : "transparent",
                marginTop: "2px",
              }}>
                <span style={{
                  color: pinned ? palette.primary : palette.textPrimary,
                  fontSize: "var(--text-base)",
                  fontWeight: pinned ? 500 : 400,
                  flex: 1,
                }}>
                  {label}
                </span>
                <PinButton
                  id={node.id}
                  label={label}
                  pinned={pinned}
                  disabled={disabled}
                  onPin={pinPage}
                  onUnpin={unpinPage}
                  palette={palette}
                />
              </div>

              {/* Child rows (indented) */}
              {hasChildren && (
                <div style={{
                  marginLeft: "16px",
                  paddingLeft: "12px",
                  borderLeft: `1px solid ${palette.borderLight}`,
                  marginBottom: "4px",
                }}>
                  {children.map((child) => {
                    const childLabel = LABEL_MAP[child.id];
                    if (!childLabel) return null;
                    const childPinned = isPinned(child.id);
                    const childDisabled = !childPinned && !canPin;
                    return (
                      <div
                        key={child.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 4px 8px 8px",
                          borderRadius: "6px",
                          background: childPinned ? `${palette.primary}0d` : "transparent",
                          marginTop: "2px",
                        }}
                      >
                        <span style={{
                          color: childPinned ? palette.primary : palette.textSecondary,
                          fontSize: "var(--text-base)",
                          fontWeight: childPinned ? 500 : 400,
                          flex: 1,
                        }}>
                          {childLabel}
                        </span>
                        <PinButton
                          id={child.id}
                          label={childLabel}
                          pinned={childPinned}
                          disabled={childDisabled}
                          onPin={pinPage}
                          onUnpin={unpinPage}
                          palette={palette}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
