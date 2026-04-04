import {
  Home,
  Shield,
  Users,
  ClipboardCheck,
  UsersRound,
  KeyRound,
  Calendar,
  LayoutDashboard,
  Mail,
  Wrench,
  Trophy,
  UserPlus,
  ShoppingCart,
  BarChart2,
  Clock,
  FileText,
} from "lucide-react";
import type { NavItem } from "./navTypes";

/**
 * Fixed Home item — always first in every menu, cannot be moved or removed.
 * Navigates to the dashboard.
 */
export const HOME_ITEM: NavItem = {
  id: "home",
  label: "Home",
  icon: Home,
};

/**
 * Complete catalogue of every navigation item in the app (excludes Home).
 * Order here is the default display order.
 */
export const ALL_NAV_ITEMS: NavItem[] = [
  { id: "admin",           label: "Admin",           icon: Shield },
  { id: "documents",       label: "Documents",       icon: FileText, badge: "New!" },
  { id: "check-in",        label: "Check-In",        icon: ClipboardCheck },
  { id: "groups",          label: "Groups",          icon: UsersRound },
  { id: "rentals",         label: "Rentals",         icon: KeyRound },
  { id: "schedule",        label: "Schedule",        icon: Calendar },
  { id: "clients",         label: "Clients",         icon: Users },
  { id: "dashboard",       label: "Dashboard",       icon: LayoutDashboard },
  { id: "email-campaigns", label: "Email Campaigns", icon: Mail },
  { id: "equipment",       label: "Equipment",       icon: Wrench },
  { id: "ezleagues",       label: "EZLeagues",       icon: Trophy },
  { id: "ezsignup",        label: "EZSignup",        icon: UserPlus },
  { id: "point-of-sale",   label: "Point of Sale",   icon: ShoppingCart },
  { id: "reports",         label: "Reports",         icon: BarChart2 },
  { id: "time-clock",      label: "Time Clock",      icon: Clock },
];

/** IDs that appear in the main sidebar by default. */
export const DEFAULT_PINNED_IDS: string[] = [
  "documents",
  "admin",
  "check-in",
  "clients",
  "rentals",
  "schedule",
];
