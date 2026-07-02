/**
 * TimeField — themed replacement for native `<input type="time">`.
 *
 * Native time inputs render inconsistent browser chrome (no AM/PM in some
 * locales, unstyleable picker) so this component reproduces the same
 * interaction model as the app's date fields — type a value directly, or
 * click an icon to open a themed picker overlay — while adding an explicit
 * AM/PM control so 12-hour input is never ambiguous.
 *
 * Value contract: `value`/`onChange` use 24-hour "HH:MM" strings (e.g.
 * "09:00", "17:30"), identical to native `<input type="time">`, so this is
 * a drop-in replacement wherever that shape is already used for state.
 *
 * Style-guide rule: every time field in the app should use this component
 * (see /STYLE_GUIDE.md — "Time fields").
 *
 * Minutes are restricted to 15-minute increments (:00 / :15 / :30 / :45).
 * The picker only ever offers those four values, and any typed/committed
 * value is rounded to the nearest one (e.g. 1:10 -> 1:15, 1:05 -> 1:00).
 */

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";

/** Minimal color contract. Structurally compatible with this project's
 *  `SemanticColors` (defined per-page, e.g. SchedulePage.tsx), so callers
 *  can pass their local `sc` object directly without an adapter. */
export interface TimeFieldColors {
  border: string;
  inputBg: string;
  heading: string;
  body: string;
  muted: string;
  brand: string;
  cellBg: string;
  shadow: string;
}

export interface TimeFieldProps {
  /** 24-hour "HH:MM" value, or "" for empty/unset. */
  value: string;
  onChange: (value: string) => void;
  sc: TimeFieldColors;
  isDark: boolean;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  style?: CSSProperties;
}

type Period = "AM" | "PM";

const MINUTE_STEPS = [0, 15, 30, 45];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function to12Hour(h24: number): { hour12: number; period: Period } {
  const period: Period = h24 >= 12 ? "PM" : "AM";
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, period };
}

function to24Hour(hour12: number, period: Period): number {
  let h = hour12 % 12;
  if (period === "PM") h += 12;
  return h;
}

/** Parses a canonical "HH:MM" (24hr) value into 12-hour display parts. */
function parseCanonical(value: string): { hour12: number; minute: number; period: Period } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const h24 = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (h24 < 0 || h24 > 23 || minute < 0 || minute > 59) return null;
  const { hour12, period } = to12Hour(h24);
  return { hour12, minute, period };
}

/** Builds a canonical "HH:MM" (24hr) string from 12-hour display parts. */
function buildValue(hour12: number, minute: number, period: Period): string {
  return `${pad2(to24Hour(hour12, period))}:${pad2(minute)}`;
}

/** Rounds to the nearest 15-minute increment (:00 / :15 / :30 / :45),
 *  carrying into the hour — and across the AM/PM boundary — when needed.
 *  E.g. 1:10 -> 1:15, 1:05 -> 1:00, 12:53 PM -> 1:00 PM, 11:53 PM -> 12:00 AM. */
