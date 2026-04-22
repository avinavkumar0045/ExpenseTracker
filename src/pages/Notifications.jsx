import { useState, useEffect } from "react"
import { auth, supabase } from "../supabase/client"

export default function Notifications() {
  const user = auth.getUser()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.user_id) return
    const fetchNotifs = async () => {
      setLoading(true)
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.user_id).order("created_at", { ascending: false })
      setNotifications(data || [])
      setLoading(false)
    }
    fetchNotifs()
  }, [user?.user_id])

  const markRead = async (id) => {
    await supabase.from("notifications").update({ is_read: true }).eq("notification_id", id)
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.user_id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const iconForType = type => {
    if (type === "PERSONAL") return "👤"
    if (type === "GROUP") return "👥"
    return "🔔"
  }

  return (
    <div style={{ maxWidth: "800px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.03em" }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{ marginLeft: "12px", background: "var(--red)", color: "#fff", borderRadius: "100px", padding: "4px 12px", fontSize: "14px", fontWeight: "700" }}>{unreadCount}</span>
            )}
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>Stay updated on your activity</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ padding: "10px 20px", borderRadius: "10px", background: "var(--accent-dim)", color: "var(--accent)", fontWeight: "700", fontSize: "13px", border: "1px solid rgba(200,246,90,0.2)", cursor: "pointer" }}>
            Mark all as read
          </button>
        )}
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)", fontSize: "14px" }}>Loading...</div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔕</div>
            <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-secondary)" }}>You're all caught up!</p>
            <p style={{ fontSize: "14px", marginTop: "4px" }}>No notifications yet.</p>
          </div>
        ) : (
          <div>
            {notifications.map((n, idx) => (
              <div key={n.notification_id} style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "20px 24px", background: n.is_read ? "var(--bg-card)" : "var(--accent-dim)", borderBottom: idx < notifications.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.2s" }}>
                <div style={{ fontSize: "24px", marginTop: "2px", flexShrink: 0 }}>{iconForType(n.notification_type)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: n.is_read ? "500" : "700", fontSize: "14px", color: n.is_read ? "var(--text-secondary)" : "var(--text-primary)", lineHeight: 1.5 }}>{n.message || "You have a new notification"}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    {n.created_at ? new Date(n.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                  </div>
                </div>
                {!n.is_read && (
                  <button onClick={() => markRead(n.notification_id)} style={{ padding: "6px 14px", borderRadius: "8px", background: "var(--bg-tertiary)", color: "var(--accent)", fontWeight: "700", fontSize: "12px", border: "1px solid var(--border)", cursor: "pointer", whiteSpace: "nowrap" }}>
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
