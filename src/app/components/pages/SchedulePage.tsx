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

import { useState, useRef, useEffect, useCallback, useMemo, type CSSProperties } from "react";
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
} from "lucide-react";
import { useTheme, type ThemePalette } from "../layout/ThemeContext";
import { useSidePanel } from "../layout/SidePanelContext";
import { useIsMobile } from "../ui/use-mobile";
import { CancelConfirmModal } from "../client-profile/CancelConfirmModal";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

type ReservationType =
  | "yoga"
  | "power-yoga"
  | "morning-yoga"
  | "meditation"
  | "pilates"
  | "hiit"
  | "stretch"
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
  "power-yoga":  { bg: "#fef0f2", border: "#ffccd3", text: "#8b0836" },
  "morning-yoga":{ bg: "#fef0f2", border: "#ffccd3", text: "#8b0836" },
  meditation:    { bg: "#f0fdff", border: "#a2f4fd", text: "#0092b8" },
  pilates:       { bg: "#f7f0ff", border: "#e9d4ff", text: "#9810fa" },
  hiit:          { bg: "#fff8f1", border: "#fcd9bd", text: "#771d1d" },
  stretch:       { bg: "#f0fdff", border: "#a2f4fd", text: "#0092b8" },
  league:        { bg: "#ffffff", border: "#e5e7eb", text: "#101828" },
  closed:        { bg: "#f3f4f6", border: "#e5e7eb", text: "#6b7280" },
};

