import { Link, useLocation } from "react-router-dom"

const menuItems = [
  { path: "/dashboard", label: "Dashboard", icon: "▦" },
  { path: "/groups", label: "Groups", icon: "◈" },
  { path: "/wallet", label: "Wallet", icon: "◉" },
  { path: "/add-expense", label: "Add Expense", icon: "+" },
  { path: "/contribute", label: "Contribute", icon: "↑" },
  { path: "/notifications", label: "Notifications", icon: "◎" },
]

export default function Sidebar({ sidebarOpen, user }) {
  const location = useLocation()
  const displayName = user?.name || user?.email?.split("@")[0] || "User"
  const initial = displayName[0].toUpperCase()

  return (
    <aside style={{ position: "fixed", top: "var(--navbar-height)", left: 0, bottom: 0, width: sidebarOpen ? "var(--sidebar-width)" : "0", overflow: "hidden", background: "var(--bg-secondary)", borderRight: "1px solid var(--border)", transition: "width 0.25s ease", zIndex: 50, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 16px", flex: 1, overflowY: "auto", minWidth: "var(--sidebar-width)" }}>
        <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", color: "#000", fontSize: "16px", flexShrink: 0 }}>{initial}</div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontWeight: "700", fontSize: "13px", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
          </div>
        </div>
        <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", paddingLeft: "12px" }}>MENU</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {menuItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "10px", color: active ? "var(--accent)" : "var(--text-secondary)", background: active ? "var(--accent-dim)" : "transparent", fontWeight: active ? "600" : "400", fontSize: "13px", transition: "all 0.15s", border: active ? "1px solid rgba(200,246,90,0.15)" : "1px solid transparent" }}>
                <span style={{ fontSize: "14px", width: "18px", textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>
                {active && <div style={{ marginLeft: "auto", width: "5px", height: "5px", borderRadius: "50%", background: "var(--accent)" }} />}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
