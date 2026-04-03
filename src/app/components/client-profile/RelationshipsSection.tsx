import { SectionCard } from "./FormField";

interface RelationshipRowProps {
  name: string;
  relationship: string;
  status: string;
}

function RelationshipRow({ name, relationship, status }: RelationshipRowProps) {
  const isActive = status === "Active";
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
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{
            width: "36px",
            height: "36px",
            background: "rgba(0,196,160,0.15)",
            border: "1px solid rgba(0,196,160,0.3)",
            color: "#00c4a0",
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
              color: "#dfe9ec",
              fontSize: "var(--text-base)",
              fontWeight: 500,
              fontFamily: "var(--font-family)",
            }}
          >
            {name}
          </div>
          <div
            style={{
              color: "#a1bdc6",
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
            color: isActive ? "#00c4a0" : "#a1bdc6",
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-family)",
          }}
        >
          {status}
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

export function RelationshipsSection() {
  const relationships = [
    { name: "Bob Smith", relationship: "Spouse", status: "Active" },
    { name: "Emily Smith", relationship: "Child", status: "Active" },
    { name: "Tom Williams", relationship: "Emergency Contact", status: "Active" },
  ];

  return (
    <SectionCard title="Relationships">
      <div style={{ marginBottom: "12px" }}>
        {relationships.map((r) => (
          <RelationshipRow key={r.name} {...r} />
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
        + Add relationship
      </button>
    </SectionCard>
  );
}
