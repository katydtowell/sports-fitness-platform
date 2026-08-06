/**
 * SelfServiceClientPortalPage — Admin › Self Service › Client Portal.
 *
 * A visual, non-technical redesign of the legacy "Self Service Preferences"
 * screen. Staff are rarely developers, so this page favors plain-language
 * toggles, live-updating previews, and progressive disclosure (advanced /
 * rarely-used settings are tucked away) over the original's dense checkbox
 * tree.
 *
 * Two jobs happen here:
 *  1. Look & feel — logo, brand color, welcome message, background style —
 *     reflected instantly in the preview panel on the right.
 *  2. Preferences — what clients can do, notifications, and which menu
 *     items they see — the functional settings from the original screen.
 *
 * The portal itself is reached two ways: a dedicated subdomain
 * (https://{subdomain}.ezfacility.com) or an <iframe> embed snippet for the
 * gym's own website — both surfaced together in the first card since
 * they're two doors to the same room.
 */

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Globe,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Upload,
  Smartphone,
  Monitor,
  Bell,
  Calendar,
  KeyRound,
  ShoppingBag,
  UserPlus,
  UserCog,
  Settings2,
  CreditCard,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  X,
  Plus,
  Receipt,
  ListChecks,
  CalendarCheck,
  Video,
  Palette,
  Code2,
  PanelRightClose,
  PanelRightOpen,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "../layout/ThemeContext";
import { PageMenu } from "../client-profile/PageMenu";
import { useIsMobile } from "../ui/use-mobile";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES & STATIC DATA
   ═══════════════════════════════════════════════════════════════════════ */

const BRAND_SWATCHES = [
  "#00C4A0", // EZFacility teal (default)
  "#0EA5E9", // sky
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#F97316", // orange
  "#EAB308", // gold
  "#22C55E", // green
];

type BackgroundStyle = "light" | "dark" | "brand";

/** Width of the Live Preview rail when minimized — matches the Schedule page's right rail. */
const MINIMIZED_RAIL_WIDTH = "52px";

/** Mixes a hex color toward white by (1 - strength) — used to build a light pastel
 *  tint of the brand color that stays legible with dark text, rather than a
 *  low-alpha overlay that lets a dark backdrop show through. */
