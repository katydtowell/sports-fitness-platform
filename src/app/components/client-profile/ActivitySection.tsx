import { useState } from "react";
import { SectionCard } from "./FormField";

// ── Types ─────────────────────────────────────────────────────────────────────

type ActivityKind = "Check-in" | "Class" | "Booking";
type BookingStatus = "Pending" | "Upcoming" | "Canceled";

interface ActivityEntry {
  kind: ActivityKind;
  title: string;
  detail: string;
  date: string;
  time?: string;
  status?: BookingStatus;
}

// ── Sample data (sorted newest → oldest) ─────────────────────────────────────

const ACTIVITY: ActivityEntry[] = [
  { kind: "Booking",  title: "Personal Training Session",  detail: "Trainer: Coach Dana",         date: "04/05/2026", time: "9:00 AM",  status: "Upcoming"  },
  { kind: "Booking",  title: "Spin Class",                 detail: "Studio B",                    date: "04/04/2026", time: "7:00 AM",  status: "Pending"   },
  { kind: "Check-in", title: "Facility Check-in",          detail: "Main Entrance",               date: "04/02/2026", time: "6:48 AM"                       },
  { kind: "Class",    title: "HIIT Bootcamp",              detail: "Instructor: Marcy Lin",       date: "03/31/2026", time: "6:00 AM"                       },
  { kind: "Check-in", title: "Facility Check-in",          detail: "Main Entrance",               date: "03/29/2026", time: "7:12 AM"                       },
  { kind: "Class",    title: "Yoga Flow",                  detail: "Instructor: Sophie Tran",     date: "03/27/2026", time: "8:30 AM"                       },
  { kind: "Booking",  title: "Pool Lane Reservation",      detail: "Lane 3 · 45 min",             date: "03/25/2026", time: "5:30 PM",  status: "Canceled"  },
  { kind: "Class",    title: "Strength & Conditioning",    detail: "Instructor: Marcus Reid",     date: "03/24/2026", time: "6:00 AM"                       },
  { kind: "Check-in", title: "Facility Check-in",          detail: "Main Entrance",               date: "03/22/2026", time: "6:55 AM"                       },
];

// ── Style maps ────────────────────────────────────────────────────────────────

const KIND_STYLES: Record<ActivityKind, { color: string; background: string; border: string; icon: string }> = {
  "Check-in": { color: "#8fa8b8", background: "rgba(143,168,184,0.10)", border: "1px solid rgba(143,168,184,0.25)", icon: "✓" },
  "Class":    { color: "#00c4a0", background: "rgba(0,196,160,0.10)",   border: "1px solid rgba(0,196,160,0.28)",   icon: "◈" },
  "Booking":  { color: "#e8a020", background: "rgba(232,160,32,0.10)",  border: "1px solid rgba(232,160,32,0.28)",  icon: "⊙" },
};

const STATUS_STYLES: Record<BookingStatus, { color: string; background: string; border: string }> = {
  Upcoming: { color: "#00c4a0", background: "rgba(0,196,160,0.10)",  border: "1px solid rgba(0,196,160,0.28)"  },
  Pending:  { color: "#e8a020", background: "rgba(232,160,32,0.10)", border: "1px solid rgba(232,160,32,0.28)" },
  Canceled: { color: "#e05a5a", background: "rgba(224,90,90,0.10)",  border: "1px solid rgba(224,90,90,0.28)"  },
};

// ── Filter tabs ───────────────────────────────────────────────────────────────

const FILTERS: (ActivityKind | "All")[] = ["All", "Check-in", "Class", "Booking"];

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 14px",
        borderRadius: "999px",
        border: active ? "1px solid rgba(0,196,160,0.35)" : "1px solid rgba(161,189,198,0.2)",
        background: active ? "rgba(0,196,160,0.12)" : "transparent",
        color: active ? "#00c4a0" : "#a1bdc6",
        fontSize: "var(--text-sm)",
        fontFamily: "var(--font-family)",
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(161,189,198,0.06)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {label}
    </button>
  );
}

// ── ActivityRow ───────────────────────────────────────────────────────────────

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const ks = KIND_STYLES[entry.kind];
  const ss = entry.status ? STATUS_STYLES[entry.status] : null;

  return (
    <div
      className="flex items-start gap-3 rounded-lg"
      style={{
        padding: "12px 16px",
        background: "rgba(161,189,198,0.04)",
        border: "1px solid rgba(161,189,198,0.1)",
        marginBottom: "8px",
      }}
    >
      {/* Kind icon */}
      <div
        className="flex items-center justify-center rounded-full shrink-0"
        style={{
          width: "36px",
          height: "36px",
          marginTop: "1px",
          background: ks.background,
          border: ks.border,
          color: ks.color,
          fontSize: "15px",
          fontWeight: 700,
          fontFamily: "var(--font-family)",
        }}
      >
        {ks.icon}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-start justify-between" style={{ gap: "8px" }}>
          <div>
            <div
              style={{
                color: "#dfe9ec",
                fontSize: "var(--text-base)",
                fontWeight: 600,
                fontFamily: "var(--font-family)",
                marginBottom: "2px",
              }}
            >
              {entry.title}
            </div>
            <div
              style={{
                color: "#a1bdc6",
                fontSize: "var(--text-sm)",
                fontFamily: "var(--font-family)",
              }}
            >
              {entry.detail}
            </div>
          </div>

          {/* Date + time */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ color: "#a1bdc6", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)" }}>
              {entry.date}
            </div>
            {entry.time && (
              <div style={{ color: "#a1bdc6", fontSize: "11px", fontFamily: "var(--font-family)", marginTop: "1px" }}>
                {entry.time}
              </div>
            )}
          </div>
        </div>

        {/* Kind badge + optional status badge */}
        <div className="flex items-center gap-2" style={{ marginTop: "8px" }}>
          <span
            style={{
              display: "inline-flex", alignItems: "center", padding: "2px 9px",
              borderRadius: "999px", fontSize: "11px",
              fontFamily: "var(--font-family)", fontWeight: 500,
              color: ks.color, background: ks.background, border: ks.border,
            }}
          >
            {entry.kind}
          </span>

          {ss && (
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                padding: "2px 9px", borderRadius: "999px", fontSize: "11px",
                fontFamily: "var(--font-family)", fontWeight: 500,
                color: ss.color, background: ss.background, border: ss.border,
              }}
            >
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: ss.color, flexShrink: 0 }} />
              {entry.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ActivitySection ───────────────────────────────────────────────────────────

export function ActivitySection() {
  const [activeFilter, setActiveFilter] = useState<ActivityKind | "All">("All");

  const filtered = activeFilter === "All"
    ? ACTIVITY
    : ACTIVITY.filter((a) => a.kind === activeFilter);

  return (
    <SectionCard title="Activity">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2" style={{ marginBottom: "16px" }}>
        {FILTERS.map((f) => (
          <FilterTab
            key={f}
            label={f}
            active={activeFilter === f}
            onClick={() => setActiveFilter(f)}
          />
        ))}
      </div>

      {/* Rows */}
      <div>
        {filtered.length > 0 ? (
          filtered.map((entry) => (
            <ActivityRow key={`${entry.date}-${entry.title}`} entry={entry} />
          ))
        ) : (
          <div
            style={{
              textAlign: "center", color: "#a1bdc6",
              fontSize: "var(--text-base)", fontFamily: "var(--font-family)",
              padding: "24px 0",
            }}
          >
            No {activeFilter.toLowerCase()} activity
          </div>
        )}
      </div>
    </SectionCard>
  );
}
