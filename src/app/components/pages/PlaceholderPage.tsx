/**
 * PlaceholderPage — generic placeholder used by pages that haven't been built
 * out yet. Shows the page title, icon, and a short description.
 */

import { useTheme } from "../layout/ThemeContext";
import type { ComponentType, SVGProps } from "react";

interface PlaceholderPageProps {
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  description?: string;
}

export function PlaceholderPage({ title, icon: Icon, description }: PlaceholderPageProps) {
  const { palette } = useTheme();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "16px",
        fontFamily: "var(--font-family)",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "16px",
          background: `${palette.primary}14`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={36} style={{ color: palette.primary }} />
      </div>

      <h1
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: palette.textPrimary,
          margin: 0,
        }}
      >
        {title}
      </h1>

      <p
        style={{
          fontSize: "14px",
          color: palette.textTertiary,
          maxWidth: "400px",
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {description ?? `The ${title} page is under construction. Check back soon!`}
      </p>
    </div>
  );
}
