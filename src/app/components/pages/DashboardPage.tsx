/**
 * DashboardPage — the Home / Dashboard view.
 *
 * Features:
 *  • Announcements carousel with mark-as-read / show-again toggle
 *  • Draggable widget grid (swap positions, move to new rows)
 *  • Per-widget three-dot menu with Replace / Remove
 *  • "Add Widgets" side panel opened via gear icon
 *
 * Uses the app's ThemeContext palette so it respects dark / light mode.
 */

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  MoreHorizontal,
  Settings,
  GripVertical,
  RefreshCw,
  Trash2,
  Plus,
  LayoutGrid,
  UserCheck,
  Calendar,
  Users,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme, type ThemePalette } from "../layout/ThemeContext";
import { useSidePanel } from "../layout/SidePanelContext";
import { useIsMobile } from "../ui/use-mobile";

/* ═══════════════════════════════════════════════════════════════════════════
   STATIC DATA
   ═══════════════════════════════════════════════════════════════════════ */

interface Announcement {
  id: number;
  title: string;
  body: string;
  cta: { label: string; variant: "primary" | "outline" }[];
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 1,
    title: "Try our new feature!",
    body: "It's a feature, and it's new. You can use it. You can also not use it. If you want to use it, you have to pay for it. But you can try it free for a little bit. Please?",
    cta: [{ label: "Check It Out", variant: "primary" }],
  },
  {
    id: 2,
    title: "EZFacility Support will be closed for the holiday.",
    body: "If you need assistance, leave a message and a representative will reach out when the office is open on 10/31/2029.",
    cta: [
      { label: "Visit the Support Portal", variant: "outline" },
      { label: "Message Us", variant: "primary" },
    ],
  },
  {
    id: 3,
    title: "Scheduled maintenance this weekend",
    body: "We'll be performing routine maintenance on Saturday from 2 AM–6 AM EST. Some services may be briefly unavailable during this window.",
    cta: [{ label: "Learn More", variant: "outline" }],
  },
];

const REPORT_DATA = [
  { hour: "6 AM", value: 8 },
  { hour: "7 AM", value: 12 },
  { hour: "8 AM", value: 20 },
  { hour: "9 AM", value: 28 },
  { hour: "10 AM", value: 18 },
  { hour: "11 AM", value: 15 },
  { hour: "12 PM", value: 22 },
  { hour: "1 PM", value: 25 },
  { hour: "2 PM", value: 20 },
  { hour: "3 PM", value: 30 },
  { hour: "4 PM", value: 35 },
  { hour: "5 PM", value: 38 },
  { hour: "6 PM", value: 42 },
  { hour: "7 PM", value: 45 },
  { hour: "8 PM", value: 32 },
  { hour: "9 PM", value: 18 },
];

interface Session {
  time: string;
  type: string;
  instructor: string;
  booked: number;
  available: number;
  studio: string;
  color: string;
}

const SESSIONS: Session[] = [
  { time: "7am", type: "TRX training", instructor: "Emily Ewing", booked: 4, available: 6, studio: "Studio A", color: "#ef4444" },
  { time: "8am", type: "Personal training", instructor: "Fred Farnsworth", booked: 1, available: 0, studio: "Studio C", color: "#3b82f6" },
  { time: "8:30am", type: "Yoga training", instructor: "Alan Alda", booked: 5, available: 7, studio: "Studio B", color: "#f59e0b" },
  { time: "9am", type: "TRX training", instructor: "Emily Ewing", booked: 3, available: 4, studio: "Studio A", color: "#22c55e" },
];

interface TaskItem {
  id: number;
  title: string;
  due: string;
  priority: "High" | "Medium" | "Low";
  done: boolean;
}

const INITIAL_TASKS: TaskItem[] = [
  { id: 1, title: "Review new member applications", due: "Today", priority: "High", done: false },
  { id: 2, title: "Update class schedule for next week", due: "Tomorrow", priority: "Medium", done: false },
  { id: 3, title: "Order equipment for Studio B", due: "Apr 7", priority: "Low", done: true },
  { id: 4, title: "Follow up with vendor invoice", due: "Apr 8", priority: "Medium", done: false },
];

