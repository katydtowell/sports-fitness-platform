/**
 * SidePanel — renders a right-side panel that slides in.
 *
 * Responsive behaviour:
 *   • Desktop  — width follows the requested size (quarter/third/half)
 *                and pushes main content to the left.
 *   • Tablet   — always 50% width, pushes content.
 *   • Mobile   — full-width overlay that covers existing content.
 *
 * The content-push is handled in Layout.tsx via margin-right.
 */

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useIsMobile } from "../ui/use-mobile";
import { useIsTablet } from "../ui/use-tablet";
import { useSidePanel, type PanelSize } from "./SidePanelContext";
import { useTheme } from "./ThemeContext";

const SIZE_TO_PERCENT: Record<PanelSize, string> = {
  quarter: "25%",
  third:   "33.333%",
  half:    "50%",
};

export function SidePanel() {
  const { isOpen, content, title, size, closePanel, headerExtras } = useSidePanel();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const panelRef = useRef<HTMLDivElement>(null);
  const { palette } = useTheme();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closePanel]);

  // Determine the open width based on breakpoint
  let openWidth: string;
  if (isMobile) {
    openWidth = "100%";
  } else if (isTablet) {
    openWidth = "50%";
  } else {
    openWidth = SIZE_TO_PERCENT[size];
  }

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: 44, // below TopNav
        left: isMobile && isOpen ? 0 : undefined,
        right: isMobile ? undefined : 0,
        bottom: isMobile ? 52 : 0, // above MobileUtilityBar on mobile
        width: isOpen ? openWidth : "0px",
        overflow: "hidden",
        background: palette.surfacePrimary,
        borderLeft: isOpen && !isMobile ? `1px solid ${palette.borderMedium}` : "none",
        zIndex: isMobile ? 95 : 85, // above sidebar on mobile
        transition: isMobile
          ? "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.25s ease"
          : "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.25s ease",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-family)",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: `1px solid ${palette.borderMedium}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flex: 1 }}>
          <span
            style={{
              color: palette.textPrimary,
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              fontFamily: "var(--font-family)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </span>
          {headerExtras}
        </div>
        <button
          onClick={closePanel}
          aria-label="Close panel"
          style={{
            background: palette.hoverBg,
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "6px",
            color: palette.textTertiary,
            width: "30px",
            height: "30px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Panel body — scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "20px",
        }}
      >
        {content}
      </div>
    </div>
  );
}
