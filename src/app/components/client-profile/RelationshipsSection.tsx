import { useTheme } from "../layout/ThemeContext";
import { SectionCard } from "./FormField";

interface RelationshipRowProps {
  name: string;
  relationship: string;
  status: string;
  palette: any;
}

function RelationshipRow({ name, relationship, status, palette }: RelationshipRowProps) {
  const isActive = status === "Active";
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
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{
            width: "36px",
            height: "36px",
            background: `${palette.primary}1f`,
            border: `1px solid ${palette.primary}4d`,
            color: palette.primary,
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "var(--font-family)",
          }}
        >
          {name.charAt(0)}
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
            {name}
          </div>
          <div
            style={{
              color: palette.textTertiary,
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font-family)",
            }}
          >
            {relationship}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          style={{
            color: isActive ? palette.primary : palette.textTertiary,
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-family)",
          }}
        >
          {status}
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

export function RelationshipsSection() {
  const { palette } = useTheme();
  const relationships = [
    { name: "Bob Smith", relationship: "Spouse", status: "Active" },
    { name: "Emily Smith", relationship: "Child", status: "Active" },
    { name: "Tom Williams", relationship: "Emergency Contact", status: "Active" },
  ];

  return (
    <SectionCard title="Relationships">
      <div style={{ marginBottom: "12px" }}>
        {relationships.map((r) => (
          <RelationshipRow key={r.name} {...r} palette={palette} />
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
        + Add relationship
      </button>
    </SectionCard>
  );
}
