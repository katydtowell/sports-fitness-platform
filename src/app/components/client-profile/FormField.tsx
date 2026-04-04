import { useState } from "react";
import { useTheme } from "../layout/ThemeContext";

// ── Date formatting utility ───────────────────────────────────────────────────
// Converts a YYYY-MM-DD string (HTML date input format) to MM/DD/YYYY for display.

export function formatDateDisplay(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [year, month, day] = parts;
  return `${month}/${day}/${year}`;
}

// ── ReadOnlyField ─────────────────────────────────────────────────────────────
// Displays a single label + value pair in static (non-editable) mode.

interface ReadOnlyFieldProps {
  label: string;
  value: string;
}

export function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  const { palette } = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span
        style={{
          color: palette.textTertiary,
          fontSize: "var(--text-sm)",
          fontFamily: "var(--font-family)",
          marginBottom: "4px",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: value ? palette.textPrimary : `${palette.textTertiary}59`,
          fontSize: "var(--text-base)",
          fontFamily: "var(--font-family)",
          lineHeight: "1.5",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </span>
    </div>
  );
}

// ── FormField ─────────────────────────────────────────────────────────────────
// When `onChange` is provided the component is fully controlled (value comes
// from the parent). Without `onChange` it maintains its own internal state
// seeded from the initial `value` prop (backwards-compatible).

interface FormFieldProps {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  isDropdown?: boolean;
  isTextarea?: boolean;
  options?: string[];
  required?: boolean;
  type?: string;
  /** When true, renders the field with a red error border and a "Required" message. */
  error?: boolean;
}

export function FormField({
  label,
  value = "",
  onChange,
  placeholder,
  isDropdown = false,
  isTextarea = false,
  options = [],
  required = false,
  type = "text",
  error = false,
}: FormFieldProps) {
  const { palette } = useTheme();
  const controlled = onChange !== undefined;
  const [internalValue, setInternalValue] = useState(value);

  const displayValue = controlled ? value : internalValue;
  const handleChange = controlled
    ? onChange
    : (v: string) => setInternalValue(v);

  const inputStyle: React.CSSProperties = {
    background: palette.surfaceBg,
    border: error ? `1px solid ${palette.textError}` : `1px solid ${palette.borderMedium}`,
    borderRadius: "6px",
    height: "36px",
    padding: "0 11px",
    color: displayValue ? palette.textPrimary : `${palette.textTertiary}80`,
    fontSize: "var(--text-base)",
    fontFamily: "var(--font-family)",
    width: "100%",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: palette.textTertiary,
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-family)",
    marginBottom: "6px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: palette.textError, marginLeft: "2px" }}>*</span>}
      </label>
      {isDropdown ? (
        <select
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            ...inputStyle,
            cursor: "pointer",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1bdc6' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
            paddingRight: "30px",
          }}
        >
          {displayValue && <option value={displayValue}>{displayValue}</option>}
          {options.filter((o) => o !== displayValue).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : isTextarea ? (
        <textarea
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          style={{ ...inputStyle, height: "80px", padding: "8px 11px", resize: "vertical" }}
        />
      ) : (
        <input
          type={type}
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          style={inputStyle}
        />
      )}
      {error && (
        <span style={{ color: palette.textError, fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", marginTop: "4px" }}>
          This field is required
        </span>
      )}
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────────
// Collapsible card wrapper. Shows an "Edit" pencil in the header when
// `onEdit` is provided and the section is not already in editing mode.

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  /** Called when the user clicks the Edit pencil. Only shown in read-only mode. */
  onEdit?: () => void;
  /** Called when the user clicks the Cancel link. Only shown when isEditing. */
  onCancel?: () => void;
  /** When true, shows Cancel link instead of Edit pencil. */
  isEditing?: boolean;
}

export function SectionCard({
  title,
  children,
  onEdit,
  onCancel,
  isEditing = false,
}: SectionCardProps) {
  const { palette } = useTheme();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className="rounded-lg"
      style={{
        background: palette.surfacePrimary,
        border: `1px solid ${palette.borderMedium}`,
        padding: "20px 24px",
        fontFamily: "var(--font-family)",
        transition: "background 0.25s ease",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: isOpen ? "18px" : "0" }}
      >
        <span style={{ color: palette.textPrimary, fontSize: "var(--text-lg)", fontWeight: 600 }}>
          {title}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Edit pencil — only visible in read-only mode */}
          {onEdit && !isEditing && (
            <button
              onClick={onEdit}
              aria-label={`Edit ${title}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                background: "transparent",
                border: "none",
                color: palette.primary,
                fontSize: "var(--text-sm)",
                fontFamily: "var(--font-family)",
                cursor: "pointer",
                padding: "3px 8px",
                borderRadius: "4px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <span style={{ fontSize: "14px", lineHeight: 1 }}>✎</span>
              <span>Edit</span>
            </button>
          )}

          {/* Cancel link — replaces Edit when section is being edited */}
          {onCancel && isEditing && (
            <button
              onClick={onCancel}
              aria-label={`Cancel editing ${title}`}
              style={{
                display: "flex",
                alignItems: "center",
                background: "transparent",
                border: "none",
                color: palette.textError,
                fontSize: "var(--text-sm)",
                fontFamily: "var(--font-family)",
                cursor: "pointer",
                padding: "3px 8px",
                borderRadius: "4px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Cancel
            </button>
          )}

          {/* Collapse / expand */}
          <button
            onClick={() => setIsOpen((o) => !o)}
            style={{
              background: palette.borderLight,
              border: `1px solid ${palette.borderMedium}`,
              borderRadius: "4px",
              color: palette.textTertiary,
              width: "24px",
              height: "24px",
              cursor: "pointer",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isOpen ? "–" : "+"}
          </button>
        </div>
      </div>

      {isOpen && children}
    </div>
  );
}
