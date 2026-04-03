import { useState } from "react";
import { SectionCard } from "./FormField";

// ── Badge color definitions ───────────────────────────────────────────────────

type DocStatus = "Signed" | "Pending" | "Declined" | "Deleted";

const BADGE_STYLES: Record<DocStatus, { color: string; background: string; border: string }> = {
  Signed:   { color: "#00c4a0", background: "rgba(0,196,160,0.12)",   border: "1px solid rgba(0,196,160,0.35)"   },
  Pending:  { color: "#e8a020", background: "rgba(232,160,32,0.12)",  border: "1px solid rgba(232,160,32,0.35)"  },
  Declined: { color: "#e05a5a", background: "rgba(224,90,90,0.12)",   border: "1px solid rgba(224,90,90,0.35)"   },
  Deleted:  { color: "#8fa8b8", background: "rgba(143,168,184,0.10)", border: "1px solid rgba(143,168,184,0.25)" },
};

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
}

function StatusBadge({ status, active, onClick }: StatusBadgeProps) {
  const { color, background, border } = BADGE_STYLES[status];
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
        color: active ? color : "#a1bdc6",
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

function DocumentRow({ doc }: { doc: Document }) {
  const { color, background, border } = BADGE_STYLES[doc.status];
  return (
    <div
      className="flex items-center justify-between rounded-lg"
      style={{
        padding: "12px 16px",
        background: "rgba(161,189,198,0.04)",
        border: "1px solid rgba(161,189,198,0.1)",
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
            background: "rgba(161,189,198,0.08)",
            border: "1px solid rgba(161,189,198,0.15)",
            color: "#a1bdc6",
            fontSize: "16px",
          }}
        >
          📄
        </div>
        <div>
          <div
            style={{
              color: "#dfe9ec",
              fontSize: "var(--text-base)",
              fontWeight: 500,
              fontFamily: "var(--font-family)",
            }}
          >
            {doc.name}
          </div>
          <div
            style={{
              color: "#a1bdc6",
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

// ── DocumentsSection ──────────────────────────────────────────────────────────

export function DocumentsSection() {
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
          />
        ))}
      </div>

      {/* Document rows */}
      <div>
        {filtered.length > 0 ? (
          filtered.map((doc) => <DocumentRow key={doc.name} doc={doc} />)
        ) : (
          <div
            style={{
              textAlign: "center",
              color: "#a1bdc6",
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
          border: "1px dashed rgba(161,189,198,0.3)",
          borderRadius: "6px",
          color: "#a1bdc6",
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
