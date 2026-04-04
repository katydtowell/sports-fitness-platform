import { useState, useRef, useCallback } from "react";
import { Ellipsis } from "lucide-react";
import type { NavItem } from "./navTypes";

/** Width of the sidebar in pixels — exported so Layout can use it for spacing. */
export const SIDEBAR_WIDTH = 68;

/**
 * Custom MIME types used to identify the drag source so the Sidebar and
 * MoreToolsDrawer can distinguish internal reorders from cross-panel moves.
 *
 * HTML5 DnD lets us read `dataTransfer.types` during dragover (but not the
 * actual data). We set a custom type whose *presence* tells the drop target
 * where the drag originated. The actual item id is stored in "text/plain".
 */
export const DRAG_SOURCE_SIDEBAR = "application/x-sidebar-item";
export const DRAG_SOURCE_DRAWER  = "application/x-drawer-item";

// ── Badge chip ──────────────────────────────────────────────────────────────
function Badge({ text }: { text: string }) {
  return (
    <span
      style={{
        position: "absolute",
        top: 2,
        right: 2,
        background: "#00c4a0",
        color: "#0a0e0f",
        fontSize: "8px",
        fontWeight: 700,
        lineHeight: 1,
        padding: "2px 4px",
        borderRadius: "6px",
        whiteSpace: "nowrap",
        fontFamily: "var(--font-family)",
        pointerEvents: "none",
      }}
    >
      {text}
    </span>
  );
}

// ── Single nav button ───────────────────────────────────────────────────────
interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  index: number;
  onClick: (id: string) => void;
  isDragTarget: boolean;
  isExternalDragTarget: boolean;
}

function NavButton({
  item,
  isActive,
  index,
  onClick,
  isDragTarget,
  isExternalDragTarget,
}: NavButtonProps) {
  const Icon = item.icon;
  const showDropIndicator = isDragTarget || isExternalDragTarget;

  return (
    <button
      draggable
      onDragStart={(e) => {
        // Tag drag as originating from the sidebar
        e.dataTransfer.setData(DRAG_SOURCE_SIDEBAR, item.id);
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      data-sidebar-index={index}
      data-item-id={item.id}
      onClick={() => onClick(item.id)}
      className="w-full"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px",
        padding: "10px 4px",
        background: isActive
          ? "rgba(0,196,160,0.12)"
          : showDropIndicator
          ? "rgba(0,196,160,0.06)"
          : "transparent",
        borderLeft: isActive ? "3px solid #00c4a0" : "3px solid transparent",
        borderTop: showDropIndicator ? "2px solid #00c4a0" : "2px solid transparent",
        borderRight: "none",
        borderBottom: "none",
        color: isActive ? "#00c4a0" : "#a1bdc6",
        fontSize: "9px",
        fontWeight: isActive ? 600 : 400,
        fontFamily: "var(--font-family)",
        cursor: "grab",
        lineHeight: 1.2,
        textAlign: "center",
        transition: "background 0.12s, border-color 0.12s",
      }}
    >
      <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
      <span>{item.label}</span>
      {item.badge && <Badge text={item.badge} />}
    </button>
  );
}

// ── Drop zone at the bottom of the pinned list ─────────────────────────────
function BottomDropZone({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        height: visible ? "36px" : "8px",
        borderTop: visible ? "2px solid #00c4a0" : "2px solid transparent",
        background: visible ? "rgba(0,196,160,0.06)" : "transparent",
        transition: "all 0.12s",
        flexShrink: 0,
      }}
    />
  );
}

// ── Fixed Home button (not draggable) ───────────────────────────────────────
function HomeButton({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: (id: string) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onClick(item.id)}
      className="w-full"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px",
        padding: "10px 4px",
        background: isActive ? "rgba(0,196,160,0.12)" : "transparent",
        borderLeft: isActive ? "3px solid #00c4a0" : "3px solid transparent",
        borderTop: "none",
        borderRight: "none",
        borderBottom: "1px solid rgba(161,189,198,0.10)",
        color: isActive ? "#00c4a0" : "#a1bdc6",
        fontSize: "9px",
        fontWeight: isActive ? 600 : 400,
        fontFamily: "var(--font-family)",
        cursor: "pointer",
        lineHeight: 1.2,
        textAlign: "center",
        transition: "background 0.12s",
      }}
    >
      <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
      <span>{item.label}</span>
    </button>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────────────
interface SidebarProps {
  homeItem: NavItem;
  pinnedItems: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onUnpin: (id: string) => void;
  onPinItem: (id: string, atIndex?: number) => void;
  onOpenMoreTools: () => void;
  moreToolsOpen: boolean;
}

