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
