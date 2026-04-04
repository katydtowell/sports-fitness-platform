import { useTheme } from "../layout/ThemeContext";
import { SectionCard } from "./FormField";

interface SubscriptionRowProps {
  name: string;
  type: string;
  price: string;
  status: string;
  nextBilling: string;
  palette: any;
}

function SubscriptionRow({ name, type, price, status, nextBilling, palette }: SubscriptionRowProps) {
  const isActive = status === "Active";
  return (
    <div
      className="flex items-center justify-between rounded-lg"
      style={{
        padding: "14px 16px",
        background: palette.hoverBg,
        border: `1px solid ${palette.borderLight}`,
        marginBottom: "8px",
      }}
    >
      <div className="flex flex-col" style={{ flex: 1 }}>
        <span
          style={{
            color: palette.textPrimary,
            fontSize: "var(--text-base)",
            fontWeight: 600,
            fontFamily: "var(--font-family)",
            marginBottom: "2px",
          }}
        >
          {name}
        </span>
        <span
          style={{
            color: palette.textTertiary,
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-family)",
          }}
        >
          {type}
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <span
            style={{
              color: palette.textTertiary,
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font-family)",
            }}
          >
            Next billing
          </span>
          <span
            style={{
              color: palette.textPrimary,
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font-family)",
              fontWeight: 500,
            }}
          >
            {nextBilling}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span
            style={{
              color: palette.textTertiary,
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font-family)",
            }}
          >
            Price
          </span>
          <span
            style={{
              color: palette.textPrimary,
              fontSize: "var(--text-base)",
              fontWeight: 700,
              fontFamily: "var(--font-family)",
            }}
          >
            {price}
          </span>
        </div>

        <div
          className="flex items-center rounded-full px-3 py-1"
          style={{
            background: isActive ? `${palette.primary}1f` : palette.borderLight,
          }}
        >
          <span
            style={{
              color: isActive ? palette.primary : palette.textTertiary,
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font-family)",
              fontWeight: 500,
            }}
          >
            {status}
          </span>
        </div>

        <button
          style={{
            background: "transparent",
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: "4px",
            color: palette.textTertiary,
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-family)",
            padding: "5px 12px",
            cursor: "pointer",
          }}
        >
          Manage
        </button>
      </div>
    </div>
  );
}

export function SubscriptionsSection() {
  const { palette } = useTheme();
  const subscriptions = [
    {
      name: "Individual · Month-to-Month",
      type: "Membership",
      price: "$85/mo",
      status: "Active",
      nextBilling: "05/01/2026",
    },
    {
      name: "Personal Training Pack",
      type: "Service Package · 10 sessions",
      price: "$450",
      status: "Active",
      nextBilling: "—",
    },
    {
      name: "Locker Rental",
      type: "Add-on",
      price: "$15/mo",
      status: "Inactive",
      nextBilling: "—",
    },
  ];

  return (
    <SectionCard title="Billing">
      <div>
        {subscriptions.map((s) => (
          <SubscriptionRow key={s.name} {...s} palette={palette} />
        ))}
      </div>
      <button
        style={{
          background: "transparent",
          border: `1px dashed ${palette.borderMedium}`,
          borderRadius: "6px",
          color: palette.textTertiary,
          fontSize: "var(--text-base)",
          fontFamily: "var(--font-family)",
          padding: "10px",
          cursor: "pointer",
          width: "100%",
          textAlign: "center",
          marginTop: "4px",
        }}
      >
        + Add subscription
      </button>
    </SectionCard>
  );
}
