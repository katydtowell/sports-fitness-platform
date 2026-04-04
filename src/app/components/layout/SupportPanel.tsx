/**
 * SupportPanel — right-side support panel with article search and live chat.
 *
 * Sections:
 *   1. Search support articles
 *   2. Popular articles list with view counts
 *   3. Live chat with simulated support responses
 */

import { useState, useRef, useEffect } from "react";
import { Search, Send, ExternalLink } from "lucide-react";
import { useTheme } from "./ThemeContext";

interface Message {
  id: string;
  text: string;
  sender: "user" | "support";
  timestamp: Date;
}

const topArticles = [
  { id: "1", title: "Getting Started with EZFacility", views: 1245, url: "#" },
  { id: "2", title: "How to Create a New Client Account", views: 1102, url: "#" },
  { id: "3", title: "Setting Up Recurring Billing", views: 987, url: "#" },
  { id: "4", title: "Managing Staff Schedules", views: 856, url: "#" },
];

export function SupportPanelContent() {
  const { palette } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! How can we help you today?",
      sender: "support",
      timestamp: new Date(),
    },
  ]);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: messageInput,
        sender: "user",
        timestamp: new Date(),
      };

      setChatMessages([...chatMessages, newMessage]);
      setMessageInput("");

      // Simulate support response
      setTimeout(() => {
        const response: Message = {
          id: (Date.now() + 1).toString(),
          text: "Thank you for your message. A support representative will respond shortly.",
          sender: "support",
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, response]);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredArticles = searchQuery
    ? topArticles.filter((a) =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : topArticles;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", margin: "-20px", fontFamily: "var(--font-family)" }}>
      {/* ── Search Support Articles ── */}
      <div style={{ padding: "16px", borderBottom: `1px solid ${palette.borderMedium}` }}>
        <div style={{ position: "relative" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: palette.textTertiary,
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search support articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              height: "32px",
              paddingLeft: "32px",
              paddingRight: "12px",
              background: palette.surfaceBg,
              border: `1px solid ${palette.borderMedium}`,
              borderRadius: "6px",
              color: palette.textPrimary,
              fontSize: "13px",
              fontFamily: "var(--font-family)",
              outline: "none",
              transition: "background 0.25s ease, border-color 0.25s ease"
            }}
          />
        </div>
      </div>

      {/* ── Popular Articles ── */}
      <div style={{ padding: "16px", borderBottom: `1px solid ${palette.borderMedium}` }}>
        <h3
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: palette.textPrimary,
            margin: "0 0 10px 0",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontFamily: "var(--font-family)",
          }}
        >
          Popular Articles
        </h3>
        {filteredArticles.map((article) => (
          <a
            key={article.id}
            href={article.url}
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              padding: "10px 12px",
              margin: "0 -4px",
              background: palette.surfaceBg,
              border: `1px solid ${palette.borderMedium}`,
              borderRadius: "6px",
              textDecoration: "none",
              cursor: "pointer",
              marginBottom: "6px",
              transition: "border-color 0.15s, background 0.25s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,196,160,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = palette.borderMedium;
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: palette.textPrimary,
                  margin: 0,
                  lineHeight: 1.4,
                  fontFamily: "var(--font-family)",
                }}
              >
                {article.title}
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: palette.textTertiary,
                  margin: "3px 0 0 0",
                  fontFamily: "var(--font-family)",
                }}
              >
                {article.views.toLocaleString()} views
              </p>
            </div>
            <ExternalLink
              size={14}
              style={{ color: palette.textTertiary, flexShrink: 0, marginLeft: "8px", marginTop: "2px" }}
            />
          </a>
        ))}
      </div>

      {/* ── Live Chat Section ── */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${palette.borderMedium}`,
          }}
        >
          <h3
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: palette.textPrimary,
              margin: 0,
              fontFamily: "var(--font-family)",
            }}
          >
            Live Chat
          </h3>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {chatMessages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: "flex",
                  justifyContent:
                    message.sender === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    background:
                      message.sender === "user"
                        ? palette.primary
                        : palette.hoverBg,
                    color: message.sender === "user" ? palette.surfaceBg : palette.textPrimary,
                    fontSize: "13px",
                    lineHeight: 1.45,
                    fontFamily: "var(--font-family)",
                  }}
                >
                  <p style={{ margin: 0 }}>{message.text}</p>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "10px",
                      opacity: 0.7,
                    }}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: `1px solid ${palette.borderMedium}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              rows={2}
              style={{
                flex: 1,
                padding: "8px 12px",
                background: palette.surfaceBg,
                border: `1px solid ${palette.borderMedium}`,
                borderRadius: "6px",
                color: palette.textPrimary,
                fontSize: "13px",
                fontFamily: "var(--font-family)",
                resize: "none",
                outline: "none",
                lineHeight: 1.4,
                transition: "background 0.25s ease, border-color 0.25s ease"
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
              style={{
                padding: "8px",
                background: messageInput.trim() ? palette.primary : palette.hoverBg,
                color: messageInput.trim() ? palette.surfaceBg : palette.textTertiary,
                border: "none",
                borderRadius: "6px",
                cursor: messageInput.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: messageInput.trim() ? 1 : 0.5,
                transition: "background 0.15s, opacity 0.15s",
                flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
