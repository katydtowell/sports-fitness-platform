/**
 * PaymentPanel — content rendered inside the SidePanel when a user
 * clicks the "Due" amount in the ClientHeaderCard.
 *
 * Shows:
 * - Total amount due
 * - Line items that make up the balance
 * - Payment entry form (amount, method, reference)
 * - Save / Cancel buttons
 */

import { useState } from "react";
import { useTheme } from "../layout/ThemeContext";
import { useSidePanel } from "../layout/SidePanelContext";

// ── Mock line items ──────────────────────────────────────────────────────────
interface LineItem {
  id: string;
  description: string;
  date: string;
  amount: number;
}

const MOCK_LINE_ITEMS: LineItem[] = [
  { id: "1", description: "Monthly Membership – April 2026", date: "04/01/2026", amount: 75.0 },
  { id: "2", description: "Personal Training Session", date: "03/28/2026", amount: 45.0 },
  { id: "3", description: "Late Payment Fee", date: "03/15/2026", amount: 15.0 },
  { id: "4", description: "Locker Rental – Q2", date: "04/01/2026", amount: 15.0 },
];

const TOTAL_DUE = MOCK_LINE_ITEMS.reduce((sum, item) => sum + item.amount, 0);

// ── Component ────────────────────────────────────────────────────────────────

export function PaymentPanel() {
  const { palette, mode } = useTheme();
  const isDark = mode === "dark";
  const { closePanel } = useSidePanel();

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("credit-card");
  const [reference, setReference] = useState("");

  function handleSave() {
    // TODO: wire up real payment logic
    closePanel();
  }

  const labelStyle: React.CSSProperties = {
    color: palette.textTertiary,
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-family)",
    marginBottom: "6px",
    display: "block",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: palette.surfaceBg,
    border: `1px solid ${palette.borderMedium}`,
    borderRadius: "6px",
    color: palette.textPrimary,
    fontSize: "var(--text-base)",
    fontFamily: "var(--font-family)",
    padding: "10px 12px",
    outline: "none",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none" as const,
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23a1bdc6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: "32px",
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── Amount Due banner ── */}
      <div
        style={{
          background: `${palette.textError}14`,
          border: `1px solid ${palette.textError}40`,
          borderRadius: "8px",
          padding: "16px",
          textAlign: "center",
        }}
      >
        <div style={{ color: palette.textTertiary, fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", marginBottom: "4px" }}>
          Total Amount Due
        </div>
        <div style={{ color: palette.textError, fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-family)" }}>
          ${TOTAL_DUE.toFixed(2)}
        </div>
      </div>

      {/* ── Line items ── */}
      <div>
        <div
          style={{
            color: palette.textPrimary,
            fontSize: "var(--text-base)",
            fontWeight: 600,
            fontFamily: "var(--font-family)",
            marginBottom: "12px",
          }}
        >
          Outstanding Items
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {MOCK_LINE_ITEMS.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "12px 0",
                borderBottom: `1px solid ${palette.borderLight}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
                <div
                  style={{
                    color: palette.textPrimary,
                    fontSize: "var(--text-base)",
                    fontFamily: "var(--font-family)",
                    lineHeight: 1.4,
                  }}
                >
                  {item.description}
                </div>
                <div
                  style={{
                    color: palette.textTertiary,
                    fontSize: "var(--text-sm)",
                    fontFamily: "var(--font-family)",
                    marginTop: "2px",
                  }}
                >
                  {item.date}
                </div>
              </div>
              <div
                style={{
                  color: palette.textError,
                  fontSize: "var(--text-base)",
                  fontWeight: 600,
                  fontFamily: "var(--font-family)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                ${item.amount.toFixed(2)}
              </div>
            </div>
          ))}

          {/* Total row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0 0",
              marginTop: "4px",
            }}
          >
            <div style={{ color: palette.textPrimary, fontSize: "var(--text-base)", fontWeight: 600, fontFamily: "var(--font-family)" }}>
              Total
            </div>
            <div style={{ color: palette.textError, fontSize: "var(--text-base)", fontWeight: 700, fontFamily: "var(--font-family)" }}>
              ${TOTAL_DUE.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: "1px", background: palette.borderMedium }} />

      {/* ── Payment form ── */}
      <div>
        <div
          style={{
            color: palette.textPrimary,
            fontSize: "var(--text-base)",
            fontWeight: 600,
            fontFamily: "var(--font-family)",
            marginBottom: "16px",
          }}
        >
          Enter Payment
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Amount */}
          <div>
            <label style={labelStyle}>Payment Amount</label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: palette.textTertiary,
                  fontSize: "var(--text-base)",
                  fontFamily: "var(--font-family)",
                  pointerEvents: "none",
                }}
              >
                $
              </span>
              <input
                type="number"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                style={{
                  ...inputStyle,
                  paddingLeft: "24px",
                }}
              />
            </div>
          </div>

          {/* Method */}
          <div>
            <label style={labelStyle}>Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={selectStyle}
            >
              <option value="credit-card">Credit Card</option>
              <option value="debit-card">Debit Card</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="ach">ACH / Bank Transfer</option>
            </select>
          </div>

          {/* Reference / Note */}
          <div>
            <label style={labelStyle}>Reference / Note</label>
            <input
              type="text"
              placeholder="e.g. Check #1234"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: "10px", paddingTop: "8px" }}>
        <button
          onClick={closePanel}
          style={{
            flex: 1,
            background: "transparent",
            border: `1px solid ${palette.outlineAction}`,
            borderRadius: "6px",
            color: palette.textTertiary,
            fontSize: "var(--text-base)",
            fontFamily: "var(--font-family)",
            padding: "10px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            background: palette.primary,
            border: "none",
            borderRadius: "6px",
            color: isDark ? "#0a0e0f" : "#101828",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            fontFamily: "var(--font-family)",
            padding: "10px",
            cursor: "pointer",
            transition: "background 0.25s ease",
          }}
        >
          Save Payment
        </button>
      </div>
    </div>
  );
}
