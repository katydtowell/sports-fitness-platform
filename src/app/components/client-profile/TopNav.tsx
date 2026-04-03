import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "../ui/use-mobile";

const navItems = [
  "Admin",
  "Clients",
  "Check-In",
  "Email",
  "Equipment",
  "Leagues",
  "Groups",
  "Lectures",
  "PDX",
  "Reports",
  "Schedule",
  "Time Clock",
];

const activeItem = "Clients";

function HamburgerIcon() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px", width: "20px" }}>
      <span style={{ display: "block", height: "2px", background: "#dfe9ec", borderRadius: "2px" }} />
      <span style={{ display: "block", height: "2px", background: "#dfe9ec", borderRadius: "2px" }} />
      <span style={{ display: "block", height: "2px", background: "#dfe9ec", borderRadius: "2px" }} />
    </div>
  );
}

function SearchField() {
  return (
    <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
      <span style={{
        position: "absolute",
        left: "10px",
        color: "#a1bdc6",
        fontSize: "14px",
        pointerEvents: "none",
        lineHeight: 1,
      }}>
        ⌕
      </span>
      <input
        type="search"
        placeholder="Search…"
        style={{
          width: "100%",
          height: "30px",
          background: "rgba(161,189,198,0.08)",
          border: "1px solid rgba(161,189,198,0.2)",
          borderRadius: "6px",
          color: "#dfe9ec",
          fontSize: "13px",
          fontFamily: "var(--font-family)",
          padding: "0 10px 0 30px",
          outline: "none",
        }}
      />
    </div>
  );
}

function AvatarButton({ isMobile, isOpen, onClick }: { isMobile: boolean; isOpen: boolean; onClick: () => void }) {
  return (
    <div
      onClick={isMobile ? onClick : undefined}
      style={{
        width: "30px",
        height: "30px",
        borderRadius: "50%",
        background: "#00c4a0",
        border: isOpen ? "2px solid #dfe9ec" : "2px solid transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#0a0e0f",
        fontSize: "11px",
        fontWeight: 700,
        cursor: isMobile ? "pointer" : "default",
        flexShrink: 0,
        transition: "border-color 0.15s",
        fontFamily: "var(--font-family)",
      }}
    >
      JS
    </div>
  );
}

function UserDropdown({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: "absolute",
      top: "calc(100% + 6px)",
      right: 0,
      background: "#182023",
      border: "1px solid rgba(161,189,198,0.2)",
      borderRadius: "8px",
      overflow: "hidden",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      zIndex: 300,
      minWidth: "180px",
      fontFamily: "var(--font-family)",
    }}>
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(161,189,198,0.1)" }}>
        <div style={{ color: "#dfe9ec", fontSize: "13px", fontWeight: 600 }}>Joe Smith</div>
        <div style={{ color: "#a1bdc6", fontSize: "11px", marginTop: "2px" }}>Administrator</div>
      </div>
      {[
        { label: "Edit profile", icon: "✎" },
        { label: "Log out",      icon: "⇥" },
      ].map(({ label, icon }) => (
        <button
          key={label}
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "100%",
            padding: "11px 16px",
            background: "transparent",
            border: "none",
            borderBottom: label === "Edit profile" ? "1px solid rgba(161,189,198,0.07)" : "none",
            color: label === "Log out" ? "#e05a5a" : "#dfe9ec",
            fontSize: "13px",
            fontFamily: "var(--font-family)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: "14px", opacity: 0.7 }}>{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
}

export function TopNav() {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close everything when switching to desktop
  useEffect(() => {
    if (!isMobile) { setMenuOpen(false); setUserMenuOpen(false); }
  }, [isMobile]);

  // Lock body scroll while nav drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // Close user menu on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userMenuOpen]);

  return (
    <>
      <header
        className="flex items-center shrink-0"
        style={{
          height: "44px",
          background: "#182023",
          borderBottom: "1px solid rgba(161,189,198,0.25)",
          fontFamily: "var(--font-family)",
          padding: "0 10px",
          gap: "10px",
        }}
      >
        {/* ── Shared: search field (all sizes) ── */}
        {/* Rendered per-branch below so placement differs */}

        {isMobile ? (
          <>
            {/* ── Left: hamburger ── */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                color: "#dfe9ec",
                fontSize: "22px",
                lineHeight: 1,
                padding: 0,
                flexShrink: 0,
              }}
            >
              {menuOpen ? "✕" : <HamburgerIcon />}
            </button>

            {/* ── Centre: search ── */}
            <SearchField />

            {/* ── Right: avatar only on mobile ── */}
            <div ref={userMenuRef} style={{ position: "relative", flexShrink: 0 }}>
              <AvatarButton isMobile={true} isOpen={userMenuOpen} onClick={() => setUserMenuOpen(v => !v)} />
              {userMenuOpen && <UserDropdown onClose={() => setUserMenuOpen(false)} />}
            </div>
          </>
        ) : (
          /* ── Desktop / Tablet ── */
          <>
            {/* ── Left: logo ── */}
            <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "16px", flexShrink: 0 }}>
              EZFacility
            </span>

            {/* ── Centre: search (max 600px, centred) ── */}
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: "600px" }}>
                <SearchField />
              </div>
            </div>

            {/* ── Right: avatar only ── */}
            <div ref={userMenuRef} style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                aria-label="User menu"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <AvatarButton isMobile={false} isOpen={userMenuOpen} onClick={() => {}} />
              </button>
              {userMenuOpen && <UserDropdown onClose={() => setUserMenuOpen(false)} />}
            </div>
          </>
        )}
      </header>

      {/* ── Mobile nav drawer ──────────────────────────────────────────────── */}
      {isMobile && menuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              top: "44px",
              background: "rgba(0,0,0,0.55)",
              zIndex: 200,
            }}
          />

          {/* Drawer panel */}
          <div
            style={{
              position: "fixed",
              top: "44px",
              left: 0,
              bottom: 0,
              width: "220px",
              background: "#182023",
              borderRight: "1px solid rgba(161,189,198,0.15)",
              zIndex: 201,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              fontFamily: "var(--font-family)",
            }}
          >
            {/* Logo header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(161,189,198,0.15)",
              marginBottom: "4px",
            }}>
              <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "18px", fontFamily: "var(--font-family)" }}>
                EZFacility
              </span>
            </div>

            {navItems.map(item => {
              const isActive = item === activeItem;
              return (
                <button
                  key={item}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 20px",
                    background: isActive ? "rgba(0,196,160,0.12)" : "transparent",
                    borderLeft: isActive ? "3px solid #00c4a0" : "3px solid transparent",
                    borderTop: "none",
                    borderRight: "none",
                    borderBottom: "1px solid rgba(161,189,198,0.07)",
                    color: isActive ? "#00c4a0" : "#dfe9ec",
                    fontSize: "var(--text-base)",
                    fontWeight: isActive ? 600 : 400,
                    fontFamily: "var(--font-family)",
                    cursor: "pointer",
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
