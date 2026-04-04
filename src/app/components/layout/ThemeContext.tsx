import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

/* ── Light / dark colour palettes from the EZFacility Style Guide ────────── */

export interface ThemePalette {
  /* surface */
  surfaceBg: string;
  surfacePrimary: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  /* text */
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  textError: string;
  textSuccess: string;
  textReversed: string;
  /* outline */
  outlinePrimary: string;
  outlineSecondary: string;
  outlineTertiary: string;
  outlineAction: string;
  outlineError: string;
  /* icon */
  iconPrimary: string;
  iconSecondary: string;
  iconTertiary: string;
  iconReversed: string;
  iconAction: string;
  /* container */
  containerAction: string;
  containerDark: string;
  containerInfo: string;
  containerWarning: string;
  /* primary accent (shared) */
  primary: string;
  /* translucent helpers – derived from the tertiary text tone */
  hoverBg: string;
  borderLight: string;
  borderMedium: string;
  shadow: string;
  backdrop: string;
}

const darkPalette: ThemePalette = {
  surfaceBg: "#0a0e0f",
  surfacePrimary: "#182023",
  surfaceSecondary: "#29373d",
  surfaceTertiary: "#3e535b",
  textPrimary: "#dfe9ec",
  textSecondary: "#dfe9ec",
  textTertiary: "#a1bdc6",
  textDisabled: "#6e8b94",
  textError: "#e05a5a",
  textSuccess: "#00c28a",
  textReversed: "#0a0e0f",
  outlinePrimary: "#a1bdc6",
  outlineSecondary: "#6e8b94",
  outlineTertiary: "#3e535b",
  outlineAction: "#00c28a",
  outlineError: "#d41840",
  iconPrimary: "#f0f6f8",
  iconSecondary: "#6e8b94",
  iconTertiary: "#29373d",
  iconReversed: "#ffffff",
  iconAction: "#00c28a",
  containerAction: "#00c28a",
  containerDark: "#3e535b",
  containerInfo: "#00bcc2",
  containerWarning: "#ffce00",
  primary: "#00c4a0",
  hoverBg: "rgba(161,189,198,0.08)",
  borderLight: "rgba(161,189,198,0.1)",
  borderMedium: "rgba(161,189,198,0.2)",
  shadow: "rgba(0,0,0,0.4)",
  backdrop: "rgba(0,0,0,0.55)",
};

const lightPalette: ThemePalette = {
  surfaceBg: "#dfe9ec",
  surfacePrimary: "#ffffff",
  surfaceSecondary: "#dfe9ec",
  surfaceTertiary: "#a1bdc6",
  textPrimary: "#182023",
  textSecondary: "#3e535b",
  textTertiary: "#597179",
  textDisabled: "#a1bdc6",
  textError: "#d41840",
  textSuccess: "#00c28a",
  textReversed: "#ffffff",
  outlinePrimary: "#597179",
  outlineSecondary: "#a1bdc6",
  outlineTertiary: "#dfe9ec",
  outlineAction: "#00c28a",
  outlineError: "#d41840",
  iconPrimary: "#182023",
  iconSecondary: "#597179",
  iconTertiary: "#a1bdc6",
  iconReversed: "#ffffff",
  iconAction: "#00c28a",
  containerAction: "#00c28a",
  containerDark: "#597179",
  containerInfo: "#00bcc2",
  containerWarning: "#ffce00",
  primary: "#00c4a0",
  hoverBg: "rgba(62,83,91,0.08)",
  borderLight: "rgba(62,83,91,0.1)",
  borderMedium: "rgba(62,83,91,0.2)",
  shadow: "rgba(0,0,0,0.12)",
  backdrop: "rgba(0,0,0,0.35)",
};

/* ── Context ────────────────────────────────────────────────────────────── */

type ThemeMode = "dark" | "light";

interface ThemeContextValue {
  mode: ThemeMode;
  palette: ThemePalette;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "dark",
  palette: darkPalette,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const palette = mode === "dark" ? darkPalette : lightPalette;

  /* Sync CSS custom props + body styles on mode change */
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", mode);

    /* Apply CSS custom properties so non-React parts of the page update too */
    const p = palette;
    root.style.setProperty("--surface-bg", p.surfaceBg);
    root.style.setProperty("--surface-primary", p.surfacePrimary);
    root.style.setProperty("--surface-secondary", p.surfaceSecondary);
    root.style.setProperty("--surface-tertiary", p.surfaceTertiary);
    root.style.setProperty("--text-primary-color", p.textPrimary);
    root.style.setProperty("--text-secondary-color", p.textSecondary);
    root.style.setProperty("--text-tertiary-color", p.textTertiary);
    root.style.setProperty("--text-disabled-color", p.textDisabled);
    root.style.setProperty("--outline-primary", p.outlinePrimary);
    root.style.setProperty("--outline-secondary", p.outlineSecondary);
    root.style.setProperty("--outline-tertiary", p.outlineTertiary);
    root.style.setProperty("--icon-primary", p.iconPrimary);
    root.style.setProperty("--icon-secondary", p.iconSecondary);
    root.style.setProperty("--hover-bg", p.hoverBg);
    root.style.setProperty("--border-light", p.borderLight);
    root.style.setProperty("--border-medium", p.borderMedium);
    root.style.setProperty("--shadow-color", p.shadow);
    root.style.setProperty("--backdrop-color", p.backdrop);

    document.body.style.background = p.surfaceBg;
    document.body.style.color = p.textPrimary;
  }, [mode, palette]);

  return (
    <ThemeContext.Provider value={{ mode, palette, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