const REVENUE_DATA = [
  { month: "Jan", amount: 12400 },
  { month: "Feb", amount: 15200 },
  { month: "Mar", amount: 13800 },
  { month: "Apr", amount: 16500 },
];

interface WidgetDef {
  type: string;
  title: string;
  description: string;
}

const ALL_WIDGET_DEFS: WidgetDef[] = [
  { type: "reports", title: "Reports", description: "View daily attendance and peak hours" },
  { type: "sessions", title: "Upcoming Sessions", description: "See today's scheduled sessions" },
  { type: "tasks", title: "Tasks", description: "Track your to-do items" },
  { type: "revenue", title: "Revenue", description: "Monthly revenue overview" },
  { type: "quickActions", title: "Quick Actions", description: "Shortcuts to common actions" },
  { type: "memberStats", title: "Member Stats", description: "Active members overview" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SMALL REUSABLE BITS
   ═══════════════════════════════════════════════════════════════════════ */

function Btn({
  children,
  variant = "primary",
  onClick,
  style,
  palette,
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline";
  onClick?: () => void;
  style?: CSSProperties;
  palette: ThemePalette;
}) {
  const base: CSSProperties = {
    padding: "10px 24px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: "var(--text-base)",
    cursor: "pointer",
    border: "none",
    transition: "all .15s",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "var(--font-family)",
  };
  const styles: Record<string, CSSProperties> = {
    primary: { ...base, background: palette.primary, color: palette.textReversed, ...style },
    outline: {
      ...base,
      background: "transparent",
      color: palette.primary,
      border: `1.5px solid ${palette.primary}`,
      ...style,
    },
  };
  return (
    <button style={styles[variant]} onClick={onClick}>
      {children}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  active,
  style,
  palette,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  active?: boolean;
  style?: CSSProperties;
  palette: ThemePalette;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: active ? `${palette.primary}18` : "transparent",
        border: "none",
        borderRadius: 8,
        padding: 8,
        cursor: "pointer",
        color: active ? palette.primary : palette.iconSecondary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all .15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WIDGET CONTENT RENDERERS
   ═══════════════════════════════════════════════════════════════════════ */

function ReportsWidget({ palette }: { palette: ThemePalette }) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <p style={{ color: palette.textTertiary, fontSize: "var(--text-sm)", margin: "0 0 8px 4px" }}>
        Peak: 45 at 7 PM
      </p>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={REPORT_DATA} barCategoryGap="18%">
          <CartesianGrid stroke={palette.outlineTertiary} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fill: palette.textDisabled, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fill: palette.textDisabled, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: palette.surfacePrimary,
              border: `1px solid ${palette.outlineTertiary}`,
              borderRadius: 8,
              color: palette.textPrimary,
              fontFamily: "var(--font-family)",
            }}
            cursor={{ fill: `${palette.primary}10` }}
          />
          <Bar dataKey="value" fill={palette.primary} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SessionsWidget({ palette }: { palette: ThemePalette }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {SESSIONS.map((s, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 0",
            borderBottom: i < SESSIONS.length - 1 ? `1px solid ${palette.outlineTertiary}` : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: s.color,
                marginTop: 5,
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: palette.textPrimary, fontWeight: 600, fontSize: "var(--text-base)" }}>
                  {s.time}
                </span>
                <span style={{ color: palette.primary, fontWeight: 500, fontSize: "var(--text-base)" }}>
                  {s.type}
                </span>
              </div>
              <div style={{ color: palette.textTertiary, fontSize: "var(--text-sm)", marginTop: 2 }}>
                {s.booked} booked, {s.available} available
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  color: palette.textDisabled,
                  fontSize: "var(--text-sm)",
                  marginTop: 2,
                }}
              >
                <span>{s.instructor}</span>
                <span>{s.studio}</span>
              </div>
            </div>
          </div>
          <Btn
            palette={palette}
            variant={s.available === 0 ? "outline" : "primary"}
            style={{ padding: "6px 20px", fontSize: "var(--text-sm)" }}
          >
            {s.available === 0 ? "Full" : "Book"}
          </Btn>
        </div>
      ))}
    </div>
  );
}

