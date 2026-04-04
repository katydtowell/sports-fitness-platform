import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { useTheme } from "../layout/ThemeContext";
import { FormField, SectionCard, ReadOnlyField, formatDateDisplay } from "./FormField";
import { CancelConfirmModal } from "./CancelConfirmModal";

// ── Shared imperative handle ──────────────────────────────────────────────────
// Each editable section exposes save() and undo() so App.tsx can trigger
// Save All / Undo All without re-rendering or passing extra props.

export interface SectionHandle {
  save: () => void;
  undo: () => void;       // reset draft + exit edit mode (used by Cancel Editing)
  resetDraft: () => void; // reset draft only, stay in edit mode (used by Undo All)
  hasChanges: () => boolean; // true if draft differs from last saved state
}

// ── Per-section Save / Cancel buttons ────────────────────────────────────────
// Shown only when a section is in local (per-section) edit mode.

interface SectionSaveButtonProps {
  onSave: () => void;
  onUndo: () => void;
  saveDisabled?: boolean;
}

export function SectionSaveButton({ onSave, onUndo, saveDisabled = false }: SectionSaveButtonProps) {
  const { palette } = useTheme();
  const secondaryStyle: React.CSSProperties = {
    background: "transparent",
    border: `1px solid ${palette.outlineAction}`,
    borderRadius: "6px",
    color: palette.textTertiary,
    fontSize: "var(--text-base)",
    fontFamily: "var(--font-family)",
    padding: "8px 20px",
    cursor: "pointer",
  };

  return (
    <div className="flex justify-end gap-3" style={{ marginTop: "20px" }}>
      <button onClick={onUndo} style={secondaryStyle}>
        Undo
      </button>
      <button
        onClick={saveDisabled ? undefined : onSave}
        disabled={saveDisabled}
        style={{
          background: saveDisabled ? `${palette.primary}55` : palette.primary,
          border: "none",
          borderRadius: "6px",
          color: saveDisabled ? palette.textPrimary : palette.surfaceBg,
          fontSize: "var(--text-base)",
          fontWeight: 600,
          fontFamily: "var(--font-family)",
          padding: "8px 20px",
          cursor: saveDisabled ? "not-allowed" : "pointer",
        }}
      >
        Save
      </button>
    </div>
  );
}

// ── ProfileSection ────────────────────────────────────────────────────────────

export interface ProfileData {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  billingStatus: string;
  endDate: string;
  date: string;
  organization: string;
}

export const DEFAULT_PROFILE: ProfileData = {
  firstName: "Alice",
  lastName: "Smith",
  gender: "Female",
  dateOfBirth: "1979-01-01",
  billingStatus: "Active",
  endDate: "2026-12-31",
  date: "2026-01-01",
  organization: "",
};

export interface ProfileSectionProps {
  isEditing?: boolean;
  onCancelAll?: () => void;
  /** Seed the section with previously saved data (persists across nav). */
  initialData?: ProfileData;
  /** Called after any save with the full saved profile data. */
  onSave?: (data: ProfileData) => void;
  /** Fired when local edit mode starts (true) or ends (false). */
  onEditingChange?: (isEditing: boolean) => void;
}

