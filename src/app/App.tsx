import { useState, useRef } from "react";
import { useIsMobile } from "./components/ui/use-mobile";
import { useIsTablet } from "./components/ui/use-tablet";
import { Layout } from "./components/layout/Layout";
import { SIDEBAR_WIDTH } from "./components/layout/Sidebar";
import { ClientHeaderCard } from "./components/client-profile/ClientHeaderCard";
import { SectionNav, navGroups } from "./components/client-profile/SectionNav";
import { ProfileSection, DEFAULT_PROFILE }           from "./components/client-profile/ProfileSection";
import type { ProfileData, SectionHandle }            from "./components/client-profile/ProfileSection";
import { ContactSection, DEFAULT_CONTACT }            from "./components/client-profile/ContactSection";
import type { ContactData }                           from "./components/client-profile/ContactSection";
import { AdditionalInfoSection, DEFAULT_ADDITIONAL }  from "./components/client-profile/AdditionalInfoSection";
import type { AdditionalData }                        from "./components/client-profile/AdditionalInfoSection";
import { CustomFieldsSection }   from "./components/client-profile/CustomFieldsSection";
import { RelationshipsSection }  from "./components/client-profile/RelationshipsSection";
import { GroupsSection }         from "./components/client-profile/GroupsSection";
import { ReportsSection }        from "./components/client-profile/ReportsSection";
import { ActivitySection }       from "./components/client-profile/ActivitySection";
import { EquipmentSection }      from "./components/client-profile/EquipmentSection";
import { EmergencySection }      from "./components/client-profile/EmergencySection";
import { DocumentsSection }      from "./components/client-profile/DocumentsSection";
import { SubscriptionsSection }  from "./components/client-profile/SubscriptionsSection";
import { CancelConfirmModal }    from "./components/client-profile/CancelConfirmModal";

