import { Link } from "react-router-dom"

const features = [
  { icon: "💸", title: "Split Expenses", desc: "Easily split and track expenses with friends" },
  { icon: "👛", title: "Track Wallet", desc: "Monitor personal and group wallets in real-time" },
  { icon: "💳", title: "Group Payments", desc: "Manage group contributions seamlessly" },
]

export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,10,10,0.95)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(12px)", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "16px", fontWeight: "900", color: "#000" }}>E</span>
          </div>
          <span style={{ fontWeight: "800", fontSize: "18px", letterSpacing: "-0.02em" }}>Expense<span style={{ color: "var(--accent)" }}>Flow</span></span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/login"><button style={{ padding: "8px 20px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontWeight: "600", fontSize: "14px" }}>Login</button></Link>
          <Link to="/register"><button style={{ padding: "8px 20px", borderRadius: "8px", border: "none", background: "var(--accent)", color: "#000", fontWeight: "800", fontSize: "14px" }}>Get Started</button></Link>
        </div>
      </nav>

      <div style={{ padding: "160px 24px 80px", textAlign: "center" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>💰</div>
          <h1 style={{ fontSize: "52px", fontWeight: "900", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: "20px" }}>Smart Expense<br/>Management</h1>
          <p style={{ fontSize: "18px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "40px" }}>The ultimate group expense tracking solution. Split bills, manage wallets, and track payments seamlessly.</p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center" }}>
            <Link to="/register"><button style={{ padding: "16px 36px", borderRadius: "12px", background: "var(--accent)", color: "#000", fontWeight: "800", fontSize: "16px", border: "none", boxShadow: "0 4px 20px rgba(200,246,90,0.3)" }}>Get Started →</button></Link>
            <Link to="/login"><button style={{ padding: "16px 36px", borderRadius: "12px", background: "var(--bg-tertiary)", color: "var(--text-primary)", fontWeight: "700", fontSize: "16px", border: "1px solid var(--border)" }}>Sign In</button></Link>
          </div>
        </div>
      </div>

      <div style={{ padding: "80px 32px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "36px", fontWeight: "800", letterSpacing: "-0.03em", marginBottom: "12px" }}>Powerful Features</h2>
            <p style={{ fontSize: "16px", color: "var(--text-secondary)" }}>Everything you need to manage group expenses</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {features.map((f, i) => (
              <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "32px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>{f.icon}</div>
                <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "10px" }}>{f.title}</h3>
                <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "80px 32px", textAlign: "center", background: "var(--bg-secondary)" }}>
        <h2 style={{ fontSize: "36px", fontWeight: "800", letterSpacing: "-0.03em", marginBottom: "16px" }}>Ready to Get Started?</h2>
        <p style={{ fontSize: "17px", color: "var(--text-secondary)", marginBottom: "32px" }}>Join thousands managing expenses smarter</p>
        <Link to="/register"><button style={{ padding: "16px 40px", borderRadius: "12px", background: "var(--accent)", color: "#000", fontWeight: "800", fontSize: "17px", border: "none" }}>Start Free Today →</button></Link>
      </div>

      <footer style={{ padding: "24px 32px", textAlign: "center", borderTop: "1px solid var(--border)" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>© {new Date().getFullYear()} ExpenseFlow. All rights reserved.</p>
      </footer>
    </div>
  )
}