const DARK_EVENT_STYLES: Record<ReservationType, BadgeColors> = {
  yoga:          { bg: "rgba(139,8,54,0.20)",  border: "rgba(139,8,54,0.40)",  text: "#f5a0b8" },
  "power-yoga":  { bg: "rgba(139,8,54,0.20)",  border: "rgba(139,8,54,0.40)",  text: "#f5a0b8" },
  "morning-yoga":{ bg: "rgba(139,8,54,0.20)",  border: "rgba(139,8,54,0.40)",  text: "#f5a0b8" },
  meditation:    { bg: "rgba(0,146,184,0.15)",  border: "rgba(0,146,184,0.35)", text: "#5dd8f0" },
  pilates:       { bg: "rgba(152,16,250,0.15)", border: "rgba(152,16,250,0.30)",text: "#d4a0ff" },
  hiit:          { bg: "rgba(119,29,29,0.20)",  border: "rgba(252,217,189,0.30)",text: "#fcd9bd" },
  stretch:       { bg: "rgba(0,146,184,0.15)",  border: "rgba(0,146,184,0.35)", text: "#5dd8f0" },
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

  const makeEvent = (
    id: string,
    title: string,
    time: string,
    type: ReservationType,
    instructor = "Alan Alda",
    venue = "Studio B",
    booked = 32,
    capacity = 36,
    fullWidth = false,
    waitlistEnabled = false,
    preBuffer = 0,
    postBuffer = 0
  ): CalendarEvent => ({ id, title, time, type, instructor, venue, booked, capacity, fullWidth, waitlistEnabled, preBuffer, postBuffer });

  // Week 1: days 1-7
  // Day 1 — mix of all states + buffer variants (pre-only, post-only, both, none)
  events[1] = [
    makeEvent("1a", "Power Yoga", "11am", "power-yoga", "Alan Alda", "Studio B", 12, 36, false, false, 15, 0),     // pre-buffer only
    makeEvent("1b", "Meditation", "12pm", "meditation", "Sara Chen", "Studio A", 20, 20, false, true, 0, 15),       // post-buffer only
    makeEvent("1c", "Yoga", "1pm", "yoga", "Alan Alda", "Studio B", 28, 36, false, false, 15, 15),                  // both buffers
    makeEvent("1d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 30, 30, false, false),                      // no buffer
    makeEvent("1e", "Pilates", "3pm", "pilates", "Lisa Park", "Studio A", 8, 24, false, false, 30, 0),              // pre-buffer only (longer)
    makeEvent("1f", "Meditation", "4pm", "meditation", "Sara Chen", "Studio A", 24, 24, false, true),               // no buffer
    makeEvent("1g", "Power Yoga", "5pm", "power-yoga", "Alan Alda", "Studio B", 18, 18, false, false, 15, 30),      // both, asymmetric
  ];
  events[2] = [
    makeEvent("2a", "Power Yoga", "11am", "power-yoga", "Alan Alda", "Studio B", 10, 36, false, false, 15, 15),     // both
    makeEvent("2b", "Meditation", "12pm", "meditation", "Sara Chen", "Studio A", 20, 20, false, true),              // none
    makeEvent("2c", "Yoga", "11am", "yoga", "Alan Alda", "Studio B", 36, 36, false, false, 30, 0),                  // pre only
    makeEvent("2d", "Stretch & Restore", "2pm", "stretch", "Lisa Park", "Studio A", 5, 20, false, false, 0, 15),    // post only
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
    makeEvent("4a", "Power Yoga", "11am", "power-yoga", "Alan Alda", "Studio B", 0, 36, false, false, 15, 0),       // pre only
    makeEvent("4b", "Meditation", "12pm", "meditation", "Sara Chen", "Studio A", 20, 20, false, true),              // none
    makeEvent("4c", "Yoga", "1pm", "yoga", "Alan Alda", "Studio B", 30, 36, false, false, 30, 30),                  // both
    makeEvent("4d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 30, 30, false, false),                      // none
    makeEvent("4e", "Pilates", "3pm", "pilates", "Lisa Park", "Studio A", 10, 24, false, false, 0, 15),             // post only
  ];
  events[5] = [
    makeEvent("5a", "Morning Yoga Reset", "11am", "morning-yoga", "Alan Alda", "Studio B", 15, 36, false, false, 15, 0),  // pre only
    makeEvent("5b", "Meditation", "12pm", "meditation", "Sara Chen", "Studio A", 18, 20, false, false),             // none
    makeEvent("5c", "Yoga", "1pm", "yoga", "Alan Alda", "Studio B", 36, 36, false, true, 0, 15),                    // post only
    makeEvent("5d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 25, 30, false, false, 15, 15),              // both
    makeEvent("5e", "Pilates", "3pm", "pilates", "Lisa Park", "Studio A", 24, 24, false, false),                    // none
  ];
  events[6] = [
    makeEvent("6a", "Morning Yoga Reset", "11am", "morning-yoga", "Alan Alda", "Studio B", 20, 36, false, false),   // none
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
    makeEvent("8b", "Meditation", "12am", "meditation"),
    makeEvent("8c", "Power Yoga", "1pm", "power-yoga"),
    makeEvent("8d", "HIIT", "2pm", "hiit"),
    makeEvent("8e", "Pilates", "3pm", "pilates"),
  ];
  events[9] = [
    makeEvent("9a", "Yoga", "11am", "yoga"),
    makeEvent("9b", "Stretch & Restore", "12pm", "stretch"),
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
    makeEvent("12a", "Morning Yoga Reset", "11am", "morning-yoga", "Alan Alda", "Studio B", 32, 36),
    makeEvent("12b", "Meditation", "12am", "meditation"),
    makeEvent("12c", "Yoga", "1pm", "yoga"),
    makeEvent("12d", "HIIT", "2pm", "hiit"),
    makeEvent("12e", "Pilates", "3pm", "pilates"),
  ];
  events[13] = [
    makeEvent("13a", "Morning Yoga Reset", "11am", "morning-yoga"),
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
    makeEvent("15c", "Power Yoga", "1pm", "power-yoga"),
    makeEvent("15d", "HIIT", "2pm", "hiit"),
    makeEvent("15e", "Pilates", "3pm", "pilates"),
  ];
  events[16] = [
    makeEvent("16a", "Yoga", "11am", "yoga"),
    makeEvent("16b", "Meditation", "12am", "meditation"),
    makeEvent("16c", "Yoga", "1pm", "yoga"),
    makeEvent("16d", "HIIT", "2pm", "hiit"),
    makeEvent("16e", "Pilates", "3pm", "pilates"),
  ];
  events[17] = [
    makeEvent("17a", "Yoga", "11am", "yoga"),
    makeEvent("17b", "Tigers v. Capybaras", "12pm", "league", "—", "Field A", 0, 0, true, false, 30, 30),
    makeEvent("17c", "Power Yoga", "1pm", "power-yoga"),
    makeEvent("17d", "HIIT", "2pm", "hiit"),
    makeEvent("17e", "Meditation", "3pm", "meditation"),
  ];
  events[18] = [
    makeEvent("18a", "Morning Yoga Reset", "11am", "morning-yoga"),
    makeEvent("18b", "Meditation", "12am", "meditation"),
    makeEvent("18c", "Tigers v. Capybaras", "1pm", "league", "—", "Field A", 0, 0, true, false, 30, 30),
    makeEvent("18d", "Power Yoga", "2pm", "power-yoga"),
    makeEvent("18e", "HIIT", "3pm", "hiit"),
  ];
  events[19] = [
    makeEvent("19a", "Yoga", "11am", "yoga"),
    makeEvent("19b", "Stretch & Restore", "12pm", "stretch"),
    makeEvent("19c", "Meditation", "1pm", "meditation"),
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
    makeEvent("21b", "Pilates", "12am", "pilates"),
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
    makeEvent("24a", "Morning Yoga Reset", "11am", "morning-yoga"),
    makeEvent("24b", "Tigers v. Capybaras", "12pm", "league", "—", "Field A", 0, 0, true, false, 30, 30),
    makeEvent("24c", "Yoga", "1pm", "yoga"),
    makeEvent("24d", "HIIT", "2pm", "hiit"),
    makeEvent("24e", "Pilates", "3pm", "pilates"),
  ];
  events[25] = [
    makeEvent("25a", "Yoga", "11am", "yoga"),
    makeEvent("25b", "Meditation", "12am", "meditation"),
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
    makeEvent("27a", "Stretch & Restore", "12pm", "stretch"),
    makeEvent("27b", "Yoga", "1pm", "yoga"),
    makeEvent("27c", "Meditation", "2pm", "meditation"),
    makeEvent("27d", "HIIT", "3pm", "hiit"),
    makeEvent("27e", "Pilates", "4pm", "pilates"),
  ];
  events[28] = [
    makeEvent("28a", "Yoga", "11am", "yoga"),
    makeEvent("28b", "Meditation", "12am", "meditation"),
    makeEvent("28c", "Power Yoga", "2pm", "power-yoga"),
    makeEvent("28d", "HIIT", "3pm", "hiit"),
  ];

  // Week 5: days 29-31 (only render in months with 29+ days)
  events[29] = [
    makeEvent("29a", "Morning Yoga Reset", "11am", "morning-yoga", "Alan Alda", "Studio B", 18, 36, false, false),
    makeEvent("29b", "Meditation", "12pm", "meditation", "Sara Chen", "Studio A", 14, 20, false, false),
    makeEvent("29c", "Yoga", "1pm", "yoga", "Alan Alda", "Studio B", 26, 36, false, false),
    makeEvent("29d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 22, 30, false, false),
    makeEvent("29e", "Pilates", "3pm", "pilates", "Lisa Park", "Studio A", 16, 24, false, false),
  ];
  events[30] = [
    makeEvent("30a", "Power Yoga", "11am", "power-yoga", "Alan Alda", "Studio B", 30, 36, false, false),
    makeEvent("30b", "Stretch & Restore", "12pm", "stretch", "Lisa Park", "Studio A", 8, 20, false, false),
    makeEvent("30c", "Tigers v. Capybaras", "1pm", "league", "—", "Field A", 0, 0, true, false, 30, 30),
    makeEvent("30d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 30, 30, false, true),
    makeEvent("30e", "Meditation", "3pm", "meditation", "Sara Chen", "Studio A", 12, 20, false, false),
  ];
  events[31] = [
    makeEvent("31a", "Yoga", "11am", "yoga", "Alan Alda", "Studio B", 24, 36, false, false),
    makeEvent("31b", "Meditation", "12pm", "meditation", "Sara Chen", "Studio A", 20, 20, false, true),
    makeEvent("31c", "Power Yoga", "1pm", "power-yoga", "Alan Alda", "Studio B", 18, 36, false, false),
    makeEvent("31d", "HIIT", "2pm", "hiit", "Marcus Jones", "Gym Floor", 26, 30, false, false),
    makeEvent("31e", "Pilates", "3pm", "pilates", "Lisa Park", "Studio A", 20, 24, false, false),
  ];

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
}: {
  event: CalendarEvent;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onHoverEnter?: (e: React.MouseEvent) => void;
  onHoverLeave?: () => void;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
}) {
  const style = colors[event.type] || colors.yoga;

  const hasPre = (event.preBuffer ?? 0) > 0;
  const hasPost = (event.postBuffer ?? 0) > 0;

  // Stripe area is 12px wide; bump padding to 14px on the affected side so
  // text starts just past the stripes (mirrors the "diagonal lines next to
  // the title" pattern from the source design).
  const STRIPE_W = 12;
  const padL = hasPre ? STRIPE_W + 2 : 6;
  const padR = hasPost ? STRIPE_W + 2 : 6;

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
    cursor: "pointer",
    flex: event.fullWidth ? "1 0 100%" : "1 1 0",
    minWidth: 0,
    background: isSelected ? style.text : style.bg,
    border: `1px solid ${isSelected ? style.text : style.border}`,
    color: isSelected ? (isDark ? "#0a0e0f" : "#ffffff") : style.text,
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
      onMouseEnter={event.type !== "closed" ? onHoverEnter : undefined}
      onMouseLeave={event.type !== "closed" ? onHoverLeave : undefined}
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
}: {
  events: CalendarEvent[];
  selectedId: string | null;
  onSelect: (event: CalendarEvent, e: React.MouseEvent) => void;
  onHoverEvent?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onHoverLeave?: () => void;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
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
  sc,
  colors,
  isDark,
}: {
  day: number | null;
  isToday: boolean;
  events: CalendarEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: CalendarEvent, e: React.MouseEvent) => void;
  onHoverEvent?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onHoverLeave?: () => void;
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
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
        />
      ))}

      {hiddenCount > 0 && (
        <div
          style={{
            fontSize: "10px",
            fontWeight: 500,
            color: sc.body,
            padding: "2px 5px",
            lineHeight: "16px",
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
  const POPOVER_WIDTH = 320;
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
  const bookedPct = event.capacity > 0 ? (event.booked / event.capacity) * 100 : 0;
  const available = event.capacity - event.booked;

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
  showCalendar: boolean;
  onToggleCalendar: () => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  showFilter: boolean;
  setShowFilter: (show: boolean) => void;
  showViewDropdown: boolean;
  setShowViewDropdown: (show: boolean) => void;
  currentView: string;
  onChangeView: (view: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  /** Whether the user has navigated away from today (different month, year,
   *  or selected day). When true, the Today button is rendered. */
  showTodayButton: boolean;
  /** Resets the calendar to the real-world current date. */
  onGoToToday: () => void;
}

function MobileToolbar({
  sc,
  isDark,
  showCalendar,
  onToggleCalendar,
  showSearch,
  setShowSearch,
  showFilter,
  setShowFilter,
  showViewDropdown,
  setShowViewDropdown,
  currentView,
  onChangeView,
  searchQuery,
  setSearchQuery,
  showTodayButton,
  onGoToToday,
}: MobileToolbarProps) {
  const viewDropdownRef = useRef<HTMLDivElement>(null);

  /* close dropdown on outside click */
  useEffect(() => {
    if (!showViewDropdown) return;
    function handleClick(e: MouseEvent) {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target as Node)) {
        setShowViewDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showViewDropdown, setShowViewDropdown]);

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
        {/* View dropdown trigger + Today button */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* View dropdown trigger — mirrors desktop "Month view" button */}
          <div ref={viewDropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
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
              {currentView} <ChevronDown size={15} />
            </button>

            {/* Dropdown options */}
            {showViewDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  minWidth: "160px",
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
                      onChangeView(view);
                      setShowViewDropdown(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      background: view === currentView ? `${sc.brand}20` : "transparent",
                      color: view === currentView ? sc.brand : sc.body,
                    }}
                  >
                    {view}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* "Today" — only shown when the calendar isn't already on the
              real-world current month/year/day. Clicking returns to today. */}
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

        {/* Right-side icon buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onToggleCalendar}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              border: `1px solid ${showCalendar ? sc.brand : sc.border}`,
              background: showCalendar ? (isDark ? "rgba(0,196,160,0.12)" : "rgba(0,196,160,0.08)") : sc.controlBg,
              cursor: "pointer",
              color: showCalendar ? sc.brand : sc.body,
            }}
          >
            <CalendarIcon size={18} />
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
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
          <button
            onClick={() => setShowFilter(!showFilter)}
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
            <SlidersHorizontal size={18} />
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

      {/* Filters */}
      {showFilter && (
        <div
          style={{
            padding: "12px 16px",
            background: sc.cellBg,
            borderBottom: `1px solid ${sc.border}`,
            fontSize: "14px",
            fontWeight: 500,
            color: sc.body,
          }}
        >
          Filter options would appear here
        </div>
      )}
    </>
  );
}

interface MiniCalendarProps {
  currentMonth: number;
  currentYear: number;
  selectedDate: number;
  onSelectDate: (day: number) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  sc: SemanticColors;
  isDark: boolean;
}

function MiniCalendar({
  currentMonth,
  currentYear,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  sc,
  isDark,
}: MiniCalendarProps) {
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) days.push(day);

  // Get all dates with events for current month
  const datesWithEvents = Object.keys(MOCK_EVENTS).map((k) => parseInt(k));

  return (
    <div
      style={{
        padding: "16px",
        background: sc.cellBg,
        borderBottom: `1px solid ${sc.border}`,
      }}
    >
      {/* Month navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <button
          onClick={onPrevMonth}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            border: "none",
            background: sc.brand,
            color: isDark ? "#0a0e0f" : "#101828",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <span
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: sc.heading,
            minWidth: "140px",
            textAlign: "center",
          }}
        >
          {MONTH_NAMES[currentMonth]} {currentYear}
        </span>
        <button
          onClick={onNextMonth}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            border: "none",
            background: sc.brand,
            color: isDark ? "#0a0e0f" : "#101828",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <ChevronRight size={16} />
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
          const isSelected = day === selectedDate;

          return (
            <div
              key={idx}
              onClick={() => day !== null && onSelectDate(day)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                cursor: day !== null ? "pointer" : "default",
                background: isSelected ? sc.brand : "transparent",
                color: isSelected
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
              {hasEvents && !isSelected && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "6px",
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: sc.brand,
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

interface MobileEventRowProps {
  event: CalendarEvent;
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  onClick: () => void;
}

function MobileEventRow({
  event,
  sc,
  colors,
  isDark,
  onClick,
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
        borderBottom: `1px solid ${sc.border}`,
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

      {/* Middle: instructor + venue — fixed-position column */}
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

interface MobileEventListProps {
  selectedDate: number;
  sc: SemanticColors;
  colors: Record<ReservationType, BadgeColors>;
  isDark: boolean;
  onSelectEvent: (event: CalendarEvent) => void;
  onAddReservation?: () => void;
  eventsByDay?: DayEvents;
  searchQuery?: string;
}

function MobileEventList({
  selectedDate,
  sc,
  colors,
  isDark,
  onSelectEvent,
  onAddReservation,
  eventsByDay,
  searchQuery,
}: MobileEventListProps) {
  const source = eventsByDay ?? MOCK_EVENTS;
  const events = source[selectedDate] || [];
  const nonClosedEvents = events.filter((e) => e.type !== "closed");
  const isFiltering = !!(searchQuery && searchQuery.trim());

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
        <span
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: sc.body,
          }}
        >
          Found {nonClosedEvents.length} reservation(s)
        </span>
        <button
          onClick={onAddReservation}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            background: sc.brand,
            fontSize: "12px",
            fontWeight: 500,
            color: isDark ? "#0a0e0f" : "#101828",
            cursor: "pointer",
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
        {nonClosedEvents.length > 0 ? (
          nonClosedEvents.map((event) => (
            <MobileEventRow
              key={event.id}
              event={event}
              sc={sc}
              colors={colors}
              isDark={isDark}
              onClick={() => onSelectEvent(event)}
            />
          ))
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "120px",
              color: sc.muted,
              fontSize: "14px",
            }}
          >
            {isFiltering ? "No events match your search" : "No events on this date"}
          </div>
        )}
      </div>
    </div>
  );
}

