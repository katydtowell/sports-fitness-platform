/**
 * Layout — shared shell for all EZFacility pages.
 *
 * Renders the fixed TopNav, the fixed Sidebar (desktop/tablet),
 * the optional MoreToolsDrawer, and the scrollable main content area.
 *
 * Usage:
 *   <Layout mobileFixedContent={<MyPageHeader />} bottomBar={<SaveBar />}>
 *     <MyPageContent />
 *   </Layout>
 */

import { useRef, useState, useEffect, type ReactNode } from "react";
import { useIsMobile } from "../ui/use-mobile";
import { useIsTablet } from "../ui/use-tablet";
import { TopNav } from "./TopNav";
import { Sidebar, SIDEBAR_WIDTH } from "./Sidebar";
import { MoreToolsDrawer } from "./MoreToolsDrawer";
import { SidePanel } from "./SidePanel";
import { useSidePanel, type PanelSize } from "./SidePanelContext";
import { useNav } from "./NavContext";
import { useTheme } from "./ThemeContext";

/** Convert a PanelSize token to a CSS calc() percentage of the main content area. */
function panelWidthCss(size: PanelSize): string {
  const fractions: Record<PanelSize, string> = {
    quarter: "25%",
    third:   "33.333%",
    half:    "50%",
  };
  return fractions[size];
}

interface LayoutProps {
  /** Main scrollable page content. */
  children: ReactNode;
  /**
   * Page-specific content placed in the fixed strip below the TopNav on
   * mobile (e.g. breadcrumb + header card + section nav).
   * Ignored on desktop/tablet — render that content inside `children`
   * instead, guarded by `!isMobile`.
   */
  mobileFixedContent?: ReactNode;
  /**
   * Optional fixed bottom bar (e.g. Save All / Undo All).
   * Rendered outside the scroll container so it floats above content.
   */
  bottomBar?: ReactNode;
}

export function Layout({ children, mobileFixedContent, bottomBar }: LayoutProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const nav = useNav();
  const { isOpen: panelOpen, size: panelSize } = useSidePanel();
  const { palette } = useTheme();

  const [moreToolsOpen, setMoreToolsOpen] = useState(false);

  // Close More Tools drawer when switching to mobile
  useEffect(() => {
    if (isMobile) setMoreToolsOpen(false);
  }, [isMobile]);

  // Measure the fixed strip height at every breakpoint so the scrollable
  // content is always padded far enough down to clear it.
  const fixedStripRef = useRef<HTMLDivElement>(null);
  const [fixedStripH, setFixedStripH] = useState(44); // TopNav is 44px

  useEffect(() => {
    const el = fixedStripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setFixedStripH(entry.contentRect.height)
    );
    ro.observe(el);
    setFixedStripH(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [isMobile]); // re-measure when layout mode changes

  // Handle drag from More Tools drawer → sidebar (pin the item)
  const handleSidebarDrop = (e: React.DragEvent) => {
    const id = e.dataTransfer.getData("text/plain");
    if (id && nav.moreItems.some((item) => item.id === id)) {
      nav.pinItem(id);
    }
  };

  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: "100vh",
        background: palette.surfaceBg,
        fontFamily: "var(--font-family)",
        transition: "background 0.25s ease"
      }}
    >
      {/* ── Fixed top strip — all breakpoints ── */}
      <div
        ref={fixedStripRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 90,
          background: palette.surfaceBg,
          borderBottom: `1px solid ${palette.borderMedium}`,
          transition: "background 0.25s ease"
        }}
      >
        <TopNav
          homeItem={nav.homeItem}
          pinnedItems={nav.pinnedItems}
          moreItems={nav.moreItems}
          activeId={nav.activeId}
          onSelect={nav.setActiveId}
        />
        {/* Mobile-only page content (breadcrumb, header card, section nav) */}
        {isMobile && mobileFixedContent && (
          <div style={{ padding: "0 12px" }}>
            {mobileFixedContent}
          </div>
        )}
      </div>

      {/* ── Fixed sidebar — desktop & tablet only ── */}
      {!isMobile && (
        <Sidebar
          homeItem={nav.homeItem}
          pinnedItems={nav.pinnedItems}
          activeId={nav.activeId}
          onSelect={nav.setActiveId}
          onReorder={nav.reorderPinned}
          onUnpin={nav.unpinItem}
          onPinItem={nav.pinItem}
          onOpenMoreTools={() => setMoreToolsOpen((v) => !v)}
          moreToolsOpen={moreToolsOpen}
        />
      )}

      {/* ── More Tools drawer — desktop & tablet only ── */}
      {!isMobile && (
        <MoreToolsDrawer
          open={moreToolsOpen}
          items={nav.moreItems}
          onClose={() => setMoreToolsOpen(false)}
          onNavigate={(id) => {
            nav.setActiveId(id);
            setMoreToolsOpen(false);
          }}
          onPinItem={nav.pinItem}
          onUnpinItem={nav.unpinItem}
        />
      )}

      {/* ── Body: main content, pushed below fixed strip & beside sidebar ── */}
      <div
        className="flex flex-1"
        style={{
          paddingTop: fixedStripH,
          marginLeft: isMobile ? 0 : SIDEBAR_WIDTH,
          // Mobile & tablet: panel overlays (no push). Desktop: pushes content.
          marginRight: panelOpen && !isMobile && !isTablet
            ? panelWidthCss(panelSize)
            : 0,
          transition: "margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={handleSidebarDrop}
      >
        <main
          className="flex flex-col flex-1 min-w-0"
          style={{
            padding: isMobile
              ? "0 12px 80px"
              : isTablet
              ? "0 12px 80px"
              : "0 16px 80px",
          }}
        >
          {children}
        </main>
      </div>

      {/* ── Side panel — slides in from the right ── */}
      <SidePanel />

      {bottomBar}
    </div>
  );
}
