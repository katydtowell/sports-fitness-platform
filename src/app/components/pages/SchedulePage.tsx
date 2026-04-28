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
} from "lucide-react";
import { useTheme, type ThemePalette } from "../layout/ThemeContext";
import { useSidePanel } from "../layout/SidePanelContext";
import { useIsMobile } from "../ui/use-mobile";
import { CancelConfirmModal } from "../client-profile/CancelConfirmModal";

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
    postBuffer = 0
  ): CalendarEvent => ({ id, title, time, type, instructor, venue, booked, capacity, fullWidth, waitlistEnabled, preBuffer, postBuffer });

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
  // pools per reservation type. The original makeEvent calls used
  // "Alan Alda" / "Studio B" as lazy defaults (and many were never
  // overridden), which made the by-resource sort look like one giant
  // Alan Alda / Studio B group. We override those values here based on
  // a deterministic hash of the event id so the demo schedule has
  // realistic variety while staying stable across renders.
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
  // day+type bucket we pick one of three modes deterministically:
  //   0 = "all same"   → every session of that type on that day shares
  //                      one instructor (or venue). Demonstrates the
  //                      multi-sessions-per-resource case clearly when
  //                      sorting by resource.
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
  for (const dayKey of Object.keys(events)) {
    const dayEvents = events[Number(dayKey)];

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
      const insts = INSTRUCTORS_FOR[type];
      const vens = VENUES_FOR[type];
      const dayTypeHash = hashId(`${dayKey}-${type}`);
      // Independent modes for instructor and venue so they don't lock
      // together (e.g. avoid "all-same instructor always lines up with
      // all-same venue").
      const instMode = dayTypeHash % 3;
      const venueMode = (hashId(`${dayKey}-${type}-v`)) % 3;
      const instBase = dayTypeHash;
      const venueBase = hashId(`${dayKey}-${type}-vbase`);

      evs.forEach((ev, i) => {
        if (insts && insts.length > 0) {
          ev.instructor = insts[pickIdx(instMode, instBase, i, insts.length)];
        }
        if (vens && vens.length > 0) {
          ev.venue = vens[pickIdx(venueMode, venueBase, i, vens.length)];
        }

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

const MAX_VISIBLE_EVENTS = 4;

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

  // Stripe area is 12px wide; bump padding to 14px on the affected side so
  // text starts just past the stripes (mirrors the "diagonal lines next to
  // the title" pattern from the source design).
  const STRIPE_W = 12;
  const padL = hasPre ? STRIPE_W + 2 : 6;
  const padR = hasPost ? STRIPE_W + 2 : 6;

  // Theme-aware "deletable" red — same hue as the overdue-balances meter
  // segment so destructive affordances stay visually consistent.
  const deletableColor = isDark ? "#e05a5a" : "#d41840";

  const badgeStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    height: "24px",
    padding: `4px ${padR}px 4px ${padL}px`,
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: 700,
    lineHeight: "16px",
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
    color: isDeletable ? deletableColor : isSelected ? (isDark ? "#0a0e0f" : "#ffffff") : style.text,
    opacity: dimNonDeletable ? 0.4 : 1,
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
            fontWeight: 400,
            textAlign: "right",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
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
}: {
  events: CalendarEvent[];
  selectedId: string | null;
  onSelect: (event: CalendarEvent, e: React.MouseEvent) => void;
  onHoverEvent?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onHoverLeave?: () => void;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  deleteMode?: boolean;
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
}) {
  if (day === null) {
    return (
      <div
        style={{
          // `flex` is harmless inside a grid (a grid parent ignores it); kept
          // so this cell still works if reused inside a flex container.
          flex: "1 1 0",
          minWidth: 0,
          minHeight: "130px",
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

  const visibleRows = rows.slice(0, MAX_VISIBLE_EVENTS);
  const hiddenCount = events.length - visibleRows.reduce((s, r) => s + r.length, 0);

  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        minHeight: "130px",
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
  onOpenDetails: () => void;
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
              {event.time
                ? `${event.time.replace("am", ":00am").replace("pm", ":00pm")} - ${
                    parseInt(event.time) + 1 > 12
                      ? `${parseInt(event.time) + 1 - 12}:00pm`
                      : `${parseInt(event.time) + 1}:00${event.time.includes("pm") ? "pm" : "am"}`
                  }`
                : "—"}
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
        <button style={secondaryBtn}>
          Open Clients <ArrowRight size={14} />
        </button>
        <button style={secondaryBtn}>
          <Plus size={14} /> Book A Client
        </button>
      </div>

      {/* Primary CTA */}
      <button
        onClick={onOpenDetails}
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
              {event.time
                ? `${event.time.replace("am", ":00am").replace("pm", ":00pm")} - ${
                    parseInt(event.time) + 1 > 12
                      ? `${parseInt(event.time) + 1 - 12}:00pm`
                      : `${parseInt(event.time) + 1}:00${event.time.includes("pm") ? "pm" : "am"}`
                  }`
                : "—"}
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
  filterRegistrations: "" | "Full" | "Some" | "All";
  setFilterRegistrations: (v: "" | "Full" | "Some" | "All") => void;
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
        if (filterVenues.length > 0 && !filterVenues.includes(e.venue)) return false;
        if (filterInstructors.length > 0 && !filterInstructors.includes(e.instructor)) return false;
        if (filterTypes.length > 0 && !filterTypes.includes(e.type)) return false;
        if (filterPaymentStatus === "Owed" && getOwedCount(e) === 0) return false;
        if (filterPaymentStatus === "Paid" && getOwedCount(e) > 0) return false;
        if (filterRegistrations) {
          if (e.capacity <= 0) return false;
          const isFull = e.booked >= e.capacity;
          const isAllAvailable = e.booked === 0;
          const isSomeAvailable = !isFull && !isAllAvailable;
          if (filterRegistrations === "Full" && !isFull) return false;
          if (filterRegistrations === "Some" && !isSomeAvailable) return false;
          if (filterRegistrations === "All" && !isAllAvailable) return false;
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
  if (bucket === 0) {
    // All-paid scenario — slice from the all-paid list (cap at its
    // length so we don't read past the end if booked is unusually high).
    return ALL_PAID_CLIENTS.slice(0, Math.min(booked, ALL_PAID_CLIENTS.length));
  }
  return MOCK_BOOKED_CLIENTS.slice(0, booked);
}

// Helper: how many of an event's booked clients owe a balance.
// Used in the hover popover meter, the clients list column counts, and
// the calendar Filters popover's "overdue balances" filter.
function getOwedCount(event: CalendarEvent): number {
  return getEventClients(event).filter((c) => c.paymentStatus === "Owed").length;
}

/**
 * Self-contained dropdown rendered into the SidePanel header (next to the
 * panel title) via `setHeaderExtras`. Owns its own open/close state and
 * outside-click handling so it can live in a different React subtree from
 * the panel content that registered it.
 */
function SectionHeaderDropdown({
  sections,
  activeSection,
  onSelectSection,
}: {
  sections: string[];
  activeSection: string;
  onSelectSection: (s: string) => void;
}) {
  const { palette, mode } = useTheme();
  const isDark = mode === "dark";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch section"
        title={`Section: ${activeSection}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "26px",
          height: "26px",
          padding: 0,
          background: open ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent",
          border: "none",
          borderRadius: "6px",
          color: palette.textTertiary,
          cursor: "pointer",
          outline: "none",
          transition: "background 0.15s ease, color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
            e.currentTarget.style.color = palette.textPrimary;
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = palette.textTertiary;
          }
        }}
      >
        <ChevronDown
          size={16}
          style={{ transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: "200px",
            background: palette.surfacePrimary,
            border: `1px solid ${palette.borderLight}`,
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            zIndex: 20,
            overflow: "hidden",
            padding: "4px",
          }}
        >
          {sections.map((section) => {
            const isActive = section === activeSection;
            return (
              <button
                key={section}
                onClick={() => {
                  onSelectSection(section);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 12px",
                  border: "none",
                  borderRadius: "6px",
                  background: isActive ? `${palette.primary}20` : "transparent",
                  color: isActive ? palette.primary : palette.textPrimary,
                  fontSize: "var(--text-sm)",
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: "var(--font-family)",
                  cursor: "pointer",
                  textAlign: "left",
                  whiteSpace: "nowrap",
                }}
              >
                {section}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReservationDetailsPanelContent({ event }: { event: CalendarEvent }) {
  const { palette, mode } = useTheme();
  const isDark = mode === "dark";
  const { closePanel, setHeaderExtras } = useSidePanel();

  const [activeSection, setActiveSection] = useState("Details");
  const [isEditing, setIsEditing] = useState(false);
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
    setOnlineDescription(initOnlineDescription);
    setAllowSelfBooking(initAllowSelfBooking);
    setAllowFreeBookings(initAllowFreeBookings);
    setShowOnEZLeagues(initShowOnEZLeagues);
    setShowCancelConfirm(false);
    setIsEditing(false);
  };

  const sections = ["Details", "Registration", "Registered Clients", "Linked", "History"];

  // Register the section switcher into the SidePanel header (chevron next
  // to the panel title). Re-runs on activeSection change so the dropdown
  // always reflects the current section. Cleans up on unmount.
  useEffect(() => {
    setHeaderExtras(
      <SectionHeaderDropdown
        sections={sections}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      />
    );
    return () => setHeaderExtras(null);
    // sections is a stable literal; depending on activeSection ensures the
    // header shows the correct active item highlight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, setHeaderExtras]);

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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Section switching now lives in the panel header dropdown. */}

        {/* ── Availability + Editing indicator + Book action ── */}
        {event.capacity > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "8px", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${palette.borderLight}` }}>
            <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textTertiary, fontWeight: 500 }}>{available > 0 ? <><span style={{ fontWeight: 700, fontSize: "var(--text-base)", color: palette.primary }}>{available}</span> spot{available !== 1 ? "s" : ""} available</> : <span style={{ color: isDark ? "#ff6b6b" : "#d32f2f", fontWeight: 600 }}>Fully booked</span>}</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button onClick={handleCancelEditing} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 14px", borderRadius: "6px", border: `1px solid ${palette.primary}`, background: `${palette.primary}15`, color: palette.primary, fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" }}><Pencil size={13} /> Editing</button>
              {available > 0 ? (
                <button onClick={() => setActiveSection("Registration")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 16px", borderRadius: "6px", border: "none", background: palette.primary, color: isDark ? "#0a0e0f" : "#101828", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" }}><Plus size={13} /> Book</button>
              ) : (
                <button onClick={() => setActiveSection("Registration")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 16px", borderRadius: "6px", border: "none", background: isDark ? "rgba(255,180,50,0.2)" : "rgba(220,150,20,0.15)", color: isDark ? "#ffb432" : "#b07a10", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" }}><Plus size={13} /> Waitlist</button>
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
        <div style={{ display: "flex", gap: "12px" }}><div style={{ flex: 1 }}><div style={labelBoldStyle}>Start date*</div><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} /></div><div style={{ flex: 1 }}><div style={labelBoldStyle}>End date*</div><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} /></div></div>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}><div style={{ flex: 1 }}><div style={labelBoldStyle}>Start time*</div><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} disabled={allDay} /></div><label style={{ display: "flex", alignItems: "center", gap: "6px", paddingBottom: "10px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} style={{ accentColor: palette.primary }} /> All day</label><div style={{ flex: 1 }}><div style={labelBoldStyle}>End time*</div><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} disabled={allDay} /></div></div>

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
  // Section switching now lives in the panel header (chevron next to title)
  // via setHeaderExtras; the panel body opens straight into section content.
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── Availability + Edit Reservation + Book action ── */}
      {event.capacity > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "8px", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${palette.borderLight}` }}>
          <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textTertiary, fontWeight: 500 }}>{available > 0 ? <><span style={{ fontWeight: 700, fontSize: "var(--text-base)", color: palette.primary }}>{available}</span> spot{available !== 1 ? "s" : ""} available</> : <span style={{ color: isDark ? "#ff6b6b" : "#d32f2f", fontWeight: 600 }}>Fully booked</span>}</span>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={() => setIsEditing(true)} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 14px", borderRadius: "6px", border: `1px solid ${palette.borderMedium}`, background: "transparent", color: palette.textPrimary, fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer", whiteSpace: "nowrap" }}><Pencil size={13} /> Edit Reservation</button>
            {available > 0 ? (
              <button onClick={() => setActiveSection("Registration")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 16px", borderRadius: "6px", border: "none", background: palette.primary, color: isDark ? "#0a0e0f" : "#101828", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" }}><Plus size={13} /> Book</button>
            ) : (
              <button onClick={() => setActiveSection("Registration")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 16px", borderRadius: "6px", border: "none", background: isDark ? "rgba(255,180,50,0.2)" : "rgba(220,150,20,0.15)", color: isDark ? "#ffb432" : "#b07a10", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" }}><Plus size={13} /> Waitlist</button>
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

function AddReservationPanelContent() {
  const { palette, mode } = useTheme();
  const isDark = mode === "dark";
  const { closePanel, setHeaderExtras } = useSidePanel();

  const [activeSection, setActiveSection] = useState("Details");

  // Initial / "pristine" values — used to detect unsaved changes when the
  // user clicks Cancel. Anything that diverges from these is treated as a
  // change worth confirming away.
  const initScheduleType: "session" | "rental" = "session";
  const initRecurring: "yes" | "no" = "no";
  const initVenues: string[] = [];
  const initInstructors: string[] = [];
  const initReservationType = "";
  const initTitle = "";
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
    showOnEZLeagues !== initShowOnEZLeagues;

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

  // Register section switcher into the SidePanel header.
  useEffect(() => {
    setHeaderExtras(
      <SectionHeaderDropdown
        sections={sections}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      />
    );
    return () => setHeaderExtras(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, setHeaderExtras]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {showCancelConfirm && (
        <CancelConfirmModal
          onConfirm={handleConfirmDiscard}
          onKeepEditing={() => setShowCancelConfirm(false)}
        />
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Section switching now lives in the panel header dropdown. */}

      {/* Schedule type */}
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
        <input type="text" placeholder="e.g. 1, 10, 30, etc." style={inputStyle} />
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

      {/* Start time / End time */}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <div style={labelBoldStyle}>Start time*</div>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} disabled={allDay} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", paddingBottom: "10px", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} style={{ accentColor: palette.primary }} />
          All day
        </label>
        <div style={{ flex: 1 }}>
          <div style={labelBoldStyle}>End time*</div>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} disabled={allDay} />
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
        <input type="text" placeholder="Enter notes" style={inputStyle} />
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

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT — UpcomingTodayPanel (desktop side-rail)
   ═══════════════════════════════════════════════════════════════════════ */

interface UpcomingTodayPanelProps {
  events: CalendarEvent[];
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  onSelectEvent: (event: CalendarEvent) => void;
}

function UpcomingTodayPanel({ events, sc, colors, isDark, onSelectEvent }: UpcomingTodayPanelProps) {
  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <aside
      style={{
        flex: "1 1 0",
        minWidth: 0,
        // No alignSelf override — the parent row uses alignItems:"stretch",
        // so the rail matches the calendar's height. A min-height:0 lets the
        // inner list scroll instead of pushing the rail past the row bounds.
        minHeight: 0,
        borderRadius: "12px",
        border: `1px solid ${sc.border}`,
        background: sc.cellBg,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px",
          background: sc.headerBg,
          borderBottom: `1px solid ${sc.border}`,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <span style={{ fontSize: "16px", fontWeight: 600, color: sc.heading, lineHeight: "20px" }}>
          Upcoming Today
        </span>
        <span style={{ fontSize: "13px", color: sc.muted, lineHeight: "16px" }}>
          {dateLabel} · {events.length} reservation{events.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* List */}
      <div
        className="always-show-scrollbar"
        style={{
          flex: 1,
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          minHeight: 0,
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
                {/* Color-coded dot */}
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    marginTop: "5px",
                    borderRadius: "50%",
                    background: ec.text,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                  {/* Title + time */}
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: sc.heading,
                        lineHeight: "18px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {event.title}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: sc.body,
                        lineHeight: "16px",
                        flexShrink: 0,
                      }}
                    >
                      {event.time}
                    </span>
                  </div>
                  {/* Instructor + venue */}
                  <div
                    style={{
                      fontSize: "12px",
                      color: sc.muted,
                      lineHeight: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <User size={12} /> {event.instructor}
                    </span>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <MapPin size={12} /> {event.venue}
                    </span>
                  </div>
                  {/* Booked / availability */}
                  <div
                    style={{
                      fontSize: "12px",
                      lineHeight: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: sc.body,
                    }}
                  >
                    <Users size={12} style={{ color: sc.muted }} />
                    <span style={{ fontWeight: 600 }}>
                      {event.booked}/{event.capacity}
                    </span>
                    <span style={{ color: sc.muted }}>
                      {isFull
                        ? event.waitlistEnabled
                          ? "(Waitlist open)"
                          : "(Full)"
                        : `(${remaining} available)`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
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
  filterRegistrations: "" | "Full" | "Some" | "All";
  setFilterStartDate: (v: string) => void;
  setFilterEndDate: (v: string) => void;
  setFilterStartTime: (v: string) => void;
  setFilterEndTime: (v: string) => void;
  setFilterVenues: (v: string[]) => void;
  setFilterInstructors: (v: string[]) => void;
  setFilterTypes: (v: ReservationType[]) => void;
  setFilterPaymentStatus: (v: "" | "Owed" | "Paid") => void;
  setFilterRegistrations: (v: "" | "Full" | "Some" | "All") => void;
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

      {/* Date range — hidden on mobile since the mini calendar already controls the date */}
      {!mobileLayout && (
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: sc.body, marginBottom: "6px" }}>Date range</div>
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
        <div style={{ fontSize: "12px", fontWeight: 600, color: sc.body, marginBottom: "6px" }}>Time range</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="time"
            value={filterStartTime}
            onChange={(e) => setFilterStartTime(e.target.value)}
            style={{ flex: 1, minWidth: 0, padding: "8px 10px", fontSize: "13px", fontFamily: "var(--font-family)", border: `1px solid ${sc.border}`, borderRadius: "6px", background: sc.inputBg, color: sc.heading, colorScheme: isDark ? "dark" : "light" }}
          />
          <input
            type="time"
            value={filterEndTime}
            onChange={(e) => setFilterEndTime(e.target.value)}
            style={{ flex: 1, minWidth: 0, padding: "8px 10px", fontSize: "13px", fontFamily: "var(--font-family)", border: `1px solid ${sc.border}`, borderRadius: "6px", background: sc.inputBg, color: sc.heading, colorScheme: isDark ? "dark" : "light" }}
          />
        </div>
      </div>

      {/* Venues */}
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

      {/* Instructors */}
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

      {/* Reservation types — desktop renders as colored chips that
          double as the legend; mobile renders as a searchable
          multiselect with a colored dot per option (the chips would
          wrap awkwardly in a narrow drawer, but the dot still anchors
          each row to its calendar color). */}
      <div>
        <div style={{ fontSize: "12px", fontWeight: 600, color: sc.body, marginBottom: "6px" }}>Reservation types</div>
        {mobileLayout ? (
          <SearchableMultiSelect
            options={TYPE_OPTIONS as string[]}
            selected={filterTypes as string[]}
            onChange={(values) => setFilterTypes(values as ReservationType[])}
            placeholder="—Any type—"
            palette={palette}
            getLabel={(o) => typeLabel(o as ReservationType)}
            getLeading={renderTypeDot}
          />
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {TYPE_OPTIONS.map((t) => {
              const isActive = filterTypes.includes(t);
              const c = colors[t];
              const toggle = () => {
                const next = filterTypes.includes(t)
                  ? filterTypes.filter((x) => x !== t)
                  : [...filterTypes, t];
                setFilterTypes(next);
              };
              return (
                <button
                  key={t}
                  onClick={toggle}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "12px",
                    border: `1px solid ${c.border}`,
                    background: isActive ? c.bg : "transparent",
                    color: c.text,
                    fontSize: "11px",
                    fontWeight: 600,
                    fontFamily: "var(--font-family)",
                    cursor: "pointer",
                    lineHeight: 1.4,
                    opacity: isActive ? 1 : 0.7,
                    transition: "all 0.15s ease",
                  }}
                >
                  {typeLabel(t)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Registrations + Payment status — derived-state filters. */}
      <div style={{ height: "1px", background: sc.border }} />
      <div>
        <div style={{ fontSize: "12px", fontWeight: 600, color: sc.body, marginBottom: "6px" }}>Registrations</div>
        <select
          value={filterRegistrations}
          onChange={(e) => setFilterRegistrations(e.target.value as "" | "Full" | "Some" | "All")}
          style={{
            width: "100%",
            padding: "6px 32px 6px 12px",
            fontSize: "13px",
            fontFamily: "var(--font-family)",
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "6px",
            background: palette.surfaceBg,
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
          <option value="Full">Full</option>
          <option value="Some">Some Available</option>
          <option value="All">All Available</option>
        </select>
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
            background: palette.surfaceBg,
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
  const [desktopView, setDesktopView] = useState("Monthly");
  const [showDesktopViewDropdown, setShowDesktopViewDropdown] = useState(false);
  const desktopViewRef = useRef<HTMLDivElement>(null);

  // ── Calendar Filters popover state ──
  // Mirrors the criteria available in reservation details: date range,
  // time range, venues, instructors, reservation types, and a balances-owed
  // toggle. All filter dimensions combine with AND in the filteredEvents
  // memo below; an empty value (string "" or empty array) means "no filter"
  // for that dimension.
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
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
  const [deleteMode, setDeleteMode] = useState(false);
  const [deletedEventIds, setDeletedEventIds] = useState<Set<string>>(() => new Set());
  // Click-on-ineligible feedback. When the user clicks an event that
  // can't be deleted in Delete Mode (booked > 0, or league/closed), we
  // show a small tooltip near the event explaining the gating rule.
  // Auto-dismisses after a few seconds; cleared whenever Delete Mode
  // toggles off, the user dismisses it, or the next event click runs.
  const [deleteBlockedHint, setDeleteBlockedHint] = useState<{ top: number; left: number } | null>(null);
  const deleteBlockedHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterStartTime, setFilterStartTime] = useState("");
  const [filterEndTime, setFilterEndTime] = useState("");
  const [filterVenues, setFilterVenues] = useState<string[]>([]);
  const [filterInstructors, setFilterInstructors] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<ReservationType[]>([]);
  // Payment status — "" means "Any" (no filter). "Owed" shows only events
  // where at least one registered client has an outstanding balance;
  // "Paid" shows only events where every registered client is paid up.
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<"" | "Owed" | "Paid">("");
  // Registrations — "" means any. "Full" = booked >= capacity; "Some" =
  // booked > 0 and < capacity (partial roster); "All" = booked === 0.
  // Events with no capacity (e.g. league games / closures) are skipped
  // by this filter, since "available seats" doesn't apply to them.
  const [filterRegistrations, setFilterRegistrations] = useState<"" | "Full" | "Some" | "All">("");

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
    (filterRegistrations ? 1 : 0);

  const clearAllFilters = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterStartTime("");
    setFilterEndTime("");
    setFilterVenues([]);
    setFilterInstructors([]);
    setFilterTypes([]);
    setFilterPaymentStatus("");
    setFilterRegistrations("");
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

  // Close filters popover on outside click
  useEffect(() => {
    if (!showFilters) return;
    function handleClick(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilters]);

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


  // Hover popover state (with 300ms delay)
  const [hoveredEvent, setHoveredEvent] = useState<{
    event: CalendarEvent;
    day: number;
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

  // Hover handlers with 300ms delay
  const handleHoverEvent = useCallback(
    (event: CalendarEvent, day: number, e: React.MouseEvent) => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      hoverTimerRef.current = setTimeout(() => {
        setHoveredEvent({
          event,
          day,
          position: { top: rect.top, left: rect.right + 8 },
          badgeRect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
        });
      }, 300);
    },
    []
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

  const handleOpenDetailsFromPopover = useCallback(() => {
    if (!hoveredEvent) return;
    const ev = hoveredEvent.event;
    setHoveredEvent(null);
    isInsidePopoverRef.current = false;
    openPanel(
      <ReservationDetailsPanelContent key={ev.id} event={ev} />,
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
        if (filterVenues.length > 0 && !filterVenues.includes(e.venue)) return false;
        if (filterInstructors.length > 0 && !filterInstructors.includes(e.instructor)) return false;
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
        if (filterRegistrations) {
          if (e.capacity <= 0) return false;
          const isFull = e.booked >= e.capacity;
          const isAllAvailable = e.booked === 0;
          const isSomeAvailable = !isFull && !isAllAvailable;
          if (filterRegistrations === "Full" && !isFull) return false;
          if (filterRegistrations === "Some" && !isSomeAvailable) return false;
          if (filterRegistrations === "All" && !isAllAvailable) return false;
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

  const totalReservations = Object.values(filteredEvents).reduce(
    (sum: number, evts: CalendarEvent[]) =>
      sum + evts.filter((e: CalendarEvent) => e.type !== "closed").length,
    0
  );

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

          {/* "Today" — only shown when the calendar isn't already on the
              real-world current month/year. Clicking jumps back to today. */}
          {!isCurrentMonth && (
            <button
              onClick={handleGoToToday}
              style={{
                ...controlBtn,
                padding: "12px 20px",
                fontSize: "16px",
                fontWeight: 500,
                color: sc.body,
              }}
            >
              Today
            </button>
          )}
        </div>

        {/* Date picker — centered month/year dropdown */}
        <div style={{ justifySelf: "center", display: "flex", alignItems: "center", padding: "8px" }}>
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
              Found {totalReservations} reservations
            </span>
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
            {/* Filters — opens a structured popover that mirrors the
                criteria available in reservation details (date / time
                ranges, venues, instructors, types) plus a dedicated
                balances-owed toggle. Active filter dimensions get a count
                badge on the button so the user knows the calendar is
                showing a filtered subset. */}
            <div ref={filtersRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                style={{
                  ...controlBtn,
                  gap: "6px",
                  padding: "8px 12px",
                  fontSize: "14px",
                  fontWeight: 500,
                  borderColor: activeFilterCount > 0 ? sc.brand : sc.border,
                  color: activeFilterCount > 0 ? sc.brand : sc.body,
                }}
              >
                <SlidersHorizontal size={16} /> Filters
                {activeFilterCount > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "18px",
                      height: "18px",
                      padding: "0 5px",
                      borderRadius: "9px",
                      background: sc.brand,
                      color: isDark ? "#0a0e0f" : "#101828",
                      fontSize: "11px",
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown size={16} style={{ transform: showFilters ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }} />
              </button>

              {showFilters && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    width: "360px",
                    maxHeight: "70vh",
                    overflowY: "auto",
                    background: sc.cellBg,
                    border: `1px solid ${sc.border}`,
                    borderRadius: "10px",
                    boxShadow: `0px 12px 24px -6px ${sc.shadow}, 0px 4px 6px 0px ${sc.shadow}`,
                    padding: "16px",
                    zIndex: 100,
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
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar grid — headers + weeks share one grid so all column
            boundaries land on the exact same x-positions. (When each week was
            its own flex row, sub-pixel rounding could shift the 1px column
            borders by a fraction of a pixel between rows, which read as
            misaligned grid lines — most visible on the first/last weeks.)
            The wrapper takes flex:1 and scrolls when the grid's minimum
            height exceeds the available space (e.g. small windows).
            gridAutoRows distributes height equally across week rows
            (down to a per-row minimum of 130px). */}
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
            gridAutoRows: "minmax(130px, 1fr)",
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
              />
            ))
          )}
        </div>
        </div>
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
        />
      </div>
      </div>

      {/* ── Hover Popover ──────────────────────────────────────────── */}
      {hoveredEvent && (
        <ReservationDetailsPopover
          event={hoveredEvent.event}
          day={hoveredEvent.day}
          month={currentMonth}
          year={currentYear}
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
