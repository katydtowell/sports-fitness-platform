import { useState } from "react";
import { SectionCard } from "./FormField";

// ── Types ─────────────────────────────────────────────────────────────────────

type FeeStatus = "Paid" | "Due" | "Refunded";
type FeeRate   = "per hour" | "per use" | "monthly";
type ItemKind  = "Equipment" | "Locker";

interface FeeEntry {
  amount: number;
  status: FeeStatus;
  date: string;
}

interface RentalItem {
  kind: ItemKind;
  name: string;
  detail: string;
  rate: number;
  rateType: FeeRate;
  fees: FeeEntry[];
}

// ── Sample data ───────────────────────────────────────────────────────────────

const RENTALS: RentalItem[] = [
  {
    kind:     "Locker",
    name:     "Locker #14",
    detail:   "Full-size · Men's Locker Room",
    rate:     15,
    rateType: "monthly",
    fees: [
      { amount: 15.00, status: "Paid",     date: "03/01/2026" },
      { amount: 15.00, status: "Paid",     date: "02/01/2026" },
      { amount: 15.00, status: "Due",      date: "04/01/2026" },
      { amount: 15.00, status: "Paid",     date: "01/01/2026" },
    ],
  },
  {
    kind:     "Equipment",
    name:     "Spin Bike · Bay 3",
    detail:   "Peloton-style · Cardio Floor",
    rate:     5,
    rateType: "per use",
    fees: [
      { amount: 5.00, status: "Paid",      date: "03/31/2026" },
      { amount: 5.00, status: "Paid",      date: "03/27/2026" },
      { amount: 5.00, status: "Due",       date: "04/02/2026" },
      { amount: 5.00, status: "Paid",      date: "03/24/2026" },
      { amount: 5.00, status: "Refunded",  date: "03/15/2026" },
    ],
  },
  {
    kind:     "Equipment",
    name:     "Massage Gun",
    detail:   "Theragun Pro · Recovery Suite",
    rate:     8,
    rateType: "per hour",
    fees: [
      { amount: 8.00,  status: "Paid",     date: "03/29/2026" },
      { amount: 16.00, status: "Paid",     date: "03/20/2026" },
      { amount: 8.00,  status: "Due",      date: "04/02/2026" },
    ],
  },
  {
    kind:     "Locker",
    name:     "Locker #37",
    detail:   "Half-size · Co-ed Locker Room",
    rate:     10,
    rateType: "monthly",
    fees: [
      { amount: 10.00, status: "Paid",     date: "03/01/2026" },
      { amount: 10.00, status: "Refunded", date: "02/01/2026" },
      { amount: 10.00, status: "Due",      date: "04/01/2026" },
    ],
  },
];

// ── Style maps ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<FeeStatus, { color: string; background: string; border: string }> = {
  Paid:     { color: "#00c4a0", background: "rgba(0,196,160,0.10)",  border: "1px solid rgba(0,196,160,0.28)"  },
  Due:      { color: "#e8a020", background: "rgba(232,160,32,0.10)", border: "1px solid rgba(232,160,32,0.28)" },
  Refunded: { color: "#8fa8b8", background: "rgba(143,168,184,0.10)",border: "1px solid rgba(143,168,184,0.25)"},
};

const KIND_STYLES: Record<ItemKind, { color: string; background: string; border: string; icon: string }> = {
  Locker:    { color: "#e8a020", background: "rgba(232,160,32,0.10)",  border: "1px solid rgba(232,160,32,0.28)",  icon: "⊟" },
  Equipment: { color: "#00c4a0", background: "rgba(0,196,160,0.10)",   border: "1px solid rgba(0,196,160,0.28)",   icon: "⊞" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function totalOwed(fees: FeeEntry[]): number {
  return fees
    .filter((f) => f.status === "Due")
    .reduce((sum, f) => sum + f.amount, 0);
}

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

// ── FeeRow ────────────────────────────────────────────────────────────────────

function FeeRow({ fee }: { fee: FeeEntry }) {
  const ss = STATUS_STYLES[fee.status];
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: "7px 12px",
        background: "rgba(161,189,198,0.03)",
        borderBottom: "1px solid rgba(161,189,198,0.07)",
      }}
    >
      <span style={{ color: "#a1bdc6", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)" }}>
        {fee.date}
      </span>
      <div className="flex items-center gap-3">
        <span style={{ color: "#dfe9ec", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", fontWeight: 500 }}>
          {formatMoney(fee.amount)}
        </span>
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            padding: "2px 9px", borderRadius: "999px",
            fontSize: "11px", fontFamily: "var(--font-family)", fontWeight: 500,
            color: ss.color, background: ss.background, border: ss.border,
          }}
        >
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: ss.color, flexShrink: 0 }} />
          {fee.status}
        </span>
      </div>
    </div>
  );
}

// ── RentalCard ────────────────────────────────────────────────────────────────