// ── Bottom save bar ───────────────────────────────────────────────────────────
// Only rendered when the page is in global edit mode.

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

  const secondaryStyle: React.CSSProperties = {
    background: "transparent",
    border: "1px solid rgba(161,189,198,0.35)",
    borderRadius: "6px",
    color: "#a1bdc6",
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
        background: "#182023",
        borderTop: "1px solid rgba(161,189,198,0.2)",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 50,
        fontFamily: "var(--font-family)",
      }}
    >
      {/* Far-left: Cancel */}
      <button
        onClick={onCancel}
        style={{
          ...secondaryStyle,
          color: "#e05a5a",
          border: "1px solid rgba(224,90,90,0.4)",
        }}
      >
        Cancel
      </button>

      {/* Right side: Undo All + Save All */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={onUndoAll} style={secondaryStyle}>
          Undo All
        </button>
        <button
          onClick={onSaveAll}
          style={{
            background: "#00c4a0",
            border: "none",
            borderRadius: "6px",
            color: "#0a0e0f",
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

// ── Client Profile page ───────────────────────────────────────────────────────

export default function App() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const [activeSection, setActiveSection] = useState("Profile");
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null);
  const [globalEditMode, setGlobalEditMode] = useState(false);
  // Tracks how many sections are locally (per-section) in edit mode.
  const [localEditCount, setLocalEditCount] = useState(0);
  // Modal shown when the bottom-bar Cancel is clicked with unsaved changes.
  const [showCancelModal, setShowCancelModal] = useState(false);

  function handleLocalEditingChange(editing: boolean) {
    setLocalEditCount((prev) => editing ? prev + 1 : Math.max(0, prev - 1));
  }

  const showBottomBar = globalEditMode || localEditCount > 0;

  // Persistent saved data for each editable section — survives nav changes.
  const [savedProfileData,    setSavedProfileData]    = useState<ProfileData>(DEFAULT_PROFILE);
  const [savedContactData,    setSavedContactData]    = useState<ContactData>(DEFAULT_CONTACT);
  const [savedAdditionalData, setSavedAdditionalData] = useState<AdditionalData>(DEFAULT_ADDITIONAL);

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
  const clientAge         = calcAge(savedProfileData.dateOfBirth);

  // Refs to each editable section so Save All / Undo All can drive them.
  const profileRef    = useRef<SectionHandle>(null);
  const contactRef    = useRef<SectionHandle>(null);
  const additionalRef = useRef<SectionHandle>(null);

  function handleSaveAll() {
    profileRef.current?.save();
    contactRef.current?.save();
    additionalRef.current?.save();
    setGlobalEditMode(false);
  }

  // Resets all drafts but keeps global edit mode active (Undo All button).
  function handleUndoAll() {
    profileRef.current?.resetDraft();
    contactRef.current?.resetDraft();
    additionalRef.current?.resetDraft();
  }

  // Resets all drafts and exits global edit mode (Cancel Editing).
  function handleCancelAll() {
    profileRef.current?.undo();
    contactRef.current?.undo();
    additionalRef.current?.undo();
    setGlobalEditMode(false);
  }

  // Bottom-bar Cancel: show confirmation modal if any section has unsaved changes.
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

  // ── Breadcrumb ────────────────────────────────────────────────────────────
  const breadcrumb = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 0",
        fontFamily: "var(--font-family)",
      }}
    >
      <div style={{ color: "#a1bdc6", fontSize: "var(--text-base)" }}>
        <span style={{ cursor: "pointer", color: "#00c4a0" }}>« Clients</span>
        <span>: {clientDisplayName}{clientAge != null ? `, ${clientAge}` : ""}</span>
      </div>
    </div>
  );


  // ── Section content ───────────────────────────────────────────────────────
  // Renders the content for a single nav item.
  function renderItem(item: string) {
    switch (item) {
      case "Profile":
        return (
          <ProfileSection key="Profile" ref={profileRef} isEditing={globalEditMode} onCancelAll={handleCancelAll}
            initialData={savedProfileData}
            onSave={(data) => setSavedProfileData(data)}
          />
        );
      case "Contact":
        return <ContactSection key="Contact" ref={contactRef} isEditing={globalEditMode} onCancelAll={handleCancelAll} />;
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

  // The "Profile" nav item is a composite that shows the full profile card group.
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
    // Show all sections across every group
    if (activeSection === "ALL") {
      return (
        <>
          <div className="flex flex-col gap-4">{renderProfileGroup()}</div>
          <SubscriptionsSection />   {/* Membership */}
          <RelationshipsSection />   {/* Emergency  */}
          <SubscriptionsSection />   {/* Billing    */}
          <RelationshipsSection />   {/* Connections */}
        </>
      );
    }

    // Group heading was clicked — show all items in that group
    const group = navGroups.find((g) => g.group === activeSection);
    if (group) {
      return (
        <>
          {group.items.map((item) =>
            item === "Profile" ? (
              <div key="Profile" className="flex flex-col gap-4">{renderProfileGroup()}</div>
            ) : renderItem(item)
          )}
        </>
      );
    }

    // Single section item
    if (activeSection === "Profile") return renderProfileGroup();
    return renderItem(activeSection) ?? renderProfileGroup();
  }

  // ── Mobile fixed-strip content ────────────────────────────────────────────
  const mobileFixedContent = (
    <>
      {breadcrumb}
      <ClientHeaderCard avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl} onEditClient={() => setGlobalEditMode(true)} onCancelEditing={handleCancelAll} isEditing={globalEditMode} displayName={clientDisplayName} displayAge={clientAge} />
      <div style={{ paddingBottom: "8px" }}>
        <SectionNav
          activeSection={activeSection}
          onSelect={setActiveSection}
          onEditClient={() => setGlobalEditMode(true)}
          onCancelEditing={handleCancelAll}
          isEditing={globalEditMode}
        />
      </div>
    </>
  );

  return (
    <>
    {showCancelModal && (
      <CancelConfirmModal
        onConfirm={() => { setShowCancelModal(false); handleCancelAll(); }}
        onKeepEditing={() => setShowCancelModal(false)}
      />
    )}
    <Layout
      mobileFixedContent={mobileFixedContent}
      bottomBar={
        showBottomBar
          ? <BottomBar onCancel={handleBottomBarCancel} onUndoAll={handleUndoAll} onSaveAll={handleSaveAll} />
          : undefined
      }
    >
      {/* Desktop / tablet: breadcrumb, header, section nav + content */}
      {!isMobile && (
        <>
          {breadcrumb}
          <ClientHeaderCard avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl} onEditClient={() => setGlobalEditMode(true)} onCancelEditing={handleCancelAll} isEditing={globalEditMode} displayName={clientDisplayName} displayAge={clientAge} />
          <div className="flex items-start" style={{ gap: isTablet ? "10px" : "16px", marginTop: "8px" }}>
            <SectionNav
              activeSection={activeSection}
              onSelect={setActiveSection}
              onEditClient={() => setGlobalEditMode(true)}
              onCancelEditing={handleCancelAll}
              isEditing={globalEditMode}
            />
            <div className="flex flex-col flex-1 min-w-0 gap-4">
              {renderSection()}
            </div>
          </div>
        </>
      )}

      {/* Mobile: scrollable section content only */}
      {isMobile && (
        <div
          className="flex flex-col gap-4"
          // Extra bottom padding when the BottomBar is present
          style={{ paddingBottom: showBottomBar ? "56px" : "0" }}
        >
          {renderSection()}
        </div>
      )}
    </Layout>
    </>
  );
}
