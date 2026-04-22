#!/bin/bash

# This script creates all remaining project files

# ========== LAYOUT FILES ==========

cat > src/layouts/MainLayout/Navbar.jsx << 'EOF'
import { Link, useNavigate } from "react-router-dom"
import { auth } from "../../supabase/client"

export default function Navbar({ user, toggleSidebar }) {
  const navigate = useNavigate()
  const handleLogout = () => { auth.logout(); navigate("/login") }

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: "var(--navbar-height)", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", padding: "0 24px", gap: "16px" }}>
      <button onClick={toggleSidebar} style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>☰</button>
      <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "16px", fontWeight: "900", color: "#000" }}>E</span>
        </div>
        <span style={{ fontWeight: "800", fontSize: "16px", letterSpacing: "-0.02em" }}>Expense<span style={{ color: "var(--accent)" }}>Flow</span></span>
      </Link>
      <div style={{ flex: 1 }} />
      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link to="/notifications"><div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", color: "var(--text-secondary)", fontSize: "16px" }}>🔔</div></Link>
          <button onClick={handleLogout} style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "500" }}>Logout</button>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", color: "#000", fontSize: "14px" }}>{(user?.name || user?.email || "U")[0].toUpperCase()}</div>
        </div>
      )}
    </nav>
  )
}
EOF

cat > src/layouts/MainLayout/Sidebar.jsx << 'EOF'
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
EOF

cat > src/layouts/MainLayout/Layout.jsx << 'EOF'
import { useState } from "react"
import Navbar from "./Navbar"
import Sidebar from "./Sidebar"
import { auth } from "../../supabase/client"

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const user = auth.getUser()

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar user={user} toggleSidebar={() => setSidebarOpen(o => !o)} />
      <Sidebar sidebarOpen={sidebarOpen} user={user} />
      <main style={{ marginLeft: sidebarOpen ? "var(--sidebar-width)" : "0", marginTop: "var(--navbar-height)", padding: "32px", minHeight: "calc(100vh - var(--navbar-height))", transition: "margin-left 0.25s ease" }}>
        {children}
      </main>
    </div>
  )
}
EOF

echo "Layout files created"
