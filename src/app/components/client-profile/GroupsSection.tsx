import { SectionCard } from "./FormField";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GroupEntry {
  league: string;
  team: string;
  captain: string;
  feesOwed: number;
  feesPaid: number;
}

// ── Sample data ───────────────────────────────────────────────────────────────

const GROUPS: GroupEntry[] = [
  {
    league:    "Spring Recreational Soccer",
    team:      "Blue Thunder",
    captain:   "Marcus Reid",
    feesOwed:  0,
    feesPaid:  120,
  },
  {
    league:    "Summer Beach Volleyball",
    team:      "Sand Sharks",
    captain:   "Priya Nair",
    feesOwed:  45,
    feesPaid:  75,
  },
  {
    league:    "Fall Adult Basketball",
    team:      "Court Jesters",
    captain:   "Derek Lawson",
    feesOwed:  0,
    feesPaid:  95,
  },
];

// ── Fee pill ──────────────────────────────────────────────────────────────────

function FeePill({ label, amount, variant }: { label: string; amount: number; variant: "paid" | "owed" }) {
  const isPaid = variant === "paid";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
      <span
        style={{
          color: "#a1bdc6",
          fontSize: "11px",
          fontFamily: "var(--font-family)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 10px",
          borderRadius: "999px",
          fontSize: "var(--text-sm)",
          fontFamily: "var(--font-family)",
          fontWeight: 600,
          background: isPaid
            ? "rgba(0,196,160,0.12)"
            : amount > 0
              ? "rgba(232,160,32,0.12)"
              : "rgba(161,189,198,0.08)",
          border: isPaid
            ? "1px solid rgba(0,196,160,0.3)"
            : amount > 0
              ? "1px solid rgba(232,160,32,0.3)"
              : "1px solid rgba(161,189,198,0.15)",
          color: isPaid
            ? "#00c4a0"
            : amount > 0
              ? "#e8a020"
              : "#a1bdc6",
        }}
      >
        ${amount.toFixed(2)}
      </span>
    </div>
  );
}

// ── GroupRow ──────────────────────────────────────────────────────────────────

function GroupRow({ entry }: { entry: GroupEntry }) {
  return (
    <div
      className="rounded-lg"
      style={{
        padding: "14px 16px",
        background: "rgba(161,189,198,0.04)",
        border: "1px solid rgba(161,189,198,0.1)",
        marginBottom: "8px",
      }}
    >
      {/* Top row: league name + fees */}
      <div className="flex items-start justify-between" style={{ marginBottom: "10px" }}>
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
            {entry.league}
          </div>
          <div
            style={{
              color: "#a1bdc6",
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font-family)",
            }}
          >
            Team: <span style={{ color: "#dfe9ec", fontWeight: 500 }}>{entry.team}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", flexShrink: 0, marginLeft: "12px" }}>
          <FeePill label="Paid"  amount={entry.feesPaid} variant="paid" />
          <FeePill label="Owed"  amount={entry.feesOwed} variant="owed" />
        </div>
      </div>

      {/* Bottom row: captain + view button */}
      <div className="flex items-center justify-between">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: "28px",
              height: "28px",
              background: "rgba(143,168,184,0.12)",
              border: "1px solid rgba(143,168,184,0.25)",
              color: "#8fa8b8",
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "var(--font-family)",
            }}
          >
            {entry.captain.charAt(0)}
          </div>
          <span style={{ color: "#a1bdc6", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)" }}>
            Captain: <span style={{ color: "#dfe9ec" }}>{entry.captain}</span>
          </span>
        </div>

        <button
          style={{
            background: "transparent",
            border: "1px solid rgba(161,189,198,0.25)",
            borderRadius: "4px",
            color: "#a1bdc6",
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-family)",
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          View
        </button>
      </div>
    </div>
  );
}

// ── GroupsSection ─────────────────────────────────────────────────────────────

export function GroupsSection() {
  return (
    <SectionCard title="Groups">
      <div style={{ marginBottom: "12px" }}>
        {GROUPS.map((g) => (
          <GroupRow key={g.league} entry={g} />
        ))}
      </div>
      <button
        style={{
          background: "transparent",
          border: "1px dashed rgba(161,189,198,0.3)",
          borderRadius: "6px",
          color: "#a1bdc6",
          fontSize: "var(--text-base)",
          fontFamily: "var(--font-family)",
          padding: "10px",
          cursor: "pointer",
          width: "100%",
          textAlign: "center",
        }}
      >
        + Add group
      </button>
    </SectionCard>
  );
}
