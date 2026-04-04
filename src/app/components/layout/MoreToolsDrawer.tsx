import { useCallback, useState, useEffect, useRef } from "react";
import { X, GripVertical } from "lucide-react";
import type { NavItem } from "./navTypes";
import { SIDEBAR_WIDTH, DRAG_SOURCE_SIDEBAR, DRAG_SOURCE_DRAWER } from "./Sidebar";

// ── Badge chip ──────────────────────────────────────────────────────────────
function Badge({ text }: { text: string }) {
  return (
    <span
      style={{
        background: "#00c4a0",
        color: "#0a0e0f",
        fontSize: "9px",
        fontWeight: 700,
        lineHeight: 1,
        padding: "2px 5px",
        borderRadius: "6px",
        whiteSpace: "nowrap",
        fontFamily: "var(--font-family)",
        marginLeft: "auto",
        flexShrink: 0,
      }}
    >
      {text}
    </span>
  );
}

// ── Draggable item row ──────────────────────────────────────────────────────
interface ToolRowProps {
  item: NavItem;
  onNavigate: (id: string) => void;
}

function ToolRow({ item, onNavigate }: ToolRowProps) {
  const Icon = item.icon;
  const [hover, setHover] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        // Tag the drag as originating from the drawer
        e.dataTransfer.setData(DRAG_SOURCE_DRAWER, item.id);
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onNavigate(item.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "6px",
        background: hover ? "rgba(161,189,198,0.08)" : "transparent",
        cursor: "grab",
        transition: "background 0.1s",
        fontFamily: "var(--font-family)",
      }}
    >
      <GripVertical
        size={14}
        style={{ color: "#5a7a84", flexShrink: 0, opacity: 0.6 }}
      />
      <Icon size={16} strokeWidth={1.5} style={{ color: "#a1bdc6", flexShrink: 0 }} />
      <span
        style={{
          color: "#dfe9ec",
          fontSize: "13px",
          fontWeight: 400,
          whiteSpace: "nowrap",
        }}
      >
        {item.label}
      </span>
      {item.badge && <Badge text={item.badge} />}
    </div>
  );
}

// ── MoreToolsDrawer ─────────────────────────────────────────────────────────
const DRAWER_WIDTH = 220;

interface MoreToolsDrawerProps {
  open: boolean;
  items: NavItem[];
  onClose: () => void;
  onNavigate: (id: string) => void;
  onPinItem: (id: string, atIndex?: number) => void;
  onUnpinItem: (id: string) => void;
}

export function MoreToolsDrawer({
  open,
  items,
  onClose,
  onNavigate,
  onPinItem,
  onUnpinItem,
}: MoreToolsDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node)
      ) {
        // Don't close if they clicked the sidebar itself
        const sidebar = document.querySelector("aside");
        if (sidebar && sidebar.contains(e.target as Node)) return;
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Accept drops FROM the sidebar → unpin the item
  const handleDragOver = useCallback((e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    if (types.includes(DRAG_SOURCE_SIDEBAR)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsDropTarget(true);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const types = Array.from(e.dataTransfer.types);
      if (types.includes(DRAG_SOURCE_SIDEBAR)) {
        const id = e.dataTransfer.getData("text/plain");
        if (id) onUnpinItem(id);
      }
      setIsDropTarget(false);
    },
    [onUnpinItem],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the drawer entirely (not entering a child)
    if (drawerRef.current && !drawerRef.current.contains(e.relatedTarget as Node)) {
      setIsDropTarget(false);
    }
  }, []);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            top: 44,
            left: SIDEBAR_WIDTH,
            background: "rgba(0,0,0,0.35)",
            zIndex: 78,
          }}
        />
      )}

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
        style={{
          position: "fixed",
          top: 44,
          left: SIDEBAR_WIDTH,
          bottom: 0,
          width: open ? DRAWER_WIDTH : 0,
          background: "#182023",
          borderRight: open ? "1px solid rgba(161,189,198,0.15)" : "none",
          zIndex: 79,
          overflow: "hidden",
          transition: "width 0.2s ease",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-family)",
          outline: isDropTarget ? "2px dashed #00c4a0" : "none",
          outlineOffset: "-2px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 12px 10px",
            borderBottom: "1px solid rgba(161,189,198,0.12)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: "#dfe9ec",
              fontSize: "13px",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            More Tools
          </span>
          <button
            onClick={onClose}
            aria-label="Close more tools"
            style={{
              background: "transparent",
              border: "none",
              color: "#a1bdc6",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Hint text */}
        <div
          style={{
            padding: "8px 12px 4px",
            color: "#5a7a84",
            fontSize: "11px",
            lineHeight: 1.4,
            whiteSpace: "nowrap",
          }}
        >
          Drag to menu bar or click to navigate
        </div>

        {/* Item list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "4px 6px",
          }}
        >
          {items.length === 0 ? (
            <div
              style={{
                color: "#5a7a84",
                fontSize: "12px",
                padding: "16px 12px",
                textAlign: "center",
              }}
            >
              All tools are pinned to your menu
            </div>
          ) : (
            items.map((item) => (
              <ToolRow
                key={item.id}
                item={item}
                onNavigate={(id) => {
                  onNavigate(id);
                  onClose();
                }}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
