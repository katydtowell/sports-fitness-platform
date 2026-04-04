import type { ComponentType, SVGProps } from "react";

/** A single navigation menu item. */
export interface NavItem {
  /** Unique machine-readable key (e.g. "clients", "schedule"). */
  id: string;
  /** Human-readable label shown in the menu. */
  label: string;
  /** Lucide icon component rendered next to the label. */
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  /** Optional badge text (e.g. "New!") displayed on the item. */
  badge?: string;
}
