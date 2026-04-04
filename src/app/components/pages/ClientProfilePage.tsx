/**
 * ClientProfilePage — the full client profile view.
 *
 * This was extracted from the original App.tsx so the app can route between
 * multiple top-level pages while keeping all client-profile logic intact.
 */

import { useState, useRef } from "react";
import { useIsMobile } from "../ui/use-mobile";
import { useIsTablet } from "../ui/use-tablet";
import { SIDEBAR_WIDTH } from "../layout/Sidebar";
import { ClientHeaderCard } from "../client-profile/ClientHeaderCard";
import { SectionNav, navGroups } from "../client-profile/SectionNav";
import { ProfileSection, DEFAULT_PROFILE } from "../client-profile/ProfileSection";
import type { ProfileData, SectionHandle } from "../client-profile/ProfileSection";
import { ContactSection, DEFAULT_CONTACT } from "../client-profile/ContactSection";
import type { ContactData } from "../client-profile/ContactSection";
import { AdditionalInfoSection, DEFAULT_ADDITIONAL } from "../client-profile/AdditionalInfoSection";
import type { AdditionalData } from "../client-profile/AdditionalInfoSection";
import { getClientById } from "../../data/clients";
import { CustomFieldsSection } from "../client-profile/CustomFieldsSection";
import { RelationshipsSection } from "../client-profile/RelationshipsSection";
import { GroupsSection } from "../client-profile/GroupsSection";
import { ReportsSection } from "../client-profile/ReportsSection";
import { ActivitySection } from "../client-profile/ActivitySection";
import { EquipmentSection } from "../client-profile/EquipmentSection";
import { EmergencySection } from "../client-profile/EmergencySection";
import { DocumentsSection } from "../client-profile/DocumentsSection";
import { SubscriptionsSection } from "../client-profile/SubscriptionsSection";
import { CancelConfirmModal } from "../client-profile/CancelConfirmModal";
import { PaymentPanel } from "../client-profile/PaymentPanel";
import { PageMenu } from "../client-profile/PageMenu";
import { useSidePanel } from "../layout/SidePanelContext";
import { useTheme } from "../layout/ThemeContext";

// ── Bottom save bar ───────────────────────────────────────────────────────────

function BottomBar({
  onCancel,
  onUndoAll,
  onSaveAll,
}: {
  onCancel: () => void;
  onUndoAll: () => void;
  onSaveAll: () => void;
}) {
  const isMobile = useIsMobile();
  const { palette } = useTheme();

  const secondaryStyle: React.CSSProperties = {
    background: "transparent",
    border: `1px solid ${palette.borderMedium}`,
    borderRadius: "6px",
    color: palette.textTertiary,
    fontSize: "var(--text-base)",
    fontFamily: "var(--font-family)",
    padding: "8px 16px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: isMobile ? 0 : SIDEBAR_WIDTH,
        right: 0,
        height: "56px",
        background: palette.surfacePrimary,
        borderTop: `1px solid ${palette.borderMedium}`,
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 50,
        fontFamily: "var(--font-family)",
        transition: "background 0.25s ease",
      }}
    >
      <button
        onClick={onCancel}
        style={{
          ...secondaryStyle,
          color: palette.textError,
          border: `1px solid ${palette.textError}40`,
        }}
      >
        Cancel
      </button>

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={onUndoAll} style={secondaryStyle}>
          Undo All
        </button>
        <button
          onClick={onSaveAll}
          style={{
            background: palette.primary,
            border: "none",
            borderRadius: "6px",
            color: palette.textReversed,
            fontSize: "var(--text-base)",
            fontWeight: 600,
            fontFamily: "var(--font-family)",
            padding: "8px 16px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Save All
        </button>
      </div>
    </div>
  );
}

// ── Client Profile page ──────────────────────────────────────────────────────

interface ClientProfilePageProps {
  /** The id of the client to display. Falls back to defaults if not found. */
  clientId?: string;
  /** Called when the user clicks "« Clients" breadcrumb to go back to the list. */
  onNavigateToClients: () => void;
}

