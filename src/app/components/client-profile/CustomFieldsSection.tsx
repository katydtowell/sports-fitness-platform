import { SectionCard } from "./FormField";

export function CustomFieldsSection() {
  return (
    <SectionCard title="Custom Fields">
      <div
        className="flex items-center justify-center rounded-lg"
        style={{
          background: "rgba(161,189,198,0.06)",
          border: "1px solid rgba(161,189,198,0.12)",
          height: "64px",
        }}
      >
        <span
          style={{
            color: "#a1bdc6",
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
