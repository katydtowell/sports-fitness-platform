import { SectionCard } from "./FormField";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

// ── Sample data ───────────────────────────────────────────────────────────────

const CONTACTS: EmergencyContact[] = [
  { name: "Bob Smith",     relationship: "Spouse",           phone: "(555) 201-4832" },
  { name: "Carol Smith",   relationship: "Parent",           phone: "(555) 348-9901" },
  { name: "Tom Williams",  relationship: "Friend",           phone: "(555) 776-2214" },
];

// ── ContactRow ────────────────────────────────────────────────────────────────

function ContactRow({ contact }: { contact: EmergencyContact }) {
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
        {/* Avatar initial */}
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{
            width: "36px",
            height: "36px",
            background: "rgba(224,90,90,0.12)",
            border: "1px solid rgba(224,90,90,0.28)",
            color: "#e05a5a",
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "var(--font-family)",
          }}
        >
          {contact.name.charAt(0)}
        </div>

        <div>
          <div
            style={{
              color: "#dfe9ec",
              fontSize: "var(--text-base)",
              fontWeight: 500,
              fontFamily: "var(--font-family)",
              marginBottom: "2px",
            }}
          >
            {contact.name}
          </div>
          <div
            style={{
              color: "#a1bdc6",
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font-family)",
            }}
          >
            {contact.relationship}
          </div>
        </div>
      </div>

      {/* Phone + call button */}
      <div className="flex items-center gap-3">
        <span
          style={{
            color: "#dfe9ec",
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-family)",
            fontWeight: 500,
          }}
        >
          {contact.phone}
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
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Call
        </button>
      </div>
    </div>
  );
}

// ── EmergencySection ──────────────────────────────────────────────────────────

export function EmergencySection() {
  return (
    <SectionCard title="Emergency Contacts">
      <div style={{ marginBottom: "12px" }}>
        {CONTACTS.map((c) => (
          <ContactRow key={c.name} contact={c} />
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
        + Add emergency contact
      </button>
    </SectionCard>
  );
}