function RentalCard({ item }: { item: RentalItem }) {
  const [expanded, setExpanded] = useState(false);
  const ks    = KIND_STYLES[item.kind];
  const owed  = totalOwed(item.fees);
  const sorted = [...item.fees].sort((a, b) => {
    const [am, ad, ay] = a.date.split("/").map(Number);
    const [bm, bd, by] = b.date.split("/").map(Number);
    return new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime();
  });

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "rgba(161,189,198,0.04)",
        border: "1px solid rgba(161,189,198,0.1)",
        marginBottom: "8px",
      }}
    >
      {/* Header row */}
      <div
        className="flex items-start justify-between"
        style={{ padding: "14px 16px", borderBottom: expanded ? "1px solid rgba(161,189,198,0.1)" : "none" }}
      >
        <div className="flex items-start gap-3">
          {/* Kind icon */}
          <div
            className="flex items-center justify-center rounded shrink-0"
            style={{
              width: "36px", height: "36px", marginTop: "1px",
              background: ks.background, border: ks.border,
              color: ks.color, fontSize: "18px", fontWeight: 700,
              fontFamily: "var(--font-family)",
            }}
          >
            {ks.icon}
          </div>

          <div>
            <div style={{ color: "#dfe9ec", fontSize: "var(--text-base)", fontWeight: 600, fontFamily: "var(--font-family)", marginBottom: "2px" }}>
              {item.name}
            </div>
            <div style={{ color: "#a1bdc6", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)", marginBottom: "6px" }}>
              {item.detail}
            </div>
            <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
              {/* Kind badge */}
              <span
                style={{
                  display: "inline-flex", alignItems: "center", padding: "2px 9px",
                  borderRadius: "999px", fontSize: "11px", fontFamily: "var(--font-family)", fontWeight: 500,
                  color: ks.color, background: ks.background, border: ks.border,
                }}
              >
                {item.kind}
              </span>
              {/* Rate badge */}
              <span
                style={{
                  display: "inline-flex", alignItems: "center", padding: "2px 9px",
                  borderRadius: "999px", fontSize: "11px", fontFamily: "var(--font-family)", fontWeight: 500,
                  color: "#a1bdc6", background: "rgba(161,189,198,0.08)", border: "1px solid rgba(161,189,198,0.2)",
                }}
              >
                {formatMoney(item.rate)}&nbsp;/&nbsp;{item.rateType}
              </span>
            </div>
          </div>
        </div>

        {/* Right: total owed + expand */}
        <div className="flex flex-col items-end gap-2" style={{ flexShrink: 0, marginLeft: "12px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#a1bdc6", fontSize: "11px", fontFamily: "var(--font-family)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>
              Total due
            </div>
            <div
              style={{
                color: owed > 0 ? "#e8a020" : "#00c4a0",
                fontSize: "var(--text-base)",
                fontWeight: 700,
                fontFamily: "var(--font-family)",
              }}
            >
              {formatMoney(owed)}
            </div>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: "rgba(161,189,198,0.08)",
              border: "1px solid rgba(161,189,198,0.2)",
              borderRadius: "4px",
              color: "#a1bdc6",
              fontSize: "11px",
              fontFamily: "var(--font-family)",
              padding: "3px 10px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {expanded ? "Hide fees ▲" : "View fees ▾"}
          </button>
        </div>
      </div>

      {/* Fee history */}
      {expanded && (
        <div>
          <div
            className="flex items-center justify-between"
            style={{ padding: "6px 12px", background: "rgba(161,189,198,0.06)" }}
          >
            <span style={{ color: "#a1bdc6", fontSize: "11px", fontFamily: "var(--font-family)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Date</span>
            <span style={{ color: "#a1bdc6", fontSize: "11px", fontFamily: "var(--font-family)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Amount · Status</span>
          </div>
          {sorted.map((fee, i) => (
            <FeeRow key={i} fee={fee} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── EquipmentSection ──────────────────────────────────────────────────────────

type KindFilter = "All" | ItemKind;

export function EquipmentSection() {
  const [filter, setFilter] = useState<KindFilter>("All");

  const filters: KindFilter[] = ["All", "Equipment", "Locker"];
  const filtered = filter === "All" ? RENTALS : RENTALS.filter((r) => r.kind === filter);
  const grandTotal = filtered.reduce((sum, r) => sum + totalOwed(r.fees), 0);

  return (
    <SectionCard title="Equipment">
      {/* Filter + summary row */}
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: "16px" }}>
        <div className="flex gap-2">
          {filters.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "5px 14px", borderRadius: "999px",
                  border: active ? "1px solid rgba(0,196,160,0.35)" : "1px solid rgba(161,189,198,0.2)",
                  background: active ? "rgba(0,196,160,0.12)" : "transparent",
                  color: active ? "#00c4a0" : "#a1bdc6",
                  fontSize: "var(--text-sm)", fontFamily: "var(--font-family)",
                  fontWeight: active ? 600 : 400, cursor: "pointer",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(161,189,198,0.06)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Grand total due */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#a1bdc6", fontSize: "var(--text-sm)", fontFamily: "var(--font-family)" }}>Total due:</span>
          <span
            style={{
              color: grandTotal > 0 ? "#e8a020" : "#00c4a0",
              fontSize: "var(--text-base)", fontWeight: 700,
              fontFamily: "var(--font-family)",
            }}
          >
            {formatMoney(grandTotal)}
          </span>
        </div>
      </div>

      {/* Rental cards */}
      <div>
        {filtered.map((item) => (
          <RentalCard key={item.name} item={item} />
        ))}
      </div>

      <button
        style={{
          background: "transparent",
          border: "1px dashed rgba(161,189,198,0.3)",
          borderRadius: "6px", color: "#a1bdc6",
          fontSize: "var(--text-base)", fontFamily: "var(--font-family)",
          padding: "10px", cursor: "pointer",
          width: "100%", textAlign: "center", marginTop: "4px",
        }}
      >
        + Add rental
      </button>
    </SectionCard>
  );
}
