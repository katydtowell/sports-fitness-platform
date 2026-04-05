/**
 * AdminPage — comprehensive admin dashboard for account settings, modules,
 * administrative pages, alerts, activity, and account information.
 *
 * Features:
 *  • Module toggles for enabling/disabling features
 *  • Paid upgrade modules with expandable Learn More sections
 *  • Navigation to admin subpages (Billing, Settings, etc.)
 *  • System alerts with severity indicators
 *  • Recent activity timeline
 *  • Account information display
 *
 * Uses two-column grid layout on desktop, single-column on mobile.
 */

import { useState, type CSSProperties } from "react";
import {
  Shield,
  ClipboardCheck,
  KeyRound,
  Calendar,
  UsersRound,
  Mail,
  Wrench,
  ShoppingCart,
  BarChart2,
  Clock,
  FileText,
  CreditCard,
  UserCog,
  MapPin,
  BadgeCheck,
  Package,
  Server,
  Globe,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  AlertOctagon,
  Copy,
  X,
  Check as CheckIcon,
  Zap,
  Send,
  MessageSquare,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "../layout/ThemeContext";
import { PageMenu } from "../client-profile/PageMenu";
import { ADMIN_SUBPAGE_ITEMS } from "../layout/navItems";
import { useIsMobile } from "../ui/use-mobile";

/** Contextual pages shown in the Admin PageMenu dropdown. */
const ADMIN_CONTEXTUAL_PAGES = ADMIN_SUBPAGE_ITEMS.map((item) => ({
  id: item.id,
  label: item.label,
}));

interface AdminPageProps {
  onNavigateToSubpage?: (subpageId: string) => void;
}

interface Module {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  isPro?: boolean;
  monthlyFee?: number;
  features?: string[];
  learnMoreUrl?: string;
}

interface AdminSubpage {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface AdminSection {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  links: { id: string; label: string }[];
}

interface AlertItem {
  severity: "warning" | "success" | "info" | "error";
  title: string;
  description: string;
  time: string;
}

interface ActivityItem {
  user: string;
  action: string;
  time: string;
  color: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATIC DATA
   ═══════════════════════════════════════════════════════════════════════ */

/** Base monthly subscription price */
const BASE_MONTHLY_PRICE = 149;

/** Per-module add-on fee for Pro modules */
const PRO_MODULE_FEE = 29;

const ALL_MODULES: Module[] = [
  /* ── Pro modules (paid upgrades) ── */
  {
    id: "advanced-documents",
    label: "Advanced Documents",
    icon: FileText,
    description:
      "Draft agreements and waivers with ease. Add interactive fields and advanced functionality for your customers.",
    isPro: true,
    monthlyFee: PRO_MODULE_FEE,
    features: [
      "E-signature capture and tracking",
      "Customizable document templates",
      "Automated compliance tracking",
      "Interactive form fields",
      "Bulk document generation",
    ],
    learnMoreUrl: "#",
  },
  {
    id: "advanced-email-campaigns",
    label: "Advanced Email Campaigns",
    icon: Mail,
    description:
      "Create eye-catching newsletters easily and quickly with the help of AI assistance and a diverse template library.",
    isPro: true,
    monthlyFee: PRO_MODULE_FEE,
    features: [
      "AI-powered content suggestions",
      "Drag-and-drop template builder",
      "Advanced audience segmentation",
      "A/B testing and analytics",
      "Automated drip campaigns",
    ],
    learnMoreUrl: "#",
  },
  {
    id: "advanced-accounting",
    label: "Advanced Accounting",
    icon: BarChart2,
    description:
      "Streamline your financial operations with comprehensive reporting, automated invoicing, and real-time insights.",
    isPro: true,
    monthlyFee: PRO_MODULE_FEE,
    features: [
      "Automated invoicing and billing",
      "Real-time financial dashboards",
      "Tax report generation",
      "Multi-location revenue tracking",
      "QuickBooks and Xero integration",
    ],
    learnMoreUrl: "#",
  },
  /* ── Standard modules (included) ── */
  {
    id: "client-portal",
    label: "Client Portal",
    icon: Globe,
    description:
      "Give your clients secure access to view their information, schedules, and documents in one convenient location.",
  },
  {
    id: "automated-reminders",
    label: "Automated Reminders",
    icon: Clock,
    description:
      "Send automatic email and SMS reminders to clients about upcoming appointments, payments, and deadlines.",
  },
  {
    id: "staff-management",
    label: "Staff Management",
    icon: UsersRound,
    description:
      "Manage team schedules, assign permissions, track performance, and coordinate workflows across your organization.",
  },
  {
    id: "check-in",
    label: "Check-In",
    icon: ClipboardCheck,
    description:
      "Fast member check-in with barcode scanning, photo verification, and real-time attendance tracking.",
  },
  {
    id: "rentals",
    label: "Rentals",
    icon: KeyRound,
    description:
      "Manage facility and equipment rentals with availability calendars, pricing rules, and automated confirmations.",
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: Calendar,
    description:
      "Create and manage class schedules, instructor assignments, and room bookings with drag-and-drop ease.",
  },
  {
    id: "groups",
    label: "Groups",
    icon: UsersRound,
    description:
      "Organize members into groups for classes, leagues, or programs with roster management and communication tools.",
  },
  {
    id: "equipment",
    label: "Equipment",
    icon: Wrench,
    description:
      "Track equipment inventory, schedule maintenance, and manage equipment assignments across locations.",
  },
  {
    id: "pos",
    label: "Point of Sale",
    icon: ShoppingCart,
    description:
      "Process transactions, manage product inventory, and handle returns with an integrated POS system.",
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart2,
    description:
      "Generate detailed reports on attendance, revenue, membership trends, and operational performance.",
  },
];

const ADMIN_SUBPAGES: AdminSubpage[] = [
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "client-settings", label: "Client Settings", icon: UserCog },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "location-settings", label: "Location Settings", icon: MapPin },
  { id: "memberships", label: "Memberships", icon: BadgeCheck },
  { id: "packages", label: "Packages", icon: Package },
  { id: "rentals", label: "Rentals", icon: KeyRound },
  { id: "resources", label: "Resources", icon: Server },
  { id: "pos-settings", label: "POS Settings", icon: ShoppingCart },
  { id: "self-service", label: "Self Service", icon: Globe },
  { id: "timeclock", label: "Time Clock", icon: Clock },
];

const ADMIN_SECTIONS: AdminSection[] = [
  {
    id: "billing",
    title: "Billing",
    icon: CreditCard,
    description: "Manage invoices, payments, and billing settings",
    links: [
      { id: "billing", label: "Invoices" },
      { id: "billing", label: "Payment Methods" },
      { id: "billing", label: "Billing History" },
    ],
  },
  {
    id: "client-settings",
    title: "Client Settings",
    icon: UserCog,
    description: "Configure client registration and profile options",
    links: [
      { id: "client-settings", label: "Registration Forms" },
      { id: "client-settings", label: "Profile Fields" },
      { id: "client-settings", label: "Waivers" },
    ],
  },
  {
    id: "documents",
    title: "Documents",
    icon: FileText,
    description: "Manage templates, contracts, and document storage",
    links: [
      { id: "documents", label: "Templates" },
      { id: "documents", label: "Contracts" },
      { id: "documents", label: "Storage" },
    ],
  },
  {
    id: "location-settings",
    title: "Location Settings",
    icon: MapPin,
    description: "Configure hours, amenities, and location details",
    links: [
      { id: "location-settings", label: "Hours & Closures" },
      { id: "location-settings", label: "Amenities" },
      { id: "location-settings", label: "General Info" },
    ],
  },
  {
    id: "memberships",
    title: "Memberships",
    icon: BadgeCheck,
    description: "Create and manage membership plans and pricing",
    links: [
      { id: "memberships", label: "Plans" },
      { id: "memberships", label: "Pricing Rules" },
      { id: "memberships", label: "Promotions" },
    ],
  },
  {
    id: "packages",
    title: "Packages",
    icon: Package,
    description: "Bundle services into packages for your clients",
    links: [
      { id: "packages", label: "Package Builder" },
      { id: "packages", label: "Active Packages" },
    ],
  },
  {
    id: "resources",
    title: "Resources",
    icon: Server,
    description: "Manage rooms, courts, and bookable resources",
    links: [
      { id: "resources", label: "Facilities" },
      { id: "resources", label: "Availability" },
    ],
  },
  {
    id: "pos-settings",
    title: "POS Settings",
    icon: ShoppingCart,
    description: "Configure point-of-sale terminals and products",
    links: [
      { id: "pos-settings", label: "Products" },
      { id: "pos-settings", label: "Tax Rates" },
      { id: "pos-settings", label: "Registers" },
    ],
  },
  {
    id: "rentals",
    title: "Rentals",
    icon: KeyRound,
    description: "Set up rental rates, types, and associated documents",
    links: [
      { id: "rentals", label: "Rental Rates" },
      { id: "rentals", label: "Rental Types" },
      { id: "rentals", label: "Documents" },
    ],
  },
  {
    id: "self-service",
    title: "Self Service",
    icon: Globe,
    description: "Configure kiosks, online booking, and mobile app settings",
    links: [
      { id: "self-service", label: "Kiosk Settings" },
      { id: "self-service", label: "Online Booking" },
      { id: "self-service", label: "Client Portal" },
      { id: "self-service", label: "Mobile App" },
    ],
  },
  {
    id: "timeclock",
    title: "Time Clock",
    icon: Clock,
    description: "Manage staff schedules, time entries, and payroll reporting",
    links: [
      { id: "timeclock", label: "Staff Schedule" },
      { id: "timeclock", label: "Time Entries" },
      { id: "timeclock", label: "Payroll Reports" },
      { id: "timeclock", label: "Clock Settings" },
    ],
  },
];

const ALERTS: AlertItem[] = [
  {
    severity: "warning",
    title: "SSL Certificate Expiring",
    description:
      "Your SSL certificate expires in 14 days. Renew to avoid service disruption.",
    time: "2 hours ago",
  },
  {
    severity: "success",
    title: "System Backup Complete",
    description: "Daily backup completed successfully. All data secured.",
    time: "4 hours ago",
  },
  {
    severity: "info",
    title: "Scheduled Maintenance",
    description:
      "System maintenance planned for Sunday 2:00 AM - 4:00 AM EST.",
    time: "1 day ago",
  },
  {
    severity: "error",
    title: "Payment Gateway Issue",
    description:
      "Intermittent connectivity with payment processor detected. Monitoring.",
    time: "1 day ago",
  },
];

const ACTIVITY: ActivityItem[] = [
  {
    user: "Joe Smith",
    action: "updated billing settings",
    time: "10 min ago",
    color: "primary",
  },
  {
    user: "Sarah Connor",
    action: "added a new membership package",
    time: "25 min ago",
    color: "info",
  },
  {
    user: "Mike Johnson",
    action: "disabled the EZLeagues module",
    time: "1 hour ago",
    color: "warning",
  },
  {
    user: "Joe Smith",
    action: "renewed SSL certificate",
    time: "3 hours ago",
    color: "success",
  },
  {
    user: "System",
    action: "completed automated backup",
    time: "4 hours ago",
    color: "tertiary",
  },
];

const ACCOUNT_INFO = [
  { label: "Account ID", value: "EZF-2024-78432" },
  { label: "Plan", value: "Professional" },
  { label: "Account Owner", value: "Joe Smith" },
  { label: "Organization", value: "Smith Fitness LLC" },
  { label: "Account Created", value: "June 1, 2024" },
  { label: "Support PIN", value: "8374" },
  { label: "API Key", value: "ezf_live_••••••••k4Qm", hasCopy: true },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

interface CardProps {
  title: string;
  children: React.ReactNode;
  style?: CSSProperties;
}

function Card({ title, children, style }: CardProps) {
  const { palette } = useTheme();

  return (
    <div
      style={{
        background: palette.surfacePrimary,
        border: `1px solid ${palette.borderMedium}`,
        borderRadius: "10px",
        padding: "20px",
        ...style,
      }}
    >
      <h2
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: palette.textPrimary,
          margin: "0 0 16px 0",
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  const { palette } = useTheme();

  return (
    <div
      onClick={() => onChange(!enabled)}
      style={{
        width: "44px",
        height: "24px",
        borderRadius: "12px",
        background: enabled ? palette.primary : palette.outlineSecondary,
        cursor: "pointer",
        position: "relative",
        display: "flex",
        alignItems: "center",
        transition: "background 0.2s ease",
      }}
    >
      <div
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "10px",
          background: "white",
          position: "absolute",
          left: enabled ? "22px" : "2px",
          transition: "left 0.2s ease",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

export function AdminPage({ onNavigateToSubpage }: AdminPageProps) {
  const { palette } = useTheme();
  const isMobile = useIsMobile();

  // Module toggle states — Pro modules default to off, standard modules default to on
  const [moduleStates, setModuleStates] = useState<Record<string, boolean>>(
    ALL_MODULES.reduce(
      (acc, m) => ({ ...acc, [m.id]: m.isPro ? false : true }),
      {},
    ),
  );

  // Whether all modules are shown or just the initial set
  const [showAllModules, setShowAllModules] = useState(false);

  // Which Pro module's upgrade modal is currently showing (null = none)
  const [upgradeModalModule, setUpgradeModalModule] = useState<Module | null>(
    null,
  );

  // Modal view: "pricing" = default overview, "contact" = email form
  const [modalView, setModalView] = useState<"pricing" | "contact">("pricing");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);

  const handleModuleToggle = (module: Module) => {
    if (module.isPro && !moduleStates[module.id]) {
      // Turning ON a Pro module → show the upgrade modal
      setUpgradeModalModule(module);
    } else {
      // Standard module toggle, or turning OFF a Pro module
      setModuleStates((prev) => ({ ...prev, [module.id]: !prev[module.id] }));
    }
  };

  const confirmProUpgrade = () => {
    if (upgradeModalModule) {
      setModuleStates((prev) => ({
        ...prev,
        [upgradeModalModule.id]: true,
      }));
      setUpgradeModalModule(null);
      setModalView("pricing");
      setContactMessage("");
      setContactSent(false);
    }
  };

  const cancelProUpgrade = () => {
    setUpgradeModalModule(null);
    setModalView("pricing");
    setContactMessage("");
    setContactSent(false);
  };

  const handleSubpageNavigate = (subpageId: string) => {
    onNavigateToSubpage?.(subpageId);
  };

  const getAlertIcon = (severity: AlertItem["severity"]) => {
    switch (severity) {
      case "warning":
        return AlertTriangle;
      case "success":
        return CheckCircle;
      case "info":
        return AlertCircle;
      case "error":
        return AlertOctagon;
    }
  };

  const getAlertColor = (severity: AlertItem["severity"]) => {
    switch (severity) {
      case "warning":
        return palette.containerWarning;
      case "success":
        return palette.textSuccess;
      case "info":
        return palette.containerInfo;
      case "error":
        return palette.textError;
    }
  };

  const getActivityColor = (colorType: string) => {
    switch (colorType) {
      case "primary":
        return palette.primary;
      case "info":
        return palette.containerInfo;
      case "warning":
        return palette.containerWarning;
      case "success":
        return palette.textSuccess;
      case "tertiary":
        return palette.textTertiary;
      default:
        return palette.primary;
    }
  };

  return (
    <div style={{ fontFamily: "var(--font-family)", padding: "20px 0" }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <Shield size={22} style={{ color: palette.primary }} />
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: palette.textPrimary,
            margin: 0,
          }}
        >
          Admin
        </h1>
        <PageMenu
          contextualPages={ADMIN_CONTEXTUAL_PAGES}
          onNavigateToPage={(pageId) => {
            // Admin subpage IDs are "admin/billing", "admin/client-settings", etc.
            const slug = pageId.replace(/^admin\//, "");
            onNavigateToSubpage?.(slug);
          }}
        />
      </div>

      {/* Main content grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: "16px",
        }}
      >
        {/* 1. MODULES — unified block with Pro badges (full width) */}
        <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
          <Card title="Modules">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, 1fr)",
                gap: "16px",
              }}
            >
              {(showAllModules
                ? ALL_MODULES
                : ALL_MODULES.slice(0, isMobile ? 3 : 6)
              ).map((module) => {
                const IconComponent = module.icon;
                const isEnabled = moduleStates[module.id] ?? false;

                return (
                  <div
                    key={module.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: "20px",
                      background: palette.surfaceSecondary,
                      border: `1px solid ${palette.borderMedium}`,
                      borderRadius: "10px",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                      opacity: module.isPro && !isEnabled ? 0.85 : 1,
                    }}
                  >
                    {/* Card header: title + toggle */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "15px",
                            fontWeight: 700,
                            color: palette.textPrimary,
                          }}
                        >
                          {module.label}
                        </span>
                        <Toggle
                          enabled={isEnabled}
                          onChange={() => handleModuleToggle(module)}
                        />
                      </div>

                      {/* Pro badge */}
                      {module.isPro && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "12px",
                            letterSpacing: "0.5px",
                            marginBottom: "12px",
                            textTransform: "uppercase",
                          }}
                        >
                          <Zap size={10} />
                          Pro
                        </div>
                      )}

                      {/* Description */}
                      <p
                        style={{
                          fontSize: "13px",
                          color: palette.textTertiary,
                          margin: "0",
                          lineHeight: 1.5,
                        }}
                      >
                        {module.description}
                      </p>
                    </div>

                    {/* Learn More link (Pro modules only) */}
                    {module.isPro && (
                      <a
                        href={module.learnMoreUrl || "#"}
                        onClick={(e) => {
                          e.preventDefault();
                          setUpgradeModalModule(module);
                        }}
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: palette.primary,
                          textDecoration: "none",
                          marginTop: "12px",
                          display: "inline-block",
                          cursor: "pointer",
                        }}
                      >
                        Learn More
                      </a>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Show More / Show Less toggle */}
            {ALL_MODULES.length > (isMobile ? 3 : 6) && (
              <button
                onClick={() => setShowAllModules((prev) => !prev)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  width: "100%",
                  marginTop: "16px",
                  padding: "10px 0",
                  background: "transparent",
                  border: `1px dashed ${palette.borderMedium}`,
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  fontFamily: "var(--font-family)",
                  color: palette.primary,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = palette.hoverBg;
                  e.currentTarget.style.borderColor = palette.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = palette.borderMedium;
                }}
              >
                {showAllModules ? (
                  <>
                    Show Less <ChevronUp size={16} />
                  </>
                ) : (
                  <>
                    Show All Modules ({ALL_MODULES.length - (isMobile ? 3 : 6)}{" "}
                    more) <ChevronDown size={16} />
                  </>
                )}
              </button>
            )}
          </Card>
        </div>

        {/* ─── ADMIN SECTIONS + SIDEBAR: 3-column layout ─── */}
        <div
          style={{
            gridColumn: isMobile ? "1" : "1 / -1",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr",
            gap: "16px",
          }}
        >
          {/* LEFT AREA — admin section blocks in a 2-col sub-grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "16px",
              alignContent: "start",
            }}
          >
            {ADMIN_SECTIONS.map((section) => {
              const SectionIcon = section.icon;
              return (
                <div
                  key={section.id}
                  style={{
                    background: palette.surfacePrimary,
                    border: `1px solid ${palette.borderMedium}`,
                    borderRadius: "10px",
                    padding: "20px",
                  }}
                >
                  {/* Section header with icon */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "8px",
                    }}
                  >
                    <SectionIcon
                      size={18}
                      style={{ color: palette.primary }}
                    />
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: 700,
                        color: palette.textPrimary,
                        margin: 0,
                      }}
                    >
                      {section.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: "13px",
                      color: palette.textTertiary,
                      margin: "0 0 14px 0",
                      lineHeight: 1.4,
                    }}
                  >
                    {section.description}
                  </p>

                  {/* Subpage links */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {section.links.map((link, linkIdx) => (
                      <button
                        key={linkIdx}
                        onClick={() => handleSubpageNavigate(link.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "0",
                          fontSize: "13px",
                          fontWeight: 600,
                          fontFamily: "var(--font-family)",
                          color: palette.primary,
                          cursor: "pointer",
                          textAlign: "left",
                          textDecoration: "none",
                          transition: "opacity 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "0.75";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT COLUMN — Alerts, Recent Activity, Account Info stacked */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              alignSelf: "start",
            }}
          >
            {/* ALERTS CENTER */}
            <Card title="Alerts Center">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {ALERTS.map((alert, idx) => {
                  const AlertIcon = getAlertIcon(alert.severity);
                  const color = getAlertColor(alert.severity);

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: "12px",
                        padding: "12px",
                        background: palette.surfaceSecondary,
                        borderRadius: "6px",
                        borderLeft: `4px solid ${color}`,
                      }}
                    >
                      <AlertIcon
                        size={16}
                        style={{ color, marginTop: "2px", flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: palette.textPrimary,
                            marginBottom: "4px",
                          }}
                        >
                          {alert.title}
                        </div>
                        <p
                          style={{
                            fontSize: "12px",
                            color: palette.textTertiary,
                            margin: "0 0 6px 0",
                            lineHeight: 1.4,
                          }}
                        >
                          {alert.description}
                        </p>
                        <span
                          style={{
                            fontSize: "11px",
                            color: palette.textDisabled,
                          }}
                        >
                          {alert.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* RECENT ACTIVITY */}
            <Card title="Recent Activity">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {ACTIVITY.map((item, idx) => {
                  const resolvedColor = getActivityColor(item.color);

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: resolvedColor,
                          marginTop: "6px",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: "4px" }}>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: palette.textPrimary,
                            }}
                          >
                            {item.user}
                          </span>
                          <span
                            style={{
                              fontSize: "13px",
                              color: palette.textSecondary,
                              marginLeft: "4px",
                            }}
                          >
                            {item.action}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            color: palette.textDisabled,
                          }}
                        >
                          {item.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* ACCOUNT INFORMATION */}
            <Card title="Account Information">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {ACCOUNT_INFO.map((item, idx) => (
              <div key={idx}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: palette.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "6px",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      color: palette.textPrimary,
                      fontFamily: "monospace",
                    }}
                  >
                    {item.value}
                  </span>
                  {item.hasCopy && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(item.value);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: "4px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Copy to clipboard"
                    >
                      <Copy size={14} style={{ color: palette.iconSecondary }} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
            </Card>
          </div>
          {/* end right column */}
        </div>
        {/* end admin sections + sidebar grid */}
      </div>
      {/* end main content grid */}

      {/* ═══════════════════════════════════════════════════════════════════
         PRO UPGRADE MODAL
         ═══════════════════════════════════════════════════════════════════ */}
      {upgradeModalModule && (
        <>
          {/* Backdrop */}
          <div
            onClick={cancelProUpgrade}
            style={{
              position: "fixed",
              inset: 0,
              background: palette.backdrop,
              zIndex: 1000,
              animation: "fadeIn 0.2s ease-out",
            }}
          />

          {/* Modal */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(520px, 90vw)",
              maxHeight: "85vh",
              overflowY: "auto",
              background: palette.surfacePrimary,
              border: `1px solid ${palette.borderMedium}`,
              borderRadius: "16px",
              boxShadow: `0 24px 48px ${palette.shadow}`,
              zIndex: 1001,
              animation: "modalSlideIn 0.25s ease-out",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "24px 28px 0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {(() => {
                    const Ic = upgradeModalModule.icon;
                    return <Ic size={20} color="#ffffff" />;
                  })()}
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: palette.textPrimary,
                      margin: 0,
                    }}
                  >
                    {upgradeModalModule.label}
                  </h2>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                      color: "#ffffff",
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "10px",
                      letterSpacing: "0.5px",
                      marginTop: "4px",
                      textTransform: "uppercase",
                    }}
                  >
                    <Zap size={9} />
                    Pro Module
                  </div>
                </div>
              </div>
              <button
                onClick={cancelProUpgrade}
                style={{
                  background: palette.surfaceSecondary,
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: palette.textTertiary,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = palette.hoverBg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = palette.surfaceSecondary;
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* ── MODAL BODY: switches between pricing and contact views ── */}
            {modalView === "pricing" ? (
              <>
                {/* Feature overview */}
                <div style={{ padding: "20px 28px" }}>
                  <p
                    style={{
                      fontSize: "14px",
                      color: palette.textTertiary,
                      lineHeight: 1.6,
                      margin: "0 0 20px 0",
                    }}
                  >
                    {upgradeModalModule.description}
                  </p>

                  <h3
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: palette.textPrimary,
                      margin: "0 0 12px 0",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    What's Included
                  </h3>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      marginBottom: "24px",
                    }}
                  >
                    {(upgradeModalModule.features || []).map((feature, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            background: "rgba(124, 58, 237, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <CheckIcon size={12} color="#a855f7" />
                        </div>
                        <span
                          style={{
                            fontSize: "13px",
                            color: palette.textSecondary,
                          }}
                        >
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing breakdown */}
                  <div
                    style={{
                      background: palette.surfaceSecondary,
                      borderRadius: "12px",
                      padding: "20px",
                      border: `1px solid ${palette.borderMedium}`,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: palette.textPrimary,
                        margin: "0 0 16px 0",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Pricing Breakdown
                    </h3>

                    {/* Current plan */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: "12px",
                        borderBottom: `1px solid ${palette.borderMedium}`,
                        marginBottom: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          color: palette.textTertiary,
                        }}
                      >
                        Current monthly plan
                      </span>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: palette.textPrimary,
                        }}
                      >
                        ${BASE_MONTHLY_PRICE.toFixed(2)}/mo
                      </span>
                    </div>

                    {/* Add-on fee */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: "12px",
                        borderBottom: `1px solid ${palette.borderMedium}`,
                        marginBottom: "12px",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: "14px",
                            color: palette.textTertiary,
                          }}
                        >
                          {upgradeModalModule.label}
                        </span>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                            color: "#ffffff",
                            fontSize: "9px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "8px",
                            letterSpacing: "0.3px",
                            marginLeft: "8px",
                            textTransform: "uppercase",
                            verticalAlign: "middle",
                          }}
                        >
                          <Zap size={8} />
                          Pro
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#a855f7",
                        }}
                      >
                        +${(upgradeModalModule.monthlyFee || PRO_MODULE_FEE).toFixed(
                          2,
                        )}
                        /mo
                      </span>
                    </div>

                    {/* New total */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: 700,
                          color: palette.textPrimary,
                        }}
                      >
                        New monthly total
                      </span>
                      <span
                        style={{
                          fontSize: "18px",
                          fontWeight: 800,
                          color: palette.textPrimary,
                        }}
                      >
                        ${(
                          BASE_MONTHLY_PRICE +
                          (upgradeModalModule.monthlyFee || PRO_MODULE_FEE)
                        ).toFixed(2)}
                        /mo
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing view footer */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "0 28px 24px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => {
                      setModalView("contact");
                      setContactSent(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "transparent",
                      border: `1px solid ${palette.borderMedium}`,
                      borderRadius: "8px",
                      padding: "10px 20px",
                      fontSize: "13px",
                      fontWeight: 600,
                      fontFamily: "var(--font-family)",
                      color: palette.textTertiary,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = palette.hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <MessageSquare size={14} />
                    Not Sure? Contact Your Account Manager
                  </button>
                  <button
                    onClick={confirmProUpgrade}
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 24px",
                      fontSize: "14px",
                      fontWeight: 600,
                      fontFamily: "var(--font-family)",
                      color: "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 6px 20px rgba(124,58,237,0.45)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(124,58,237,0.3)";
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Zap size={15} />
                      Activate {upgradeModalModule.label}
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* ── Contact Account Manager view ── */}
                <div style={{ padding: "20px 28px" }}>
                  {contactSent ? (
                    /* Success confirmation */
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        padding: "32px 0",
                        gap: "16px",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          background: "rgba(0,194,138,0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CheckIcon size={24} color={palette.primary} />
                      </div>
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: 700,
                          color: palette.textPrimary,
                          margin: 0,
                        }}
                      >
                        Message Sent
                      </h3>
                      <p
                        style={{
                          fontSize: "14px",
                          color: palette.textTertiary,
                          margin: 0,
                          lineHeight: 1.5,
                          maxWidth: "320px",
                        }}
                      >
                        Your account manager will get back to you shortly. We
                        typically respond within one business day.
                      </p>
                    </div>
                  ) : (
                    /* Email form */
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "20px",
                        }}
                      >
                        <MessageSquare
                          size={18}
                          style={{ color: palette.primary }}
                        />
                        <h3
                          style={{
                            fontSize: "15px",
                            fontWeight: 700,
                            color: palette.textPrimary,
                            margin: 0,
                          }}
                        >
                          Contact Your Account Manager
                        </h3>
                      </div>

                      {/* Subject (read-only prefilled) */}
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: palette.textTertiary,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: "6px",
                        }}
                      >
                        Subject
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={`I have questions about ${upgradeModalModule.label}`}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          fontSize: "14px",
                          fontFamily: "var(--font-family)",
                          color: palette.textDisabled,
                          background: palette.surfaceSecondary,
                          border: `1px solid ${palette.borderMedium}`,
                          borderRadius: "8px",
                          marginBottom: "16px",
                          boxSizing: "border-box",
                          outline: "none",
                          cursor: "default",
                        }}
                      />

                      {/* Message */}
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: palette.textTertiary,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: "6px",
                        }}
                      >
                        Message
                      </label>
                      <textarea
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Type your message here..."
                        rows={5}
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          fontSize: "14px",
                          fontFamily: "var(--font-family)",
                          color: palette.textPrimary,
                          background: palette.surfaceSecondary,
                          border: `1px solid ${palette.borderMedium}`,
                          borderRadius: "8px",
                          resize: "vertical",
                          boxSizing: "border-box",
                          outline: "none",
                          lineHeight: 1.5,
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor =
                            palette.outlineAction;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor =
                            palette.borderMedium;
                        }}
                      />
                    </>
                  )}
                </div>

                {/* Contact view footer */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "0 28px 24px",
                    justifyContent: "flex-end",
                  }}
                >
                  {contactSent ? (
                    <button
                      onClick={cancelProUpgrade}
                      style={{
                        background: palette.primary,
                        border: "none",
                        borderRadius: "8px",
                        padding: "10px 24px",
                        fontSize: "14px",
                        fontWeight: 600,
                        fontFamily: "var(--font-family)",
                        color: palette.textReversed,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      Done
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setModalView("pricing")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "transparent",
                          border: `1px solid ${palette.borderMedium}`,
                          borderRadius: "8px",
                          padding: "10px 20px",
                          fontSize: "14px",
                          fontWeight: 600,
                          fontFamily: "var(--font-family)",
                          color: palette.textTertiary,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = palette.hoverBg;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <ArrowLeft size={15} />
                        Back
                      </button>
                      <button
                        onClick={() => {
                          setContactSent(true);
                          setContactMessage("");
                        }}
                        disabled={!contactMessage.trim()}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          background: contactMessage.trim()
                            ? palette.primary
                            : palette.surfaceTertiary,
                          border: "none",
                          borderRadius: "8px",
                          padding: "10px 24px",
                          fontSize: "14px",
                          fontWeight: 600,
                          fontFamily: "var(--font-family)",
                          color: contactMessage.trim()
                            ? palette.textReversed
                            : palette.textDisabled,
                          cursor: contactMessage.trim()
                            ? "pointer"
                            : "not-allowed",
                          transition: "all 0.15s",
                        }}
                      >
                        <Send size={15} />
                        Send
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Keyframe animations */}
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes modalSlideIn {
              from { opacity: 0; transform: translate(-50%, -48%); }
              to { opacity: 1; transform: translate(-50%, -50%); }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