export function ClientProfilePage({ clientId, onNavigateToClients }: ClientProfilePageProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { openPanel } = useSidePanel();
  const { palette } = useTheme();

  // Resolve client data from the shared data store, falling back to defaults.
  const clientRecord = clientId ? getClientById(clientId) : undefined;

  const [activeSection, setActiveSection] = useState("Profile");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [globalEditMode, setGlobalEditMode] = useState(false);
  const [localEditCount, setLocalEditCount] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);

  function handleLocalEditingChange(editing: boolean) {
    setLocalEditCount((prev) => (editing ? prev + 1 : Math.max(0, prev - 1)));
  }

  const showBottomBar = globalEditMode || localEditCount > 0;

  const [savedProfileData, setSavedProfileData] = useState<ProfileData>(
    clientRecord?.profile ?? DEFAULT_PROFILE
  );
  const [savedContactData, setSavedContactData] = useState<ContactData>(
    clientRecord?.contact ?? DEFAULT_CONTACT
  );
  const [savedAdditionalData, setSavedAdditionalData] = useState<AdditionalData>(
    clientRecord?.additional ?? DEFAULT_ADDITIONAL
  );

  function calcAge(dob: string): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  const clientDisplayName = `${savedProfileData.firstName} ${savedProfileData.lastName}`.trim();
  const clientAge = calcAge(savedProfileData.dateOfBirth);

  const profileRef = useRef<SectionHandle>(null);
  const contactRef = useRef<SectionHandle>(null);
  const additionalRef = useRef<SectionHandle>(null);

  function handleSaveAll() {
    profileRef.current?.save();
    contactRef.current?.save();
    additionalRef.current?.save();
    setGlobalEditMode(false);
  }

  function handleUndoAll() {
    profileRef.current?.resetDraft();
    contactRef.current?.resetDraft();
    additionalRef.current?.resetDraft();
  }

  function handleCancelAll() {
    profileRef.current?.undo();
    contactRef.current?.undo();
    additionalRef.current?.undo();
    setGlobalEditMode(false);
  }

  function handleBottomBarCancel() {
    const anyChanges =
      profileRef.current?.hasChanges() ||
      contactRef.current?.hasChanges() ||
      additionalRef.current?.hasChanges();
    if (anyChanges) {
      setShowCancelModal(true);
    } else {
      handleCancelAll();
    }
  }

  function handleDueClick() {
    openPanel(<PaymentPanel />, { size: "quarter", title: "Payment" });
  }

  // ── Breadcrumb ────────────────────────────────────────────────────────────
  const breadcrumb = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 0",
        fontFamily: "var(--font-family)",
      }}
    >
      <div style={{ color: palette.textTertiary, fontSize: "var(--text-lg)" }}>
        <span
          style={{ cursor: "pointer", color: palette.primary }}
          onClick={onNavigateToClients}
        >
          « Clients
        </span>
        <span>
          : {clientDisplayName}
          {clientAge != null ? `, ${clientAge}` : ""}
        </span>
      </div>
      <PageMenu
        contextualPages={[{ id: "clients", label: "Clients" }]}
        onNavigateToPage={(pageId) => {
          if (pageId === "clients") onNavigateToClients();
        }}
      />
    </div>
  );

  // ── Section content ───────────────────────────────────────────────────────
  function renderItem(item: string) {
    switch (item) {
      case "Profile":
        return (
          <ProfileSection
            key="Profile"
            ref={profileRef}
            isEditing={globalEditMode}
            onCancelAll={handleCancelAll}
            initialData={savedProfileData}
            onSave={(data) => setSavedProfileData(data)}
          />
        );
      case "Contact":
        return (
          <ContactSection
            key="Contact"
            ref={contactRef}
            isEditing={globalEditMode}
            onCancelAll={handleCancelAll}
          />
        );
      case "Membership":
      case "Billing":
        return <SubscriptionsSection key={item} />;
      case "Emergency":
        return <EmergencySection key={item} />;
      case "Relationships":
        return <RelationshipsSection key={item} />;
      case "Equipment":
        return <EquipmentSection key={item} />;
      case "Activity":
        return <ActivitySection key={item} />;
      case "Reports":
        return <ReportsSection key={item} />;
      case "Groups":
        return <GroupsSection key={item} />;
      case "Documents":
        return <DocumentsSection key={item} />;
      default:
        return null;
    }
  }

  function renderProfileGroup() {
    return (
      <>
        <ProfileSection
          ref={profileRef}
          isEditing={globalEditMode}
          onCancelAll={handleCancelAll}
          initialData={savedProfileData}
          onSave={(data) => setSavedProfileData(data)}
          onEditingChange={handleLocalEditingChange}
        />
        <ContactSection
          ref={contactRef}
          isEditing={globalEditMode}
          onCancelAll={handleCancelAll}
          initialData={savedContactData}
          onSave={(data) => setSavedContactData(data)}
          onEditingChange={handleLocalEditingChange}
        />
        <CustomFieldsSection />
        <AdditionalInfoSection
          ref={additionalRef}
          isEditing={globalEditMode}
          onCancelAll={handleCancelAll}
          initialData={savedAdditionalData}
          onSave={(data) => setSavedAdditionalData(data)}
          onEditingChange={handleLocalEditingChange}
        />
      </>
    );
  }

  function renderSection() {
    if (activeSection === "ALL") {
      return (
        <>
          <div className="flex flex-col gap-4">{renderProfileGroup()}</div>
          <SubscriptionsSection />
          <RelationshipsSection />
          <SubscriptionsSection />
          <RelationshipsSection />
        </>
      );
    }

    const group = navGroups.find((g) => g.group === activeSection);
    if (group) {
      return (
        <>
          {group.items.map((item) =>
            item === "Profile" ? (
              <div key="Profile" className="flex flex-col gap-4">
                {renderProfileGroup()}
              </div>
            ) : (
              renderItem(item)
            )
          )}
        </>
      );
    }

    if (activeSection === "Profile") return renderProfileGroup();
    return renderItem(activeSection) ?? renderProfileGroup();
  }

  return (
    <>
      {showCancelModal && (
        <CancelConfirmModal
          onConfirm={() => {
            setShowCancelModal(false);
            handleCancelAll();
          }}
          onKeepEditing={() => setShowCancelModal(false)}
        />
      )}

      {/* Desktop / tablet: breadcrumb, header, section nav + content */}
      {!isMobile && (
        <>
          {breadcrumb}
          <ClientHeaderCard
            avatarUrl={avatarUrl}
            onAvatarChange={setAvatarUrl}
            onEditClient={() => setGlobalEditMode(true)}
            onCancelEditing={handleCancelAll}
            isEditing={globalEditMode}
            displayName={clientDisplayName}
            displayAge={clientAge}
            onDueClick={handleDueClick}
          />
          <div
            className="flex items-start"
            style={{ gap: isTablet ? "10px" : "16px", marginTop: "8px" }}
          >
            <SectionNav
              activeSection={activeSection}
              onSelect={setActiveSection}
              onEditClient={() => setGlobalEditMode(true)}
              onCancelEditing={handleCancelAll}
              isEditing={globalEditMode}
            />
            <div className="flex flex-col flex-1 min-w-0 gap-4">{renderSection()}</div>
          </div>
        </>
      )}

      {/* Mobile: scrollable section content only */}
      {isMobile && (
        <>
          {breadcrumb}
          <ClientHeaderCard
            avatarUrl={avatarUrl}
            onAvatarChange={setAvatarUrl}
            onEditClient={() => setGlobalEditMode(true)}
            onCancelEditing={handleCancelAll}
            isEditing={globalEditMode}
            displayName={clientDisplayName}
            displayAge={clientAge}
            onDueClick={handleDueClick}
          />
          <div style={{ paddingBottom: "8px" }}>
            <SectionNav
              activeSection={activeSection}
              onSelect={setActiveSection}
              onEditClient={() => setGlobalEditMode(true)}
              onCancelEditing={handleCancelAll}
              isEditing={globalEditMode}
            />
          </div>
          <div
            className="flex flex-col gap-4"
            style={{ paddingBottom: showBottomBar ? "56px" : "0" }}
          >
            {renderSection()}
          </div>
        </>
      )}

      {showBottomBar && (
        <BottomBar
          onCancel={handleBottomBarCancel}
          onUndoAll={handleUndoAll}
          onSaveAll={handleSaveAll}
        />
      )}
    </>
  );
}
