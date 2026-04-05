/**
 * PinnedPagesContext — global state for pinned navigation pages.
 *
 * Pin state is persisted to localStorage so it survives page reloads and
 * is consistent across all instances of PageMenu within the same browser session.
 * Maximum of 10 pages may be pinned at one time.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { ALL_NAV_ITEMS, ADMIN_SUBPAGE_ITEMS, HOME_ITEM } from "./navItems";

export const MAX_PINS = 10;
const STORAGE_KEY = "ezf_pinned_pages";

const DEFAULT_PINS = ["schedule"];

/** Valid page IDs — used to discard stale values from localStorage. */
const VALID_PAGE_IDS = new Set(
  [HOME_ITEM, ...ALL_NAV_ITEMS, ...ADMIN_SUBPAGE_ITEMS].map((i) => i.id)
);

interface PinnedPagesContextValue {
  pinnedPages: string[];
  pinPage: (page: string) => void;
  unpinPage: (page: string) => void;
  togglePin: (page: string) => void;
  isPinned: (page: string) => boolean;
  canPin: boolean;
}

const PinnedPagesCtx = createContext<PinnedPagesContextValue | null>(null);

function persist(pages: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  } catch {
    // localStorage may be unavailable in some environments
  }
}

export function PinnedPagesProvider({ children }: { children: ReactNode }) {
  const [pinnedPages, setPinnedPages] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Discard any stale values that aren't real page IDs (e.g. old section
        // names like "Profile" that were stored by a previous version).
        const parsed = JSON.parse(stored) as string[];
        const valid = parsed.filter((id) => VALID_PAGE_IDS.has(id));
        if (valid.length > 0) return valid;
        // All stored values were invalid — fall through to default and
        // overwrite localStorage so the stale data doesn't persist.
        persist(DEFAULT_PINS);
      }
    } catch {
      // ignore parse errors
    }
    return DEFAULT_PINS;
  });

  const pinPage = useCallback((page: string) => {
    setPinnedPages((prev) => {
      if (prev.includes(page) || prev.length >= MAX_PINS) return prev;
      const next = [...prev, page];
      persist(next);
      return next;
    });
  }, []);

  const unpinPage = useCallback((page: string) => {
    setPinnedPages((prev) => {
      const next = prev.filter((p) => p !== page);
      persist(next);
      return next;
    });
  }, []);

  const togglePin = useCallback((page: string) => {
    setPinnedPages((prev) => {
      if (prev.includes(page)) {
        const next = prev.filter((p) => p !== page);
        persist(next);
        return next;
      }
      if (prev.length >= MAX_PINS) return prev;
      const next = [...prev, page];
      persist(next);
      return next;
    });
  }, []);

  const isPinned = useCallback(
    (page: string) => pinnedPages.includes(page),
    [pinnedPages]
  );

  const canPin = pinnedPages.length < MAX_PINS;

  return (
    <PinnedPagesCtx.Provider
      value={{ pinnedPages, pinPage, unpinPage, togglePin, isPinned, canPin }}
    >
      {children}
    </PinnedPagesCtx.Provider>
  );
}

export function usePinnedPages() {
  const ctx = useContext(PinnedPagesCtx);
  if (!ctx)
    throw new Error("usePinnedPages must be used within PinnedPagesProvider");
  return ctx;
}