function TasksWidget({ palette }: { palette: ThemePalette }) {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const toggle = (id: number) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const pColor: Record<string, string> = {
    High: "#ef4444",
    Medium: "#f59e0b",
    Low: "#22c55e",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {tasks.map((t, i) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 0",
            borderBottom: i < tasks.length - 1 ? `1px solid ${palette.outlineTertiary}` : "none",
          }}
        >
          <div
            onClick={() => toggle(t.id)}
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              cursor: "pointer",
              flexShrink: 0,
              border: t.done ? "none" : `2px solid ${palette.outlineSecondary}`,
              background: t.done ? palette.primary : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {t.done && <Check size={14} color={palette.textReversed} />}
          </div>
          <div style={{ flex: 1 }}>
            <span
              style={{
                color: t.done ? palette.textDisabled : palette.textPrimary,
                fontSize: "var(--text-base)",
                textDecoration: t.done ? "line-through" : "none",
              }}
            >
              {t.title}
            </span>
            <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
              <span style={{ color: palette.textDisabled, fontSize: "var(--text-sm)" }}>{t.due}</span>
              <span style={{ color: pColor[t.priority], fontSize: "var(--text-sm)", fontWeight: 600 }}>
                {t.priority}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RevenueWidget({ palette }: { palette: ThemePalette }) {
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={REVENUE_DATA} barCategoryGap="25%">
          <CartesianGrid stroke={palette.outlineTertiary} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: palette.textDisabled, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: palette.textDisabled, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={45}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: palette.surfacePrimary,
              border: `1px solid ${palette.outlineTertiary}`,
              borderRadius: 8,
              color: palette.textPrimary,
              fontFamily: "var(--font-family)",
            }}
            formatter={(v) => [`$${Number(v).toLocaleString()}`, "Revenue"] as [string, string]}
          />
          <Bar dataKey="amount" fill={palette.containerInfo} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function QuickActionsWidget({ palette }: { palette: ThemePalette }) {
  const actions = [
    { icon: <UserCheck size={20} />, label: "Check In" },
    { icon: <Calendar size={20} />, label: "Book Session" },
    { icon: <Users size={20} />, label: "Add Member" },
    { icon: <FileText size={20} />, label: "New Invoice" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {actions.map((a, i) => (
        <button
          key={i}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            padding: 20,
            borderRadius: 10,
            border: `1px solid ${palette.outlineTertiary}`,
            background: palette.surfaceSecondary,
            color: palette.textTertiary,
            cursor: "pointer",
            transition: "all .15s",
            fontFamily: "var(--font-family)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = palette.primary;
            e.currentTarget.style.color = palette.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = palette.outlineTertiary;
            e.currentTarget.style.color = palette.textTertiary;
          }}
        >
          {a.icon}
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{a.label}</span>
        </button>
      ))}
    </div>
  );
}

