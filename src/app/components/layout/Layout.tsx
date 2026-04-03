/**
 * Layout — shared shell for all EZFacility pages.
 *
 * The TopNav is fixed at the top at every breakpoint. On mobile, any
 * page-specific content (breadcrumb, header card, section nav) can be
 * passed via `mobileFixedContent` and it will appear in the same fixed
 * strip directly below the TopNav.
 *
 * Usage:
 *   <Layout mobileFixedContent={<MyPageHeader />} bottomBar={<SaveBar />}>
 *     <MyPageContent />
 *   </Layout>
 */

import { useRef, useState, useEffect, type ReactNode } from "react";
import { useIsMobile } from "../ui/use-mobile";
import { useIsTablet } from "../ui/use-tablet";
import { TopNav } from "../client-profile/TopNav";
import { Sidebar } from "../client-profile/Sidebar";

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

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: "100vh", background: "#0a0e0f", fontFamily: "var(--font-family)" }}
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
          background: "#0a0e0f",
          borderBottom: "1px solid rgba(161,189,198,0.15)",
        }}
      >
        <TopNav />
        {/* Mobile-only page content (breadcrumb, header card, section nav) */}
        {isMobile && mobileFixedContent && (
          <div style={{ padding: "0 12px" }}>
            {mobileFixedContent}
          </div>
        )}
      </div>

      {/* ── Body: sidebar + main content, pushed below fixed strip ── */}
      <div
        className="flex flex-1"
        style={{ paddingTop: fixedStripH }}
      >
        {/* Sidebar shown on desktop and tablet only */}
        {!isMobile && <Sidebar />}

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

      {bottomBar}
    </div>
  );
}
