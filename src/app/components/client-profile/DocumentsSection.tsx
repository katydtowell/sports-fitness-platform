import { useState } from "react";
import { useTheme } from "../layout/ThemeContext";
import { SectionCard } from "./FormField";

// ── Badge color definitions ───────────────────────────────────────────────────

type DocStatus = "Signed" | "Pending" | "Declined" | "Deleted";

function getBadgeStyles(status: DocStatus, palette: any) {
  const styleMap: Record<DocStatus, { color: string; background: string; border: string }> = {
    Signed:   { color: palette.primary, background: `${palette.primary}1f`, border: `1px solid ${palette.primary}59` },
    Pending:  { color: "#e8a020", background: "#e8a02014", border: "1px solid #e8a02059" },
    Declined: { color: palette.textError, background: `${palette.textError}1f`, border: `1px solid ${palette.textError}59` },
    Deleted:  { color: palette.iconTertiary, background: `${palette.iconTertiary}19`, border: `1px solid ${palette.iconTertiary}40` },
  };
  return styleMap[status];
}

// ── Sample document data ──────────────────────────────────────────────────────

interface Document {
  name: string;
  date: string;
  status: DocStatus;
}

const SAMPLE_DOCUMENTS: Document[] = [
  { name: "Membership Agreement",      date: "01/15/2026", status: "Signed"   },
  { name: "Liability Waiver",          date: "01/15/2026", status: "Signed"   },
  { name: "Personal Training Contract",date: "02/03/2026", status: "Pending"  },
  { name: "Photo Release Form",        date: "02/10/2026", status: "Declined" },
  { name: "Annual Renewal 2025",       date: "12/31/2025", status: "Deleted"  },
];

// ── StatusBadge ───────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: DocStatus;
  active: boolean;
  onClick: () => void;
  palette: any;
}

function StatusBadge({ status, active, onClick, palette }: StatusBadgeProps) {
  const { color, background, border } = getBadgeStyles(status, palette);
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 14px",
        borderRadius: "999px",
        border,
        background: active ? background : "transparent",
        color: active ? color : palette.textTertiary,
        fontSize: "var(--text-sm)",
        fontFamily: "var(--font-family)",
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = background; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          opacity: active ? 1 : 0.5,
        }}
      />
      {status}
    </button>
  );
}

// ── DocumentRow ───────────────────────────────────────────────────────────────

function DocumentRow({ doc, palette }: { doc: Document; palette: any }) {
  const { color, background, border } = getBadgeStyles(doc.status, palette);
  return (
    <div
      className="flex items-center justify-between rounded-lg"
      style={{
        padding: "12px 16px",
        background: palette.hoverBg,
        border: `1px solid ${palette.borderLight}`,
        marginBottom: "8px",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Document icon */}
        <div
          className="flex items-center justify-center rounded shrink-0"
          style={{
            width: "36px",
            height: "36px",
            background: palette.borderLight,
            border: `1px solid ${palette.borderMedium}`,
            color: palette.textTertiary,
            fontSize: "16px",
          }}
        >
          📄
        </div>
        <div>
          <div
            style={{
              color: palette.textPrimary,
              fontSize: "var(--text-base)",
              fontWeight: 500,
              fontFamily: "var(--font-family)",
            }}
          >
            {doc.name}
          </div>
          <div
            style={{
              color: palette.textTertiary,
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font-family)",
            }}
          >
            {doc.date}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Inline status badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 10px",
            borderRadius: "999px",
            border,
            background,
            color,
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-family)",
            fontWeight: 500,
          }}
        >
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: color, flexShrink: 0 }} />
          {doc.status}
        </span>
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

// ── DocumentsSection ──────────────────────────────────────────────────────────

export function DocumentsSection() {
  const { palette } = useTheme();
  const [activeFilter, setActiveFilter] = useState<DocStatus | null>(null);

  const statuses: DocStatus[] = ["Signed", "Pending", "Declined", "Deleted"];

  const filtered = activeFilter
    ? SAMPLE_DOCUMENTS.filter((d) => d.status === activeFilter)
    : SAMPLE_DOCUMENTS;

  function handleBadgeClick(status: DocStatus) {
    setActiveFilter((prev) => (prev === status ? null : status));
  }

  return (
    <SectionCard title="Documents">
      {/* Filter badges */}
      <div
        className="flex flex-wrap gap-2"
        style={{ marginBottom: "16px" }}
      >
        {statuses.map((s) => (
          <StatusBadge
            key={s}
            status={s}
            active={activeFilter === s}
            onClick={() => handleBadgeClick(s)}
            palette={palette}
          />
        ))}
      </div>

      {/* Document rows */}
      <div>
        {filtered.length > 0 ? (
          filtered.map((doc) => <DocumentRow key={doc.name} doc={doc} palette={palette} />)
        ) : (
          <div
            style={{
              textAlign: "center",
              color: palette.textTertiary,
              fontSize: "var(--text-base)",
              fontFamily: "var(--font-family)",
              padding: "24px 0",
            }}
          >
            No {activeFilter?.toLowerCase()} documents
          </div>
        )}
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
          marginTop: "8px",
        }}
      >
        + Add document
      </button>
    </SectionCard>
  );
}
