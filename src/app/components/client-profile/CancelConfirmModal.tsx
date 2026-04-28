import { useTheme } from "../layout/ThemeContext";

// ── Icons ─────────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── ChoiceButton ──────────────────────────────────────────────────────────────

interface ChoiceButtonProps {
  icon: "pencil" | "x";
  label: string;
  sublabel: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  palette: any;
  isDark: boolean;
}

function ChoiceButton({ icon, label, sublabel, onClick, variant = "primary", palette, isDark }: ChoiceButtonProps) {
  const RADIUS = "6px";
  const isPrimary = variant === "primary";

  // Primary text/icon on the green button must be dark in both modes so it
  // doesn't read as disabled. Light mode previously used palette.surfaceBg
  // (#dfe9ec, rgb 223,233,236), which sat too close to the green and looked
  // muted. Now matches the canonical primary-button text color used across
  // the app: rgb(16,24,40) light / rgb(10,14,15) dark.
  const onPrimaryText = isDark ? "#0a0e0f" : "#101828";

  const buttonColors = isPrimary
    ? { background: palette.primary, border: "none", color: onPrimaryText }
    : { background: "transparent", border: `1px solid ${palette.outlineAction}`, color: palette.textTertiary };

  const iconBandBackground = isPrimary
    ? "rgba(255,255,255,0.18)"
    : palette.borderLight;

  return (
    <button
      onClick={onClick}
      style={{
        ...buttonColors,
        borderRadius: RADIUS,
        fontFamily: "var(--font-family)",
        cursor: "pointer",
        display: "flex",
        alignItems: "stretch",
        padding: 0,
        textAlign: "left",
        width: "100%",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {/* Icon band — slightly lighter tint, fills full button height */}
      <div
        style={{
          background: iconBandBackground,
          borderRadius: `${RADIUS} 0 0 ${RADIUS}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 14px",
          flexShrink: 0,
          color: isPrimary ? onPrimaryText : palette.textTertiary,
        }}
      >
        {icon === "pencil" ? <PencilIcon /> : <XIcon />}
      </div>

      {/* Text — left-aligned, label + sublabel stacked tightly */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "12px 16px",
          gap: "1px",
        }}
      >
        <span style={{ fontSize: "var(--text-lg)", fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1.2 }}>
          {label}
        </span>
        <span style={{ fontSize: "11px", fontWeight: 400, opacity: 0.72, whiteSpace: "nowrap", lineHeight: 1.3 }}>
          {sublabel}
        </span>
      </div>
    </button>
  );
}

// ── CancelConfirmModal ────────────────────────────────────────────────────────

interface CancelConfirmModalProps {
  /** Called when the user clicks "Continue" (cancel my changes). */
  onConfirm: () => void;
  /** Called when the user clicks "Keep Editing" or the backdrop. */
  onKeepEditing: () => void;
}

export function CancelConfirmModal({ onConfirm, onKeepEditing }: CancelConfirmModalProps) {
  const { palette, mode } = useTheme();
  const isDark = mode === "dark";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: palette.backdrop,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onKeepEditing}
    >
      <div
        style={{
          background: palette.surfacePrimary,
          border: `1px solid ${palette.borderMedium}`,
          borderRadius: "10px",
          overflow: "hidden",
          width: "100%",
          maxWidth: "460px",
          fontFamily: "var(--font-family)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Heading band */}
        <div style={{ background: palette.surfaceSecondary, padding: "20px 24px 18px" }}>
          <h2
            style={{
              color: palette.textPrimary,
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              fontFamily: "var(--font-family)",
              margin: 0,
            }}
          >
            You're about to cancel your changes.
          </h2>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 24px 24px" }}>
          <p
            style={{
              color: palette.textTertiary,
              fontSize: "var(--text-base)",
              fontFamily: "var(--font-family)",
              lineHeight: 1.6,
              margin: "0 0 20px",
            }}
          >
            If you continue, your changes won't be saved. What would you like to do?
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <ChoiceButton
              icon="pencil"
              label="Keep Editing"
              sublabel="I'm not ready to exit."
              onClick={onKeepEditing}
              palette={palette}
              isDark={isDark}
            />
            <ChoiceButton
              icon="x"
              label="Continue"
              sublabel="I understand my changes will be lost."
              onClick={onConfirm}
              variant="secondary"
              palette={palette}
              isDark={isDark}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
