/**
 * SchedulePage — monthly calendar view for managing reservations.
 *
 * Features:
 *  • Month view calendar grid with color-coded event badges (desktop)
 *  • Mobile responsive view with compact calendar and event list
 *  • Click an event to see reservation details in a floating panel
 *  • Month navigation (prev / next)
 *  • Search and filter controls
 *  • "+ Add Reservation" CTA
 *  • Full dark / light mode support via ThemeContext
 *
 * Matches the Figma design: Flowbite_Calendar_EZLeagues
 */

import { useState, useRef, useEffect, useCallback, useMemo, type CSSProperties, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  SlidersHorizontal,
  Calendar as CalendarIcon,
  Clock,
  User,
  MapPin,
  ArrowRight,
  Grid3x3,
  Calendar as CalendarViewIcon,
  X,
  Pencil,
  Users,
  Trophy,
  Hourglass,
  Info,
  ExternalLink,
  ArrowUpDown,
  Sparkles,
  Send,
  Copy,
  Settings,
} from "lucide-react";
import { useTheme, type ThemePalette, EZ_GREEN, EZ_GREEN_ON_COLOR, EZ_RED, EZ_RED_ON_COLOR } from "../layout/ThemeContext";
import { useSidePanel } from "../layout/SidePanelContext";
import { useIsMobile } from "../ui/use-mobile";
import { CancelConfirmModal } from "../client-profile/CancelConfirmModal";
import { TimeField } from "../ui/TimeField";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

// A reservation type is the activity category — e.g. "Power Yoga" the
// session is a "Yoga" reservation type, "Stretch & Restore" the session
// is a "Meditation" reservation type. Specific session names live on
// `event.title`; this enum drives color and grouping.
type ReservationType =
  | "yoga"
  | "meditation"
  | "pilates"
  | "hiit"
  | "league"
  | "closed";

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  type: ReservationType;
  instructor: string;
  venue: string;
  booked: number;
  capacity: number;
  fullWidth?: boolean;
  /** When true, a full class shows "Waitlist" instead of "Full". */
  waitlistEnabled?: boolean;
  /** Pre-buffer time in minutes — when > 0, the badge renders a diagonal-stripe
   *  indicator at its leading edge. */
  preBuffer?: number;
  /** Post-buffer time in minutes — when > 0, the badge renders a diagonal-stripe
   *  indicator at its trailing edge. */
  postBuffer?: number;
  /** Session length in minutes. Defaults to 60 (see `makeEvent`) — most
   *  demo sessions fill a full hour, but a resource can also be booked for
   *  several shorter back-to-back sessions (e.g. four 15-minute sessions)
   *  as long as they don't overlap. Used to compute each session's actual
   *  end time and to detect/prevent double-booking a single instructor or
   *  venue for overlapping time ranges. */
  duration?: number;
}

interface DayEvents {
  [day: number]: CalendarEvent[];
}

/* ═══════════════════════════════════════════════════════════════════════════
   EVENT TYPE STYLES — light & dark palettes
   ═══════════════════════════════════════════════════════════════════════ */

interface BadgeColors {
  bg: string;
  border: string;
  text: string;
}

const LIGHT_EVENT_STYLES: Record<ReservationType, BadgeColors> = {
  yoga:          { bg: "#fef0f2", border: "#ffccd3", text: "#8b0836" },
  meditation:    { bg: "#f0fdff", border: "#a2f4fd", text: "#0092b8" },
  pilates:       { bg: "#f7f0ff", border: "#e9d4ff", text: "#9810fa" },
  hiit:          { bg: "#fff8f1", border: "#fcd9bd", text: "#771d1d" },
  league:        { bg: "#ffffff", border: "#e5e7eb", text: "#101828" },
  closed:        { bg: "#f3f4f6", border: "#e5e7eb", text: "#6b7280" },
};

const DARK_EVENT_STYLES: Record<ReservationType, BadgeColors> = {
  yoga:          { bg: "rgba(139,8,54,0.20)",  border: "rgba(139,8,54,0.40)",  text: "#f5a0b8" },
  meditation:    { bg: "rgba(0,146,184,0.15)",  border: "rgba(0,146,184,0.35)", text: "#5dd8f0" },
  pilates:       { bg: "rgba(152,16,250,0.15)", border: "rgba(152,16,250,0.30)",text: "#d4a0ff" },
  hiit:          { bg: "rgba(119,29,29,0.20)",  border: "rgba(252,217,189,0.30)",text: "#fcd9bd" },
  league:        { bg: "rgba(161,189,198,0.08)",border: "rgba(161,189,198,0.20)",text: "#dfe9ec" },
  closed:        { bg: "rgba(161,189,198,0.06)",border: "rgba(161,189,198,0.15)",text: "#6e8b94" },
};

function getEventStyles(isDark: boolean): Record<ReservationType, BadgeColors> {
  return isDark ? DARK_EVENT_STYLES : LIGHT_EVENT_STYLES;
}

/* ═══════════════════════════════════════════════════════════════════════════
   THEME-DERIVED SEMANTIC COLORS
   ═══════════════════════════════════════════════════════════════════════ */

interface SemanticColors {
  /** main cell / popover background */
  cellBg: string;
  /** empty cell / header bar background */
  headerBg: string;
  /** borders throughout */
  border: string;
  /** heading text */
  heading: string;
  /** body / secondary text */
  body: string;
  /** muted / placeholder text */
  muted: string;
  /** input background */
  inputBg: string;
  /** small-button / control background */
  controlBg: string;
  /** primary brand */
  brand: string;
  /** success / progress bar fill */
  success: string;
  /** progress bar track */
  track: string;
  /** shadow on popover */
  shadow: string;
}

function semanticColors(palette: ThemePalette, isDark: boolean): SemanticColors {
  if (isDark) {
    return {
      cellBg:    palette.surfacePrimary,   // #182023
      headerBg:  palette.surfaceSecondary,  // #29373d
      border:    palette.outlineTertiary,   // #3e535b
      heading:   palette.textPrimary,       // #dfe9ec
      body:      palette.textTertiary,      // #a1bdc6
      muted:     palette.textDisabled,      // #6e8b94
      inputBg:   palette.surfacePrimary,    // #182023
      controlBg: palette.surfaceSecondary,  // #29373d
      brand:     palette.primary,           // #00c4a0
      success:   palette.textSuccess,       // #00c28a
      track:     palette.surfaceTertiary,   // #3e535b
      shadow:    "rgba(0,0,0,0.5)",
    };
  }
  return {
    cellBg:    "#ffffff",
    headerBg:  "#f9fafb",
    border:    "#e5e7eb",
    heading:   "#101828",
    body:      "#4a5565",
    muted:     "#6a7282",
    inputBg:   "#f9fafb",
    controlBg: "#f9fafb",
    brand:     "#00c28a",
    success:   "#007a55",
    track:     "#e5e7eb",
    shadow:    "rgba(0,0,0,0.1)",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   DISPLAY PREFERENCES — registration-status visibility, per schedule view
   AND per status category
   ───────────────────────────────────────────────────────────────────────
   Purely a display preference: whether a session's full/waitlisted/nearly-
   full/available state is painted onto the calendar (colored time chip on
   Monthly/Weekly, status pill on Resources, capacity meter on Daily).
   Independently toggleable per view AND per status category, so e.g. a
   user can choose to see only "Available" indicators on the Monthly view
   while leaving every other combination on.
   Turning any of this off never changes the Reservation Details panel —
   that always shows full registration detail regardless of this setting.
   Persisted to localStorage so it survives reloads, same pattern as
   PinnedPagesContext. Defaults to "on" everywhere (today's behavior).
   ═══════════════════════════════════════════════════════════════════════ */

/** Feature flag — hides the Delete Mode toggle from every schedule view's
 *  toolbar while keeping the feature (state, event dimming, click-to-delete
 *  gating) fully wired up underneath. Flip back to `true` to bring the
 *  toggle back with no other changes needed. */
const SHOW_DELETE_MODE_TOGGLE = false;

/** The four independently-toggleable schedule views. */
type ScheduleViewId = "Monthly" | "Weekly" | "Daily" | "Resources";

const SCHEDULE_VIEW_IDS: ScheduleViewId[] = ["Monthly", "Weekly", "Daily", "Resources"];

/** The four visual registration-status categories a session can fall into.
 *  Mirrors the Filters tab's "Registrations" options (minus "Empty", which
 *  is a filter-only concept — Empty sessions are visually just "Available"). */
type RegistrationStatusCategory = "Available" | "NearlyFull" | "Full" | "Waitlisted";

const REGISTRATION_STATUS_CATEGORIES: RegistrationStatusCategory[] = [
  "Available",
  "NearlyFull",
  "Full",
  "Waitlisted",
];

/** Display label + dot color for each category, used by the Preferences
 *  tab's per-status checkboxes. Colors match each category's actual badge
 *  color elsewhere on the calendar (see EventBadge/ResourcesView/DailyView)
 *  so the checkbox list doubles as a small legend. */
const REGISTRATION_STATUS_CATEGORY_META: Record<
  RegistrationStatusCategory,
  { label: string; dotLight: string; dotDark: string }
> = {
  Available:  { label: "Available",   dotLight: EZ_GREEN,  dotDark: EZ_GREEN },
  NearlyFull: { label: "Nearly full", dotLight: "#FFE109",  dotDark: "#FFE109" },
  Full:       { label: "Full",        dotLight: EZ_RED,     dotDark: EZ_RED },
  Waitlisted: { label: "Waitlisted",  dotLight: "#d41840",  dotDark: "#e05a5a" },
};

/** Per-view visibility for each of the four status categories. */
type ViewStatusVisibility = Record<RegistrationStatusCategory, boolean>;

type RegistrationStatusPrefs = Record<ScheduleViewId, ViewStatusVisibility>;

function makeDefaultViewStatusVisibility(): ViewStatusVisibility {
  return { Available: true, NearlyFull: true, Full: true, Waitlisted: true };
}

function makeDefaultRegistrationStatusPrefs(): RegistrationStatusPrefs {
  return {
    Monthly: makeDefaultViewStatusVisibility(),
    Weekly: makeDefaultViewStatusVisibility(),
    Daily: makeDefaultViewStatusVisibility(),
    Resources: makeDefaultViewStatusVisibility(),
  };
}

const REGISTRATION_STATUS_PREFS_KEY = "ezf_schedule_registration_status_prefs";

function loadRegistrationStatusPrefs(): RegistrationStatusPrefs {
  const defaults = makeDefaultRegistrationStatusPrefs();
  try {
    const stored = localStorage.getItem(REGISTRATION_STATUS_PREFS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<
        Record<ScheduleViewId, Partial<ViewStatusVisibility>>
      >;
      // Merge over the defaults per-view AND per-category rather than
      // trusting the stored shape outright, so a future new view or status
      // category (or a stale/partial record) always ends up with a valid
      // boolean instead of `undefined`.
      const merged = {} as RegistrationStatusPrefs;
      for (const view of SCHEDULE_VIEW_IDS) {
        merged[view] = { ...defaults[view], ...(parsed?.[view] ?? {}) };
      }
      return merged;
    }
  } catch {
    // localStorage may be unavailable, or the stored value malformed —
    // fall through to defaults either way.
  }
  return defaults;
}

function persistRegistrationStatusPrefs(prefs: RegistrationStatusPrefs) {
  try {
    localStorage.setItem(REGISTRATION_STATUS_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage may be unavailable in some environments — the
    // preference just won't survive a reload, which is an acceptable
    // fallback rather than a hard error.
  }
}

/** Given a session's derived capacity state, which status category it
 *  visually falls into — used to look up the right boolean in a view's
 *  ViewStatusVisibility. */
function registrationStatusCategoryOf(
  isFull: boolean,
  isWaitlisted: boolean,
  isNearlyFull: boolean
): RegistrationStatusCategory {
  if (isWaitlisted) return "Waitlisted";
  if (isFull) return "Full";
  if (isNearlyFull) return "NearlyFull";
  return "Available";
}

/* ═══════════════════════════════════════════════════════════════════════════
   GENERAL SCHEDULE PREFERENCES — default view, density, filter memory,
   and "highlight my sessions"
   ───────────────────────────────────────────────────────────────────────
   Small, independent preferences, each persisted under its own
   localStorage key (same approach as the registration-status prefs
   above). Generic string/bool helpers below avoid writing a bespoke
   load/persist pair for each one.
   ═══════════════════════════════════════════════════════════════════════ */

/** There's no real authentication in this demo, so "my sessions" is
 *  hard-coded to one of the mock instructors (see INSTRUCTOR_OPTIONS)
 *  rather than coming from a logged-in user. Swap this for the real
 *  signed-in instructor's name once auth exists. */
const CURRENT_USER_INSTRUCTOR = "Sara Chen";

type ScheduleDensity = "comfortable" | "compact";
const SCHEDULE_DENSITIES: ScheduleDensity[] = ["comfortable", "compact"];

const DEFAULT_VIEW_PREF_KEY = "ezf_schedule_default_view";
const DENSITY_PREF_KEY = "ezf_schedule_density";
const KEEP_FILTERS_PREF_KEY = "ezf_schedule_keep_filters";
const HIGHLIGHT_MINE_PREF_KEY = "ezf_schedule_highlight_my_sessions";

function loadStringPref<T extends string>(key: string, fallback: T, validValues: readonly T[]): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored && (validValues as readonly string[]).includes(stored)) return stored as T;
  } catch {
    // localStorage unavailable — fall through to the default.
  }
  return fallback;
}

function loadBoolPref(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(key);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    // localStorage unavailable — fall through to the default.
  }
  return fallback;
}

function persistPref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable in some environments — the preference
    // just won't survive a reload.
  }
}

/** The 9 filter dimensions from the Filters tab, persisted together as one
 *  record when "Keep my filters" is on. */
interface PersistedScheduleFilters {
  filterStartDate: string;
  filterEndDate: string;
  filterStartTime: string;
  filterEndTime: string;
  filterVenues: string[];
  filterInstructors: string[];
  filterTypes: ReservationType[];
  filterPaymentStatus: "" | "Owed" | "Paid";
  filterRegistrations: string[];
}

const PERSISTED_FILTERS_KEY = "ezf_schedule_persisted_filters";

function loadPersistedFilters(): PersistedScheduleFilters | null {
  try {
    const stored = localStorage.getItem(PERSISTED_FILTERS_KEY);
    if (stored) return JSON.parse(stored) as PersistedScheduleFilters;
  } catch {
    // localStorage unavailable, or the stored value malformed.
  }
  return null;
}

function persistFilters(filters: PersistedScheduleFilters) {
  try {
    localStorage.setItem(PERSISTED_FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // localStorage unavailable in some environments.
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA — keyed by day-of-month (renders in whatever month is displayed)
   ═══════════════════════════════════════════════════════════════════════ */

function generateMockEvents(): DayEvents {
  const events: DayEvents = {};

  // booked/capacity default to -1 (sentinel). The post-processor below fills
  // in varied, type-appropriate values for any event that didn't pass
  // explicit values, so the demo schedule shows realistic variety in
  // booking levels rather than every "default" event reading 32/36.
  const makeEvent = (
    id: string,
    title: string,
    time: string,
    type: ReservationType,
    instructor = "Alan Alda",
    venue = "Studio B",
    booked = -1,
    capacity = -1,
    fullWidth = false,
    waitlistEnabled = false,
    preBuffer = 0,
    postBuffer = 0,
    duration = 60
  ): CalendarEvent => ({ id, title, time, type, instructor, venue, booked, capacity, fullWidth, waitlistEnabled, preBuffer, postBuffer, duration });

  // Week 1: days 1-7
  // Day 1 — mix of all states + buffer variants (pre-only, post-only, both, none)
  events[1] = [
    makeEvent("1a", "Power Yoga", "11am", "yoga", "Alan Alda", "Studio B", 12, 36, false, false, 15, 0),     // pre-buffer only
    makeEvent("1b", "Meditation", "12pm", "meditation", "Sara Chen", "Studio A", 20, 20, false, true, 0, 15),       // post-buffer only
    makeEvent("1c", "Yoga", "1pm", "yoga", "Alan Alda", "Studio B", 28, 36, false, false, 15, 15),                  // both buffers
    makeEvent("1d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 30, 30, false, false),                      // no buffer
    makeEvent("1e", "Pilates", "3pm", "pilates", "Lisa Park", "Studio A", 8, 24, false, false, 30, 0),              // pre-buffer only (longer)
    makeEvent("1f", "Meditation", "4pm", "meditation", "Sara Chen", "Studio A", 24, 24, false, true),               // no buffer
    makeEvent("1g", "Power Yoga", "5pm", "yoga", "Alan Alda", "Studio B", 18, 18, false, false, 15, 30),      // both, asymmetric
  ];
  events[2] = [
    makeEvent("2a", "Power Yoga", "11am", "yoga", "Alan Alda", "Studio B", 10, 36, false, false, 15, 15),     // both
    makeEvent("2b", "Meditation", "12pm", "meditation", "Sara Chen", "Studio A", 20, 20, false, true),              // none
    makeEvent("2c", "Yoga", "11am", "yoga", "Alan Alda", "Studio B", 36, 36, false, false, 30, 0),                  // pre only
    makeEvent("2d", "Stretch & Restore", "2pm", "meditation", "Lisa Park", "Studio A", 5, 20, false, false, 0, 15),    // post only
    makeEvent("2e", "HIIT", "3pm", "hiit", "Marcus Jones", "Gym Floor", 30, 30, false, true, 15, 15),               // both
    makeEvent("2f", "Pilates", "4pm", "pilates", "Lisa Park", "Studio A", 15, 24, false, false),                    // none
  ];
  events[3] = [
    makeEvent("3a", "Yoga", "11am", "yoga", "Alan Alda", "Studio B", 22, 36, false, false, 15, 0),                  // pre only
    makeEvent("3b", "Tigers v. Capybaras", "12pm", "league", "—", "Field A", 0, 0, true, false, 30, 30),            // both (league: longer)
    makeEvent("3c", "Yoga", "1pm", "yoga", "Alan Alda", "Studio B", 36, 36, false, true, 0, 15),                    // post only
    makeEvent("3d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 14, 30, false, false, 15, 30),              // both
    makeEvent("3e", "Pilates", "3pm", "pilates", "Lisa Park", "Studio A", 24, 24, false, false),                    // none
    makeEvent("3f", "Meditation", "4pm", "meditation", "Sara Chen", "Studio A", 6, 20, false, false, 0, 30),        // post only
  ];
  events[4] = [
    makeEvent("4a", "Power Yoga", "11am", "yoga", "Alan Alda", "Studio B", 0, 36, false, false, 15, 0),       // pre only
    makeEvent("4b", "Meditation", "12pm", "meditation", "Sara Chen", "Studio A", 20, 20, false, true),              // none
    makeEvent("4c", "Yoga", "1pm", "yoga", "Alan Alda", "Studio B", 30, 36, false, false, 30, 30),                  // both
    makeEvent("4d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 30, 30, false, false),                      // none
    makeEvent("4e", "Pilates", "3pm", "pilates", "Lisa Park", "Studio A", 10, 24, false, false, 0, 15),             // post only
  ];
  events[5] = [
    makeEvent("5a", "Morning Yoga Reset", "11am", "yoga", "Alan Alda", "Studio B", 15, 36, false, false, 15, 0),  // pre only
    makeEvent("5b", "Meditation", "12pm", "meditation", "Sara Chen", "Studio A", 18, 20, false, false),             // none
    makeEvent("5c", "Yoga", "1pm", "yoga", "Alan Alda", "Studio B", 36, 36, false, true, 0, 15),                    // post only
    makeEvent("5d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 25, 30, false, false, 15, 15),              // both
    makeEvent("5e", "Pilates", "3pm", "pilates", "Lisa Park", "Studio A", 24, 24, false, false),                    // none
  ];
  events[6] = [
    makeEvent("6a", "Morning Yoga Reset", "11am", "yoga", "Alan Alda", "Studio B", 20, 36, false, false),   // none
    makeEvent("6b", "Meditation", "12pm", "meditation", "Sara Chen", "Studio A", 20, 20, false, true, 15, 0),       // pre only
    makeEvent("6c", "Yoga", "1pm", "yoga", "Alan Alda", "Studio B", 36, 36, false, false, 0, 30),                   // post only
    makeEvent("6d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 8, 30, false, false, 15, 15),               // both
    makeEvent("6e", "Pilates", "3pm", "pilates", "Lisa Park", "Studio A", 12, 24, false, false),                    // none
  ];
  events[7] = [
    makeEvent("7a", "Yoga", "11am", "yoga", "Alan Alda", "Studio B", 30, 36, false, false, 30, 0),                  // pre only
    makeEvent("7b", "Meditation", "12pm", "meditation", "Sara Chen", "Studio A", 20, 20, false, true),              // none
    makeEvent("7c", "Yoga", "1pm", "yoga", "Alan Alda", "Studio B", 10, 36, false, false, 0, 15),                   // post only
    makeEvent("7d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 30, 30, false, false, 15, 15),              // both
  ];

  // Week 2: days 8-14
  events[8] = [
    makeEvent("8a", "Yoga", "11am", "yoga"),
    makeEvent("8b", "Meditation", "12am", "meditation", "Sara Chen", "Studio A", 0, 20),
    makeEvent("8c", "Power Yoga", "1pm", "yoga"),
    makeEvent("8d", "HIIT", "2pm", "hiit"),
    makeEvent("8e", "Pilates", "3pm", "pilates"),
  ];
  events[9] = [
    makeEvent("9a", "Yoga", "11am", "yoga"),
    makeEvent("9b", "Stretch & Restore", "12pm", "meditation"),
    makeEvent("9c", "Meditation", "1pm", "meditation"),
    makeEvent("9d", "Pilates", "3pm", "pilates"),
  ];
  events[10] = [
    makeEvent("10a", "Yoga", "11am", "yoga"),
    makeEvent("10b", "Tigers v. Capybaras", "12pm", "league", "—", "Field A", 0, 0, true, false, 30, 30),
    makeEvent("10c", "Pilates", "3pm", "pilates"),
    makeEvent("10d", "Yoga", "2pm", "yoga", "Sara Chen", "Studio A"),
  ];
  events[11] = [
    makeEvent("11a", "CLOSED", "", "closed", "", "", 0, 0, true),
  ];
  events[12] = [
    makeEvent("12a", "Morning Yoga Reset", "11am", "yoga", "Alan Alda", "Studio B", 32, 36),
    makeEvent("12b", "Meditation", "12am", "meditation"),
    makeEvent("12c", "Yoga", "1pm", "yoga"),
    makeEvent("12d", "HIIT", "2pm", "hiit"),
    makeEvent("12e", "Pilates", "3pm", "pilates"),
  ];
  events[13] = [
    makeEvent("13a", "Morning Yoga Reset", "11am", "yoga", "Alan Alda", "Studio B", 0, 36),
    makeEvent("13b", "Meditation", "12am", "meditation"),
    makeEvent("13c", "Yoga", "1pm", "yoga"),
    makeEvent("13d", "HIIT", "2pm", "hiit"),
    makeEvent("13e", "Pilates", "3pm", "pilates"),
  ];
  events[14] = [
    makeEvent("14a", "Yoga", "11am", "yoga"),
    makeEvent("14b", "Meditation", "12am", "meditation"),
    makeEvent("14c", "Yoga", "1pm", "yoga"),
    makeEvent("14d", "HIIT", "2pm", "hiit"),
    makeEvent("14e", "Pilates", "3pm", "pilates"),
  ];

  // Week 3: days 15-21
  events[15] = [
    makeEvent("15a", "Yoga", "11am", "yoga"),
    makeEvent("15b", "Meditation", "12am", "meditation"),
    makeEvent("15c", "Power Yoga", "1pm", "yoga"),
    makeEvent("15d", "Tigers v. Capybaras", "1:30pm", "league", "—", "Field A", 0, 0, true, false, 30, 30),
    makeEvent("15e", "HIIT", "2pm", "hiit"),
    makeEvent("15f", "Pilates", "3pm", "pilates"),
    makeEvent("15g", "Stretch & Restore", "4pm", "meditation"),
    makeEvent("15h", "HIIT", "5pm", "hiit"),
    makeEvent("15i", "Power Yoga", "6pm", "yoga"),
    makeEvent("15j", "Meditation", "7pm", "meditation"),
    makeEvent("15k", "Yoga", "8pm", "yoga"),
    makeEvent("15l", "Pilates", "9pm", "pilates"),
    makeEvent("15m", "HIIT", "10pm", "hiit"),
  ];
  events[16] = [
    makeEvent("16a", "Yoga", "11am", "yoga"),
    makeEvent("16b", "Meditation", "12am", "meditation"),
    makeEvent("16c", "Yoga", "1pm", "yoga", "Alan Alda", "Studio B", 0, 36),
    makeEvent("16d", "HIIT", "2pm", "hiit"),
    makeEvent("16e", "Pilates", "3pm", "pilates"),
  ];
  events[17] = [
    makeEvent("17a", "Yoga", "11am", "yoga"),
    makeEvent("17b", "Tigers v. Capybaras", "12pm", "league", "—", "Field A", 0, 0, true, false, 30, 30),
    makeEvent("17c", "Power Yoga", "1pm", "yoga"),
    makeEvent("17d", "HIIT", "2pm", "hiit"),
    makeEvent("17e", "Meditation", "3pm", "meditation"),
  ];
  events[18] = [
    makeEvent("18a", "Morning Yoga Reset", "11am", "yoga"),
    makeEvent("18b", "Meditation", "12am", "meditation"),
    makeEvent("18c", "Tigers v. Capybaras", "1pm", "league", "—", "Field A", 0, 0, true, false, 30, 30),
    makeEvent("18d", "Power Yoga", "2pm", "yoga"),
    makeEvent("18e", "HIIT", "3pm", "hiit"),
  ];
  events[19] = [
    makeEvent("19a", "Yoga", "11am", "yoga"),
    makeEvent("19b", "Stretch & Restore", "12pm", "meditation"),
    makeEvent("19c", "Meditation", "1pm", "meditation", "Sara Chen", "Studio A", 0, 20),
    makeEvent("19d", "HIIT", "2pm", "hiit"),
    makeEvent("19e", "Pilates", "3pm", "pilates"),
  ];
  events[20] = [
    makeEvent("20a", "Yoga", "11am", "yoga"),
    makeEvent("20b", "Meditation", "12am", "meditation"),
    makeEvent("20c", "Yoga", "1pm", "yoga"),
    makeEvent("20d", "HIIT", "2pm", "hiit"),
    makeEvent("20e", "Pilates", "3pm", "pilates"),
  ];
  events[21] = [
    makeEvent("21a", "Yoga", "11am", "yoga"),
    makeEvent("21b", "Pilates", "12am", "pilates", "Lisa Park", "Studio A", 0, 24),
    makeEvent("21c", "Yoga", "1pm", "yoga"),
    makeEvent("21d", "HIIT", "2pm", "hiit"),
    makeEvent("21e", "Pilates", "3pm", "pilates"),
  ];

  // Week 4: days 22-28
  events[22] = [
    makeEvent("22a", "Tigers v. Capybaras", "11am", "league", "—", "Field A", 0, 0, true, false, 30, 30),
    makeEvent("22b", "Yoga", "12pm", "yoga"),
    makeEvent("22c", "HIIT", "2pm", "hiit"),
    makeEvent("22d", "Meditation", "3pm", "meditation"),
  ];
  events[23] = [
    makeEvent("23a", "Yoga", "11am", "yoga"),
    makeEvent("23b", "Meditation", "12am", "meditation"),
    makeEvent("23c", "Yoga", "1pm", "yoga"),
    makeEvent("23d", "HIIT", "2pm", "hiit"),
    makeEvent("23e", "Pilates", "3pm", "pilates"),
  ];
  events[24] = [
    makeEvent("24a", "Morning Yoga Reset", "11am", "yoga"),
    makeEvent("24b", "Tigers v. Capybaras", "12pm", "league", "—", "Field A", 0, 0, true, false, 30, 30),
    makeEvent("24c", "Yoga", "1pm", "yoga"),
    makeEvent("24d", "HIIT", "2pm", "hiit"),
    makeEvent("24e", "Pilates", "3pm", "pilates"),
  ];
  events[25] = [
    makeEvent("25a", "Yoga", "11am", "yoga"),
    makeEvent("25b", "Meditation", "12am", "meditation", "Sara Chen", "Studio A", 0, 20),
    makeEvent("25c", "Yoga", "1pm", "yoga"),
    makeEvent("25d", "HIIT", "2pm", "hiit"),
  ];
  events[26] = [
    makeEvent("26a", "Yoga", "11am", "yoga"),
    makeEvent("26b", "Meditation", "12am", "meditation"),
    makeEvent("26c", "Yoga", "1pm", "yoga"),
    makeEvent("26d", "HIIT", "2pm", "hiit"),
    makeEvent("26e", "Pilates", "3pm", "pilates"),
  ];
  events[27] = [
    makeEvent("27a", "Stretch & Restore", "12pm", "meditation", "Lisa Park", "Studio A", 0, 20),
    makeEvent("27b", "Yoga", "1pm", "yoga"),
    makeEvent("27c", "Meditation", "2pm", "meditation"),
    makeEvent("27d", "HIIT", "3pm", "hiit"),
    makeEvent("27e", "Pilates", "4pm", "pilates"),
  ];
  events[28] = [
    makeEvent("28a", "Yoga", "11am", "yoga"),
    makeEvent("28b", "Meditation", "12am", "meditation"),
    makeEvent("28c", "Power Yoga", "2pm", "yoga"),
    makeEvent("28d", "HIIT", "3pm", "hiit"),
    makeEvent("28e", "Yoga", "4pm", "yoga"),
    makeEvent("28f", "Pilates", "5pm", "pilates"),
    makeEvent("28g", "HIIT", "6pm", "hiit"),
  ];

  // Week 5: days 29-31 (only render in months with 29+ days)
  events[29] = [
    makeEvent("29a", "Morning Yoga Reset", "11am", "yoga", "Alan Alda", "Studio B", 18, 36, false, false),
    makeEvent("29b", "Meditation", "12pm", "meditation", "Sara Chen", "Studio A", 14, 20, false, false),
    makeEvent("29c", "Yoga", "1pm", "yoga", "Alan Alda", "Studio B", 26, 36, false, false),
    makeEvent("29d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 22, 30, false, false),
    makeEvent("29e", "Pilates", "3pm", "pilates", "Lisa Park", "Studio A", 16, 24, false, false),
  ];
  events[30] = [
    makeEvent("30a", "Power Yoga", "11am", "yoga", "Alan Alda", "Studio B", 30, 36, false, false),
    makeEvent("30b", "Stretch & Restore", "12pm", "meditation", "Lisa Park", "Studio A", 8, 20, false, false),
    makeEvent("30c", "Tigers v. Capybaras", "1pm", "league", "—", "Field A", 0, 0, true, false, 30, 30),
    makeEvent("30d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 30, 30, false, true),
    makeEvent("30e", "Meditation", "3pm", "meditation", "Sara Chen", "Studio A", 12, 20, false, false),
  ];
  events[31] = [
    makeEvent("31a", "Yoga", "11am", "yoga", "Alan Alda", "Studio B", 24, 36, false, false),
    makeEvent("31b", "Meditation", "12pm", "meditation", "Sara Chen", "Studio A", 20, 20, false, true),
    makeEvent("31c", "Power Yoga", "1pm", "yoga", "Alan Alda", "Studio B", 18, 36, false, false),
    makeEvent("31d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 26, 30, false, false),
    makeEvent("31e", "Pilates", "3pm", "pilates", "Lisa Park", "Studio A", 20, 24, false, false),
  ];

  // ── Post-process: distribute instructors and venues across realistic
  // pools per reservation type, fill in capacity/booked, and — this part
  // is load-bearing, not cosmetic — make sure no single instructor or
  // venue ever ends up double-booked for overlapping time ranges. A
  // resource CAN run back-to-back sessions, even several short ones
  // stacked inside one hour, it just can never have two sessions whose
  // times actually overlap (that's not something that happens in real
  // scheduling). The original makeEvent calls used "Alan Alda" / "Studio B"
  // as lazy defaults (and many were never overridden), which made the
  // by-resource sort look like one giant Alan Alda / Studio B group; we
  // override those values here based on a deterministic hash of the event
  // id so the demo schedule has realistic variety while staying stable
  // across renders — now filtered through a conflict check before anything
  // is finalized.
  const INSTRUCTORS_FOR: Partial<Record<ReservationType, string[]>> = {
    yoga:       ["Alan Alda", "Derek Thompson", "Olivia Nguyen"],
    meditation: ["Sara Chen", "James Kim"],
    pilates:    ["Lisa Park", "Mia Rodriguez"],
    hiit:       ["Marcus Jones", "Derek Thompson"],
  };
  const VENUES_FOR: Partial<Record<ReservationType, string[]>> = {
    yoga:       ["Studio A", "Studio B", "Multipurpose Room"],
    meditation: ["Studio A", "Studio B", "Multipurpose Room"],
    pilates:    ["Studio A", "Multipurpose Room"],
    hiit:       ["Gym Floor", "Multipurpose Room", "Court 1", "Court 2"],
  };
  // Fallback pools — every named instructor/venue above, deduped — used
  // when a type's own pool is entirely busy for a given time span so
  // assignment still has somewhere left to go instead of double-booking.
  const ALL_INSTRUCTORS = Array.from(new Set(Object.values(INSTRUCTORS_FOR).flatMap((arr) => arr ?? [])));
  const ALL_VENUES = Array.from(new Set(Object.values(VENUES_FOR).flatMap((arr) => arr ?? [])));

  const hashId = (id: string): number => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
    return Math.abs(h);
  };
  // Default capacity per reservation type — used when an event was
  // created without explicit capacity. Reflects realistic studio sizing.
  const CAPACITY_FOR: Partial<Record<ReservationType, number>> = {
    yoga:       36,
    meditation: 20,
    pilates:    24,
    hiit:       30,
  };
  // Pool of booking-level percentages. Spans nearly-empty through fully
  // booked, weighted toward partially-full so the demo schedule looks
  // active without every class showing the same "almost-full" state.
  const BOOKING_LEVELS = [
    0.15, 0.25, 0.35, 0.45, 0.50, 0.55, 0.60, 0.65,
    0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.0,
  ];
  // Per-day, per-type instructor/venue distribution. Within each
  // day+type bucket we pick one of three *preferred* modes deterministically:
  //   0 = "all same"   → every session of that type on that day prefers
  //                      one instructor (or venue), demonstrating the
  //                      multi-sessions-per-resource case when sorting by
  //                      resource — but only for sessions whose times
  //                      don't actually overlap (see assignResource below;
  //                      a preference is never allowed to cause a
  //                      double-booking).
  //   1 = "paired"     → consecutive pairs share, so a 3-session bucket
  //                      becomes [A, A, B] etc.
  //   2 = "distributed"→ round-robin across the pool — different
  //                      resource for each session.
  // This produces realistic variety: some days have busy instructors
  // teaching multiple back-to-backs, others spread sessions across the
  // staff, and the same is true for venues.
  const pickIdx = (mode: number, base: number, i: number, poolSize: number): number => {
    if (poolSize <= 0) return 0;
    if (mode === 0) return base % poolSize;                      // all same
    if (mode === 1) return (base + Math.floor(i / 2)) % poolSize; // paired
    return (base + i) % poolSize;                                 // distributed
  };

  // A session's real occupied span in minutes-since-midnight, including
  // its pre/post buffer (the resource is genuinely unavailable during
  // buffer/cleanup time too). Returns null when the time can't be parsed
  // (closed/all-day markers), so those never register as a conflict.
  const getOccupiedSpan = (ev: CalendarEvent): [number, number] | null => {
    const start = parseEventTimeToMinutes(ev.time);
    if (start === -1) return null;
    const pre = ev.preBuffer ?? 0;
    const post = ev.postBuffer ?? 0;
    const duration = ev.duration ?? 60;
    return [start - pre, start + duration + post];
  };
  const spansOverlap = (a: [number, number], b: [number, number]): boolean =>
    a[0] < b[1] && b[0] < a[1];

  // Picks a resource for `span` out of `pool` (falling back to
  // `fallbackPool` if every option in `pool` is already busy for that
  // span), preferring `preferredIdx` first so the day/type "mode" above
  // still shapes the common case — it only actually moves on to another
  // candidate when the preferred one would double-book. Records the
  // reservation in `busyMap` before returning so later calls for the same
  // day see it. This is the actual fix for the reported overlap bug: no
  // matter which "mode" or hash preference picked an instructor/venue,
  // this is the only thing that ever finalizes the assignment.
  const assignResource = (
    pool: string[],
    fallbackPool: string[],
    preferredIdx: number,
    span: [number, number] | null,
    busyMap: Map<string, [number, number][]>
  ): string => {
    const candidates = pool.length > 0 ? pool : fallbackPool;
    const order: string[] = [];
    for (let k = 0; k < candidates.length; k++) order.push(candidates[(preferredIdx + k) % candidates.length]);
    for (const name of fallbackPool) if (!order.includes(name)) order.push(name);

    for (const name of order) {
      const busy = busyMap.get(name) ?? [];
      if (!span || !busy.some((b) => spansOverlap(span, b))) {
        if (span) busyMap.set(name, [...busy, span]);
        return name;
      }
    }
    // Every candidate conflicts — shouldn't happen given pool sizes vs.
    // daily session counts, but fall back to the preferred pick rather
    // than leaving the event unassigned.
    const fallbackName = candidates[preferredIdx % candidates.length];
    busyMap.set(fallbackName, [...(busyMap.get(fallbackName) ?? []), ...(span ? [span] : [])]);
    return fallbackName;
  };

  for (const dayKey of Object.keys(events)) {
    const day = Number(dayKey);
    const dayEvents = events[day];

    // Tracks each instructor's/venue's already-reserved spans for *this
    // day* so nothing assigned below — including the stacked-hour demo
    // further down — can double-book one.
    const instructorBusy: Map<string, [number, number][]> = new Map();
    const venueBusy: Map<string, [number, number][]> = new Map();

    // Bucket non-closed/non-league events by type so we can pick a
    // cluster mode per (day, type).
    const byType: Map<ReservationType, CalendarEvent[]> = new Map();
    for (const ev of dayEvents) {
      if (ev.type === "closed") continue;
      if (ev.type === "league") {
        // Standardize league venue on a value that's also in
        // VENUE_OPTIONS so the filter dropdown matches the data.
        ev.venue = "Outdoor Field";
        continue;
      }
      const arr = byType.get(ev.type) ?? [];
      arr.push(ev);
      byType.set(ev.type, arr);
    }

    for (const [type, evs] of byType.entries()) {
      const insts = INSTRUCTORS_FOR[type] ?? ALL_INSTRUCTORS;
      const vens = VENUES_FOR[type] ?? ALL_VENUES;
      const dayTypeHash = hashId(`${dayKey}-${type}`);
      // Independent modes for instructor and venue so they don't lock
      // together (e.g. avoid "all-same instructor always lines up with
      // all-same venue").
      const instMode = dayTypeHash % 3;
      const venueMode = (hashId(`${dayKey}-${type}-v`)) % 3;
      const instBase = dayTypeHash;
      const venueBase = hashId(`${dayKey}-${type}-vbase`);

      evs.forEach((ev, i) => {
        const span = getOccupiedSpan(ev);
        const instPreferred = pickIdx(instMode, instBase, i, insts.length);
        const venuePreferred = pickIdx(venueMode, venueBase, i, vens.length);
        ev.instructor = assignResource(insts, ALL_INSTRUCTORS, instPreferred, span, instructorBusy);
        ev.venue = assignResource(vens, ALL_VENUES, venuePreferred, span, venueBusy);

        // Fill in capacity / booked when they weren't set explicitly
        // (sentinel = -1). Hash the id with separate salts so capacity
        // and booking level vary independently across events.
        if (ev.capacity === -1) {
          ev.capacity = CAPACITY_FOR[ev.type] ?? 30;
        }
        if (ev.booked === -1) {
          const pct = BOOKING_LEVELS[hashId(ev.id + "b") % BOOKING_LEVELS.length];
          ev.booked = Math.min(ev.capacity, Math.round(ev.capacity * pct));
        }
      });
    }

    // ── Guaranteed "stacked hour" demo — every calendar view shares this
    // same `events` object (Monthly, Weekly, Daily, and Resources all read
    // from it via `filteredEvents`), so seeding it here — rather than
    // special-casing any one view — keeps every view in sync on the same
    // data. Days 1, 8, 15, 22, and 29 are spaced exactly 7 apart, so ANY
    // possible Monday→Sunday week the Weekly view can show necessarily
    // contains exactly one of them, which guarantees every week (and every
    // month) has one hour that's genuinely packed — several instructors
    // each running their own back-to-back short sessions that add up to
    // (at most) an hour, none of them overlapping. This is what the
    // Resources view's "stack sessions per resource, no overlap" behavior
    // looks like with real, conflict-free data — it replaces an earlier
    // version of this demo that put several "simultaneous" 60-minute
    // sessions on the same instructor/venue, which was exactly the
    // double-booking bug that got reported.
    if ([1, 8, 15, 22, 29].includes(day)) {
      // Each "track" is one instructor+venue pair running consecutive,
      // non-overlapping sessions whose durations add up to one hour.
      const tracks: Array<{ type: ReservationType; sessions: Array<[string, number, string]> }> = [
        // 4 × 15-minute back-to-back sessions
        { type: "hiit", sessions: [
          ["11:00am", 15, "HIIT Blast"],
          ["11:15am", 15, "HIIT Blast"],
          ["11:30am", 15, "HIIT Blast"],
          ["11:45am", 15, "HIIT Blast"],
        ] },
        // 2 × 30-minute back-to-back sessions
        { type: "pilates", sessions: [
          ["11:00am", 30, "Express Pilates"],
          ["11:30am", 30, "Express Pilates"],
        ] },
        // A 20-minute session followed by a 40-minute one — unequal
        // lengths on purpose, still adds up to exactly one hour.
        { type: "meditation", sessions: [
          ["11:00am", 20, "Quick Reset"],
          ["11:20am", 40, "Deep Meditation"],
        ] },
        // 3 × 20-minute back-to-back sessions
        { type: "yoga", sessions: [
          ["11:00am", 20, "Micro Flow"],
          ["11:20am", 20, "Micro Flow"],
          ["11:40am", 20, "Micro Flow"],
        ] },
      ];

      tracks.forEach((track, trackIdx) => {
        const insts = INSTRUCTORS_FOR[track.type] ?? ALL_INSTRUCTORS;
        const vens = VENUES_FOR[track.type] ?? ALL_VENUES;
        // "All same" preference with a hash-derived starting index, so
        // which specific instructor/venue gets the busy hour varies by
        // day rather than always being the pool's first entry.
        const instPreferred = hashId(`${dayKey}-stack-${trackIdx}-i`) % insts.length;
        const venuePreferred = hashId(`${dayKey}-stack-${trackIdx}-v`) % vens.length;
        // Reserve against the track's FULL span (first session's start to
        // last session's end) in one shot, so the picked instructor/venue
        // is confirmed free for the whole run before any of its sessions
        // are created — that's what actually produces "one resource,
        // several stacked short sessions" instead of splitting the track
        // across different resources mid-way through.
        const firstStart = parseEventTimeToMinutes(track.sessions[0][0]);
        const [lastTime, lastDuration] = track.sessions[track.sessions.length - 1];
        const trackSpan: [number, number] = [firstStart, parseEventTimeToMinutes(lastTime) + lastDuration];
        const instructor = assignResource(insts, ALL_INSTRUCTORS, instPreferred, trackSpan, instructorBusy);
        const venue = assignResource(vens, ALL_VENUES, venuePreferred, trackSpan, venueBusy);

        track.sessions.forEach(([time, duration, title], i) => {
          const capacity = CAPACITY_FOR[track.type] ?? 24;
          const id = `${day}stack${trackIdx}-${i}`;
          const pct = BOOKING_LEVELS[hashId(id + "b") % BOOKING_LEVELS.length];
          const booked = Math.min(capacity, Math.round(capacity * pct));
          dayEvents.push(
            makeEvent(id, title, time, track.type, instructor, venue, booked, capacity, false, false, 0, 0, duration)
          );
        });
      });
    }
  }

  return events;
}

const MOCK_EVENTS = generateMockEvents();

/**
 * Filter a DayEvents map by a free-text search term.
 * Matches against event title, instructor, venue, and type (case-insensitive).
 * "closed" placeholder events are always preserved so blocked-off days remain visible.
 * An empty / whitespace-only query returns the original map unchanged.
 */
function filterEventsByQuery(eventsByDay: DayEvents, query: string): DayEvents {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return eventsByDay;

  const result: DayEvents = {};
  for (const dayKey of Object.keys(eventsByDay)) {
    const day = Number(dayKey);
    const events: CalendarEvent[] = eventsByDay[day] ?? [];
    const matches = events.filter((e: CalendarEvent) => {
      if (e.type === "closed") return true;
      return (
        e.title.toLowerCase().includes(trimmed) ||
        e.instructor.toLowerCase().includes(trimmed) ||
        e.venue.toLowerCase().includes(trimmed) ||
        e.type.toLowerCase().includes(trimmed)
      );
    });
    // Only keep the day if it has at least one non-closed match
    const hasRealMatch = matches.some((e: CalendarEvent) => e.type !== "closed");
    if (hasRealMatch) result[day] = matches;
  }
  return result;
}

/**
 * Parse an event time string (e.g. "11am", "12:30pm", "2pm") into minutes since
 * midnight. Returns -1 for an unrecognized format so callers can defensively skip.
 */
function parseEventTimeToMinutes(time: string): number {
  const match = time.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!match) return -1;
  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];
  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/** Inverse of parseEventTimeToMinutes: formats minutes-since-midnight back
 *  into a short time string like "11am" or "11:15am" (minutes are omitted
 *  when a time falls exactly on the hour, matching the mock data's own
 *  style). */
function formatMinutesToTime(mins: number): string {
  const wrapped = ((mins % 1440) + 1440) % 1440;
  let hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  const meridiem = hour >= 12 ? "pm" : "am";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return minute === 0 ? `${hour}${meridiem}` : `${hour}:${String(minute).padStart(2, "0")}${meridiem}`;
}

/** "11am–11:15am" style start–end label for a session — used by the
 *  Resources view so a glance shows exactly when a session starts and
 *  ends (important once a resource can run several short back-to-back
 *  sessions inside one hour) rather than just its start time. */
function getSessionTimeRangeLabel(event: CalendarEvent): string {
  const start = parseEventTimeToMinutes(event.time);
  if (start === -1) return event.time;
  const duration = event.duration ?? 60;
  return `${formatMinutesToTime(start)}–${formatMinutesToTime(start + duration)}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_OF_WEEK_FULL = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatEventDate(day: number, month: number, year: number): string {
  const date = new Date(year, month, day);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${dayNames[date.getDay()]}, ${monthNames[month]} ${day}, ${year}`;
}

/** Converts a JS `Date.getDay()` value (0=Sun..6=Sat) to a Monday-first
 *  index (0=Mon..6=Sun). Used by the Weekly view, whose weeks run
 *  Monday → Sunday rather than the Sunday-first weeks used elsewhere. */
function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/** Returns a new Date (time-of-day zeroed) set to the Monday of the week
 *  containing `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - mondayIndex(d.getDay()));
  return d;
}

/** Formats a Monday-start week as a compact range for the Weekly view's
 *  date heading, e.g. "June 1 - 7, 2026" when the week sits inside one
 *  month, "June 29 - July 5, 2026" when it crosses a month boundary, and
 *  "Dec 29, 2025 - Jan 4, 2026" (full form) on the rare year crossing. */
function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const sameMonth = weekStart.getMonth() === end.getMonth() && weekStart.getFullYear() === end.getFullYear();
  const sameYear = weekStart.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} - ${end.getDate()}, ${end.getFullYear()}`;
  }
  if (sameYear) {
    return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} - ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()}, ${weekStart.getFullYear()} - ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}

const MAX_VISIBLE_EVENTS = 4;
// Compact density shrinks each row's height enough to fit one additional
// row of sessions in the same cell before falling back to "+N more".

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — EventBadge (Desktop)
   ═══════════════════════════════════════════════════════════════════════ */

function EventBadge({
  event,
  isSelected,
  onClick,
  onHoverEnter,
  onHoverLeave,
  colors,
  isDark,
  deleteMode = false,
  statusVisibility,
  density = "comfortable",
  highlightMySessions = false,
}: {
  event: CalendarEvent;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onHoverEnter?: (e: React.MouseEvent) => void;
  onHoverLeave?: () => void;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  /** When true, mark events with no registered clients as deletable
   *  (red dashed border + tint) so users know which ones a click will
   *  remove in Delete Mode. Events with bookings or closures are
   *  unaffected. */
  deleteMode?: boolean;
  /** Display preference (Preferences tab) — per-category visibility for
   *  this view. When a category is false, a session in that category
   *  renders its time label as plain text with no colored pill. Defaults
   *  to "show everything" when omitted. Purely cosmetic; never affects
   *  Reservation Details. */
  statusVisibility?: ViewStatusVisibility;
  /** Display preference — "compact" shrinks the badge's height/padding/
   *  font so more rows fit on screen. */
  density?: ScheduleDensity;
  /** Display preference — when true, sessions taught by
   *  CURRENT_USER_INSTRUCTOR get a brand-colored ring and everything else
   *  dims slightly. */
  highlightMySessions?: boolean;
}) {
  const style = colors[event.type] || colors.yoga;

  const hasPre = (event.preBuffer ?? 0) > 0;
  const hasPost = (event.postBuffer ?? 0) > 0;
  // League games are zero-booked at the per-event level (registration is
  // handled at the league level, not per session), so they're excluded
  // from the deletable set even though `booked === 0` — same exclusion as
  // closures.
  const isDeletable = deleteMode && event.booked === 0 && event.type !== "closed" && event.type !== "league";
  // While Delete Mode is on, dim every event that ISN'T deletable so the
  // deletable subset (red dashed) stands out clearly. Closures, league
  // games, and already-booked events stay visible at reduced opacity to
  // preserve calendar context but recede from the action.
  const dimNonDeletable = deleteMode && !isDeletable;

  // "Highlight my sessions" — CURRENT_USER_INSTRUCTOR stands in for a real
  // logged-in instructor (see its definition for the caveat). Closed-day
  // markers have no owner, so they're excluded from the dimming (there's
  // nothing to compare them against).
  const isMine = highlightMySessions && event.instructor === CURRENT_USER_INSTRUCTOR;
  const dimNotMine = highlightMySessions && !isMine && event.type !== "closed";
  const mineRingColor = isDark ? "#00c4a0" : "#00c28a";

  // Attendance status pill on the time label.
  // Closed / league events are excluded — no per-session capacity.
  //   available   (<80% booked, including 0) → green pill, dark text
  //   nearly full (≥80%, <100%)              → yellow pill, dark text
  //   full, no waitlist (≥100%)              → solid red pill, dark text
  //   full, waitlist open (≥100%)            → translucent red pill, red text
  //     (same red hue/opacity pairing as the Delete-Mode "deletable" tint
  //     below, so "red = full/blocked" reads consistently across the badge)
  const hasCapacityData = event.capacity > 0 && event.type !== "closed" && event.type !== "league";
  const attendancePct   = hasCapacityData ? event.booked / event.capacity : 0;
  const isFull          = hasCapacityData && event.booked >= event.capacity;
  const isWaitlisted    = isFull && !!event.waitlistEnabled;
  const isNearlyFull    = !isFull && hasCapacityData && attendancePct >= 0.8;
  const categoryVisible = hasCapacityData
    ? (statusVisibility ?? makeDefaultViewStatusVisibility())[
        registrationStatusCategoryOf(isFull, isWaitlisted, isNearlyFull)
      ]
    : false;
  const showStatusDot   = hasCapacityData && categoryVisible;
  const statusDotColor  = isWaitlisted
    ? (isDark ? "rgba(224,90,90,0.18)" : "rgba(212,24,64,0.12)")
    : isFull
    ? EZ_RED
    : isNearlyFull ? "#FFE109" : EZ_GREEN;
  const statusTextColor = isWaitlisted
    ? (isDark ? "#e05a5a" : "#d41840")
    : isFull
    ? EZ_RED_ON_COLOR
    : isNearlyFull ? "#111111" : EZ_GREEN_ON_COLOR;

  // Stripe area is 12px wide; bump padding to 14px on the affected side so
  // text starts just past the stripes (mirrors the "diagonal lines next to
  // the title" pattern from the source design).
  const STRIPE_W = 12;
  const padL = hasPre ? STRIPE_W + 2 : 6;
  const padR = hasPost ? STRIPE_W + 2 : 6;

  // Theme-aware "deletable" red — same hue as the overdue-balances meter
  // segment so destructive affordances stay visually consistent.
  const deletableColor = isDark ? "#e05a5a" : "#d41840";

  const isCompact = density === "compact";

  const badgeStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: isCompact ? "3px" : "4px",
    height: isCompact ? "20px" : "24px",
    padding: isCompact ? `2px ${padR}px 2px ${padL}px` : `4px ${padR}px 4px ${padL}px`,
    borderRadius: "4px",
    fontSize: isCompact ? "9px" : "10px",
    fontWeight: 700,
    lineHeight: isCompact ? "14px" : "16px",
    overflow: "hidden",
    cursor: dimNonDeletable ? "not-allowed" : "pointer",
    flex: event.fullWidth ? "1 0 100%" : "1 1 0",
    minWidth: 0,
    background: isDeletable
      ? (isDark ? "rgba(224,90,90,0.12)" : "rgba(212,24,64,0.10)")
      : isSelected ? style.text : style.bg,
    border: isDeletable
      ? `1px dashed ${deletableColor}`
      : `1px solid ${isSelected ? style.text : style.border}`,
    boxShadow: isMine ? `0 0 0 2px ${mineRingColor}` : undefined,
    color: isDeletable ? deletableColor : isSelected ? (isDark ? "#0a0e0f" : "#ffffff") : style.text,
    opacity: dimNonDeletable ? 0.4 : dimNotMine ? 0.45 : 1,
    transition: "all 0.15s ease",
  };

  if (event.type === "league") {
    const leagueStyle = colors.league;
    badgeStyle.background = isSelected ? leagueStyle.text : leagueStyle.bg;
    badgeStyle.border = `1px solid ${isSelected ? leagueStyle.text : leagueStyle.border}`;
    badgeStyle.color = isSelected ? (isDark ? "#0a0e0f" : "#ffffff") : leagueStyle.text;
  }

  if (event.type === "closed") {
    const closedStyle = colors.closed;
    badgeStyle.background = closedStyle.bg;
    badgeStyle.border = `1px solid ${closedStyle.border}`;
    badgeStyle.color = closedStyle.text;
    badgeStyle.cursor = "default";
  }

  // Diagonal-stripe pattern for buffer indicators. Uses currentColor so the
  // stripes pick up the badge's text color, then opacity fades them so they
  // read as a tinted "blocked" area rather than a hard color band. Selected
  // badges use white-ish stripes since the bg becomes the saturated text
  // color (color is set via `color` prop on the stripe div).
  const stripeColor = isSelected ? (isDark ? "#0a0e0f" : "#ffffff") : style.text;
  const bufferStripeStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: `${STRIPE_W}px`,
    pointerEvents: "none",
    backgroundImage: `repeating-linear-gradient(135deg, ${stripeColor} 0px, ${stripeColor} 1.5px, transparent 1.5px, transparent 5px)`,
    opacity: 0.5,
  };

  return (
    <div
      style={badgeStyle}
      onClick={event.type !== "closed" ? onClick : undefined}
      // Closed days still get hover so a minimal "Closed all day" popover can
      // appear; click stays disabled because there's no detail panel for them.
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      {hasPre && (
        <div
          aria-hidden
          title={`${event.preBuffer} min pre-buffer`}
          style={{ ...bufferStripeStyle, left: 0 }}
        />
      )}
      {hasPost && (
        <div
          aria-hidden
          title={`${event.postBuffer} min post-buffer`}
          style={{ ...bufferStripeStyle, right: 0 }}
        />
      )}
      {event.type === "league" && (
        <Trophy size={12} style={{ flexShrink: 0 }} />
      )}
      <span
        style={{
          flex: "1 1 0",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {event.title}
      </span>
      {event.time && (
        <span
          style={{
            flexShrink: 0,
            fontWeight: showStatusDot ? 700 : 400,
            textAlign: "right",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            ...(showStatusDot && {
              background: statusDotColor,
              color: statusTextColor,
              borderRadius: "3px",
              padding: "0 3px",
              lineHeight: "14px",
            }),
          }}
        >
          {event.time}
        </span>
      )}

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — EventRow (Desktop)
   ═══════════════════════════════════════════════════════════════════════ */

function EventRow({
  events,
  selectedId,
  onSelect,
  onHoverEvent,
  onHoverLeave,
  colors,
  isDark,
  deleteMode = false,
  statusVisibility,
  density,
  highlightMySessions,
}: {
  events: CalendarEvent[];
  selectedId: string | null;
  onSelect: (event: CalendarEvent, e: React.MouseEvent) => void;
  onHoverEvent?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onHoverLeave?: () => void;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  deleteMode?: boolean;
  statusVisibility?: ViewStatusVisibility;
  density?: ScheduleDensity;
  highlightMySessions?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: "2px", width: "100%" }}>
      {events.map((ev) => (
        <EventBadge
          key={ev.id}
          event={ev}
          isSelected={selectedId === ev.id}
          onClick={(e) => onSelect(ev, e)}
          onHoverEnter={onHoverEvent ? (e) => onHoverEvent(ev, e) : undefined}
          onHoverLeave={onHoverLeave}
          colors={colors}
          isDark={isDark}
          deleteMode={deleteMode}
          statusVisibility={statusVisibility}
          density={density}
          highlightMySessions={highlightMySessions}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — DateCell (Desktop)
   ═══════════════════════════════════════════════════════════════════════ */

function DateCell({
  day,
  isToday,
  events,
  selectedEventId,
  onSelectEvent,
  onHoverEvent,
  onHoverLeave,
  onShowMore,
  sc,
  colors,
  isDark,
  deleteMode = false,
  statusVisibility,
  density = "comfortable",
  highlightMySessions,
}: {
  day: number | null;
  isToday: boolean;
  events: CalendarEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: CalendarEvent, e: React.MouseEvent) => void;
  onHoverEvent?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onHoverLeave?: () => void;
  onShowMore?: (day: number, events: CalendarEvent[]) => void;
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  deleteMode?: boolean;
  statusVisibility?: ViewStatusVisibility;
  density?: ScheduleDensity;
  highlightMySessions?: boolean;
}) {
  // Compact fits one extra row of sessions (see MAX_VISIBLE_EVENTS), so its
  // floor is taller than a naive 4-row proportion would suggest — tuned to
  // comfortably hold 5 rows of the shorter compact badge height.
  const cellMinHeight = density === "compact" ? "120px" : "130px";
  if (day === null) {
    return (
      <div
        style={{
          // `flex` is harmless inside a grid (a grid parent ignores it); kept
          // so this cell still works if reused inside a flex container.
          flex: "1 1 0",
          minWidth: 0,
          minHeight: cellMinHeight,
          borderBottom: `1px solid ${sc.border}`,
          borderLeft: `1px solid ${sc.border}`,
          background: isDark ? sc.cellBg : "#fafafa",
        }}
      />
    );
  }

  const rows: CalendarEvent[][] = [];
  let currentRow: CalendarEvent[] = [];

  for (const ev of events) {
    if (ev.fullWidth) {
      if (currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
      }
      rows.push([ev]);
    } else {
      currentRow.push(ev);
      if (currentRow.length >= 3) {
        rows.push(currentRow);
        currentRow = [];
      }
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  // Compact rows are shorter, so one extra row of sessions fits in the
  // same cell before the rest collapse into "+N more".
  const maxVisibleRows = density === "compact" ? MAX_VISIBLE_EVENTS + 1 : MAX_VISIBLE_EVENTS;
  const visibleRows = rows.slice(0, maxVisibleRows);
  const hiddenCount = events.length - visibleRows.reduce((s, r) => s + r.length, 0);

  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        minHeight: cellMinHeight,
        display: "flex",
        flexDirection: "column",
        background: sc.cellBg,
        borderBottom: `1px solid ${sc.border}`,
        borderLeft: `1px solid ${sc.border}`,
        padding: "2px",
        gap: "1px",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "2px" }}>
        <div
          style={{
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "30px",
            fontSize: "14px",
            fontWeight: 700,
            color: isToday ? (isDark ? "#0a0e0f" : "#ffffff") : sc.heading,
            background: isToday ? sc.brand : "transparent",
          }}
        >
          {day}
        </div>
      </div>

      {visibleRows.map((row, i) => (
        <EventRow
          key={i}
          events={row}
          selectedId={selectedEventId}
          onSelect={onSelectEvent}
          onHoverEvent={onHoverEvent}
          onHoverLeave={onHoverLeave}
          colors={colors}
          isDark={isDark}
          deleteMode={deleteMode}
          statusVisibility={statusVisibility}
          density={density}
          highlightMySessions={highlightMySessions}
        />
      ))}

      {hiddenCount > 0 && (
        <div
          onClick={(e) => { e.stopPropagation(); if (day && onShowMore) onShowMore(day, events); }}
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: sc.brand,
            padding: "2px 5px",
            lineHeight: "16px",
            cursor: "pointer",
          }}
        >
          +{hiddenCount} more
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — ReservationDetailsPopover
   ═══════════════════════════════════════════════════════════════════════ */

function ReservationDetailsPopover({
  event,
  day,
  month,
  year,
  position,
  badgeRect,
  onClose,
  onMouseEnter,
  onMouseLeave,
  onOpenDetails,
  sc,
  colors,
  isDark,
}: {
  event: CalendarEvent;
  day: number;
  month: number;
  year: number;
  position: { top: number; left: number };
  badgeRect?: { top: number; bottom: number; left: number; right: number };
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  // Optional section lets callers (e.g. the "Book A Client" action) land
  // directly on a specific tab instead of the default Details view.
  onOpenDetails: (section?: string) => void;
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dotColor = (colors[event.type] || colors.yoga).text;
  // Closed-day popover is much narrower since it only shows two lines.
  const POPOVER_WIDTH = event.type === "closed" ? 240 : 320;
  const GAP = 8;

  const [adjusted, setAdjusted] = useState(position);
  useEffect(() => {
    if (!ref.current) return;
    const popoverRect = ref.current.getBoundingClientRect();
    let top = position.top;
    let left = position.left;

    if (badgeRect) {
      // Try right of badge first
      const rightOfBadge = badgeRect.right + GAP;
      const leftOfBadge = badgeRect.left - POPOVER_WIDTH - GAP;

      if (rightOfBadge + POPOVER_WIDTH <= window.innerWidth - 20) {
        // Fits to the right — use it
        left = rightOfBadge;
      } else if (leftOfBadge >= 20) {
        // Fits to the left — use it
        left = leftOfBadge;
      } else {
        // Neither side fits cleanly — position to right but clamp
        left = Math.max(20, Math.min(rightOfBadge, window.innerWidth - POPOVER_WIDTH - 20));
      }
    } else {
      // Fallback: original right-overflow adjustment
      if (left + POPOVER_WIDTH > window.innerWidth - 20) {
        left = Math.max(20, window.innerWidth - POPOVER_WIDTH - 20);
      }
    }

    // Vertical: keep top-aligned with badge, adjust if overflows bottom
    if (popoverRect.height + top > window.innerHeight - 20) {
      top = Math.max(20, window.innerHeight - popoverRect.height - 20);
    }

    setAdjusted({ top, left });
  }, [position, badgeRect]);

  const dateStr = formatEventDate(day, month, year);
  const available = event.capacity - event.booked;
  const hasCapacity = event.capacity > 0;
  const isFull = hasCapacity && available <= 0;
  // Balances owed — split the booked portion of the meter into a paid
  // (green) segment and an owed (red) segment, and surface the owed-client
  // count below "Available". When 0, the meter is purely green and the
  // Overdue Balances line is hidden.
  const owedCount = getOwedCount(event);
  const paidPct = event.capacity > 0 ? ((event.booked - owedCount) / event.capacity) * 100 : 0;
  const owedPct = event.capacity > 0 ? (owedCount / event.capacity) * 100 : 0;
  // Theme-aware red: brighter on dark, deeper on light, so the meter
  // segment reads against either backdrop without overpowering the green.
  const owedColor = isDark ? "#e05a5a" : "#d41840";

  const iconStyle: CSSProperties = { opacity: 0.5, flexShrink: 0, width: "24px", height: "24px" };
  const detailText: CSSProperties = {
    fontSize: "14px",
    fontWeight: 500,
    color: sc.body,
    lineHeight: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  };

  // ── Closed-day popover ───────────────────────────────────────────────
  // Closed events have no instructor / venue / capacity / time, so the full
  // reservation popover would be mostly empty rows. Render a minimal card
  // that just states the date and how long the facility is closed. Right
  // now the only "closed" state in mock data is all-day; once partial-day
  // closures land, the duration line below should derive from the event.
  if (event.type === "closed") {
    return (
      <div
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          position: "fixed",
          top: adjusted.top,
          left: adjusted.left,
          width: `${POPOVER_WIDTH}px`,
          background: sc.cellBg,
          borderRadius: "12px",
          border: `1px solid ${sc.border}`,
          boxShadow: `0px 10px 15px -3px ${sc.shadow}, 0px 4px 6px 0px ${sc.shadow}`,
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 1000,
          fontFamily: "var(--font-family)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: dotColor,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "16px", fontWeight: 700, color: sc.heading, lineHeight: "20px" }}>
            Closed
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "2px 0" }}>
            <CalendarIcon size={20} style={{ ...iconStyle, width: "20px", height: "20px" }} />
            <span style={detailText}>{dateStr}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "2px 0" }}>
            <Clock size={20} style={{ ...iconStyle, width: "20px", height: "20px" }} />
            <span style={detailText}>Closed all day</span>
          </div>
        </div>
      </div>
    );
  }

  const secondaryBtn: CSSProperties = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "8px",
    border: `1px solid ${sc.border}`,
    background: sc.controlBg,
    fontSize: "12px",
    fontWeight: 500,
    color: sc.body,
    cursor: "pointer",
    lineHeight: "20px",
  };

  // "Book A Client" action — mirrors the same Book/Waitlist/Full rule used
  // in Reservation Details and Daily view: full + waitlisting off means
  // there's no way to add anyone, so the button is disabled and relabeled.
  const bookClientLabel = isFull
    ? (event.waitlistEnabled ? "Waitlist" : "Fully Booked")
    : "Book A Client";
  const bookClientDisabled = isFull && !event.waitlistEnabled;
  const bookClientBtn: CSSProperties = {
    ...secondaryBtn,
    ...(bookClientDisabled
      ? { opacity: 0.5, cursor: "default" }
      : null),
  };

  return (
    <div
      ref={ref}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top: adjusted.top,
        left: adjusted.left,
        width: "320px",
        background: sc.cellBg,
        borderRadius: "12px",
        border: `1px solid ${sc.border}`,
        boxShadow: `0px 10px 15px -3px ${sc.shadow}, 0px 4px 6px 0px ${sc.shadow}`,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        zIndex: 1000,
        fontFamily: "var(--font-family)",
      }}
    >
      {/* Heading */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: dotColor,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "18px", fontWeight: 700, color: sc.heading, lineHeight: "24px" }}>
            {event.title}
          </span>
        </div>

        {/* Details */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
            <CalendarIcon size={24} style={iconStyle} />
            <span style={detailText}>{dateStr}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
            <Clock size={24} style={iconStyle} />
            <span style={detailText}>
              {event.time ? getSessionTimeRangeLabel(event) : "—"}
            </span>
          </div>
          {/* Buffer — transition time before/after the session. Shown only
              when at least one buffer is set, and assembles dynamically so
              "15min pre · 30min post", "15min pre", and "30min post" are
              all valid forms. The hourglass icon evokes a span of time
              between events rather than a specific clock time. */}
          {((event.preBuffer ?? 0) > 0 || (event.postBuffer ?? 0) > 0) && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
              <Hourglass size={24} style={iconStyle} />
              <span style={detailText}>
                Buffer:{" "}
                {[
                  (event.preBuffer ?? 0) > 0 ? `${event.preBuffer}min pre` : null,
                  (event.postBuffer ?? 0) > 0 ? `${event.postBuffer}min post` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
            <User size={24} style={iconStyle} />
            <span style={detailText}>{event.instructor || "—"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
            <MapPin size={24} style={iconStyle} />
            <span style={detailText}>{event.venue || "—"}</span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: "100%", height: "1px", background: sc.border }} />

        {/* Capacity */}
        {event.capacity > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ flex: 1, fontSize: "12px", fontWeight: 500, color: sc.body }}>
                Registered
              </span>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: sc.heading, letterSpacing: "-0.4px" }}>
                  {event.booked}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 500, color: sc.body }}>
                  / {event.capacity}
                </span>
              </div>
            </div>
            <div
              style={{
                width: "100%",
                height: "10px",
                borderRadius: "12px",
                background: sc.track,
                position: "relative",
                overflow: "hidden",
                display: "flex",
              }}
            >
              {/* Paid (green) segment — sits at the meter's start. */}
              {paidPct > 0 && (
                <div
                  style={{
                    width: `${paidPct}%`,
                    background: sc.success,
                  }}
                />
              )}
              {/* Owed (red) segment — sits immediately to the right of paid,
                  so the booked total is the sum of the two colored segments. */}
              {owedPct > 0 && (
                <div
                  style={{
                    width: `${owedPct}%`,
                    background: owedColor,
                  }}
                />
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ flex: 1, fontSize: "12px", fontWeight: 500, color: sc.body }}>
                Available
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: "16px",
                  fontWeight: 700,
                  color: sc.success,
                  textAlign: "right",
                  letterSpacing: "-0.4px",
                }}
              >
                {available}
              </span>
            </div>
            {owedCount > 0 && (
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ flex: 1, fontSize: "12px", fontWeight: 500, color: sc.body }}>
                  Overdue Balances
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: "16px",
                    fontWeight: 700,
                    color: owedColor,
                    textAlign: "right",
                    letterSpacing: "-0.4px",
                  }}
                >
                  {owedCount}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button style={secondaryBtn} onClick={() => onOpenDetails("Registered Clients")}>
          Open Clients <ArrowRight size={14} />
        </button>
        <button
          style={bookClientBtn}
          disabled={bookClientDisabled}
          onClick={bookClientDisabled ? undefined : () => onOpenDetails("Registration")}
        >
          <Plus size={14} /> {bookClientLabel}
        </button>
      </div>

      {/* Primary CTA */}
      <button
        onClick={() => onOpenDetails()}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          padding: "6px 12px",
          borderRadius: "8px",
          border: "none",
          background: sc.brand,
          fontSize: "12px",
          fontWeight: 500,
          color: isDark ? "#0a0e0f" : "#101828",
          cursor: "pointer",
          lineHeight: "20px",
          width: "100%",
        }}
      >
        Open Reservation Details <ArrowRight size={14} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE — Full-page reservation detail (replaces popover on mobile)
   ═══════════════════════════════════════════════════════════════════════ */

function MobileReservationDetail({
  event,
  day,
  month,
  year,
  onClose,
  sc,
  colors,
  isDark,
}: {
  event: CalendarEvent;
  day: number;
  month: number;
  year: number;
  onClose: () => void;
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
}) {
  const dotColor = (colors[event.type] || colors.yoga).text;
  const dateStr = formatEventDate(day, month, year);
  const bookedPct = event.capacity > 0 ? (event.booked / event.capacity) * 100 : 0;
  const available = event.capacity - event.booked;
  const isFull = event.capacity > 0 && available <= 0;

  /* Derive the primary action from the event's booking state (mirrors MobileEventRow) */
  const hasCapacity = event.capacity > 0;
  let actionLabel = "Book";
  let actionDisabled = false;
  let actionHidden = false;
  if (!hasCapacity) {
    actionHidden = true;                  // league games, closures — no booking action
  } else if (isFull && event.waitlistEnabled) {
    actionLabel = "Waitlist";
  } else if (isFull) {
    actionLabel = "Full";
    actionDisabled = true;
  }

  const iconStyle: CSSProperties = { opacity: 0.5, flexShrink: 0, width: "24px", height: "24px" };
  const detailText: CSSProperties = {
    fontSize: "15px",
    fontWeight: 500,
    color: sc.body,
    lineHeight: 1.4,
  };

  const secondaryBtn: CSSProperties = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "12px 16px",
    borderRadius: "8px",
    border: `1px solid ${sc.border}`,
    background: sc.controlBg,
    fontSize: "14px",
    fontWeight: 500,
    color: sc.body,
    cursor: "pointer",
    lineHeight: "20px",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: sc.cellBg,
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-family)",
        overflow: "auto",
      }}
    >
      {/* Header bar with close X */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: `1px solid ${sc.border}`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "18px", fontWeight: 700, color: sc.heading }}>
          Reservation Details
        </span>
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            border: `1px solid ${sc.border}`,
            background: sc.controlBg,
            cursor: "pointer",
            color: sc.body,
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Title with dot */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: dotColor,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "22px", fontWeight: 700, color: sc.heading, lineHeight: "28px" }}>
            {event.title}
          </span>
        </div>

        {/* Detail rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
            <CalendarIcon size={24} style={iconStyle} />
            <span style={detailText}>{dateStr}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
            <Clock size={24} style={iconStyle} />
            <span style={detailText}>
              {event.time ? getSessionTimeRangeLabel(event) : "—"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
            <User size={24} style={iconStyle} />
            <span style={detailText}>{event.instructor || "—"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
            <MapPin size={24} style={iconStyle} />
            <span style={detailText}>{event.venue || "—"}</span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: "100%", height: "1px", background: sc.border }} />

        {/* Capacity */}
        {event.capacity > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: sc.body }}>
                Registered
              </span>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "20px", fontWeight: 700, color: sc.heading, letterSpacing: "-0.4px" }}>
                  {event.booked}
                </span>
                <span style={{ fontSize: "14px", fontWeight: 500, color: sc.body }}>
                  / {event.capacity}
                </span>
              </div>
            </div>
            <div
              style={{
                width: "100%",
                height: "12px",
                borderRadius: "12px",
                background: sc.track,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${bookedPct}%`,
                  borderRadius: "12px",
                  background: sc.success,
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: sc.body }}>
                Available
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: "20px",
                  fontWeight: 700,
                  color: sc.success,
                  textAlign: "right",
                  letterSpacing: "-0.4px",
                }}
              >
                {available}
              </span>
            </div>
          </div>
        )}

        {/* Spacer pushes buttons to bottom */}
        <div style={{ flex: 1 }} />

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={secondaryBtn}>
            Open Clients <ArrowRight size={14} />
          </button>
          <button style={secondaryBtn}>
            <Plus size={14} /> Book A Client
          </button>
        </div>

        {/* Primary action — mirrors the status button from the event list row */}
        {!actionHidden && (
          <button
            disabled={actionDisabled}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "14px 16px",
              borderRadius: "8px",
              border: "none",
              background: actionDisabled ? sc.muted : sc.brand,
              fontSize: "15px",
              fontWeight: 500,
              color: actionDisabled
                ? (isDark ? "#0a0e0f" : "#ffffff")
                : (isDark ? "#0a0e0f" : "#101828"),
              cursor: actionDisabled ? "default" : "pointer",
              opacity: actionDisabled ? 0.6 : 1,
              lineHeight: "20px",
              width: "100%",
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

interface MobileToolbarProps {
  sc: SemanticColors;
  isDark: boolean;
  /** Mini-calendar visibility. The Date button on the toolbar's left
   *  acts as the toggle (the old standalone "calendar" icon button on
   *  the right is gone — its job moved here). */
  showCalendar: boolean;
  onToggleCalendar: () => void;
  /** Pre-formatted label for the Date button — single date or range.
   *  e.g. "Tue, Apr 28" or "Apr 25 – May 2". */
  dateButtonLabel: string;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  showFilter: boolean;
  setShowFilter: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  /** Whether the user has navigated away from today. */
  showTodayButton: boolean;
  /** Resets the calendar to today and clears any active range. */
  onGoToToday: () => void;
  /** Active filter count for the Filters icon's badge. */
  activeFilterCount: number;
  /** Current sort/grouping for the events list — opens via a
   *  dropdown button in the toolbar. */
  sortBy: "time" | "name" | "type" | "resource";
  setSortBy: (s: "time" | "name" | "type" | "resource") => void;
  showSortMenu: boolean;
  setShowSortMenu: (show: boolean) => void;
}

function MobileToolbar({
  sc,
  isDark,
  showCalendar,
  onToggleCalendar,
  dateButtonLabel,
  showSearch,
  setShowSearch,
  showFilter,
  setShowFilter,
  searchQuery,
  setSearchQuery,
  showTodayButton,
  onGoToToday,
  activeFilterCount,
  sortBy,
  setSortBy,
  showSortMenu,
  setShowSortMenu,
}: MobileToolbarProps) {
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Close sort popover on outside click.
  useEffect(() => {
    if (!showSortMenu) return;
    function handleClick(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSortMenu, setShowSortMenu]);

  const sortOptions: { value: "time" | "name" | "type" | "resource"; label: string }[] = [
    { value: "time", label: "Time" },
    { value: "name", label: "Reservation name" },
    { value: "type", label: "Reservation type" },
    { value: "resource", label: "Resource" },
  ];
  const sortLabel = sortOptions.find((o) => o.value === sortBy)?.label ?? "Time";
  const isNonDefaultSort = sortBy !== "time";

  return (
    <>
      {/* Main toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: sc.headerBg,
          borderBottom: `1px solid ${sc.border}`,
        }}
      >
        {/* Left group: Date button (label = selected date or range,
            calendar icon prefix). Tapping it opens the mini calendar
            so the user can pick a different date. The Today button
            stays adjacent and only appears when the selection isn't
            "just today". */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={onToggleCalendar}
            aria-expanded={showCalendar}
            aria-label="Pick date"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              borderRadius: "8px",
              border: `1px solid ${showCalendar ? sc.brand : sc.border}`,
              background: showCalendar
                ? (isDark ? "rgba(0,196,160,0.12)" : "rgba(0,196,160,0.08)")
                : sc.controlBg,
              fontSize: "15px",
              fontWeight: 500,
              color: showCalendar ? sc.brand : sc.body,
              cursor: "pointer",
              boxShadow: "0px 1px 0.5px 0px rgba(29,41,61,0.02)",
            }}
          >
            <CalendarIcon size={16} /> {dateButtonLabel}
          </button>

          {showTodayButton && (
            <button
              onClick={onGoToToday}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 16px",
                borderRadius: "8px",
                border: `1px solid ${sc.border}`,
                background: sc.controlBg,
                fontSize: "15px",
                fontWeight: 500,
                color: sc.body,
                cursor: "pointer",
                boxShadow: "0px 1px 0.5px 0px rgba(29,41,61,0.02)",
              }}
            >
              Today
            </button>
          )}
        </div>

        {/* Right-side icon buttons — Sort dropdown / Search /
            Filter. The sort button replaces the previous "view by
            resource" toggle: "Resource" is now one of the four sort
            options instead of a separate layout. */}
        <div style={{ display: "flex", gap: "8px" }}>
          <div ref={sortMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              aria-expanded={showSortMenu}
              aria-label={`Sort: ${sortLabel}`}
              title={`Sort: ${sortLabel}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                border: `1px solid ${(showSortMenu || isNonDefaultSort) ? sc.brand : sc.border}`,
                background: (showSortMenu || isNonDefaultSort)
                  ? (isDark ? "rgba(0,196,160,0.12)" : "rgba(0,196,160,0.08)")
                  : sc.controlBg,
                cursor: "pointer",
                color: (showSortMenu || isNonDefaultSort) ? sc.brand : sc.body,
              }}
            >
              <ArrowUpDown size={18} />
            </button>
            {showSortMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  width: "220px",
                  background: sc.cellBg,
                  border: `1px solid ${sc.border}`,
                  borderRadius: "10px",
                  boxShadow: `0px 12px 24px -6px ${sc.shadow}, 0px 4px 6px 0px ${sc.shadow}`,
                  padding: "6px",
                  zIndex: 100,
                  display: "flex",
                  flexDirection: "column",
                  fontFamily: "var(--font-family)",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: sc.muted,
                    padding: "6px 10px 4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Sort by
                </span>
                {sortOptions.map((opt) => {
                  const isActive = opt.value === sortBy;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSortBy(opt.value);
                        setShowSortMenu(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "none",
                        background: isActive
                          ? (isDark ? "rgba(0,196,160,0.12)" : "rgba(0,196,160,0.08)")
                          : "transparent",
                        color: isActive ? sc.brand : sc.body,
                        fontSize: "13px",
                        fontWeight: isActive ? 600 : 500,
                        fontFamily: "var(--font-family)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {opt.label}
                      {isActive && <span style={{ fontSize: "12px" }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            aria-label="Search"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              border: `1px solid ${sc.border}`,
              background: sc.controlBg,
              cursor: "pointer",
              color: sc.body,
            }}
          >
            <Search size={18} />
          </button>
          {/* Filters — when any filter dimension is active, the button
              border + icon turn brand-colored and a small count badge
              sits in the top-right corner so the user can see at a
              glance that the calendar is filtered. Mirrors desktop. */}
          <button
            onClick={() => setShowFilter(!showFilter)}
            aria-label={activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : "Filters"}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              border: `1px solid ${activeFilterCount > 0 ? sc.brand : sc.border}`,
              background: activeFilterCount > 0
                ? (isDark ? "rgba(0,196,160,0.12)" : "rgba(0,196,160,0.08)")
                : sc.controlBg,
              cursor: "pointer",
              color: activeFilterCount > 0 ? sc.brand : sc.body,
            }}
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  minWidth: "16px",
                  height: "16px",
                  padding: "0 4px",
                  borderRadius: "8px",
                  background: sc.brand,
                  color: isDark ? "#0a0e0f" : "#101828",
                  fontSize: "10px",
                  fontWeight: 700,
                  fontFamily: "var(--font-family)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  border: `2px solid ${sc.headerBg}`,
                  boxSizing: "content-box",
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search input */}
      {showSearch && (
        <div
          style={{
            padding: "12px 16px",
            background: sc.cellBg,
            borderBottom: `1px solid ${sc.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "8px",
              border: `1px solid ${sc.border}`,
              background: sc.inputBg,
            }}
          >
            <Search size={16} style={{ color: sc.muted, flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search schedule"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "14px",
                color: sc.heading,
                width: "100%",
                lineHeight: "20px",
              }}
            />
          </div>
        </div>
      )}

    </>
  );
}

interface MiniCalendarProps {
  currentMonth: number;
  currentYear: number;
  /** Range-aware selection. `selectedEnd === null` means single date. */
  selectedStart: Date;
  selectedEnd: Date | null;
  onSelectDay: (day: number) => void;
  rangeMode: boolean;
  onToggleRangeMode: () => void;
  /** Open the month/year picker popover (replaces prev/next arrows). */
  onPickMonth: (month: number, year: number) => void;
  showMonthPicker: boolean;
  setShowMonthPicker: (show: boolean) => void;
  sc: SemanticColors;
  isDark: boolean;
}

function MiniCalendar({
  currentMonth,
  currentYear,
  selectedStart,
  selectedEnd,
  onSelectDay,
  rangeMode,
  onToggleRangeMode,
  onPickMonth,
  showMonthPicker,
  setShowMonthPicker,
  sc,
  isDark,
}: MiniCalendarProps) {
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) days.push(day);

  const datesWithEvents = Object.keys(MOCK_EVENTS).map((k) => parseInt(k));
  const closedAllDayDates = datesWithEvents.filter((d) => {
    const dayEvents = MOCK_EVENTS[d] ?? [];
    return dayEvents.length > 0 && dayEvents.every((e) => e.type === "closed");
  });

  const monthPickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showMonthPicker) return;
    function handleClick(e: MouseEvent) {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setShowMonthPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMonthPicker, setShowMonthPicker]);

  // Helpers to compare a (month, day) cell against the selected start/end.
  const cellToTime = (day: number) => new Date(currentYear, currentMonth, day).getTime();
  const startTime = new Date(selectedStart.getFullYear(), selectedStart.getMonth(), selectedStart.getDate()).getTime();
  const endTime = selectedEnd
    ? new Date(selectedEnd.getFullYear(), selectedEnd.getMonth(), selectedEnd.getDate()).getTime()
    : null;

  const isStart = (day: number) => cellToTime(day) === startTime;
  const isEnd = (day: number) => endTime !== null && cellToTime(day) === endTime;
  const isInRange = (day: number) =>
    endTime !== null && cellToTime(day) > startTime && cellToTime(day) < endTime;

  return (
    <div
      style={{
        padding: "16px",
        background: sc.cellBg,
        borderBottom: `1px solid ${sc.border}`,
      }}
    >
      {/* Header row — Month/Year picker trigger + Range mode toggle. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
          gap: "8px",
        }}
      >
        <div ref={monthPickerRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowMonthPicker(!showMonthPicker)}
            aria-expanded={showMonthPicker}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 10px",
              borderRadius: "6px",
              border: `1px solid ${showMonthPicker ? sc.brand : "transparent"}`,
              background: showMonthPicker
                ? (isDark ? "rgba(0,196,160,0.10)" : "rgba(0,196,160,0.06)")
                : "transparent",
              fontSize: "15px",
              fontWeight: 600,
              color: sc.heading,
              cursor: "pointer",
              fontFamily: "var(--font-family)",
            }}
          >
            {MONTH_NAMES[currentMonth]} {currentYear}
            <ChevronDown
              size={14}
              style={{
                transform: showMonthPicker ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
                color: sc.muted,
              }}
            />
          </button>

          {showMonthPicker && (
            <MonthYearPicker
              currentMonth={currentMonth}
              currentYear={currentYear}
              onPick={onPickMonth}
              sc={sc}
              isDark={isDark}
            />
          )}
        </div>

        {/* Range-mode toggle. When on, taps build a range; when off,
            taps just set a single date. Toggling off resets back to
            the current start as the single selection. */}
        <button
          onClick={onToggleRangeMode}
          aria-pressed={rangeMode}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 10px",
            borderRadius: "999px",
            border: `1px solid ${rangeMode ? sc.brand : sc.border}`,
            background: rangeMode
              ? (isDark ? "rgba(0,196,160,0.12)" : "rgba(0,196,160,0.08)")
              : "transparent",
            fontSize: "12px",
            fontWeight: 600,
            color: rangeMode ? sc.brand : sc.body,
            cursor: "pointer",
            fontFamily: "var(--font-family)",
          }}
        >
          Date range
        </button>
      </div>

      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
          marginBottom: "8px",
        }}
      >
        {DAYS_OF_WEEK_FULL.map((day) => (
          <div
            key={day}
            style={{
              textAlign: "center",
              fontSize: "11px",
              fontWeight: 600,
              color: sc.muted,
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
        }}
      >
        {days.map((day, idx) => {
          const hasEvents = day !== null && datesWithEvents.includes(day);
          const isClosedAllDay = day !== null && closedAllDayDates.includes(day);
          const cellIsStart = day !== null && isStart(day);
          const cellIsEnd = day !== null && isEnd(day);
          const cellInRange = day !== null && isInRange(day);
          const cellSelected = cellIsStart || cellIsEnd;

          return (
            <div
              key={idx}
              onClick={() => day !== null && onSelectDay(day)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                cursor: day !== null ? "pointer" : "default",
                background: cellSelected
                  ? sc.brand
                  : cellInRange
                  ? (isDark ? "rgba(0,196,160,0.18)" : "rgba(0,196,160,0.14)")
                  : "transparent",
                color: cellSelected
                  ? isDark ? "#0a0e0f" : "#ffffff"
                  : day !== null
                    ? sc.heading
                    : sc.muted,
                fontSize: "14px",
                fontWeight: 500,
                opacity: day === null ? 0.4 : 1,
              }}
            >
              {day}
              {hasEvents && !cellSelected && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "6px",
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: isClosedAllDay ? sc.muted : sc.brand,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Month / Year picker popover (used by MiniCalendar header). ─── */
function MonthYearPicker({
  currentMonth,
  currentYear,
  onPick,
  sc,
  isDark,
}: {
  currentMonth: number;
  currentYear: number;
  onPick: (month: number, year: number) => void;
  sc: SemanticColors;
  isDark: boolean;
}) {
  const [pickerYear, setPickerYear] = useState(currentYear);
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        left: 0,
        width: "260px",
        background: sc.cellBg,
        border: `1px solid ${sc.border}`,
        borderRadius: "10px",
        boxShadow: `0px 12px 24px -6px ${sc.shadow}, 0px 4px 6px 0px ${sc.shadow}`,
        padding: "12px",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        fontFamily: "var(--font-family)",
      }}
    >
      {/* Year stepper */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => setPickerYear((y) => y - 1)}
          aria-label="Previous year"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            border: `1px solid ${sc.border}`,
            background: sc.controlBg,
            color: sc.body,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: "14px", fontWeight: 600, color: sc.heading }}>{pickerYear}</span>
        <button
          onClick={() => setPickerYear((y) => y + 1)}
          aria-label="Next year"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            border: `1px solid ${sc.border}`,
            background: sc.controlBg,
            color: sc.body,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* 12-month grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
        {MONTH_NAMES.map((name, idx) => {
          const isCurrent = idx === currentMonth && pickerYear === currentYear;
          return (
            <button
              key={name}
              onClick={() => onPick(idx, pickerYear)}
              style={{
                padding: "8px 4px",
                borderRadius: "6px",
                border: `1px solid ${isCurrent ? sc.brand : "transparent"}`,
                background: isCurrent
                  ? (isDark ? "rgba(0,196,160,0.12)" : "rgba(0,196,160,0.08)")
                  : "transparent",
                color: isCurrent ? sc.brand : sc.body,
                fontSize: "13px",
                fontWeight: 500,
                fontFamily: "var(--font-family)",
                cursor: "pointer",
              }}
            >
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface MobileEventRowProps {
  event: CalendarEvent;
  /** When set, renders a small date prefix above the row so the user
   *  can tell which day in a multi-day range the event falls on. */
  dateLabel?: string;
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  onClick: () => void;
  /** Hide the instructor/venue middle column. Used when the row is
   *  rendered inside a ResourceGroup, where the resource it belongs
   *  to is already shown in the dedicated left column. */
  hideMiddleColumn?: boolean;
}

function MobileEventRow({
  event,
  dateLabel,
  sc,
  colors,
  isDark,
  onClick,
  hideMiddleColumn = false,
}: MobileEventRowProps) {
  const style = colors[event.type] || colors.yoga;
  const available = Math.max(0, event.capacity - event.booked);
  const isFull = event.capacity > 0 && available === 0;

  /* Button states:
     • Spots available   → "Book"     (primary filled green)
     • Full + waitlist   → "Waitlist" (outline green)
     • Full, no waitlist → "Full"     (solid muted, disabled) */
  let statusLabel = "Book";
  let statusStyle: CSSProperties = {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 500,
    border: "none",
    background: sc.brand,
    color: isDark ? "#0a0e0f" : "#101828",
    cursor: "pointer",
  };

  if (isFull && event.waitlistEnabled) {
    statusLabel = "Waitlist";
    statusStyle = {
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: 500,
      border: `1px solid ${sc.brand}`,
      background: "transparent",
      color: sc.brand,
      cursor: "pointer",
    };
  } else if (isFull) {
    statusLabel = "Full";
    statusStyle = {
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: 500,
      border: "none",
      background: sc.muted,
      color: sc.cellBg,
      cursor: "default",
      opacity: 0.6,
    };
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        borderBottom: hideMiddleColumn ? "none" : `1px solid ${sc.border}`,
        cursor: "pointer",
      }}
    >
      {/* Left: dot, time, title, capacity */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: style.text,
            flexShrink: 0,
            marginTop: "6px",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            minWidth: 0,
          }}
        >
          {dateLabel && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: sc.muted,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                lineHeight: 1.2,
              }}
            >
              {dateLabel}
            </span>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "6px",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: sc.heading,
              }}
            >
              {event.time}
            </span>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: sc.heading,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {event.title}
            </span>
          </div>
          {event.capacity > 0 && (
            <span
              style={{
                fontSize: "12px",
                fontWeight: 400,
                color: sc.muted,
              }}
            >
              {event.booked} booked, {available} available
            </span>
          )}
        </div>
      </div>

      {/* Middle: instructor + venue — hidden when the row sits inside
          a ResourceGroup (the resource is shown in the group's left
          column there, so repeating it here would just add visual
          noise). */}
      {!hideMiddleColumn && (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          width: "80px",
          flexShrink: 0,
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: sc.muted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {event.instructor}
        </span>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: sc.muted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {event.venue}
        </span>
      </div>
      )}

      {/* Right: status button — fixed width so columns don't shift */}
      <div style={{ width: "62px", flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
        {event.capacity > 0 && (
          <button
            style={{
              ...statusStyle,
              flexShrink: 0,
            }}
          >
            {statusLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── ResourceGroup — used by MobileEventList when sortBy="resource".
   Renders a group title (e.g. "By Instructor") followed by a series
   of sub-headers (one per resource, alphabetized) with their events
   stacked beneath. Same MobileEventRow used for each event so the
   row content stays consistent across sort modes. */
function ResourceGroup({
  title,
  resourceKeys,
  bucket,
  showDate,
  sc,
  colors,
  isDark,
  onSelectEvent,
}: {
  title: string;
  resourceKeys: string[];
  bucket: Map<string, { event: CalendarEvent; date: Date }[]>;
  showDate: boolean;
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  return (
    <div>
      {/* Group section header — renders once per group (instructors,
          venues). The brand-tinted background separates the two
          stacked groups visually so the user can tell where the
          instructor list ends and the venue list begins. */}
      <div
        style={{
          padding: "10px 16px",
          background: isDark ? "rgba(0,196,160,0.06)" : "rgba(0,196,160,0.04)",
          borderTop: `1px solid ${sc.border}`,
          borderBottom: `1px solid ${sc.border}`,
          fontSize: "11px",
          fontWeight: 700,
          color: sc.brand,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontFamily: "var(--font-family)",
        }}
      >
        {title}
      </div>
      {/* Each resource is a horizontal row: name in a fixed-width left
          column (subtly tinted so it reads as a separate region), the
          resource's events stacked in the column to its right. The row
          uses align-items:stretch so the name cell visually spans the
          full height of its events block. */}
      {resourceKeys.map((key, rowIdx) => (
        <div
          key={`${title}-${key}`}
          style={{
            display: "flex",
            alignItems: "stretch",
            borderTop: rowIdx === 0 ? "none" : `1px solid ${sc.border}`,
          }}
        >
          {/* Left column: resource name. */}
          <div
            style={{
              width: "104px",
              flexShrink: 0,
              padding: "12px 10px",
              borderRight: `1px solid ${sc.border}`,
              background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
              fontSize: "12px",
              fontWeight: 600,
              color: sc.heading,
              fontFamily: "var(--font-family)",
              lineHeight: 1.3,
              wordBreak: "break-word",
            }}
          >
            {key}
          </div>

          {/* Right column: events for this resource. */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {(bucket.get(key) ?? []).map((item, evIdx) => (
              <div
                key={`${title}-${key}-${item.event.id}-${item.date.getTime()}`}
                style={{
                  borderTop: evIdx === 0 ? "none" : `1px solid ${sc.border}`,
                }}
              >
                <MobileEventRow
                  event={item.event}
                  dateLabel={showDate ? item.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : undefined}
                  sc={sc}
                  colors={colors}
                  isDark={isDark}
                  onClick={() => onSelectEvent(item.event)}
                  hideMiddleColumn
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface MobileEventListProps {
  /** Selection — supports a single date (selectedEnd null) or a range. */
  selectedStart: Date;
  selectedEnd: Date | null;
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  onSelectEvent: (event: CalendarEvent) => void;
  /** Opens the Add Reservation side panel from the brand-filled button
   *  on the right of the count row. */
  onAddReservation?: () => void;
  eventsByDay?: DayEvents;
  searchQuery?: string;
  /** Color-by-type legend popover, anchored to the Info button which
   *  sits immediately after the count text. */
  showLegend: boolean;
  setShowLegend: (show: boolean) => void;
  /** How to sort/group the events list. */
  sortBy: "time" | "name" | "type" | "resource";
}

// Stable display order for "sort by reservation type" — alphabetical
// by display label. Closures are excluded since they're shown in a
// dedicated section above the sorted list.
const TYPE_SORT_ORDER: ReservationType[] = ["hiit", "league", "meditation", "pilates", "yoga"];

// Strip out placeholder values like "—" or "" that mean "no resource".
function isRealResource(name: string): boolean {
  const trimmed = name.trim();
  return trimmed !== "" && trimmed !== "—";
}

function MobileEventList({
  selectedStart,
  selectedEnd,
  sc,
  colors,
  isDark,
  onSelectEvent,
  onAddReservation,
  eventsByDay,
  searchQuery,
  showLegend,
  setShowLegend,
  sortBy,
}: MobileEventListProps) {
  const legendRef = useRef<HTMLDivElement>(null);

  /* close legend popover on outside click */
  useEffect(() => {
    if (!showLegend) return;
    function handleClick(ev: MouseEvent) {
      if (legendRef.current && !legendRef.current.contains(ev.target as Node)) {
        setShowLegend(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showLegend, setShowLegend]);

  // Walk every day in the selected range (inclusive on both ends) and
  // collect each event with the date it occurs on. When selectedEnd is
  // null the range collapses to a single day.
  const source = eventsByDay ?? MOCK_EVENTS;
  const datedEvents: { event: CalendarEvent; date: Date }[] = [];
  {
    const start = new Date(selectedStart.getFullYear(), selectedStart.getMonth(), selectedStart.getDate());
    const end = selectedEnd
      ? new Date(selectedEnd.getFullYear(), selectedEnd.getMonth(), selectedEnd.getDate())
      : start;
    const cursor = new Date(start);
    while (cursor.getTime() <= end.getTime()) {
      const day = cursor.getDate();
      const dayEvents = source[day] ?? [];
      for (const ev of dayEvents) {
        datedEvents.push({ event: ev, date: new Date(cursor) });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  const closedItems = datedEvents.filter((d) => d.event.type === "closed");
  const nonClosedItems = datedEvents.filter((d) => d.event.type !== "closed");

  // Disable Add Reservation when ANY day in the range has a closure
  // (mock data is currently all-day closures only).
  const isClosed = closedItems.length > 0;
  const isFiltering = !!(searchQuery && searchQuery.trim());

  // Apply sort. "resource" is special — it returns a grouped layout
  // (handled separately below); the other three sorts produce a flat
  // ordered list.
  const sortedFlat: { event: CalendarEvent; date: Date }[] = [...nonClosedItems];
  if (sortBy === "time") {
    sortedFlat.sort((a, b) => {
      const ad = a.date.getTime() - b.date.getTime();
      if (ad !== 0) return ad;
      return parseEventTimeToMinutes(a.event.time) - parseEventTimeToMinutes(b.event.time);
    });
  } else if (sortBy === "name") {
    sortedFlat.sort((a, b) => a.event.title.localeCompare(b.event.title, undefined, { sensitivity: "base" }));
  } else if (sortBy === "type") {
    sortedFlat.sort((a, b) => {
      const ai = TYPE_SORT_ORDER.indexOf(a.event.type as ReservationType);
      const bi = TYPE_SORT_ORDER.indexOf(b.event.type as ReservationType);
      const aRank = ai === -1 ? 999 : ai;
      const bRank = bi === -1 ? 999 : bi;
      if (aRank !== bRank) return aRank - bRank;
      // Tie-breaker: earlier date, then earlier time
      const dd = a.date.getTime() - b.date.getTime();
      if (dd !== 0) return dd;
      return parseEventTimeToMinutes(a.event.time) - parseEventTimeToMinutes(b.event.time);
    });
  }

  // For the "resource" sort, build two grouped maps — one keyed by
  // instructor, one keyed by venue. An event with N instructors and
  // M venues appears N times in the instructor group and M times in
  // the venue group, so the two halves often overlap. Closures and
  // empty/placeholder resource values are skipped.
  const byInstructor = new Map<string, { event: CalendarEvent; date: Date }[]>();
  const byVenue = new Map<string, { event: CalendarEvent; date: Date }[]>();
  if (sortBy === "resource") {
    for (const item of nonClosedItems) {
      const inst = item.event.instructor;
      if (isRealResource(inst)) {
        if (!byInstructor.has(inst)) byInstructor.set(inst, []);
        byInstructor.get(inst)!.push(item);
      }
      const ven = item.event.venue;
      if (isRealResource(ven)) {
        if (!byVenue.has(ven)) byVenue.set(ven, []);
        byVenue.get(ven)!.push(item);
      }
    }
    // Within each resource bucket, sort by date+time so each grouping
    // is internally chronological.
    const sortByDateTime = (a: { event: CalendarEvent; date: Date }, b: { event: CalendarEvent; date: Date }) => {
      const dd = a.date.getTime() - b.date.getTime();
      if (dd !== 0) return dd;
      return parseEventTimeToMinutes(a.event.time) - parseEventTimeToMinutes(b.event.time);
    };
    for (const arr of byInstructor.values()) arr.sort(sortByDateTime);
    for (const arr of byVenue.values()) arr.sort(sortByDateTime);
  }
  // Instructors are listed by last name (the convention for people
  // lists) — venues stay alphabetical by full string. Last-name
  // extraction takes the final whitespace-separated token; same-last-
  // name ties fall back to the full string so "Anna Park" sorts
  // before "Lisa Park".
  const lastNameOf = (full: string): string => {
    const parts = full.trim().split(/\s+/);
    return parts[parts.length - 1] || full;
  };
  const instructorKeys = [...byInstructor.keys()].sort((a, b) => {
    const byLast = lastNameOf(a).localeCompare(lastNameOf(b), undefined, { sensitivity: "base" });
    return byLast !== 0 ? byLast : a.localeCompare(b);
  });
  const venueKeys = [...byVenue.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
        background: sc.cellBg,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${sc.border}`,
        }}
      >
        {/* Left group — Info legend button followed by the count text.
            Mirrors desktop's order so the layout reads consistently
            across breakpoints. The Info button is the smaller,
            subordinate one; the count is the dominant text. */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <div
            ref={legendRef}
            onMouseEnter={() => setShowLegend(true)}
            onMouseLeave={() => setShowLegend(false)}
            style={{ position: "relative" }}
          >
            <button
              onClick={() => setShowLegend(!showLegend)}
              aria-expanded={showLegend}
              aria-label="Legend"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                border: `1px solid ${showLegend ? sc.brand : sc.border}`,
                background: showLegend
                  ? (isDark ? "rgba(0,196,160,0.12)" : "rgba(0,196,160,0.08)")
                  : sc.controlBg,
                cursor: "pointer",
                color: showLegend ? sc.brand : sc.body,
                padding: 0,
              }}
            >
              <Info size={14} />
            </button>
            {showLegend && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  width: "260px",
                  background: sc.cellBg,
                  border: `1px solid ${sc.border}`,
                  borderRadius: "10px",
                  boxShadow: `0px 12px 24px -6px ${sc.shadow}, 0px 4px 6px 0px ${sc.shadow}`,
                  padding: "16px",
                  zIndex: 100,
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  fontFamily: "var(--font-family)",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: 600, color: sc.heading }}>
                  Legend
                </span>
                {[
                  // Alphabetized by label. Specific session names like
                  // "Power Yoga" or "Stretch & Restore" aren't listed —
                  // those are session titles, not reservation types.
                  { type: "closed" as ReservationType, label: "Closed" },
                  { type: "hiit" as ReservationType, label: "HIIT" },
                  { type: "league" as ReservationType, label: "League Game" },
                  { type: "meditation" as ReservationType, label: "Meditation" },
                  { type: "pilates" as ReservationType, label: "Pilates" },
                  { type: "yoga" as ReservationType, label: "Yoga" },
                ].map((row) => {
                  const c = colors[row.type];
                  return (
                    <div
                      key={row.label}
                      style={{ display: "flex", alignItems: "center", gap: "10px" }}
                    >
                      <span
                        aria-hidden
                        style={{
                          display: "inline-block",
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          background: c.bg,
                          border: `1px solid ${c.border}`,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: "13px", color: sc.body, lineHeight: 1.3 }}>
                        {row.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: sc.body,
            }}
          >
            Found {nonClosedItems.length} reservation(s)
          </span>
        </div>
        {/* Add Reservation — back in its original spot on the right of
            the count row. Disabled when the selected day is closed. */}
        <button
          onClick={isClosed ? undefined : onAddReservation}
          disabled={isClosed}
          title={isClosed ? "Facility is closed — reservations can't be added on this day" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            background: isClosed ? sc.muted : sc.brand,
            fontSize: "12px",
            fontWeight: 500,
            color: isDark ? "#0a0e0f" : "#101828",
            cursor: isClosed ? "not-allowed" : "pointer",
            opacity: isClosed ? 0.5 : 1,
          }}
        >
          <Plus size={14} /> Add Reservation
        </button>
      </div>

      {/* Event list - scrollable */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
        }}
      >
        {/* Closures rendered first as a minimal row. In range mode
            each closure shows the date it falls on so the user can
            tell them apart. */}
        {closedItems.map((item, i) => (
          <div
            key={`${item.event.id}-${item.date.getTime()}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "14px 16px",
              borderBottom: `1px solid ${sc.border}`,
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: sc.muted,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "13px", fontWeight: 700, color: sc.heading }}>
              Closed all day
              {selectedEnd ? ` · ${item.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}` : ""}
            </span>
            {/* Spacing key for stable map render */}
            <span style={{ display: "none" }}>{i}</span>
          </div>
        ))}

        {/* Resource sort = two stacked groups (instructors, then
            venues), each alphabetized. Other sorts produce a flat
            list. Each item carries its date so we can prefix it in
            range mode. */}
        {sortBy === "resource" ? (
          (instructorKeys.length === 0 && venueKeys.length === 0) ? (
            closedItems.length === 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "120px", color: sc.muted, fontSize: "14px" }}>
                {isFiltering ? "No reservations match your search" : "No reservations in this date range"}
              </div>
            )
          ) : (
            <>
              {instructorKeys.length > 0 && (
                <ResourceGroup
                  title="By Instructor"
                  resourceKeys={instructorKeys}
                  bucket={byInstructor}
                  showDate={!!selectedEnd}
                  sc={sc}
                  colors={colors}
                  isDark={isDark}
                  onSelectEvent={onSelectEvent}
                />
              )}
              {venueKeys.length > 0 && (
                <ResourceGroup
                  title="By Venue"
                  resourceKeys={venueKeys}
                  bucket={byVenue}
                  showDate={!!selectedEnd}
                  sc={sc}
                  colors={colors}
                  isDark={isDark}
                  onSelectEvent={onSelectEvent}
                />
              )}
            </>
          )
        ) : sortedFlat.length > 0 ? (
          sortedFlat.map((item) => (
            <MobileEventRow
              key={`${item.event.id}-${item.date.getTime()}`}
              event={item.event}
              dateLabel={selectedEnd ? item.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : undefined}
              sc={sc}
              colors={colors}
              isDark={isDark}
              onClick={() => onSelectEvent(item.event)}
            />
          ))
        ) : (
          closedItems.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "120px", color: sc.muted, fontSize: "14px" }}>
              {isFiltering ? "No reservations match your search" : (selectedEnd ? "No reservations in this date range" : "No reservations on this date")}
            </div>
          )
        )}
      </div>
    </div>
  );
}

interface MobileScheduleViewProps {
  palette: ThemePalette;
  mode: "light" | "dark";
  onAddReservation?: () => void;
  /** Filter state lifted from SchedulePage so it survives the
   *  desktop/mobile breakpoint switch. Without this, resizing the
   *  browser past the mobile breakpoint unmounts whichever view holds
   *  the active filters and the user loses them. */
  filterStartDate: string;
  setFilterStartDate: (v: string) => void;
  filterEndDate: string;
  setFilterEndDate: (v: string) => void;
  filterStartTime: string;
  setFilterStartTime: (v: string) => void;
  filterEndTime: string;
  setFilterEndTime: (v: string) => void;
  filterVenues: string[];
  setFilterVenues: (v: string[]) => void;
  filterInstructors: string[];
  setFilterInstructors: (v: string[]) => void;
  filterTypes: ReservationType[];
  setFilterTypes: (v: ReservationType[]) => void;
  filterPaymentStatus: "" | "Owed" | "Paid";
  setFilterPaymentStatus: (v: "" | "Owed" | "Paid") => void;
  filterRegistrations: string[];
  setFilterRegistrations: (v: string[]) => void;
  activeFilterCount: number;
  clearAllFilters: () => void;
}

function MobileScheduleView({
  palette,
  mode,
  onAddReservation,
  filterStartDate, setFilterStartDate,
  filterEndDate, setFilterEndDate,
  filterStartTime, setFilterStartTime,
  filterEndTime, setFilterEndTime,
  filterVenues, setFilterVenues,
  filterInstructors, setFilterInstructors,
  filterTypes, setFilterTypes,
  filterPaymentStatus, setFilterPaymentStatus,
  filterRegistrations, setFilterRegistrations,
  activeFilterCount,
  clearAllFilters,
}: MobileScheduleViewProps) {
  const isDark = mode === "dark";
  const sc = semanticColors(palette, isDark);
  const colors = getEventStyles(isDark);
  const { openPanel } = useSidePanel();

  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  // Selected date(s). When `selectedEnd` is null the user is viewing a
  // single day; when set, they're viewing a range. Range mode is
  // opt-in via a toggle inside the mini calendar — by default tapping
  // a day just sets `selectedStart` and clears `selectedEnd`.
  const [selectedStart, setSelectedStart] = useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  });
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);
  const [rangeMode, setRangeMode] = useState(false);
  // How the events list is sorted/grouped. "time" is the default
  // (chronological). "resource" is special: it splits the list into
  // two stacked groups (by instructor, by venue), each alphabetized
  // and with events filed under every resource they reference — so a
  // session with one instructor + one venue appears once in each group.
  const [sortBy, setSortBy] = useState<"time" | "name" | "type" | "resource">("time");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  // Mini calendar visibility — toggled by tapping the Date button in
  // the toolbar (which replaced the old "Monthly" view dropdown).
  const [showCalendar, setShowCalendar] = useState(false);
  // Month/year picker popover — opens when the user taps the month
  // name in the mini calendar header (replacing the old prev/next
  // arrows).
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Color-by-type legend popover. On mobile the Info button lives in
  // the results-count row (where Delete Mode used to live). Delete
  // Mode itself was removed from mobile because the user can never see
  // a full month at once on a phone, so there's no batch-delete payoff
  // — it stays a desktop-only feature.
  const [showLegend, setShowLegend] = useState(false);

  // Calendar filter state lives in SchedulePage and is passed in via
  // props — so the active filters survive a viewport resize that
  // crosses the mobile/desktop breakpoint (otherwise the unmounting
  // view's local state would be lost).

  // Filter events by search query then apply the structured filter
  // drawer criteria (date / time ranges, venues, instructors, types,
  // registrations, payment). Mirrors the desktop pipeline minus the
  // delete-mode pass — Delete Mode is desktop-only.
  const filteredEvents = useMemo(() => {
    const bySearch = filterEventsByQuery(MOCK_EVENTS, searchQuery);

    const parseHM = (s: string): number | null => {
      if (!s) return null;
      const [h, m] = s.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    };
    const startMins = parseHM(filterStartTime);
    const endMins = parseHM(filterEndTime);
    const startDateObj = filterStartDate ? new Date(filterStartDate + "T00:00:00") : null;
    const endDateObj = filterEndDate ? new Date(filterEndDate + "T23:59:59") : null;

    const result: DayEvents = {};
    for (const dayStr of Object.keys(bySearch)) {
      const day = Number(dayStr);
      if (startDateObj || endDateObj) {
        const cellDate = new Date(currentYear, currentMonth, day);
        if (startDateObj && cellDate < startDateObj) continue;
        if (endDateObj && cellDate > endDateObj) continue;
      }
      const events = bySearch[day] ?? [];
      const kept = events.filter((e) => {
        if (e.type === "closed") return true;
        if (startMins !== null || endMins !== null) {
          const m = parseEventTimeToMinutes(e.time);
          if (m === -1) return false;
          if (startMins !== null && m < startMins) return false;
          if (endMins !== null && m > endMins) return false;
        }
        // Resource filters (venue + instructor) are OR'd together, not
        // AND'd — picking a specific instructor and a specific venue
        // should surface sessions matching either one, since the two
        // don't necessarily ever share a session. Only when a resource
        // axis has no selections is it left out of the check entirely.
        if (filterVenues.length > 0 || filterInstructors.length > 0) {
          const matchesVenue = filterVenues.length > 0 && filterVenues.includes(e.venue);
          const matchesInstructor = filterInstructors.length > 0 && filterInstructors.includes(e.instructor);
          if (!matchesVenue && !matchesInstructor) return false;
        }
        if (filterTypes.length > 0 && !filterTypes.includes(e.type)) return false;
        if (filterPaymentStatus === "Owed" && getOwedCount(e) === 0) return false;
        if (filterPaymentStatus === "Paid" && getOwedCount(e) > 0) return false;
        if (filterRegistrations.length > 0) {
          if (e.capacity <= 0) return false;
          const pct = e.booked / e.capacity;
          const isFull       = e.booked >= e.capacity;
          const isWaitlisted = isFull && !!e.waitlistEnabled;
          const isNearlyFull = !isFull && pct >= 0.8;
          const isEmpty      = e.booked === 0;
          const isAvailable  = !isFull && !isNearlyFull && !isEmpty;
          const matches =
            (filterRegistrations.includes("Full")       && isFull)       ||
            (filterRegistrations.includes("Waitlisted")  && isWaitlisted) ||
            (filterRegistrations.includes("NearlyFull") && isNearlyFull) ||
            (filterRegistrations.includes("Available")  && isAvailable)  ||
            (filterRegistrations.includes("Empty")      && isEmpty);
          if (!matches) return false;
        }
        return true;
      });
      if (kept.length > 0) result[day] = kept;
    }
    return result;
  }, [
    searchQuery,
    filterStartDate, filterEndDate,
    filterStartTime, filterEndTime,
    filterVenues, filterInstructors, filterTypes,
    filterPaymentStatus, filterRegistrations,
    currentMonth, currentYear,
  ]);

  const handleToggleCalendar = useCallback(() => {
    setShowCalendar((v) => !v);
  }, []);

  // "Today" — jumps the calendar back to the real-world current
  // month/year AND sets the selected start to today, clearing any
  // active range. Single-date semantics for the Today button.
  const handleGoToToday = useCallback(() => {
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedStart(today0);
    setSelectedEnd(null);
    setRangeMode(false);
  }, []);

  // The Today button shows whenever the selection is anything other
  // than just today (different month/year, different day, or an
  // active range).
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const startKey = `${selectedStart.getFullYear()}-${selectedStart.getMonth()}-${selectedStart.getDate()}`;
  const isViewingToday =
    !selectedEnd &&
    startKey === todayKey &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  // Format the Date button label. Single date → "Tue, Apr 28";
  // range → "Apr 25 – May 2" (or include year if start/end span
  // years).
  const formatDateButton = (): string => {
    const fmtSingle = (d: Date) =>
      d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (!selectedEnd) return fmtSingle(selectedStart);
    const fmtShort = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const fmtFull = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (selectedStart.getFullYear() === selectedEnd.getFullYear()) {
      return `${fmtShort(selectedStart)} – ${fmtShort(selectedEnd)}`;
    }
    return `${fmtFull(selectedStart)} – ${fmtFull(selectedEnd)}`;
  };

  // Day-tap handler from the mini calendar. In single mode, just
  // updates `selectedStart` and clears any prior end. In range mode,
  // the first tap sets start (clears end); the second tap fills in
  // end (auto-swapping if the user picked a date earlier than start);
  // a third tap restarts the range.
  const handleSelectDay = useCallback(
    (day: number) => {
      const picked = new Date(currentYear, currentMonth, day);
      if (!rangeMode) {
        setSelectedStart(picked);
        setSelectedEnd(null);
        return;
      }
      // Range mode
      if (!selectedEnd) {
        // We have only a start. Treat this tap as the end (or restart
        // if the user re-tapped the same day).
        if (picked.getTime() === selectedStart.getTime()) {
          // re-tapped same day → leave as single until user taps a
          // different day
          return;
        }
        if (picked < selectedStart) {
          // User picked an earlier day — swap
          setSelectedEnd(selectedStart);
          setSelectedStart(picked);
        } else {
          setSelectedEnd(picked);
        }
      } else {
        // Range already set — restart with this tap as the new start.
        setSelectedStart(picked);
        setSelectedEnd(null);
      }
    },
    [currentYear, currentMonth, rangeMode, selectedStart, selectedEnd]
  );

  // Toggle between single-date and range selection. Turning range
  // mode off keeps the existing start as the active single date.
  const handleToggleRangeMode = useCallback(() => {
    setRangeMode((prev) => {
      if (prev) {
        // Switching off range mode → drop the end so the selection
        // collapses back to a single date (the start).
        setSelectedEnd(null);
      }
      return !prev;
    });
  }, []);

  // Month/year picker handlers (replaces the old prev/next month
  // arrow buttons in the mini calendar header).
  const handlePickMonth = useCallback((month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
    setShowMonthPicker(false);
  }, []);

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      openPanel(
        <ReservationDetailsPanelContent key={event.id} event={event} />,
        { size: "full", title: `Reservation Details: ${event.title}` }
      );
    },
    [openPanel]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  return (
    <div
      style={{
        fontFamily: "var(--font-family)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        flex: "1 1 0",
        /* Reclaim Layout's mobile padding (0 12px 80px) so the schedule
         * content runs edge-to-edge — the calendar grid + event list
         * already have their own internal padding, so the page-level
         * 12px gutter just wastes valuable horizontal space on phones. */
        marginLeft: "-12px",
        marginRight: "-12px",
        marginBottom: "-80px",
        paddingBottom: "12px",
      }}
    >
      {/* Toolbar */}
      <MobileToolbar
        sc={sc}
        isDark={isDark}
        showCalendar={showCalendar}
        onToggleCalendar={handleToggleCalendar}
        dateButtonLabel={formatDateButton()}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        showFilter={showFilter}
        setShowFilter={setShowFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showTodayButton={!isViewingToday}
        onGoToToday={handleGoToToday}
        activeFilterCount={activeFilterCount}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showSortMenu={showSortMenu}
        setShowSortMenu={setShowSortMenu}
      />

      {/* Filters drawer — same content as the desktop popover. The
          colored Reservation Types chips inside double as the legend
          on mobile, so there's no separate Info button on this view. */}
      {showFilter && (
        <div
          style={{
            padding: "16px",
            background: sc.cellBg,
            borderBottom: `1px solid ${sc.border}`,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            fontFamily: "var(--font-family)",
          }}
        >
          <CalendarFiltersContent
            filterStartDate={filterStartDate}
            setFilterStartDate={setFilterStartDate}
            filterEndDate={filterEndDate}
            setFilterEndDate={setFilterEndDate}
            filterStartTime={filterStartTime}
            setFilterStartTime={setFilterStartTime}
            filterEndTime={filterEndTime}
            setFilterEndTime={setFilterEndTime}
            filterVenues={filterVenues}
            setFilterVenues={setFilterVenues}
            filterInstructors={filterInstructors}
            setFilterInstructors={setFilterInstructors}
            filterTypes={filterTypes}
            setFilterTypes={setFilterTypes}
            filterPaymentStatus={filterPaymentStatus}
            setFilterPaymentStatus={setFilterPaymentStatus}
            filterRegistrations={filterRegistrations}
            setFilterRegistrations={setFilterRegistrations}
            activeFilterCount={activeFilterCount}
            clearAllFilters={clearAllFilters}
            palette={palette}
            isDark={isDark}
            sc={sc}
            colors={colors}
            mobileLayout
          />
        </div>
      )}

      {/* Mini Calendar — opens via the Date button in the toolbar.
          Range-aware; month/year picker replaces prev/next arrows. */}
      {showCalendar && (
        <MiniCalendar
          currentMonth={currentMonth}
          currentYear={currentYear}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
          onSelectDay={handleSelectDay}
          rangeMode={rangeMode}
          onToggleRangeMode={handleToggleRangeMode}
          onPickMonth={handlePickMonth}
          showMonthPicker={showMonthPicker}
          setShowMonthPicker={setShowMonthPicker}
          sc={sc}
          isDark={isDark}
        />
      )}

      {/* Event List — single date or range; sortBy controls the
          flat-vs-grouped rendering inside. */}
      <MobileEventList
        selectedStart={selectedStart}
        selectedEnd={selectedEnd}
        sc={sc}
        colors={colors}
        isDark={isDark}
        onSelectEvent={handleSelectEvent}
        onAddReservation={onAddReservation}
        eventsByDay={filteredEvents}
        searchQuery={searchQuery}
        showLegend={showLegend}
        setShowLegend={setShowLegend}
        sortBy={sortBy}
      />

      {/* Full-page reservation detail */}
      {selectedEvent && (
        <MobileReservationDetail
          event={selectedEvent}
          day={selectedStart.getDate()}
          month={currentMonth}
          year={currentYear}
          onClose={handleCloseDetail}
          sc={sc}
          colors={colors}
          isDark={isDark}
        />
      )}

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA — Venues, Instructors, Reservation types
   ═══════════════════════════════════════════════════════════════════════ */

// Lists are pre-sorted alphabetically so SearchableMultiSelect /
// dropdown menus render in a predictable order without runtime sorting.
const VENUE_OPTIONS = [
  "Court 1",
  "Court 2",
  "Gym Floor",
  "Multipurpose Room",
  "Outdoor Field",
  "Pool Deck",
  "Studio A",
  "Studio B",
];

const INSTRUCTOR_OPTIONS = [
  "Alan Alda",
  "Derek Thompson",
  "James Kim",
  "Jody March",
  "Lisa Park",
  "Marcus Jones",
  "Mia Rodriguez",
  "Olivia Nguyen",
  "Sara Chen",
];

// Activity categories for the form's "Reservation type" select.
// Mirrors the calendar's ReservationType enum (yoga / meditation /
// pilates / hiit / league). "Group Class" was dropped because most
// events are group classes by default; class size = 1 implies a
// private session without needing its own type. Session-specific
// names like "Power Yoga" or "Stretch & Restore" go in the title
// field, not here.
const RESERVATION_TYPE_OPTIONS = [
  "HIIT",
  "League Game",
  "Meditation",
  "Pilates",
  "Yoga",
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — SearchableMultiSelect
   A custom multiselect dropdown with search, used for Venue(s) and
   Instructor(s) fields. Styled to match the project's palette tokens.
   ═══════════════════════════════════════════════════════════════════════ */

interface SearchableMultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  palette: ThemePalette;
  /** Optional display-label transform. Defaults to identity. */
  getLabel?: (option: string) => string;
  /** Optional leading element (e.g. a color-coded dot) rendered before
   *  the label in both trigger tags and dropdown options. */
  getLeading?: (option: string) => ReactNode;
}

function SearchableMultiSelect({ options, selected, onChange, placeholder, palette, getLabel, getLeading }: SearchableMultiSelectProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Trigger rect — used to position the dropdown via `position: fixed` so
  // it overlays any ancestor with `overflow: auto/hidden` (e.g. the
  // calendar Filters popover, which previously clipped this dropdown).
  const [triggerRect, setTriggerRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Close on outside click — also accept clicks on the portaled dropdown
  // since it lives outside `containerRef`.
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const inTrigger = containerRef.current?.contains(e.target as Node);
      const inDropdown = dropdownRef.current?.contains(e.target as Node);
      if (!inTrigger && !inDropdown) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Track the trigger's viewport position while the dropdown is open. We
  // re-measure on open, on window resize, and on scroll (capture-phase so
  // we catch ancestor scroll containers too) to keep the fixed-position
  // dropdown anchored to the trigger as the page moves.
  useEffect(() => {
    if (!isOpen) return;
    function update() {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setTriggerRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen]);

  const filtered = options.filter((o) => {
    const haystack = (getLabel ? getLabel(o) : o).toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const removeTag = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== option));
  };

  const triggerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "6px",
    width: "100%",
    minHeight: "42px",
    background: palette.surfaceBg,
    border: `1px solid ${isOpen ? palette.primary : palette.borderMedium}`,
    borderRadius: "6px",
    color: palette.textPrimary,
    fontSize: "var(--text-base)",
    fontFamily: "var(--font-family)",
    padding: "6px 32px 6px 12px",
    cursor: "pointer",
    position: "relative",
    outline: "none",
    transition: "border-color 0.15s ease",
  };

  const tagStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "2px 8px",
    borderRadius: "4px",
    background: palette.primary,
    color: isDark ? "#0a0e0f" : "#101828",
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    fontFamily: "var(--font-family)",
    whiteSpace: "nowrap",
  };

  const tagCloseStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    border: "none",
    background: "rgba(0,0,0,0.15)",
    color: "inherit",
    fontSize: "10px",
    lineHeight: 1,
    cursor: "pointer",
    padding: 0,
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Trigger */}
      <div ref={triggerRef} onClick={() => setIsOpen(!isOpen)} style={triggerStyle}>
        {selected.length === 0 && (
          <span style={{ color: palette.textTertiary }}>{placeholder}</span>
        )}
        {selected.map((item) => (
          <span key={item} style={tagStyle}>
            {getLeading?.(item)}
            {getLabel ? getLabel(item) : item}
            <button onClick={(e) => removeTag(item, e)} style={tagCloseStyle} aria-label={`Remove ${getLabel ? getLabel(item) : item}`}>
              ×
            </button>
          </span>
        ))}
        <ChevronDown
          size={16}
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: `translateY(-50%) ${isOpen ? "rotate(180deg)" : "rotate(0deg)"}`,
            color: palette.textTertiary,
            transition: "transform 0.2s ease",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Dropdown — `position: fixed` with viewport-relative coordinates
          from the trigger's getBoundingClientRect(), so the dropdown
          overlays any ancestor `overflow: auto/hidden` container (most
          notably the calendar Filters popover). High z-index keeps it
          above the surrounding popover layer. */}
      {isOpen && triggerRect && (
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: triggerRect.top + triggerRect.height + 4,
            left: triggerRect.left,
            width: triggerRect.width,
            background: palette.surfacePrimary,
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1100,
            overflow: "hidden",
          }}
        >
          {/* Search input */}
          <div style={{ padding: "8px", borderBottom: `1px solid ${palette.borderLight}` }}>
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: palette.textTertiary,
                  pointerEvents: "none",
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                style={{
                  width: "100%",
                  padding: "8px 10px 8px 30px",
                  background: palette.surfaceBg,
                  border: `1px solid ${palette.borderLight}`,
                  borderRadius: "4px",
                  color: palette.textPrimary,
                  fontSize: "var(--text-sm)",
                  fontFamily: "var(--font-family)",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Options list */}
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "10px 12px", color: palette.textTertiary, fontSize: "var(--text-sm)", fontFamily: "var(--font-family)" }}>
                No results found
              </div>
            ) : (
              filtered.map((option) => {
                const isChecked = selected.includes(option);
                return (
                  <button
                    key={option}
                    onClick={() => toggleOption(option)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      padding: "8px 12px",
                      border: "none",
                      background: isChecked ? `${palette.primary}18` : "transparent",
                      color: palette.textPrimary,
                      fontSize: "var(--text-sm)",
                      fontFamily: "var(--font-family)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "16px",
                        height: "16px",
                        borderRadius: "3px",
                        border: isChecked ? "none" : `1.5px solid ${palette.borderMedium}`,
                        background: isChecked ? palette.primary : "transparent",
                        color: isChecked ? (isDark ? "#0a0e0f" : "#101828") : "transparent",
                        fontSize: "11px",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {isChecked ? "✓" : ""}
                    </span>
                    {getLeading?.(option)}
                    {getLabel ? getLabel(option) : option}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — ReservationDetailsPanelContent
   Read-only view of a reservation, opened when clicking an event.
   Compact layout inspired by the hover popover, with booking meter and
   scrollable clients list. Edit pencil toggles into full form mode.
   ═══════════════════════════════════════════════════════════════════════ */

// Mock booked clients data for the scrollable list.
// `paymentStatus` + `balance` (USD) drive the new "overdue balances" UI in the
// hover popover capacity meter, the clients-list payment column, and the
// calendar's Filters popover ("only events with overdue balances").
type BookedClient = {
  name: string;
  status: "Booked" | "Waitlisted" | "Reserved";
  paymentStatus: "Paid" | "Owed";
  balance: number;
};
const MOCK_BOOKED_CLIENTS: BookedClient[] = [
  { name: "Emma Rodriguez",   status: "Booked",     paymentStatus: "Paid", balance: 0 },
  { name: "James Wilson",     status: "Booked",     paymentStatus: "Owed", balance: 35 },
  { name: "Sophia Lee",       status: "Booked",     paymentStatus: "Paid", balance: 0 },
  { name: "Liam Martinez",    status: "Booked",     paymentStatus: "Owed", balance: 25 },
  { name: "Olivia Chen",      status: "Reserved",   paymentStatus: "Owed", balance: 50 },
  { name: "Noah Thompson",    status: "Booked",     paymentStatus: "Paid", balance: 0 },
  { name: "Ava Patel",        status: "Booked",     paymentStatus: "Paid", balance: 0 },
  { name: "Mason Brown",      status: "Waitlisted", paymentStatus: "Paid", balance: 0 },
  { name: "Isabella Garcia",  status: "Booked",     paymentStatus: "Owed", balance: 60 },
  { name: "Ethan Davis",      status: "Booked",     paymentStatus: "Paid", balance: 0 },
  { name: "Mia Johnson",      status: "Booked",     paymentStatus: "Owed", balance: 25 },
  { name: "Lucas Anderson",   status: "Reserved",   paymentStatus: "Paid", balance: 0 },
  { name: "Charlotte Taylor", status: "Booked",     paymentStatus: "Paid", balance: 0 },
  { name: "Aiden Moore",      status: "Booked",     paymentStatus: "Owed", balance: 40 },
  { name: "Amelia Jackson",   status: "Waitlisted", paymentStatus: "Paid", balance: 0 },
  { name: "Harper White",     status: "Booked",     paymentStatus: "Paid", balance: 0 },
  { name: "Elijah Harris",    status: "Booked",     paymentStatus: "Owed", balance: 25 },
  { name: "Abigail Martin",   status: "Booked",     paymentStatus: "Paid", balance: 0 },
  { name: "Benjamin Clark",   status: "Booked",     paymentStatus: "Paid", balance: 0 },
  { name: "Emily Lewis",      status: "Booked",     paymentStatus: "Owed", balance: 15 },
  { name: "Daniel Walker",    status: "Booked",     paymentStatus: "Paid", balance: 0 },
  { name: "Elizabeth Hall",   status: "Booked",     paymentStatus: "Paid", balance: 0 },
];

// All-paid subset, used when an event maps to the "no overdue balances"
// scenario (see getEventClients). Derived from MOCK_BOOKED_CLIENTS so any
// future name additions automatically flow through.
const ALL_PAID_CLIENTS: BookedClient[] = MOCK_BOOKED_CLIENTS.filter(
  (c) => c.paymentStatus === "Paid"
);

// Distribute events across two "balance scenarios" so some events on the
// calendar have no overdue balances at all (and therefore no "Overdue
// Balances" line in the hover popover) and others show the existing mix.
// The scenario is derived deterministically from event.id, so a given
// event always falls into the same bucket across renders.
//
//   bucket 0  — all-paid roster (no owed clients, no red meter segment)
//   bucket 1+ — mixed roster (current behavior; first-N from MOCK list)
//
// Used by the hover popover meter, the registered clients list in the
// reservation details panel, and the calendar Filters popover.
function getEventClients(event: CalendarEvent): BookedClient[] {
  const booked = event.booked || 0;
  if (booked === 0) return [];
  const idHash = event.id
    .split("")
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0);
  const bucket = Math.abs(idHash) % 3;
  const roster =
    bucket === 0
      ? // All-paid scenario — slice from the all-paid list (cap at its
        // length so we don't read past the end if booked is unusually high).
        ALL_PAID_CLIENTS.slice(0, Math.min(booked, ALL_PAID_CLIENTS.length))
      : MOCK_BOOKED_CLIENTS.slice(0, booked);

  // Business rule: a session can only carry Waitlisted registrants when
  // it's actually full AND has waitlisting enabled. The shared mock
  // rosters above have a couple of hardcoded "Waitlisted" entries, which
  // would otherwise leak into any event with a high enough booked count
  // regardless of its own waitlistEnabled setting — normalize those back
  // to "Booked" whenever the invariant doesn't hold.
  const canHaveWaitlisted = event.capacity > 0 && booked >= event.capacity && !!event.waitlistEnabled;
  if (canHaveWaitlisted) return roster;
  return roster.map((c) => (c.status === "Waitlisted" ? { ...c, status: "Booked" as const } : c));
}

// Helper: how many of an event's booked clients owe a balance.
// Used in the hover popover meter, the clients list column counts, and
// the calendar Filters popover's "overdue balances" filter.
function getOwedCount(event: CalendarEvent): number {
  return getEventClients(event).filter((c) => c.paymentStatus === "Owed").length;
}

// Helper: how many of an event's registered clients fall into each
// booking status. Used by the Daily view's per-session breakdown so a
// glance tells you not just "8 registered" but "6 booked, 2 waitlisted".
function getClientStatusCounts(event: CalendarEvent): Record<BookedClient["status"], number> {
  const clients = getEventClients(event);
  return {
    Booked: clients.filter((c) => c.status === "Booked").length,
    Waitlisted: clients.filter((c) => c.status === "Waitlisted").length,
    Reserved: clients.filter((c) => c.status === "Reserved").length,
  };
}

// Shared status-pill colors (Booked/Waitlisted/Reserved) — mirrors the
// palette used by ReservationDetailsPanelContent's registered-clients
// filter pills so the Daily view's breakdown reads as the same visual
// language rather than a one-off color set.
function getStatusPillColors(isDark: boolean): Record<BookedClient["status"], { bg: string; text: string }> {
  return {
    Booked: { bg: isDark ? "rgba(0,196,160,0.15)" : "rgba(0,160,130,0.18)", text: isDark ? "#00c4a0" : "#00876c" },
    Waitlisted: { bg: isDark ? "rgba(255,180,50,0.15)" : "rgba(220,150,20,0.22)", text: isDark ? "#ffb432" : "#b07800" },
    Reserved: { bg: isDark ? "rgba(120,160,200,0.15)" : "rgba(80,120,170,0.18)", text: isDark ? "#78a0c8" : "#2d6cab" },
  };
}

/**
 * Self-contained dropdown rendered into the SidePanel header (next to the
 * panel title) via `setHeaderExtras`. Owns its own open/close state and
 * outside-click handling so it can live in a different React subtree from
 * the panel content that registered it.
 */
/**
 * SectionPriorityTabs — priority-tab section navigation for side panels.
 *
 * Shows the first `maxVisible` sections as underlined tabs; the rest
 * collapse into a "More (N)" menu. Selecting an overflow section swaps it
 * with the last visible tab, so the active section is always visible in
 * the row and the More count stays constant. Promotion also triggers when
 * the active section changes externally (e.g. the footer "Next: …"
 * button), not just via the menu.
 *
 * Standard section-navigation pattern for tabbed side panels — every
 * destination is one click away and the active section is always labeled
 * on screen. Use this (not a header chevron dropdown) for any new tabbed
 * side panel.
 */
function SectionPriorityTabs({
  sections,
  activeSection,
  onSelectSection,
  maxVisible = 4,
}: {
  sections: string[];
  activeSection: string;
  onSelectSection: (s: string) => void;
  maxVisible?: number;
}) {
  const { palette } = useTheme();
  const [order, setOrder] = useState<string[]>(sections);
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Re-derive the tab order if the section list itself changes.
  useEffect(() => {
    setOrder((prev) =>
      prev.length === sections.length && sections.every((s) => prev.includes(s))
        ? prev
        : sections
    );
  }, [sections]);

  // Promote the active section into the visible row when it lives in the
  // overflow. The displaced tab takes its slot in the menu (a swap), so
  // the More count never changes and users keep a stable sense of place.
  useEffect(() => {
    setOrder((prev) => {
      const idx = prev.indexOf(activeSection);
      if (idx === -1 || idx < maxVisible) return prev;
      const next = [...prev];
      next[maxVisible - 1] = activeSection;
      next[idx] = prev[maxVisible - 1];
      return next;
    });
  }, [activeSection, maxVisible]);

  // Close the More menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const visible = order.slice(0, maxVisible);
  const overflow = order.slice(maxVisible);

  // Tabs shrink and ellipsize before the row overflows, so four tabs +
  // More survive the quarter-width panel; full labels stay available via
  // the title tooltip.
  const baseTabStyle: CSSProperties = {
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "12px 10px",
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-family)",
    color: palette.textTertiary,
    cursor: "pointer",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
    flex: "0 1 auto",
    transition: "color 0.15s ease, border-color 0.15s ease, background 0.15s ease",
  };

  return (
    <div role="tablist" aria-label="Panel sections" style={{ display: "flex", alignItems: "stretch", gap: "2px" }}>
      {visible.map((section) => {
        const isActive = section === activeSection;
        return (
          <button
            key={section}
            role="tab"
            aria-selected={isActive}
            title={section}
            onClick={() => onSelectSection(section)}
            style={{
              ...baseTabStyle,
              color: isActive ? palette.textPrimary : palette.textTertiary,
              fontWeight: isActive ? 600 : 400,
              borderBottom: isActive ? `2px solid ${palette.primary}` : "2px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = palette.textPrimary;
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = palette.textTertiary;
            }}
          >
            {section}
          </button>
        );
      })}
      {overflow.length > 0 && (
        <div ref={moreRef} style={{ position: "relative", display: "flex", flexShrink: 0 }}>
          <button
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              ...baseTabStyle,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              overflow: "visible",
              flex: "0 0 auto",
              color: menuOpen ? palette.textPrimary : palette.textTertiary,
              background: menuOpen ? palette.hoverBg : "none",
              borderRadius: "6px 6px 0 0",
            }}
            onMouseEnter={(e) => {
              if (!menuOpen) e.currentTarget.style.color = palette.textPrimary;
            }}
            onMouseLeave={(e) => {
              if (!menuOpen) e.currentTarget.style.color = palette.textTertiary;
            }}
          >
            More ({overflow.length})
            <ChevronDown
              size={14}
              style={{ transition: "transform 0.2s ease", transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
          {menuOpen && (
            <div
              role="menu"
              style={{
                position: "absolute",
                top: "calc(100% + 2px)",
                right: 0,
                minWidth: "180px",
                background: palette.surfacePrimary,
                border: `1px solid ${palette.borderLight}`,
                borderRadius: "8px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                zIndex: 30,
                padding: "4px",
              }}
            >
              {overflow.map((section) => (
                <button
                  key={section}
                  role="menuitem"
                  onClick={() => {
                    onSelectSection(section);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: "6px",
                    background: "transparent",
                    color: palette.textPrimary,
                    fontSize: "var(--text-sm)",
                    fontFamily: "var(--font-family)",
                    cursor: "pointer",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = palette.hoverBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {section}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReservationDetailsPanelContent({
  event,
  initialEditing = false,
  initialSection = "Details",
}: {
  event: CalendarEvent;
  // Opens the panel straight into edit mode — used when the entry point
  // already implies an edit intent (e.g. EZCoach's edit-lookup flow),
  // so the user isn't dropped into the read-only view first.
  initialEditing?: boolean;
  // Opens the panel with a specific section already active — used by the
  // hover popover's "Book A Client" / "Waitlist a Client" action so the
  // user lands directly on Registration instead of Details.
  initialSection?: string;
}) {
  const { palette, mode } = useTheme();
  const isDark = mode === "dark";
  const { closePanel, setHeaderExtras } = useSidePanel();
  const sc = semanticColors(palette, isDark);

  const [activeSection, setActiveSection] = useState(initialSection);
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // Additional options accordion — closed by default in edit mode so the
  // checkbox/description fields don't dominate the form's vertical rhythm.
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);

  // Editable state — initialized from the event data
  const initScheduleType = "session";
  const initRecurring = "no";
  const initVenues = event.venue ? [event.venue] : [];
  const initInstructors = event.instructor ? [event.instructor] : [];
  // Derive the form's "Reservation type" value from the event's
  // category — Power Yoga the session is a "Yoga" reservation type,
  // Stretch & Restore is "Meditation", and so on.
  const initReservationType =
    event.type === "league" ? "League Game"
      : event.type === "hiit" ? "HIIT"
      : event.type === "meditation" ? "Meditation"
      : event.type === "pilates" ? "Pilates"
      : event.type === "yoga" ? "Yoga"
      : "";
  const initTitle = event.title;
  const initStartDate = new Date().toISOString().slice(0, 10);
  const initEndDate = new Date().toISOString().slice(0, 10);
  const initStartTime = event.time ? `${event.time.replace(/[ap]m/, "").padStart(2, "0")}:00` : "09:00";
  const initEndTime = event.time ? `${String(parseInt(event.time) + 1).padStart(2, "0")}:00` : "10:00";
  const initAllDay = false;
  const initUseDefaultBuffer = true;
  // Read buffers from the event itself; fall back to "" (None) when absent or 0
  // so the Pre-buffer / Post-buffer rows in the details view say "None" rather
  // than "0 min", and the form's <select> picks up "None" as the default.
  const initPreBuffer = event.preBuffer && event.preBuffer > 0 ? String(event.preBuffer) : "";
  const initPostBuffer = event.postBuffer && event.postBuffer > 0 ? String(event.postBuffer) : "";
  const initNotes = "";
  const initAllowWaitlisting = !!event.waitlistEnabled;
  // Additional options — currently mock defaults; once backed by real data
  // these initial values would derive from the event/reservation record.
  const initOnlineDescription = event.type === "league" ? "League Game" : "Yoga";
  const initAllowSelfBooking = true;
  const initAllowFreeBookings = true;
  const initShowOnEZLeagues = true;

  const [scheduleType, setScheduleType] = useState<"session" | "rental">(initScheduleType);
  const [recurring, setRecurring] = useState<"yes" | "no">(initRecurring);
  const [selectedVenues, setSelectedVenues] = useState<string[]>(initVenues);
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>(initInstructors);
  const [reservationType, setReservationType] = useState(initReservationType);
  const [title, setTitle] = useState(initTitle);
  const [startDate, setStartDate] = useState(initStartDate);
  const [endDate, setEndDate] = useState(initEndDate);
  const [startTime, setStartTime] = useState(initStartTime);
  const [endTime, setEndTime] = useState(initEndTime);
  const [allDay, setAllDay] = useState(initAllDay);
  const [useDefaultBuffer, setUseDefaultBuffer] = useState(initUseDefaultBuffer);
  const [preBuffer, setPreBuffer] = useState(initPreBuffer);
  const [postBuffer, setPostBuffer] = useState(initPostBuffer);
  const [notes, setNotes] = useState(initNotes);
  const [allowWaitlisting, setAllowWaitlisting] = useState(initAllowWaitlisting);
  const [onlineDescription, setOnlineDescription] = useState(initOnlineDescription);
  const [allowSelfBooking, setAllowSelfBooking] = useState(initAllowSelfBooking);
  const [allowFreeBookings, setAllowFreeBookings] = useState(initAllowFreeBookings);
  const [showOnEZLeagues, setShowOnEZLeagues] = useState(initShowOnEZLeagues);

  // Track whether any field has been modified
  const hasChanges =
    scheduleType !== initScheduleType ||
    recurring !== initRecurring ||
    JSON.stringify(selectedVenues) !== JSON.stringify(initVenues) ||
    JSON.stringify(selectedInstructors) !== JSON.stringify(initInstructors) ||
    reservationType !== initReservationType ||
    title !== initTitle ||
    startDate !== initStartDate ||
    endDate !== initEndDate ||
    startTime !== initStartTime ||
    endTime !== initEndTime ||
    allDay !== initAllDay ||
    useDefaultBuffer !== initUseDefaultBuffer ||
    preBuffer !== initPreBuffer ||
    postBuffer !== initPostBuffer ||
    notes !== initNotes ||
    allowWaitlisting !== initAllowWaitlisting ||
    onlineDescription !== initOnlineDescription ||
    allowSelfBooking !== initAllowSelfBooking ||
    allowFreeBookings !== initAllowFreeBookings ||
    showOnEZLeagues !== initShowOnEZLeagues;

  // Attempt to exit editing — shows confirmation if there are unsaved changes
  const handleCancelEditing = () => {
    if (hasChanges) {
      setShowCancelConfirm(true);
    } else {
      setIsEditing(false);
    }
  };

  // Confirmed discard — reset all fields to initial values and exit editing
  const handleConfirmDiscard = () => {
    setScheduleType(initScheduleType);
    setRecurring(initRecurring);
    setSelectedVenues(initVenues);
    setSelectedInstructors(initInstructors);
    setReservationType(initReservationType);
    setTitle(initTitle);
    setStartDate(initStartDate);
    setEndDate(initEndDate);
    setStartTime(initStartTime);
    setEndTime(initEndTime);
    setAllDay(initAllDay);
    setUseDefaultBuffer(initUseDefaultBuffer);
    setPreBuffer(initPreBuffer);
    setPostBuffer(initPostBuffer);
    setNotes(initNotes);
    setAllowWaitlisting(initAllowWaitlisting);
    setOnlineDescription(initOnlineDescription);
    setAllowSelfBooking(initAllowSelfBooking);
    setAllowFreeBookings(initAllowFreeBookings);
    setShowOnEZLeagues(initShowOnEZLeagues);
    setShowCancelConfirm(false);
    setIsEditing(false);
  };

  const sections = ["Details", "Registration", "Registered Clients", "Linked", "History"];

  // Header carries nothing — section switching lives in SectionPriorityTabs,
  // a sticky tab row pinned to the top of the panel body (same pattern as
  // AddReservationPanelContent). Still clear on mount/unmount in case a
  // previously opened panel left header extras behind.
  useEffect(() => {
    setHeaderExtras(null);
    return () => setHeaderExtras(null);
  }, [setHeaderExtras]);

  // Shared styles for edit mode
  const labelStyle: CSSProperties = { color: palette.textPrimary, fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", marginBottom: "6px", display: "block" };
  const labelBoldStyle: CSSProperties = { ...labelStyle, fontWeight: 600 };
  const fieldDescStyle: CSSProperties = { color: palette.textTertiary, fontSize: "var(--text-xs)", fontFamily: "var(--font-family)", marginBottom: "6px", opacity: 0.7, lineHeight: 1.4 };
  const inputStyle: CSSProperties = { width: "100%", backgroundColor: palette.surfaceBg, border: `1px solid ${palette.borderMedium}`, borderRadius: "6px", color: palette.textPrimary, fontSize: "var(--text-base)", fontFamily: "var(--font-family)", padding: "10px 12px", outline: "none", colorScheme: isDark ? "dark" : "light" };
  const chevronColor = encodeURIComponent(isDark ? "#a1bdc6" : "#475467");
  const selectStyle: CSSProperties = { ...inputStyle, appearance: "none" as const, backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='${chevronColor}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "32px", cursor: "pointer" };
  const disabledInputStyle: CSSProperties = { ...selectStyle, backgroundColor: palette.surfaceSecondary, opacity: 0.5 };
  const primaryBtnStyle: CSSProperties = { padding: "10px 20px", borderRadius: "6px", border: "none", background: palette.primary, color: isDark ? "#0a0e0f" : "#101828", fontSize: "var(--text-base)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" };
  const secondaryBtnStyle: CSSProperties = { ...primaryBtnStyle, background: "transparent", border: `1px solid ${palette.borderMedium}`, color: palette.textTertiary };

  const currentSectionIndex = sections.indexOf(activeSection);
  const isLastSection = currentSectionIndex === sections.length - 1;
  const isFirstSection = currentSectionIndex === 0;
  const nextSectionName = isLastSection ? null : sections[currentSectionIndex + 1];
  const prevSectionName = isFirstSection ? null : sections[currentSectionIndex - 1];
  const goToNextSection = () => { if (nextSectionName) setActiveSection(nextSectionName); };
  const goToPrevSection = () => { if (prevSectionName) setActiveSection(prevSectionName); };

  const formatDisplayTime = (t: string) => {
    if (!t) return "—";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "pm" : "am";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
  };

  // Compact read-only styles
  const iconStyle: CSSProperties = { opacity: 0.45, flexShrink: 0 };
  const detailLabel: CSSProperties = { fontSize: "var(--text-xs)", fontFamily: "var(--font-family)", color: palette.textTertiary, fontWeight: 500, lineHeight: 1 };
  const detailValue: CSSProperties = { fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary, fontWeight: 500, lineHeight: 1.3 };

  const bookedPct = event.capacity > 0 ? (event.booked / event.capacity) * 100 : 0;
  const available = event.capacity - event.booked;
  // Pulled via getEventClients so the panel matches the hover popover's
  // balance scenario for this event (some events are all-paid, others
  // show the mixed roster).
  const bookedClients = getEventClients(event);

  // Pill backgrounds. Light-mode tints have been pushed brighter so the
  // status colour reads at a glance against the (also light)
  // `surfaceSecondary` list background. Amber needs slightly more
  // saturation than the cooler greens/blues to feel equally punchy.
  const statusColors: Record<string, { bg: string; text: string }> = {
    // Light-mode bg alphas were dropped from 0.38–0.45 down to 0.18–0.22 so
    // the pills sit lightly on the new lighter list background instead of
    // overpowering it. Light-mode text was retoned from muted earth shades
    // (#076a52 / #8a5e0a / #385f8c) to deeper jewel cousins of the dark-mode
    // values — same hue family as the brand's #00c4a0 / #ffb432 / #78a0c8,
    // just darkened enough to keep WCAG-acceptable contrast on the lighter
    // pill backgrounds. Dark mode is unchanged.
    Booked: { bg: isDark ? "rgba(0,196,160,0.15)" : "rgba(0,160,130,0.18)", text: isDark ? "#00c4a0" : "#00876c" },
    Waitlisted: { bg: isDark ? "rgba(255,180,50,0.15)" : "rgba(220,150,20,0.22)", text: isDark ? "#ffb432" : "#b07800" },
    Reserved: { bg: isDark ? "rgba(120,160,200,0.15)" : "rgba(80,120,170,0.18)", text: isDark ? "#78a0c8" : "#2d6cab" },
  };

  // Filter toggles for registered clients — two independent dimensions:
  // status (Booked/Reserved/Waitlisted) and payment (Paid/Owed). Each
  // dimension is "All" when none of its toggles are active. Selecting all
  // toggles in a dimension collapses back to "All" (cleared) so the user
  // doesn't end up in a redundant "every status" state.
  const [clientFilters, setClientFilters] = useState<Record<string, boolean>>({
    Booked: false, Reserved: false, Waitlisted: false,
  });
  const [paymentFilters, setPaymentFilters] = useState<Record<string, boolean>>({
    Paid: false, Owed: false,
  });
  const isStatusAllActive = !clientFilters.Booked && !clientFilters.Reserved && !clientFilters.Waitlisted;
  const isPaymentAllActive = !paymentFilters.Paid && !paymentFilters.Owed;
  const isAllActive = isStatusAllActive && isPaymentAllActive;
  const toggleFilter = (status: string) =>
    setClientFilters((prev) => {
      const next = { ...prev, [status]: !prev[status] };
      if (next.Booked && next.Reserved && next.Waitlisted) {
        return { Booked: false, Reserved: false, Waitlisted: false };
      }
      return next;
    });
  const togglePaymentFilter = (key: string) =>
    setPaymentFilters((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (next.Paid && next.Owed) {
        return { Paid: false, Owed: false };
      }
      return next;
    });
  const toggleAll = () => {
    setClientFilters({ Booked: false, Reserved: false, Waitlisted: false });
    setPaymentFilters({ Paid: false, Owed: false });
  };
  const filteredClients = bookedClients.filter((c) => {
    const statusOk = isStatusAllActive || clientFilters[c.status];
    const paymentOk = isPaymentAllActive || paymentFilters[c.paymentStatus];
    return statusOk && paymentOk;
  });

  // ─── Edit mode renders the full form (same as before) ───
  if (isEditing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
        {showCancelConfirm && (
          <CancelConfirmModal
            onConfirm={handleConfirmDiscard}
            onKeepEditing={() => setShowCancelConfirm(false)}
          />
        )}
        {/* Section navigation — priority tabs pinned to the top of the
            scrollable body. Negative margins bleed the bar across the
            body's 20px padding so it spans the full panel width and sits
            flush under the header divider; sticky keeps it available while
            scrolling long sections. Matches AddReservationPanelContent. */}
        <div
          style={{
            position: "sticky",
            top: -20,
            zIndex: 10,
            background: palette.surfacePrimary,
            margin: "-20px -20px 20px",
            padding: "0 10px",
            borderBottom: `1px solid ${palette.borderLight}`,
          }}
        >
          <SectionPriorityTabs
            sections={sections}
            activeSection={activeSection}
            onSelectSection={setActiveSection}
          />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* ── Availability + Editing indicator + Book action ── */}
        {event.capacity > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "8px", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${palette.borderLight}` }}>
            <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textTertiary, fontWeight: 500 }}>{available > 0 ? <><span style={{ fontWeight: 700, fontSize: "var(--text-base)", color: palette.primary }}>{available}</span> spot{available !== 1 ? "s" : ""} available</> : <span style={{ color: isDark ? "#ff6b6b" : "#d32f2f", fontWeight: 600 }}>Fully booked</span>}</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button onClick={handleCancelEditing} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 14px", borderRadius: "6px", border: `1px solid ${palette.primary}`, background: `${palette.primary}15`, color: palette.primary, fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" }}><Pencil size={13} /> Editing</button>
              {available > 0 ? (
                <button onClick={() => setActiveSection("Registration")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 16px", borderRadius: "6px", border: "none", background: palette.primary, color: isDark ? "#0a0e0f" : "#101828", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" }}><Plus size={13} /> Book</button>
              ) : event.waitlistEnabled ? (
                <button onClick={() => setActiveSection("Registration")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 16px", borderRadius: "6px", border: "none", background: isDark ? "rgba(255,180,50,0.2)" : "rgba(220,150,20,0.15)", color: isDark ? "#ffb432" : "#b07a10", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" }}><Plus size={13} /> Waitlist</button>
              ) : (
                // Full with waitlisting disabled — no way to add clients, so
                // show a non-interactive indicator instead of an action button.
                <span style={{ display: "inline-flex", alignItems: "center", padding: "8px 16px", borderRadius: "6px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: palette.textTertiary, fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "default" }}>Full</span>
              )}
            </div>
          </div>
        )}

        {/* Full edit form — same fields as AddReservationPanelContent */}
        <div><div style={labelBoldStyle}>Schedule type*</div><div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "4px" }}><label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}><input type="radio" name="detailScheduleType" checked={scheduleType === "session"} onChange={() => setScheduleType("session")} style={{ accentColor: palette.primary }} /> Session</label><label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}><input type="radio" name="detailScheduleType" checked={scheduleType === "rental"} onChange={() => setScheduleType("rental")} style={{ accentColor: palette.primary }} /> Rental</label></div></div>

        <div style={{ borderTop: `1px solid ${palette.borderLight}`, borderBottom: `1px solid ${palette.borderLight}`, padding: "20px 0", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div><div style={labelBoldStyle}>Resource(s)*</div><div style={{ ...labelStyle, color: palette.textTertiary, marginBottom: 0 }}>Select at least one.</div></div>
          <div><div style={labelStyle}>Venue(s)</div><SearchableMultiSelect options={VENUE_OPTIONS} selected={selectedVenues} onChange={setSelectedVenues} placeholder="—Select venue(s)—" palette={palette} /></div>
          <div><div style={labelStyle}>Instructor(s)</div><SearchableMultiSelect options={INSTRUCTOR_OPTIONS} selected={selectedInstructors} onChange={setSelectedInstructors} placeholder="—Select instructor(s)—" palette={palette} /></div>
        </div>

        <div><div style={labelBoldStyle}>Reservation type*</div><select style={selectStyle} value={reservationType} onChange={(e) => setReservationType(e.target.value)}><option value="" disabled>—Select reservation type—</option>{RESERVATION_TYPE_OPTIONS.map((rt) => <option key={rt} value={rt}>{rt}</option>)}</select></div>

        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "100px" }}><div style={labelStyle}>Pre-buffer</div><div style={fieldDescStyle}>Blocks transitional time prior to session</div><select style={useDefaultBuffer ? disabledInputStyle : selectStyle} disabled={useDefaultBuffer} value={preBuffer} onChange={(e) => setPreBuffer(e.target.value)}><option value="">None</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></div>
          <span style={{ fontSize: "var(--text-sm)", color: palette.textTertiary, paddingBottom: "10px", fontFamily: "var(--font-family)" }}>and/or</span>
          <div style={{ flex: 1, minWidth: "100px" }}><div style={labelStyle}>Post-buffer</div><div style={fieldDescStyle}>Blocks transitional time after session</div><select style={useDefaultBuffer ? disabledInputStyle : selectStyle} disabled={useDefaultBuffer} value={postBuffer} onChange={(e) => setPostBuffer(e.target.value)}><option value="">None</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></div>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", paddingBottom: "10px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}><input type="checkbox" checked={useDefaultBuffer} onChange={(e) => setUseDefaultBuffer(e.target.checked)} style={{ accentColor: palette.primary }} /> Use default</label>
        </div>

        <div><div style={labelBoldStyle}>Title*</div><input type="text" placeholder="Enter a title" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} /></div>
        <div><div style={labelStyle}>Class size</div><input type="text" placeholder="e.g. 1, 10, 30, etc." style={inputStyle} defaultValue={event.capacity > 0 ? String(event.capacity) : ""} /></div>
        {/* Allow waitlisting when full — when off, a full class shows a
            Full status with no way to add more clients; when on, a full
            class shows Waitlist status and clients can be waitlisted. */}
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
            <input type="checkbox" checked={allowWaitlisting} onChange={(e) => setAllowWaitlisting(e.target.checked)} style={{ accentColor: palette.primary }} />
            Allow waitlisting when full
          </label>
          {allowWaitlisting && (
            <div style={{ fontSize: "var(--text-xs)", color: palette.textSecondary, marginTop: "4px", paddingLeft: "20px" }}>
              A full class will show a Waitlist status, and clients can be added to the waitlist when booking.
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "12px" }}><div style={{ flex: 1 }}><div style={labelBoldStyle}>Start date*</div><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} /></div><div style={{ flex: 1 }}><div style={labelBoldStyle}>End date*</div><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} /></div></div>
        {/* Start time / End time — themed TimeField per STYLE_GUIDE ("Time fields"), matches AddReservationPanelContent */}
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}><div style={{ flex: 1 }}><div style={labelBoldStyle}>Start time*</div><TimeField value={startTime} onChange={setStartTime} sc={sc} isDark={isDark} disabled={allDay} ariaLabel="Start time" /></div><label style={{ display: "flex", alignItems: "center", gap: "6px", paddingBottom: "10px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} style={{ accentColor: palette.primary }} /> All day</label><div style={{ flex: 1 }}><div style={labelBoldStyle}>End time*</div><TimeField value={endTime} onChange={setEndTime} sc={sc} isDark={isDark} disabled={allDay} ariaLabel="End time" /></div></div>

        <div><div style={labelBoldStyle}>Recurring*</div><div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "4px" }}><label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}><input type="radio" name="detailRecurring" checked={recurring === "yes"} onChange={() => setRecurring("yes")} style={{ accentColor: palette.primary }} /> Yes</label><label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}><input type="radio" name="detailRecurring" checked={recurring === "no"} onChange={() => setRecurring("no")} style={{ accentColor: palette.primary }} /> No</label></div></div>
        <div style={{ opacity: 0.5 }}><div style={labelStyle}>Split session</div><select style={disabledInputStyle} disabled defaultValue=""><option value="" disabled>—Set the session length before selecting split increments—</option></select></div>
        <div><div style={labelStyle}>Notes</div><input type="text" placeholder="Enter notes" value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} /></div>
        {/* Additional options — bordered accordion container, closed by default.
            Uses a left-side ChevronRight that rotates 90° when open (the
            classic file-tree / disclosure pattern) so it can't be mistaken
            for a dropdown selector, which would have a static chevron-down
            on the right. */}
        <div
          style={{
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setShowAdditionalOptions((v) => !v)}
            aria-expanded={showAdditionalOptions}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "12px 14px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-family)",
              color: palette.textPrimary,
              textAlign: "left",
            }}
          >
            <ChevronRight
              size={16}
              style={{
                color: palette.textTertiary,
                flexShrink: 0,
                transform: showAdditionalOptions ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
            <span style={{ ...labelBoldStyle, marginBottom: 0, flex: 1 }}>Additional options</span>
          </button>
          {showAdditionalOptions && (
            <div
              style={{
                padding: "14px",
                borderTop: `1px solid ${palette.borderLight}`,
              }}
            >
              <div style={{ marginBottom: "12px" }}>
                <div style={labelStyle}>Online description</div>
                <input type="text" value={onlineDescription} onChange={(e) => setOnlineDescription(e.target.value)} placeholder="e.g. Yoga" style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
                  <input type="checkbox" checked={allowSelfBooking} onChange={(e) => setAllowSelfBooking(e.target.checked)} style={{ accentColor: palette.primary }} /> Allow self booking
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
                  <input type="checkbox" checked={allowFreeBookings} onChange={(e) => setAllowFreeBookings(e.target.checked)} style={{ accentColor: palette.primary }} /> Allow free bookings
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
                  <input type="checkbox" checked={showOnEZLeagues} onChange={(e) => setShowOnEZLeagues(e.target.checked)} style={{ accentColor: palette.primary }} /> Show on EZ Leagues
                </label>
              </div>
            </div>
          )}
        </div>
        <div><div style={{ ...labelBoldStyle, marginBottom: "2px" }}>Scheduled on</div><span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>02/26/2021</span></div>

        </div>
        <div style={{ position: "sticky", bottom: -20, background: palette.surfacePrimary, borderTop: `1px solid ${palette.borderLight}`, padding: "12px 0", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 5 }}>
          <button onClick={handleCancelEditing} style={secondaryBtnStyle}>Cancel</button>
          {/* Right-side group: Back ↔ Next pair the section navigation; Save &
              Close stays primary in the middle. Back uses secondary styling so
              the visual weight matches Cancel without sitting next to it —
              navigation actions live to the right, exit on the left. */}
          <div style={{ display: "flex", gap: "8px" }}>
            {!isFirstSection && <button onClick={goToPrevSection} style={{ ...secondaryBtnStyle, display: "inline-flex", alignItems: "center", gap: "6px" }}><ChevronLeft size={14} /> Back: {prevSectionName}</button>}
            <button style={primaryBtnStyle} onClick={() => setIsEditing(false)}>Save &amp; Close</button>
            {!isLastSection && <button onClick={goToNextSection} style={{ ...primaryBtnStyle, display: "inline-flex", alignItems: "center", gap: "6px" }}>Next: {nextSectionName} <ArrowRight size={14} /></button>}
          </div>
        </div>
      </div>
    );
  }

  // ─── Compact read-only view ───
  // Section switching lives in SectionPriorityTabs, a sticky tab row
  // pinned to the top of the panel body (same pattern as edit mode and
  // AddReservationPanelContent).
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <div
        style={{
          position: "sticky",
          top: -20,
          zIndex: 10,
          background: palette.surfacePrimary,
          margin: "-20px -20px 20px",
          padding: "0 10px",
          borderBottom: `1px solid ${palette.borderLight}`,
        }}
      >
        <SectionPriorityTabs
          sections={sections}
          activeSection={activeSection}
          onSelectSection={setActiveSection}
        />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── Availability + Edit Reservation + Book action ── */}
      {event.capacity > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "8px", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${palette.borderLight}` }}>
          <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textTertiary, fontWeight: 500 }}>{available > 0 ? <><span style={{ fontWeight: 700, fontSize: "var(--text-base)", color: palette.primary }}>{available}</span> spot{available !== 1 ? "s" : ""} available</> : <span style={{ color: isDark ? "#ff6b6b" : "#d32f2f", fontWeight: 600 }}>Fully booked</span>}</span>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={() => setIsEditing(true)} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 14px", borderRadius: "6px", border: `1px solid ${palette.borderMedium}`, background: "transparent", color: palette.textPrimary, fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer", whiteSpace: "nowrap" }}><Pencil size={13} /> Edit Reservation</button>
            {available > 0 ? (
              <button onClick={() => setActiveSection("Registration")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 16px", borderRadius: "6px", border: "none", background: palette.primary, color: isDark ? "#0a0e0f" : "#101828", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" }}><Plus size={13} /> Book</button>
            ) : event.waitlistEnabled ? (
              <button onClick={() => setActiveSection("Registration")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 16px", borderRadius: "6px", border: "none", background: isDark ? "rgba(255,180,50,0.2)" : "rgba(220,150,20,0.15)", color: isDark ? "#ffb432" : "#b07a10", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" }}><Plus size={13} /> Waitlist</button>
            ) : (
              // Full with waitlisting disabled — no way to add clients, so
              // show a non-interactive indicator instead of an action button.
              <span style={{ display: "inline-flex", alignItems: "center", padding: "8px 16px", borderRadius: "6px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: palette.textTertiary, fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "default" }}>Full</span>
            )}
          </div>
        </div>
      )}

      {/* ── League games — no edit / book affordances. Bar mirrors
          the availability bar's structure: contextual content on the
          left (Trophy icon + "Managed in EZLeagues" line so the user
          understands why the button leads elsewhere) and the action
          button on the right. */}
      {event.type === "league" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "10px 14px", borderRadius: "8px", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${palette.borderLight}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <Trophy size={16} style={{ color: palette.textTertiary, flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", color: palette.textPrimary, lineHeight: 1.2 }}>
                Managed in EZLeagues
              </span>
              <span style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-family)", color: palette.textTertiary, lineHeight: 1.3 }}>
                Roster, scoring, and standings
              </span>
            </div>
          </div>
          <button
            onClick={() => { /* Hook up to EZLeagues navigation when wired. */ }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "6px",
              border: `1px solid ${palette.borderMedium}`,
              background: "transparent",
              color: palette.textPrimary,
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              fontFamily: "var(--font-family)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Go to EZLeagues <ExternalLink size={13} />
          </button>
        </div>
      )}

      {/* ── Registered clients list ── */}
      {bookedClients.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
            <Users size={14} style={{ opacity: 0.5, color: palette.textTertiary }} />
            <span style={{ flex: 1, fontSize: "var(--text-xs)", fontWeight: 600, fontFamily: "var(--font-family)", color: palette.textTertiary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Registered Clients ({bookedClients.length})</span>
          </div>
          {/* Filter toggles — single wrap row across both filter axes
              (status + payment). flex-wrap lets pills flow to the next
              visual line if the panel is narrow, but they stay one
              contiguous group. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
            <button onClick={toggleAll} style={{ display: "flex", alignItems: "center", gap: "3px", padding: "2px 8px", borderRadius: "12px", border: `1px solid ${isAllActive ? palette.textPrimary : palette.borderMedium}`, background: isAllActive ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)") : "transparent", color: isAllActive ? palette.textPrimary : palette.textTertiary, fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer", opacity: isAllActive ? 1 : 0.5, transition: "all 0.15s ease", lineHeight: "16px" }}>
              All ({bookedClients.length})
            </button>
            {(["Booked", "Reserved", "Waitlisted"] as const).map((status) => {
              const sc = statusColors[status];
              const isActive = clientFilters[status];
              const count = bookedClients.filter((c) => c.status === status).length;
              return (
                <button key={status} onClick={() => toggleFilter(status)} style={{ display: "flex", alignItems: "center", gap: "3px", padding: "2px 8px", borderRadius: "12px", border: `1px solid ${isActive ? sc.text : palette.borderMedium}`, background: isActive ? sc.bg : "transparent", color: isActive ? sc.text : palette.textTertiary, fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer", opacity: isActive ? 1 : 0.5, transition: "all 0.15s ease", lineHeight: "16px" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: isActive ? sc.text : palette.textTertiary, flexShrink: 0 }} />
                  {status} ({count})
                </button>
              );
            })}
            {/* Payment-status pills — same shape, but Owed uses red and Paid
                a muted neutral so they're clearly a different filter axis. */}
            {(["Paid", "Owed"] as const).map((key) => {
              const isActive = paymentFilters[key];
              const count = bookedClients.filter((c) => c.paymentStatus === key).length;
              const accent = key === "Owed"
                ? { bg: isDark ? "rgba(224,90,90,0.15)" : "rgba(212,24,64,0.14)", text: isDark ? "#e05a5a" : "#a31030" }
                : { bg: isDark ? "rgba(161,189,198,0.12)" : "rgba(62,83,91,0.08)",  text: isDark ? "#a1bdc6" : "#3e535b" };
              // "Owed" maps to a friendlier "Overdue" in the UI; the
              // internal filter key + data model stay "Owed" so existing
              // logic and pill colors don't have to fan out.
              const label = key === "Owed" ? "Overdue" : key;
              return (
                <button key={key} onClick={() => togglePaymentFilter(key)} style={{ display: "flex", alignItems: "center", gap: "3px", padding: "2px 8px", borderRadius: "12px", border: `1px solid ${isActive ? accent.text : palette.borderMedium}`, background: isActive ? accent.bg : "transparent", color: isActive ? accent.text : palette.textTertiary, fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer", opacity: isActive ? 1 : 0.5, transition: "all 0.15s ease", lineHeight: "16px" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: isActive ? accent.text : palette.textTertiary, flexShrink: 0 }} />
                  {label} ({count})
                </button>
              );
            })}
          </div>
          <div className="always-show-scrollbar" style={{ maxHeight: "200px", border: `1px solid ${palette.borderLight}`, borderRadius: "8px", background: isDark ? "#1f292d" : "#f3f6f8" }}>
            {filteredClients.length === 0 ? (
              <div style={{ padding: "16px 12px", textAlign: "center", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textTertiary, opacity: 0.6 }}>No clients match the selected filters</div>
            ) : filteredClients.map((client, i) => {
              const sc = statusColors[client.status] || statusColors.Booked;
              const isOwed = client.paymentStatus === "Owed";
              const balanceColors = isOwed
                ? { bg: isDark ? "rgba(224,90,90,0.15)" : "rgba(212,24,64,0.14)", text: isDark ? "#e05a5a" : "#a31030" }
                : { bg: isDark ? "rgba(161,189,198,0.10)" : "rgba(62,83,91,0.06)",  text: isDark ? "#a1bdc6" : "#3e535b" };
              return (
                // 3-column grid: name | payment | status. Each pill is
                // left-aligned within its column (justifySelf:start) so the
                // payment column reads as a true middle column rather than
                // floating right next to the status pill on the right edge.
                <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 90px 100px", gap: "8px", alignItems: "center", padding: "8px 12px", borderBottom: i < filteredClients.length - 1 ? `1px solid ${palette.borderLight}` : "none" }}>
                  <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary, fontWeight: 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.name}</span>
                  <span style={{ justifySelf: "start", fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-family)", padding: "2px 8px", borderRadius: "10px", background: balanceColors.bg, color: balanceColors.text }}>
                    {isOwed ? `$${client.balance}` : "Paid"}
                  </span>
                  <span style={{ justifySelf: "start", fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-family)", padding: "2px 8px", borderRadius: "10px", background: sc.bg, color: sc.text }}>{client.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Separator ── */}
      <div style={{ height: "1px", background: palette.borderLight }} />

      {/* ── Compact detail rows (popover-style with icons) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <CalendarIcon size={18} style={iconStyle} />
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <span style={detailLabel}>Date</span>
            <span style={detailValue}>{startDate ? new Date(startDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Clock size={18} style={iconStyle} />
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <span style={detailLabel}>Time</span>
            <span style={detailValue}>{allDay ? "All day" : `${formatDisplayTime(startTime)} – ${formatDisplayTime(endTime)}`}</span>
          </div>
        </div>

        {/* Buffer — only renders when at least one of pre/post is set.
            Uses the same Hourglass icon and "15min pre · 30min post"
            format as the calendar's hover popover, so the two views
            stay visually consistent. */}
        {(preBuffer || postBuffer) && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Hourglass size={18} style={iconStyle} />
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              <span style={detailLabel}>Buffer</span>
              <span style={detailValue}>
                {[
                  preBuffer ? `${preBuffer}min pre` : null,
                  postBuffer ? `${postBuffer}min post` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <User size={18} style={iconStyle} />
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <span style={detailLabel}>Instructor</span>
            <span style={detailValue}>{selectedInstructors.length > 0 ? selectedInstructors.join(", ") : "—"}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <MapPin size={18} style={iconStyle} />
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <span style={detailLabel}>Venue</span>
            <span style={detailValue}>{selectedVenues.length > 0 ? selectedVenues.join(", ") : "—"}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Grid3x3 size={18} style={iconStyle} />
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <span style={detailLabel}>Type</span>
            <span style={detailValue}>{reservationType} · {scheduleType === "session" ? "Session" : "Rental"}</span>
          </div>
        </div>
      </div>

      {/* ── Additional compact details ── (buffer info moved up
          alongside Time; this grid keeps the recurring + class size
          pair). League games have neither a recurrence pattern nor a
          per-event class size, so the whole grid + its preceding
          separator are skipped for league events. */}
      {event.type !== "league" && (
        <>
          <div style={{ height: "1px", background: palette.borderLight }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 16px" }}>
            <div><span style={detailLabel}>Recurring</span><div style={{ ...detailValue, marginTop: "2px" }}>{recurring === "yes" ? "Yes" : "No"}</div></div>
            <div><span style={detailLabel}>Class size</span><div style={{ ...detailValue, marginTop: "2px" }}>{event.capacity > 0 ? event.capacity : "—"}</div></div>
          </div>
        </>
      )}

      {/* ── Notes ── */}
      {notes && (
        <>
          <div style={{ height: "1px", background: palette.borderLight }} />
          <div><span style={detailLabel}>Notes</span><div style={{ ...detailValue, marginTop: "4px" }}>{notes}</div></div>
        </>
      )}

      {/* ── Additional options & Scheduled on ── (Scheduled on sits
          below Additional options to match the order used in edit
          mode and Add Reservation). League games skip Additional
          options entirely — their booking rules are managed in
          EZLeagues, not here — so only Scheduled on shows for them. */}
      <div style={{ height: "1px", background: palette.borderLight }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {event.type !== "league" && (
          <div>
            <span style={detailLabel}>Additional options</span>
            <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {[
                onlineDescription ? `Online description: ${onlineDescription}` : null,
                allowSelfBooking ? "Allow self booking" : null,
                allowFreeBookings ? "Allow free bookings" : null,
                showOnEZLeagues ? "Show on EZ Leagues" : null,
              ]
                .filter((opt): opt is string => Boolean(opt))
                .map((opt) => (
                  <span key={opt} style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-family)", padding: "3px 8px", borderRadius: "4px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: palette.textTertiary }}>{opt}</span>
                ))}
            </div>
          </div>
        )}
        <div><span style={detailLabel}>Scheduled on</span><div style={{ ...detailValue, marginTop: "2px" }}>02/26/2021</div></div>
      </div>

      </div>
      {/* Footer — sticky bottom bar */}
      <div style={{ position: "sticky", bottom: -20, background: palette.surfacePrimary, borderTop: `1px solid ${palette.borderLight}`, padding: "12px 0", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 5 }}>
        <button onClick={closePanel} style={secondaryBtnStyle}>Close</button>
        {/* Right-side group: Back ↔ Next pair the section navigation. Back
            uses secondary styling but is physically separated from Close by
            the wide flex gap, so misclicks are unlikely. */}
        <div style={{ display: "flex", gap: "8px" }}>
          {!isFirstSection && <button onClick={goToPrevSection} style={{ ...secondaryBtnStyle, display: "inline-flex", alignItems: "center", gap: "6px" }}><ChevronLeft size={14} /> Back: {prevSectionName}</button>}
          {!isLastSection && <button onClick={goToNextSection} style={{ ...primaryBtnStyle, display: "inline-flex", alignItems: "center", gap: "6px" }}>Next: {nextSectionName} <ArrowRight size={14} /></button>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — AddReservationPanelContent
   Content rendered inside the shared SidePanel (via SidePanelContext).
   Follows the same pattern as PaymentPanel, SupportPanel, etc.
   ═══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — EZCoachChat
   Conversational alternative to the manual Add Reservation form. Lives
   inside the same side panel; entered via the "Try it with EZCoach"
   button next to Schedule type, exited via the "Switch back to manual"
   header link. As the guided conversation progresses it writes directly
   into the same form state the manual form uses, so switching back to
   manual shows everything EZCoach captured.
   ═══════════════════════════════════════════════════════════════════════ */

/** Gradient used for all EZCoach accents — violet→brand-teal reads as
 *  "AI feature" without leaving the product's color family. */
const EZCOACH_GRADIENT = "linear-gradient(135deg, #8B5CF6 0%, #00C4A0 100%)";
const EZCOACH_VIOLET = "#8B5CF6";

const EZCOACH_EXAMPLE =
  "Create a half hour HIIT session in Studio A with Jody March for July 30th at 3pm";

const EZCOACH_EXAMPLE_RENTAL =
  "Create a one hour Pilates rental on Court 1 for August 12th at 6pm";

const EZCOACH_MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

interface ParsedReservationRequest {
  scheduleType: "session" | "rental";
  reservationType: string;
  venue: string;
  instructor: string | null;
  dateISO: string;   // "YYYY-MM-DD"
  startHM: string;   // 24h "HH:MM"
  endHM: string;     // 24h "HH:MM"
}

/** "15:30" → "3:30 PM" */
function formatHMLabel(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** "2026-07-30" → "Thursday, July 30" */
function formatDateISOLabel(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/** Light NL parsing for the demo — matches venues / instructors /
 *  reservation types against the same option lists the manual form uses,
 *  plus a date ("July 30th"), a start time ("3pm", "3:30 pm"), and a
 *  duration ("half hour", "45 minutes", "2 hours"; defaults to 1 hour). */
function parseReservationRequest(msg: string): ParsedReservationRequest | null {
  const lower = msg.toLowerCase();

  const venue =
    VENUE_OPTIONS.find((v) => lower.includes(v.toLowerCase())) ?? null;
  const reservationType =
    RESERVATION_TYPE_OPTIONS.find((t) => lower.includes(t.toLowerCase())) ?? null;
  const instructor =
    INSTRUCTOR_OPTIONS.find((i) => lower.includes(i.toLowerCase())) ?? null;

  // Date — "July 30th", "july 30". Assumes current year; rolls to next
  // year if that date has already passed.
  let dateISO: string | null = null;
  const dateMatch = lower.match(new RegExp(`(${EZCOACH_MONTH_NAMES.join("|")})\\s+(\\d{1,2})`));
  if (dateMatch) {
    const month = EZCOACH_MONTH_NAMES.indexOf(dateMatch[1]);
    const day = parseInt(dateMatch[2], 10);
    const now = new Date();
    let year = now.getFullYear();
    if (new Date(year, month, day) < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      year += 1;
    }
    dateISO = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Start time — "3pm", "3:30 pm"
  let startMins: number | null = null;
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10) % 12;
    if (timeMatch[3] === "pm") h += 12;
    startMins = h * 60 + (timeMatch[2] ? parseInt(timeMatch[2], 10) : 0);
  }

  // Duration — defaults to an hour
  let duration = 60;
  if (/half\s+(an\s+)?hour/.test(lower)) {
    duration = 30;
  } else {
    const minMatch = lower.match(/(\d+)\s*min/);
    const hourMatch = lower.match(/(\d+(?:\.\d+)?)[\s-]*hour/);
    if (minMatch) duration = parseInt(minMatch[1], 10);
    else if (hourMatch) duration = Math.round(parseFloat(hourMatch[1]) * 60);
  }

  if (!venue || !reservationType || !dateISO || startMins === null) return null;

  const toHM = (mins: number) =>
    `${String(Math.floor((mins % 1440) / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

  return {
    scheduleType: /\brental\b/.test(lower) ? "rental" : "session",
    reservationType,
    venue,
    instructor,
    dateISO,
    startHM: toHM(startMins),
    endHM: toHM(startMins + duration),
  };
}

/** A schedule match found by EZCoach's edit lookup. `day` is the mock
 *  data's day-of-month key (events render in whichever month is shown). */
interface CoachSearchResult {
  day: number;
  event: CalendarEvent;
}

/** Searches MOCK_EVENTS with whatever criteria the message contains —
 *  activity type, venue, instructor, day of month, and/or start time.
 *  Every criterion found must match (AND), so more detail narrows the
 *  results. `criteria` lets the caller distinguish "nothing to search on"
 *  from "searched and found nothing". */
function searchMockEvents(msg: string): { criteria: number; results: CoachSearchResult[] } {
  const lower = msg.toLowerCase();

  const type =
    (["yoga", "meditation", "pilates", "hiit", "league"] as ReservationType[])
      .find((t) => lower.includes(t)) ?? null;
  const venue = VENUE_OPTIONS.find((v) => lower.includes(v.toLowerCase())) ?? null;
  const instructor = INSTRUCTOR_OPTIONS.find((i) => lower.includes(i.toLowerCase())) ?? null;

  // Day of month — "July 10th" or a bare ordinal like "the 10th"
  let day: number | null = null;
  const monthDay = lower.match(new RegExp(`(?:${EZCOACH_MONTH_NAMES.join("|")})\\s+(\\d{1,2})`));
  const bareDay = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)\b/);
  if (monthDay) day = parseInt(monthDay[1], 10);
  else if (bareDay) day = parseInt(bareDay[1], 10);

  // Start time — "2pm", "2:00 pm"
  let mins: number | null = null;
  const tm = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (tm) {
    let h = parseInt(tm[1], 10) % 12;
    if (tm[3] === "pm") h += 12;
    mins = h * 60 + (tm[2] ? parseInt(tm[2], 10) : 0);
  }

  const criteria = [type, venue, instructor, day, mins].filter((c) => c !== null).length;
  if (criteria === 0) return { criteria, results: [] };

  const days = day !== null ? [day] : Object.keys(MOCK_EVENTS).map(Number);
  const results: CoachSearchResult[] = [];
  for (const d of days) {
    for (const ev of MOCK_EVENTS[d] ?? []) {
      if (type && ev.type !== type) continue;
      if (venue && ev.venue !== venue) continue;
      if (instructor && ev.instructor !== instructor) continue;
      if (mins !== null && parseEventTimeToMinutes(ev.time) !== mins) continue;
      results.push({ day: d, event: ev });
    }
  }
  return { criteria, results };
}

type CoachStep = "request" | "editLookup" | "title" | "recurring" | "classSize" | "buffers" | "done" | "created";

/** Top-level things EZCoach can do — offered when a first message doesn't
 *  match any action it understands. */
type CoachIntent = "create-session" | "edit-session" | "create-rental" | "edit-rental";

const COACH_INTENT_OPTIONS: { label: string; intent: CoachIntent }[] = [
  { label: "Create a Session", intent: "create-session" },
  { label: "Edit a Session", intent: "edit-session" },
  { label: "Create a Rental", intent: "create-rental" },
  { label: "Edit a Rental", intent: "edit-rental" },
];

interface CoachMessage {
  id: string;
  sender: "user" | "coach";
  text: string;
  /** Copyable example — rendered as a one-click "insert into message field" chip. */
  hint?: string;
  /** One-click reply chips (active only on the latest coach message). */
  quickReplies?: string[];
  /** Terminal action buttons (create / review in manual form). */
  actions?: { label: string; kind: "create" | "manual" }[];
  /** Intent picker buttons — shown when a request couldn't be matched. */
  intents?: { label: string; intent: CoachIntent }[];
  /** Schedule matches from an edit lookup — rendered as cards with an
   *  Edit button that opens the reservation in the details panel. */
  results?: CoachSearchResult[];
}

interface EZCoachChatProps {
  palette: ThemePalette;
  isDark: boolean;
  onApplyScheduleType: (t: "session" | "rental") => void;
  onApplyRequest: (r: ParsedReservationRequest) => void;
  onApplyTitle: (title: string) => void;
  onApplyRecurring: (yes: boolean) => void;
  onApplyClassSize: (size: string | null) => void;
  onApplyBuffers: (useDefault: boolean) => void;
  onSwitchToManual: () => void;
  onCreate: () => void;
  /** Opens a found reservation in the details (edit) panel. */
  onOpenEvent: (event: CalendarEvent) => void;
}

function EZCoachChat({
  palette, isDark,
  onApplyScheduleType, onApplyRequest, onApplyTitle, onApplyRecurring, onApplyClassSize, onApplyBuffers,
  onSwitchToManual, onCreate, onOpenEvent,
}: EZCoachChatProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: "intro",
      sender: "coach",
      text: "Hi, I'm EZCoach. Describe the reservation you'd like to create in one sentence — include the activity, venue, date, and time — and I'll fill out the form for you, then walk you through the rest.",
      hint: EZCOACH_EXAMPLE,
    },
  ]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState<CoachStep>("request");
  const [isTyping, setIsTyping] = useState(false);
  const capturedRef = useRef<{
    req?: ParsedReservationRequest;
    title?: string;
    recurring?: boolean;
    classSize?: string | null;
    useDefaultBuffer?: boolean;
  }>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  /** Set when the user picks an action from the intent menu — a chosen
   *  create intent forces the schedule type and changes the fallback
   *  copy from "no matching action" to a gentler field re-prompt. */
  const intentRef = useRef<CoachIntent | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const pushCoach = (msg: Omit<CoachMessage, "id" | "sender">) => {
    setMessages((prev) => [...prev, { id: `c-${Date.now()}`, sender: "coach", ...msg }]);
  };

  /** Scripted responder — mirrors the required fields of the manual form. */
  const respond = (text: string, atStep: CoachStep) => {
    const captured = capturedRef.current;

    switch (atStep) {
      case "request": {
        const parsed = parseReservationRequest(text);
        if (!parsed) {
          const createIntent = intentRef.current === "create-session" || intentRef.current === "create-rental";
          if (createIntent) {
            // The user already told us what they want to do — just re-prompt
            // for the missing details.
            pushCoach({
              text: "I couldn't catch everything I need. Make sure your message includes the activity (e.g. HIIT, Yoga), a venue, a date, and a start time — or start from the example below.",
              hint: intentRef.current === "create-rental" ? EZCOACH_EXAMPLE_RENTAL : EZCOACH_EXAMPLE,
            });
          } else {
            // First unrecognized message — offer the actions EZCoach knows.
            pushCoach({
              text: "Hmm — I couldn't find a matching action for that request. Here's what I can help with:",
              intents: COACH_INTENT_OPTIONS,
            });
          }
          return;
        }
        // A create intent chosen from the menu overrides whatever the
        // sentence implied (e.g. "Create a Rental" + a message that never
        // says "rental").
        if (intentRef.current === "create-session") parsed.scheduleType = "session";
        if (intentRef.current === "create-rental") parsed.scheduleType = "rental";
        captured.req = parsed;
        onApplyRequest(parsed);
        const lines = [
          `Schedule type: ${parsed.scheduleType === "session" ? "Session" : "Rental"}`,
          `Reservation type: ${parsed.reservationType}`,
          `Venue: ${parsed.venue}`,
          ...(parsed.instructor ? [`Instructor: ${parsed.instructor}`] : []),
          `Date: ${formatDateISOLabel(parsed.dateISO)}`,
          `Time: ${formatHMLabel(parsed.startHM)}–${formatHMLabel(parsed.endHM)}`,
        ];
        pushCoach({
          text: `Here's what I captured:\n\n${lines.map((l) => `•  ${l}`).join("\n")}\n\nI've filled those into the form. Next — what should this session be called? That's the title clients will see on the schedule (e.g. "Afternoon HIIT Blast").`,
        });
        setStep("title");
        return;
      }

      case "editLookup": {
        const kind = intentRef.current === "edit-rental" ? "rental" : "session";
        const { criteria, results } = searchMockEvents(text);

        if (results.length > 0) {
          const shown = results.slice(0, 3);
          pushCoach({
            text:
              results.length === 1
                ? "Found it — is this the one you're looking for?"
                : `I found ${results.length} matches on the schedule${results.length > 3 ? " — here are the first 3. Add more detail (like the instructor or venue) to narrow it down" : ""}. Is one of these it?`,
            results: shown,
          });
          // Stay in editLookup so the user can refine if it's not right.
          return;
        }

        if (criteria === 0) {
          pushCoach({
            text: `I need a bit more to go on. Tell me anything you remember about the ${kind} — the activity, instructor, venue, date, or time.`,
          });
          return;
        }

        pushCoach({
          text: `I searched the schedule but couldn't find a ${kind} matching that description. Try adding more detail — the exact title, instructor, or date helps most — or create a new ${kind} instead.`,
          intents: [
            kind === "rental"
              ? { label: "Create a Rental", intent: "create-rental" }
              : { label: "Create a Session", intent: "create-session" },
          ],
        });
        return;
      }

      case "title": {
        const title = text.trim().replace(/^["']+|["']+$/g, "");
        captured.title = title;
        onApplyTitle(title);
        pushCoach({
          text: `"${title}" — done. Should this session repeat? Recurring reservations are created weekly at the same time.`,
          quickReplies: ["Yes, weekly", "No, just once"],
        });
        setStep("recurring");
        return;
      }

      case "recurring": {
        const yes = /yes|weekly|repeat/i.test(text) && !/\bno\b|once|one[\s-]?time/i.test(text);
        captured.recurring = yes;
        onApplyRecurring(yes);
        pushCoach({
          text: `${yes ? "Set to repeat weekly." : "Set as a one-time session."} How many clients can book in? Give me a number, or say "skip" to leave the class size open.`,
        });
        setStep("classSize");
        return;
      }

      case "classSize": {
        const numMatch = text.match(/\d+/);
        const size = /skip|open|none/i.test(text) || !numMatch ? null : numMatch[0];
        captured.classSize = size;
        onApplyClassSize(size);
        pushCoach({
          text: `${size ? `Class size set to ${size}.` : "Leaving class size open."} Last question — keep the default 15-minute pre/post buffers? Buffers block transitional time around the session.`,
          quickReplies: ["Keep defaults", "I'll customize later"],
        });
        setStep("buffers");
        return;
      }

      case "buffers": {
        const keep = !/custom|later|\bno\b/i.test(text);
        captured.useDefaultBuffer = keep;
        onApplyBuffers(keep);
        const req = captured.req;
        const summaryLines = req
          ? [
              `${captured.title ?? "Untitled"} — ${req.reservationType} ${req.scheduleType}`,
              `${req.venue}${req.instructor ? ` with ${req.instructor}` : ""}`,
              `${formatDateISOLabel(req.dateISO)}, ${formatHMLabel(req.startHM)}–${formatHMLabel(req.endHM)}`,
              `${captured.recurring ? "Repeats weekly" : "One time"} · Class size ${captured.classSize ?? "open"} · ${keep ? "Default buffers" : "Custom buffers"}`,
            ]
          : [];
        pushCoach({
          text: `That's everything — here's your reservation:\n\n${summaryLines.map((l) => `•  ${l}`).join("\n")}\n\nCreate it now, or review it in the manual form first — everything is already filled in.`,
          actions: [
            { label: "Create reservation", kind: "create" },
            { label: "Review in manual form", kind: "manual" },
          ],
        });
        setStep("done");
        return;
      }

      case "done": {
        pushCoach({
          text: "You're all set — use the buttons above to create the reservation, or the \"Switch back to manual\" link at the top to review the form.",
        });
        return;
      }

      case "created":
        return;
    }
  };

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || isTyping || step === "created") return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: "user", text }]);
    setInput("");
    setIsTyping(true);
    const atStep = step;
    setTimeout(() => {
      setIsTyping(false);
      respond(text, atStep);
    }, 700);
  };

  /** Intent menu click — echoes the choice as a user message, then routes:
   *  create intents restart the guided request flow with the schedule type
   *  locked in; edit intents ask for details to find the reservation. */
  const handleIntent = (intent: CoachIntent, label: string) => {
    if (isTyping) return;
    intentRef.current = intent;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: "user", text: label }]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      if (intent === "create-session" || intent === "create-rental") {
        const kind = intent === "create-rental" ? "rental" : "session";
        onApplyScheduleType(kind);
        pushCoach({
          text: `Let's create a ${kind}. Describe it in one sentence — include the activity, venue, date, and time${kind === "session" ? ", plus an instructor if you'd like" : ""}.`,
          hint: kind === "rental" ? EZCOACH_EXAMPLE_RENTAL : EZCOACH_EXAMPLE,
        });
        setStep("request");
      } else {
        const kind = intent === "edit-rental" ? "rental" : "session";
        pushCoach({
          text: `Sure — which ${kind} are you looking for? Tell me anything you remember about it: the title, instructor, venue, or date and time, and I'll track it down.`,
        });
        setStep("editLookup");
      }
    }, 700);
  };

  const handleAction = (kind: "create" | "manual") => {
    if (kind === "manual") {
      onSwitchToManual();
      return;
    }
    setStep("created");
    pushCoach({ text: "Reservation created — you'll see it on the schedule. Closing this panel…" });
    setTimeout(onCreate, 1200);
  };

  const lastMessage = messages[messages.length - 1];

  const bubbleBase: CSSProperties = {
    maxWidth: "85%",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "var(--text-base)",
    lineHeight: 1.55,
    fontFamily: "var(--font-family)",
    whiteSpace: "pre-line",
  };

  const chipStyle: CSSProperties = {
    padding: "10px 16px",
    borderRadius: "18px",
    border: `1px solid ${EZCOACH_VIOLET}`,
    background: "transparent",
    color: palette.textPrimary,
    fontSize: "var(--text-base)",
    fontFamily: "var(--font-family)",
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Blinking-dots animation for the typing indicator */}
      <style>{`@keyframes ezcoachBlink { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 1; } }`}</style>

      {/* ── Messages ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.sender === "user" ? "flex-end" : "flex-start" }}>
            <div
              style={{
                ...bubbleBase,
                background: msg.sender === "user" ? palette.primary : palette.hoverBg,
                color: msg.sender === "user" ? (isDark ? "#0a0e0f" : "#101828") : palette.textPrimary,
              }}
            >
              {msg.sender === "coach" && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                  <Sparkles size={14} style={{ color: EZCOACH_VIOLET }} />
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: 700,
                      background: EZCOACH_GRADIENT,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    EZCoach
                  </span>
                </div>
              )}
              {msg.text}
            </div>

            {/* Copyable example — one click inserts it into the message field */}
            {msg.hint && (
              <button
                type="button"
                onClick={() => {
                  setInput(msg.hint!);
                  inputRef.current?.focus();
                }}
                title="Click to add to the message field"
                style={{
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  textAlign: "left",
                  maxWidth: "85%",
                  padding: "12px 14px",
                  background: palette.surfaceBg,
                  border: `1px dashed ${EZCOACH_VIOLET}`,
                  borderRadius: "10px",
                  color: palette.textPrimary,
                  fontSize: "var(--text-base)",
                  fontFamily: "var(--font-family)",
                  lineHeight: 1.55,
                  cursor: "pointer",
                }}
              >
                <Copy size={15} style={{ color: EZCOACH_VIOLET, flexShrink: 0, marginTop: "4px" }} />
                <span><em>"{msg.hint}"</em></span>
              </button>
            )}

            {/* Quick replies — only on the latest coach message */}
            {msg.quickReplies && msg === lastMessage && !isTyping && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                {msg.quickReplies.map((qr) => (
                  <button key={qr} type="button" onClick={() => send(qr)} style={chipStyle}>
                    {qr}
                  </button>
                ))}
              </div>
            )}

            {/* Intent picker — offered when a request couldn't be matched */}
            {msg.intents && msg === lastMessage && !isTyping && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px", maxWidth: "85%" }}>
                {msg.intents.map((opt) => (
                  <button
                    key={opt.intent}
                    type="button"
                    onClick={() => handleIntent(opt.intent, opt.label)}
                    style={chipStyle}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Edit-lookup results — reservation cards with an Edit button
                that opens the match in the details panel. Kept clickable
                even after the conversation moves on. */}
            {msg.results && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px", width: "85%" }}>
                {msg.results.map(({ day, event }) => (
                  <div
                    key={event.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 14px",
                      background: palette.surfaceBg,
                      border: `1px solid ${palette.borderMedium}`,
                      borderRadius: "10px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "var(--text-base)", fontWeight: 600, color: palette.textPrimary, fontFamily: "var(--font-family)" }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: "var(--text-sm)", color: palette.textTertiary, fontFamily: "var(--font-family)", marginTop: "2px" }}>
                        {new Date().toLocaleString("en-US", { month: "long" })} {day} · {event.time} · {event.venue}
                        {event.instructor && event.instructor !== "—" ? ` with ${event.instructor}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenEvent(event)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 16px",
                        border: "none",
                        borderRadius: "999px",
                        background: EZCOACH_GRADIENT,
                        color: "#ffffff",
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        fontFamily: "var(--font-family)",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Terminal actions */}
            {msg.actions && msg === lastMessage && !isTyping && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                {msg.actions.map((a) => (
                  <button
                    key={a.kind}
                    type="button"
                    onClick={() => handleAction(a.kind)}
                    style={
                      a.kind === "create"
                        ? {
                            ...chipStyle,
                            border: "none",
                            background: EZCOACH_GRADIENT,
                            color: "#ffffff",
                            fontWeight: 600,
                          }
                        : chipStyle
                    }
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div style={{ ...bubbleBase, background: palette.hoverBg, color: palette.textTertiary, display: "flex", gap: "4px", alignItems: "center" }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: palette.textTertiary,
                  animation: `ezcoachBlink 1.2s ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* ── Message input — sticky bottom, mirrors the manual footer ── */}
      <div
        style={{
          position: "sticky",
          bottom: -20,
          background: palette.surfacePrimary,
          borderTop: `1px solid ${palette.borderLight}`,
          padding: "12px 0",
          marginTop: "16px",
          display: "flex",
          alignItems: "flex-end",
          gap: "8px",
          zIndex: 5,
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Describe your reservation…"
          rows={2}
          aria-label="Message EZCoach"
          style={{
            flex: 1,
            padding: "12px 14px",
            background: palette.surfaceBg,
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "8px",
            color: palette.textPrimary,
            fontSize: "var(--text-base)",
            fontFamily: "var(--font-family)",
            resize: "none",
            outline: "none",
            lineHeight: 1.45,
          }}
        />
        <button
          type="button"
          onClick={() => send()}
          disabled={!input.trim() || isTyping}
          aria-label="Send message"
          style={{
            width: "44px",
            height: "44px",
            border: "none",
            borderRadius: "8px",
            background: input.trim() && !isTyping ? EZCOACH_GRADIENT : palette.hoverBg,
            color: input.trim() && !isTyping ? "#ffffff" : palette.textTertiary,
            cursor: input.trim() && !isTyping ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

function AddReservationPanelContent() {
  const { palette, mode } = useTheme();
  const isDark = mode === "dark";
  const { openPanel, closePanel, setHeaderExtras } = useSidePanel();

  const [activeSection, setActiveSection] = useState("Details");
  const sc = semanticColors(palette, isDark);

  // EZCoach — conversational alternative to the manual form. While active,
  // the panel body swaps to a guided chat that writes into the same form
  // state, so "Switch back to manual" shows everything captured so far.
  const [aiMode, setAiMode] = useState(false);

  // Initial / "pristine" values — used to detect unsaved changes when the
  // user clicks Cancel. Anything that diverges from these is treated as a
  // change worth confirming away.
  const initScheduleType: "session" | "rental" = "session";
  const initRecurring: "yes" | "no" = "no";
  const initVenues: string[] = [];
  const initInstructors: string[] = [];
  const initReservationType = "";
  const initTitle = "";
  const initClassSize = "";
  const initAllowWaitlisting = false;
  const initNotes = "";
  const initStartDate = "";
  const initEndDate = "";
  const initStartTime = "";
  const initEndTime = "";
  const initAllDay = false;
  const initUseDefaultBuffer = true;
  const initPreBuffer = "15";
  const initPostBuffer = "15";
  const initOnlineDescription = "";
  const initAllowSelfBooking = true;
  const initAllowFreeBookings = false;
  const initShowOnEZLeagues = false;

  const [scheduleType, setScheduleType] = useState<"session" | "rental">(initScheduleType);
  const [recurring, setRecurring] = useState<"yes" | "no">(initRecurring);
  const [selectedVenues, setSelectedVenues] = useState<string[]>(initVenues);
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>(initInstructors);
  const [reservationType, setReservationType] = useState(initReservationType);
  const [title, setTitle] = useState(initTitle);
  const [startDate, setStartDate] = useState(initStartDate);
  const [endDate, setEndDate] = useState(initEndDate);
  const [startTime, setStartTime] = useState(initStartTime);
  const [endTime, setEndTime] = useState(initEndTime);
  const [allDay, setAllDay] = useState(initAllDay);
  const [useDefaultBuffer, setUseDefaultBuffer] = useState(initUseDefaultBuffer);
  const [preBuffer, setPreBuffer] = useState(initPreBuffer);
  const [postBuffer, setPostBuffer] = useState(initPostBuffer);
  const [classSize, setClassSize] = useState(initClassSize);
  const [allowWaitlisting, setAllowWaitlisting] = useState(initAllowWaitlisting);
  const [notes, setNotes] = useState(initNotes);
  // Additional options (editable on new reservation) — accordion closed by default
  const [onlineDescription, setOnlineDescription] = useState(initOnlineDescription);
  const [allowSelfBooking, setAllowSelfBooking] = useState(initAllowSelfBooking);
  const [allowFreeBookings, setAllowFreeBookings] = useState(initAllowFreeBookings);
  const [showOnEZLeagues, setShowOnEZLeagues] = useState(initShowOnEZLeagues);
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);

  // Cancel-confirmation gate: only show the modal when something diverges
  // from the pristine state (otherwise just close the panel immediately).
  // Activesection/showAdditionalOptions are UI-only and intentionally
  // excluded from this comparison.
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const hasChanges =
    scheduleType !== initScheduleType ||
    recurring !== initRecurring ||
    JSON.stringify(selectedVenues) !== JSON.stringify(initVenues) ||
    JSON.stringify(selectedInstructors) !== JSON.stringify(initInstructors) ||
    reservationType !== initReservationType ||
    title !== initTitle ||
    startDate !== initStartDate ||
    endDate !== initEndDate ||
    startTime !== initStartTime ||
    endTime !== initEndTime ||
    allDay !== initAllDay ||
    useDefaultBuffer !== initUseDefaultBuffer ||
    preBuffer !== initPreBuffer ||
    postBuffer !== initPostBuffer ||
    onlineDescription !== initOnlineDescription ||
    allowSelfBooking !== initAllowSelfBooking ||
    allowFreeBookings !== initAllowFreeBookings ||
    showOnEZLeagues !== initShowOnEZLeagues ||
    classSize !== initClassSize ||
    allowWaitlisting !== initAllowWaitlisting ||
    notes !== initNotes;

  const handleCancelClick = () => {
    if (hasChanges) {
      setShowCancelConfirm(true);
    } else {
      closePanel();
    }
  };

  const handleConfirmDiscard = () => {
    setShowCancelConfirm(false);
    closePanel();
  };

  const sections = ["Details", "Registration", "Registered Clients", "Linked", "History"];

  // Register header extras: the "Switch back to manual" escape hatch
  // (upper right) while EZCoach is active. `marginLeft: auto` pushes the
  // link to the right edge of the header's title group, next to the close
  // button. In manual mode the header carries nothing — section switching
  // moved from the header chevron dropdown to SectionPriorityTabs, a
  // sticky tab row at the top of the panel body.
  useEffect(() => {
    if (aiMode) {
      setHeaderExtras(
        <button
          type="button"
          onClick={() => setAiMode(false)}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            padding: 0,
            color: palette.primary,
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-family)",
            fontWeight: 600,
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Switch back to manual
        </button>
      );
    } else {
      setHeaderExtras(null);
    }
    return () => setHeaderExtras(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiMode, palette, setHeaderExtras]);

  const labelStyle: CSSProperties = {
    color: palette.textPrimary,
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-family)",
    marginBottom: "6px",
    display: "block",
  };

  const labelBoldStyle: CSSProperties = {
    ...labelStyle,
    color: palette.textPrimary,
    fontWeight: 600,
  };

  /* Field description — subtler than labels, used for helper text beneath labels */
  const fieldDescStyle: CSSProperties = {
    color: palette.textTertiary,
    fontSize: "var(--text-xs)",
    fontFamily: "var(--font-family)",
    marginBottom: "6px",
    opacity: 0.7,
    lineHeight: 1.4,
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    backgroundColor: palette.surfaceBg,
    border: `1px solid ${palette.borderMedium}`,
    borderRadius: "6px",
    color: palette.textPrimary,
    fontSize: "var(--text-base)",
    fontFamily: "var(--font-family)",
    padding: "10px 12px",
    outline: "none",
    colorScheme: isDark ? "dark" : "light",
  };

  const chevronColor = encodeURIComponent(isDark ? "#a1bdc6" : "#475467");
  const selectStyle: CSSProperties = {
    ...inputStyle,
    appearance: "none" as const,
    backgroundImage:
      `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='${chevronColor}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: "32px",
    cursor: "pointer",
  };

  const disabledInputStyle: CSSProperties = {
    ...selectStyle,
    backgroundColor: palette.surfaceSecondary,
    opacity: 0.5,
  };

  const sectionHeadingStyle: CSSProperties = {
    color: palette.textPrimary,
    fontSize: "var(--text-base)",
    fontWeight: 600,
    fontFamily: "var(--font-family)",
    marginBottom: "12px",
  };

  const primaryBtnStyle: CSSProperties = {
    padding: "10px 20px",
    borderRadius: "6px",
    border: "none",
    background: palette.primary,
    color: isDark ? "#0a0e0f" : "#101828",
    fontSize: "var(--text-base)",
    fontWeight: 600,
    fontFamily: "var(--font-family)",
    cursor: "pointer",
  };

  const secondaryBtnStyle: CSSProperties = {
    ...primaryBtnStyle,
    background: "transparent",
    border: `1px solid ${palette.borderMedium}`,
    color: palette.textTertiary,
  };

  /* ── Form validation ── */
  const isFormValid =
    selectedVenues.length > 0 &&
    reservationType !== "" &&
    title.trim() !== "" &&
    startDate !== "" &&
    endDate !== "" &&
    (allDay || (startTime !== "" && endTime !== ""));

  const currentSectionIndex = sections.indexOf(activeSection);
  const isLastSection = currentSectionIndex === sections.length - 1;
  const nextSectionName = isLastSection ? null : sections[currentSectionIndex + 1];

  const goToNextSection = () => {
    if (nextSectionName) setActiveSection(nextSectionName);
  };

  const disabledPrimaryBtnStyle: CSSProperties = {
    ...primaryBtnStyle,
    opacity: 0.45,
    cursor: "not-allowed",
  };

  // ── EZCoach mode — swap the whole panel body for the guided chat. The
  // chat writes into this component's form state via the handlers below,
  // so "Switch back to manual" reveals a pre-filled form.
  if (aiMode) {
    return (
      <EZCoachChat
        palette={palette}
        isDark={isDark}
        onApplyScheduleType={setScheduleType}
        onApplyRequest={(r) => {
          setScheduleType(r.scheduleType);
          setSelectedVenues([r.venue]);
          if (r.instructor) setSelectedInstructors([r.instructor]);
          setReservationType(r.reservationType);
          setStartDate(r.dateISO);
          setEndDate(r.dateISO);
          setStartTime(r.startHM);
          setEndTime(r.endHM);
        }}
        onApplyTitle={setTitle}
        onApplyRecurring={(yes) => setRecurring(yes ? "yes" : "no")}
        onApplyClassSize={(size) => setClassSize(size ?? "")}
        onApplyBuffers={setUseDefaultBuffer}
        onSwitchToManual={() => setAiMode(false)}
        onCreate={closePanel}
        onOpenEvent={(event) =>
          // EZCoach's edit-lookup already carries edit intent (the user
          // asked to edit this reservation), so open straight into edit
          // mode instead of the read-only view.
          openPanel(
            <ReservationDetailsPanelContent key={event.id} event={event} initialEditing />,
            { size: "third", title: `Reservation Details: ${event.title}` }
          )
        }
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {showCancelConfirm && (
        <CancelConfirmModal
          onConfirm={handleConfirmDiscard}
          onKeepEditing={() => setShowCancelConfirm(false)}
        />
      )}
      {/* Section navigation — priority tabs pinned to the top of the
          scrollable body. Negative margins bleed the bar across the
          body's 20px padding so it spans the full panel width and sits
          flush under the header divider; sticky keeps it available while
          scrolling long sections. */}
      <div
        style={{
          position: "sticky",
          top: -20,
          zIndex: 10,
          background: palette.surfacePrimary,
          margin: "-20px -20px 20px",
          padding: "0 10px",
          borderBottom: `1px solid ${palette.borderLight}`,
        }}
      >
        <SectionPriorityTabs
          sections={sections}
          activeSection={activeSection}
          onSelectSection={setActiveSection}
        />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Schedule type — with the EZCoach entry point on the far right.
          The gradient (violet→brand teal) + sparkles signal "AI assistant"
          while staying anchored to the product palette. */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <div style={labelBoldStyle}>Schedule type*</div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "4px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
              <input type="radio" name="scheduleType" checked={scheduleType === "session"} onChange={() => setScheduleType("session")} style={{ accentColor: palette.primary }} />
              Session
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
              <input type="radio" name="scheduleType" checked={scheduleType === "rental"} onChange={() => setScheduleType("rental")} style={{ accentColor: palette.primary }} />
              Rental
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAiMode(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            border: "none",
            borderRadius: "999px",
            background: EZCOACH_GRADIENT,
            color: "#ffffff",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            fontFamily: "var(--font-family)",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            boxShadow: isDark ? "0 2px 10px rgba(139,92,246,0.45)" : "0 2px 8px rgba(139,92,246,0.35)",
            transition: "filter 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = "none";
          }}
        >
          <Sparkles size={14} />
          Try it with EZCoach
        </button>
      </div>

      {/* Separator + Resources */}
      <div style={{ borderTop: `1px solid ${palette.borderLight}`, borderBottom: `1px solid ${palette.borderLight}`, padding: "20px 0", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <div style={labelBoldStyle}>Resource(s)*</div>
          <div style={{ ...labelStyle, color: palette.textTertiary, marginBottom: 0 }}>Select at least one.</div>
        </div>
        <div>
          <div style={labelStyle}>Venue(s)</div>
          <SearchableMultiSelect
            options={VENUE_OPTIONS}
            selected={selectedVenues}
            onChange={setSelectedVenues}
            placeholder="—Select venue(s)—"
            palette={palette}
          />
        </div>
        <div>
          <div style={labelStyle}>Instructor(s)</div>
          <SearchableMultiSelect
            options={INSTRUCTOR_OPTIONS}
            selected={selectedInstructors}
            onChange={setSelectedInstructors}
            placeholder="—Select instructor(s)—"
            palette={palette}
          />
        </div>
      </div>

      {/* Reservation type */}
      <div>
        <div style={labelBoldStyle}>Reservation type*</div>
        <select
          style={selectStyle}
          value={reservationType}
          onChange={(e) => setReservationType(e.target.value)}
        >
          <option value="" disabled>—Select reservation type—</option>
          {RESERVATION_TYPE_OPTIONS.map((rt) => (
            <option key={rt} value={rt}>{rt}</option>
          ))}
        </select>
      </div>

      {/* Pre-buffer / Post-buffer */}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "100px" }}>
          <div style={labelStyle}>Pre-buffer</div>
          <div style={fieldDescStyle}>Blocks transitional time prior to session</div>
          <select
            style={useDefaultBuffer ? disabledInputStyle : selectStyle}
            disabled={useDefaultBuffer}
            value={preBuffer}
            onChange={(e) => setPreBuffer(e.target.value)}
          >
            <option value="">None</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </div>
        <span style={{ fontSize: "var(--text-sm)", color: palette.textTertiary, paddingBottom: "10px", fontFamily: "var(--font-family)" }}>and/or</span>
        <div style={{ flex: 1, minWidth: "100px" }}>
          <div style={labelStyle}>Post-buffer</div>
          <div style={fieldDescStyle}>Blocks transitional time after session</div>
          <select
            style={useDefaultBuffer ? disabledInputStyle : selectStyle}
            disabled={useDefaultBuffer}
            value={postBuffer}
            onChange={(e) => setPostBuffer(e.target.value)}
          >
            <option value="">None</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", paddingBottom: "10px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
          <input type="checkbox" checked={useDefaultBuffer} onChange={(e) => setUseDefaultBuffer(e.target.checked)} style={{ accentColor: palette.primary }} />
          Use default
        </label>
      </div>

      {/* Title */}
      <div>
        <div style={labelBoldStyle}>Title*</div>
        <input type="text" placeholder="Enter a title" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      </div>

      {/* Class size */}
      <div>
        <div style={labelStyle}>Class size</div>
        <input type="text" placeholder="e.g. 1, 10, 30, etc." value={classSize} onChange={(e) => setClassSize(e.target.value)} style={inputStyle} />
      </div>

      {/* Allow waitlisting when full — when off, a class that hits its
          registrant limit simply shows a Full status with no way to add
          more clients. When on, a full class shows Waitlist status and
          clients can be booked onto the waitlist. */}
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
          <input type="checkbox" checked={allowWaitlisting} onChange={(e) => setAllowWaitlisting(e.target.checked)} style={{ accentColor: palette.primary }} />
          Allow waitlisting when full
        </label>
        {allowWaitlisting && (
          <div style={{ fontSize: "var(--text-xs)", color: palette.textSecondary, marginTop: "4px", paddingLeft: "20px" }}>
            A full class will show a Waitlist status, and clients can be added to the waitlist when booking.
          </div>
        )}
      </div>

      {/* Start date / End date */}
      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={labelBoldStyle}>Start date*</div>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelBoldStyle}>End date*</div>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Start time / End time — themed TimeField per STYLE_GUIDE ("Time fields") */}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <div style={labelBoldStyle}>Start time*</div>
          <TimeField value={startTime} onChange={setStartTime} sc={sc} isDark={isDark} disabled={allDay} ariaLabel="Start time" />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", paddingBottom: "10px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} style={{ accentColor: palette.primary }} />
          All day
        </label>
        <div style={{ flex: 1 }}>
          <div style={labelBoldStyle}>End time*</div>
          <TimeField value={endTime} onChange={setEndTime} sc={sc} isDark={isDark} disabled={allDay} ariaLabel="End time" />
        </div>
      </div>

      {/* Recurring */}
      <div>
        <div style={labelBoldStyle}>Recurring*</div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "4px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
            <input type="radio" name="recurring" checked={recurring === "yes"} onChange={() => setRecurring("yes")} style={{ accentColor: palette.primary }} />
            Yes
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
            <input type="radio" name="recurring" checked={recurring === "no"} onChange={() => setRecurring("no")} style={{ accentColor: palette.primary }} />
            No
          </label>
        </div>
      </div>

      {/* Split session */}
      <div style={{ opacity: 0.5 }}>
        <div style={labelStyle}>Split session</div>
        <select style={disabledInputStyle} disabled defaultValue="">
          <option value="" disabled>—Set the session length before selecting split increments—</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <div style={labelStyle}>Notes</div>
        <input type="text" placeholder="Enter notes" value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
      </div>

      {/* Additional options — bordered accordion container, closed by default.
          Uses a left-side ChevronRight that rotates 90° when open (the
          classic file-tree / disclosure pattern) so it can't be mistaken
          for a dropdown selector. */}
      <div
        style={{
          border: `1px solid ${palette.borderMedium}`,
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setShowAdditionalOptions((v) => !v)}
          aria-expanded={showAdditionalOptions}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "100%",
            padding: "12px 14px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-family)",
            color: palette.textPrimary,
            textAlign: "left",
          }}
        >
          <ChevronRight
            size={16}
            style={{
              color: palette.textTertiary,
              flexShrink: 0,
              transform: showAdditionalOptions ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
          <span style={{ ...labelBoldStyle, marginBottom: 0, flex: 1 }}>Additional options</span>
        </button>
        {showAdditionalOptions && (
          <div
            style={{
              padding: "14px",
              borderTop: `1px solid ${palette.borderLight}`,
            }}
          >
            <div style={{ marginBottom: "12px" }}>
              <div style={labelStyle}>Online description</div>
              <input type="text" value={onlineDescription} onChange={(e) => setOnlineDescription(e.target.value)} placeholder="e.g. Yoga" style={inputStyle} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
                <input type="checkbox" checked={allowSelfBooking} onChange={(e) => setAllowSelfBooking(e.target.checked)} style={{ accentColor: palette.primary }} /> Allow self booking
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
                <input type="checkbox" checked={allowFreeBookings} onChange={(e) => setAllowFreeBookings(e.target.checked)} style={{ accentColor: palette.primary }} /> Allow free bookings
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
                <input type="checkbox" checked={showOnEZLeagues} onChange={(e) => setShowOnEZLeagues(e.target.checked)} style={{ accentColor: palette.primary }} /> Show on EZ Leagues
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Scheduled on — placed below Additional options per design */}
      <div>
        <div style={{ ...labelBoldStyle, marginBottom: "2px" }}>Scheduled on</div>
        <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
          02/26/2021
        </span>
      </div>

      </div>
      {/* Footer buttons — sticky bottom bar */}
      <div style={{ position: "sticky", bottom: -20, background: palette.surfacePrimary, borderTop: `1px solid ${palette.borderLight}`, padding: "12px 0", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 5 }}>
        <button onClick={handleCancelClick} style={secondaryBtnStyle}>Cancel</button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            disabled={!isFormValid}
            style={isFormValid ? primaryBtnStyle : disabledPrimaryBtnStyle}
          >
            Save &amp; Close
          </button>
          {!isLastSection && (
            <button
              onClick={goToNextSection}
              disabled={!isFormValid}
              style={isFormValid ? {
                ...primaryBtnStyle,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              } : {
                ...disabledPrimaryBtnStyle,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Next: {nextSectionName} <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Small pill toggle switch used by the Preferences tab below. Same
   proportions/behavior as the module toggle on the Admin page, so a switch
   looks and behaves the same wherever it shows up in the app. ─── */
function SchedulePrefToggle({
  enabled,
  onChange,
  sc,
  ariaLabel,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
  sc: SemanticColors;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={() => onChange(!enabled)}
      style={{
        width: "36px",
        height: "20px",
        borderRadius: "10px",
        border: "none",
        padding: 0,
        background: enabled ? sc.brand : sc.track,
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
        transition: "background 0.15s ease",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: "2px",
          left: enabled ? "18px" : "2px",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
          transition: "left 0.15s ease",
        }}
      />
    </button>
  );
}

/* ─── Small segmented control (pill group, one active option) used by the
   Preferences tab's "Default view" and "Density" settings. Generic over
   the option type so it works for either a 4-way ScheduleViewId choice or
   a 2-way ScheduleDensity choice. ─── */
function ScheduleSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  sc,
  isDark,
  getLabel,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  sc: SemanticColors;
  isDark: boolean;
  getLabel?: (option: T) => string;
}) {
  return (
    <div
      role="radiogroup"
      style={{
        display: "flex",
        gap: "4px",
        padding: "3px",
        borderRadius: "8px",
        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      }}
    >
      {options.map((option) => {
        const isActive = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option)}
            style={{
              flex: 1,
              padding: "6px 8px",
              borderRadius: "6px",
              border: "none",
              background: isActive ? sc.brand : "transparent",
              color: isActive ? (isDark ? "#0a0e0f" : "#101828") : sc.body,
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "var(--font-family)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            {getLabel ? getLabel(option) : option}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — UpcomingTodayPanel (desktop side-rail)
   ═══════════════════════════════════════════════════════════════════════ */

interface UpcomingTodayPanelProps {
  events: CalendarEvent[];
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  onSelectEvent: (event: CalendarEvent) => void;
  palette: ThemePalette;
  // Filter state (Filters tab)
  filterStartDate: string;
  setFilterStartDate: (v: string) => void;
  filterEndDate: string;
  setFilterEndDate: (v: string) => void;
  filterStartTime: string;
  setFilterStartTime: (v: string) => void;
  filterEndTime: string;
  setFilterEndTime: (v: string) => void;
  filterTypes: ReservationType[];
  setFilterTypes: (v: ReservationType[]) => void;
  filterPaymentStatus: "" | "Owed" | "Paid";
  setFilterPaymentStatus: (v: "" | "Owed" | "Paid") => void;
  filterRegistrations: string[];
  setFilterRegistrations: (v: string[]) => void;
  // Resource state (Resources tab)
  filterInstructors: string[];
  setFilterInstructors: (v: string[]) => void;
  filterVenues: string[];
  setFilterVenues: (v: string[]) => void;
  activeFilterCount: number;
  clearAllFilters: () => void;
  // Preferences tab — registration-status display setting
  registrationStatusPrefs: RegistrationStatusPrefs;
  setRegistrationStatusPrefs: (v: RegistrationStatusPrefs) => void;
  // Preferences tab — general display/behavior settings
  defaultView: ScheduleViewId;
  setDefaultView: (v: ScheduleViewId) => void;
  density: ScheduleDensity;
  setDensity: (v: ScheduleDensity) => void;
  keepMyFilters: boolean;
  setKeepMyFilters: (v: boolean) => void;
  highlightMySessions: boolean;
  setHighlightMySessions: (v: boolean) => void;
}

function UpcomingTodayPanel({
  events, sc, colors, isDark, onSelectEvent, palette,
  filterStartDate, setFilterStartDate,
  filterEndDate, setFilterEndDate,
  filterStartTime, setFilterStartTime,
  filterEndTime, setFilterEndTime,
  filterTypes, setFilterTypes,
  filterPaymentStatus, setFilterPaymentStatus,
  filterRegistrations, setFilterRegistrations,
  filterInstructors, setFilterInstructors,
  filterVenues, setFilterVenues,
  activeFilterCount, clearAllFilters,
  registrationStatusPrefs, setRegistrationStatusPrefs,
  defaultView, setDefaultView,
  density, setDensity,
  keepMyFilters, setKeepMyFilters,
  highlightMySessions, setHighlightMySessions,
}: UpcomingTodayPanelProps) {
  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const [sidebarTab, setSidebarTab] = useState<"Resources" | "Filters" | "Preferences">("Resources");

  // Registration-status preference helpers ────────────────────────────
  // Three levels of bulk-setter, none of them a separately stored value —
  // each just reads as "on" when everything underneath it is already on,
  // and clicking it snaps everything underneath to the opposite of that.
  //   1. Everything (every view × every status category)
  //   2. One view, every status category
  //   3. One view, one status category (the actual stored leaf value)
  const isEverythingOn = SCHEDULE_VIEW_IDS.every((v) =>
    REGISTRATION_STATUS_CATEGORIES.every((c) => registrationStatusPrefs[v][c])
  );
  const toggleEverything = () => {
    const next = !isEverythingOn;
    const nextPrefs = {} as RegistrationStatusPrefs;
    for (const v of SCHEDULE_VIEW_IDS) {
      nextPrefs[v] = REGISTRATION_STATUS_CATEGORIES.reduce(
        (acc, c) => ({ ...acc, [c]: next }),
        {} as ViewStatusVisibility
      );
    }
    setRegistrationStatusPrefs(nextPrefs);
  };
  const isViewAllOn = (view: ScheduleViewId) =>
    REGISTRATION_STATUS_CATEGORIES.every((c) => registrationStatusPrefs[view][c]);
  const toggleViewAll = (view: ScheduleViewId) => {
    const next = !isViewAllOn(view);
    setRegistrationStatusPrefs({
      ...registrationStatusPrefs,
      [view]: REGISTRATION_STATUS_CATEGORIES.reduce(
        (acc, c) => ({ ...acc, [c]: next }),
        {} as ViewStatusVisibility
      ),
    });
  };
  const toggleViewCategory = (view: ScheduleViewId, category: RegistrationStatusCategory) => {
    setRegistrationStatusPrefs({
      ...registrationStatusPrefs,
      [view]: { ...registrationStatusPrefs[view], [category]: !registrationStatusPrefs[view][category] },
    });
  };

  // Resource checkbox toggle helpers ──────────────────────────────────
  // Empty array = "no filter" = show all (all unchecked).
  // Checking an item adds it to the include list; only checked items show.
  const toggleInstructor = (name: string) => {
    if (filterInstructors.includes(name)) {
      setFilterInstructors(filterInstructors.filter((n) => n !== name));
    } else {
      setFilterInstructors([...filterInstructors, name]);
    }
  };

  const toggleVenue = (name: string) => {
    if (filterVenues.includes(name)) {
      setFilterVenues(filterVenues.filter((n) => n !== name));
    } else {
      setFilterVenues([...filterVenues, name]);
    }
  };

  // Non-resource filter count (used for the Filters tab badge)
  const nonResourceFilterCount =
    (filterStartDate ? 1 : 0) +
    (filterEndDate ? 1 : 0) +
    (filterStartTime ? 1 : 0) +
    (filterEndTime ? 1 : 0) +
    (filterTypes.length > 0 ? 1 : 0) +
    (filterPaymentStatus ? 1 : 0) +
    (filterRegistrations.length > 0 ? 1 : 0);

  const resourceFilterCount =
    (filterInstructors.length > 0 ? 1 : 0) +
    (filterVenues.length > 0 ? 1 : 0);

  // Section-label style (uppercase, muted, small)
  const groupLabelStyle: CSSProperties = {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: sc.muted,
    padding: "10px 16px 6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const checkRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "5px 16px",
    cursor: "pointer",
    borderRadius: "6px",
    margin: "0 4px",
    transition: "background 0.1s ease",
  };

  const panelStyle: CSSProperties = {
    minWidth: 0,
    minHeight: 0,
    borderRadius: "12px",
    border: `1px solid ${sc.border}`,
    background: sc.cellBg,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <>
      {/* ── Panel 1: Upcoming Today event list ─────────────────────── */}
      <aside style={{ ...panelStyle, flex: "3 1 0" }}>
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            background: sc.headerBg,
            borderBottom: `1px solid ${sc.border}`,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "15px", fontWeight: 600, color: sc.heading, lineHeight: "20px" }}>
            Upcoming Today
          </span>
          <div style={{ fontSize: "12px", color: sc.muted, lineHeight: "16px", marginTop: "2px" }}>
            {dateLabel} · {events.length} reservation{events.length === 1 ? "" : "s"}
          </div>
        </div>

      {/* Event list */}
      <div
        className="always-show-scrollbar"
        style={{
          flex: "1 1 0",
          minHeight: 0,
          overflowY: "auto",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {events.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: sc.muted,
              fontSize: "13px",
              lineHeight: "18px",
            }}
          >
            Nothing left on today's schedule.
          </div>
        ) : (
          events.map((event) => {
            const ec = colors[event.type];
            const remaining = Math.max(0, event.capacity - event.booked);
            const hasCapacity  = event.capacity > 0 && event.type !== "closed" && event.type !== "league";
            const attendPct    = hasCapacity ? event.booked / event.capacity : 0;
            const isFull       = hasCapacity && event.booked >= event.capacity;
            const isNearlyFull = !isFull && hasCapacity && attendPct >= 0.8;
            const isEmpty      = hasCapacity && event.booked === 0;
            const statusLabel  = isFull ? "FULLY BOOKED" : isNearlyFull ? "NEARLY FULL" : (isEmpty || hasCapacity) ? "AVAILABLE" : null;
            const statusPillBg   = isFull ? EZ_RED : isNearlyFull ? "#FFE109" : EZ_GREEN;
            const statusPillText = isFull ? EZ_RED_ON_COLOR : isNearlyFull ? "#111111" : EZ_GREEN_ON_COLOR;
            return (
              <button
                key={event.id}
                onClick={() => onSelectEvent(event)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: `1px solid ${sc.border}`,
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  fontFamily: "var(--font-family)",
                  color: sc.body,
                  transition: "background 0.15s ease, border-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
                  e.currentTarget.style.borderColor = sc.brand;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = sc.border;
                }}
              >
                <span
                  style={{ width: "10px", height: "10px", marginTop: "5px", borderRadius: "50%", background: ec.text, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: sc.heading, lineHeight: "18px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1 1 0", minWidth: 0 }}>
                      {event.title}
                    </span>
                    {statusLabel && (
                      <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", lineHeight: "16px", padding: "1px 6px", borderRadius: "4px", background: statusPillBg, color: statusPillText }}>
                        {statusLabel}
                      </span>
                    )}
                    <span style={{ fontSize: "12px", fontWeight: 500, color: sc.body, lineHeight: "16px", flexShrink: 0 }}>
                      {event.time}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: sc.muted, lineHeight: "16px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><User size={12} /> {event.instructor}</span>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><MapPin size={12} /> {event.venue}</span>
                  </div>
                  <div style={{ fontSize: "12px", lineHeight: "16px", display: "flex", alignItems: "center", gap: "6px", color: sc.body }}>
                    <Users size={12} style={{ color: sc.muted }} />
                    <span style={{ fontWeight: 600 }}>{event.booked}/{event.capacity}</span>
                    <span style={{ color: sc.muted }}>
                      {isFull ? (event.waitlistEnabled ? "(Waitlist open)" : "(Full)") : `(${remaining} available)`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      </aside>

      {/* ── Panel 2: Resources & Filters tabs ──────────────────────── */}
      <aside style={{ ...panelStyle, flex: "2 1 0" }}>
        {/* Tab row */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${sc.border}`,
            flexShrink: 0,
            background: sc.headerBg,
          }}
        >
          {(["Resources", "Filters"] as const).map((tab) => {
            const isActive = sidebarTab === tab;
            const badge = tab === "Resources" ? resourceFilterCount : nonResourceFilterCount;
            return (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  border: "none",
                  borderBottom: isActive ? `2px solid ${sc.brand}` : "2px solid transparent",
                  background: "transparent",
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? sc.brand : sc.muted,
                  fontFamily: "var(--font-family)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "color 0.15s ease, border-bottom-color 0.15s ease",
                }}
              >
                {tab}
                {badge > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "16px",
                      height: "16px",
                      padding: "0 4px",
                      borderRadius: "8px",
                      background: sc.brand,
                      color: isDark ? "#0a0e0f" : "#101828",
                      fontSize: "10px",
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
          {/* Preferences tab — icon-only (gear), no badge. Unlike Resources/
              Filters, there's no "N active" concept here worth surfacing —
              the setting is a persistent display preference, not a filter
              currently narrowing what's shown. */}
          <button
            onClick={() => setSidebarTab("Preferences")}
            aria-label="Schedule display preferences"
            aria-pressed={sidebarTab === "Preferences"}
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "none",
              borderBottom: sidebarTab === "Preferences" ? `2px solid ${sc.brand}` : "2px solid transparent",
              background: "transparent",
              color: sidebarTab === "Preferences" ? sc.brand : sc.muted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.15s ease, border-bottom-color 0.15s ease",
            }}
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Tab content — scrolls independently */}
        <div
          className="always-show-scrollbar"
          style={{ flex: "1 1 0", minHeight: 0, overflowY: "auto" }}
        >
          {/* ── Resources tab ───────────────────────────────────────── */}
          {sidebarTab === "Resources" && (
            <div style={{ paddingBottom: "12px" }}>
              {/* Instructors group — carries the single "Clear" link for
                  both resource axes (see note above Venues group below). */}
              <div style={groupLabelStyle}>
                <span>Instructors</span>
                {(filterInstructors.length > 0 || filterVenues.length > 0) && (
                  <button
                    onClick={() => { setFilterInstructors([]); setFilterVenues([]); }}
                    style={{ background: "none", border: "none", fontSize: "11px", fontWeight: 600, color: sc.brand, cursor: "pointer", padding: 0, fontFamily: "var(--font-family)" }}
                  >
                    Clear
                  </button>
                )}
              </div>
              {INSTRUCTOR_OPTIONS.map((name) => {
                const isChecked = filterInstructors.includes(name);
                return (
                  <label
                    key={name}
                    style={checkRowStyle}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleInstructor(name)}
                      style={{ accentColor: sc.brand, width: "14px", height: "14px", flexShrink: 0, cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "13px", color: sc.body, lineHeight: "18px", cursor: "pointer" }}>
                      {name}
                    </span>
                  </label>
                );
              })}

              {/* Divider */}
              <div style={{ height: "1px", background: sc.border, margin: "8px 16px" }} />

              {/* Venues group — no separate Clear link here. Resource
                  filters (instructors + venues) are treated as one filter
                  group with a single "or" query behind it, so there's one
                  Clear affordance for the pair, not one per axis; it lives
                  on the Instructors header above. */}
              <div style={groupLabelStyle}>
                <span>Venues</span>
              </div>
              {VENUE_OPTIONS.map((name) => {
                const isChecked = filterVenues.includes(name);
                return (
                  <label
                    key={name}
                    style={checkRowStyle}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleVenue(name)}
                      style={{ accentColor: sc.brand, width: "14px", height: "14px", flexShrink: 0, cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "13px", color: sc.body, lineHeight: "18px", cursor: "pointer" }}>
                      {name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {/* ── Filters tab ─────────────────────────────────────────── */}
          {sidebarTab === "Filters" && (
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* "Keep my filters" lives here (rather than the Preferences
                  tab) since a user looking to change filter-persistence
                  behavior is most likely to look for it right where the
                  filters themselves live. */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: sc.heading }}>
                    Keep my filters
                  </div>
                  <div style={{ fontSize: "11px", color: sc.muted, marginTop: "1px", lineHeight: "15px" }}>
                    Remember these selections the next time you visit.
                  </div>
                </div>
                <SchedulePrefToggle
                  enabled={keepMyFilters}
                  onChange={setKeepMyFilters}
                  sc={sc}
                  ariaLabel="Keep my filters across visits"
                />
              </div>
              <div style={{ height: "1px", background: sc.border }} />

              <CalendarFiltersContent
                filterStartDate={filterStartDate}
                setFilterStartDate={setFilterStartDate}
                filterEndDate={filterEndDate}
                setFilterEndDate={setFilterEndDate}
                filterStartTime={filterStartTime}
                setFilterStartTime={setFilterStartTime}
                filterEndTime={filterEndTime}
                setFilterEndTime={setFilterEndTime}
                filterVenues={filterVenues}
                setFilterVenues={setFilterVenues}
                filterInstructors={filterInstructors}
                setFilterInstructors={setFilterInstructors}
                filterTypes={filterTypes}
                setFilterTypes={setFilterTypes}
                filterPaymentStatus={filterPaymentStatus}
                setFilterPaymentStatus={setFilterPaymentStatus}
                filterRegistrations={filterRegistrations}
                setFilterRegistrations={setFilterRegistrations}
                activeFilterCount={nonResourceFilterCount}
                clearAllFilters={clearAllFilters}
                palette={palette}
                isDark={isDark}
                sc={sc}
                colors={colors}
                hideResourceFilters
                hideHeader
                inlineClearAll={nonResourceFilterCount > 0}
              />
            </div>
          )}

          {/* ── Preferences tab ─────────────────────────────────────── */}
          {sidebarTab === "Preferences" && (
            <div style={{ padding: "12px 16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {/* ── General ──────────────────────────────────────────
                  Default view only takes effect next page load (see the
                  comment on `desktopView`'s init in SchedulePage); density,
                  keep-my-filters, and highlight-my-sessions all apply
                  immediately. */}
              <div style={{ padding: "8px 4px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: sc.heading, marginBottom: "6px" }}>
                  Default view
                </div>
                <ScheduleSegmentedControl
                  options={SCHEDULE_VIEW_IDS}
                  value={defaultView}
                  onChange={setDefaultView}
                  sc={sc}
                  isDark={isDark}
                />
              </div>

              <div style={{ padding: "8px 4px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: sc.heading, marginBottom: "6px" }}>
                  Density
                </div>
                <ScheduleSegmentedControl
                  options={SCHEDULE_DENSITIES}
                  value={density}
                  onChange={setDensity}
                  sc={sc}
                  isDark={isDark}
                  getLabel={(d) => (d === "comfortable" ? "Comfortable" : "Compact")}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 4px", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: sc.heading }}>
                    Highlight my sessions
                  </div>
                  <div style={{ fontSize: "11px", color: sc.muted, marginTop: "1px", lineHeight: "15px" }}>
                    Rings sessions taught by {CURRENT_USER_INSTRUCTOR} and dims
                    everything else. (Demo stand-in for a signed-in instructor.)
                  </div>
                </div>
                <SchedulePrefToggle
                  enabled={highlightMySessions}
                  onChange={setHighlightMySessions}
                  sc={sc}
                  ariaLabel={`Highlight sessions taught by ${CURRENT_USER_INSTRUCTOR}`}
                />
              </div>

              <div style={{ height: "1px", background: sc.border, margin: "6px 0 8px" }} />

              {/* ── Registration status ──────────────────────────────── */}
              <div style={{ fontSize: "14px", fontWeight: 600, color: sc.heading }}>
                Registration status
              </div>
              <div style={{ fontSize: "12px", color: sc.muted, lineHeight: "17px", marginBottom: "4px" }}>
                Choose which statuses show up on the calendar, and on which
                views — e.g. show only "Available" on the Monthly view and
                hide the rest. This only changes how the calendar looks;
                reservation details always show full registration info.
              </div>

              {/* Bulk "everything" toggle — reads "on" only when every
                  status on every view below is already on. */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 4px",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 600, color: sc.heading }}>
                  Show everywhere
                </span>
                <SchedulePrefToggle
                  enabled={isEverythingOn}
                  onChange={toggleEverything}
                  sc={sc}
                  ariaLabel="Show registration status for every status and every schedule view"
                />
              </div>

              <div style={{ height: "1px", background: sc.border, margin: "4px 0 4px" }} />

              {SCHEDULE_VIEW_IDS.map((view) => (
                <div key={view}>
                  {/* Per-view header — its own bulk toggle for all 4
                      categories, reusing the same "Instructors"-style
                      group-label row (uppercase label + right-aligned
                      control) already used elsewhere in this panel. */}
                  <div style={{ ...groupLabelStyle, padding: "10px 4px 6px" }}>
                    <span>{view}</span>
                    <SchedulePrefToggle
                      enabled={isViewAllOn(view)}
                      onChange={() => toggleViewAll(view)}
                      sc={sc}
                      ariaLabel={`Show registration status for every status on the ${view} view`}
                    />
                  </div>
                  {REGISTRATION_STATUS_CATEGORIES.map((category) => {
                    const meta = REGISTRATION_STATUS_CATEGORY_META[category];
                    const isChecked = registrationStatusPrefs[view][category];
                    return (
                      <label
                        key={category}
                        style={checkRowStyle}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleViewCategory(view, category)}
                          style={{ accentColor: sc.brand, width: "14px", height: "14px", flexShrink: 0, cursor: "pointer" }}
                        />
                        <span
                          aria-hidden
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: isDark ? meta.dotDark : meta.dotLight,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: "13px", color: sc.body, lineHeight: "18px", cursor: "pointer" }}>
                          {meta.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — DayEventsPanelContent
   Rendered inside the shared SidePanel when the user clicks "+X more"
   on a calendar date cell. Shows all events for that day in the same
   card style as the Upcoming Today side rail.
   ═══════════════════════════════════════════════════════════════════════ */

function DayEventsPanelContent({
  day, month, year, events, onSelectEvent,
}: {
  day: number;
  month: number;
  year: number;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const { palette, mode } = useTheme();
  const isDark = mode === "dark";
  const sc = semanticColors(palette, isDark);
  const colors = getEventStyles(isDark);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {events.length === 0 ? (
        <div style={{ padding: "32px 16px", textAlign: "center", color: sc.muted, fontSize: "13px" }}>
          No reservations on this day.
        </div>
      ) : (
        events.map((event) => {
          const ec = colors[event.type];
          const remaining = Math.max(0, event.capacity - event.booked);
          const isFull = remaining === 0;
          return (
            <button
              key={event.id}
              onClick={() => onSelectEvent(event)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "12px",
                borderRadius: "8px",
                border: `1px solid ${sc.border}`,
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                fontFamily: "var(--font-family)",
                color: sc.body,
                transition: "background 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
                e.currentTarget.style.borderColor = sc.brand;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = sc.border;
              }}
            >
              <span style={{ width: "10px", height: "10px", marginTop: "5px", borderRadius: "50%", background: ec.text, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: sc.heading, lineHeight: "18px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {event.title}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: sc.body, lineHeight: "16px", flexShrink: 0 }}>
                    {event.time}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: sc.muted, lineHeight: "16px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <User size={12} /> {event.instructor}
                  </span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <MapPin size={12} /> {event.venue}
                  </span>
                </div>
                {event.type !== "closed" && (
                  <div style={{ fontSize: "12px", lineHeight: "16px", display: "flex", alignItems: "center", gap: "6px", color: sc.body }}>
                    <Users size={12} style={{ color: sc.muted }} />
                    <span style={{ fontWeight: 600 }}>{event.booked}/{event.capacity}</span>
                    <span style={{ color: sc.muted }}>
                      {isFull
                        ? event.waitlistEnabled ? "(Waitlist open)" : "(Full)"
                        : `(${remaining} available)`}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — CalendarFiltersContent
   Shared filter form used by the desktop Filters popover and the mobile
   Filters drawer. Renders the structured filter sections (date range,
   time range, venues, instructors, reservation types, registrations,
   payment status) plus a header with optional Clear-all action. Stateless
   — all values + setters come from the parent so the component can be
   placed in either layout.
   ═══════════════════════════════════════════════════════════════════════ */

interface CalendarFiltersContentProps {
  filterStartDate: string;
  filterEndDate: string;
  filterStartTime: string;
  filterEndTime: string;
  filterVenues: string[];
  filterInstructors: string[];
  filterTypes: ReservationType[];
  filterPaymentStatus: "" | "Owed" | "Paid";
  filterRegistrations: string[];
  setFilterStartDate: (v: string) => void;
  setFilterEndDate: (v: string) => void;
  setFilterStartTime: (v: string) => void;
  setFilterEndTime: (v: string) => void;
  setFilterVenues: (v: string[]) => void;
  setFilterInstructors: (v: string[]) => void;
  setFilterTypes: (v: ReservationType[]) => void;
  setFilterPaymentStatus: (v: "" | "Owed" | "Paid") => void;
  setFilterRegistrations: (v: string[]) => void;
  activeFilterCount: number;
  clearAllFilters: () => void;
  palette: ThemePalette;
  isDark: boolean;
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  /** When true, the Reservation types section renders as a searchable
   *  multiselect with a colored dot per option (mobile layout) instead
   *  of the inline colored chips (desktop layout). */
  mobileLayout?: boolean;
  /** When true, the Venues and Instructors sections are hidden (they
   *  live in the Resources tab of the sidebar instead). */
  hideResourceFilters?: boolean;
  /** When true, the "Filter reservations" header row is hidden. */
  hideHeader?: boolean;
  /** When true, a "Clear all" link is rendered inline with the first
   *  visible section label (matches the Resources tab pattern). */
  inlineClearAll?: boolean;
}

function CalendarFiltersContent({
  filterStartDate, setFilterStartDate,
  filterEndDate, setFilterEndDate,
  filterStartTime, setFilterStartTime,
  filterEndTime, setFilterEndTime,
  filterVenues, setFilterVenues,
  filterInstructors, setFilterInstructors,
  filterTypes, setFilterTypes,
  filterPaymentStatus, setFilterPaymentStatus,
  filterRegistrations, setFilterRegistrations,
  activeFilterCount,
  clearAllFilters,
  palette, isDark, sc, colors,
  mobileLayout = false,
  hideResourceFilters = false,
  hideHeader = false,
  inlineClearAll = false,
}: CalendarFiltersContentProps) {
  // Pretty label for a reservation type. HIIT keeps its acronym casing;
  // league reads as "League Game"; the rest get a simple capitalize.
  const typeLabel = (t: ReservationType): string =>
    t === "hiit"
      ? "HIIT"
      : t === "league"
      ? "League Game"
      : t.charAt(0).toUpperCase() + t.slice(1);
  // Colored dot used as the leading element for each type option in
  // the mobile multiselect — same color tokens as the desktop chips so
  // both layouts read as the same legend.
  const renderTypeDot = (t: string): ReactNode => {
    const c = colors[t as ReservationType];
    if (!c) return null;
    return (
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: c.text,
          flexShrink: 0,
        }}
      />
    );
  };
  // Sorted alphabetically by display label so the chips and the
  // multiselect both render in a predictable order.
  const TYPE_OPTIONS: ReservationType[] = [
    "hiit",
    "league",
    "meditation",
    "pilates",
    "yoga",
  ];
  return (
    <>
      {/* Header — title + Clear all (when any filter is active). */}
      {!hideHeader && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: sc.heading }}>Filter reservations</span>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: "var(--font-family)",
                color: sc.brand,
                cursor: "pointer",
              }}
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Date range — hidden on mobile since the mini calendar already controls the date */}
      {!mobileLayout && (
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: sc.body, marginBottom: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Date range</span>
            {inlineClearAll && (
              <button
                onClick={clearAllFilters}
                style={{ background: "none", border: "none", padding: 0, fontSize: "11px", fontWeight: 600, fontFamily: "var(--font-family)", color: sc.brand, cursor: "pointer" }}
              >
                Clear all
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              style={{ flex: 1, minWidth: 0, padding: "8px 10px", fontSize: "13px", fontFamily: "var(--font-family)", border: `1px solid ${sc.border}`, borderRadius: "6px", background: sc.inputBg, color: sc.heading, colorScheme: isDark ? "dark" : "light" }}
            />
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              style={{ flex: 1, minWidth: 0, padding: "8px 10px", fontSize: "13px", fontFamily: "var(--font-family)", border: `1px solid ${sc.border}`, borderRadius: "6px", background: sc.inputBg, color: sc.heading, colorScheme: isDark ? "dark" : "light" }}
            />
          </div>
        </div>
      )}

      {/* Time range */}
      <div>
        <div style={{ fontSize: "12px", fontWeight: 600, color: sc.body, marginBottom: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Time range</span>
          {/* On mobile, Date range is hidden so Clear all appears here instead */}
          {inlineClearAll && mobileLayout && (
            <button
              onClick={clearAllFilters}
              style={{ background: "none", border: "none", padding: 0, fontSize: "11px", fontWeight: 600, fontFamily: "var(--font-family)", color: sc.brand, cursor: "pointer" }}
            >
              Clear all
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <TimeField
            value={filterStartTime}
            onChange={setFilterStartTime}
            sc={sc}
            isDark={isDark}
            ariaLabel="Start time"
          />
          <TimeField
            value={filterEndTime}
            onChange={setFilterEndTime}
            sc={sc}
            isDark={isDark}
            ariaLabel="End time"
          />
        </div>
      </div>

      {/* Venues */}
      {!hideResourceFilters && (
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: sc.body, marginBottom: "6px" }}>Venues</div>
          <SearchableMultiSelect
            options={VENUE_OPTIONS}
            selected={filterVenues}
            onChange={setFilterVenues}
            placeholder="—Any venue—"
            palette={palette}
          />
        </div>
      )}

      {/* Instructors */}
      {!hideResourceFilters && (
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: sc.body, marginBottom: "6px" }}>Instructors</div>
          <SearchableMultiSelect
            options={INSTRUCTOR_OPTIONS}
            selected={filterInstructors}
            onChange={setFilterInstructors}
            placeholder="—Any instructor—"
            palette={palette}
          />
        </div>
      )}

      {/* Reservation types — searchable multiselect with a color-coded dot
          per option so each type stays visually anchored to its calendar color. */}
      <div>
        <div style={{ fontSize: "12px", fontWeight: 600, color: sc.body, marginBottom: "6px" }}>Reservation types</div>
        <SearchableMultiSelect
          options={TYPE_OPTIONS as string[]}
          selected={filterTypes as string[]}
          onChange={(values) => setFilterTypes(values as ReservationType[])}
          placeholder="—Any type—"
          palette={palette}
          getLabel={(o) => typeLabel(o as ReservationType)}
          getLeading={renderTypeDot}
        />
      </div>

      {/* Registrations + Payment status — derived-state filters. */}
      <div style={{ height: "1px", background: sc.border }} />
      <div>
        <div style={{ fontSize: "12px", fontWeight: 600, color: sc.body, marginBottom: "6px" }}>Registrations</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {([
            { value: "Full",       label: "Full",        pillBg: EZ_RED,   pillBorder: EZ_RED,   pillText: EZ_RED_ON_COLOR   },
            // Translucent red — mirrors the waitlisted time-chip treatment on
            // the calendar badges, so "red = full/blocked" stays consistent
            // between the filter pill and the events it's filtering for.
            { value: "Waitlisted", label: "Waitlisted",  pillBg: isDark ? "rgba(224,90,90,0.22)" : "rgba(212,24,64,0.14)", pillBorder: isDark ? "#e05a5a" : "#d41840", pillText: isDark ? "#e05a5a" : "#d41840" },
            { value: "NearlyFull", label: "Nearly Full", pillBg: "#FFE109", pillBorder: "#C4A800", pillText: "#111111"          },
            { value: "Available",  label: "Available",   pillBg: EZ_GREEN,  pillBorder: EZ_GREEN,  pillText: EZ_GREEN_ON_COLOR  },
            { value: "Empty",      label: "Empty",       pillBg: isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6", pillBorder: palette.borderMedium, pillText: sc.body },
          ] as const).map(({ value, label, pillBg, pillBorder, pillText }) => {
            const isActive = filterRegistrations.includes(value);
            const toggle = () => {
              const next = isActive
                ? filterRegistrations.filter((x) => x !== value)
                : [...filterRegistrations, value];
              setFilterRegistrations(next);
            };
            return (
              <button
                key={value}
                onClick={toggle}
                style={{
                  padding: "4px 10px",
                  borderRadius: "12px",
                  border: `1px solid ${isActive ? pillBorder : palette.borderMedium}`,
                  background: isActive ? pillBg : "transparent",
                  color: isActive ? pillText : sc.body,
                  fontSize: "11px",
                  fontWeight: 600,
                  fontFamily: "var(--font-family)",
                  cursor: "pointer",
                  lineHeight: 1.4,
                  opacity: isActive ? 1 : 0.7,
                  transition: "all 0.15s ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div style={{ fontSize: "12px", fontWeight: 600, color: sc.body, marginBottom: "6px" }}>Payment status</div>
        <select
          value={filterPaymentStatus}
          onChange={(e) => setFilterPaymentStatus(e.target.value as "" | "Owed" | "Paid")}
          style={{
            width: "100%",
            padding: "6px 32px 6px 12px",
            fontSize: "13px",
            fontFamily: "var(--font-family)",
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "6px",
            backgroundColor: palette.surfaceBg,
            color: palette.textPrimary,
            colorScheme: isDark ? "dark" : "light",
            cursor: "pointer",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='${encodeURIComponent(isDark ? "#a1bdc6" : "#475467")}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            minHeight: "42px",
          }}
        >
          <option value="">Any</option>
          <option value="Owed">Overdue Balance</option>
          <option value="Paid">Paid</option>
        </select>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — ResourcesDayPicker
   Mini calendar popover for picking a single day in the Resources view.
   Clicking a day fires onPick(day, month, year) and the parent closes it.
   ═══════════════════════════════════════════════════════════════════════ */

function ResourcesDayPicker({
  selectedDay,
  selectedMonth,
  selectedYear,
  onPick,
  sc,
  isDark,
}: {
  selectedDay: number;
  selectedMonth: number;
  selectedYear: number;
  onPick: (day: number, month: number, year: number) => void;
  sc: SemanticColors;
  isDark: boolean;
}) {
  const [pickerMonth, setPickerMonth] = useState(selectedMonth);
  const [pickerYear,  setPickerYear]  = useState(selectedYear);

  const today = new Date();

  const daysInPickerMonth = getDaysInMonth(pickerYear, pickerMonth);
  const firstDayOfWeek    = getFirstDayOfMonth(pickerYear, pickerMonth);

  // Flat array of (number|null) cells for the grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInPickerMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevPickerMonth = () => {
    if (pickerMonth === 0) { setPickerMonth(11); setPickerYear((y) => y - 1); }
    else setPickerMonth((m) => m - 1);
  };
  const nextPickerMonth = () => {
    if (pickerMonth === 11) { setPickerMonth(0); setPickerYear((y) => y + 1); }
    else setPickerMonth((m) => m + 1);
  };

  const navBtnStyle: CSSProperties = {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    border: `1px solid ${sc.border}`,
    background: sc.controlBg,
    color: sc.body,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: "264px",
        background: sc.cellBg,
        border: `1px solid ${sc.border}`,
        borderRadius: "10px",
        boxShadow: `0px 12px 24px -6px ${sc.shadow}, 0px 4px 6px 0px ${sc.shadow}`,
        padding: "12px",
        zIndex: 200,
        fontFamily: "var(--font-family)",
      }}
    >
      {/* Month / year header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <button onClick={prevPickerMonth} aria-label="Previous month" style={navBtnStyle}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: "14px", fontWeight: 600, color: sc.heading }}>
          {MONTH_NAMES[pickerMonth]} {pickerYear}
        </span>
        <button onClick={nextPickerMonth} aria-label="Next month" style={navBtnStyle}>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "4px" }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, color: sc.muted, padding: "2px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const isSelected = d === selectedDay && pickerMonth === selectedMonth && pickerYear === selectedYear;
          const isToday    = d === today.getDate() && pickerMonth === today.getMonth() && pickerYear === today.getFullYear();
          return (
            <button
              key={i}
              onClick={() => onPick(d, pickerMonth, pickerYear)}
              style={{
                width: "100%",
                aspectRatio: "1",
                borderRadius: "50%",
                border: isToday && !isSelected ? `1px solid ${sc.brand}` : "1px solid transparent",
                background: isSelected ? sc.brand : "transparent",
                color: isSelected
                  ? (isDark ? "#0a0e0f" : "#101828")
                  : isToday ? sc.brand : sc.body,
                fontSize: "12px",
                fontWeight: isSelected || isToday ? 700 : 400,
                cursor: "pointer",
                fontFamily: "var(--font-family)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — WeekPicker
   Mini calendar popover for picking a week in the Weekly view. Unlike
   ResourcesDayPicker (which selects a single day), every row here IS a
   selectable week — hovering highlights the full Monday→Sunday row and
   clicking anywhere in that row selects it, so a click "wherever" always
   resolves to the whole week it landed in.
   ═══════════════════════════════════════════════════════════════════════ */

function WeekPicker({
  weekStart,
  onPick,
  sc,
  isDark,
}: {
  /** Monday of the currently-selected week (drives the highlighted row). */
  weekStart: Date;
  onPick: (weekStart: Date) => void;
  sc: SemanticColors;
  isDark: boolean;
}) {
  const [pickerMonth, setPickerMonth] = useState(weekStart.getMonth());
  const [pickerYear, setPickerYear] = useState(weekStart.getFullYear());
  const [hoverRow, setHoverRow] = useState<number | null>(null);

  const today = new Date();
  const weekStartTime = weekStart.getTime();

  const daysInPickerMonth = getDaysInMonth(pickerYear, pickerMonth);
  // This grid is Monday-first (unlike the Sunday-first grids used
  // elsewhere in Schedule) so each row lines up exactly with one
  // selectable Weekly-view week.
  const leadingBlanks = mondayIndex(getFirstDayOfMonth(pickerYear, pickerMonth));

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInPickerMonth; d++) cells.push(new Date(pickerYear, pickerMonth, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const prevPickerMonth = () => {
    if (pickerMonth === 0) { setPickerMonth(11); setPickerYear((y) => y - 1); }
    else setPickerMonth((m) => m - 1);
  };
  const nextPickerMonth = () => {
    if (pickerMonth === 11) { setPickerMonth(0); setPickerYear((y) => y + 1); }
    else setPickerMonth((m) => m + 1);
  };

  const navBtnStyle: CSSProperties = {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    border: `1px solid ${sc.border}`,
    background: sc.controlBg,
    color: sc.body,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const rowCount = cells.length / 7;

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: "264px",
        background: sc.cellBg,
        border: `1px solid ${sc.border}`,
        borderRadius: "10px",
        boxShadow: `0px 12px 24px -6px ${sc.shadow}, 0px 4px 6px 0px ${sc.shadow}`,
        padding: "12px",
        zIndex: 200,
        fontFamily: "var(--font-family)",
      }}
    >
      {/* Month / year header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <button onClick={prevPickerMonth} aria-label="Previous month" style={navBtnStyle}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: "14px", fontWeight: 600, color: sc.heading }}>
          {MONTH_NAMES[pickerMonth]} {pickerYear}
        </span>
        <button onClick={nextPickerMonth} aria-label="Next month" style={navBtnStyle}>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day-of-week headers — Monday-first, matching the Weekly view */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "4px" }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, color: sc.muted, padding: "2px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Week rows — each entire row is one click target */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {Array.from({ length: rowCount }).map((_, rowIdx) => {
          const rowCells = cells.slice(rowIdx * 7, rowIdx * 7 + 7);
          const rowDates = rowCells.filter((c): c is Date => c !== null);
          if (rowDates.length === 0) return null;
          const rowWeekStart = getWeekStart(rowDates[0]);
          const isSelectedRow = rowWeekStart.getTime() === weekStartTime;
          const isHoverRow = hoverRow === rowIdx;

          return (
            <div
              key={rowIdx}
              onMouseEnter={() => setHoverRow(rowIdx)}
              onMouseLeave={() => setHoverRow(null)}
              onClick={() => onPick(rowWeekStart)}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "2px",
                borderRadius: "8px",
                cursor: "pointer",
                background: isSelectedRow
                  ? sc.brand
                  : isHoverRow
                  ? (isDark ? "rgba(0,196,160,0.16)" : "rgba(0,196,160,0.12)")
                  : "transparent",
                transition: "background 0.1s",
              }}
            >
              {rowCells.map((cellDate, ci) => {
                if (!cellDate) return <div key={ci} />;
                const isToday =
                  cellDate.getFullYear() === today.getFullYear() &&
                  cellDate.getMonth() === today.getMonth() &&
                  cellDate.getDate() === today.getDate();
                return (
                  <div
                    key={ci}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: isSelectedRow || isToday ? 700 : 400,
                      color: isSelectedRow
                        ? (isDark ? "#0a0e0f" : "#101828")
                        : isToday ? sc.brand : sc.body,
                      border: isToday && !isSelectedRow ? `1px solid ${sc.brand}` : "1px solid transparent",
                      borderRadius: "50%",
                    }}
                  >
                    {cellDate.getDate()}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — ResourcesView (day × resource grid)
   ═══════════════════════════════════════════════════════════════════════ */

/** First visible hour (7 am) */
const RES_START_HOUR = 7;
/** Last visible hour (10 pm) */
const RES_END_HOUR   = 22;
/** Width in px of each 1-hour column. Wide enough that a chip's full
 *  start–end time range ("10:15am–11:00am") plus its attendance status
 *  ("Full"/"Waitlist"/booked-of-capacity) can render without truncating,
 *  even inside the buffer-stripe padding a pre/post-buffered session adds,
 *  and even in a stacked (same-hour) lane that's otherwise compact. */
const RES_COL_W      = 176;
/** Width in px of the sticky resource-name column */
const RES_LABEL_W    = 164;
// Row height, lane height/gap, row padding, and the two header heights
// (RES_ROW_H, RES_LANE_H, RES_LANE_GAP, RES_ROW_PAD, RES_HOUR_HDR_H,
// RES_GRP_HDR_H) all vary with the Density preference, so they're declared
// as local consts inside ResourcesView itself (shadowing these names)
// rather than as fixed module-level values.

interface ResourcesViewProps {
  eventsByDay: DayEvents;
  /** The currently selected day-of-month (managed by the parent toolbar). */
  day: number;
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  onClickEvent: (event: CalendarEvent, day: number, e: React.MouseEvent) => void;
  onHoverEvent: (event: CalendarEvent, day: number, e: React.MouseEvent) => void;
  onHoverLeave: () => void;
  /** ID of the event currently shown in the hover popover (for highlight ring). */
  hoveredEventId: string | null;
  currentMonth: number;
  currentYear: number;
  /** Resource filters from the sidebar's Resources tab. Empty array = no
   *  filter = show every row on that axis. When either list is non-empty,
   *  the corresponding section (Instructors / Venues) only renders rows
   *  for the checked resources — the rest are hidden entirely rather than
   *  just showing up empty, so filtering by a resource actually narrows
   *  the grid instead of leaving unrelated rows sitting there with
   *  nothing in them. */
  filterInstructors: string[];
  filterVenues: string[];
  statusVisibility?: ViewStatusVisibility;
  density?: ScheduleDensity;
  highlightMySessions?: boolean;
}

function ResourcesView({
  eventsByDay,
  day,
  sc,
  colors,
  isDark,
  onClickEvent,
  onHoverEvent,
  onHoverLeave,
  hoveredEventId,
  currentMonth,
  currentYear,
  filterInstructors,
  filterVenues,
  statusVisibility,
  density = "comfortable",
  highlightMySessions = false,
}: ResourcesViewProps) {
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const clampedDay = Math.min(Math.max(day, 1), daysInMonth);
  // Named `isDensityCompact` (rather than `isCompact`) because
  // renderEventBlock below declares its own unrelated local `isCompact`
  // (short-lane vs. full-height chip) — same word, different meaning, so
  // this avoids the two silently shadowing each other.
  const isDensityCompact = density === "compact";
  const mineRingColor = isDark ? "#00c4a0" : "#00c28a";

  // Only non-closed events for this day
  const events: CalendarEvent[] = (eventsByDay[clampedDay] ?? []).filter(
    (e) => e.type !== "closed"
  );

  // Build hours axis
  const hours: number[] = [];
  for (let h = RES_START_HOUR; h <= RES_END_HOUR; h++) hours.push(h);
  const totalW = hours.length * RES_COL_W;

  // Shadow the module-level row/lane constants for the rest of this
  // component when density is "compact" — every downstream usage below
  // (assignLanes, renderEventBlock, the row/lane math in the render body)
  // picks these up automatically since they're the same names.
  const RES_ROW_H = isDensityCompact ? 48 : 64;
  const RES_LANE_H = isDensityCompact ? 22 : 30;
  const RES_LANE_GAP = isDensityCompact ? 2 : 3;
  const RES_ROW_PAD = isDensityCompact ? 8 : 12;
  const RES_HOUR_HDR_H = isDensityCompact ? 30 : 36;
  const RES_GRP_HDR_H = isDensityCompact ? 24 : 28;

  const formatHour = (h: number) => {
    if (h === 0)  return "12am";
    if (h === 12) return "12pm";
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };

  /** Render a positioned event chip inside a resource row.
   *  Structure: outer absolutely-positioned placement shell → inner
   *  position:relative chip (the containing block for stripe overlays).
   *  `top`/`height` come from the caller's lane assignment (see
   *  assignLanes below) rather than being fixed — a resource row can
   *  hold several stacked lanes when it has multiple sessions inside the
   *  same hour, and each lane gets its own chip height. A chip always
   *  fills its full hour column (position/width are snapped to the hour
   *  the session starts in) rather than being sized/positioned by the
   *  session's real sub-hour start time or duration — several short
   *  sessions in the same resource's same hour stack vertically at this
   *  same horizontal spot instead of spreading out side by side, and the
   *  exact start–end time is communicated via the visible time-range
   *  label instead of chip geometry. */
  const renderEventBlock = (event: CalendarEvent, top: number, height: number) => {
    const startMins = parseEventTimeToMinutes(event.time);
    if (startMins < 0) return null;
    const hourIdx = Math.floor(startMins / 60) - RES_START_HOUR;
    if (hourIdx < 0 || hourIdx >= hours.length) return null;
    const left = hourIdx * RES_COL_W;
    const style     = colors[event.type] || colors.yoga;
    const isHovered = event.id === hoveredEventId;
    const width = RES_COL_W - 4;

    const timeRangeLabel = getSessionTimeRangeLabel(event);
    // A full-height (single-lane) chip has room for a title line plus a
    // second line (time range ± a capacity pill); a stacked lane is too
    // short for two lines, so it collapses to a single line that always
    // includes the time range — the whole point of showing a resource's
    // stacked sessions is to see exactly when each one starts and ends.
    const isCompact = height < 44;
    const showSecondLine = !isCompact && width >= 36;

    // ── Buffer stripes — fixed 12px, inside the chip (mirrors EventBadge) ──
    const STRIPE_W  = 12;
    const hasPre    = (event.preBuffer  ?? 0) > 0;
    const hasPost   = (event.postBuffer ?? 0) > 0;
    const padL      = hasPre  ? STRIPE_W + 2 : 6;
    const padR      = hasPost ? STRIPE_W + 2 : 6;
    // Stripe color: contrasts with the chip background in both states.
    const stripeColor = isHovered ? (isDark ? "#0a0e0f" : "#ffffff") : style.text;

    // ── Attendance indicator (mirrors EventBadge logic) ──────────────
    const hasCapacityData =
      event.capacity > 0 && event.type !== "closed" && event.type !== "league";
    const attendancePct  = hasCapacityData ? event.booked / event.capacity : 0;
    const isFull         = hasCapacityData && event.booked >= event.capacity;
    const isWaitlisted   = isFull && !!event.waitlistEnabled;
    const isNearlyFull   = !isFull && hasCapacityData && attendancePct >= 0.8;
    // Preferences tab can turn this indicator off per view AND per status
    // category; when the event's own category is off, `showCapacityIndicator`
    // gates both the full pill (single-lane) and the compact dot (stacked
    // lane) below so neither renders.
    const categoryVisible = hasCapacityData
      ? (statusVisibility ?? makeDefaultViewStatusVisibility())[
          registrationStatusCategoryOf(isFull, isWaitlisted, isNearlyFull)
        ]
      : false;
    const showCapacityIndicator = hasCapacityData && categoryVisible;
    const showStatusPill = showCapacityIndicator && showSecondLine;
    // Same red/yellow/green treatment as the Monthly/Weekly EventBadge time
    // chip: full = solid red, waitlisted = translucent red (red text), so
    // fullness reads identically across every schedule view.
    const statusBg       = isWaitlisted
      ? (isDark ? "rgba(224,90,90,0.18)" : "rgba(212,24,64,0.12)")
      : isFull
      ? EZ_RED
      : isNearlyFull ? "#FFE109" : EZ_GREEN;
    const statusColor    = isWaitlisted
      ? (isDark ? "#e05a5a" : "#d41840")
      : isFull
      ? EZ_RED_ON_COLOR
      : isNearlyFull ? "#111111" : EZ_GREEN_ON_COLOR;
    const statusLabel    = isFull ? (event.waitlistEnabled ? "Waitlist" : "Full") : isNearlyFull ? "Nearly full" : "Available";

    // "Highlight my sessions" — same ring + dim treatment as EventBadge.
    const isMine = highlightMySessions && event.instructor === CURRENT_USER_INSTRUCTOR;
    const dimNotMine = highlightMySessions && !isMine;

    return (
      // Outer shell: handles absolute placement within the row
      <div
        key={event.id}
        style={{
          position: "absolute",
          top: `${top}px`,
          height: `${height}px`,
          left: `${left + 2}px`,
          width: `${width}px`,
          zIndex: isHovered ? 3 : 1,
          // display:flex so the inner chip fills the shell's height
          display: "flex",
          alignItems: "stretch",
        }}
      >
        {/* Inner chip: position:relative is the containing block for stripes */}
        <div
          onClick={(e) => onClickEvent(event, clampedDay, e)}
          onMouseEnter={(e) => onHoverEvent(event, clampedDay, e)}
          onMouseLeave={onHoverLeave}
          title={[
            event.title,
            event.instructor && event.instructor !== "—" ? event.instructor : null,
            event.venue || null,
            timeRangeLabel,
            hasCapacityData ? `${event.booked}/${event.capacity}` : null,
          ].filter(Boolean).join(" · ")}
          style={{
            position: "relative",
            flex: 1,
            borderRadius: "5px",
            background: isHovered ? style.text : style.bg,
            border: `1px solid ${isHovered ? style.text : style.border}`,
            boxShadow: isMine ? `0 0 0 2px ${mineRingColor}` : undefined,
            opacity: dimNotMine ? 0.5 : 1,
            color: isHovered ? (isDark ? "#0a0e0f" : "#ffffff") : style.text,
            fontSize: "11px",
            fontWeight: 600,
            padding: isCompact ? `2px ${padR}px 2px ${padL}px` : `4px ${padR}px 4px ${padL}px`,
            overflow: "hidden",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "2px",
            boxSizing: "border-box",
            transition: "background 0.1s, border-color 0.1s, color 0.1s",
          }}
        >
          {/* Pre-buffer stripe — absolute, left edge of chip */}
          {hasPre && (
            <div
              aria-hidden
              title={`${event.preBuffer} min pre-buffer`}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: `${STRIPE_W}px`,
                pointerEvents: "none",
                backgroundImage: `repeating-linear-gradient(135deg, ${stripeColor} 0px, ${stripeColor} 1.5px, transparent 1.5px, transparent 5px)`,
                opacity: 0.5,
              }}
            />
          )}
          {/* Post-buffer stripe — absolute, right edge of chip */}
          {hasPost && (
            <div
              aria-hidden
              title={`${event.postBuffer} min post-buffer`}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                right: 0,
                width: `${STRIPE_W}px`,
                pointerEvents: "none",
                backgroundImage: `repeating-linear-gradient(135deg, ${stripeColor} 0px, ${stripeColor} 1.5px, transparent 1.5px, transparent 5px)`,
                opacity: 0.5,
              }}
            />
          )}

          {isCompact ? (
            // Stacked lane — one line only, but still needs its attendance
            // status: with several sessions from the same resource packed
            // into one hour, "which of these is full/nearly full/waitlisted"
            // is exactly the thing a glance at this row needs to answer, so
            // it can't be dropped just because the lane is short. Text gets
            // first claim on the line (title · start–end, or start–end
            // alone when narrow); the status pill is fixed-width and never
            // truncates, shrinking to a plain dot only once there's no room
            // left for its label.
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                overflow: "hidden",
                width: "100%",
                lineHeight: `${Math.max(10, height - 4)}px`,
              }}
            >
              <span
                style={{
                  flex: "1 1 auto",
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: "10px",
                }}
              >
                {width >= 70 ? `${event.title} · ${timeRangeLabel}` : timeRangeLabel}
              </span>
              {showCapacityIndicator && (
                width >= 100 ? (
                  <span
                    style={{
                      display: "inline-block",
                      flexShrink: 0,
                      background: isHovered
                        ? (isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.3)")
                        : statusBg,
                      color: isHovered ? (isDark ? "#0a0e0f" : "#ffffff") : statusColor,
                      fontSize: "9px",
                      fontWeight: 700,
                      lineHeight: "12px",
                      padding: "0px 4px",
                      borderRadius: "3px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {statusLabel}
                  </span>
                ) : (
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      flexShrink: 0,
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: isHovered
                        ? (isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.3)")
                        : statusBg,
                    }}
                  />
                )
              )}
            </div>
          ) : (
            <>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: "14px" }}>
                {event.title}
              </span>
              {showSecondLine && (
                showStatusPill ? (
                  // Time range always shown as plain text, with the status
                  // pill (Available / Nearly full / Full / Waitlist) next to
                  // it — same "text + separate pill" layout a stacked/compact
                  // lane uses, so a resource's single-lane and stacked hours
                  // read the same way.
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", overflow: "hidden" }}>
                    <span style={{ opacity: 0.65, fontWeight: 400, fontSize: "10px", lineHeight: "13px", whiteSpace: "nowrap", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {timeRangeLabel}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        flexShrink: 0,
                        background: isHovered
                          ? (isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.3)")
                          : statusBg,
                        color: isHovered ? (isDark ? "#0a0e0f" : "#ffffff") : statusColor,
                        fontSize: "10px",
                        fontWeight: 700,
                        lineHeight: "13px",
                        padding: "0px 4px",
                        borderRadius: "3px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100%",
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                ) : (
                  // No capacity data: plain time range
                  <span style={{ opacity: 0.65, fontWeight: 400, fontSize: "10px", lineHeight: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {timeRangeLabel}
                  </span>
                )
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  /** Groups a single resource's events by the HOUR they start in (the same
   *  fixed-width columns used for the header and grid lines), then stacks
   *  every session within one hour bucket into its own sequential vertical
   *  "lane" (sorted by start time). A resource can never truly be double-
   *  booked (see generateMockEvents' conflict-aware assignment), so within
   *  one hour bucket the sessions are already guaranteed non-overlapping —
   *  no interval-overlap math is needed, just a simple stack order. This
   *  also means a resource's sessions in two different hours each render
   *  as a single, un-stacked chip in their own hour column rather than
   *  competing for the same lane. */
  const assignLanes = (resourceEvents: CalendarEvent[]) => {
    const withHour = resourceEvents
      .map((event) => {
        const start = parseEventTimeToMinutes(event.time);
        if (start < 0) return null;
        return { event, start, hour: Math.floor(start / 60) };
      })
      .filter((e): e is { event: CalendarEvent; start: number; hour: number } => e !== null)
      .sort((a, b) => a.start - b.start);

    const hourCounts = new Map<number, number>();
    const laned: Array<{ event: CalendarEvent; lane: number }> = [];
    for (const { event, hour } of withHour) {
      const lane = hourCounts.get(hour) ?? 0;
      hourCounts.set(hour, lane + 1);
      laned.push({ event, lane });
    }
    const laneCount = hourCounts.size > 0 ? Math.max(...Array.from(hourCounts.values())) : 1;
    return { laned, laneCount: Math.max(1, laneCount) };
  };

  /** A row's height matches its single-lane default until it actually
   *  needs to stack — then it grows to fit every lane, per the "resource's
   *  row can grow to fit that hour slot" requirement. */
  const computeRowHeight = (laneCount: number) =>
    laneCount <= 1 ? RES_ROW_H : laneCount * RES_LANE_H + (laneCount - 1) * RES_LANE_GAP + RES_ROW_PAD;

  /** Vertical 1px lines at each hour boundary within a content row. */
  const renderGridLines = () =>
    hours.map((_, idx) => (
      <div
        key={idx}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${idx * RES_COL_W}px`,
          width: "1px",
          background: sc.border,
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />
    ));

  // Row lists for each section, narrowed by the sidebar's resource
  // filters. Empty filter list = show every resource on that axis; a
  // non-empty list hides every row not explicitly checked so filtering by
  // a resource actually removes the other rows instead of just leaving
  // them empty.
  const visibleInstructors = filterInstructors.length > 0
    ? INSTRUCTOR_OPTIONS.filter((name) => filterInstructors.includes(name))
    : INSTRUCTOR_OPTIONS;
  const visibleVenues = filterVenues.length > 0
    ? VENUE_OPTIONS.filter((name) => filterVenues.includes(name))
    : VENUE_OPTIONS;

  // Alternating row backgrounds
  const rowBg   = (i: number) => i % 2 === 1
    ? (isDark ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.016)")
    : "transparent";
  const labelBg = (i: number) => i % 2 === 1
    ? (isDark ? "#1d2a2f" : "#f1f3f4")
    : (isDark ? sc.cellBg : "#ffffff");

  // Semi-opaque background for sticky section headers so content behind
  // them is masked as it scrolls under.
  const sectionHdrBg = isDark
    ? "rgba(24,32,35,0.97)"
    : "rgba(247,248,249,0.97)";

  // Reusable label cell style for a resource row
  const labelCellStyle = (i: number): CSSProperties => ({
    position: "sticky",
    left: 0,
    width: `${RES_LABEL_W}px`,
    flexShrink: 0,
    borderRight: `1px solid ${sc.border}`,
    background: labelBg(i),
    display: "flex",
    alignItems: "center",
    padding: "0 12px",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: sc.body,
    zIndex: 2,
    overflow: "hidden",
    boxSizing: "border-box",
  });

  return (
    <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Main grid — single overflow:auto for sticky in both axes ── */}
      <div style={{ flex: "1 1 0", minHeight: 0, overflow: "auto" }}>
        <div style={{ minWidth: `${RES_LABEL_W + totalW}px`, display: "flex", flexDirection: "column" }}>

          {/* Sticky hour header row */}
          <div
            style={{
              display: "flex",
              position: "sticky",
              top: 0,
              zIndex: 5,
              height: `${RES_HOUR_HDR_H}px`,
              flexShrink: 0,
              borderBottom: `1px solid ${sc.border}`,
            }}
          >
            {/* Top-left corner cell — sticky in both axes */}
            <div
              style={{
                position: "sticky",
                left: 0,
                width: `${RES_LABEL_W}px`,
                flexShrink: 0,
                background: sc.headerBg,
                borderRight: `1px solid ${sc.border}`,
                zIndex: 6,
              }}
            />
            {/* Hour column headers */}
            {hours.map((h) => (
              <div
                key={h}
                style={{
                  width: `${RES_COL_W}px`,
                  flexShrink: 0,
                  background: sc.headerBg,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: "8px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: sc.muted,
                  borderRight: `1px solid ${sc.border}`,
                  boxSizing: "border-box",
                }}
              >
                {formatHour(h)}
              </div>
            ))}
          </div>

          {/* ── INSTRUCTORS section ────────────────────────────────── */}
          {/* Section header — sticks just below the hour header */}
          <div
            style={{
              display: "flex",
              position: "sticky",
              top: `${RES_HOUR_HDR_H}px`,
              zIndex: 4,
              height: `${RES_GRP_HDR_H}px`,
              flexShrink: 0,
              borderBottom: `1px solid ${sc.border}`,
              background: sectionHdrBg,
            }}
          >
            <div
              style={{
                position: "sticky",
                left: 0,
                width: `${RES_LABEL_W}px`,
                flexShrink: 0,
                background: sectionHdrBg,
                borderRight: `1px solid ${sc.border}`,
                display: "flex",
                alignItems: "center",
                paddingLeft: "12px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: sc.muted,
                zIndex: 5,
                boxSizing: "border-box",
              }}
            >
              Instructors
            </div>
            <div style={{ flex: 1, background: sectionHdrBg }} />
          </div>

          {/* Instructor rows — height grows to fit whichever hour that
              instructor has the most stacked back-to-back sessions in. */}
          {visibleInstructors.map((name, i) => {
            const { laned, laneCount } = assignLanes(events.filter((e) => e.instructor === name));
            const rowHeight = computeRowHeight(laneCount);
            const chipHeight = laneCount <= 1 ? RES_ROW_H - RES_ROW_PAD : RES_LANE_H;
            return (
              <div
                key={name}
                style={{
                  display: "flex",
                  height: `${rowHeight}px`,
                  flexShrink: 0,
                  borderBottom: `1px solid ${sc.border}`,
                  background: rowBg(i),
                }}
              >
                <div style={labelCellStyle(i)}>
                  <User size={13} style={{ color: sc.muted, flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name}
                  </span>
                </div>
                <div style={{ position: "relative", minWidth: `${totalW}px`, flex: "1 0 auto" }}>
                  {renderGridLines()}
                  {laned.map(({ event, lane }) =>
                    renderEventBlock(event, RES_ROW_PAD / 2 + lane * (chipHeight + RES_LANE_GAP), chipHeight)
                  )}
                </div>
              </div>
            );
          })}

          {/* ── VENUES section ─────────────────────────────────────── */}
          {/* Section header */}
          <div
            style={{
              display: "flex",
              position: "sticky",
              top: `${RES_HOUR_HDR_H}px`,
              zIndex: 4,
              height: `${RES_GRP_HDR_H}px`,
              flexShrink: 0,
              borderTop: `2px solid ${sc.border}`,
              borderBottom: `1px solid ${sc.border}`,
              background: sectionHdrBg,
            }}
          >
            <div
              style={{
                position: "sticky",
                left: 0,
                width: `${RES_LABEL_W}px`,
                flexShrink: 0,
                background: sectionHdrBg,
                borderRight: `1px solid ${sc.border}`,
                display: "flex",
                alignItems: "center",
                paddingLeft: "12px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: sc.muted,
                zIndex: 5,
                boxSizing: "border-box",
              }}
            >
              Venues
            </div>
            <div style={{ flex: 1, background: sectionHdrBg }} />
          </div>

          {/* Venue rows — same stacking/growth behavior as instructor rows. */}
          {visibleVenues.map((name, i) => {
            const { laned, laneCount } = assignLanes(events.filter((e) => e.venue === name));
            const rowHeight = computeRowHeight(laneCount);
            const chipHeight = laneCount <= 1 ? RES_ROW_H - RES_ROW_PAD : RES_LANE_H;
            return (
              <div
                key={name}
                style={{
                  display: "flex",
                  height: `${rowHeight}px`,
                  flexShrink: 0,
                  borderBottom: `1px solid ${sc.border}`,
                  background: rowBg(i),
                }}
              >
                <div style={labelCellStyle(i)}>
                  <MapPin size={13} style={{ color: sc.muted, flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name}
                  </span>
                </div>
                <div style={{ position: "relative", minWidth: `${totalW}px`, flex: "1 0 auto" }}>
                  {renderGridLines()}
                  {laned.map(({ event, lane }) =>
                    renderEventBlock(event, RES_ROW_PAD / 2 + lane * (chipHeight + RES_LANE_GAP), chipHeight)
                  )}
                </div>
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — WeeklyView (hour × day-of-week grid)
   Mirrors ResourcesView's grid, rotated: hours run down the sticky left
   column and each of the 7 columns is a day of the selected week (Monday →
   Sunday) instead of a resource. Two deliberate differences from
   ResourcesView:
     • Day columns stretch to fill the available width (flex:1) rather than
       using fixed 90px-per-hour columns, since 7 columns fit comfortably
       without horizontal scrolling.
     • Hour rows are NOT a fixed height. Each row is a flex container and
       every day cell inside it stacks its events in normal block flow
       (no absolute positioning needed, since a cell only ever needs to
       hold "the events at this hour" rather than being time-precise).
       Flexbox's default stretch behavior then grows the row to match its
       busiest day automatically — so a packed Monday-9am cell is never
       truncated, and quieter days in that same row just show extra empty
       space underneath their events, exactly as intended.
   ═══════════════════════════════════════════════════════════════════════ */

/** Width in px of the sticky hour-label column. */
const WK_HOUR_LABEL_W = 72;
// Minimum hour-row height varies with the Density preference, so it's
// declared as a local const inside WeeklyView itself (shadowing this name).

/* ─── WeeklyEventChip ─────────────────────────────────────────────────
   Weekly's day-hour cells have real room to breathe (unlike Monthly's
   compact grid), so registration status here is shown the same way
   ResourcesView shows it — a plain time label plus a separate colored
   status pill — rather than Monthly's colored badge wrapped around the
   time itself. Deliberately its own component (not a shared one with
   EventBadge) since the two layouts genuinely differ: this one is a
   two-line block (title, then time + pill) sized by content and stacked
   in normal flow, where EventBadge is a single-line pill sized to a
   fixed row height. Delete Mode and "highlight my sessions" mirror
   EventBadge's treatment so those two behaviors stay consistent across
   every view that has them.
   ───────────────────────────────────────────────────────────────────── */
function WeeklyEventChip({
  event,
  isSelected,
  onClick,
  onHoverEnter,
  onHoverLeave,
  colors,
  isDark,
  deleteMode = false,
  statusVisibility,
  density = "comfortable",
  highlightMySessions = false,
}: {
  event: CalendarEvent;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onHoverEnter?: (e: React.MouseEvent) => void;
  onHoverLeave?: () => void;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  deleteMode?: boolean;
  statusVisibility?: ViewStatusVisibility;
  density?: ScheduleDensity;
  highlightMySessions?: boolean;
}) {
  const style = colors[event.type] || colors.yoga;
  const isCompact = density === "compact";

  const hasPre = (event.preBuffer ?? 0) > 0;
  const hasPost = (event.postBuffer ?? 0) > 0;

  // Delete Mode — same convention as EventBadge/DailyView: dashed red for
  // events a click will remove, dimmed for everything else.
  const isDeletable = deleteMode && event.booked === 0 && event.type !== "league";
  const dimNonDeletable = deleteMode && !isDeletable;

  // "Highlight my sessions" — same ring + dim treatment as EventBadge.
  const isMine = highlightMySessions && event.instructor === CURRENT_USER_INSTRUCTOR;
  const dimNotMine = highlightMySessions && !isMine;
  const mineRingColor = isDark ? "#00c4a0" : "#00c28a";

  // Registration status — mirrors ResourcesView's category logic exactly,
  // including the Preferences tab's per-category visibility check.
  const hasCapacityData = event.capacity > 0 && event.type !== "league";
  const attendancePct = hasCapacityData ? event.booked / event.capacity : 0;
  const isFull = hasCapacityData && event.booked >= event.capacity;
  const isWaitlisted = isFull && !!event.waitlistEnabled;
  const isNearlyFull = !isFull && hasCapacityData && attendancePct >= 0.8;
  const categoryVisible = hasCapacityData
    ? (statusVisibility ?? makeDefaultViewStatusVisibility())[
        registrationStatusCategoryOf(isFull, isWaitlisted, isNearlyFull)
      ]
    : false;
  const showStatusPill = hasCapacityData && categoryVisible;
  const statusBg = isWaitlisted
    ? (isDark ? "rgba(224,90,90,0.18)" : "rgba(212,24,64,0.12)")
    : isFull
    ? EZ_RED
    : isNearlyFull ? "#FFE109" : EZ_GREEN;
  const statusColor = isWaitlisted
    ? (isDark ? "#e05a5a" : "#d41840")
    : isFull
    ? EZ_RED_ON_COLOR
    : isNearlyFull ? "#111111" : EZ_GREEN_ON_COLOR;
  const statusLabel = isFull ? (event.waitlistEnabled ? "Waitlist" : "Full") : isNearlyFull ? "Nearly full" : "Available";

  const timeRangeLabel = getSessionTimeRangeLabel(event);

  const STRIPE_W = 12;
  const basePad = isCompact ? 6 : 8;
  const padL = hasPre ? STRIPE_W + 2 : basePad;
  const padR = hasPost ? STRIPE_W + 2 : basePad;

  const deletableColor = isDark ? "#e05a5a" : "#d41840";
  const stripeColor = isSelected ? (isDark ? "#0a0e0f" : "#ffffff") : style.text;

  return (
    <div
      onClick={onClick}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      title={[
        event.title,
        event.instructor && event.instructor !== "—" ? event.instructor : null,
        event.venue || null,
        timeRangeLabel,
        hasCapacityData ? `${event.booked}/${event.capacity}` : null,
      ].filter(Boolean).join(" · ")}
      style={{
        position: "relative",
        borderRadius: "5px",
        background: isDeletable
          ? (isDark ? "rgba(224,90,90,0.12)" : "rgba(212,24,64,0.10)")
          : isSelected ? style.text : style.bg,
        border: isDeletable
          ? `1px dashed ${deletableColor}`
          : `1px solid ${isSelected ? style.text : style.border}`,
        boxShadow: isMine ? `0 0 0 2px ${mineRingColor}` : undefined,
        color: isDeletable ? deletableColor : isSelected ? (isDark ? "#0a0e0f" : "#ffffff") : style.text,
        opacity: dimNonDeletable ? 0.4 : dimNotMine ? 0.45 : 1,
        padding: isCompact ? `3px ${padR}px 3px ${padL}px` : `5px ${padR}px 5px ${padL}px`,
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        overflow: "hidden",
        cursor: dimNonDeletable ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {hasPre && (
        <div
          aria-hidden
          title={`${event.preBuffer} min pre-buffer`}
          style={{
            position: "absolute", top: 0, bottom: 0, left: 0, width: `${STRIPE_W}px`,
            pointerEvents: "none",
            backgroundImage: `repeating-linear-gradient(135deg, ${stripeColor} 0px, ${stripeColor} 1.5px, transparent 1.5px, transparent 5px)`,
            opacity: 0.5,
          }}
        />
      )}
      {hasPost && (
        <div
          aria-hidden
          title={`${event.postBuffer} min post-buffer`}
          style={{
            position: "absolute", top: 0, bottom: 0, right: 0, width: `${STRIPE_W}px`,
            pointerEvents: "none",
            backgroundImage: `repeating-linear-gradient(135deg, ${stripeColor} 0px, ${stripeColor} 1.5px, transparent 1.5px, transparent 5px)`,
            opacity: 0.5,
          }}
        />
      )}

      {/* Title line */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
        {event.type === "league" && <Trophy size={11} style={{ flexShrink: 0 }} />}
        <span
          style={{
            fontWeight: 700,
            fontSize: isCompact ? "11px" : "12px",
            lineHeight: "15px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {event.title}
        </span>
      </div>

      {/* Second line — plain time range, plus a separate status pill
          (rather than coloring the time itself, since there's room here
          for the two to sit side by side). */}
      {event.time && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
          <span
            style={{
              opacity: 0.7,
              fontWeight: 400,
              fontSize: isCompact ? "10px" : "11px",
              lineHeight: "13px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {timeRangeLabel}
          </span>
          {showStatusPill && (
            <span
              style={{
                flexShrink: 0,
                background: isSelected
                  ? (isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.3)")
                  : statusBg,
                color: isSelected ? (isDark ? "#0a0e0f" : "#ffffff") : statusColor,
                fontSize: "9px",
                fontWeight: 700,
                lineHeight: "13px",
                padding: "0 5px",
                borderRadius: "3px",
                whiteSpace: "nowrap",
              }}
            >
              {statusLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface WeeklyViewProps {
  eventsByDay: DayEvents;
  /** Monday of the currently displayed week. */
  weekStart: Date;
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  onClickEvent: (event: CalendarEvent, day: number, e: React.MouseEvent) => void;
  /** `dateOverride` carries the hovered cell's actual month/year — a week
   *  can straddle two months, so the day number alone isn't enough to
   *  label the hover popover correctly. */
  onHoverEvent: (
    event: CalendarEvent,
    day: number,
    e: React.MouseEvent,
    dateOverride?: { month: number; year: number }
  ) => void;
  onHoverLeave: () => void;
  hoveredEventId: string | null;
  deleteMode?: boolean;
  statusVisibility?: ViewStatusVisibility;
  density?: ScheduleDensity;
  highlightMySessions?: boolean;
  /** "View by resource" toggle — when true, the left hour-of-day column is
   *  replaced with a resource column (Instructors, then Venues — same
   *  grouping/order as the standalone Resources view), and each day's
   *  events are grouped by resource instead of by hour. */
  viewByResource?: boolean;
  /** Resource filters from the sidebar's Resources tab — same narrowing
   *  behavior as ResourcesView: empty = show every resource on that axis. */
  filterInstructors?: string[];
  filterVenues?: string[];
}

function WeeklyView({
  eventsByDay,
  weekStart,
  sc,
  colors,
  isDark,
  onClickEvent,
  onHoverEvent,
  onHoverLeave,
  hoveredEventId,
  deleteMode = false,
  statusVisibility,
  density = "comfortable",
  highlightMySessions,
  viewByResource = false,
  filterInstructors = [],
  filterVenues = [],
}: WeeklyViewProps) {
  const today = new Date();
  const isSameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  // Shadows the module-level WK_MIN_ROW_H for the rest of this component.
  const WK_MIN_ROW_H = density === "compact" ? 40 : 56;

  // The 7 dates spanned by the week (Mon → Sun). Mock events are keyed only
  // by day-of-month (see `DayEvents`), so a week that crosses a month
  // boundary simply looks each date up by its own day-of-month number —
  // the same convention ResourcesView and the Monthly grid already rely on.
  const weekDates: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours: number[] = [];
  for (let h = RES_START_HOUR; h <= RES_END_HOUR; h++) hours.push(h);

  const formatHour = (h: number) => {
    if (h === 0) return "12am";
    if (h === 12) return "12pm";
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };

  // Non-closed events for a given date, bucketed by hour. Closed / all-day
  // markers have no parseable time and are excluded — the same rule
  // ResourcesView applies, since there's no single hour cell to place them in.
  const eventsForDateAtHour = (date: Date, hour: number): CalendarEvent[] => {
    const dayEvents = eventsByDay[date.getDate()] ?? [];
    return dayEvents.filter((e) => {
      if (e.type === "closed") return false;
      const mins = parseEventTimeToMinutes(e.time);
      return mins !== -1 && Math.floor(mins / 60) === hour;
    });
  };

  // ── "View by resource" support ──────────────────────────────────────
  // Row axis becomes resources (Instructors, then Venues) instead of
  // hours. A day's cell shows every session where that resource is
  // involved, time-sorted — exactly like ResourcesView, a session that
  // has both an instructor and a venue shows up once in each of their
  // rows, i.e. it's duplicated across resources rather than picking one.
  const visibleInstructors = filterInstructors.length > 0
    ? INSTRUCTOR_OPTIONS.filter((name) => filterInstructors.includes(name))
    : INSTRUCTOR_OPTIONS;
  const visibleVenues = filterVenues.length > 0
    ? VENUE_OPTIONS.filter((name) => filterVenues.includes(name))
    : VENUE_OPTIONS;
  type ResourceRow = { kind: "instructor" | "venue"; name: string };
  const resourceRows: ResourceRow[] = [
    ...visibleInstructors.map((name): ResourceRow => ({ kind: "instructor", name })),
    ...visibleVenues.map((name): ResourceRow => ({ kind: "venue", name })),
  ];

  const eventsForDateByResource = (date: Date, resource: ResourceRow): CalendarEvent[] => {
    const dayEvents = eventsByDay[date.getDate()] ?? [];
    return dayEvents
      .filter((e) => {
        if (e.type === "closed") return false;
        return resource.kind === "instructor" ? e.instructor === resource.name : e.venue === resource.name;
      })
      .sort((a, b) => parseEventTimeToMinutes(a.time) - parseEventTimeToMinutes(b.time));
  };

  // Left label column widens in resource mode — a resource name needs
  // more room than a 3-4 character hour label.
  const labelW = viewByResource ? RES_LABEL_W : WK_HOUR_LABEL_W;

  /** One day column's worth of event chips, stacked in normal flow —
   *  shared by both the by-hour grid and the by-resource grid so a chip
   *  looks and behaves identically in either mode. */
  const renderDayCell = (date: Date, di: number, cellEvents: CalendarEvent[]) => (
    <div
      key={di}
      style={{
        flex: "1 1 0",
        minWidth: 0,
        padding: "3px",
        borderRight: `1px solid ${sc.border}`,
        boxSizing: "border-box",
      }}
    >
      {cellEvents.map((event) => (
        <div key={event.id} style={{ marginBottom: "3px" }}>
          <WeeklyEventChip
            event={event}
            isSelected={event.id === hoveredEventId}
            onClick={(e) => onClickEvent(event, date.getDate(), e)}
            onHoverEnter={(e) =>
              onHoverEvent(event, date.getDate(), e, {
                month: date.getMonth(),
                year: date.getFullYear(),
              })
            }
            onHoverLeave={onHoverLeave}
            colors={colors}
            isDark={isDark}
            deleteMode={deleteMode}
            statusVisibility={statusVisibility}
            density={density}
            highlightMySessions={highlightMySessions}
          />
        </div>
      ))}
    </div>
  );

  // Semi-opaque background for the sticky "Instructors"/"Venues" group
  // headers in resource mode — same treatment as ResourcesView.
  const sectionHdrBg = isDark ? "rgba(24,32,35,0.97)" : "rgba(247,248,249,0.97)";

  // Alternating hour-row background for scan-ability across a tall grid.
  const rowBg = (i: number) =>
    i % 2 === 1 ? (isDark ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.016)") : "transparent";

  return (
    <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: "1 1 0", minHeight: 0, overflow: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", minWidth: "100%" }}>

          {/* Sticky day-header row */}
          <div
            style={{
              display: "flex",
              position: "sticky",
              top: 0,
              zIndex: 5,
              borderBottom: `1px solid ${sc.border}`,
              background: sc.headerBg,
            }}
          >
            {/* Top-left corner cell — sticky in both axes */}
            <div
              style={{
                width: `${labelW}px`,
                flexShrink: 0,
                position: "sticky",
                left: 0,
                background: sc.headerBg,
                borderRight: `1px solid ${sc.border}`,
                zIndex: 6,
              }}
            />
            {weekDates.map((date, i) => {
              const isToday = isSameDate(date, today);
              return (
                <div
                  key={i}
                  style={{
                    flex: "1 1 0",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    padding: "10px 4px",
                    borderRight: `1px solid ${sc.border}`,
                    background: sc.headerBg,
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: isToday ? sc.brand : sc.muted,
                    }}
                  >
                    {DAYS_OF_WEEK_FULL[date.getDay()]}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      fontSize: "15px",
                      fontWeight: 700,
                      color: isToday ? (isDark ? "#0a0e0f" : "#ffffff") : sc.heading,
                      background: isToday ? sc.brand : "transparent",
                    }}
                  >
                    {date.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {viewByResource ? (
            /* ── By-resource rows — Instructors, then Venues, same
                 grouping/order as the standalone Resources view. A session
                 with both an instructor and a venue appears once in each
                 matching row (duplicated across resources), same as
                 ResourcesView. ── */
            <>
              {(["instructor", "venue"] as const).map((kind) => {
                const rowsForKind = resourceRows.filter((r) => r.kind === kind);
                if (rowsForKind.length === 0) return null;
                return (
                  <div key={kind}>
                    {/* Section header — scrolls with content (not sticky
                        vertically, since Weekly's day-header row above
                        doesn't have a fixed height to stack a second sticky
                        header underneath). Label cell stays sticky
                        horizontally so it lines up with the resource rows
                        below it as the grid scrolls sideways. */}
                    <div
                      style={{
                        display: "flex",
                        height: "28px",
                        flexShrink: 0,
                        borderTop: kind === "venue" ? `2px solid ${sc.border}` : undefined,
                        borderBottom: `1px solid ${sc.border}`,
                        background: sectionHdrBg,
                      }}
                    >
                      <div
                        style={{
                          position: "sticky",
                          left: 0,
                          width: `${labelW}px`,
                          flexShrink: 0,
                          background: sectionHdrBg,
                          borderRight: `1px solid ${sc.border}`,
                          display: "flex",
                          alignItems: "center",
                          paddingLeft: "12px",
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.07em",
                          textTransform: "uppercase",
                          color: sc.muted,
                          zIndex: 5,
                          boxSizing: "border-box",
                        }}
                      >
                        {kind === "instructor" ? "Instructors" : "Venues"}
                      </div>
                      <div style={{ flex: 1, background: sectionHdrBg }} />
                    </div>

                    {rowsForKind.map((resource, ri) => (
                      <div
                        key={resource.name}
                        style={{
                          display: "flex",
                          alignItems: "stretch",
                          minHeight: `${WK_MIN_ROW_H}px`,
                          borderBottom: `1px solid ${sc.border}`,
                          background: rowBg(ri),
                        }}
                      >
                        {/* Sticky resource label */}
                        <div
                          style={{
                            width: `${labelW}px`,
                            flexShrink: 0,
                            position: "sticky",
                            left: 0,
                            background: isDark ? sc.cellBg : "#ffffff",
                            borderRight: `1px solid ${sc.border}`,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "0 12px",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: sc.body,
                            boxSizing: "border-box",
                            zIndex: 2,
                          }}
                        >
                          {resource.kind === "instructor" ? (
                            <User size={13} style={{ color: sc.muted, flexShrink: 0 }} />
                          ) : (
                            <MapPin size={13} style={{ color: sc.muted, flexShrink: 0 }} />
                          )}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {resource.name}
                          </span>
                        </div>

                        {weekDates.map((date, di) =>
                          renderDayCell(date, di, eventsForDateByResource(date, resource))
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          ) : (
            /* Hour rows — height is intentionally NOT fixed; flexbox stretch
                (the row's default cross-axis behavior) grows every cell in a
                row to match whichever day needs the most space. */
            hours.map((h, hi) => (
              <div
                key={h}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  minHeight: `${WK_MIN_ROW_H}px`,
                  borderBottom: `1px solid ${sc.border}`,
                  background: rowBg(hi),
                }}
              >
                {/* Sticky hour label */}
                <div
                  style={{
                    width: `${labelW}px`,
                    flexShrink: 0,
                    position: "sticky",
                    left: 0,
                    background: isDark ? sc.cellBg : "#ffffff",
                    borderRight: `1px solid ${sc.border}`,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-end",
                    padding: "6px 8px 0 0",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: sc.muted,
                    boxSizing: "border-box",
                    zIndex: 2,
                  }}
                >
                  {formatHour(h)}
                </div>

                {weekDates.map((date, di) => renderDayCell(date, di, eventsForDateAtHour(date, h)))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — DailyView (single-day session list, desktop-sized)
   Mirrors the mobile day list's core idea — one row per session, sorted
   chronologically — but sized and laid out for the desktop calendar zone.
   Unlike mobile, instructor/venue sit inline on the row instead of behind
   a tap, and — since desktop has the room — each session also surfaces a
   registered-clients breakdown by status and a truncated name preview
   directly, with no hover state: a click always opens the full
   Reservation Details panel, exactly like tapping a row on mobile does.
   ═══════════════════════════════════════════════════════════════════════ */

/** How many client names to preview inline before collapsing to "+N more". */
const DAILY_NAME_PREVIEW_COUNT = 4;

interface DailyViewProps {
  /** Every event for the single displayed day (closed markers included). */
  events: CalendarEvent[];
  /** Day-of-month the list is showing, forwarded to onClickEvent. */
  day: number;
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  onClickEvent: (event: CalendarEvent, day: number, e: React.MouseEvent) => void;
  deleteMode?: boolean;
  /** Preferences tab display setting, per status category — when a
   *  session's category is false, hides the colored capacity meter for it
   *  (booked/capacity text and everything else stays either way). */
  statusVisibility?: ViewStatusVisibility;
  density?: ScheduleDensity;
  highlightMySessions?: boolean;
  /** "View by resource" toggle — when true, adds a resource column on the
   *  left (Instructors, then Venues — same grouping/order as the
   *  standalone Resources view) and groups the day's sessions under it
   *  instead of showing one flat chronological list. */
  viewByResource?: boolean;
  /** Resource filters from the sidebar's Resources tab — same narrowing
   *  behavior as ResourcesView: empty = show every resource on that axis. */
  filterInstructors?: string[];
  filterVenues?: string[];
}

function DailyView({
  events,
  day,
  sc,
  colors,
  isDark,
  onClickEvent,
  deleteMode = false,
  statusVisibility,
  density = "comfortable",
  highlightMySessions = false,
  viewByResource = false,
  filterInstructors = [],
  filterVenues = [],
}: DailyViewProps) {
  // Closed/all-day markers render as a banner up top rather than a normal
  // session row — they have no time to sort by and no registrations.
  const closedEvents = events.filter((e) => e.type === "closed");
  const sessionEvents = events
    .filter((e) => e.type !== "closed")
    .slice()
    .sort((a, b) => parseEventTimeToMinutes(a.time) - parseEventTimeToMinutes(b.time));

  const statusPillColors = getStatusPillColors(isDark);
  const deletableColor = isDark ? "#e05a5a" : "#d41840";
  const mineRingColor = isDark ? "#00c4a0" : "#00c28a";
  const isCompact = density === "compact";
  const rowPadding = isCompact ? "10px 24px" : "16px 24px";

  // ── "View by resource" support ──────────────────────────────────────
  // Same grouping/order and duplication rule as ResourcesView: a session
  // with both an instructor and a venue shows up once under each.
  const visibleInstructors = filterInstructors.length > 0
    ? INSTRUCTOR_OPTIONS.filter((name) => filterInstructors.includes(name))
    : INSTRUCTOR_OPTIONS;
  const visibleVenues = filterVenues.length > 0
    ? VENUE_OPTIONS.filter((name) => filterVenues.includes(name))
    : VENUE_OPTIONS;
  const sectionHdrBg = isDark ? "rgba(24,32,35,0.97)" : "rgba(247,248,249,0.97)";
  const resourceLabelCellStyle: CSSProperties = {
    width: `${RES_LABEL_W}px`,
    flexShrink: 0,
    borderRight: `1px solid ${sc.border}`,
    background: isDark ? sc.cellBg : "#ffffff",
    display: "flex",
    alignItems: "flex-start",
    padding: "16px 12px",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: sc.body,
    boxSizing: "border-box",
  };

  return (
    <div style={{ flex: "1 1 0", minHeight: 0, overflow: "auto" }}>
      {closedEvents.map((event) => (
        <div
          key={event.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: rowPadding,
            borderBottom: `1px solid ${sc.border}`,
            background: isDark ? "rgba(161,189,198,0.06)" : "rgba(0,0,0,0.02)",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: (colors[event.type] || colors.closed).text,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "15px", fontWeight: 600, color: sc.heading }}>
            {event.title || "Closed"}
          </span>
          <span style={{ fontSize: "13px", color: sc.muted }}>All day</span>
        </div>
      ))}

      {sessionEvents.length === 0 && closedEvents.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", fontSize: "14px", color: sc.muted }}>
          No sessions scheduled for this day.
        </div>
      )}

      {(() => {
      /** One session row — dot, time, title, instructor/venue, status button,
       *  plus the capacity/registration line underneath. Shared by the flat
       *  chronological list and the by-resource grouping so a session looks
       *  and behaves identically in either mode.
       *  `omitResourceKind` — when a row is rendered inside a resource
       *  group (e.g. under Sarah Chen's Instructors row), the group label
       *  already identifies that resource, so the inline instructor/venue
       *  text next to the status button skips it and only shows the
       *  *other* resource (e.g. just "Studio A" instead of
       *  "Sarah Chen · Studio A"). The flat chronological list passes
       *  nothing and always shows both. */
      const renderSessionRow = (event: CalendarEvent, omitResourceKind?: "instructor" | "venue") => {
        const style = colors[event.type] || colors.yoga;
        const hasCapacity = event.capacity > 0;
        const available = Math.max(0, event.capacity - event.booked);
        const isFull = hasCapacity && available === 0;
        const isWaitlisted = isFull && !!event.waitlistEnabled;
        const bookedPct = hasCapacity ? Math.min(100, (event.booked / event.capacity) * 100) : 0;
        const isNearlyFull = hasCapacity && !isFull && bookedPct >= 80;
        // Registration meter fill — same fullness palette as the Monthly/
        // Weekly time chip and the Resources view status pill (green /
        // yellow / red, translucent red once a waitlist opens), so a
        // session's "how full is it" signal reads identically everywhere.
        const meterColor = isWaitlisted
          ? (isDark ? "rgba(224,90,90,0.55)" : "rgba(212,24,64,0.5)")
          : isFull
          ? EZ_RED
          : isNearlyFull
          ? "#FFE109"
          : EZ_GREEN;
        // Preferences tab, per status category — the meter for this
        // specific session only renders when its own category is visible.
        const showMeter = hasCapacity
          ? (statusVisibility ?? makeDefaultViewStatusVisibility())[
              registrationStatusCategoryOf(isFull, isWaitlisted, isNearlyFull)
            ]
          : false;

        const clients = hasCapacity ? getEventClients(event) : [];
        const statusCounts = hasCapacity ? getClientStatusCounts(event) : null;
        // Overdue-balance count — reuses the same red accent as the
        // ReservationDetailsPanel's "Overdue" filter pill and per-client
        // balance badge so the signal reads consistently across the app.
        const owedCount = hasCapacity ? getOwedCount(event) : 0;
        const previewNames = clients.slice(0, DAILY_NAME_PREVIEW_COUNT).map((c) => c.name);
        const remainingCount = clients.length - previewNames.length;

        /* Status button — mirrors MobileEventRow's Book / Waitlist / Full states. */
        let statusLabel = "Book";
        let statusStyle: CSSProperties = {
          padding: "6px 12px",
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: 600,
          border: "none",
          background: sc.brand,
          color: isDark ? "#0a0e0f" : "#101828",
          cursor: "pointer",
        };
        if (isFull && event.waitlistEnabled) {
          statusLabel = "Waitlist";
          statusStyle = { ...statusStyle, background: "transparent", border: `1px solid ${sc.brand}`, color: sc.brand };
        } else if (isFull) {
          statusLabel = "Full";
          statusStyle = { ...statusStyle, background: sc.muted, color: sc.cellBg, cursor: "default", opacity: 0.6 };
        }

        // Delete Mode styling mirrors EventBadge's convention: dashed red
        // for events a click will remove, dimmed for everything else.
        const isDeletable = deleteMode && event.booked === 0 && event.type !== "league";
        const dimNonDeletable = deleteMode && !isDeletable;

        // "Highlight my sessions" — mirrors EventBadge's ring + dim
        // treatment. Delete Mode's dashed-red border takes priority over
        // the "mine" accent if both are somehow active at once.
        const isMine = highlightMySessions && event.instructor === CURRENT_USER_INSTRUCTOR;
        const dimNotMine = highlightMySessions && !isMine;

        return (
          <div
            key={event.id}
            onClick={(e) => onClickEvent(event, day, e)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: isCompact ? "6px" : "10px",
              padding: rowPadding,
              borderBottom: `1px solid ${sc.border}`,
              borderLeft: isDeletable
                ? `3px dashed ${deletableColor}`
                : isMine
                ? `3px solid ${mineRingColor}`
                : "3px solid transparent",
              background: isDeletable ? (isDark ? "rgba(224,90,90,0.06)" : "rgba(212,24,64,0.04)") : "transparent",
              opacity: dimNonDeletable ? 0.5 : dimNotMine ? 0.55 : 1,
              cursor: "pointer",
            }}
          >
            {/* Top line — dot, time, title, instructor/venue, status button */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: style.text, flexShrink: 0 }} />
              <span style={{ fontSize: "15px", fontWeight: 700, color: sc.heading, flexShrink: 0 }}>{event.time}</span>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: sc.heading,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {event.title}
              </span>
              <span style={{ flex: 1, minWidth: "12px" }} />
              <span style={{ fontSize: "13px", fontWeight: 500, color: sc.muted, flexShrink: 0, whiteSpace: "nowrap" }}>
                {[
                  omitResourceKind !== "instructor" && event.instructor && event.instructor !== "—"
                    ? event.instructor
                    : null,
                  omitResourceKind !== "venue" && event.venue ? event.venue : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {hasCapacity && <button style={{ ...statusStyle, flexShrink: 0 }}>{statusLabel}</button>}
            </div>

            {/* Second line — capacity bar, registration-status breakdown,
                and a truncated preview of who's registered. */}
            {hasCapacity && (
              <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingLeft: "20px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  {/* Capacity meter — hidden entirely under the Preferences
                      tab's "hide registration status" setting; the plain
                      booked/capacity count below stays either way. */}
                  {showMeter && (
                    <div
                      style={{
                        width: "80px",
                        height: "6px",
                        borderRadius: "3px",
                        background: sc.track,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          bottom: 0,
                          width: `${bookedPct}%`,
                          borderRadius: "3px",
                          background: meterColor,
                        }}
                      />
                    </div>
                  )}
                  <span style={{ fontSize: "12px", fontWeight: 500, color: sc.muted, whiteSpace: "nowrap" }}>
                    {event.booked}/{event.capacity} registered
                  </span>
                </div>

                {statusCounts && (
                  <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                    {(["Booked", "Waitlisted", "Reserved"] as const).map((status) => {
                      const count = statusCounts[status];
                      if (count === 0) return null;
                      const pc = statusPillColors[status];
                      return (
                        <span
                          key={status}
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "10px",
                            background: pc.bg,
                            color: pc.text,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {status} {count}
                        </span>
                      );
                    })}
                    {owedCount > 0 && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "10px",
                          background: isDark ? "rgba(224,90,90,0.15)" : "rgba(212,24,64,0.14)",
                          color: isDark ? "#e05a5a" : "#a31030",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {owedCount} Overdue
                      </span>
                    )}
                  </div>
                )}

                {previewNames.length > 0 && (
                  <span
                    style={{
                      fontSize: "12px",
                      color: sc.muted,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                      flex: "1 1 120px",
                    }}
                  >
                    {previewNames.join(", ")}
                    {remainingCount > 0 ? ` +${remainingCount} more` : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      };

      if (!viewByResource) {
        return <>{sessionEvents.map((event) => renderSessionRow(event))}</>;
      }

      // ── By-resource grouping — Instructors, then Venues, same order as
      //    the standalone Resources view. A session with both an instructor
      //    and a venue appears once under each (duplicated), same rule
      //    ResourcesView applies. ──
      return (
        <>
          {(["instructor", "venue"] as const).map((kind) => {
            const names = kind === "instructor" ? visibleInstructors : visibleVenues;
            if (names.length === 0) return null;
            return (
              <div key={kind}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "28px",
                    flexShrink: 0,
                    borderTop: kind === "venue" ? `2px solid ${sc.border}` : undefined,
                    borderBottom: `1px solid ${sc.border}`,
                    background: sectionHdrBg,
                    paddingLeft: "12px",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: sc.muted,
                  }}
                >
                  {kind === "instructor" ? "Instructors" : "Venues"}
                </div>

                {names.map((name) => {
                  const resourceSessions = sessionEvents.filter((e) =>
                    kind === "instructor" ? e.instructor === name : e.venue === name
                  );
                  return (
                    <div key={name} style={{ display: "flex", borderBottom: `1px solid ${sc.border}` }}>
                      <div style={resourceLabelCellStyle}>
                        {kind === "instructor" ? (
                          <User size={13} style={{ color: sc.muted, flexShrink: 0, marginTop: "2px" }} />
                        ) : (
                          <MapPin size={13} style={{ color: sc.muted, flexShrink: 0, marginTop: "2px" }} />
                        )}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
                      </div>
                      <div style={{ flex: "1 1 0", minWidth: 0 }}>
                        {resourceSessions.length === 0 ? (
                          <div style={{ padding: rowPadding, fontSize: "13px", color: sc.muted }}>
                            No sessions
                          </div>
                        ) : (
                          resourceSessions.map((event) => renderSessionRow(event, kind))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      );
      })()}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — SchedulePage (main export)
   ═══════════════════════════════════════════════════════════════════════ */

export function SchedulePage() {
  const { palette, mode } = useTheme();
  const isDark = mode === "dark";
  const isMobile = useIsMobile();

  // Calendar state — defaults to today's month/year
  // NOTE: All hooks must be called unconditionally (before any early return)
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  // Initial view comes from the "Default view" preference (Preferences tab);
  // after that, `desktopView` just tracks whatever the user clicks during
  // this session — changing the preference later doesn't yank the user out
  // of whatever view they're currently looking at, only affects the next
  // time the Schedule page loads.
  const [desktopView, setDesktopView] = useState<string>(() =>
    loadStringPref(DEFAULT_VIEW_PREF_KEY, "Monthly", SCHEDULE_VIEW_IDS)
  );
  const [showDesktopViewDropdown, setShowDesktopViewDropdown] = useState(false);
  const desktopViewRef = useRef<HTMLDivElement>(null);

  // "View by resource" — only meaningful on Weekly/Daily (Monthly and the
  // standalone Resources view are untouched). Kept as one shared flag
  // rather than per-view so switching between Weekly and Daily mid-session
  // doesn't silently reset it — matches how `density` and the registration-
  // status prefs behave (session-level, not reset by navigation).
  const [viewByResource, setViewByResource] = useState(false);

  // Resources view — selected day (day-of-month within currentMonth/currentYear)
  const [resourcesDay, setResourcesDay] = useState(() => new Date().getDate());
  const [showResourcesDayPicker, setShowResourcesDayPicker] = useState(false);
  const resourcesDayPickerRef = useRef<HTMLDivElement>(null);

  // Weekly view — Monday of the currently displayed week. Kept as its own
  // Date state (rather than reusing currentMonth/currentYear) because a
  // week can straddle two different months.
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => getWeekStart(new Date()));
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const weekPickerRef = useRef<HTMLDivElement>(null);

  // Daily view — selected day (day-of-month within currentMonth/currentYear).
  // Kept independent from `resourcesDay` (rather than reused) so navigating
  // Daily and Resources don't silently jump each other to the same date.
  const [dailyDay, setDailyDay] = useState(() => new Date().getDate());
  const [showDailyDayPicker, setShowDailyDayPicker] = useState(false);
  const dailyDayPickerRef = useRef<HTMLDivElement>(null);

  // ── Registration-status display preference (Preferences sidebar tab) ──
  // Purely cosmetic — whether the full/waitlisted/nearly-full/available
  // signal is painted onto each view (time chip / status pill / capacity
  // meter). Persists to localStorage so it's remembered across sessions;
  // never affects the Reservation Details panel.
  const [registrationStatusPrefs, setRegistrationStatusPrefsState] = useState<RegistrationStatusPrefs>(
    loadRegistrationStatusPrefs
  );
  const setRegistrationStatusPrefs = useCallback((next: RegistrationStatusPrefs) => {
    setRegistrationStatusPrefsState(next);
    persistRegistrationStatusPrefs(next);
  }, []);

  // ── Default view preference — what desktopView initializes to on the
  // *next* page load. Editable from the Preferences tab; see the comment
  // on the `desktopView` state above for why changing it doesn't also
  // jump the current session to a different view. ──
  const [defaultView, setDefaultViewState] = useState<ScheduleViewId>(() =>
    loadStringPref(DEFAULT_VIEW_PREF_KEY, "Monthly", SCHEDULE_VIEW_IDS)
  );
  const setDefaultView = useCallback((next: ScheduleViewId) => {
    setDefaultViewState(next);
    persistPref(DEFAULT_VIEW_PREF_KEY, next);
  }, []);

  // ── Density preference — comfortable (today's spacing) vs. compact
  // (tighter rows/padding) across all four views. Unlike Default view,
  // this applies immediately since it's a pure display setting for
  // whatever's already on screen. ──
  const [density, setDensityState] = useState<ScheduleDensity>(() =>
    loadStringPref(DENSITY_PREF_KEY, "comfortable", SCHEDULE_DENSITIES)
  );
  const setDensity = useCallback((next: ScheduleDensity) => {
    setDensityState(next);
    persistPref(DENSITY_PREF_KEY, next);
  }, []);

  // ── "Highlight my sessions" — see CURRENT_USER_INSTRUCTOR above for the
  // mock-identity caveat. ──
  const [highlightMySessions, setHighlightMySessionsState] = useState<boolean>(() =>
    loadBoolPref(HIGHLIGHT_MINE_PREF_KEY, false)
  );
  const setHighlightMySessions = useCallback((next: boolean) => {
    setHighlightMySessionsState(next);
    persistPref(HIGHLIGHT_MINE_PREF_KEY, String(next));
  }, []);

  // ── "Keep my filters" — see the persistence effect further down (after
  // the filter state itself is declared) for how this actually saves and
  // restores the 9 filter values. ──
  const [keepMyFilters, setKeepMyFiltersState] = useState<boolean>(() =>
    loadBoolPref(KEEP_FILTERS_PREF_KEY, false)
  );
  const setKeepMyFilters = useCallback((next: boolean) => {
    setKeepMyFiltersState(next);
    persistPref(KEEP_FILTERS_PREF_KEY, String(next));
  }, []);

  // ── Calendar Filters popover state ──
  // Mirrors the criteria available in reservation details: date range,
  // time range, venues, instructors, reservation types, and a balances-owed
  // toggle. All filter dimensions combine with AND in the filteredEvents
  // memo below; an empty value (string "" or empty array) means "no filter"
  // for that dimension.
  // (showFilters removed — filters now live in the UpcomingToday sidebar)
  // Color legend popover — opens from an Info button in the sub-header so
  // the user can quickly look up what each event-badge color represents.
  const [showLegend, setShowLegend] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);

  // Delete Mode — when on, clicking an empty (no-registered-clients)
  // event removes it from the calendar quickly. Eligible events get a
  // red dashed border + tint; non-eligible events dim to half opacity
  // so the deletable subset stands out. Removed ids live in
  // `deletedEventIds` and are filtered out at the start of the events
  // memo so deletions feel immediate.
  //
  // The toggle itself is hidden from every schedule view for now (see
  // SHOW_DELETE_MODE_TOGGLE below) — the feature stays fully wired up
  // underneath so it can be switched back on later with one flag flip.
  const [deleteMode, setDeleteMode] = useState(false);
  const [deletedEventIds, setDeletedEventIds] = useState<Set<string>>(() => new Set());
  // Click-on-ineligible feedback. When the user clicks an event that
  // can't be deleted in Delete Mode (booked > 0, or league/closed), we
  // show a small tooltip near the event explaining the gating rule.
  // Auto-dismisses after a few seconds; cleared whenever Delete Mode
  // toggles off, the user dismisses it, or the next event click runs.
  const [deleteBlockedHint, setDeleteBlockedHint] = useState<{ top: number; left: number } | null>(null);
  const deleteBlockedHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Keep my filters" is checked once here, up front — if it was already on
  // at the end of the last session, every filter below initializes from the
  // saved snapshot instead of the usual empty defaults.
  const persistedFilters = keepMyFilters ? loadPersistedFilters() : null;
  const [filterStartDate, setFilterStartDate] = useState(() => persistedFilters?.filterStartDate ?? "");
  const [filterEndDate, setFilterEndDate] = useState(() => persistedFilters?.filterEndDate ?? "");
  const [filterStartTime, setFilterStartTime] = useState(() => persistedFilters?.filterStartTime ?? "");
  const [filterEndTime, setFilterEndTime] = useState(() => persistedFilters?.filterEndTime ?? "");
  const [filterVenues, setFilterVenues] = useState<string[]>(() => persistedFilters?.filterVenues ?? []);
  const [filterInstructors, setFilterInstructors] = useState<string[]>(() => persistedFilters?.filterInstructors ?? []);
  const [filterTypes, setFilterTypes] = useState<ReservationType[]>(() => persistedFilters?.filterTypes ?? []);
  // Payment status — "" means "Any" (no filter). "Owed" shows only events
  // where at least one registered client has an outstanding balance;
  // "Paid" shows only events where every registered client is paid up.
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<"" | "Owed" | "Paid">(
    () => persistedFilters?.filterPaymentStatus ?? ""
  );
  // Registrations — empty array means no filter. Multiple values are OR'd.
  // "Full" = booked >= capacity; "NearlyFull" = ≥80% booked; "Available" =
  // 1+ booked and < 80%; "Empty" = 0 booked. Events without capacity
  // (league games, closures) are excluded when any option is active.
  const [filterRegistrations, setFilterRegistrations] = useState<string[]>(
    () => persistedFilters?.filterRegistrations ?? []
  );

  // Persist the current filters whenever "Keep my filters" is on — this
  // fires immediately when the preference is switched on too, so turning
  // it on snapshots whatever's currently applied rather than only
  // capturing filter changes made after the fact.
  useEffect(() => {
    if (!keepMyFilters) return;
    persistFilters({
      filterStartDate,
      filterEndDate,
      filterStartTime,
      filterEndTime,
      filterVenues,
      filterInstructors,
      filterTypes,
      filterPaymentStatus,
      filterRegistrations,
    });
  }, [
    keepMyFilters,
    filterStartDate,
    filterEndDate,
    filterStartTime,
    filterEndTime,
    filterVenues,
    filterInstructors,
    filterTypes,
    filterPaymentStatus,
    filterRegistrations,
  ]);

  // Active-filter count for the badge on the Filters button.
  const activeFilterCount =
    (filterStartDate ? 1 : 0) +
    (filterEndDate ? 1 : 0) +
    (filterStartTime ? 1 : 0) +
    (filterEndTime ? 1 : 0) +
    (filterVenues.length > 0 ? 1 : 0) +
    (filterInstructors.length > 0 ? 1 : 0) +
    (filterTypes.length > 0 ? 1 : 0) +
    (filterPaymentStatus ? 1 : 0) +
    (filterRegistrations.length > 0 ? 1 : 0);

  const clearAllFilters = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterStartTime("");
    setFilterEndTime("");
    setFilterVenues([]);
    setFilterInstructors([]);
    setFilterTypes([]);
    setFilterPaymentStatus("");
    setFilterRegistrations([]);
  };

  // Close desktop view dropdown on outside click
  useEffect(() => {
    if (!showDesktopViewDropdown) return;
    function handleClick(e: MouseEvent) {
      if (desktopViewRef.current && !desktopViewRef.current.contains(e.target as Node)) {
        setShowDesktopViewDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDesktopViewDropdown]);

  // (Filters popover removed — filters live in the sidebar's Filters tab)

  // Clear any visible "can't delete" hint when Delete Mode toggles off,
  // so a stale tooltip doesn't linger after the user exits the mode.
  useEffect(() => {
    if (!deleteMode) {
      setDeleteBlockedHint(null);
      if (deleteBlockedHintTimerRef.current) {
        clearTimeout(deleteBlockedHintTimerRef.current);
        deleteBlockedHintTimerRef.current = null;
      }
    }
  }, [deleteMode]);

  // Close legend popover on outside click
  useEffect(() => {
    if (!showLegend) return;
    function handleClick(e: MouseEvent) {
      if (legendRef.current && !legendRef.current.contains(e.target as Node)) {
        setShowLegend(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showLegend]);

  // Close Resources day picker on outside click
  useEffect(() => {
    if (!showResourcesDayPicker) return;
    function handleClick(e: MouseEvent) {
      if (resourcesDayPickerRef.current && !resourcesDayPickerRef.current.contains(e.target as Node)) {
        setShowResourcesDayPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showResourcesDayPicker]);

  // Close Week picker on outside click
  useEffect(() => {
    if (!showWeekPicker) return;
    function handleClick(e: MouseEvent) {
      if (weekPickerRef.current && !weekPickerRef.current.contains(e.target as Node)) {
        setShowWeekPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showWeekPicker]);

  // Close Daily day picker on outside click
  useEffect(() => {
    if (!showDailyDayPicker) return;
    function handleClick(e: MouseEvent) {
      if (dailyDayPickerRef.current && !dailyDayPickerRef.current.contains(e.target as Node)) {
        setShowDailyDayPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDailyDayPicker]);

  // Hover popover state (with 300ms delay)
  const [hoveredEvent, setHoveredEvent] = useState<{
    event: CalendarEvent;
    day: number;
    /** Month/year the hovered cell actually belongs to. Defaults to
     *  currentMonth/currentYear for callers that don't pass an override
     *  (Monthly grid, Resources); the Weekly view passes its own, since a
     *  displayed week can straddle two different months. */
    month: number;
    year: number;
    position: { top: number; left: number };
    badgeRect?: { top: number; bottom: number; left: number; right: number };
  } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInsidePopoverRef = useRef(false);

  // Add Reservation — uses the shared SidePanel system
  const { openPanel, isOpen: isSidePanelOpen } = useSidePanel();
  const handleOpenAddReservation = useCallback(
    () => openPanel(<AddReservationPanelContent />, { size: "third", title: "Create Reservation: Session" }),
    [openPanel]
  );

  // Open Reservation Details side panel on click — except in Delete
  // Mode, where the click is gated by deletability:
  //   • eligible (empty session) → remove the event
  //   • ineligible (has bookings, or is a league/closed event) → show
  //     a tooltip near the click explaining the gating rule, and skip
  //     the panel-open path entirely
  // Outside Delete Mode, every click opens the details panel as usual.
  const handleClickEvent = useCallback(
    (event: CalendarEvent, _day: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setHoveredEvent(null);
      if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
      if (deleteMode) {
        const eligible =
          event.booked === 0 &&
          event.type !== "closed" &&
          event.type !== "league";
        if (eligible) {
          setDeletedEventIds((prev) => {
            const next = new Set(prev);
            next.add(event.id);
            return next;
          });
          return;
        }
        // Ineligible — anchor the hint just below the clicked badge so
        // it's clearly tied to that event, then auto-dismiss.
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDeleteBlockedHint({ top: rect.bottom + 8, left: rect.left });
        if (deleteBlockedHintTimerRef.current) {
          clearTimeout(deleteBlockedHintTimerRef.current);
        }
        deleteBlockedHintTimerRef.current = setTimeout(() => {
          setDeleteBlockedHint(null);
          deleteBlockedHintTimerRef.current = null;
        }, 4000);
        return;
      }
      openPanel(
        <ReservationDetailsPanelContent key={event.id} event={event} />,
        { size: "third", title: `Reservation Details: ${event.title}` }
      );
    },
    [openPanel, deleteMode]
  );

  // "+X more" handler — opens a side panel listing all events for the day
  const handleShowMore = useCallback(
    (day: number, dayEvents: CalendarEvent[]) => {
      setHoveredEvent(null);
      if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
      const dateLabel = formatEventDate(day, currentMonth, currentYear);
      openPanel(
        <DayEventsPanelContent
          day={day}
          month={currentMonth}
          year={currentYear}
          events={dayEvents}
          onSelectEvent={(event) => {
            openPanel(
              <ReservationDetailsPanelContent key={event.id} event={event} />,
              { size: "third", title: `Reservation Details: ${event.title}` }
            );
          }}
        />,
        { size: "third", title: `${dateLabel} · ${dayEvents.length} reservation${dayEvents.length === 1 ? "" : "s"}` }
      );
    },
    [openPanel, currentMonth, currentYear]
  );

  // Hover handlers with 300ms delay. `dateOverride` is only passed by the
  // Weekly view, whose displayed week can straddle two months — everyone
  // else falls back to the shared currentMonth/currentYear.
  const handleHoverEvent = useCallback(
    (event: CalendarEvent, day: number, e: React.MouseEvent, dateOverride?: { month: number; year: number }) => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      hoverTimerRef.current = setTimeout(() => {
        setHoveredEvent({
          event,
          day,
          month: dateOverride?.month ?? currentMonth,
          year: dateOverride?.year ?? currentYear,
          position: { top: rect.top, left: rect.right + 8 },
          badgeRect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
        });
      }, 300);
    },
    [currentMonth, currentYear]
  );

  const handleHoverLeave = useCallback(() => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    // Small delay to allow mouse to move into the popover
    setTimeout(() => {
      if (!isInsidePopoverRef.current) {
        setHoveredEvent(null);
      }
    }, 100);
  }, []);

  const handlePopoverMouseEnter = useCallback(() => {
    isInsidePopoverRef.current = true;
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
  }, []);

  const handlePopoverMouseLeave = useCallback(() => {
    isInsidePopoverRef.current = false;
    setHoveredEvent(null);
  }, []);

  const handleOpenDetailsFromPopover = useCallback((section?: string) => {
    if (!hoveredEvent) return;
    const ev = hoveredEvent.event;
    setHoveredEvent(null);
    isInsidePopoverRef.current = false;
    openPanel(
      <ReservationDetailsPanelContent key={ev.id} event={ev} initialSection={section ?? "Details"} />,
      { size: "third", title: `Reservation Details: ${ev.title}` }
    );
  }, [hoveredEvent, openPanel]);

  const handleClosePopover = useCallback(() => {
    setHoveredEvent(null);
    isInsidePopoverRef.current = false;
  }, []);

  const handlePrevMonth = useCallback(() => {
    setHoveredEvent(null);
    setCurrentMonth((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setHoveredEvent(null);
    setCurrentMonth((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  // "Today" button — jumps the calendar back to the real-world current month/year.
  // The button itself is only rendered when the user is viewing a different
  // month/year (see `isCurrentMonth` further down).
  const handleGoToToday = useCallback(() => {
    setHoveredEvent(null);
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setResourcesDay(now.getDate());
    setWeekAnchor(getWeekStart(now));
    setDailyDay(now.getDate());
  }, []);

  // Weekly view — prev/next skip a full 7 days; picking a week from the
  // WeekPicker popover jumps straight to it. Each also syncs
  // currentMonth/currentYear to the new week's Monday so the shared
  // date-range filter (which compares against currentMonth/currentYear)
  // stays aligned with whatever week is actually on screen.
  const handlePrevWeek = useCallback(() => {
    setHoveredEvent(null);
    setWeekAnchor((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() - 7);
      setCurrentMonth(next.getMonth());
      setCurrentYear(next.getFullYear());
      return next;
    });
  }, []);

  const handleNextWeek = useCallback(() => {
    setHoveredEvent(null);
    setWeekAnchor((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      setCurrentMonth(next.getMonth());
      setCurrentYear(next.getFullYear());
      return next;
    });
  }, []);

  const handlePickWeek = useCallback((newWeekStart: Date) => {
    setHoveredEvent(null);
    setWeekAnchor(newWeekStart);
    setCurrentMonth(newWeekStart.getMonth());
    setCurrentYear(newWeekStart.getFullYear());
    setShowWeekPicker(false);
  }, []);

  // Desktop month/year picker dropdown (replaces prev/next arrows)
  const [showDesktopMonthPicker, setShowDesktopMonthPicker] = useState(false);
  const desktopMonthPickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showDesktopMonthPicker) return;
    function handleClick(e: MouseEvent) {
      if (desktopMonthPickerRef.current && !desktopMonthPickerRef.current.contains(e.target as Node)) {
        setShowDesktopMonthPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDesktopMonthPicker]);

  const handleDesktopPickMonth = useCallback((month: number, year: number) => {
    setHoveredEvent(null);
    setCurrentMonth(month);
    setCurrentYear(year);
    setShowDesktopMonthPicker(false);
  }, []);

  // Filter events by the search query plus the structured Filters popover
  // criteria (date range, time range, venues, instructors, types, balances
  // owed). All dimensions combine with AND. An empty string / empty array
  // / false means "no filter" for that dimension.
  // NOTE: Defined here — before any conditional early return — so React's hook
  // ordering stays stable across the mobile / desktop branches.
  const filteredEvents = useMemo(() => {
    const bySearch = filterEventsByQuery(MOCK_EVENTS, searchQuery);
    // Strip events the user removed via Delete Mode before any further
    // filtering so the rest of the pipeline doesn't see them.
    const byDeletion: DayEvents = {};
    for (const dayStr of Object.keys(bySearch)) {
      const day = Number(dayStr);
      const events = (bySearch[day] ?? []).filter((ev) => !deletedEventIds.has(ev.id));
      if (events.length > 0) byDeletion[day] = events;
    }

    // Pre-parse filter time bounds once for the inner per-event check.
    const parseHM = (s: string): number | null => {
      if (!s) return null;
      const [h, m] = s.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    };
    const startMins = parseHM(filterStartTime);
    const endMins = parseHM(filterEndTime);
    const startDateObj = filterStartDate ? new Date(filterStartDate + "T00:00:00") : null;
    const endDateObj = filterEndDate ? new Date(filterEndDate + "T23:59:59") : null;

    const result: DayEvents = {};
    for (const dayStr of Object.keys(byDeletion)) {
      const day = Number(dayStr);

      // Date-range — events render in `currentMonth/currentYear`, so we
      // compare each day cell's calendar date against the filter range.
      if (startDateObj || endDateObj) {
        const cellDate = new Date(currentYear, currentMonth, day);
        if (startDateObj && cellDate < startDateObj) continue;
        if (endDateObj && cellDate > endDateObj) continue;
      }

      const events = byDeletion[day] ?? [];
      const kept = events.filter((e) => {
        // Closed-day rows are layout markers, not real reservations — they
        // bypass the per-event filters so closures stay visible regardless
        // of trainer/venue/type/balance filters.
        if (e.type === "closed") return true;

        if (startMins !== null || endMins !== null) {
          const m = parseEventTimeToMinutes(e.time);
          if (m === -1) return false;
          if (startMins !== null && m < startMins) return false;
          if (endMins !== null && m > endMins) return false;
        }
        // Resource filters (venue + instructor) are OR'd together, not
        // AND'd — picking a specific instructor and a specific venue
        // should surface sessions matching either one, since the two
        // don't necessarily ever share a session. Only when a resource
        // axis has no selections is it left out of the check entirely.
        if (filterVenues.length > 0 || filterInstructors.length > 0) {
          const matchesVenue = filterVenues.length > 0 && filterVenues.includes(e.venue);
          const matchesInstructor = filterInstructors.length > 0 && filterInstructors.includes(e.instructor);
          if (!matchesVenue && !matchesInstructor) return false;
        }
        if (filterTypes.length > 0 && !filterTypes.includes(e.type)) return false;
        if (filterPaymentStatus === "Owed" && getOwedCount(e) === 0) return false;
        // "Paid" = all registered clients are paid up. Empty events
        // (booked = 0) don't qualify either way; treat them as Paid since
        // there's no outstanding balance.
        if (filterPaymentStatus === "Paid" && getOwedCount(e) > 0) return false;
        // Registration counts — only meaningful for events with a real
        // capacity. Events without capacity (league games, etc.) are
        // dropped by any registration filter since "seats available"
        // doesn't apply. Closures are exempted at the top of this
        // filter callback.
        if (filterRegistrations.length > 0) {
          if (e.capacity <= 0) return false;
          const pct = e.booked / e.capacity;
          const isFull       = e.booked >= e.capacity;
          const isWaitlisted = isFull && !!e.waitlistEnabled;
          const isNearlyFull = !isFull && pct >= 0.8;
          const isEmpty      = e.booked === 0;
          const isAvailable  = !isFull && !isNearlyFull && !isEmpty;
          const matches =
            (filterRegistrations.includes("Full")       && isFull)       ||
            (filterRegistrations.includes("Waitlisted")  && isWaitlisted) ||
            (filterRegistrations.includes("NearlyFull") && isNearlyFull) ||
            (filterRegistrations.includes("Available")  && isAvailable)  ||
            (filterRegistrations.includes("Empty")      && isEmpty);
          if (!matches) return false;
        }
        return true;
      });

      if (kept.length > 0) result[day] = kept;
    }
    return result;
  }, [
    searchQuery,
    filterStartDate, filterEndDate,
    filterStartTime, filterEndTime,
    filterVenues, filterInstructors, filterTypes,
    filterPaymentStatus,
    filterRegistrations,
    currentMonth, currentYear,
    deletedEventIds,
  ]);

  // Today's not-yet-started events for the "Upcoming Today" side panel.
  // Uses the real-world "today" so the rail stays useful regardless of which
  // month the calendar is currently showing. Mock events are indexed by
  // day-of-month, so we look up by today's date.
  const upcomingToday = useMemo(() => {
    const now = new Date();
    const todayDay = now.getDate();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const todays: CalendarEvent[] = MOCK_EVENTS[todayDay] ?? [];
    return todays
      .filter((e: CalendarEvent) => e.type !== "closed")
      .filter((e: CalendarEvent) => {
        const m = parseEventTimeToMinutes(e.time);
        return m === -1 ? true : m >= nowMinutes;
      })
      .sort((a: CalendarEvent, b: CalendarEvent) => {
        const am = parseEventTimeToMinutes(a.time);
        const bm = parseEventTimeToMinutes(b.time);
        return am - bm;
      });
  }, []);

  // Click handler for an Upcoming Today row — opens the same details panel
  // as clicking an event in the calendar grid.
  const handleSelectUpcomingEvent = useCallback(
    (event: CalendarEvent) => {
      openPanel(
        <ReservationDetailsPanelContent key={event.id} event={event} />,
        { size: "third", title: `Reservation Details: ${event.title}` }
      );
    },
    [openPanel]
  );

  // If mobile, render mobile layout (after all hooks)
  if (isMobile) {
    return (
      <MobileScheduleView
        palette={palette}
        mode={mode}
        onAddReservation={handleOpenAddReservation}
        filterStartDate={filterStartDate}
        setFilterStartDate={setFilterStartDate}
        filterEndDate={filterEndDate}
        setFilterEndDate={setFilterEndDate}
        filterStartTime={filterStartTime}
        setFilterStartTime={setFilterStartTime}
        filterEndTime={filterEndTime}
        setFilterEndTime={setFilterEndTime}
        filterVenues={filterVenues}
        setFilterVenues={setFilterVenues}
        filterInstructors={filterInstructors}
        setFilterInstructors={setFilterInstructors}
        filterTypes={filterTypes}
        setFilterTypes={setFilterTypes}
        filterPaymentStatus={filterPaymentStatus}
        setFilterPaymentStatus={setFilterPaymentStatus}
        filterRegistrations={filterRegistrations}
        setFilterRegistrations={setFilterRegistrations}
        activeFilterCount={activeFilterCount}
        clearAllFilters={clearAllFilters}
      />
    );
  }

  // Desktop layout
  const sc = semanticColors(palette, isDark);
  const colors = getEventStyles(isDark);

  // Calendar grid
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) currentWeek.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  const todayDate = isCurrentMonth ? today.getDate() : -1;
  const isCurrentWeek = getWeekStart(today).getTime() === weekAnchor.getTime();

  // Monthly/Daily grid only ever renders days 1..daysInMonth — `filteredEvents`
  // itself isn't month-clipped (mock data reuses the same day-of-month keys
  // 1-31 every month), so a short month (e.g. 30-day April) must not count
  // a stray day-31 entry that the grid never actually draws.
  const totalReservations = Object.keys(filteredEvents).reduce((sum, dayStr) => {
    const day = Number(dayStr);
    if (day < 1 || day > daysInMonth) return sum;
    return sum + (filteredEvents[day] ?? []).filter((e: CalendarEvent) => e.type !== "closed").length;
  }, 0);

  // The Resources and Weekly grids both only draw hours RES_START_HOUR..
  // RES_END_HOUR — an event with an unparseable time, or one that falls
  // outside that window (a few mock entries do), is silently skipped by
  // those grids, so the count needs to skip it too or it'll overcount
  // what's actually on screen.
  const isVisibleInHourGrid = (e: CalendarEvent) => {
    if (e.type === "closed") return false;
    const mins = parseEventTimeToMinutes(e.time);
    if (mins === -1) return false;
    const hour = Math.floor(mins / 60);
    return hour >= RES_START_HOUR && hour <= RES_END_HOUR;
  };

  // For the Resources view, "Found X" reflects only the selected day.
  const clampedResourcesDay = Math.min(Math.max(resourcesDay, 1), getDaysInMonth(currentYear, currentMonth));
  const resourcesDayCount = (filteredEvents[clampedResourcesDay] ?? []).filter(isVisibleInHourGrid).length;

  // For the Weekly view, "Found X" reflects only the 7 days currently on
  // screen (weekAnchor → +6 days), not the whole month's worth of events.
  const weekReservationCount = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() + i);
    return d;
  }).reduce((sum, date) => {
    const dayEvents = filteredEvents[date.getDate()] ?? [];
    return sum + dayEvents.filter(isVisibleInHourGrid).length;
  }, 0);

  // For the Daily view, "Found X" reflects only the single selected day —
  // every non-closed session on it. Unlike Resources/Weekly, Daily is a
  // plain chronological list with no hour-range clipping, so it doesn't
  // need the isVisibleInHourGrid filter those two use.
  const clampedDailyDay = Math.min(Math.max(dailyDay, 1), getDaysInMonth(currentYear, currentMonth));
  const dailyDayCount = (filteredEvents[clampedDailyDay] ?? []).filter((e: CalendarEvent) => e.type !== "closed").length;

  const displayedCount =
    desktopView === "Resources" ? resourcesDayCount :
    desktopView === "Weekly" ? weekReservationCount :
    desktopView === "Daily" ? dailyDayCount :
    totalReservations;

  /* shared button style helper */
  const controlBtn: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    border: `1px solid ${sc.border}`,
    background: sc.controlBg,
    cursor: "pointer",
    boxShadow: "0px 1px 0.5px 0px rgba(29,41,61,0.02)",
    color: sc.body,
  };

  // The "+ Add Reservation" button appears in two places depending on layout
  // state: inside the calendar zone's right slot when the side panel is open
  // (calendar = 100% width, no side rail), or in the side-rail zone when the
  // rail is visible. Extracted so the JSX stays in sync.
  const addReservationBtn = (
    <button
      onClick={handleOpenAddReservation}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "12px 20px",
        borderRadius: "8px",
        border: "none",
        background: sc.brand,
        fontSize: "16px",
        fontWeight: 500,
        color: isDark ? "#0a0e0f" : "#101828",
        cursor: "pointer",
        boxShadow: "0px 1px 0.5px 0px rgba(29,41,61,0.02)",
      }}
    >
      <Plus size={16} /> Add Reservation
    </button>
  );

  return (
    <div
      style={{
        fontFamily: "var(--font-family)",
        padding: "0",
        // Reclaim the excess bottom padding from Layout's <main> (80px).
        // 16px is sufficient for the schedule page.
        marginBottom: "-64px",
        // Fill the remaining height of the page's <main> column so the
        // calendar can stretch vertically. <main> is a flex-col container
        // (see Layout.tsx), so flex:1 on this child claims the leftover
        // vertical space — the toolbar takes its intrinsic height and the
        // calendar+side-rail row (also flex:1) consumes the rest.
        display: "flex",
        flexDirection: "column",
        flex: "1 1 0",
        minHeight: 0,
      }}
    >
      {/* ── Main row: left column (toolbar + calendar) + Upcoming Today rail
          The Upcoming Today rail spans the full row height so it fills the
          toolbar-row void created when AddReservation moved into the
          calendar-zone right slot below. */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          // No gap here — the spacing between the calendar and the rail
          // lives on the rail's marginLeft so it can animate to 0 when the
          // rail collapses (otherwise a 20px gap would persist as visible
          // empty space between the calendar and the side panel).
          flex: "1 1 0",
          minHeight: 0,
        }}
      >
        {/* Left column — toolbar (calendar zone) above, calendar grid below.
            Stacked vertically; the calendar claims the remaining height.
            flex:1 grows to fill whatever main-row width is left after the
            rail slot. As the rail's width animates to 0 (when the side
            panel opens), the left column smoothly grows to fill the gap —
            offsetting the marginRight push so the calendar zone stays at
            roughly the same absolute width throughout the transition. */}
        <div
          style={{
            flex: "1 1 0",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
        {/* ── Top toolbar ──────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 0",
            flex: "0 0 auto",
          }}
        >
        {/* Calendar zone — internally a 3-column grid: [View+Today |
            DatePicker centered | AddReservation]. AddReservation lives in
            the right slot so its right edge aligns with the calendar's
            top-right corner below. */}
        <div
          style={{
            flex: "1 1 0",
            minWidth: 0,
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
          }}
        >
        {/* View dropdown + Today button */}
        <div style={{ justifySelf: "start", display: "flex", alignItems: "center", gap: "8px" }}>
          <div ref={desktopViewRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowDesktopViewDropdown(!showDesktopViewDropdown)}
              style={{
                ...controlBtn,
                gap: "6px",
                padding: "12px 20px",
                fontSize: "16px",
                fontWeight: 500,
                color: sc.body,
              }}
            >
              {desktopView} <ChevronDown size={16} />
            </button>

            {showDesktopViewDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  minWidth: "180px",
                  background: sc.cellBg,
                  border: `1px solid ${sc.border}`,
                  borderRadius: "8px",
                  boxShadow: `0px 8px 16px -4px ${sc.shadow}`,
                  padding: "4px",
                  zIndex: 100,
                }}
              >
                {["Monthly", "Weekly", "Daily", "Resources"].map((view) => (
                  <div
                    key={view}
                    onClick={() => {
                      // Switching into Weekly re-anchors weekAnchor to the
                      // week containing whatever day is currently in view
                      // (mirrors how Resources always reads currentMonth/
                      // currentYear directly), so it never shows a stale
                      // week left over from a previous visit.
                      if (view === "Weekly") {
                        const anchorDay = Math.min(resourcesDay, getDaysInMonth(currentYear, currentMonth));
                        setWeekAnchor(getWeekStart(new Date(currentYear, currentMonth, anchorDay)));
                      }
                      // Same idea for Daily — re-anchor to a day that's
                      // valid in whatever month/year is currently in view
                      // rather than showing a stale day from last time.
                      if (view === "Daily") {
                        setDailyDay(Math.min(dailyDay, getDaysInMonth(currentYear, currentMonth)));
                      }
                      setDesktopView(view);
                      setShowDesktopViewDropdown(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      background: view === desktopView ? `${sc.brand}20` : "transparent",
                      color: view === desktopView ? sc.brand : sc.body,
                    }}
                  >
                    {view}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* "View by resource" toggle — only meaningful on Weekly/Daily;
              Monthly and the standalone Resources view are untouched. */}
          {(desktopView === "Weekly" || desktopView === "Daily") && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 10px",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 500, color: sc.body, whiteSpace: "nowrap" }}>
                View by resource
              </span>
              <SchedulePrefToggle
                enabled={viewByResource}
                onChange={setViewByResource}
                sc={sc}
                ariaLabel="View by resource"
              />
            </div>
          )}

        </div>

        {/* Date picker — centered; Resources view shows a day picker,
            all other views show the existing month/year picker.
            Today button sits immediately to the right of the nav group. */}
        <div style={{ justifySelf: "center", display: "flex", alignItems: "center", gap: "8px", padding: "8px" }}>
          {desktopView === "Resources" ? (
            /* ── Resources: prev-day / clickable-date / next-day / Today ── */
            <div ref={resourcesDayPickerRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "6px" }}>
              {/* Prev day */}
              <button
                onClick={() => setResourcesDay((d) => Math.max(1, d - 1))}
                disabled={clampedResourcesDay === 1}
                aria-label="Previous day"
                style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  border: `1px solid ${sc.border}`, background: sc.controlBg,
                  color: sc.body, cursor: clampedResourcesDay === 1 ? "not-allowed" : "pointer",
                  opacity: clampedResourcesDay === 1 ? 0.4 : 1,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <ChevronLeft size={16} />
              </button>

              {/* Clickable date label — opens day picker popover */}
              <button
                onClick={() => setShowResourcesDayPicker((v) => !v)}
                aria-expanded={showResourcesDayPicker}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${showResourcesDayPicker ? sc.brand : "transparent"}`,
                  background: showResourcesDayPicker
                    ? (isDark ? "rgba(0,196,160,0.10)" : "rgba(0,196,160,0.06)")
                    : "transparent",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: sc.heading,
                  cursor: "pointer",
                  fontFamily: "var(--font-family)",
                  whiteSpace: "nowrap",
                }}
              >
                {(() => {
                  const d = new Date(currentYear, currentMonth, clampedResourcesDay);
                  const DAY_NAMES_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                  return `${DAY_NAMES_SHORT[d.getDay()]}, ${MONTH_NAMES[currentMonth].slice(0,3)} ${clampedResourcesDay}, ${currentYear}`;
                })()}
                <ChevronDown
                  size={14}
                  style={{
                    transform: showResourcesDayPicker ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                    color: sc.muted,
                  }}
                />
              </button>

              {showResourcesDayPicker && (
                <ResourcesDayPicker
                  selectedDay={clampedResourcesDay}
                  selectedMonth={currentMonth}
                  selectedYear={currentYear}
                  onPick={(d, m, y) => {
                    setResourcesDay(d);
                    setCurrentMonth(m);
                    setCurrentYear(y);
                    setShowResourcesDayPicker(false);
                  }}
                  sc={sc}
                  isDark={isDark}
                />
              )}

              {/* Next day */}
              <button
                onClick={() => setResourcesDay((d) => Math.min(getDaysInMonth(currentYear, currentMonth), d + 1))}
                disabled={clampedResourcesDay === getDaysInMonth(currentYear, currentMonth)}
                aria-label="Next day"
                style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  border: `1px solid ${sc.border}`, background: sc.controlBg,
                  color: sc.body,
                  cursor: clampedResourcesDay === getDaysInMonth(currentYear, currentMonth) ? "not-allowed" : "pointer",
                  opacity: clampedResourcesDay === getDaysInMonth(currentYear, currentMonth) ? 0.4 : 1,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          ) : desktopView === "Weekly" ? (
            /* ── Weekly: prev-week / clickable week-range / next-week ── */
            <div ref={weekPickerRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "6px" }}>
              {/* Prev week */}
              <button
                onClick={handlePrevWeek}
                aria-label="Previous week"
                style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  border: `1px solid ${sc.border}`, background: sc.controlBg,
                  color: sc.body, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <ChevronLeft size={16} />
              </button>

              {/* Clickable week-range label — opens the week picker popover */}
              <button
                onClick={() => setShowWeekPicker((v) => !v)}
                aria-expanded={showWeekPicker}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${showWeekPicker ? sc.brand : "transparent"}`,
                  background: showWeekPicker
                    ? (isDark ? "rgba(0,196,160,0.10)" : "rgba(0,196,160,0.06)")
                    : "transparent",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: sc.heading,
                  cursor: "pointer",
                  fontFamily: "var(--font-family)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatWeekRange(weekAnchor)}
                <ChevronDown
                  size={14}
                  style={{
                    transform: showWeekPicker ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                    color: sc.muted,
                  }}
                />
              </button>

              {showWeekPicker && (
                <WeekPicker
                  weekStart={weekAnchor}
                  onPick={handlePickWeek}
                  sc={sc}
                  isDark={isDark}
                />
              )}

              {/* Next week */}
              <button
                onClick={handleNextWeek}
                aria-label="Next week"
                style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  border: `1px solid ${sc.border}`, background: sc.controlBg,
                  color: sc.body, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          ) : desktopView === "Daily" ? (
            /* ── Daily: prev-day / clickable-date / next-day (reuses the
               same ResourcesDayPicker popover, keyed off its own dailyDay
               state so Daily and Resources can be on different dates). ── */
            <div ref={dailyDayPickerRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "6px" }}>
              {/* Prev day — crosses a month boundary automatically (e.g. day 1
                  back a day lands on the last day of the previous month)
                  instead of clamping at the edge and forcing a manual month
                  change first. Mirrors the Weekly view's cross-month nav. */}
              <button
                onClick={() => {
                  const d = new Date(currentYear, currentMonth, clampedDailyDay - 1);
                  setDailyDay(d.getDate());
                  setCurrentMonth(d.getMonth());
                  setCurrentYear(d.getFullYear());
                }}
                aria-label="Previous day"
                style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  border: `1px solid ${sc.border}`, background: sc.controlBg,
                  color: sc.body, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <ChevronLeft size={16} />
              </button>

              {/* Clickable date label — opens day picker popover */}
              <button
                onClick={() => setShowDailyDayPicker((v) => !v)}
                aria-expanded={showDailyDayPicker}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${showDailyDayPicker ? sc.brand : "transparent"}`,
                  background: showDailyDayPicker
                    ? (isDark ? "rgba(0,196,160,0.10)" : "rgba(0,196,160,0.06)")
                    : "transparent",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: sc.heading,
                  cursor: "pointer",
                  fontFamily: "var(--font-family)",
                  whiteSpace: "nowrap",
                }}
              >
                {(() => {
                  const d = new Date(currentYear, currentMonth, clampedDailyDay);
                  const DAY_NAMES_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                  return `${DAY_NAMES_SHORT[d.getDay()]}, ${MONTH_NAMES[currentMonth].slice(0,3)} ${clampedDailyDay}, ${currentYear}`;
                })()}
                <ChevronDown
                  size={14}
                  style={{
                    transform: showDailyDayPicker ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                    color: sc.muted,
                  }}
                />
              </button>

              {showDailyDayPicker && (
                <ResourcesDayPicker
                  selectedDay={clampedDailyDay}
                  selectedMonth={currentMonth}
                  selectedYear={currentYear}
                  onPick={(d, m, y) => {
                    setDailyDay(d);
                    setCurrentMonth(m);
                    setCurrentYear(y);
                    setShowDailyDayPicker(false);
                  }}
                  sc={sc}
                  isDark={isDark}
                />
              )}

              {/* Next day — crosses into the following month automatically
                  once it runs past the current month's last day. */}
              <button
                onClick={() => {
                  const d = new Date(currentYear, currentMonth, clampedDailyDay + 1);
                  setDailyDay(d.getDate());
                  setCurrentMonth(d.getMonth());
                  setCurrentYear(d.getFullYear());
                }}
                aria-label="Next day"
                style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  border: `1px solid ${sc.border}`, background: sc.controlBg,
                  color: sc.body,
                  cursor: "pointer",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            /* ── Monthly: month/year picker ── */
            <div ref={desktopMonthPickerRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowDesktopMonthPicker(!showDesktopMonthPicker)}
                aria-expanded={showDesktopMonthPicker}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${showDesktopMonthPicker ? sc.brand : "transparent"}`,
                  background: showDesktopMonthPicker
                    ? (isDark ? "rgba(0,196,160,0.10)" : "rgba(0,196,160,0.06)")
                    : "transparent",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: sc.heading,
                  cursor: "pointer",
                  fontFamily: "var(--font-family)",
                }}
              >
                {MONTH_NAMES[currentMonth]} {currentYear}
                <ChevronDown
                  size={14}
                  style={{
                    transform: showDesktopMonthPicker ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                    color: sc.muted,
                  }}
                />
              </button>

              {showDesktopMonthPicker && (
                <MonthYearPicker
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  onPick={handleDesktopPickMonth}
                  sc={sc}
                  isDark={isDark}
                />
              )}
            </div>
          )}

          {/* Today — hidden when already on today.
              For Resources: today = current day in current month/year.
              For Weekly: today = current Mon→Sun week.
              For Daily: today = current day in current month/year.
              For Monthly/other: today = current month/year. */}
          {!(desktopView === "Resources"
            ? (isCurrentMonth && clampedResourcesDay === today.getDate())
            : desktopView === "Weekly"
            ? isCurrentWeek
            : desktopView === "Daily"
            ? (isCurrentMonth && clampedDailyDay === today.getDate())
            : isCurrentMonth) && (
            <button
              onClick={handleGoToToday}
              style={{
                ...controlBtn,
                padding: "8px 14px",
                fontSize: "14px",
                fontWeight: 500,
                color: sc.body,
              }}
            >
              Today
            </button>
          )}
        </div>

        {/* Calendar-zone right slot — always holds AddReservation so it
            aligns with the top-right corner of the calendar grid below. */}
        <div style={{ justifySelf: "end", display: "flex", alignItems: "center" }}>
          {addReservationBtn}
        </div>
        </div>
      </div>

      {/* ── Calendar container ───────────────────────────────────────
          Becomes a flex-col container so the sub-header keeps its
          intrinsic height and the grid below claims the rest. */}
      <div
        style={{
          flex: "1 1 0",
          minWidth: 0,
          borderRadius: "12px",
          border: `1px solid ${sc.border}`,
          overflow: "hidden",
          background: sc.cellBg,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {/* Sub-header: count + search + filters */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px",
            background: sc.headerBg,
            borderBottom: `1px solid ${sc.border}`,
            borderTopLeftRadius: "12px",
            borderTopRightRadius: "12px",
          }}
        >
          {/* Left group: legend Info button + count text. The Info button
              is grouped with the count rather than the right-side
              actions because the legend is a "what does this view mean?"
              affordance — it sits next to the result-count summary so
              users see it as a viewing helper, not a filter action. */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              ref={legendRef}
              onMouseEnter={() => setShowLegend(true)}
              onMouseLeave={() => setShowLegend(false)}
              style={{ position: "relative" }}
            >
              <button
                onClick={() => setShowLegend((v) => !v)}
                aria-expanded={showLegend}
                aria-label="Legend"
                style={{
                  ...controlBtn,
                  width: "28px",
                  height: "28px",
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: showLegend ? sc.brand : sc.border,
                  color: showLegend ? sc.brand : sc.body,
                }}
              >
                <Info size={14} />
              </button>

              {showLegend && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    width: "260px",
                    background: sc.cellBg,
                    border: `1px solid ${sc.border}`,
                    borderRadius: "10px",
                    boxShadow: `0px 12px 24px -6px ${sc.shadow}, 0px 4px 6px 0px ${sc.shadow}`,
                    padding: "16px",
                    zIndex: 100,
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    fontFamily: "var(--font-family)",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 600, color: sc.heading }}>
                    Legend
                  </span>
                  {[
                    // Alphabetized by label. Specific session names
                    // like "Power Yoga" or "Stretch & Restore" aren't
                    // listed — those are session titles, not types.
                    { types: ["closed"] as const, label: "Closed" },
                    { types: ["hiit"] as const, label: "HIIT" },
                    { types: ["league"] as const, label: "League Game" },
                    { types: ["meditation"] as const, label: "Meditation" },
                    { types: ["pilates"] as const, label: "Pilates" },
                    { types: ["yoga"] as const, label: "Yoga" },
                  ].map((row) => {
                    const c = colors[row.types[0]];
                    return (
                      <div
                        key={row.label}
                        style={{ display: "flex", alignItems: "center", gap: "10px" }}
                      >
                        <span
                          aria-hidden
                          style={{
                            display: "inline-block",
                            width: "18px",
                            height: "18px",
                            borderRadius: "4px",
                            background: c.bg,
                            border: `1px solid ${c.border}`,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: "13px", color: sc.body, lineHeight: 1.3 }}>
                          {row.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <span style={{ fontSize: "14px", fontWeight: 500, color: sc.body, lineHeight: "14px" }}>
              Found {displayedCount} {displayedCount === 1 ? "reservation" : "reservations"}
            </span>
            {SHOW_DELETE_MODE_TOGGLE && (
              <>
                {/* Subtle vertical divider to visually separate the count
                    (meta-info) from the Delete Mode toggle (mode toggle).
                    Without it the three left-side items (Info button, count
                    text, toggle pill) sit at uneven visual weights with
                    ambiguous grouping — the divider gives the row a clear
                    "info | mode" rhythm. */}
                <span
                  role="separator"
                  aria-orientation="vertical"
                  style={{
                    width: "1px",
                    height: "18px",
                    background: sc.border,
                    flexShrink: 0,
                  }}
                />
                {/* Delete Mode — slider toggle living in the sub-header's
                    meta-info zone (left side, after the result count) so it's
                    findable but visually subordinate to Search/Filters and
                    far from the Add Reservation primary action. The track
                    turns red when active to telegraph the destructive intent
                    of the mode (matches the dashed-red treatment we apply to
                    deletable events on the calendar). */}
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  title="Quickly delete sessions that have no registered clients"
                >
                  <input
                    type="checkbox"
                    checked={deleteMode}
                    onChange={(e) => setDeleteMode(e.target.checked)}
                    style={{
                      position: "absolute",
                      opacity: 0,
                      width: 0,
                      height: 0,
                      pointerEvents: "none",
                    }}
                  />
                  <span
                    aria-hidden
                    style={{
                      position: "relative",
                      display: "inline-block",
                      width: "32px",
                      height: "18px",
                      borderRadius: "9px",
                      background: deleteMode
                        ? (isDark ? "#e05a5a" : "#d41840")
                        : sc.border,
                      transition: "background 0.15s ease",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: "2px",
                        left: deleteMode ? "16px" : "2px",
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        background: "#ffffff",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                        transition: "left 0.15s ease",
                      }}
                    />
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: deleteMode ? (isDark ? "#e05a5a" : "#d41840") : sc.muted,
                      lineHeight: "14px",
                      transition: "color 0.15s ease",
                    }}
                  >
                    Delete Mode
                  </span>
                </label>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Search */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 10px",
                borderRadius: "8px",
                border: `1px solid ${sc.border}`,
                background: sc.inputBg,
                width: "256px",
                boxShadow: "0px 1px 0.5px 0px rgba(29,41,61,0.02)",
              }}
            >
              <Search size={16} style={{ color: sc.muted, flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search schedule"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "14px",
                  color: sc.heading,
                  width: "100%",
                  lineHeight: "20px",
                }}
              />
            </div>
            {/* Filters moved to the sidebar's Filters tab */}
          </div>
        </div>

        {/* Calendar grid — conditionally renders the monthly grid or the
            Resources (day × resource) view depending on desktopView. */}
        {desktopView === "Resources" ? (
          <ResourcesView
            eventsByDay={filteredEvents}
            day={clampedResourcesDay}
            sc={sc}
            colors={colors}
            isDark={isDark}
            onClickEvent={handleClickEvent}
            onHoverEvent={handleHoverEvent}
            onHoverLeave={handleHoverLeave}
            hoveredEventId={hoveredEvent?.event.id ?? null}
            currentMonth={currentMonth}
            currentYear={currentYear}
            filterInstructors={filterInstructors}
            filterVenues={filterVenues}
            statusVisibility={registrationStatusPrefs.Resources}
            density={density}
            highlightMySessions={highlightMySessions}
          />
        ) : desktopView === "Weekly" ? (
          <WeeklyView
            eventsByDay={filteredEvents}
            weekStart={weekAnchor}
            sc={sc}
            colors={colors}
            isDark={isDark}
            onClickEvent={handleClickEvent}
            onHoverEvent={handleHoverEvent}
            onHoverLeave={handleHoverLeave}
            hoveredEventId={hoveredEvent?.event.id ?? null}
            deleteMode={deleteMode}
            statusVisibility={registrationStatusPrefs.Weekly}
            density={density}
            highlightMySessions={highlightMySessions}
            viewByResource={viewByResource}
            filterInstructors={filterInstructors}
            filterVenues={filterVenues}
          />
        ) : desktopView === "Daily" ? (
          <DailyView
            events={filteredEvents[clampedDailyDay] ?? []}
            day={clampedDailyDay}
            sc={sc}
            colors={colors}
            isDark={isDark}
            onClickEvent={handleClickEvent}
            deleteMode={deleteMode}
            statusVisibility={registrationStatusPrefs.Daily}
            density={density}
            highlightMySessions={highlightMySessions}
            viewByResource={viewByResource}
            filterInstructors={filterInstructors}
            filterVenues={filterVenues}
          />
        ) : (
          /* Monthly grid — headers + weeks share one grid so all column
             boundaries land on the exact same x-positions. */
          <div
            style={{
              flex: "1 1 0",
              minHeight: 0,
              overflowY: "auto",
            }}
          >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gridTemplateRows: "auto",
              gridAutoRows: density === "compact" ? "minmax(120px, 1fr)" : "minmax(130px, 1fr)",
              minHeight: "100%",
            }}
          >
            {/* Day headers */}
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                style={{
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 20px",
                  height: "36px",
                  background: sc.headerBg,
                  borderBottom: `1px solid ${sc.border}`,
                  borderRight: `1px solid ${sc.border}`,
                  fontSize: "14px",
                  fontWeight: 500,
                  color: sc.body,
                  textTransform: "capitalize",
                }}
              >
                {day}
              </div>
            ))}

            {/* Week cells, flattened. Each DateCell has its own minHeight: 149px
                so each week-row stays the same minimum height. */}
            {weeks.flatMap((week, wi) =>
              week.map((day, di) => (
                <DateCell
                  key={`${wi}-${di}`}
                  day={day}
                  isToday={day === todayDate}
                  events={day ? filteredEvents[day] || [] : []}
                  selectedEventId={hoveredEvent?.event.id ?? null}
                  onSelectEvent={(event, e) => {
                    if (day) handleClickEvent(event, day, e);
                  }}
                  onHoverEvent={(event, e) => {
                    if (day) handleHoverEvent(event, day, e);
                  }}
                  onHoverLeave={handleHoverLeave}
                  onShowMore={handleShowMore}
                  sc={sc}
                  colors={colors}
                  isDark={isDark}
                  deleteMode={deleteMode}
                  statusVisibility={registrationStatusPrefs.Monthly}
                  density={density}
                  highlightMySessions={highlightMySessions}
                />
              ))
            )}
          </div>
          </div>
        )}
      </div>
        </div> {/* end Left column */}
      {/* ── Upcoming Today side rail ────────────────────────────────
         Spans the full main-row height (toolbar row + calendar row) so it
         fills the void created when AddReservation moved into the
         calendar-zone right slot. Hidden when the side panel is open so
         the calendar can expand into the freed-up space. Mobile breakpoint
         is handled above by MobileScheduleView. */}
      {/* Right column (Upcoming Today rail) — always rendered, but its
          width animates between 25% and 0 in sync with Layout's
          marginRight push (same 0.3s easing). When the panel opens the
          rail's slot shrinks at the same rate the page is pushed left,
          so the calendar zone's absolute width stays roughly constant
          (no full-width snap, no empty-slot pushing the calendar inward).
          overflow:hidden + flex:0 0 auto keeps the contents clipped as
          the slot collapses. */}
      <div
        style={{
          flex: "0 0 auto",
          width: isSidePanelOpen ? "0%" : "25%",
          // marginLeft is the calendar↔rail gap. It collapses with the
          // rail so the calendar doesn't leave a 20px dead zone on its
          // right when the panel opens.
          marginLeft: isSidePanelOpen ? "0px" : "20px",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          // Match the toolbar's 12px top padding so the panel's top edge
          // aligns with the calendar zone (View/DatePicker/AddReservation),
          // not the very top of the main row.
          paddingTop: "12px",
          overflow: "hidden",
          // Fade the contents out faster than the slot collapses so the
          // rail's text/cards don't visibly clip mid-animation.
          opacity: isSidePanelOpen ? 0 : 1,
          transition:
            "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease",
        }}
      >
        <UpcomingTodayPanel
          events={upcomingToday}
          sc={sc}
          colors={colors}
          isDark={isDark}
          onSelectEvent={handleSelectUpcomingEvent}
          palette={palette}
          filterStartDate={filterStartDate}
          setFilterStartDate={setFilterStartDate}
          filterEndDate={filterEndDate}
          setFilterEndDate={setFilterEndDate}
          filterStartTime={filterStartTime}
          setFilterStartTime={setFilterStartTime}
          filterEndTime={filterEndTime}
          setFilterEndTime={setFilterEndTime}
          filterTypes={filterTypes}
          setFilterTypes={setFilterTypes}
          filterPaymentStatus={filterPaymentStatus}
          setFilterPaymentStatus={setFilterPaymentStatus}
          filterRegistrations={filterRegistrations}
          setFilterRegistrations={setFilterRegistrations}
          filterInstructors={filterInstructors}
          setFilterInstructors={setFilterInstructors}
          filterVenues={filterVenues}
          setFilterVenues={setFilterVenues}
          activeFilterCount={activeFilterCount}
          clearAllFilters={clearAllFilters}
          registrationStatusPrefs={registrationStatusPrefs}
          setRegistrationStatusPrefs={setRegistrationStatusPrefs}
          defaultView={defaultView}
          setDefaultView={setDefaultView}
          density={density}
          setDensity={setDensity}
          keepMyFilters={keepMyFilters}
          setKeepMyFilters={setKeepMyFilters}
          highlightMySessions={highlightMySessions}
          setHighlightMySessions={setHighlightMySessions}
        />
      </div>
      </div>

      {/* ── Hover Popover ──────────────────────────────────────────── */}
      {hoveredEvent && (
        <ReservationDetailsPopover
          event={hoveredEvent.event}
          day={hoveredEvent.day}
          month={hoveredEvent.month}
          year={hoveredEvent.year}
          position={hoveredEvent.position}
          badgeRect={hoveredEvent.badgeRect}
          onClose={handleClosePopover}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          onOpenDetails={handleOpenDetailsFromPopover}
          sc={sc}
          colors={colors}
          isDark={isDark}
        />
      )}

      {/* ── Delete-blocked hint ─────────────────────────────────────
          Shown when the user clicks an ineligible event in Delete Mode.
          Anchored to the clicked badge via getBoundingClientRect (fixed
          positioning, so it overlays anything underneath including the
          calendar's overflow:hidden ancestor). Auto-dismisses after a
          few seconds via the timer set in handleClickEvent. */}
      {deleteBlockedHint && (
        <div
          role="tooltip"
          onClick={() => setDeleteBlockedHint(null)}
          style={{
            position: "fixed",
            top: deleteBlockedHint.top,
            left: deleteBlockedHint.left,
            zIndex: 1500,
            maxWidth: "260px",
            padding: "10px 12px",
            borderRadius: "8px",
            background: sc.cellBg,
            border: `1px solid ${isDark ? "#e05a5a" : "#d41840"}`,
            boxShadow: `0px 8px 16px -4px ${sc.shadow}, 0px 4px 6px 0px ${sc.shadow}`,
            fontSize: "12px",
            lineHeight: 1.45,
            color: sc.body,
            fontFamily: "var(--font-family)",
            cursor: "pointer",
          }}
        >
          Registered clients must be deregistered before the reservation can be deleted.
        </div>
      )}

    </div>
  );
}
