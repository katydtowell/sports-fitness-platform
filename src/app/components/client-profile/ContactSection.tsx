import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { FormField, SectionCard, ReadOnlyField } from "./FormField";
import { SectionHandle, SectionSaveButton } from "./ProfileSection";
import { CancelConfirmModal } from "./CancelConfirmModal";

export interface ContactData {
  email: string;
  homePhone: string;
  mobilePhone: string;
  workPhone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
}

export const DEFAULT_CONTACT: ContactData = {
  email: "a.smith@domain.com",
  homePhone: "(123) 456-7890",
  mobilePhone: "(123) 456-7890",
  workPhone: "(123) 456-7890",
  address1: "1701 Mockingbird Ln",
  address2: "",
  city: "Townville",
  state: "NY – New York",
  zipCode: "12345",
};

const STATE_OPTIONS = [
  "AL – Alabama", "AK – Alaska", "AZ – Arizona", "CA – California",
  "CO – Colorado", "CT – Connecticut", "FL – Florida", "GA – Georgia",
  "IL – Illinois", "NY – New York", "TX – Texas", "WA – Washington",
];

export interface ContactSectionProps {
  isEditing?: boolean;
  onCancelAll?: () => void;
  initialData?: ContactData;
  onSave?: (data: ContactData) => void;
  onEditingChange?: (isEditing: boolean) => void;
}

export const ContactSection = forwardRef<SectionHandle, ContactSectionProps>(
  ({ isEditing = false, onCancelAll, initialData, onSave, onEditingChange }, ref) => {
    const [savedData, setSavedData] = useState<ContactData>(initialData ?? DEFAULT_CONTACT);
    const [draftData, setDraftData] = useState<ContactData>(initialData ?? DEFAULT_CONTACT);
    const [localEditing, setLocalEditing] = useState(false);
    const [validationAttempted, setValidationAttempted] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

    const REQUIRED_FIELDS: (keyof ContactData)[] = ["email", "homePhone", "address1", "city", "state", "zipCode"];
    const hasErrors = REQUIRED_FIELDS.some((f) => !draftData[f]);

    const savedRef = useRef(savedData);
    const draftRef = useRef(draftData);
    savedRef.current = savedData;
    draftRef.current = draftData;

    useEffect(() => {
      if (isEditing) setDraftData({ ...savedRef.current });
    }, [isEditing]);

    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;
    const onEditingChangeRef = useRef(onEditingChange);
    onEditingChangeRef.current = onEditingChange;

    function setLocalEditingAndNotify(val: boolean) {
      setLocalEditing(val);
      onEditingChangeRef.current?.(val);
    }

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
      setDraftData({ ...savedRef.current });
    }

    function setField<K extends keyof ContactData>(key: K, val: ContactData[K]) {
      setDraftData((prev) => ({ ...prev, [key]: val }));
    }

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
        title="Contact Information"
        onEdit={handleEdit}
        onCancel={handleCancelClick}
        isEditing={effectiveEditing}
      >
        {effectiveEditing ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <FormField label="Email address" value={draftData.email}       onChange={(v) => setField("email", v)}       required error={validationAttempted && !draftData.email} />
              <FormField label="Home phone"    value={draftData.homePhone}   onChange={(v) => setField("homePhone", v)}   required error={validationAttempted && !draftData.homePhone} />
              <FormField label="Mobile phone"  value={draftData.mobilePhone} onChange={(v) => setField("mobilePhone", v)} />
              <FormField label="Work phone"    value={draftData.workPhone}   onChange={(v) => setField("workPhone", v)} />
              <div className="col-span-1 md:col-span-2">
                <FormField label="Address line 1" value={draftData.address1} onChange={(v) => setField("address1", v)} required error={validationAttempted && !draftData.address1} />
              </div>
              <FormField label="Address line 2" value={draftData.address2} onChange={(v) => setField("address2", v)} placeholder="Apt, Suite, etc." />
              <FormField label="City"     value={draftData.city}    onChange={(v) => setField("city", v)}    required error={validationAttempted && !draftData.city} />
              <FormField
                label="State"
                value={draftData.state}
                onChange={(v) => setField("state", v)}
                isDropdown
                options={STATE_OPTIONS}
                required
                error={validationAttempted && !draftData.state}
              />
              <FormField label="Zip code" value={draftData.zipCode} onChange={(v) => setField("zipCode", v)} required error={validationAttempted && !draftData.zipCode} />
            </div>
            {effectiveEditing && (
              <SectionSaveButton onSave={handleSave} onUndo={handleUndo} saveDisabled={validationAttempted && hasErrors} />
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <ReadOnlyField label="Email address"  value={savedData.email} />
            <ReadOnlyField label="Home phone"     value={savedData.homePhone} />
            <ReadOnlyField label="Mobile phone"   value={savedData.mobilePhone} />
            <ReadOnlyField label="Work phone"     value={savedData.workPhone} />
            <div className="col-span-1 md:col-span-2">
              <ReadOnlyField label="Address line 1" value={savedData.address1} />
            </div>
            <ReadOnlyField label="Address line 2" value={savedData.address2} />
            <ReadOnlyField label="City"           value={savedData.city} />
            <ReadOnlyField label="State"          value={savedData.state} />
            <ReadOnlyField label="Zip code"       value={savedData.zipCode} />
          </div>
        )}
      </SectionCard>
      </>
    );
  }
);
ContactSection.displayName = "ContactSection";
