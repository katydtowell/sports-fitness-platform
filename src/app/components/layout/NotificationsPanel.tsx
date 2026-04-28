/**
 * NotificationsPanel — right-side notifications panel with read/unread state.
 *
 * Reads and mutates shared notification state via NotificationsContext so the
 * bell icon badge stays in sync.
 *
 * Sections:
 *   1. Header with unread count badge and "Mark all as read" action
 *   2. Scrollable notification list with type icons
 *   3. Footer with "View all notifications" button
 */

import { CheckCircle, AlertCircle, Info } from "lucide-react";
import { useNotifications, type Notification } from "./NotificationsContext";
import { useTheme } from "./ThemeContext";

function getIcon(type: Notification["type"], palette: ReturnType<typeof useTheme>["palette"]) {
  switch (type) {
    case "success":
      return <CheckCircle size={16} style={{ color: palette.primary, flexShrink: 0 }} />;
    case "warning":
      return <AlertCircle size={16} style={{ color: "#fb923c", flexShrink: 0 }} />;
    case "info":
      return <Info size={16} style={{ color: "#60a5fa", flexShrink: 0 }} />;
  }
}

function formatTimestamp(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function NotificationsPanelContent() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { palette, mode } = useTheme();
  const isDark = mode === "dark";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", margin: "-20px", fontFamily: "var(--font-family)" }}>
      {/* ── Header with unread count ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${palette.borderMedium}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: palette.textPrimary, fontFamily: "var(--font-family)" }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                background: palette.primary,
                color: isDark ? "#0a0e0f" : "#101828",
                fontSize: "10px",
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: "10px",
                lineHeight: "16px",
                fontFamily: "var(--font-family)",
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{
              background: "none",
              border: "none",
              color: palette.primary,
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              padding: "2px 4px",
              fontFamily: "var(--font-family)",
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* ── Notification List ── */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {notifications.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 16px",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 600, color: palette.textPrimary, fontFamily: "var(--font-family)" }}>
              No notifications
            </span>
            <span style={{ fontSize: "12px", color: palette.textTertiary, fontFamily: "var(--font-family)" }}>
              You're all caught up!
            </span>
          </div>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                width: "100%",
                textAlign: "left",
                padding: "14px 16px",
                background: notification.read ? "transparent" : `rgba(0,196,160,0.04)`,
                borderLeft: notification.read ? "3px solid transparent" : `3px solid ${palette.primary}`,
                borderTop: "none",
                borderRight: "none",
                borderBottom: `1px solid ${palette.borderLight}`,
                cursor: notification.read ? "default" : "pointer",
                transition: "background 0.15s",
                fontFamily: "var(--font-family)",
              }}
              onMouseEnter={(e) => {
                if (!notification.read) {
                  (e.currentTarget as HTMLButtonElement).style.background = `rgba(0,196,160,0.08)`;
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = notification.read
                  ? "transparent"
                  : `rgba(0,196,160,0.04)`;
              }}
            >
              <div style={{ marginTop: "2px" }}>{getIcon(notification.type, palette)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: notification.read ? 400 : 600,
                      color: palette.textPrimary,
                      fontFamily: "var(--font-family)",
                    }}
                  >
                    {notification.title}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: palette.textTertiary,
                      flexShrink: 0,
                      fontFamily: "var(--font-family)",
                    }}
                  >
                    {formatTimestamp(notification.timestamp)}
                  </span>
                </div>
                <p
                  style={{
                    margin: "3px 0 0 0",
                    fontSize: "12px",
                    color: palette.textTertiary,
                    lineHeight: 1.4,
                    fontFamily: "var(--font-family)",
                  }}
                >
                  {notification.message}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: `1px solid ${palette.borderMedium}`,
          textAlign: "center",
        }}
      >
        <button
          style={{
            background: "none",
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "6px",
            color: palette.textPrimary,
            fontSize: "12px",
            fontWeight: 500,
            padding: "8px 16px",
            width: "100%",
            cursor: "pointer",
            fontFamily: "var(--font-family)",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,196,160,0.4)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = palette.borderMedium;
          }}
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}
