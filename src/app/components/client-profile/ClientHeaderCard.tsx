import { useRef, useState } from "react";
import { useTheme } from "../layout/ThemeContext";
import { useIsMobile } from "../ui/use-mobile";
import { useIsTablet } from "../ui/use-tablet";

// ---------------------------------------------------------------------------
// Stat chip
// ---------------------------------------------------------------------------
interface StatChipProps {
  label: string;
  value: string;
  valueColor?: string;
  onClick?: () => void;
  palette: any;
}

function StatChip({ label, value, valueColor, onClick, palette }: StatChipProps) {
  return (
    <div
      className="flex flex-col justify-center"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "12px 20px",
        background: palette.surfaceSecondary,
        borderRadius: "6px",
        minWidth: 0,
        position: "relative",
        cursor: onClick ? "pointer" : undefined,
        transition: onClick ? "background 0.25s ease" : undefined,
      }}
      onMouseEnter={(e) => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = palette.surfaceTertiary; }}
      onMouseLeave={(e) => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = palette.surfaceSecondary; }}
    >
      {onClick && (
        <span style={{
          position: "absolute",
          top: "7px",
          right: "8px",
          color: palette.primary,
          fontSize: "11px",
          opacity: 0.55,
          lineHeight: 1,
          pointerEvents: "none",
        }}>↗</span>
      )}
      <span style={{ color: palette.textTertiary, fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", marginBottom: "4px", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ color: valueColor ?? palette.textPrimary, fontSize: "var(--text-xl)", fontWeight: 700, fontFamily: "var(--font-family)", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

// Mobile variant — tighter padding, smaller value text
function StatChipMobile({ label, value, valueColor, onClick, palette }: StatChipProps) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 12px",
        background: palette.surfaceSecondary,
        borderRadius: "6px",
        position: "relative",
        cursor: onClick ? "pointer" : undefined,
      }}
      onMouseEnter={(e) => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = palette.surfaceTertiary; }}
      onMouseLeave={(e) => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = palette.surfaceSecondary; }}
    >
      {onClick && (
        <span style={{
          position: "absolute",
          top: "6px",
          right: "7px",
          color: palette.primary,
          fontSize: "10px",
          opacity: 0.55,
          lineHeight: 1,
          pointerEvents: "none",
        }}>↗</span>
      )}
      <div style={{ color: palette.textTertiary, fontSize: "11px", fontFamily: "var(--font-family)", marginBottom: "3px" }}>{label}</div>
      <div style={{ color: valueColor ?? palette.textPrimary, fontSize: "var(--text-base)", fontWeight: 700, fontFamily: "var(--font-family)" }}>{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Membership stat
// ---------------------------------------------------------------------------
interface MembershipStatProps { label: string; value: string; noBorder?: boolean; palette: any }

function MembershipStat({ label, value, noBorder = false, palette }: MembershipStatProps) {
  return (
    <div className="flex flex-col" style={{ padding: "0 16px", flexShrink: 0, borderRight: noBorder ? "none" : `1px solid ${palette.borderMedium}` }}>
      <span style={{ color: palette.textTertiary, fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", marginBottom: "3px", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ color: palette.textPrimary, fontSize: "var(--text-base)", fontWeight: 600, fontFamily: "var(--font-family)", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Avatar modal
// ---------------------------------------------------------------------------
const CROP_SIZE = 240;

interface AvatarModalProps {
  existingUrl: string | null;
  initialPendingUrl?: string | null;
  onApply: (dataUrl: string) => void;
  onRemove: () => void;
  onClose: () => void;
  palette: any;
  isDark: boolean;
}

function AvatarModal({ existingUrl, initialPendingUrl, onApply, onRemove, onClose, palette, isDark }: AvatarModalProps) {
  const [view, setView]             = useState<"options" | "crop">(initialPendingUrl ? "crop" : "options");
  const [pendingUrl, setPendingUrl] = useState<string | null>(initialPendingUrl ?? null);
  const [zoom, setZoom]             = useState(1);
  const [minZoom, setMinZoom]       = useState(1);
  const [offset, setOffset]         = useState({ x: 0, y: 0 });
  const isDragging  = useRef(false);
  const dragOrigin  = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const imgRef      = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function clampOffset(x: number, y: number, z: number) {
    const img = imgRef.current;
    if (!img) return { x, y };
    const hw = Math.max(0, (img.naturalWidth  * z - CROP_SIZE) / 2);
    const hh = Math.max(0, (img.naturalHeight * z - CROP_SIZE) / 2);
    return { x: Math.min(Math.max(x, -hw), hw), y: Math.min(Math.max(y, -hh), hh) };
  }

  function updateZoom(newZoom: number) {
    const clamped = Math.min(20, Math.max(minZoom, newZoom));
    setZoom(clamped);
    setOffset(prev => clampOffset(prev.x, prev.y, clamped));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingUrl(URL.createObjectURL(file));
    setOffset({ x: 0, y: 0 });
    setZoom(1);
    setMinZoom(1);
    setView("crop");
    e.target.value = "";
  }

  function handleImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    const init = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
    setMinZoom(init);
    setZoom(init);
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    isDragging.current = true;
    dragOrigin.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    setOffset(clampOffset(dragOrigin.current.ox + e.clientX - dragOrigin.current.mx, dragOrigin.current.oy + e.clientY - dragOrigin.current.my, zoom));
  }
  function onMouseUp() { isDragging.current = false; }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    updateZoom(zoom * (1 - e.deltaY * 0.001));
  }

  function applyCrop() {
    const img = imgRef.current;
    if (!img || !pendingUrl) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = CROP_SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const dispX = CROP_SIZE / 2 + offset.x - (img.naturalWidth  * zoom) / 2;
    const dispY = CROP_SIZE / 2 + offset.y - (img.naturalHeight * zoom) / 2;
    ctx.drawImage(img, -dispX / zoom, -dispY / zoom, CROP_SIZE / zoom, CROP_SIZE / zoom, 0, 0, CROP_SIZE, CROP_SIZE);
    onApply(canvas.toDataURL("image/png"));
  }

  const primaryBtn:   React.CSSProperties = { background: palette.primary, border: "none", borderRadius: "6px", color: isDark ? "#0a0e0f" : "#101828", fontSize: "var(--text-base)", fontWeight: 600, fontFamily: "var(--font-family)", padding: "10px", cursor: "pointer", width: "100%" };
  const secondaryBtn: React.CSSProperties = { background: "transparent", border: `1px solid ${palette.outlineAction}`, borderRadius: "6px", color: palette.textTertiary, fontSize: "var(--text-base)", fontFamily: "var(--font-family)", padding: "10px", cursor: "pointer", width: "100%" };
  const dangerBtn:    React.CSSProperties = { background: "transparent", border: `1px solid ${palette.textError}80`, borderRadius: "6px", color: palette.textError, fontSize: "var(--text-base)", fontFamily: "var(--font-family)", padding: "10px", cursor: "pointer", width: "100%" };
  const zoomPct = minZoom > 0 ? Math.round((zoom / minZoom) * 100) : 100;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: palette.backdrop, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: palette.surfacePrimary, border: `1px solid ${palette.borderMedium}`, borderRadius: "10px", padding: "24px", width: "100%", maxWidth: "320px", fontFamily: "var(--font-family)" }}>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{ display: "none" }} onChange={handleFileChange} />
        <div className="flex items-center justify-between" style={{ marginBottom: "20px" }}>
          <span style={{ color: palette.textPrimary, fontSize: "var(--text-lg)", fontWeight: 600 }}>{view === "options" ? "Profile photo" : "Crop photo"}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: palette.textTertiary, fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>×</button>
        </div>

        {view === "options" && (
          <>
            {existingUrl && (
              <div style={{ marginBottom: "20px", borderRadius: "6px", overflow: "hidden", background: palette.surfaceBg }}>
                <img src={existingUrl} alt="Current profile" style={{ display: "block", width: "100%", height: "auto", maxHeight: "220px", objectFit: "contain" }} />
              </div>
            )}
            <p style={{ color: palette.textTertiary, fontSize: "var(--text-sm)", margin: "0 0 16px", textAlign: "center" }}>Accepted formats: JPG, PNG</p>
            <div className="flex flex-col gap-3">
              <button style={primaryBtn} onClick={() => fileInputRef.current?.click()}>Replace photo</button>
              <button style={dangerBtn}  onClick={onRemove}>Remove photo</button>
            </div>
          </>
        )}

        {view === "crop" && (
          <>
            <p style={{ color: palette.textTertiary, fontSize: "var(--text-sm)", margin: "0 0 12px", textAlign: "center" }}>Drag to reposition · Zoom in to crop tighter</p>
            <div className="flex justify-center" style={{ marginBottom: "16px" }}>
              <div
                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel}
                style={{ width: `${CROP_SIZE}px`, height: `${CROP_SIZE}px`, borderRadius: "50%", overflow: "hidden", border: `2px solid ${palette.primary}`, cursor: "grab", position: "relative", background: palette.surfaceBg, userSelect: "none", flexShrink: 0 }}
              >
                {pendingUrl && (
                  <img ref={imgRef} src={pendingUrl} onLoad={handleImgLoad} draggable={false} alt="Crop preview"
                    style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`, transformOrigin: "center center", maxWidth: "none", pointerEvents: "none" }}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-3" style={{ marginBottom: "16px" }}>
              <button onClick={() => updateZoom(zoom / 1.2)} style={{ background: palette.borderLight, border: `1px solid ${palette.borderMedium}`, borderRadius: "4px", color: palette.textTertiary, width: "28px", height: "28px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>−</button>
              <input type="range" min={minZoom} max={minZoom * 10} step={minZoom * 0.01} value={zoom} onChange={e => updateZoom(parseFloat(e.target.value))} style={{ flex: 1, accentColor: palette.primary, cursor: "pointer" }} />
              <button onClick={() => updateZoom(zoom * 1.2)} style={{ background: palette.borderLight, border: `1px solid ${palette.borderMedium}`, borderRadius: "4px", color: palette.textTertiary, width: "28px", height: "28px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
              <span style={{ color: palette.textTertiary, fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", width: "40px", textAlign: "right", flexShrink: 0 }}>{zoomPct}%</span>
            </div>
            <div className="flex gap-3">
              <button style={{ ...secondaryBtn, flex: 1 }} onClick={() => setView("options")}>Back</button>
              <button style={{ ...primaryBtn,   flex: 1 }} onClick={applyCrop}>Apply</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------
interface ClientHeaderCardProps {
  avatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
  onEditClient?: () => void;
  onCancelEditing?: () => void;
  isEditing?: boolean;
  displayName?: string;
  displayAge?: number | null;
  onDueClick?: () => void;
}

export function ClientHeaderCard({ avatarUrl, onAvatarChange, onEditClient, onCancelEditing, isEditing, displayName, displayAge, onDueClick }: ClientHeaderCardProps) {
  const { palette, mode } = useTheme();
  const isDark = mode === "dark";
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [modalOpen, setModalOpen]               = useState(false);
  const [pendingUploadUrl, setPendingUploadUrl] = useState<string | null>(null);
  const [isExpanded, setIsExpanded]             = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarClick() {
    if (avatarUrl) { setModalOpen(true); } else { fileInputRef.current?.click(); }
  }

  // First-time upload: open the modal in crop view instead of applying directly
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingUploadUrl(URL.createObjectURL(file));
    setModalOpen(true);
    e.target.value = "";
  }

  function closeModal() {
    setModalOpen(false);
    setPendingUploadUrl(null);
  }

  const sharedCard = (
    <>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{ display: "none" }} onChange={handleFileChange} />
      {modalOpen && (
        <AvatarModal
          existingUrl={avatarUrl}
          initialPendingUrl={pendingUploadUrl}
          onApply={url => { onAvatarChange(url); closeModal(); }}
          onRemove={() => { onAvatarChange(null); closeModal(); }}
          onClose={closeModal}
          palette={palette}
          isDark={isDark}
        />
      )}
    </>
  );

  const avatar = (
    <div onClick={handleAvatarClick} title={avatarUrl ? "Change profile photo" : "Upload profile photo"}
      style={{ width: "52px", height: "52px", borderRadius: "50%", border: `2px solid ${palette.primary}`, background: palette.surfaceSecondary, cursor: "pointer", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {avatarUrl
        ? <img src={avatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{ color: palette.primary, fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-family)" }}>A</span>
      }
    </div>
  );

  /* ── Mobile layout ─────────────────────────────────────────────────────── */
  if (isMobile) {
    const allStats: { label: string; value: string; valueColor?: string; onClick?: () => void }[] = [
      { label: "Balance",          value: "$275" },
      { label: "Due",              value: "$150",       valueColor: palette.textError, onClick: onDueClick },
      { label: "Un-invoiced",      value: "($344.18)",  valueColor: "#e07a3a" },
      { label: "Membership No.",   value: "123456789" },
      { label: "Access Mode",      value: "Rule-based" },
      { label: "Membership",       value: "Month-to-Month" },
      { label: "Expires",          value: "05/31/2026" },
      { label: "Renewed Through",  value: "04/30/2026" },
      { label: "Contract",         value: "$1,200" },
      { label: "Billed",           value: "$850" },
      { label: "Paid",             value: "$750" },
      { label: "Max Visits",       value: "20" },
      { label: "Used Visits",      value: "14" },
    ];

    return (
      <>
        {sharedCard}
        {/* position:relative so the absolute body is anchored to this card */}
        <div style={{ position: "relative", background: palette.surfacePrimary, border: `1px solid ${palette.borderMedium}`, borderRadius: "8px 8px 0 0", fontFamily: "var(--font-family)" }}>

          {/* Accordion header — always visible */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px" }}>
            {avatar}

            {/* Name + status */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: palette.textPrimary, fontSize: "var(--text-base)", fontWeight: 600, fontFamily: "var(--font-family)", lineHeight: 1.3 }}>{displayName ?? "Alice Smith"}</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "3px", background: `${palette.primary}1f`, borderRadius: "20px", padding: "2px 7px" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: palette.primary, display: "inline-block" }} />
                <span style={{ color: palette.primary, fontSize: "10px", fontFamily: "var(--font-family)", fontWeight: 500 }}>Active</span>
              </div>
            </div>

            {/* Check In */}
            <button style={{ background: palette.primary, border: "none", borderRadius: "6px", color: isDark ? "#0a0e0f" : "#101828", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-family)", padding: "7px 13px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              Check In
            </button>

            {/* Expand/collapse toggle */}
            <button
              onClick={() => setIsExpanded(v => !v)}
              aria-label={isExpanded ? "Collapse" : "Expand"}
              style={{ background: palette.borderLight, border: `1px solid ${palette.borderMedium}`, borderRadius: "4px", color: palette.textTertiary, width: "26px", height: "26px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "14px", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              ▾
            </button>
          </div>

          {/* Accordion body — absolutely positioned so it overlays content below */}
          {isExpanded && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: -1,   /* align with the card's border */
              right: -1,
              background: palette.surfacePrimary,
              border: `1px solid ${palette.borderMedium}`,
              borderTop: `1px solid ${palette.borderLight}`,
              borderRadius: "0 0 8px 8px",
              padding: "10px 12px 12px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
              zIndex: 80,
              boxShadow: `0 8px 20px ${palette.shadow}`,
            }}>
              {allStats.map(({ label, value, valueColor, onClick }) => (
                <StatChipMobile key={label} label={label} value={value} valueColor={valueColor} onClick={onClick} palette={palette} />
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  /* ── Desktop / Tablet layout ───────────────────────────────────────────── */
  const checkInBtn = (
    <button style={{ background: palette.primary, border: "none", borderRadius: "6px", color: isDark ? "#0a0e0f" : "#101828", fontSize: "var(--text-base)", fontWeight: 600, fontFamily: "var(--font-family)", padding: "10px 20px", cursor: "pointer", whiteSpace: "nowrap" }}>
      Check In
    </button>
  );

  return (
    <>
      {sharedCard}
      <div className="flex rounded-lg overflow-hidden" style={{ background: palette.surfacePrimary, border: `1px solid ${palette.borderMedium}`, marginBottom: "16px", fontFamily: "var(--font-family)", transition: "background 0.25s ease" }}>

        {/* Identity card */}
        <div className="flex flex-col items-center justify-center shrink-0" style={{ width: isTablet ? "136px" : "160px", padding: isTablet ? "16px 12px" : "20px 16px", borderRight: `1px solid ${palette.borderMedium}` }}>
          <div onClick={handleAvatarClick} title={avatarUrl ? "Change profile photo" : "Upload profile photo"}
            className="flex items-center justify-center rounded-full"
            style={{ width: isTablet ? "52px" : "64px", height: isTablet ? "52px" : "64px", border: `2px solid ${palette.primary}`, background: palette.surfaceSecondary, marginBottom: "8px", cursor: "pointer", overflow: "hidden", position: "relative" }}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ color: palette.primary, fontSize: isTablet ? "20px" : "24px", fontWeight: 700, fontFamily: "var(--font-family)" }}>A</span>
            }
          </div>
          <span style={{ color: palette.textPrimary, fontSize: "var(--text-base)", fontWeight: 600, fontFamily: "var(--font-family)", marginBottom: "2px", textAlign: "center" }}>{displayName ?? "Alice Smith"}</span>
          <span style={{ color: palette.textTertiary, fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", marginBottom: "8px" }}>
            {displayAge != null ? `Age ${displayAge}` : "Age 47"}
          </span>
          <div className="flex items-center gap-1 rounded-full px-2 py-1" style={{ background: `${palette.primary}1f` }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: palette.primary, display: "inline-block" }} />
            <span style={{ color: palette.primary, fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", fontWeight: 500 }}>Active</span>
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          {isTablet ? (
            /* ── Tablet: 3-column stat grid ── */
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${palette.borderLight}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "10px" }}>
                <StatChip label="Balance"        value="$275" palette={palette} />
                <StatChip label="Due"            value="$150"       valueColor={palette.textError} onClick={onDueClick} palette={palette} />
                <StatChip label="Un-invoiced"    value="($344.18)"  valueColor="#e07a3a" palette={palette} />
                <StatChip label="Membership No." value="123456789" palette={palette} />
                <StatChip label="Access Mode"    value="Rule-based" palette={palette} />
                {/* Check In fills the 6th cell, right-aligned */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  {checkInBtn}
                </div>
              </div>
            </div>
          ) : (
            /* ── Desktop: single flex row ── */
            <div className="flex items-stretch gap-2" style={{ padding: "12px 16px", borderBottom: `1px solid ${palette.borderLight}` }}>
              <StatChip label="Balance"        value="$275" palette={palette} />
              <StatChip label="Due"            value="$150"       valueColor={palette.textError} onClick={onDueClick} palette={palette} />
              <StatChip label="Un-invoiced"    value="($344.18)"  valueColor="#e07a3a" palette={palette} />
              <StatChip label="Membership No." value="123456789" palette={palette} />
              <StatChip label="Access Mode"    value="Rule-based" palette={palette} />
              <div className="flex items-center justify-center shrink-0" style={{ paddingLeft: "8px" }}>
                {checkInBtn}
              </div>
            </div>
          )}

          {/* Membership row — same on both */}
          <div className="flex items-center" style={{ padding: "12px 0 12px 4px", overflowX: "auto" }}>
            <MembershipStat label="Membership"      value="Individual · Month-to-Month" palette={palette} />
            <MembershipStat label="Expires"         value="05/31/2026" palette={palette} />
            <MembershipStat label="Renewed Through" value="04/30/2026" palette={palette} />
            <MembershipStat label="Contract"        value="$1,200" palette={palette} />
            <MembershipStat label="Billed"          value="$850" palette={palette} />
            <MembershipStat label="Paid"            value="$750" palette={palette} />
            <MembershipStat label="Max Visits"      value="20" palette={palette} />
            <MembershipStat label="Used Visits"     value="14" noBorder palette={palette} />
          </div>
        </div>
      </div>
    </>
  );
}
