import { useState, useCallback, useMemo, useEffect } from "react";
import { ALL_NAV_ITEMS, DEFAULT_PINNED_IDS, HOME_ITEM } from "./navItems";
import type { NavItem } from "./navTypes";

/* ── URL ↔ nav-id helpers ──────────────────────────────────────────────── */

/** All valid nav ids (including "home"). */
const VALID_IDS = new Set([HOME_ITEM.id, ...ALL_NAV_ITEMS.map((n) => n.id)]);

/** Parse the URL into { id, subpage }. */
function parseUrl(): { id: string; subpage: string | null } {
  const parts = window.location.pathname.replace(/^\/+|\/+$/g, "").split("/");
  const first = parts[0] || "";
  const rest = parts.slice(1).join("/") || null;

  if (!first || first === "home") return { id: "home", subpage: null };
  if (VALID_IDS.has(first)) return { id: first, subpage: rest };
  return { id: "home", subpage: null };
}

/** Build a URL path from id + optional subpage. */
function buildUrl(id: string, subpage?: string | null): string {
  if (id === "home") return "/";
  return subpage ? `/${id}/${subpage}` : `/${id}`;
}

/* ── Hook ──────────────────────────────────────────────────────────────── */

export interface NavMenuState {
  /** Fixed Home item — always first, cannot be moved or removed. */
  homeItem: NavItem;
  /** Items currently pinned to the main sidebar (in display order). */
  pinnedItems: NavItem[];
  /** Items available in the "More Tools" drawer. */
  moreItems: NavItem[];
  /** The currently active/selected nav item id. */
  activeId: string;
  /** Optional subpage slug, e.g. "bob-roberts" when at /clients/bob-roberts. */
  subpage: string | null;
  /** Set the active nav item (clears any subpage). */
  setActiveId: (id: string) => void;
  /** Navigate to a subpage under the current (or specified) nav id. */
  setSubpage: (slug: string | null, navId?: string) => void;
  /** Move an item from More Tools into the main menu at a given index. */
  pinItem: (id: string, atIndex?: number) => void;
  /** Remove an item from the main menu back to More Tools. */
  unpinItem: (id: string) => void;
  /** Reorder a pinned item by moving it to a new index. */
  reorderPinned: (fromIndex: number, toIndex: number) => void;
}

export function useNavMenu(): NavMenuState {
  const [pinnedIds, setPinnedIds] = useState<string[]>(DEFAULT_PINNED_IDS);

  // Initialise from the current URL so shared links land on the right page.
  const [activeId, setActiveIdRaw] = useState(() => parseUrl().id);
  const [subpage, setSubpageRaw] = useState<string | null>(() => parseUrl().subpage);

  // Navigate to a top-level page (clears subpage).
  const setActiveId = useCallback((id: string) => {
    setActiveIdRaw(id);
    setSubpageRaw(null);
    const target = buildUrl(id);
    if (window.location.pathname !== target) {
      window.history.pushState({ navId: id }, "", target);
    }
  }, []);

  // Navigate to a subpage under a nav id.
  const setSubpage = useCallback((slug: string | null, navId?: string) => {
    const id = navId ?? activeId;
    if (navId) setActiveIdRaw(id);
    setSubpageRaw(slug);
    const target = buildUrl(id, slug);
    if (window.location.pathname !== target) {
      window.history.pushState({ navId: id, subpage: slug }, "", target);
    }
  }, [activeId]);

  // Listen for back / forward navigation.
  useEffect(() => {
    const onPopState = () => {
      const { id, subpage: sub } = parseUrl();
      setActiveIdRaw(id);
      setSubpageRaw(sub);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Replace the initial history entry so the first page also has state.
  useEffect(() => {
    window.history.replaceState(
      { navId: activeId, subpage },
      "",
      buildUrl(activeId, subpage),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pinnedItems = useMemo(
    () => pinnedIds.map((id) => ALL_NAV_ITEMS.find((n) => n.id === id)!).filter(Boolean),
    [pinnedIds],
  );

  const moreItems = useMemo(
    () => ALL_NAV_ITEMS.filter((n) => !pinnedIds.includes(n.id)),
    [pinnedIds],
  );

  const pinItem = useCallback((id: string, atIndex?: number) => {
    setPinnedIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev];
      if (atIndex !== undefined && atIndex >= 0 && atIndex <= next.length) {
        next.splice(atIndex, 0, id);
      } else {
        next.push(id);
      }
      return next;
    });
  }, []);

  const unpinItem = useCallback((id: string) => {
    setPinnedIds((prev) => prev.filter((pid) => pid !== id));
  }, []);

  const reorderPinned = useCallback((fromIndex: number, toIndex: number) => {
    setPinnedIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  return {
    homeItem: HOME_ITEM, pinnedItems, moreItems,
    activeId, subpage, setActiveId, setSubpage,
    pinItem, unpinItem, reorderPinned,
  };
}
