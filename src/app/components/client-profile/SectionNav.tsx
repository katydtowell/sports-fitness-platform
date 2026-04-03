import { useState, useRef, useEffect } from "react";
import { useIsMobile } from "../ui/use-mobile";

interface SectionNavProps {
  activeSection: string;
  onSelect: (section: string) => void;
  onEditClient?: () => void;
  onCancelEditing?: () => void;
  isEditing?: boolean;
}

export const navGroups = [
  { group: "IDENTITY",    items: ["Profile", "Membership", "Emergency"] },
  { group: "FINANCIAL",   items: ["Billing"] },
  { group: "CONNECTIONS", items: ["Relationships", "Groups"] },
  { group: "RECORDS",     items: ["Documents", "Reports", "Activity", "Equipment"] },
];

/** Returns the human-readable label for the mobile trigger button. */
function triggerLabel(activeSection: string): string {
  if (activeSection === "ALL") return "All Sections";
  const grp = navGroups.find((g) => g.group === activeSection);
  if (grp) return grp.group;
  return activeSection;
}

export function SectionNav({ activeSection, onSelect, onEditClient, onCancelEditing, isEditing }: SectionNavProps) {
  const isMobile    = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);


  /* ── Mobile: dropdown menu ───────────────────────────────────────────── */
  if (isMobile) {
    const label = triggerLabel(activeSection);

    return (
      <div style={{ fontFamily: "var(--font-family)", width: "100%" }}>
        <div ref={dropdownRef} style={{ position: "relative", width: "100%", zIndex: 40 }}>
          {/* Trigger */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "10px 14px", background: "#182023",
              border: "1px solid rgba(161,189,198,0.15)", borderTop: "none",
              borderRadius: isOpen ? "0" : "0 0 8px 8px",
              color: "#dfe9ec", fontSize: "var(--text-base)",
              fontFamily: "var(--font-family)", cursor: "pointer",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00c4a0", display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: "#00c4a0" }}>{label}</span>
            </span>
            <span style={{ color: "#a1bdc6", fontSize: "12px", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
          </button>

          {/* Dropdown panel */}
          {isOpen && (
            <div
              style={{
                position: "absolute", top: "100%", left: 0, right: 0,
                background: "#182023", border: "1px solid rgba(161,189,198,0.25)",
                borderTop: "none", borderRadius: "0 0 8px 8px",
                zIndex: 50, maxHeight: "260px", overflowY: "auto",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              }}
            >
              {navGroups.map((group, gi) => {
                const isGroupActive = activeSection === group.group;
                return (
                  <div key={group.group}>
                    {/* Clickable group heading */}
                    <button
                      onClick={() => {
                        onSelect(isGroupActive ? "ALL" : group.group);
                        setIsOpen(false);
                      }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "8px 14px 4px",
                        marginTop: gi > 0 ? "4px" : 0,
                        borderTop: gi > 0 ? "1px solid rgba(161,189,198,0.1)" : "none",
                        background: isGroupActive ? "rgba(0,196,160,0.08)" : "transparent",
                        border: "none", cursor: "pointer",
                      }}
                    >
                      <span style={{
                        color: isGroupActive ? "#00c4a0" : "#a1bdc6",
                        fontSize: "10px", fontWeight: 700,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        fontFamily: "var(--font-family)",
                      }}>
                        {group.group}
                      </span>
                      {isGroupActive && <span style={{ color: "#00c4a0", fontSize: "12px" }}>✓</span>}
                    </button>

                    {/* Items */}
                    {group.items.map((item) => {
                      const isActive = item === activeSection;
                      return (
                        <button
                          key={item}
                          onClick={() => {
                            onSelect(isActive ? "ALL" : item);
                            setIsOpen(false);
                          }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            width: "100%", padding: "10px 14px",
                            background: isActive ? "rgba(0,196,160,0.12)" : "transparent",
                            color: isActive ? "#00c4a0" : "#dfe9ec",
                            fontSize: "var(--text-base)", fontWeight: isActive ? 600 : 400,
                            fontFamily: "var(--font-family)", cursor: "pointer",
                            border: "none",
                            borderLeft: isActive ? "3px solid #00c4a0" : "3px solid transparent",
                            textAlign: "left",
                          }}
                        >
                          <span>{item}</span>
                          {isActive && <span style={{ color: "#00c4a0", fontSize: "12px" }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Desktop/tablet: vertical grouped nav ────────────────────────────── */
  return (
    <nav
      className="shrink-0 rounded-lg overflow-hidden"
      style={{
        width: "192px", background: "#182023",
        border: "1px solid rgba(161,189,198,0.15)",
        fontFamily: "var(--font-family)", alignSelf: "flex-start",
        position: "sticky", top: "60px",
      }}
    >
      {navGroups.map((group) => {
        const isGroupActive = activeSection === group.group;
        return (
          <div key={group.group}>
            {/* Clickable group heading */}
            <button
              onClick={() => onSelect(isGroupActive ? "ALL" : group.group)}
              className="w-full text-left"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 16px",
                background: isGroupActive ? "rgba(0,196,160,0.08)" : "transparent",
                border: "none", cursor: "pointer", width: "100%",
              }}
              onMouseEnter={(e) => { if (!isGroupActive) e.currentTarget.style.background = "rgba(161,189,198,0.05)"; }}
              onMouseLeave={(e) => { if (!isGroupActive) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{
                color: isGroupActive ? "#00c4a0" : "#a1bdc6",
                fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em",
              }}>
                {group.group}
              </span>
              {isGroupActive && <span style={{ color: "#00c4a0", fontSize: "11px" }}>✓</span>}
            </button>

            {/* Items */}
            {group.items.map((item) => {
              const isActive = item === activeSection;
              return (
                <button
                  key={item}
                  onClick={() => onSelect(isActive ? "ALL" : item)}
                  className="w-full text-left flex items-center justify-between"
                  style={{
                    padding: "10px 16px",
                    background: isActive ? "rgba(0,196,160,0.15)" : "transparent",
                    color: isActive ? "#00c4a0" : "#dfe9ec",
                    fontSize: "var(--text-base)", fontWeight: isActive ? 600 : 400,
                    fontFamily: "var(--font-family)", cursor: "pointer",
                    border: "none",
                    borderLeft: isActive ? "3px solid #00c4a0" : "3px solid transparent",
                    width: "100%",
                  }}
                >
                  <span>{item}</span>
                  {!isActive && <span style={{ color: "#a1bdc6", fontSize: "12px" }}>›</span>}
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
