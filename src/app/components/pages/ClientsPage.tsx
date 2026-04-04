/**
 * ClientsPage — top-level Clients list page.
 *
 * This is the parent page for Client Profile. It shows a placeholder client
 * list with a sample entry that navigates into the Client Profile sub-page.
 */

import { Users, Search, Plus, ChevronRight } from "lucide-react";
import { useTheme } from "../layout/ThemeContext";
import { PageMenu } from "../client-profile/PageMenu";
import { CLIENTS } from "../../data/clients";

interface ClientsPageProps {
  /** Navigate to a specific client profile. */
  onOpenClient?: (clientId: string) => void;
}

export function ClientsPage({ onOpenClient }: ClientsPageProps) {
  const { palette } = useTheme();

  return (
    <div style={{ fontFamily: "var(--font-family)", padding: "20px 0" }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Users size={22} style={{ color: palette.primary }} />
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: palette.textPrimary,
              margin: 0,
            }}
          >
            Clients
          </h1>
          <PageMenu />
        </div>

        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: palette.primary,
            color: palette.textReversed,
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 600,
            fontFamily: "var(--font-family)",
            cursor: "pointer",
          }}
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      {/* Search bar */}
      <div
        style={{
          position: "relative",
          marginBottom: "16px",
        }}
      >
        <Search
          size={16}
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: palette.textTertiary,
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          placeholder="Search clients by name, email, or phone…"
          style={{
            width: "100%",
            height: "40px",
            background: palette.surfacePrimary,
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "8px",
            color: palette.textPrimary,
            fontSize: "13px",
            fontFamily: "var(--font-family)",
            padding: "0 12px 0 38px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Client list */}
      <div
        style={{
          background: palette.surfacePrimary,
          border: `1px solid ${palette.borderMedium}`,
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 2fr 1.5fr 80px 32px",
            gap: "8px",
            padding: "10px 16px",
            borderBottom: `1px solid ${palette.borderMedium}`,
            fontSize: "11px",
            fontWeight: 600,
            color: palette.textTertiary,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          <span>Name</span>
          <span>Email</span>
          <span>Phone</span>
          <span>Status</span>
          <span />
        </div>

        {/* Client rows */}
        {CLIENTS.map((client) => (
          <div
            key={client.id}
            onClick={() => onOpenClient?.(client.id)}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 1.5fr 80px 32px",
              gap: "8px",
              padding: "12px 16px",
              borderBottom: `1px solid ${palette.borderLight}`,
              fontSize: "13px",
              color: palette.textPrimary,
              cursor: "pointer",
              transition: "background 0.1s",
              alignItems: "center",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = palette.hoverBg;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = "transparent";
            }}
          >
            <span style={{ fontWeight: 500, color: palette.primary }}>
              {client.profile.firstName} {client.profile.lastName}
            </span>
            <span style={{ color: palette.textSecondary }}>{client.contact.email}</span>
            <span style={{ color: palette.textSecondary }}>{client.contact.homePhone}</span>
            <span>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  background:
                    client.status === "Active"
                      ? `${palette.primary}18`
                      : `${palette.textTertiary}18`,
                  color:
                    client.status === "Active"
                      ? palette.primary
                      : palette.textTertiary,
                }}
              >
                {client.status}
              </span>
            </span>
            <ChevronRight size={16} style={{ color: palette.textTertiary }} />
          </div>
        ))}
      </div>
    </div>
  );
}
