import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { auth, supabase } from "../supabase/client"

export default function Groups() {
  const user = auth.getUser()
  const [groups, setGroups] = useState([])
  const [newGroupName, setNewGroupName] = useState("")
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const fetchGroups = async () => {
    setLoading(true)
    const { data } = await supabase.from("group_members").select("groups(*)").eq("user_id", user.user_id)
    setGroups((data || []).map(d => d.groups).filter(Boolean))
    setLoading(false)
  }

  useEffect(() => { if (user?.user_id) fetchGroups() }, [user?.user_id])

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    setCreating(true); setError("")
    const { data: group, error: ge } = await supabase.from("groups")
      .insert([{ group_name: newGroupName.trim(), created_by: user.user_id }]).select().single()
    if (ge) { setError(ge.message); setCreating(false); return }
    await Promise.all([
      supabase.from("group_members").insert([{ group_id: group.group_id, user_id: user.user_id, role: "admin" }]),
      supabase.from("group_wallet").insert([{ group_id: group.group_id, balance: 0 }])
    ])
    setNewGroupName(""); setCreating(false)
    fetchGroups()
  }

  const colors = ["var(--accent)", "var(--blue)", "var(--purple)", "var(--green)", "var(--amber)", "var(--red)"]

  return (
    <div style={{ maxWidth: "900px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.03em" }}>Groups</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>Manage your shared expense groups</p>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", marginBottom: "24px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "16px" }}>Create New Group</div>
        {error && <div style={{ background: "var(--red-dim)", border: "1px solid rgba(255,85,85,0.2)", borderRadius: "10px", padding: "12px 16px", color: "var(--red)", fontSize: "13px", marginBottom: "14px" }}>{error}</div>}
        <div style={{ display: "flex", gap: "10px" }}>
          <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === "Enter" && createGroup()} placeholder='e.g. "Trip to Goa", "Flat Mates"' style={{ flex: 1, background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text-primary)", padding: "13px 16px", fontSize: "14px" }} onFocus={e => e.target.style.borderColor = "var(--accent)"} onBlur={e => e.target.style.borderColor = "var(--border)"} />
          <button onClick={createGroup} disabled={creating} style={{ padding: "13px 24px", borderRadius: "10px", background: creating ? "rgba(200,246,90,0.5)" : "var(--accent)", color: "#000", fontWeight: "800", fontSize: "14px", border: "none", cursor: creating ? "not-allowed" : "pointer" }}>{creating ? "Creating..." : "Create"}</button>
        </div>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "16px" }}>Your Groups ({groups.length})</div>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>Loading...</div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🫂</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "15px", fontWeight: "600" }}>No groups yet</div>
            <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "6px" }}>Create your first group above</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
            {groups.map((g, i) => (
              <Link key={g.group_id} to={`/group/${g.group_id}`}>
                <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px", cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = colors[i % colors.length]; e.currentTarget.style.transform = "translateY(-2px)" }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: colors[i % colors.length] + "20", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px", fontSize: "20px", fontWeight: "800", color: colors[i % colors.length] }}>{g.group_name[0].toUpperCase()}</div>
                  <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "4px" }}>{g.group_name}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Tap to view details →</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