interface MobileScheduleViewProps {
  palette: ThemePalette;
  mode: "light" | "dark";
  onAddReservation?: () => void;
}

function MobileScheduleView({ palette, mode, onAddReservation }: MobileScheduleViewProps) {
  const isDark = mode === "dark";
  const sc = semanticColors(palette, isDark);
  const colors = getEventStyles(isDark);
  const { openPanel } = useSidePanel();

  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(() => new Date().getDate());
  const [currentView, setCurrentView] = useState("Monthly");
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter events by the search query (matches title, instructor, venue, type).
  const filteredEvents = useMemo(
    () => filterEventsByQuery(MOCK_EVENTS, searchQuery),
    [searchQuery]
  );

  const handleToggleCalendar = useCallback(() => {
    setShowCalendar((v) => !v);
  }, []);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  // "Today" — jumps the calendar back to the real-world current month/year
  // AND sets the selected day to today's date. Mobile selects a specific day
  // (unlike desktop, which only navigates by month), so we sync all three.
  const handleGoToToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDate(now.getDate());
  }, []);

  // The Today button shows whenever the user has navigated away from today —
  // either to a different month/year or to a different day within the
  // current month.
  const today = new Date();
  const isViewingToday =
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear() &&
    selectedDate === today.getDate();

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    openPanel(
      <ReservationDetailsPanelContent key={event.id} event={event} />,
      { size: "full", title: `Reservation Details: ${event.title}` }
    );
  }, [openPanel]);

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
        /* offset the Layout's 80px bottom padding on mobile so the list fills the space */
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
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        showFilter={showFilter}
        setShowFilter={setShowFilter}
        showViewDropdown={showViewDropdown}
        setShowViewDropdown={setShowViewDropdown}
        currentView={currentView}
        onChangeView={setCurrentView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showTodayButton={!isViewingToday}
        onGoToToday={handleGoToToday}
      />

      {/* Mini Calendar — toggleable via toolbar button */}
      {showCalendar && <MiniCalendar
        currentMonth={currentMonth}
        currentYear={currentYear}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        sc={sc}
        isDark={isDark}
      />}

      {/* Event List */}
      <MobileEventList
        selectedDate={selectedDate}
        sc={sc}
        colors={colors}
        isDark={isDark}
        onSelectEvent={handleSelectEvent}
        onAddReservation={onAddReservation}
        eventsByDay={filteredEvents}
        searchQuery={searchQuery}
      />

      {/* Full-page reservation detail */}
      {selectedEvent && (
        <MobileReservationDetail
          event={selectedEvent}
          day={selectedDate}
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

const VENUE_OPTIONS = [
  "Studio A",
  "Studio B",
  "Gym Floor",
  "Outdoor Field",
  "Pool Deck",
  "Court 1",
  "Court 2",
  "Multipurpose Room",
];

const INSTRUCTOR_OPTIONS = [
  "Alan Alda",
  "Sara Chen",
  "Marcus Jones",
  "Lisa Park",
  "Derek Thompson",
  "Mia Rodriguez",
  "James Kim",
  "Olivia Nguyen",
];

const RESERVATION_TYPE_OPTIONS = [
  "Group Class",
  "Private Session",
  "Open Gym",
  "League Game",
  "Tournament",
  "Workshop",
  "Camp",
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
}

function SearchableMultiSelect({ options, selected, onChange, placeholder, palette }: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

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
    color: palette.textOnPrimary ?? "#182023",
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
      <div onClick={() => setIsOpen(!isOpen)} style={triggerStyle}>
        {selected.length === 0 && (
          <span style={{ color: palette.textTertiary }}>{placeholder}</span>
        )}
        {selected.map((item) => (
          <span key={item} style={tagStyle}>
            {item}
            <button onClick={(e) => removeTag(item, e)} style={tagCloseStyle} aria-label={`Remove ${item}`}>
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

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: palette.surfacePrimary,
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10,
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
                        color: isChecked ? (palette.textOnPrimary ?? "#182023") : "transparent",
                        fontSize: "11px",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {isChecked ? "✓" : ""}
                    </span>
                    {option}
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

// Mock booked clients data for the scrollable list
const MOCK_BOOKED_CLIENTS: { name: string; status: "Booked" | "Waitlisted" | "Reserved" }[] = [
  { name: "Emma Rodriguez", status: "Booked" },
  { name: "James Wilson", status: "Booked" },
  { name: "Sophia Lee", status: "Booked" },
  { name: "Liam Martinez", status: "Booked" },
  { name: "Olivia Chen", status: "Reserved" },
  { name: "Noah Thompson", status: "Booked" },
  { name: "Ava Patel", status: "Booked" },
  { name: "Mason Brown", status: "Waitlisted" },
  { name: "Isabella Garcia", status: "Booked" },
  { name: "Ethan Davis", status: "Booked" },
  { name: "Mia Johnson", status: "Booked" },
  { name: "Lucas Anderson", status: "Reserved" },
  { name: "Charlotte Taylor", status: "Booked" },
  { name: "Aiden Moore", status: "Booked" },
  { name: "Amelia Jackson", status: "Waitlisted" },
  { name: "Harper White", status: "Booked" },
  { name: "Elijah Harris", status: "Booked" },
  { name: "Abigail Martin", status: "Booked" },
  { name: "Benjamin Clark", status: "Booked" },
  { name: "Emily Lewis", status: "Booked" },
  { name: "Daniel Walker", status: "Booked" },
  { name: "Elizabeth Hall", status: "Booked" },
];

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

  // Editable state — initialized from the event data
  const initScheduleType = "session";
  const initRecurring = "no";
  const initVenues = event.venue ? [event.venue] : [];
  const initInstructors = event.instructor ? [event.instructor] : [];
  const initReservationType = event.type === "league" ? "League Game" : "Group Class";
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
    notes !== initNotes;

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
  const primaryBtnStyle: CSSProperties = { padding: "10px 20px", borderRadius: "6px", border: "none", background: palette.primary, color: palette.textOnPrimary ?? "#182023", fontSize: "var(--text-base)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" };
  const secondaryBtnStyle: CSSProperties = { ...primaryBtnStyle, background: "transparent", border: `1px solid ${palette.borderMedium}`, color: palette.textTertiary };

  const currentSectionIndex = sections.indexOf(activeSection);
  const isLastSection = currentSectionIndex === sections.length - 1;
  const nextSectionName = isLastSection ? null : sections[currentSectionIndex + 1];
  const goToNextSection = () => { if (nextSectionName) setActiveSection(nextSectionName); };

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
  const bookedClients = MOCK_BOOKED_CLIENTS.slice(0, event.booked || 0);

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

  // Filter toggles for registered clients
  const [clientFilters, setClientFilters] = useState<Record<string, boolean>>({ Booked: false, Reserved: false, Waitlisted: false });
  const isAllActive = !clientFilters.Booked && !clientFilters.Reserved && !clientFilters.Waitlisted;
  const toggleFilter = (status: string) =>
    setClientFilters((prev) => {
      const next = { ...prev, [status]: !prev[status] };
      // If toggling this status causes every individual filter to be ON,
      // collapse back to "All" (i.e. clear every toggle so isAllActive becomes true).
      if (next.Booked && next.Reserved && next.Waitlisted) {
        return { Booked: false, Reserved: false, Waitlisted: false };
      }
      return next;
    });
  const toggleAll = () => setClientFilters({ Booked: false, Reserved: false, Waitlisted: false });
  const filteredClients = isAllActive ? bookedClients : bookedClients.filter((c) => clientFilters[c.status]);

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
                <button onClick={() => setActiveSection("Registration")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 16px", borderRadius: "6px", border: "none", background: palette.primary, color: palette.textOnPrimary ?? "#182023", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" }}><Plus size={13} /> Book</button>
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
        <div><div style={{ ...labelBoldStyle, marginBottom: "2px" }}>Scheduled on</div><span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>02/26/2021 <span style={{ fontWeight: 600, color: palette.primary, cursor: "pointer" }}>Update?</span></span></div>
        <div><div style={{ ...labelBoldStyle, marginBottom: "8px" }}>Additional options</div><div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}><span>Online description: Yoga</span><span>Allow self booking</span><span>Allow free bookings</span><span>Show on EZ Leagues</span></div><span style={{ display: "inline-block", marginTop: "8px", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", color: palette.primary, cursor: "pointer" }}>Edit</span></div>

        </div>
        <div style={{ position: "sticky", bottom: -20, background: palette.surfacePrimary, borderTop: `1px solid ${palette.borderLight}`, padding: "12px 0", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 5 }}>
          <button onClick={handleCancelEditing} style={secondaryBtnStyle}>Cancel</button>
          <div style={{ display: "flex", gap: "8px" }}>
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
              <button onClick={() => setActiveSection("Registration")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 16px", borderRadius: "6px", border: "none", background: palette.primary, color: palette.textOnPrimary ?? "#182023", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" }}><Plus size={13} /> Book</button>
            ) : (
              <button onClick={() => setActiveSection("Registration")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 16px", borderRadius: "6px", border: "none", background: isDark ? "rgba(255,180,50,0.2)" : "rgba(220,150,20,0.15)", color: isDark ? "#ffb432" : "#b07a10", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", cursor: "pointer" }}><Plus size={13} /> Waitlist</button>
            )}
          </div>
        </div>
      )}

      {/* ── Registered clients list ── */}
      {bookedClients.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
            <Users size={14} style={{ opacity: 0.5, color: palette.textTertiary }} />
            <span style={{ flex: 1, fontSize: "var(--text-xs)", fontWeight: 600, fontFamily: "var(--font-family)", color: palette.textTertiary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Registered Clients ({bookedClients.length})</span>
            <span onClick={() => { setActiveSection("Registered Clients"); }} style={{ fontSize: "var(--text-xs)", fontWeight: 600, fontFamily: "var(--font-family)", color: palette.primary, cursor: "pointer" }}>Edit</span>
          </div>
          {/* Filter toggles */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
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
          </div>
          <div className="always-show-scrollbar" style={{ maxHeight: "200px", border: `1px solid ${palette.borderLight}`, borderRadius: "8px", background: isDark ? "#1f292d" : "#f3f6f8" }}>
            {filteredClients.length === 0 ? (
              <div style={{ padding: "16px 12px", textAlign: "center", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textTertiary, opacity: 0.6 }}>No clients match the selected filters</div>
            ) : filteredClients.map((client, i) => {
              const sc = statusColors[client.status] || statusColors.Booked;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: i < filteredClients.length - 1 ? `1px solid ${palette.borderLight}` : "none" }}>
                  <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary, fontWeight: 500 }}>{client.name}</span>
                  <span style={{ fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-family)", padding: "2px 8px", borderRadius: "10px", background: sc.bg, color: sc.text, flexShrink: 0 }}>{client.status}</span>
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

      {/* ── Separator ── */}
      <div style={{ height: "1px", background: palette.borderLight }} />

      {/* ── Additional compact details ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 16px" }}>
        <div><span style={detailLabel}>Recurring</span><div style={{ ...detailValue, marginTop: "2px" }}>{recurring === "yes" ? "Yes" : "No"}</div></div>
        <div><span style={detailLabel}>Class size</span><div style={{ ...detailValue, marginTop: "2px" }}>{event.capacity > 0 ? event.capacity : "—"}</div></div>
        <div><span style={detailLabel}>Pre-buffer</span><div style={{ ...detailValue, marginTop: "2px" }}>{preBuffer ? `${preBuffer} min` : "None"}</div></div>
        <div><span style={detailLabel}>Post-buffer</span><div style={{ ...detailValue, marginTop: "2px" }}>{postBuffer ? `${postBuffer} min` : "None"}</div></div>
      </div>

      {/* ── Notes ── */}
      {notes && (
        <>
          <div style={{ height: "1px", background: palette.borderLight }} />
          <div><span style={detailLabel}>Notes</span><div style={{ ...detailValue, marginTop: "4px" }}>{notes}</div></div>
        </>
      )}

      {/* ── Scheduled on & Additional options ── */}
      <div style={{ height: "1px", background: palette.borderLight }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div><span style={detailLabel}>Scheduled on</span><div style={{ ...detailValue, marginTop: "2px" }}>02/26/2021</div></div>
        <div>
          <span style={detailLabel}>Additional options</span>
          <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {["Online description: Yoga", "Allow self booking", "Allow free bookings", "Show on EZ Leagues"].map((opt) => (
              <span key={opt} style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-family)", padding: "3px 8px", borderRadius: "4px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: palette.textTertiary }}>{opt}</span>
            ))}
          </div>
        </div>
      </div>

      </div>
      {/* Footer — sticky bottom bar */}
      <div style={{ position: "sticky", bottom: -20, background: palette.surfacePrimary, borderTop: `1px solid ${palette.borderLight}`, padding: "12px 0", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 5 }}>
        <button onClick={closePanel} style={secondaryBtnStyle}>Close</button>
        <div style={{ display: "flex", gap: "8px" }}>
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
  const [scheduleType, setScheduleType] = useState<"session" | "rental">("session");
  const [recurring, setRecurring] = useState<"yes" | "no">("no");
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);
  const [reservationType, setReservationType] = useState("");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [useDefaultBuffer, setUseDefaultBuffer] = useState(true);
  const [preBuffer, setPreBuffer] = useState("15");
  const [postBuffer, setPostBuffer] = useState("15");

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
    color: palette.textOnPrimary ?? "#182023",
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

      {/* Scheduled on */}
      <div>
        <div style={{ ...labelBoldStyle, marginBottom: "2px" }}>Scheduled on</div>
        <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
          02/26/2021{" "}
          <span style={{ fontWeight: 600, color: palette.primary, cursor: "pointer" }}>Update?</span>
        </span>
      </div>

      {/* Additional options */}
      <div>
        <div style={{ ...labelBoldStyle, marginBottom: "8px" }}>Additional options</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", color: palette.textPrimary }}>
          <span>Online description: Yoga</span>
          <span>Allow self booking</span>
          <span>Allow free bookings</span>
          <span>Show on EZ Leagues</span>
        </div>
        <span style={{ display: "inline-block", marginTop: "8px", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", color: palette.primary, cursor: "pointer" }}>Edit</span>
      </div>

      </div>
      {/* Footer buttons — sticky bottom bar */}
      <div style={{ position: "sticky", bottom: -20, background: palette.surfacePrimary, borderTop: `1px solid ${palette.borderLight}`, padding: "12px 0", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 5 }}>
        <button onClick={closePanel} style={secondaryBtnStyle}>Cancel</button>
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
          {dateLabel} · {events.length} event{events.length === 1 ? "" : "s"}
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

  // Open Reservation Details side panel on click
  const handleClickEvent = useCallback(
    (event: CalendarEvent, _day: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setHoveredEvent(null);
      if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
      openPanel(
        <ReservationDetailsPanelContent key={event.id} event={event} />,
        { size: "third", title: `Reservation Details: ${event.title}` }
      );
    },
    [openPanel]
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

  // Filter events by the search query (matches title, instructor, venue, type).
  // NOTE: Defined here — before any conditional early return — so React's hook
  // ordering stays stable across the mobile / desktop branches.
  const filteredEvents = useMemo(
    () => filterEventsByQuery(MOCK_EVENTS, searchQuery),
    [searchQuery]
  );

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
      <MobileScheduleView palette={palette} mode={mode} onAddReservation={handleOpenAddReservation} />
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

        {/* Date picker — centered within the calendar zone */}
        <div style={{ justifySelf: "center", display: "flex", alignItems: "center", padding: "8px" }}>
          <button onClick={handlePrevMonth} style={{ ...controlBtn, width: "32px", height: "32px" }}>
            <ChevronLeft size={14} />
          </button>
          <span
            style={{
              width: "180px",
              textAlign: "center",
              fontSize: "16px",
              fontWeight: 600,
              color: sc.heading,
              lineHeight: "20px",
            }}
          >
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <button onClick={handleNextMonth} style={{ ...controlBtn, width: "32px", height: "32px" }}>
            <ChevronRight size={14} />
          </button>
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
          <span style={{ fontSize: "14px", fontWeight: 500, color: sc.body, lineHeight: "14px" }}>
            Found {totalReservations} reservations
          </span>
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
            {/* Filters */}
            <button
              style={{
                ...controlBtn,
                gap: "6px",
                padding: "8px 12px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              <SlidersHorizontal size={16} /> Filters <ChevronDown size={16} />
            </button>
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
                sc={sc}
                colors={colors}
                isDark={isDark}
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

    </div>
  );
}
