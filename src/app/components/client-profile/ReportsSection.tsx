import { useTheme } from "../layout/ThemeContext";
import { SectionCard } from "./FormField";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Report {
  title: string;
  category: string;
  date: string;
  summary: string;
}

// ── Sample data (sorted newest → oldest) ─────────────────────────────────────

const REPORTS: Report[] = [
  {
    title:    "Q1 2026 Progress Review",
    category: "Quarterly Assessment",
    date:     "03/28/2026",
    summary:  "Body composition improved 4.2%. VO₂ max up to 42.1 ml/kg/min.",
  },
  {
    title:    "February Training Summary",
    category: "Monthly Report",
    date:     "03/01/2026",
    summary:  "Completed 18 of 20 scheduled sessions. Avg heart rate 148 bpm.",
  },
  {
    title:    "January Training Summary",
    category: "Monthly Report",
    date:     "02/01/2026",
    summary:  "Strength benchmarks: squat +15 lbs, bench +10 lbs, deadlift +20 lbs.",
  },
  {
    title:    "Initial Fitness Assessment",
    category: "Baseline Assessment",
    date:     "01/10/2026",
    summary:  "Baseline BMI 24.3, resting HR 68 bpm, flexibility score 72/100.",
  },
  {
    title:    "Q4 2025 Progress Review",
    category: "Quarterly Assessment",
    date:     "12/30/2025",
    summary:  "Overall endurance up 11% from Q3. Goal adherence rate 87%.",
  },
];

// ── Category color map ────────────────────────────────────────────────────────

function getCategoryStyle(category: string, palette: any) {
  const styleMap: Record<string, { color: string; background: string; border: string }> = {
    "Quarterly Assessment": { color: palette.primary, background: `${palette.primary}1a`, border: `1px solid ${palette.primary}47` },
    "Monthly Report":       { color: palette.iconTertiary, background: `${palette.iconTertiary}19`, border: `1px solid ${palette.iconTertiary}40` },
    "Baseline Assessment":  { color: "#e8a020", background: "#e8a02019", border: "1px solid #e8a02047" },
  };
  return styleMap[category] ?? styleMap["Monthly Report"];
}

// ── ReportRow ─────────────────────────────────────────────────────────────────

function ReportRow({ report, palette }: { report: Report; palette: any }) {
  const cs = getCategoryStyle(report.category, palette);

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
      {/* Top row: title + date */}
      <div className="flex items-start justify-between" style={{ marginBottom: "6px" }}>
        <div style={{ flex: 1, marginRight: "12px" }}>
          <div
            style={{
              color: palette.textPrimary,
              fontSize: "var(--text-base)",
              fontWeight: 600,
              fontFamily: "var(--font-family)",
              marginBottom: "4px",
            }}
          >
            {report.title}
          </div>
          {/* Category badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 9px",
              borderRadius: "999px",
              fontSize: "11px",
              fontFamily: "var(--font-family)",
              fontWeight: 500,
              ...cs,
            }}
          >
            {report.category}
          </span>
        </div>
        <span
          style={{
            color: palette.textTertiary,
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-family)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {report.date}
        </span>
      </div>

      {/* Summary */}
      <div
        style={{
          color: palette.textTertiary,
          fontSize: "var(--text-sm)",
          fontFamily: "var(--font-family)",
          lineHeight: "1.5",
          marginBottom: "12px",
        }}
      >
        {report.summary}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2" style={{ justifyContent: "flex-end" }}>
        <button
          style={{
            background: "transparent",
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "4px",
            color: palette.textTertiary,
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-family)",
            padding: "4px 12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <span style={{ fontSize: "13px" }}>⤢</span> View
        </button>
        <button
          style={{
            background: "transparent",
            border: `1px solid ${palette.primary}59`,
            borderRadius: "4px",
            color: palette.primary,
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-family)",
            padding: "4px 12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <span style={{ fontSize: "13px" }}>↓</span> Download
        </button>
      </div>
    </div>
  );
}

// ── ReportsSection ────────────────────────────────────────────────────────────

export function ReportsSection() {
  const { palette } = useTheme();
  return (
    <SectionCard title="Reports">
      <div>
        {REPORTS.map((r) => (
          <ReportRow key={r.title} report={r} palette={palette} />
        ))}
      </div>
    </SectionCard>
  );
}
