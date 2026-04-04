import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { FormField, SectionCard, ReadOnlyField } from "./FormField";
import { SectionHandle, SectionSaveButton } from "./ProfileSection";
import { CancelConfirmModal } from "./CancelConfirmModal";

export interface AdditionalData {
  referredBy: string;
  hearAboutUs: string;
  notes: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export const DEFAULT_ADDITIONAL: AdditionalData = {
  referredBy: "",
  hearAboutUs: "",
  notes: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

export interface AdditionalInfoSectionProps {
  isEditing?: boolean;
  onCancelAll?: () => void;
  initialData?: AdditionalData;
  onSave?: (data: AdditionalData) => void;
  onEditingChange?: (isEditing: boolean) => void;
}

export const AdditionalInfoSection = forwardRef<SectionHandle, AdditionalInfoSectionProps>(
  ({ isEditing = false, onCancelAll, initialData, onSave, onEditingChange }, ref) => {
    const [savedData, setSavedData] = useState<AdditionalData>(initialData ?? DEFAULT_ADDITIONAL);
    const [draftData, setDraftData] = useState<AdditionalData>(initialData ?? DEFAULT_ADDITIONAL);
    const [localEditing, setLocalEditing] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

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
      const d = draftRef.current;
      setSavedData({ ...d });
      setLocalEditingAndNotify(false);
      onSave?.({ ...d });
    }

    function handleCancel() {
      setDraftData({ ...savedRef.current });
      setLocalEditingAndNotify(false);
    }

    function handleUndo() {
      setDraftData({ ...savedRef.current });
    }

    function setField<K extends keyof AdditionalData>(key: K, val: AdditionalData[K]) {
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
        title="Additional Information"
        onEdit={handleEdit}
        onCancel={handleCancelClick}
        isEditing={effectiveEditing}
      >
        {effectiveEditing ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <FormField label="Referred by"              value={draftData.referredBy}   onChange={(v) => setField("referredBy", v)}   placeholder="Referral source" />
              <FormField label="How did you hear about us?" value={draftData.hearAboutUs} onChange={(v) => setField("hearAboutUs", v)} placeholder="Source" />
              <div className="col-span-1 md:col-span-2">
                <FormField
                  label="Notes"
                  value={draftData.notes}
                  onChange={(v) => setField("notes", v)}
                  placeholder="Add notes about this client..."
                  isTextarea
                />
              </div>
              <FormField label="Emergency contact name"  value={draftData.emergencyContactName}  onChange={(v) => setField("emergencyContactName", v)}  placeholder="Full name" />
              <FormField label="Emergency contact phone" value={draftData.emergencyContactPhone} onChange={(v) => setField("emergencyContactPhone", v)} placeholder="(000) 000-0000" />
            </div>
            {effectiveEditing && (
              <SectionSaveButton onSave={handleSave} onUndo={handleUndo} />
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <ReadOnlyField label="Referred by"               value={savedData.referredBy} />
            <ReadOnlyField label="How did you hear about us?" value={savedData.hearAboutUs} />
            <div className="col-span-1 md:col-span-2">
              <ReadOnlyField label="Notes" value={savedData.notes} />
            </div>
            <ReadOnlyField label="Emergency contact name"  value={savedData.emergencyContactName} />
            <ReadOnlyField label="Emergency contact phone" value={savedData.emergencyContactPhone} />
          </div>
        )}
      </SectionCard>
      </>
    );
  }
);
AdditionalInfoSection.displayName = "AdditionalInfoSection";
