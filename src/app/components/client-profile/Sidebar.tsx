const navItems = [
  "Admin",
  "Clients",
  "Check-In",
  "Email",
  "Equipment",
  "Leagues",
  "Groups",
  "Lectures",
  "PDX",
  "Reports",
  "Schedule",
  "Time Clock",
];

export function Sidebar() {
  const activeItem = "Clients";

  return (
    <aside
      className="shrink-0 flex flex-col"
      style={{
        width: "68px",
        background: "#182023",
        borderRight: "1px solid rgba(161,189,198,0.15)",
        minHeight: "100%",
        fontFamily: "var(--font-family)",
      }}
    >
      {navItems.map((item) => {
        const isActive = item === activeItem;
        return (
          <button
            key={item}
            className="w-full text-center"
            style={{
              padding: "12px 4px",
              background: isActive ? "rgba(0,196,160,0.12)" : "transparent",
              borderLeft: isActive ? "3px solid #00c4a0" : "3px solid transparent",
              color: isActive ? "#00c4a0" : "#a1bdc6",
              fontSize: "11px",
              fontWeight: isActive ? 600 : 400,
              fontFamily: "var(--font-family)",
              cursor: "pointer",
              lineHeight: 1.3,
            }}
          >
            {item}
          </button>
        );
      })}
    </aside>
  );
}