export const ProfileSection = forwardRef<SectionHandle, ProfileSectionProps>(
  ({ isEditing = false, onCancelAll, initialData, onSave, onEditingChange }, ref) => {
    const [savedData, setSavedData] = useState<ProfileData>(initialData ?? DEFAULT_PROFILE);
    const [draftData, setDraftData] = useState<ProfileData>(initialData ?? DEFAULT_PROFILE);
    const [localEditing, setLocalEditing] = useState(false);
    const [validationAttempted, setValidationAttempted] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

    const REQUIRED_FIELDS: (keyof ProfileData)[] = ["firstName", "lastName", "gender", "dateOfBirth", "billingStatus", "date", "endDate"];
    const hasErrors = REQUIRED_FIELDS.some((f) => !draftData[f]);

    // Always-current refs so imperative methods never capture stale closures.
    const savedRef = useRef(savedData);
    const draftRef = useRef(draftData);
    savedRef.current = savedData;
    draftRef.current = draftData;

    // When global edit mode activates, refresh the draft from the latest saved.
    useEffect(() => {
      if (isEditing) setDraftData({ ...savedRef.current });
    }, [isEditing]);

    // Always-current refs so imperative methods never capture stale callbacks.
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;
    const onEditingChangeRef = useRef(onEditingChange);
    onEditingChangeRef.current = onEditingChange;

    function setLocalEditingAndNotify(val: boolean) {
      setLocalEditing(val);
      onEditingChangeRef.current?.(val);
    }

    // Global Save All / Undo All called by App.tsx via ref.
    useImperativeHandle(ref, () => ({
      save() {
        const d = draftRef.current;
        setSavedData({ ...d });
        setLocalEditingAndNotify(false);
        onSaveRef.current?.({ ...d });
      },
      undo() {
        setDraftData({ ...savedRef.current });
        setLocalEditingAndNotify(false);
      },
      resetDraft() {
        setDraftData({ ...savedRef.current });
      },
      hasChanges() {
        return JSON.stringify(draftRef.current) !== JSON.stringify(savedRef.current);
      },
    }), []);

    const effectiveEditing = isEditing || localEditing;

    function handleEdit() {
      setDraftData({ ...savedRef.current });
      setLocalEditingAndNotify(true);
    }

    function handleSave() {
      if (hasErrors) { setValidationAttempted(true); return; }
      const d = draftRef.current;
      setSavedData({ ...d });
      setLocalEditingAndNotify(false);
      setValidationAttempted(false);
      onSave?.({ ...d });
    }

    function handleCancel() {
      setDraftData({ ...savedRef.current });
      setLocalEditingAndNotify(false);
      setValidationAttempted(false);
    }

    function handleUndo() {
      // Reset draft to last saved state but stay in edit mode.
      setDraftData({ ...savedRef.current });
    }

    function setField<K extends keyof ProfileData>(key: K, val: ProfileData[K]) {
      setDraftData((prev) => ({ ...prev, [key]: val }));
    }

    // Section Cancel link: guard with modal if there are unsaved changes.
    function handleCancelClick() {
      const changed = JSON.stringify(draftRef.current) !== JSON.stringify(savedRef.current);
      if (changed) {
        setShowCancelModal(true);
      } else {
        handleCancel();
      }
    }

    return (
      <>
      {showCancelModal && (
        <CancelConfirmModal
          onConfirm={() => { setShowCancelModal(false); handleCancel(); }}
          onKeepEditing={() => setShowCancelModal(false)}
        />
      )}
      <SectionCard
        title="Profile Information"
        onEdit={handleEdit}
        onCancel={handleCancelClick}
        isEditing={effectiveEditing}
      >
        {effectiveEditing ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <FormField label="First name"   value={draftData.firstName}    onChange={(v) => setField("firstName", v)}    required error={validationAttempted && !draftData.firstName} />
              <FormField label="Last name"    value={draftData.lastName}     onChange={(v) => setField("lastName", v)}     required error={validationAttempted && !draftData.lastName} />
              <FormField
                label="Gender"
                value={draftData.gender}
                onChange={(v) => setField("gender", v)}
                isDropdown
                options={["Female", "Male", "Non-binary", "Prefer not to say"]}
                required
                error={validationAttempted && !draftData.gender}
              />
              <FormField label="Start date"   type="date" value={draftData.date}        onChange={(v) => setField("date", v)}        required error={validationAttempted && !draftData.date} />
              <FormField label="Date of birth" type="date" value={draftData.dateOfBirth} onChange={(v) => setField("dateOfBirth", v)} required error={validationAttempted && !draftData.dateOfBirth} />
              <FormField label="End date"     type="date" value={draftData.endDate}      onChange={(v) => setField("endDate", v)}      required error={validationAttempted && !draftData.endDate} />
              <FormField label="Organization" value={draftData.organization} onChange={(v) => setField("organization", v)} placeholder="Organization name" />
              <FormField
                label="Billing status"
                value={draftData.billingStatus}
                onChange={(v) => setField("billingStatus", v)}
                isDropdown
                options={["Active", "Inactive", "Suspended", "Pending"]}
                required
                error={validationAttempted && !draftData.billingStatus}
              />
            </div>
            {effectiveEditing && (
              <SectionSaveButton onSave={handleSave} onUndo={handleUndo} saveDisabled={validationAttempted && hasErrors} />
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <ReadOnlyField label="First name"      value={savedData.firstName} />
            <ReadOnlyField label="Last name"       value={savedData.lastName} />
            <ReadOnlyField label="Gender"          value={savedData.gender} />
            <ReadOnlyField label="Start date"      value={formatDateDisplay(savedData.date)} />
            <ReadOnlyField label="Date of birth"   value={formatDateDisplay(savedData.dateOfBirth)} />
            <ReadOnlyField label="End date"        value={formatDateDisplay(savedData.endDate)} />
            <ReadOnlyField label="Organization"    value={savedData.organization} />
            <ReadOnlyField label="Billing status"  value={savedData.billingStatus} />
          </div>
        )}
      </SectionCard>
      </>
    );
  }
);
ProfileSection.displayName = "ProfileSection";