function tintWithWhite(hex: string, strength: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const mix = (channel: number) => Math.round(channel * strength + 255 * (1 - strength));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

interface Capability {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const CAPABILITIES: Capability[] = [
  {
    id: "bookSessions",
    label: "Book sessions",
    description: "Clients can reserve sessions with your staff online.",
    icon: Calendar,
  },
  {
    id: "bookRentals",
    label: "Book rentals",
    description: "Clients can reserve rooms, courts, or equipment online.",
    icon: KeyRound,
  },
  {
    id: "buyPackages",
    label: "Buy packages & memberships",
    description: "Clients can purchase and pay for plans on their own.",
    icon: ShoppingBag,
  },
  {
    id: "newSignups",
    label: "Accept new client sign-ups",
    description: "Anyone can create an account, not just invited clients.",
    icon: UserPlus,
  },
  {
    id: "editProfile",
    label: "Let clients edit their own profile",
    description: "Clients can update contact info, photo, and payment method.",
    icon: UserCog,
  },
];

interface MenuOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

const MENU_OPTIONS: MenuOption[] = [
  { id: "invoices", label: "Invoices", icon: Receipt },
  { id: "buy", label: "Buy", icon: ShoppingBag },
  { id: "mySchedule", label: "My Schedule", icon: CalendarCheck },
  { id: "bookSessions", label: "Book Sessions", icon: Calendar },
  { id: "bookRentals", label: "Book Rentals", icon: KeyRound },
  { id: "registrations", label: "Registrations", icon: ListChecks },
  { id: "videoLibrary", label: "Video Library", icon: Video },
];

interface NotifyEvent {
  id: string;
  label: string;
}

const NOTIFY_EVENTS: NotifyEvent[] = [
  { id: "booksSession", label: "A client books a session" },
  { id: "booksRental", label: "A client books a rental" },
  { id: "newClient", label: "A new client registers" },
  { id: "buysPackage", label: "A client purchases a package" },
  { id: "buysMembership", label: "A client purchases a membership" },
  { id: "cancels", label: "A client cancels a booking" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SMALL SHARED PIECES
   ═══════════════════════════════════════════════════════════════════════ */

function Toggle({
  enabled,
  onChange,
  size = "md",
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  size?: "md" | "lg";
}) {
  const { palette } = useTheme();
  const w = size === "lg" ? 48 : 40;
  const h = size === "lg" ? 26 : 22;
  const knob = h - 4;

  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      style={{
        width: `${w}px`,
        height: `${h}px`,
        borderRadius: `${h}px`,
        background: enabled ? palette.primary : palette.outlineSecondary,
        border: "none",
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
        padding: 0,
        transition: "background 0.2s ease",
      }}
    >
      <div
        style={{
          width: `${knob}px`,
          height: `${knob}px`,
          borderRadius: "50%",
          background: "#ffffff",
          position: "absolute",
          top: "2px",
          left: enabled ? `${w - knob - 2}px` : "2px",
          transition: "left 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

interface CardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  headerRight?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
}

function Card({ icon: Icon, title, description, headerRight, children, style }: CardProps) {
  const { palette } = useTheme();
  return (
    <div
      style={{
        background: palette.surfacePrimary,
        border: `1px solid ${palette.borderMedium}`,
        borderRadius: "12px",
        padding: "22px",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: description || children ? "18px" : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: `${palette.primary}1a`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={18} style={{ color: palette.primary }} />
          </div>
          <div>
            <h2
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: palette.textPrimary,
                margin: 0,
                lineHeight: "36px",
              }}
            >
              {title}
            </h2>
            {description && (
              <p
                style={{
                  fontSize: "13px",
                  color: palette.textTertiary,
                  margin: "2px 0 0 0",
                  lineHeight: 1.5,
                }}
              >
                {description}
              </p>
            )}
          </div>
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

/** A single toggle row used for capabilities / menu items. */
function ToggleRow({
  icon: Icon,
  label,
  description,
  enabled,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  const { palette } = useTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        background: palette.surfaceSecondary,
        border: `1px solid ${palette.borderMedium}`,
        borderRadius: "8px",
      }}
    >
      <Icon size={16} style={{ color: enabled ? palette.primary : palette.textTertiary, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: palette.textPrimary }}>{label}</div>
        {description && (
          <div style={{ fontSize: "12px", color: palette.textTertiary, marginTop: "2px" }}>
            {description}
          </div>
        )}
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { palette } = useTheme();
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-checked={checked}
      role="checkbox"
      style={{
        width: "18px",
        height: "18px",
        borderRadius: "5px",
        border: `1.5px solid ${checked ? palette.primary : palette.outlineSecondary}`,
        background: checked ? palette.primary : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        padding: 0,
      }}
    >
      {checked && <Check size={12} color={palette.textReversed} strokeWidth={3} />}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

interface SelfServiceClientPortalPageProps {
  /** "admin" → jump to Admin dashboard, "self-service" → back to Self Service hub. */
  onNavigate?: (target: "admin" | "self-service") => void;
}

export function SelfServiceClientPortalPage({ onNavigate }: SelfServiceClientPortalPageProps) {
  const { palette } = useTheme();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Portal status & access ──────────────────────────────────────────────
  const [portalEnabled, setPortalEnabled] = useState(true);
  const [subdomain, setSubdomain] = useState("eztraining");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // ── Look & feel ──────────────────────────────────────────────────────────
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState(BRAND_SWATCHES[0]);
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Welcome back! Book your next session below."
  );
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>("light");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewMinimized, setPreviewMinimized] = useState(false);

  // ── What clients can do ─────────────────────────────────────────────────
  const [capabilities, setCapabilities] = useState<Record<string, boolean>>({
    bookSessions: true,
    bookRentals: true,
    buyPackages: true,
    newSignups: true,
    editProfile: true,
  });

  // ── Notifications ───────────────────────────────────────────────────────
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyEvents, setNotifyEvents] = useState<Record<string, boolean>>({
    booksSession: true,
    booksRental: false,
    newClient: true,
    buysPackage: true,
    buysMembership: false,
    cancels: true,
  });
  const [notifyEmails, setNotifyEmails] = useState<string[]>(["mvidal@ezfacility.com"]);
  const [newEmail, setNewEmail] = useState("");

  // ── Portal menu ──────────────────────────────────────────────────────────
  const [menuItems, setMenuItems] = useState<Record<string, boolean>>({
    invoices: true,
    buy: true,
    mySchedule: true,
    bookSessions: true,
    bookRentals: true,
    registrations: true,
    videoLibrary: false,
  });

  // ── Advanced (progressive disclosure) ───────────────────────────────────
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [ccStorage, setCcStorage] = useState<"always" | "whenDue" | "none">("always");
  const [calendarView, setCalendarView] = useState("Month View");
  const [redirectPublic, setRedirectPublic] = useState("");
  const [redirectInvite, setRedirectInvite] = useState("");
  const [social, setSocial] = useState({ facebook: "", twitter: "", instagram: "", youtube: "" });

  // ── Save bar ─────────────────────────────────────────────────────────────
  const [justSaved, setJustSaved] = useState(false);

  const portalUrl = `${subdomain || "yourgym"}.ezfacility.com`;
  const embedSnippet = `<iframe\n  src="https://${portalUrl}"\n  width="100%"\n  height="800"\n  style="border:0;"\n  title="Client Portal"\n></iframe>`;

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoUrl(url);
  }

  function copyToClipboard(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 1800);
  }

  function addEmail() {
    const trimmed = newEmail.trim();
    if (!trimmed || notifyEmails.includes(trimmed)) return;
    setNotifyEmails((prev) => [...prev, trimmed]);
    setNewEmail("");
  }

  function removeEmail(email: string) {
    setNotifyEmails((prev) => prev.filter((e) => e !== email));
  }

  function handleSave() {
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2200);
  }

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: palette.textTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    marginBottom: "6px",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    height: "38px",
    padding: "0 12px",
    fontSize: "13px",
    fontFamily: "var(--font-family)",
    color: palette.textPrimary,
    background: palette.surfaceBg,
    border: `1px solid ${palette.borderMedium}`,
    borderRadius: "8px",
    outline: "none",
    boxSizing: "border-box",
  };

  /* ── Preview background resolution ──
   * "Tinted" is a light pastel wash of the brand color — it keeps the same
   * light cards + dark text as "Light". It must be mixed toward an actual
   * white, not just a low-alpha brand color, since alpha alone lets the
   * dark device-frame backdrop show through and reads as a dark surface. */
  const previewBg =
    backgroundStyle === "dark" ? "#182023" : backgroundStyle === "brand" ? tintWithWhite(brandColor, 0.12) : "#f4f7f8";
  const previewText = backgroundStyle === "dark" ? "#dfe9ec" : "#1a2226";
  const previewSubText = backgroundStyle === "dark" ? "#a1bdc6" : "#5a6a70";
  const previewCard = backgroundStyle === "dark" ? "#243035" : "#ffffff";

  return (
    <div style={{ fontFamily: "var(--font-family)", padding: "20px 0 100px" }}>
      {/* ── Breadcrumb + header ── */}
      <div style={{ marginBottom: "18px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: palette.textTertiary,
            marginBottom: "10px",
          }}
        >
          <button
            onClick={() => onNavigate?.("admin")}
            style={{ background: "none", border: "none", padding: 0, color: palette.textTertiary, cursor: "pointer", fontFamily: "var(--font-family)", fontSize: "12px" }}
          >
            Admin
          </button>
          <ChevronRight size={12} />
          <button
            onClick={() => onNavigate?.("self-service")}
            style={{ background: "none", border: "none", padding: 0, color: palette.textTertiary, cursor: "pointer", fontFamily: "var(--font-family)", fontSize: "12px" }}
          >
            Self Service
          </button>
          <ChevronRight size={12} />
          <span style={{ color: palette.textPrimary, fontWeight: 600 }}>Client Portal</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Globe size={22} style={{ color: palette.primary }} />
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: palette.textPrimary, margin: 0 }}>
            Client Portal
          </h1>
          <PageMenu
            contextualPages={[{ id: "admin/self-service", label: "Self Service" }]}
            onNavigateToPage={(pageId) => {
              if (pageId === "admin/self-service") onNavigate?.("self-service");
            }}
          />
        </div>
        <p style={{ fontSize: "13px", color: palette.textTertiary, margin: "4px 0 0 34px" }}>
          Customize how your branded portal looks and what clients can do in it.
        </p>
      </div>

      {/* ── Main two-column layout ── */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "20px",
          alignItems: "flex-start",
        }}
      >
        {/* ═══ LEFT: settings ═══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0, flex: "1 1 0" }}>
          {/* 1. Portal status & access */}
          <Card
            icon={Globe}
            title="Turn On Your Client Portal"
            description="When it's on, clients can log in to book, buy, and manage their own account."
            headerRight={<Toggle enabled={portalEnabled} onChange={setPortalEnabled} size="lg" />}
          >
            <div style={{ opacity: portalEnabled ? 1 : 0.45, pointerEvents: portalEnabled ? "auto" : "none" }}>
              <label style={labelStyle}>Your portal address</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flex: 1,
                    background: palette.surfaceBg,
                    border: `1px solid ${palette.borderMedium}`,
                    borderRadius: "8px",
                    overflow: "hidden",
                    height: "38px",
                  }}
                >
                  <span style={{ padding: "0 0 0 12px", fontSize: "13px", color: palette.textTertiary }}>
                    https://
                  </span>
                  <input
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.replace(/[^a-z0-9-]/gi, "").toLowerCase())}
                    style={{
                      border: "none",
                      background: "transparent",
                      outline: "none",
                      fontSize: "13px",
                      fontFamily: "var(--font-family)",
                      color: palette.textPrimary,
                      width: "110px",
                      padding: "0 2px",
                    }}
                  />
                  <span style={{ fontSize: "13px", color: palette.textTertiary, paddingRight: "12px" }}>
                    .ezfacility.com
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(`https://${portalUrl}`, setCopiedUrl)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "38px",
                    padding: "0 14px",
                    background: copiedUrl ? palette.primary : "transparent",
                    border: `1px solid ${copiedUrl ? palette.primary : palette.borderMedium}`,
                    borderRadius: "8px",
                    color: copiedUrl ? palette.textReversed : palette.textPrimary,
                    fontSize: "13px",
                    fontWeight: 600,
                    fontFamily: "var(--font-family)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s",
                  }}
                >
                  {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
                  {copiedUrl ? "Copied" : "Copy link"}
                </button>
              </div>

              {/* Embed on your website */}
              <div
                style={{
                  border: `1px solid ${palette.borderMedium}`,
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setShowEmbedCode((v) => !v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "12px 14px",
                    background: palette.surfaceSecondary,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-family)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: palette.textPrimary }}>
                    <Code2 size={14} style={{ color: palette.textTertiary }} />
                    Prefer to embed it on your own website?
                  </span>
                  <ChevronDown
                    size={16}
                    style={{ color: palette.textTertiary, transform: showEmbedCode ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
                  />
                </button>
                {showEmbedCode && (
                  <div style={{ padding: "14px" }}>
                    <p style={{ fontSize: "12px", color: palette.textTertiary, margin: "0 0 10px 0", lineHeight: 1.5 }}>
                      Paste this snippet into any page on your website to show the portal there instead of sending clients to your subdomain.
                    </p>
                    <div
                      style={{
                        position: "relative",
                        background: palette.surfaceBg,
                        border: `1px solid ${palette.borderMedium}`,
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                    >
                      <pre
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          fontFamily: "monospace",
                          color: palette.textSecondary,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                        }}
                      >
                        {embedSnippet}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(embedSnippet, setCopiedEmbed)}
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "5px 10px",
                          background: copiedEmbed ? palette.primary : palette.surfaceSecondary,
                          border: `1px solid ${copiedEmbed ? palette.primary : palette.borderMedium}`,
                          borderRadius: "6px",
                          color: copiedEmbed ? palette.textReversed : palette.textTertiary,
                          fontSize: "11px",
                          fontWeight: 600,
                          fontFamily: "var(--font-family)",
                          cursor: "pointer",
                        }}
                      >
                        {copiedEmbed ? <Check size={12} /> : <Copy size={12} />}
                        {copiedEmbed ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* 2. Look & feel */}
          <Card icon={Palette} title="Look & Feel" description="Match the portal to your brand — clients will see this the moment they log in.">
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Logo upload */}
              <div>
                <label style={labelStyle}>Logo</label>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      minWidth: "96px",
                      height: "48px",
                      padding: "0 14px",
                      borderRadius: "10px",
                      background: palette.surfaceSecondary,
                      border: `1px solid ${palette.borderMedium}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    ) : (
                      <span style={{ color: palette.primary, fontWeight: 700, fontSize: "15px", fontFamily: "var(--font-family)", whiteSpace: "nowrap" }}>
                        EZFacility
                      </span>
                    )}
                  </div>
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: "none" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 14px",
                          background: "transparent",
                          border: `1px solid ${palette.borderMedium}`,
                          borderRadius: "8px",
                          color: palette.textPrimary,
                          fontSize: "13px",
                          fontWeight: 600,
                          fontFamily: "var(--font-family)",
                          cursor: "pointer",
                        }}
                      >
                        <Upload size={14} />
                        Replace Logo
                      </button>
                      {logoUrl && (
                        <button
                          onClick={() => setLogoUrl(null)}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            color: palette.primary,
                            fontSize: "12px",
                            fontWeight: 600,
                            fontFamily: "var(--font-family)",
                            cursor: "pointer",
                          }}
                        >
                          Reset to default
                        </button>
                      )}
                    </div>
                    {logoUrl && (
                      <div style={{ fontSize: "11px", color: palette.textTertiary, marginTop: "6px" }}>
                        Custom logo — PNG or SVG works best
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Brand color */}
              <div>
                <label style={labelStyle}>Brand color</label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  {BRAND_SWATCHES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setBrandColor(c)}
                      aria-label={`Use ${c} as brand color`}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: c,
                        border: brandColor === c ? `2px solid ${palette.textPrimary}` : "2px solid transparent",
                        boxShadow: brandColor === c ? `0 0 0 2px ${palette.surfacePrimary}` : "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    />
                  ))}
                  <label
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      border: `1.5px dashed ${palette.borderMedium}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                    }}
                    title="Custom color"
                  >
                    <Plus size={13} style={{ color: palette.textTertiary }} />
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                    />
                  </label>
                </div>
              </div>

              {/* Welcome message */}
              <div>
                <label style={labelStyle}>Welcome message</label>
                <input
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Shown at the top of the portal home screen"
                  style={inputStyle}
                />
              </div>

              {/* Background style */}
              <div>
                <label style={labelStyle}>Background</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {([
                    { id: "light", label: "Light" },
                    { id: "dark", label: "Dark" },
                    { id: "brand", label: "Tinted" },
                  ] as { id: BackgroundStyle; label: string }[]).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setBackgroundStyle(opt.id)}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        background: backgroundStyle === opt.id ? `${palette.primary}1a` : "transparent",
                        border: `1.5px solid ${backgroundStyle === opt.id ? palette.primary : palette.borderMedium}`,
                        borderRadius: "8px",
                        color: backgroundStyle === opt.id ? palette.primary : palette.textSecondary,
                        fontSize: "12px",
                        fontWeight: 600,
                        fontFamily: "var(--font-family)",
                        cursor: "pointer",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* 3. What clients can do */}
          <Card icon={ListChecks} title="What Can Clients Do?" description="Turn on the actions you want available from the portal.">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {CAPABILITIES.map((cap) => (
                <ToggleRow
                  key={cap.id}
                  icon={cap.icon}
                  label={cap.label}
                  description={cap.description}
                  enabled={capabilities[cap.id]}
                  onChange={(v) => setCapabilities((prev) => ({ ...prev, [cap.id]: v }))}
                />
              ))}
            </div>
          </Card>

          {/* 4. Notifications */}
          <Card
            icon={Bell}
            title="Notifications"
            description="Get an email when clients take action in the portal."
            headerRight={<Toggle enabled={notificationsEnabled} onChange={setNotificationsEnabled} />}
          >
            <div style={{ opacity: notificationsEnabled ? 1 : 0.45, pointerEvents: notificationsEnabled ? "auto" : "none" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "8px", marginBottom: "18px" }}>
                {NOTIFY_EVENTS.map((ev) => (
                  <label
                    key={ev.id}
                    style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: palette.textSecondary, cursor: "pointer" }}
                  >
                    <Checkbox
                      checked={notifyEvents[ev.id]}
                      onChange={(v) => setNotifyEvents((prev) => ({ ...prev, [ev.id]: v }))}
                    />
                    {ev.label}
                  </label>
                ))}
              </div>

              <label style={labelStyle}>Also notify these emails</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                {notifyEmails.map((email) => (
                  <div
                    key={email}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 6px 5px 12px",
                      background: palette.surfaceSecondary,
                      border: `1px solid ${palette.borderMedium}`,
                      borderRadius: "999px",
                      fontSize: "12px",
                      color: palette.textPrimary,
                    }}
                  >
                    {email}
                    <button
                      onClick={() => removeEmail(email)}
                      aria-label={`Remove ${email}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: palette.hoverBg,
                        border: "none",
                        cursor: "pointer",
                        color: palette.textTertiary,
                      }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addEmail()}
                  placeholder="name@example.com"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={addEmail}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "0 16px",
                    background: palette.primary,
                    border: "none",
                    borderRadius: "8px",
                    color: palette.textReversed,
                    fontSize: "13px",
                    fontWeight: 600,
                    fontFamily: "var(--font-family)",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>
          </Card>

          {/* 5. Portal menu */}
          <Card icon={Settings2} title="Portal Menu" description="Choose what shows up in the client's navigation menu.">
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: "10px" }}>
              {MENU_OPTIONS.map((item) => {
                const enabled = menuItems[item.id];
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setMenuItems((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      padding: "14px 8px",
                      background: enabled ? `${palette.primary}14` : palette.surfaceSecondary,
                      border: `1.5px solid ${enabled ? palette.primary : palette.borderMedium}`,
                      borderRadius: "10px",
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    {enabled && (
                      <div
                        style={{
                          position: "absolute",
                          top: "6px",
                          right: "6px",
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          background: palette.primary,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Check size={10} color={palette.textReversed} strokeWidth={3} />
                      </div>
                    )}
                    <ItemIcon size={18} style={{ color: enabled ? palette.primary : palette.textTertiary }} />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: enabled ? palette.textPrimary : palette.textTertiary, textAlign: "center" }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* 6. Advanced (collapsed by default) */}
          <div
            style={{
              background: palette.surfacePrimary,
              border: `1px solid ${palette.borderMedium}`,
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setAdvancedOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "18px 22px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-family)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", fontWeight: 700, color: palette.textPrimary }}>
                <Settings2 size={16} style={{ color: palette.textTertiary }} />
                Advanced settings
                <span style={{ fontSize: "12px", fontWeight: 400, color: palette.textTertiary }}>
                  (payments, redirects, social links)
                </span>
              </span>
              <ChevronDown
                size={18}
                style={{ color: palette.textTertiary, transform: advancedOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
              />
            </button>

            {advancedOpen && (
              <div style={{ padding: "0 22px 22px", display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Card storage */}
                <div>
                  <label style={labelStyle}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <CreditCard size={13} /> Card storage
                    </span>
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {[
                      { id: "always", label: "Always keep a card on file" },
                      { id: "whenDue", label: "Only when there's a balance due" },
                      { id: "none", label: "Don't store card info" },
                    ].map((opt) => (
                      <label key={opt.id} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: palette.textSecondary, cursor: "pointer" }}>
                        <button
                          onClick={() => setCcStorage(opt.id as typeof ccStorage)}
                          style={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            border: `1.5px solid ${ccStorage === opt.id ? palette.primary : palette.outlineSecondary}`,
                            background: "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          {ccStorage === opt.id && (
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: palette.primary }} />
                          )}
                        </button>
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Default calendar view */}
                <div>
                  <label style={labelStyle}>Default calendar view</label>
                  <select
                    value={calendarView}
                    onChange={(e) => setCalendarView(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer", maxWidth: "220px" }}
                  >
                    <option>Month View</option>
                    <option>Week View</option>
                    <option>Day View</option>
                  </select>
                </div>

                {/* Redirect URLs */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={labelStyle}>After public sign-up, send clients to</label>
                    <input
                      value={redirectPublic}
                      onChange={(e) => setRedirectPublic(e.target.value)}
                      placeholder="https://yourwebsite.com/"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>After invited sign-up, send clients to</label>
                    <input
                      value={redirectInvite}
                      onChange={(e) => setRedirectInvite(e.target.value)}
                      placeholder="https://yourwebsite.com/"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Social links */}
                <div>
                  <label style={labelStyle}>Social links shown in the portal footer</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {[
                      { key: "facebook" as const, icon: Facebook, placeholder: "Facebook URL" },
                      { key: "twitter" as const, icon: Twitter, placeholder: "Twitter / X URL" },
                      { key: "instagram" as const, icon: Instagram, placeholder: "Instagram URL" },
                      { key: "youtube" as const, icon: Youtube, placeholder: "YouTube URL" },
                    ].map(({ key, icon: SocialIcon, placeholder }) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <SocialIcon size={16} style={{ color: palette.textTertiary, flexShrink: 0 }} />
                        <input
                          value={social[key]}
                          onChange={(e) => setSocial((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder={placeholder}
                          style={inputStyle}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: live preview ═══ */}
        <div
          style={{
            position: isMobile ? "static" : "sticky",
            top: "20px",
            width: isMobile ? "100%" : previewMinimized ? MINIMIZED_RAIL_WIDTH : "50%",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Minimize / maximize toggle — same treatment as the Schedule page's right rail */}
          {!isMobile && (
            <button
              onClick={() => setPreviewMinimized((v) => !v)}
              aria-label={previewMinimized ? "Maximize live preview" : "Minimize live preview"}
              title={previewMinimized ? "Maximize preview" : "Minimize preview"}
              style={{
                position: previewMinimized ? "static" : "absolute",
                top: 0,
                right: 0,
                height: "32px",
                width: MINIMIZED_RAIL_WIDTH,
                border: `1px solid ${palette.borderMedium}`,
                borderRadius: "6px",
                background: palette.surfaceSecondary,
                color: palette.textTertiary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 5,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = palette.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = palette.textTertiary; }}
            >
              {previewMinimized ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
            </button>
          )}

          {previewMinimized ? (
            /* ── Minimized mini-rail ── */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                paddingTop: "6px",
              }}
            >
              <span
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: palette.textTertiary,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginTop: "8px",
                }}
              >
                Live Preview
              </span>
            </div>
          ) : (
            <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: "60px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: palette.textTertiary, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Live preview
            </span>
            <div style={{ display: "flex", gap: "4px", background: palette.surfaceSecondary, borderRadius: "8px", padding: "3px" }}>
              <button
                onClick={() => setPreviewDevice("desktop")}
                aria-label="Preview desktop"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "24px",
                  background: previewDevice === "desktop" ? palette.surfacePrimary : "transparent",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: previewDevice === "desktop" ? palette.primary : palette.textTertiary,
                }}
              >
                <Monitor size={14} />
              </button>
              <button
                onClick={() => setPreviewDevice("mobile")}
                aria-label="Preview mobile"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "24px",
                  background: previewDevice === "mobile" ? palette.surfacePrimary : "transparent",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: previewDevice === "mobile" ? palette.primary : palette.textTertiary,
                }}
              >
                <Smartphone size={14} />
              </button>
            </div>
          </div>

          {/* Device frame */}
          <div
            style={{
              width: previewDevice === "mobile" ? "260px" : "100%",
              margin: previewDevice === "mobile" ? "0 auto" : 0,
              background: "#11171a",
              borderRadius: previewDevice === "mobile" ? "24px" : "14px",
              padding: previewDevice === "mobile" ? "14px 8px" : "8px",
              boxShadow: `0 12px 32px ${palette.shadow}`,
            }}
          >
            {!portalEnabled ? (
              <div
                style={{
                  background: previewBg,
                  borderRadius: previewDevice === "mobile" ? "16px" : "8px",
                  minHeight: "360px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "24px",
                  textAlign: "center",
                }}
              >
                <Globe size={28} style={{ color: previewSubText }} />
                <div style={{ fontSize: "13px", fontWeight: 600, color: previewText }}>Portal is turned off</div>
                <div style={{ fontSize: "12px", color: previewSubText }}>
                  Turn it on above to preview what clients will see.
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: previewBg,
                  borderRadius: previewDevice === "mobile" ? "16px" : "8px",
                  overflow: "hidden",
                }}
              >
                {/* Preview header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "14px 16px",
                    background: brandColor,
                  }}
                >
                  {logoUrl ? (
                    <div
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "6px",
                        background: "rgba(255,255,255,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ) : (
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", fontFamily: "var(--font-family)", flexShrink: 0 }}>
                      EZFacility
                    </span>
                  )}
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{portalUrl}</div>
                </div>

                {/* Preview body */}
                <div style={{ padding: "16px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: previewText, marginBottom: "4px" }}>
                    Hi, Alex 👋
                  </div>
                  <div style={{ fontSize: "12px", color: previewSubText, marginBottom: "16px", lineHeight: 1.5 }}>
                    {welcomeMessage || "Welcome back!"}
                  </div>

                  {/* Mock nav pills reflecting Portal Menu selections */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
                    {MENU_OPTIONS.filter((m) => menuItems[m.id]).map((m) => (
                      <div
                        key={m.id}
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          padding: "5px 9px",
                          borderRadius: "999px",
                          background: previewCard,
                          color: previewText,
                          border: `1px solid ${backgroundStyle === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`,
                        }}
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>

                  {/* Mock content card */}
                  <div
                    style={{
                      background: previewCard,
                      borderRadius: "10px",
                      padding: "14px",
                      marginBottom: "10px",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, color: previewText, marginBottom: "8px" }}>
                      Upcoming Session
                    </div>
                    <div style={{ fontSize: "11px", color: previewSubText, marginBottom: "10px" }}>
                      Tomorrow · 9:00 AM with Coach Sam
                    </div>
                    {capabilities.bookSessions && (
                      <div
                        style={{
                          display: "inline-block",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#ffffff",
                          background: brandColor,
                          padding: "7px 14px",
                          borderRadius: "6px",
                        }}
                      >
                        Book Another Session
                      </div>
                    )}
                  </div>

                  {capabilities.buyPackages && (
                    <div
                      style={{
                        background: previewCard,
                        borderRadius: "10px",
                        padding: "14px",
                      }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: 700, color: previewText, marginBottom: "4px" }}>
                        Packages & Memberships
                      </div>
                      <div style={{ fontSize: "11px", color: previewSubText }}>
                        3 plans available to purchase
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <p style={{ fontSize: "11px", color: palette.textTertiary, textAlign: "center", margin: 0 }}>
            This is a simplified preview — actual layout may vary slightly.
          </p>
            </>
          )}
        </div>
      </div>

      {/* ── Sticky save bar ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "12px",
          padding: "14px 24px",
          background: palette.surfacePrimary,
          borderTop: `1px solid ${palette.borderMedium}`,
          boxShadow: `0 -4px 16px ${palette.shadow}`,
          zIndex: 50,
        }}
      >
        {justSaved && (
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: palette.textSuccess, marginRight: "auto" }}>
            <Check size={14} /> Saved
          </span>
        )}
        <button
          style={{
            padding: "10px 20px",
            background: "transparent",
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "8px",
            color: palette.textSecondary,
            fontSize: "13px",
            fontWeight: 600,
            fontFamily: "var(--font-family)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: "10px 24px",
            background: palette.primary,
            border: "none",
            borderRadius: "8px",
            color: palette.textReversed,
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: "var(--font-family)",
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
