/**
 * NavContext — shares the useNavMenu() state between the Layout shell and
 * the page-level routing in App so they both read from / write to the same
 * activeId.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useNavMenu, type NavMenuState } from "./useNavMenu";

const NavCtx = createContext<NavMenuState | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const nav = useNavMenu();
  return <NavCtx.Provider value={nav}>{children}</NavCtx.Provider>;
}

export function useNav(): NavMenuState {
  const ctx = useContext(NavCtx);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}
