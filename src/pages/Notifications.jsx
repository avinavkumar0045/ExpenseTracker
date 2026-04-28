import { useState, useEffect } from "react"
import { auth, supabase } from "../supabase/client"

function timeAgo(dateStr) {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function getNotificationBadge(type, message) {
  const msg = (message || "").toLowerCase()
  if (msg.includes("budget") || msg.includes("exceeded")) return { label: "Budget", color: "var(--red)", bg: "var(--red-dim)" }
  if (msg.includes("settle") || msg.includes("settlement")) return { label: "Settlement", color: "var(--purple)", bg: "var(--purple-dim)" }
  if (type === "GROUP" || msg.includes("group")) return { label: "Group", color: "var(--blue)", bg: "var(--blue-dim)" }
  return { label: "Personal", color: "var(--green)", bg: "var(--green-dim)" }
}

export default function Notifications() {
  const user = auth.getUser()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    if (!user?.user_id) return
    fetchNotifs()
  }, [user?.user_id])

  async function fetchNotifs() {
    setLoading(true)
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.user_id).order("created_at", { ascending: false })
    setNotifications(data || [])
    setLoading(false)
  }

  const markRead = async id => {
    await supabase.from("notifications").update({ is_read: true }).eq("notification_id", id)
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.user_id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const deleteRead = async () => {
    if (!confirm("Delete all read notifications?")) return
    await supabase.from("notifications").delete().eq("user_id", user.user_id).eq("is_read", true)
    setNotifications(prev => prev.filter(n => !n.is_read))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const filteredNotifs = notifications.filter(n => {
    if (filter === "all") return true
    if (filter === "unread") return !n.is_read
    if (filter === "group") return n.notification_type === "GROUP"
    if (filter === "personal") return n.notification_type === "PERSONAL"
    return true
  })

  const iconForType = type => {
    if (type === "PERSONAL") return "👤"
    if (type === "GROUP") return "👥"
    return "🔔"
  }

  const filterTabs = [
    { key: "all", label: "All", count: notifications.length },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "group", label: "Group", count: notifications.filter(n => n.notification_type === "GROUP").length },
    { key: "personal", label: "Personal", count: notifications.filter(n => n.notification_type === "PERSONAL").length }
  ]

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
        <div style={{ display: "flex", gap: "8px" }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ padding: "10px 20px", borderRadius: "10px", background: "var(--accent-dim)", color: "var(--accent)", fontWeight: "700", fontSize: "13px", border: "1px solid rgba(200,246,90,0.2)", cursor: "pointer" }}>
              Mark all read
            </button>
          )}
          {notifications.some(n => n.is_read) && (
            <button onClick={deleteRead} style={{ padding: "10px 20px", borderRadius: "10px", background: "var(--red-dim)", color: "var(--red)", fontWeight: "700", fontSize: "13px", border: "1px solid rgba(255,85,85,0.2)", cursor: "pointer" }}>
              Clear read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "1px" }}>
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px 8px 0 0",
              border: "none",
              borderBottom: filter === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
              background: "transparent",
              color: filter === tab.key ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: filter === tab.key ? "700" : "500",
              fontSize: "13px",
              cursor: "pointer",
              marginBottom: "-1px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {tab.label}
            <span style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "100px", background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{tab.count}</span>
          </button>
        ))}
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)", fontSize: "14px" }}>Loading...</div>
        ) : filteredNotifs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔕</div>
            <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-secondary)" }}>No notifications here</p>
            <p style={{ fontSize: "14px", marginTop: "4px" }}>You're all caught up!</p>
          </div>
        ) : (
          <div>
            {filteredNotifs.map((n, idx) => {
              const badge = getNotificationBadge(n.notification_type, n.message)
              return (
                <div key={n.notification_id} style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "18px 24px", background: n.is_read ? "var(--bg-card)" : "var(--accent-dim)", borderBottom: idx < filteredNotifs.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.2s" }}>
                  <div style={{ fontSize: "24px", marginTop: "2px", flexShrink: 0 }}>{iconForType(n.notification_type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "100px", background: badge.bg, color: badge.color, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.04em" }}>{badge.label}</span>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{timeAgo(n.created_at)}</span>
                    </div>
                    <div style={{ fontWeight: n.is_read ? "500" : "700", fontSize: "14px", color: n.is_read ? "var(--text-secondary)" : "var(--text-primary)", lineHeight: 1.5 }}>{n.message || "You have a new notification"}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {n.created_at ? new Date(n.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                  {!n.is_read && (
                    <button onClick={() => markRead(n.notification_id)} style={{ padding: "6px 14px", borderRadius: "8px", background: "var(--bg-tertiary)", color: "var(--accent)", fontWeight: "700", fontSize: "12px", border: "1px solid var(--border)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                      Mark read
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
