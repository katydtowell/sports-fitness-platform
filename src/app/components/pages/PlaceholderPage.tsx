/**
 * PlaceholderPage — generic placeholder used by pages that haven't been built
 * out yet. Shows a page header with the title + three-dot menu, then a
 * centred empty-state illustration below.
 */

import { useTheme } from "../layout/ThemeContext";
import { PageMenu } from "../client-profile/PageMenu";
import type { ComponentType, SVGProps } from "react";

interface PlaceholderPageProps {
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  description?: string;
}

export function PlaceholderPage({ title, icon: Icon, description }: PlaceholderPageProps) {
  const { palette } = useTheme();

  return (
    <div style={{ fontFamily: "var(--font-family)", padding: "20px 0" }}>
      {/* Page header — matches the Clients page layout */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <Icon size={22} style={{ color: palette.primary }} />
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: palette.textPrimary,
            margin: 0,
          }}
        >
          {title}
        </h1>
        <PageMenu />
      </div>

      {/* Centred empty-state */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          gap: "16px",
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
    </div>
  );
}
