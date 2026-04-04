import { useTheme } from "../layout/ThemeContext";
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

function ContactRow({ contact, palette }: { contact: EmergencyContact; palette: any }) {
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
        {/* Avatar initial */}
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{
            width: "36px",
            height: "36px",
            background: `${palette.textError}1f`,
            border: `1px solid ${palette.textError}47`,
            color: palette.textError,
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
              color: palette.textPrimary,
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
              color: palette.textTertiary,
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
            color: palette.textPrimary,
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
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "4px",
            color: palette.textTertiary,
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
  const { palette } = useTheme();
  return (
    <SectionCard title="Emergency Contacts">
      <div style={{ marginBottom: "12px" }}>
        {CONTACTS.map((c) => (
          <ContactRow key={c.name} contact={c} palette={palette} />
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
        + Add emergency contact
      </button>
    </SectionCard>
  );
}
