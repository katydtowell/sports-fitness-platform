/**
 * OnboardingModal — multi-step onboarding wizard (7 steps + completion).
 *
 * Steps:
 *   1. Welcome to EZFacility
 *   2. Select Your Industries
 *   3. Enable Modules
 *   4. Set Up User Roles
 *   5. Create Your First User
 *   6. Customize Look and Feel
 *   7. Add Widgets to Your Dashboard
 *   8. You're All Set!
 */

import { useState } from "react";
import {
  X,
  Check,
  Settings,
  Users,
  Palette,
  ChevronLeft,
  ChevronRight,
  Upload,
  Eye,
  Shield,
  Edit,
} from "lucide-react";
import { useTheme } from "./ThemeContext";

/** Convert a hex colour + alpha into an rgba() string. */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (id: string) => void;
}

// ── Data ────────────────────────────────────────────────────────────────────

interface Industry {
  id: string;
  label: string;
}

const industries: Industry[] = [
  { id: "fitness-gym", label: "Fitness Center / Gym" },
  { id: "yoga-pilates", label: "Yoga / Pilates Studio" },
  { id: "crossfit", label: "CrossFit / HIIT Studio" },
  { id: "martial-arts", label: "Martial Arts / Boxing" },
  { id: "swimming-pool", label: "Swimming Pool / Aquatics" },
  { id: "baseball-softball", label: "Baseball / Softball" },
  { id: "basketball", label: "Basketball Facility" },
  { id: "soccer", label: "Soccer / Football" },
  { id: "tennis-racquet", label: "Tennis / Racquet Sports" },
  { id: "ice-hockey", label: "Ice Hockey / Skating" },
  { id: "volleyball", label: "Volleyball" },
  { id: "golf", label: "Golf Course / Range" },
  { id: "dance-studio", label: "Dance Studio" },
  { id: "sports-complex", label: "Multi-Sport Complex" },
  { id: "recreation-center", label: "Recreation Center" },
  { id: "athletic-training", label: "Athletic Training Facility" },
  { id: "other", label: "Other Sports / Fitness" },
];

interface Module {
  id: string;
  title: string;
  description: string;
  isPaidUpgrade: boolean;
}

const availableModules: Module[] = [
  { id: "advanced-documents", title: "Advanced Documents", description: "Draft agreements and waivers with ease. Add interactive fields and advanced functionality.", isPaidUpgrade: true },
  { id: "advanced-accounting", title: "Advanced Accounting", description: "Streamline your financial operations with comprehensive reporting and automated invoicing.", isPaidUpgrade: true },
  { id: "client-portal", title: "Client Portal", description: "Give your clients secure access to view their information, schedules, and documents.", isPaidUpgrade: false },
  { id: "automated-reminders", title: "Automated Reminders", description: "Send automatic email and SMS reminders to clients about appointments and payments.", isPaidUpgrade: false },
  { id: "staff-management", title: "Staff Management", description: "Manage team schedules, assign permissions, track performance, and coordinate workflows.", isPaidUpgrade: false },
];

interface UserRole {
  id: string;
  name: string;
  selected: boolean;
}

const defaultRoles: UserRole[] = [
  { id: "administrator", name: "Administrator", selected: true },
  { id: "manager", name: "Manager", selected: false },
  { id: "staff", name: "Staff", selected: false },
  { id: "instructor", name: "Instructor", selected: false },
  { id: "front-desk", name: "Front Desk", selected: false },
];

const widgetOptions = [
  { id: "reports", label: "Reports", description: "View key metrics at a glance" },
  { id: "upcoming-sessions", label: "Upcoming Sessions", description: "See what's coming up today" },
  { id: "tasks", label: "Tasks", description: "Track your to-do items" },
  { id: "messages", label: "Messages", description: "Recent client messages" },
  { id: "latest-invoices", label: "Latest Invoices", description: "Monitor recent payments" },
  { id: "new-clients", label: "New Clients", description: "Recently added members" },
];