export function Sidebar({
  homeItem,
  pinnedItems,
  activeId,
  onSelect,
  onReorder,
  onUnpin,
  onPinItem,
  onOpenMoreTools,
  moreToolsOpen,
}: SidebarProps) {
  // Which pinned-item index is the cursor hovering over?
  const [overIndex, setOverIndex] = useState<number | null>(null);
  // Is the drag from the sidebar (internal reorder) or from the drawer?
  const [dragSource, setDragSource] = useState<"sidebar" | "drawer" | null>(null);
  // Track the sidebar item being dragged (by index) for internal reorder
  const dragIndexRef = useRef<number | null>(null);
  // Is the cursor hovering over the bottom drop zone?
  const [overBottom, setOverBottom] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // ── Detect drag source from dataTransfer.types ──
  const detectSource = useCallback((e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    if (types.includes(DRAG_SOURCE_SIDEBAR)) return "sidebar";
    if (types.includes(DRAG_SOURCE_DRAWER)) return "drawer";
    return null;
  }, []);

  // ── Handlers for individual nav buttons ──

  const handleItemDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      const source = detectSource(e);
      setDragSource(source);
      setOverIndex(index);
      setOverBottom(false);
    },
    [detectSource],
  );

  const handleItemDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      const source = detectSource(e);

      if (source === "sidebar") {
        // Internal reorder
        const fromIndex = dragIndexRef.current;
        if (fromIndex !== null && fromIndex !== targetIndex) {
          onReorder(fromIndex, targetIndex);
        }
      } else if (source === "drawer") {
        // Coming from More Tools drawer → pin at this position
        const id = e.dataTransfer.getData("text/plain");
        if (id) onPinItem(id, targetIndex);
      }

      setOverIndex(null);
      setDragSource(null);
      setOverBottom(false);
      dragIndexRef.current = null;
    },
    [detectSource, onReorder, onPinItem],
  );

  // Track which sidebar index is being dragged (set by onDragStart on button)
  const handleItemDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    setDragSource("sidebar");
  }, []);

  const handleItemDragEnd = useCallback(() => {
    dragIndexRef.current = null;
    setOverIndex(null);
    setDragSource(null);
    setOverBottom(false);
  }, []);

  // ── Bottom drop zone (append to end) ──
  const handleBottomDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setDragSource(detectSource(e));
      setOverBottom(true);
      setOverIndex(null);
    },
    [detectSource],
  );

  const handleBottomDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const source = detectSource(e);
      const endIndex = pinnedItems.length;

      if (source === "sidebar") {
        const fromIndex = dragIndexRef.current;
        if (fromIndex !== null && fromIndex !== endIndex - 1) {
          onReorder(fromIndex, endIndex - 1);
        }
      } else if (source === "drawer") {
        const id = e.dataTransfer.getData("text/plain");
        if (id) onPinItem(id, endIndex);
      }

      setOverIndex(null);
      setDragSource(null);
      setOverBottom(false);
      dragIndexRef.current = null;
    },
    [detectSource, pinnedItems.length, onReorder, onPinItem],
  );

  // ── Sidebar-level dragover (needed so the browser allows drops) ──
  const handleSidebarDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <aside
      ref={sidebarRef}
      className="shrink-0 flex flex-col"
      onDragOver={handleSidebarDragOver}
      style={{
        position: "fixed",
        top: 44,
        left: 0,
        bottom: 0,
        width: `${SIDEBAR_WIDTH}px`,
        background: "#182023",
        borderRight: "1px solid rgba(161,189,198,0.15)",
        fontFamily: "var(--font-family)",
        overflowY: "auto",
        overflowX: "hidden",
        zIndex: 80,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Fixed Home item (not draggable / removable) ── */}
      <HomeButton item={homeItem} isActive={activeId === homeItem.id} onClick={onSelect} />

      {/* ── Pinned nav items ── */}
      <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
        {pinnedItems.map((item, i) => (
          <div
            key={item.id}
            onDragStart={(e) => handleItemDragStart(e, i)}
            onDragOver={(e) => handleItemDragOver(e, i)}
            onDrop={(e) => handleItemDrop(e, i)}
            onDragEnd={handleItemDragEnd}
          >
            <NavButton
              item={item}
              isActive={item.id === activeId}
              index={i}
              onClick={onSelect}
              isDragTarget={
                overIndex === i &&
                dragSource === "sidebar" &&
                dragIndexRef.current !== i
              }
              isExternalDragTarget={overIndex === i && dragSource === "drawer"}
            />
          </div>
        ))}

        {/* Drop zone at the bottom of the list (append) */}
        <div
          onDragOver={handleBottomDragOver}
          onDrop={handleBottomDrop}
          onDragLeave={() => setOverBottom(false)}
        >
          <BottomDropZone visible={overBottom && dragSource !== null} />
        </div>
      </div>

      {/* ── More Tools button (pinned to bottom) ── */}
      <button
        onClick={onOpenMoreTools}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "3px",
          padding: "12px 4px",
          background: moreToolsOpen ? "rgba(0,196,160,0.12)" : "transparent",
          borderLeft: moreToolsOpen ? "3px solid #00c4a0" : "3px solid transparent",
          borderTop: "1px solid rgba(161,189,198,0.12)",
          borderRight: "none",
          borderBottom: "none",
          color: moreToolsOpen ? "#00c4a0" : "#a1bdc6",
          fontSize: "9px",
          fontWeight: moreToolsOpen ? 600 : 400,
          fontFamily: "var(--font-family)",
          cursor: "pointer",
          lineHeight: 1.2,
          width: "100%",
          flexShrink: 0,
          transition: "background 0.12s, color 0.12s",
        }}
      >
        <Ellipsis size={18} strokeWidth={1.5} />
        <span>More Tools</span>
      </button>
    </aside>
  );
}
