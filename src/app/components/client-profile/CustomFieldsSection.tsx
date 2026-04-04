import { useTheme } from "../layout/ThemeContext";
import { SectionCard } from "./FormField";

export function CustomFieldsSection() {
  const { palette } = useTheme();
  return (
    <SectionCard title="Custom Fields">
      <div
        className="flex items-center justify-center rounded-lg"
        style={{
          background: palette.hoverBg,
          border: `1px solid ${palette.borderLight}`,
          height: "64px",
        }}
      >
        <span
          style={{
            color: palette.textTertiary,
            fontSize: "var(--text-base)",
            fontFamily: "var(--font-family)",
          }}
        >
          No available custom fields
        </span>
      </div>
    </SectionCard>
  );
}
