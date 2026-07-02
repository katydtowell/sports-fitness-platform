# EZFacility App — Style Guide

Living reference for UI conventions in this codebase. Consult this before building new UI; add to it whenever a new cross-cutting pattern is introduced.

Source of truth for colors, type, spacing, and components: [EZFacility Style Guide (Figma)](https://www.figma.com/design/ADOqSBeO8DZNmTPsElUdk4/EZFacility-Style-Guide?node-id=4428-74944).

## Time fields

Every time input in the app must use `TimeField` (`src/app/components/ui/TimeField.tsx`) instead of a native `<input type="time">`. Native time inputs render inconsistent, unstyleable browser chrome and don't reliably expose AM/PM.

`TimeField` reproduces the same interaction model already used for date fields — type a value directly, or click an icon to open a picker overlay — with an explicit AM/PM control so typed input is never ambiguous:

- Typeable text input accepts freeform entry: `9`, `930`, `9:30`, `9:30pm`, `14:05`, etc.
- A segmented AM/PM toggle sits next to the text input for explicit meridiem selection.
- A clock icon opens a themed popover (hour / minute columns + AM/PM) — the time equivalent of clicking a date field's calendar icon to open its picker.
- Value contract: 24-hour `"HH:MM"` strings in/out (`value` / `onChange`), identical to native `<input type="time">`, so it's a drop-in replacement for existing state.
- **Minutes are restricted to 15-minute increments** (`:00` / `:15` / `:30` / `:45`). The picker's minute column only ever offers those four values. Any typed value that isn't already on a 15-minute increment is rounded to the nearest one as soon as it's committed (on blur or Enter) — e.g. `1:10` becomes `1:15`; `1:05` becomes `1:00`. Rounding carries into the hour (and across AM/PM) when needed, e.g. `1:53 PM` becomes `2:00 PM` and `11:53 PM` becomes `12:00 AM`.

Usage:

```tsx
import { TimeField } from "../ui/TimeField";

<TimeField
  value={startTime}
  onChange={setStartTime}
  sc={sc}          // any object structurally matching TimeFieldColors
  isDark={isDark}
  ariaLabel="Start time"
/>
```

`sc` only needs to satisfy `TimeFieldColors` (`border`, `inputBg`, `heading`, `body`, `muted`, `brand`, `cellBg`, `shadow`) — pass a page's existing semantic-colors object directly.

**Status:** applied to the Schedule filters (Time range) and the Add Reservation form's Start time / End time fields (`SchedulePage.tsx`).

## Scrollable columns inside popovers (no visible scrollbars)

When a themed popover contains a scrollable list (e.g. the hour/minute columns in `TimeField`'s picker), don't rely on the browser's native scrollbar to signal that more content exists — it's easy to miss and looks inconsistent across OSes. Instead:

- Hide the native scrollbar (`scrollbarWidth: "none"` + a small `::-webkit-scrollbar { display: none }` rule).
- Apply a soft edge fade (`mask-image: linear-gradient(...)`) only on the side(s) that still have hidden content.
- Show a small chevron above/below the list that fades in only when that direction has more to scroll, and scrolls the list a step on click.

This is implemented generically as `TimePickerColumn` inside `TimeField.tsx` — reuse that pattern (rather than a bare `overflow: auto` div) for any future scrollable column in a popover.

## AI-assisted entry (EZCoach)

EZCoach is the conversational alternative to a manual form, first used in the Add Reservation side panel (`EZCoachChat` in `SchedulePage.tsx`). Conventions if extended to other forms:

- **Accent**: all EZCoach affordances use the violet→brand-teal gradient (`EZCOACH_GRADIENT`, `#8B5CF6 → #00C4A0`) plus a `Sparkles` icon — distinct from normal brand-primary actions so AI features are instantly recognizable, but still anchored to the product palette.
- **Entry point**: a pill-shaped gradient button placed inside the form it replaces (not in global chrome), labeled "Try it with EZCoach".
- **Escape hatch**: while active, a "Switch back to manual" text link sits in the panel header's upper right (via `setHeaderExtras`, `marginLeft: auto`).
- **Shared state**: the chat writes into the *same* form state as the manual form, so switching modes never loses captured data and the manual form doubles as a review screen.
- **Example prompts**: shown as a dashed-border chip with a `Copy` icon; one click inserts the example into the message field (it does not send).
- **Guided flow**: after the initial free-form request, EZCoach asks only for fields the request didn't cover, in the same order the manual form presents them; yes/no questions offer one-click quick-reply chips.

## Date fields

Date fields currently use native `<input type="date">`, which already provides typing + a native icon-triggered picker consistent with this rule. If a themed `DateField` is introduced later (to match app chrome instead of OS chrome), document it here and this section should point to it the same way the Time fields section points to `TimeField`.
