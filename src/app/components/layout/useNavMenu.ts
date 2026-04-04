import { useState, useCallback, useMemo } from "react";
import { ALL_NAV_ITEMS, DEFAULT_PINNED_IDS, HOME_ITEM } from "./navItems";
import type { NavItem } from "./navTypes";

export interface NavMenuState {
  /** Fixed Home item — always first, cannot be moved or removed. */
  homeItem: NavItem;
  /** Items currently pinned to the main sidebar (in display order). */
  pinnedItems: NavItem[];
  /** Items available in the "More Tools" drawer. */
  moreItems: NavItem[];
  /** The currently active/selected nav item id. */
  activeId: string;
  /** Set the active nav item. */
  setActiveId: (id: string) => void;
  /** Move an item from More Tools into the main menu at a given index. */
  pinItem: (id: string, atIndex?: number) => void;
  /** Remove an item from the main menu back to More Tools. */
  unpinItem: (id: string) => void;
  /** Reorder a pinned item by moving it to a new index. */
  reorderPinned: (fromIndex: number, toIndex: number) => void;
}

export function useNavMenu(): NavMenuState {
  const [pinnedIds, setPinnedIds] = useState<string[]>(DEFAULT_PINNED_IDS);
  const [activeId, setActiveId] = useState("clients");

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

  return { homeItem: HOME_ITEM, pinnedItems, moreItems, activeId, setActiveId, pinItem, unpinItem, reorderPinned };
}
