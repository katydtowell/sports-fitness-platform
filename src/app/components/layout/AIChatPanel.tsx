/**
 * AIChatPanel — right-side AI Assistant panel with quick actions and chat.
 *
 * Sections:
 *   1. Quick action suggestion buttons (shown when conversation is new)
 *   2. Chat messages between user and AI
 *   3. Message input with send button
 */

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Lightbulb, TrendingUp } from "lucide-react";
import { useTheme } from "./ThemeContext";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

const suggestions = [
  { id: "1", icon: Lightbulb, text: "Show me today's schedule" },
  { id: "2", icon: TrendingUp, text: "Generate revenue report" },
  { id: "3", icon: Lightbulb, text: "Who has upcoming sessions?" },
];

export function AIChatPanelContent() {
  const { palette } = useTheme();
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your AI assistant. How can I help you today?",
      sender: "ai",
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

  const handleSendMessage = (text?: string) => {
    const messageText = text || messageInput;
    if (messageText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: messageText,
        sender: "user",
        timestamp: new Date(),
      };

      setChatMessages([...chatMessages, newMessage]);
      setMessageInput("");

      // Simulate AI response
      setTimeout(() => {
        const response: Message = {
          id: (Date.now() + 1).toString(),
          text: "I understand your request. Let me help you with that...",
          sender: "ai",
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", margin: "-20px", fontFamily: "var(--font-family)" }}>
      {/* ── Header badge ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 16px",
          borderBottom: `1px solid ${palette.borderMedium}`,
        }}
      >
        <Sparkles size={16} style={{ color: palette.primary }} />
        <span style={{ fontSize: "11px", fontWeight: 600, color: palette.primary, fontFamily: "var(--font-family)" }}>
          AI Assistant
        </span>
      </div>

      {/* ── Quick Actions (shown when few messages) ── */}
      {chatMessages.length <= 1 && (
        <div style={{ padding: "16px", borderBottom: `1px solid ${palette.borderMedium}` }}>
          <h3
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: palette.textPrimary,
              margin: "0 0 10px 0",
              fontFamily: "var(--font-family)",
            }}
          >
            Quick Actions
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {suggestions.map((suggestion) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={suggestion.id}
                  onClick={() => handleSendMessage(suggestion.text)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    background: palette.surfaceBg,
                    border: `1px solid ${palette.borderMedium}`,
                    borderRadius: "6px",
                    color: palette.textPrimary,
                    fontSize: "13px",
                    fontFamily: "var(--font-family)",
                    cursor: "pointer",
                    transition: "border-color 0.15s, background 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,196,160,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = palette.borderMedium;
                  }}
                >
                  <Icon size={14} style={{ color: palette.textTertiary, flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", color: palette.textPrimary }}>{suggestion.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Chat Messages ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {chatMessages.map((message) => (
            <div
              key={message.id}
              style={{
                display: "flex",
                justifyContent: message.sender === "user" ? "flex-end" : "flex-start",
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
                {message.sender === "ai" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "6px",
                    }}
                  >
                    <Sparkles size={12} style={{ color: palette.primary }} />
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: palette.primary,
                      }}
                    >
                      AI Assistant
                    </span>
                  </div>
                )}
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

      {/* ── Message Input ── */}
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
            placeholder="Ask me anything..."
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
            onClick={() => handleSendMessage()}
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
  );
}
