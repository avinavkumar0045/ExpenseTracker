#!/bin/bash

# Dashboard Page - SCHEMA CORRECT
cat > src/pages/Dashboard.jsx << 'EOF'
import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { auth, supabase } from "../supabase/client"

function StatCard({ title, value, sub, accent }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", position: "relative", overflow: "hidden" }}>
      <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "10px" }}>{title}</div>
      <div style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "-0.02em", color: accent || "var(--text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [totalGroups, setTotalGroups] = useState(0)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [notificationsCount, setNotificationsCount] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const userData = auth.getUser()
    if (!userData) { navigate("/login"); return }
    setUser(userData)
    fetchData(userData.user_id)
  }, [])

  async function fetchData(userId) {
    setLoading(true)
    try {
      const [walletRes, groupsRes, txRes, notifRes, expRes] = await Promise.all([
        supabase.from("personal_wallet").select("balance").eq("user_id", userId).single(),
        supabase.from("group_members").select("membership_id").eq("user_id", userId),
        supabase.from("transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(6),
        supabase.from("notifications").select("notification_id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
        supabase.from("expenses").select("amount").eq("paid_by", userId)
      ])
      setWalletBalance(walletRes.data?.balance || 0)
      setTotalGroups(groupsRes.data?.length || 0)
      setRecentTransactions(txRes.data || [])
      setNotificationsCount(notifRes.count || 0)
      const sum = (expRes.data || []).reduce((s, e) => s + (e.amount || 0), 0)
      setTotalExpenses(sum)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const displayName = user?.name || user?.email?.split("@")[0] || "User"

  return (
    <div style={{ maxWidth: "1100px" }}>
      <div style={{ marginBottom: "32px" }}>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "4px" }}>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}</div>
        <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.03em" }}>Hey, {displayName} 👋</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>Here's your financial summary</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <StatCard title="Wallet Balance" value={loading ? "—" : `₹${walletBalance.toFixed(2)}`} sub="Personal wallet" accent="var(--accent)" />
        <StatCard title="Active Groups" value={loading ? "—" : totalGroups} sub="You're a member" />
        <StatCard title="Total Spent" value={loading ? "—" : `₹${totalExpenses.toFixed(2)}`} sub="Your expenses" accent="var(--red)" />
        <StatCard title="Notifications" value={loading ? "—" : notificationsCount} sub="Unread alerts" accent={notificationsCount > 0 ? "var(--amber)" : undefined} />
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", marginBottom: "24px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "16px" }}>Quick Actions</div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[
            { label: "Add Expense", to: "/add-expense", primary: true },
            { label: "Contribute", to: "/contribute" },
            { label: "New Group", to: "/groups" },
            { label: "My Wallet", to: "/wallet" },
          ].map(a => (
            <Link key={a.to} to={a.to}>
              <button style={{ padding: "10px 20px", borderRadius: "10px", background: a.primary ? "var(--accent)" : "var(--bg-tertiary)", color: a.primary ? "#000" : "var(--text-secondary)", fontWeight: "700", fontSize: "13px", border: a.primary ? "none" : "1px solid var(--border)" }}>{a.label}</button>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Recent Transactions</div>
          <Link to="/wallet" style={{ fontSize: "12px", color: "var(--accent)", fontWeight: "700" }}>View all →</Link>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>Loading...</div>
        ) : recentTransactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>💸</div>
            <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>No transactions yet</div>
            <Link to="/add-expense"><button style={{ marginTop: "16px", padding: "10px 20px", borderRadius: "10px", background: "var(--accent)", color: "#000", fontWeight: "700", fontSize: "13px", border: "none" }}>Add your first expense</button></Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {recentTransactions.map(tx => {
              const isCredit = tx.direction === "CREDIT"
              return (
                <div key={tx.transaction_id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", borderRadius: "12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: isCredit ? "var(--green-dim)" : "var(--red-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
                    {isCredit ? "↓" : "↑"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "13px" }}>{tx.item_name || tx.category || "Transaction"}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                    </div>
                  </div>
                  <div style={{ fontWeight: "800", fontSize: "15px", color: isCredit ? "var(--green)" : "var(--red)" }}>
                    {isCredit ? "+" : "−"}₹{Math.abs(tx.amount || 0).toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
EOF

echo "Dashboard created"