// ── Component ───────────────────────────────────────────────────────────────

export function OnboardingModal({ isOpen, onClose, onNavigate }: OnboardingModalProps) {
  const { palette } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 2 state
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [showIndustryError, setShowIndustryError] = useState(false);

  // Step 3 state
  const [modules, setModules] = useState(
    availableModules.map((m) => ({ ...m, enabled: !m.isPaidUpgrade }))
  );

  // Step 4 state
  const [roles, setRoles] = useState(defaultRoles);

  // Step 5 state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("staff");

  // Step 6 state
  const [primaryColor, setPrimaryColor] = useState("#00c28a");
  const [secondaryColor, setSecondaryColor] = useState("#4a9eff");

  // Step 7 state
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([
    "reports",
    "upcoming-sessions",
    "tasks",
    "messages",
  ]);

  // ── Handlers ──

  const handleIndustryToggle = (id: string) => {
    setShowIndustryError(false);
    setSelectedIndustries((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleNextFromIndustries = () => {
    if (selectedIndustries.length === 0) {
      setShowIndustryError(true);
      return;
    }
    setCurrentStep(3);
  };

  const toggleModule = (moduleId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, enabled: !m.enabled } : m
      )
    );
  };

  const toggleRole = (roleId: string) => {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId ? { ...r, selected: !r.selected } : r
      )
    );
  };

  const toggleWidget = (widgetId: string) => {
    setSelectedWidgets((prev) =>
      prev.includes(widgetId)
        ? prev.filter((id) => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  const handleClose = () => {
    setCurrentStep(1);
    onClose();
  };

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 8));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  if (!isOpen) return null;

  // ── Step titles ──
  const stepTitle = (() => {
    switch (currentStep) {
      case 1: return "Welcome to EZFacility";
      case 2: return "Select Your Industries";
      case 3: return "Enable Modules";
      case 4: return "Set Up User Roles";
      case 5: return "Create Your First User";
      case 6: return "Customize Look and Feel";
      case 7: return "Add Widgets to Your Dashboard";
      case 8: return "You're All Set!";
      default: return "";
    }
  })();

  // ── Shared styles ──
  const cardBorder = palette.borderMedium;
  const cardBg = palette.surfaceBg;

  const btnPrimary: React.CSSProperties = {
    background: palette.primary,
    color: palette.textReversed,
    border: "none",
    borderRadius: "8px",
    padding: "10px 24px",
    fontSize: "var(--text-base)",
    fontWeight: 600,
    fontFamily: "var(--font-family)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  };

  const btnSecondary: React.CSSProperties = {
    background: "transparent",
    color: palette.textTertiary,
    border: `1px solid ${palette.borderMedium}`,
    borderRadius: "8px",
    padding: "10px 24px",
    fontSize: "var(--text-base)",
    fontWeight: 500,
    fontFamily: "var(--font-family)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  };

  // ── Step content ──
  const renderStepContent = () => {
    switch (currentStep) {
      // ── Step 1: Welcome ──
      case 1:
        return (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            {/* Green check icon */}
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "16px",
                background: palette.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
              }}
            >
              <Check size={40} strokeWidth={3} style={{ color: palette.iconReversed }} />
            </div>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: palette.textPrimary,
                margin: "0 0 12px",
                fontFamily: "var(--font-family)",
              }}
            >
              Welcome to EZFacility
            </h2>
            <p
              style={{
                fontSize: "15px",
                color: palette.textTertiary,
                margin: "0 0 32px",
                lineHeight: 1.6,
                maxWidth: "540px",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Let's get your sports and fitness facility management platform set
              up in just a few minutes. We'll help you customize it to match
              your business needs.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "16px",
                maxWidth: "640px",
                margin: "0 auto",
              }}
            >
              {[
                {
                  icon: Settings,
                  color: palette.primary,
                  bg: hexToRgba(palette.primary, 0.1),
                  title: "Configure",
                  desc: "Select your industry and enable features",
                },
                {
                  icon: Users,
                  color: palette.containerInfo,
                  bg: hexToRgba(palette.containerInfo, 0.1),
                  title: "Organize",
                  desc: "Set up roles and add team members",
                },
                {
                  icon: Palette,
                  color: palette.surfaceTertiary,
                  bg: hexToRgba(palette.surfaceTertiary, 0.1),
                  title: "Personalize",
                  desc: "Customize colors and branding",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    padding: "20px",
                    border: `1px solid ${cardBorder}`,
                    borderRadius: "12px",
                    background: cardBg,
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "10px",
                      background: card.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                    }}
                  >
                    <card.icon size={24} style={{ color: card.color }} />
                  </div>
                  <h4
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: palette.textPrimary,
                      margin: "0 0 4px",
                      fontFamily: "var(--font-family)",
                    }}
                  >
                    {card.title}
                  </h4>
                  <p
                    style={{
                      fontSize: "12px",
                      color: palette.textTertiary,
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );

      // ── Step 2: Industries ──
      case 2:
        return (
          <div>
            <p style={{ fontSize: "14px", color: palette.textTertiary, margin: "0 0 16px", lineHeight: 1.5 }}>
              Choose the industries that best describe your facility. This helps
              us tailor features and defaults to your needs.
            </p>
            {showIndustryError && (
              <p style={{ color: palette.textError, fontSize: "var(--text-base)", margin: "0 0 12px" }}>
                Please select at least one industry to continue.
              </p>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "10px",
              }}
            >
              {industries.map((ind) => {
                const selected = selectedIndustries.includes(ind.id);
                return (
                  <button
                    key={ind.id}
                    onClick={() => handleIndustryToggle(ind.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 14px",
                      border: `1px solid ${selected ? palette.primary : palette.borderMedium}`,
                      borderRadius: "8px",
                      background: selected ? hexToRgba(palette.primary, 0.08) : "transparent",
                      color: palette.textPrimary,
                      fontSize: "var(--text-base)",
                      fontFamily: "var(--font-family)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                  >
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "4px",
                        border: `2px solid ${selected ? palette.primary : palette.borderMedium}`,
                        background: selected ? palette.primary : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {selected && <Check size={12} strokeWidth={3} style={{ color: palette.iconReversed }} />}
                    </div>
                    {ind.label}
                  </button>
                );
              })}
            </div>
          </div>
        );

      // ── Step 3: Modules ──
      case 3:
        return (
          <div>
            <p style={{ fontSize: "14px", color: palette.textTertiary, margin: "0 0 16px", lineHeight: 1.5 }}>
              Enable the modules you'd like to use. You can always change these
              later in Settings.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {modules.map((mod) => (
                <div
                  key={mod.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    border: `1px solid ${palette.borderMedium}`,
                    borderRadius: "10px",
                    background: cardBg,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: palette.textPrimary,
                          fontFamily: "var(--font-family)",
                        }}
                      >
                        {mod.title}
                      </span>
                      {mod.isPaidUpgrade && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: palette.containerWarning,
                            background: hexToRgba(palette.containerWarning, 0.12),
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          PAID
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: "12px",
                        color: palette.textTertiary,
                        margin: "4px 0 0",
                        lineHeight: 1.4,
                      }}
                    >
                      {mod.description}
                    </p>
                  </div>
                  {/* Toggle switch */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    style={{
                      width: "44px",
                      height: "24px",
                      borderRadius: "12px",
                      border: "none",
                      background: mod.enabled ? palette.primary : palette.borderMedium,
                      cursor: "pointer",
                      position: "relative",
                      flexShrink: 0,
                      marginLeft: "16px",
                      transition: "background 0.2s",
                    }}
                  >
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: palette.iconReversed,
                        position: "absolute",
                        top: "3px",
                        left: mod.enabled ? "23px" : "3px",
                        transition: "left 0.2s",
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      // ── Step 4: User Roles ──
      case 4:
        return (
          <div>
            <p style={{ fontSize: "14px", color: palette.textTertiary, margin: "0 0 16px", lineHeight: 1.5 }}>
              Select which user roles to enable for your organization. You can
              customize permissions for each role later.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => toggleRole(role.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 16px",
                    border: `1px solid ${role.selected ? palette.primary : palette.borderMedium}`,
                    borderRadius: "10px",
                    background: role.selected ? hexToRgba(palette.primary, 0.06) : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "var(--font-family)",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "6px",
                      border: `2px solid ${role.selected ? palette.primary : palette.borderMedium}`,
                      background: role.selected ? palette.primary : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {role.selected && <Check size={12} strokeWidth={3} style={{ color: palette.iconReversed }} />}
                  </div>
                  <div>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: palette.textPrimary }}>
                      {role.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      // ── Step 5: Create First User ──
      case 5: {
        const inputStyle: React.CSSProperties = {
          width: "100%",
          padding: "10px 14px",
          border: `1px solid ${palette.borderMedium}`,
          borderRadius: "8px",
          background: palette.surfaceBg,
          color: palette.textPrimary,
          fontSize: "14px",
          fontFamily: "var(--font-family)",
          outline: "none",
          boxSizing: "border-box",
        };
        const labelStyle: React.CSSProperties = {
          display: "block",
          fontSize: "13px",
          fontWeight: 600,
          color: palette.textPrimary,
          marginBottom: "6px",
          fontFamily: "var(--font-family)",
        };
        return (
          <div>
            <p style={{ fontSize: "14px", color: palette.textTertiary, margin: "0 0 20px", lineHeight: 1.5 }}>
              Add your first team member. You can add more users later in the
              Admin section.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "400px" }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Smith"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. jane@yourfacility.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  style={{
                    ...inputStyle,
                    appearance: "auto",
                  }}
                >
                  {roles
                    .filter((r) => r.selected)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        );
      }

      // ── Step 6: Customize Look & Feel ──
      case 6:
        return (
          <div>
            <p style={{ fontSize: "14px", color: palette.textTertiary, margin: "0 0 20px", lineHeight: 1.5 }}>
              Personalize your platform's appearance to match your brand.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "400px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: palette.textPrimary,
                    marginBottom: "8px",
                    fontFamily: "var(--font-family)",
                  }}
                >
                  Primary Color
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{
                      width: "40px",
                      height: "40px",
                      border: `1px solid ${palette.borderMedium}`,
                      borderRadius: "8px",
                      cursor: "pointer",
                      padding: "2px",
                      background: "transparent",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: palette.textTertiary, fontFamily: "monospace" }}>
                    {primaryColor}
                  </span>
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: palette.textPrimary,
                    marginBottom: "8px",
                    fontFamily: "var(--font-family)",
                  }}
                >
                  Secondary Color
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    style={{
                      width: "40px",
                      height: "40px",
                      border: `1px solid ${palette.borderMedium}`,
                      borderRadius: "8px",
                      cursor: "pointer",
                      padding: "2px",
                      background: "transparent",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: palette.textTertiary, fontFamily: "monospace" }}>
                    {secondaryColor}
                  </span>
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: palette.textPrimary,
                    marginBottom: "8px",
                    fontFamily: "var(--font-family)",
                  }}
                >
                  Logo Upload
                </label>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    border: `1px dashed ${palette.borderMedium}`,
                    borderRadius: "8px",
                    background: "transparent",
                    color: palette.textTertiary,
                    fontSize: "13px",
                    fontFamily: "var(--font-family)",
                    cursor: "pointer",
                  }}
                >
                  <Upload size={16} />
                  Choose a file…
                </button>
              </div>
              {/* Preview */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: palette.textPrimary,
                    marginBottom: "8px",
                    fontFamily: "var(--font-family)",
                  }}
                >
                  Preview
                </label>
                <div
                  style={{
                    padding: "16px",
                    border: `1px solid ${palette.borderMedium}`,
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: cardBg,
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: primaryColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={18} strokeWidth={3} style={{ color: palette.iconReversed }} />
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "16px",
                      color: primaryColor,
                      fontFamily: "var(--font-family)",
                    }}
                  >
                    EZFacility
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      // ── Step 7: Dashboard Widgets ──
      case 7:
        return (
          <div>
            <p style={{ fontSize: "14px", color: palette.textTertiary, margin: "0 0 16px", lineHeight: 1.5 }}>
              Choose which widgets to display on your home dashboard. You can
              rearrange and update these anytime.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "10px",
              }}
            >
              {widgetOptions.map((w) => {
                const selected = selectedWidgets.includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "14px",
                      border: `1px solid ${selected ? palette.primary : palette.borderMedium}`,
                      borderRadius: "10px",
                      background: selected ? hexToRgba(palette.primary, 0.06) : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "var(--font-family)",
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                  >
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "4px",
                        border: `2px solid ${selected ? palette.primary : palette.borderMedium}`,
                        background: selected ? palette.primary : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      {selected && <Check size={11} strokeWidth={3} style={{ color: palette.iconReversed }} />}
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: palette.textPrimary,
                          display: "block",
                        }}
                      >
                        {w.label}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          color: palette.textTertiary,
                          lineHeight: 1.3,
                          marginTop: "2px",
                          display: "block",
                        }}
                      >
                        {w.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      // ── Step 8: All Set ──
      case 8:
        return (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: palette.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
              }}
            >
              <Check size={40} strokeWidth={3} style={{ color: palette.iconReversed }} />
            </div>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: palette.textPrimary,
                margin: "0 0 12px",
                fontFamily: "var(--font-family)",
              }}
            >
              You're All Set!
            </h2>
            <p
              style={{
                fontSize: "15px",
                color: palette.textTertiary,
                margin: "0 0 32px",
                lineHeight: 1.6,
                maxWidth: "460px",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Your EZFacility platform is ready to use. You can always adjust
              these settings later from the Admin panel.
            </p>
            <button
              onClick={() => {
                handleClose();
                onNavigate?.("home");
              }}
              style={btnPrimary}
            >
              Go to Dashboard
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: palette.backdrop,
          zIndex: 900,
        }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90vw",
          maxWidth: "720px",
          maxHeight: "85vh",
          background: palette.surfacePrimary,
          borderRadius: "16px",
          zIndex: 901,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: `0 24px 48px ${palette.shadow}`,
          fontFamily: "var(--font-family)",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: `1px solid ${palette.borderLight}`,
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: palette.textPrimary,
                margin: 0,
                fontFamily: "var(--font-family)",
              }}
            >
              {stepTitle}
            </h2>
            {currentStep < 8 && (
              <p
                style={{
                  fontSize: "13px",
                  color: palette.textTertiary,
                  margin: "4px 0 0",
                }}
              >
                Step {currentStep} of 7
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: palette.textTertiary,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = palette.hoverBg;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            minHeight: 0,
          }}
        >
          {renderStepContent()}
        </div>

        {/* ── Footer (navigation buttons) ── */}
        {currentStep < 8 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: currentStep === 1 ? "flex-end" : "space-between",
              padding: "16px 24px",
              borderTop: `1px solid ${palette.borderLight}`,
              flexShrink: 0,
            }}
          >
            {currentStep > 1 && (
              <button onClick={goBack} style={btnSecondary}>
                <ChevronLeft size={16} />
                Back
              </button>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              {currentStep > 1 && currentStep < 7 && (
                <button onClick={goNext} style={btnSecondary}>
                  Skip
                </button>
              )}
              <button
                onClick={currentStep === 2 ? handleNextFromIndustries : goNext}
                style={btnPrimary}
              >
                {currentStep === 1 ? "Get Started" : currentStep === 7 ? "Finish Setup" : "Continue"}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
