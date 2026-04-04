import { useTheme } from "../layout/ThemeContext";
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

function FeePill({ label, amount, variant, palette }: { label: string; amount: number; variant: "paid" | "owed"; palette: any }) {
  const isPaid = variant === "paid";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
      <span
        style={{
          color: palette.textTertiary,
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
            ? `${palette.primary}1f`
            : amount > 0
              ? "#e8a02014"
              : palette.borderLight,
          border: isPaid
            ? `1px solid ${palette.primary}4d`
            : amount > 0
              ? "1px solid #e8a02047"
              : `1px solid ${palette.borderMedium}`,
          color: isPaid
            ? palette.primary
            : amount > 0
              ? "#e8a020"
              : palette.textTertiary,
        }}
      >
        ${amount.toFixed(2)}
      </span>
    </div>
  );
}

// ── GroupRow ──────────────────────────────────────────────────────────────────

function GroupRow({ entry, palette }: { entry: GroupEntry; palette: any }) {
  return (
    <div
      className="rounded-lg"
      style={{
        padding: "14px 16px",
        background: palette.hoverBg,
        border: `1px solid ${palette.borderLight}`,
        marginBottom: "8px",
      }}
    >
      {/* Top row: league name + fees */}
      <div className="flex items-start justify-between" style={{ marginBottom: "10px" }}>
        <div>
          <div
            style={{
              color: palette.textPrimary,
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
              color: palette.textTertiary,
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font-family)",
            }}
          >
            Team: <span style={{ color: palette.textPrimary, fontWeight: 500 }}>{entry.team}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", flexShrink: 0, marginLeft: "12px" }}>
          <FeePill label="Paid"  amount={entry.feesPaid} variant="paid" palette={palette} />
          <FeePill label="Owed"  amount={entry.feesOwed} variant="owed" palette={palette} />
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
              background: `${palette.iconTertiary}19`,
              border: `1px solid ${palette.iconTertiary}40`,
              color: palette.iconTertiary,
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "var(--font-family)",
            }}
          >
            {entry.captain.charAt(0)}
          </div>
          <span style={{ color: palette.textTertiary, fontSize: "var(--text-sm)", fontFamily: "var(--font-family)" }}>
            Captain: <span style={{ color: palette.textPrimary }}>{entry.captain}</span>
          </span>
        </div>

        <button
          style={{
            background: "transparent",
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "4px",
            color: palette.textTertiary,
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
  const { palette } = useTheme();
  return (
    <SectionCard title="Groups">
      <div style={{ marginBottom: "12px" }}>
        {GROUPS.map((g) => (
          <GroupRow key={g.league} entry={g} palette={palette} />
        ))}
      </div>
      <button
        style={{
          background: "transparent",
          border: `1px dashed ${palette.borderMedium}`,
          borderRadius: "6px",
          color: palette.textTertiary,
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