function roundToNearest15(hour12: number, minute: number, period: Period): { hour12: number; minute: number; period: Period } {
  const DAY_MINUTES = 24 * 60;
  const totalMinutes = to24Hour(hour12, period) * 60 + minute;
  const rounded = (Math.round(totalMinutes / 15) * 15) % DAY_MINUTES;
  const normalized = ((rounded % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const h24 = Math.floor(normalized / 60);
  const roundedMinute = normalized % 60;
  const { hour12: roundedHour12, period: roundedPeriod } = to12Hour(h24);
  return { hour12: roundedHour12, minute: roundedMinute, period: roundedPeriod };
}

/** Parses freeform typed text — "9", "930", "9:30", "9:30pm", "14:05" — into
 *  hour/minute. If the user typed an explicit am/pm marker it's returned
 *  too; otherwise the caller keeps whatever meridiem is already selected. */
function parseTypedTime(raw: string): { hour12: number; minute: number; period?: Period } | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  const m = /^(\d{1,2})(?::?(\d{2}))?\s*(am|pm|a|p)?$/.exec(s);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  if (minute > 59) return null;
  let period: Period | undefined = m[3] ? (m[3][0] === "a" ? "AM" : "PM") : undefined;
  if (hour === 0) {
    hour = 12;
    period = period ?? "AM";
  } else if (hour > 12 && hour <= 23) {
    period = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
  } else if (hour > 23) {
    return null;
  }
  if (hour < 1 || hour > 12) return null;
  return { hour12: hour, minute, period };
}

export function TimeField({
  value,
  onChange,
  sc,
  isDark,
  placeholder = "--:--",
  ariaLabel = "Time",
  disabled = false,
  style,
}: TimeFieldProps) {
  const initial = parseCanonical(value);
  const [text, setText] = useState(initial ? `${initial.hour12}:${pad2(initial.minute)}` : "");
  const [period, setPeriod] = useState<Period>(initial?.period ?? "AM");
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Keep local text/period in sync with external value changes (e.g. a
  // parent "Clear all filters" action) as long as the user isn't actively
  // typing in the field.
  useEffect(() => {
    if (isFocused) return;
    const p = parseCanonical(value);
    setText(p ? `${p.hour12}:${pad2(p.minute)}` : "");
    setPeriod(p?.period ?? "AM");
  }, [value, isFocused]);

  const commit = (hour12: number, minute: number, per: Period) => {
    const rounded = roundToNearest15(hour12, minute, per);
    setText(`${rounded.hour12}:${pad2(rounded.minute)}`);
    setPeriod(rounded.period);
    onChange(buildValue(rounded.hour12, rounded.minute, rounded.period));
  };

  const handleTextCommit = () => {
    const parsed = parseTypedTime(text);
    if (!parsed) {
      // Unparseable — revert to the last valid value.
      const prev = parseCanonical(value);
      setText(prev ? `${prev.hour12}:${pad2(prev.minute)}` : "");
      return;
    }
    commit(parsed.hour12, parsed.minute, parsed.period ?? period);
  };

  // Close the picker on outside click — mirrors SearchableMultiSelect.
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const inTrigger = containerRef.current?.contains(e.target as Node);
      const inPopover = popoverRef.current?.contains(e.target as Node);
      if (!inTrigger && !inPopover) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Track the trigger's viewport position while open, so the popover can
  // use `position: fixed` and escape any clipping ancestor (e.g. the
  // Filters popover), same approach as SearchableMultiSelect.
  useEffect(() => {
    if (!isOpen) return;
    function update() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen]);

  const current = parseTypedTime(text) ?? parseCanonical(value);
  const activeHour12 = current?.hour12 ?? 12;
  const activeMinute = current?.minute ?? 0;

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1, minWidth: 0, ...style }}>
      <div
        ref={triggerRef}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          border: `1px solid ${isOpen ? sc.brand : sc.border}`,
          borderRadius: "6px",
          background: disabled ? sc.border : sc.inputBg,
          padding: "0 6px 0 10px",
          opacity: disabled ? 0.6 : 1,
          transition: "border-color 0.15s ease",
        }}
      >
        <input
          type="text"
          inputMode="numeric"
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            setIsFocused(false);
            handleTextCommit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleTextCommit();
              (e.target as HTMLInputElement).blur();
            }
          }}
          aria-label={ariaLabel}
          style={{
            flex: 1,
            minWidth: 0,
            width: "48px",
            border: "none",
            outline: "none",
            background: "transparent",
            padding: "8px 0",
            fontSize: "13px",
            fontFamily: "var(--font-family)",
            color: sc.heading,
          }}
        />

        {/* AM/PM toggle — explicit meridiem control so typed input is
            never ambiguous. */}
        <div
          style={{
            display: "flex",
            borderRadius: "4px",
            overflow: "hidden",
            border: `1px solid ${sc.border}`,
            flexShrink: 0,
          }}
        >
          {(["AM", "PM"] as const).map((p) => (
            <button
              key={p}
              type="button"
              disabled={disabled}
              onClick={() => commit(activeHour12, activeMinute, p)}
              aria-pressed={period === p}
              style={{
                padding: "4px 6px",
                fontSize: "10px",
                fontWeight: 700,
                fontFamily: "var(--font-family)",
                border: "none",
                cursor: disabled ? "default" : "pointer",
                background: period === p ? sc.brand : "transparent",
                color: period === p ? (isDark ? "#0a0e0f" : "#101828") : sc.muted,
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-label="Open time picker"
          aria-expanded={isOpen}
          disabled={disabled}
          onClick={() => setIsOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            border: "none",
            background: "transparent",
            color: isOpen ? sc.brand : sc.muted,
            cursor: disabled ? "default" : "pointer",
            flexShrink: 0,
            padding: 0,
          }}
        >
          <Clock size={15} />
        </button>
      </div>

      {isOpen && rect && (
        <TimePickerPopover
          rect={rect}
          popoverRef={popoverRef}
          hour12={activeHour12}
          minute={activeMinute}
          period={period}
          sc={sc}
          isDark={isDark}
          onPick={(h, m, p) => commit(h, m, p)}
        />
      )}
    </div>
  );
}

/* ── Picker popover — hour / minute columns + AM/PM, positioned like the
   date field's MiniCalendar popover. ────────────────────────────────── */

function TimePickerPopover({
  rect,
  popoverRef,
  hour12,
  minute,
  period,
  sc,
  isDark,
  onPick,
}: {
  rect: { top: number; left: number; width: number; height: number };
  popoverRef: RefObject<HTMLDivElement | null>;
  hour12: number;
  minute: number;
  period: Period;
  sc: TimeFieldColors;
  isDark: boolean;
  onPick: (hour12: number, minute: number, period: Period) => void;
}) {
  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Time picker"
      style={{
        position: "fixed",
        top: rect.top + rect.height + 4,
        left: rect.left,
        width: "168px",
        background: sc.cellBg,
        border: `1px solid ${sc.border}`,
        borderRadius: "10px",
        boxShadow: `0px 12px 24px -6px ${sc.shadow}, 0px 4px 6px 0px ${sc.shadow}`,
        padding: "10px",
        zIndex: 1100,
        fontFamily: "var(--font-family)",
      }}
    >
      {/* AM / PM */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
        {(["AM", "PM"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(hour12, minute, p)}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: "6px",
              border: `1px solid ${period === p ? sc.brand : sc.border}`,
              background: period === p ? sc.brand : "transparent",
              color: period === p ? (isDark ? "#0a0e0f" : "#101828") : sc.body,
              fontSize: "11px",
              fontWeight: 700,
              fontFamily: "var(--font-family)",
              cursor: "pointer",
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Hides the native scrollbar on the columns below — scrollability is
          instead signalled by the fade mask + chevron affordances in
          TimePickerColumn, so the app never has to show OS scrollbar
          chrome inside a themed popover. */}
      <style>{`.${SCROLL_COLUMN_CLASS}::-webkit-scrollbar { display: none; width: 0; height: 0; }`}</style>

      {/* Hour / minute columns */}
      <div style={{ display: "flex", gap: "6px" }}>
        <TimePickerColumn
          items={HOURS}
          activeValue={hour12}
          formatLabel={(h) => String(h)}
          onSelect={(h) => onPick(h, minute, period)}
          sc={sc}
          isDark={isDark}
        />
        <TimePickerColumn
          items={MINUTE_STEPS}
          activeValue={minute}
          formatLabel={pad2}
          onSelect={(m) => onPick(hour12, m, period)}
          sc={sc}
          isDark={isDark}
        />
      </div>
    </div>
  );
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const SCROLL_COLUMN_CLASS = "ez-timefield-scroll-col";

/* ── One scrollable column (hour or minute) inside the picker popover.
   Rather than a visible OS scrollbar, "more content" is signalled with a
   soft fade at whichever edge still has hidden items, plus a chevron
   above/below that fades in only when that direction has more to show and
   also scrolls the column a step on click. ────────────────────────────── */

function TimePickerColumn({
  items,
  activeValue,
  formatLabel,
  onSelect,
  sc,
  isDark,
}: {
  items: number[];
  activeValue: number;
  formatLabel: (v: number) => string;
  onSelect: (v: number) => void;
  sc: TimeFieldColors;
  isDark: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const refreshScrollState = () => {
    const el = listRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 1);
    setCanScrollDown(el.scrollTop < el.scrollHeight - el.clientHeight - 1);
  };

  // Center the active value on open, then measure scroll bounds once the
  // jump has applied.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "center" });
    requestAnimationFrame(refreshScrollState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollByStep = (direction: 1 | -1) => {
    listRef.current?.scrollBy({ top: direction * 64, behavior: "smooth" });
  };

  const fadeMask =
    canScrollUp && canScrollDown
      ? "linear-gradient(to bottom, transparent, black 16px, black calc(100% - 16px), transparent)"
      : canScrollUp
      ? "linear-gradient(to bottom, transparent, black 16px)"
      : canScrollDown
      ? "linear-gradient(to bottom, black calc(100% - 16px), transparent)"
      : undefined;

  const edgeButtonStyle = (visible: boolean): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "14px",
    border: "none",
    background: "transparent",
    color: sc.muted,
    padding: 0,
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    cursor: "pointer",
    transition: "opacity 0.15s ease",
  });

  const optionStyle = (active: boolean): CSSProperties => ({
    width: "100%",
    padding: "6px 0",
    border: "none",
    borderRadius: "6px",
    background: active ? sc.brand : "transparent",
    color: active ? (isDark ? "#0a0e0f" : "#101828") : sc.body,
    fontSize: "13px",
    fontWeight: active ? 700 : 400,
    fontFamily: "var(--font-family)",
    cursor: "pointer",
    textAlign: "center",
    flexShrink: 0,
  });

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <button
        type="button"
        aria-label="Scroll up"
        aria-hidden={!canScrollUp}
        tabIndex={canScrollUp ? 0 : -1}
        onClick={() => scrollByStep(-1)}
        style={edgeButtonStyle(canScrollUp)}
      >
        <ChevronUp size={12} />
      </button>
      <div
        ref={listRef}
        onScroll={refreshScrollState}
        className={SCROLL_COLUMN_CLASS}
        style={{
          maxHeight: "160px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitMaskImage: fadeMask,
          maskImage: fadeMask,
        }}
      >
        {items.map((v) => (
          <button
            key={v}
            type="button"
            data-active={v === activeValue}
            onClick={() => onSelect(v)}
            style={optionStyle(v === activeValue)}
          >
            {formatLabel(v)}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-label="Scroll down"
        aria-hidden={!canScrollDown}
        tabIndex={canScrollDown ? 0 : -1}
        onClick={() => scrollByStep(1)}
        style={edgeButtonStyle(canScrollDown)}
      >
        <ChevronDown size={12} />
      </button>
    </div>
  );
}