function MemberStatsWidget({ palette }: { palette: ThemePalette }) {
  const stats = [
    { label: "Active Members", value: "1,247", change: "+12%" },
    { label: "New This Month", value: "38", change: "+5%" },
    { label: "Expiring Soon", value: "15", change: "" },
    { label: "Checked In Today", value: "89", change: "" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {stats.map((s, i) => (
        <div
          key={i}
          style={{
            padding: 16,
            borderRadius: 10,
            background: palette.surfaceSecondary,
            border: `1px solid ${palette.outlineTertiary}`,
          }}
        >
          <div style={{ color: palette.textDisabled, fontSize: "var(--text-sm)", marginBottom: 4 }}>
            {s.label}
          </div>
          <div style={{ color: palette.textPrimary, fontSize: 22, fontWeight: 700 }}>{s.value}</div>
          {s.change && (
            <div style={{ color: palette.textSuccess, fontSize: "var(--text-sm)", fontWeight: 600, marginTop: 2 }}>
              {s.change}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const WIDGET_RENDERERS: Record<string, React.FC<{ palette: ThemePalette }>> = {
  reports: ReportsWidget,
  sessions: SessionsWidget,
  tasks: TasksWidget,
  revenue: RevenueWidget,
  quickActions: QuickActionsWidget,
  memberStats: MemberStatsWidget,
};

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════════════════ */

interface Widget {
  id: string;
  type: string;
}

export function DashboardPage() {
  const { palette } = useTheme();
  const isMobile = useIsMobile();

  /* ── announcements ── */
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [announcementsHidden, setAnnouncementsHidden] = useState(false);

  const safeIndex = ANNOUNCEMENTS.length > 0
    ? announcementIndex % ANNOUNCEMENTS.length
    : 0;

  const markAllRead = () => setAnnouncementsHidden(true);
  const showAnnouncements = () => {
    setAnnouncementsHidden(false);
    setAnnouncementIndex(0);
  };

  const prevAnnouncement = () =>
    setAnnouncementIndex((i) => (i - 1 + ANNOUNCEMENTS.length) % ANNOUNCEMENTS.length);
  const nextAnnouncement = () =>
    setAnnouncementIndex((i) => (i + 1) % ANNOUNCEMENTS.length);

  /* ── widgets ── */
  const [widgets, setWidgets] = useState<Widget[][]>([
    [
      { id: "w1", type: "reports" },
      { id: "w2", type: "sessions" },
    ],
  ]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const { openPanel, closePanel } = useSidePanel();

  const flatWidgets = widgets.flat();
  const usedTypes = new Set(flatWidgets.map((w) => w.type));
  // Available for the "Add Widget" panel — used later when panel is wired up.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const availableTypes = ALL_WIDGET_DEFS.filter((d) => !usedTypes.has(d.type)); void availableTypes;

  /* drag helpers */
  const handleDragStart = (rowIdx: number, colIdx: number) => {
    setDragState({ rowIdx, colIdx });
  };
  const handleDragOver = (e: React.DragEvent, rowIdx: number, colIdx: number) => {
    e.preventDefault();
    if (dragState && (dragState.rowIdx !== rowIdx || dragState.colIdx !== colIdx)) {
      setDropTarget({ rowIdx, colIdx });
    }
  };
  const handleDrop = (e: React.DragEvent, toRow: number, toCol: number) => {
    e.preventDefault();
    if (!dragState) return;
    const { rowIdx: fromRow, colIdx: fromCol } = dragState;
    const newWidgets = widgets.map((r) => [...r]);
    const draggedWidget = newWidgets[fromRow][fromCol];

    if (toRow === widgets.length) {
      newWidgets[fromRow].splice(fromCol, 1);
      newWidgets.push([draggedWidget]);
    } else {
      const targetWidget = newWidgets[toRow][toCol];
      newWidgets[fromRow][fromCol] = targetWidget;
      newWidgets[toRow][toCol] = draggedWidget;
    }
    setWidgets(newWidgets.filter((r) => r.length > 0));
    setDragState(null);
    setDropTarget(null);
  };
  const handleDragEnd = () => {
    setDragState(null);
    setDropTarget(null);
  };

  /* widget actions */
  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.map((row) => row.filter((w) => w.id !== id)).filter((r) => r.length > 0));
    setMenuOpen(null);
  };

  const doAddWidget = useCallback((type: string, replaceId: string | null) => {
    const id = "w" + Date.now();
    if (replaceId) {
      setWidgets((prev) => prev.map((row) => row.map((w) => (w.id === replaceId ? { id, type } : w))));
    } else {
      setWidgets((prev) => {
        const copy = prev.map((r) => [...r]);
        const last = copy[copy.length - 1];
        if (last && last.length < 2) last.push({ id, type });
        else copy.push([{ id, type }]);
        return copy;
      });
    }
    setMenuOpen(null);
    closePanel();
  }, [closePanel]);

  const openWidgetsPanel = useCallback((replaceId: string | null = null) => {
    const currentWidgets = widgets.flat();
    const currentUsed = new Set(currentWidgets.map((w) => w.type));
    const replaceTargetWidget = replaceId ? currentWidgets.find((w) => w.id === replaceId) : null;

    const items = replaceId
      ? ALL_WIDGET_DEFS.filter((d) => d.type !== replaceTargetWidget?.type)
      : ALL_WIDGET_DEFS.filter((d) => !currentUsed.has(d.type));

    openPanel(
      <WidgetsPanelContent
        items={items}
        usedTypes={currentUsed}
        replaceId={replaceId}
        onSelect={(type) => doAddWidget(type, replaceId)}
      />,
      {
        size: "quarter",
        title: replaceId ? "Replace Widget" : "Add Widgets",
      }
    );
  }, [widgets, openPanel, doAddWidget]);

  const startReplace = (widgetId: string) => {
    openWidgetsPanel(widgetId);
    setMenuOpen(null);
  };

  /* click-outside to close menu */
  useEffect(() => {
    const handler = () => setMenuOpen(null);
    if (menuOpen) window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [menuOpen]);

  /* ═════════ RENDER ═════════ */
  return (
    <div style={{ fontFamily: "var(--font-family)", padding: isMobile ? "16px 16px 32px" : "24px 28px 40px", position: "relative" }}>
      {/* ──── ANNOUNCEMENTS ──── */}
      <section style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: announcementsHidden ? 0 : 16,
          }}
        >
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, margin: 0, color: palette.textPrimary }}>
            Announcements
          </h2>
          {!announcementsHidden && (
            <IconBtn
              palette={palette}
              title="Mark all as read"
              onClick={markAllRead}
            >
              <Check size={20} />
            </IconBtn>
          )}
        </div>

        {announcementsHidden ? (
          <button
            onClick={showAnnouncements}
            style={{
              width: "100%",
              background: palette.surfacePrimary,
              border: "none",
              borderRadius: 12,
              color: palette.primary,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "var(--text-base)",
              fontFamily: "var(--font-family)",
              padding: "16px 0",
              textAlign: "center",
              marginTop: 16,
            }}
          >
            See recent announcements
          </button>
        ) : (
          <div style={{ position: "relative" }}>
            {/* carousel track */}
            <div style={{ display: "flex", gap: 20, overflow: "hidden" }}>
              {ANNOUNCEMENTS.map((a) => {
                const cardWidth = isMobile ? "100%" : "calc(50% - 10px)";
                const shift = isMobile
                  ? `translateX(calc(${-safeIndex * 100}% - ${safeIndex * 20}px))`
                  : `translateX(calc(${-safeIndex * 100}% - ${safeIndex * 20}px))`;
                return (
                <div
                  key={a.id}
                  style={{
                    minWidth: cardWidth,
                    flex: `0 0 ${cardWidth}`,
                    background: palette.surfacePrimary,
                    border: `1px solid ${palette.outlineTertiary}`,
                    borderRadius: 14,
                    padding: isMobile ? "24px 20px" : "32px 36px",
                    transform: shift,
                    transition: "transform .4s cubic-bezier(.4,0,.2,1)",
                    position: "relative",
                  }}
                >
                  <h3
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      margin: "0 0 12px",
                      lineHeight: 1.25,
                      color: palette.textPrimary,
                    }}
                  >
                    {a.title}
                  </h3>
                  <p
                    style={{
                      color: palette.textTertiary,
                      fontSize: "var(--text-lg)",
                      lineHeight: 1.6,
                      margin: "0 0 20px",
                    }}
                  >
                    {a.body}
                  </p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {a.cta.map((c, ci) => (
                      <Btn key={ci} palette={palette} variant={c.variant}>
                        {c.label}
                      </Btn>
                    ))}
                  </div>
                </div>
                );
              })}
            </div>

            {/* arrows */}
            {ANNOUNCEMENTS.length > 1 && (
              <>
                <button
                  onClick={prevAnnouncement}
                  style={{
                    position: "absolute",
                    left: -18,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    border: `1px solid ${palette.outlineTertiary}`,
                    background: palette.surfacePrimary,
                    color: palette.textPrimary,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 4px 12px ${palette.shadow}`,
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextAnnouncement}
                  style={{
                    position: "absolute",
                    right: -18,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    border: `1px solid ${palette.outlineTertiary}`,
                    background: palette.surfacePrimary,
                    color: palette.textPrimary,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 4px 12px ${palette.shadow}`,
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
              {ANNOUNCEMENTS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setAnnouncementIndex(i)}
                  style={{
                    width: i === safeIndex ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    border: "none",
                    cursor: "pointer",
                    background: i === safeIndex ? palette.primary : palette.outlineTertiary,
                    transition: "all .3s",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ──── WIDGETS SECTION ──── */}
      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, margin: 0, color: palette.textPrimary }}>
            Widgets
          </h2>
          <IconBtn
            palette={palette}
            title="Manage Widgets"
            onClick={() => openWidgetsPanel(null)}
          >
            <Settings size={20} />
          </IconBtn>
        </div>

        {widgets.length === 0 && (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              color: palette.textDisabled,
              background: palette.surfacePrimary,
              borderRadius: 14,
              border: `2px dashed ${palette.outlineTertiary}`,
            }}
          >
            <LayoutGrid size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: 16, margin: "0 0 16px" }}>No widgets added yet</p>
            <Btn palette={palette} onClick={() => openWidgetsPanel(null)}>
              <Plus size={16} /> Add Widgets
            </Btn>
          </div>
        )}

        {widgets.map((row, rowIdx) => (
          <div key={rowIdx} style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 20, marginBottom: 20 }}>
            {row.map((widget, colIdx) => {
              const def = ALL_WIDGET_DEFS.find((d) => d.type === widget.type);
              const Renderer = WIDGET_RENDERERS[widget.type];
              const isDragOver = dropTarget?.rowIdx === rowIdx && dropTarget?.colIdx === colIdx;
              return (
                <div
                  key={widget.id}
                  draggable={!isMobile}
                  onDragStart={isMobile ? undefined : () => handleDragStart(rowIdx, colIdx)}
                  onDragOver={isMobile ? undefined : (e) => handleDragOver(e, rowIdx, colIdx)}
                  onDrop={isMobile ? undefined : (e) => handleDrop(e, rowIdx, colIdx)}
                  onDragEnd={isMobile ? undefined : handleDragEnd}
                  style={{
                    flex: 1,
                    background: palette.surfacePrimary,
                    borderRadius: 14,
                    border: `1px solid ${isDragOver && !isMobile ? palette.primary : palette.outlineTertiary}`,
                    padding: isMobile ? "16px" : "20px 24px",
                    position: "relative",
                    transition: "border-color .2s, box-shadow .2s",
                    boxShadow: isDragOver && !isMobile ? `0 0 0 2px ${palette.primary}40` : "none",
                    cursor: isMobile ? "default" : "grab",
                  }}
                >
                  {/* widget header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {!isMobile && (
                        <GripVertical
                          size={16}
                          color={palette.textDisabled}
                          style={{ cursor: "grab", opacity: 0.5 }}
                        />
                      )}
                      <h3 style={{ fontSize: "var(--text-xl)", fontWeight: 700, margin: 0, color: palette.textPrimary }}>
                        {def?.title || widget.type}
                      </h3>
                    </div>
                    <div style={{ position: "relative" }}>
                      <IconBtn
                        palette={palette}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === widget.id ? null : widget.id);
                        }}
                      >
                        <MoreHorizontal size={20} />
                      </IconBtn>
                      {menuOpen === widget.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            right: 0,
                            top: 38,
                            background: palette.surfacePrimary,
                            border: `1px solid ${palette.outlineTertiary}`,
                            borderRadius: 10,
                            boxShadow: `0 8px 24px ${palette.shadow}`,
                            zIndex: 50,
                            minWidth: 180,
                            overflow: "hidden",
                          }}
                        >
                          <button
                            onClick={() => startReplace(widget.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              width: "100%",
                              padding: "12px 16px",
                              border: "none",
                              background: "transparent",
                              color: palette.textPrimary,
                              fontSize: "var(--text-base)",
                              cursor: "pointer",
                              textAlign: "left",
                              fontFamily: "var(--font-family)",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = palette.hoverBg)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <RefreshCw size={16} color={palette.iconSecondary} /> Replace Widget
                          </button>
                          <button
                            onClick={() => removeWidget(widget.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              width: "100%",
                              padding: "12px 16px",
                              border: "none",
                              background: "transparent",
                              color: palette.textError,
                              fontSize: "var(--text-base)",
                              cursor: "pointer",
                              textAlign: "left",
                              fontFamily: "var(--font-family)",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = palette.hoverBg)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Trash2 size={16} /> Remove Widget
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* widget body */}
                  {Renderer ? (
                    <Renderer palette={palette} />
                  ) : (
                    <div style={{ color: palette.textDisabled, padding: 20 }}>Widget not found</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* drop zone for new row (desktop/tablet only) */}
        {widgets.length > 0 && !isMobile && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget({ rowIdx: widgets.length, colIdx: 0 });
            }}
            onDrop={(e) => handleDrop(e, widgets.length, 0)}
            onDragLeave={() => setDropTarget(null)}
            style={{
              border: `2px dashed ${
                dropTarget?.rowIdx === widgets.length ? palette.primary : palette.outlineTertiary
              }`,
              borderRadius: 14,
              padding: 20,
              textAlign: "center",
              color: palette.textDisabled,
              fontSize: "var(--text-sm)",
              transition: "all .2s",
              marginBottom: 20,
              background:
                dropTarget?.rowIdx === widgets.length ? `${palette.primary}08` : "transparent",
            }}
          >
            Drop here to create a new row
          </div>
        )}
      </section>

    </div>
  );
}

/* ── Panel content rendered inside the app's SidePanel ── */
function WidgetsPanelContent({
  items,
  usedTypes,
  replaceId,
  onSelect,
}: {
  items: WidgetDef[];
  usedTypes: Set<string>;
  replaceId: string | null;
  onSelect: (type: string) => void;
}) {
  const { palette } = useTheme();

  if (items.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: palette.textDisabled }}>
        All widgets are already on your dashboard.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((d) => {
        const alreadyUsed = replaceId ? usedTypes.has(d.type) : false;
        return (
          <button
            key={d.type}
            onClick={() => !alreadyUsed && onSelect(d.type)}
            disabled={alreadyUsed}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              width: "100%",
              padding: "16px 18px",
              borderRadius: 12,
              border: `1px solid ${palette.outlineTertiary}`,
              background: palette.surfaceSecondary,
              color: alreadyUsed ? palette.textDisabled : palette.textPrimary,
              cursor: alreadyUsed ? "not-allowed" : "pointer",
              textAlign: "left",
              opacity: alreadyUsed ? 0.5 : 1,
              transition: "all .15s",
              fontFamily: "var(--font-family)",
            }}
            onMouseEnter={(e) => {
              if (!alreadyUsed) e.currentTarget.style.borderColor = palette.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = palette.outlineTertiary;
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: `${palette.primary}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {alreadyUsed ? (
                <LayoutGrid size={20} color={palette.primary} />
              ) : (
                <Plus size={20} color={palette.primary} />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "var(--text-base)" }}>{d.title}</div>
              <div style={{ fontSize: "var(--text-sm)", color: palette.textDisabled, marginTop: 2 }}>
                {alreadyUsed ? "Already on dashboard" : d.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
