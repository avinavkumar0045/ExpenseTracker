import { useState, useEffect } from "react"
import { useParams, Link, useNavigate, useLocation } from "react-router-dom"
import { auth, supabase } from "../supabase/client"

/**
 * GROUP DETAIL PAGE
 * 
 * Displays:
 * - Group members list
 * - All group expenses
 * - Group wallet balance
 * - Option to invite new members by email
 * 
 * Schema tables used:
 * - groups (group_id, group_name, created_by)
 * - group_members (group_id, user_id, role)
 * - group_wallet (group_id, balance)
 * - expenses (expense_id, group_id, item_name, amount, paid_by)
 */
export default function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const user = auth.getUser()
  
  // State management
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [wallet, setWallet] = useState(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteMsg, setInviteMsg] = useState({ text: "", ok: true })
  const [loading, setLoading] = useState(true)

  // Fetch all group data on component mount
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      
      // Parallel fetch for better performance
      const [gRes, mRes, eRes, wRes] = await Promise.all([
        supabase.from("groups").select("*").eq("group_id", id).single(),
        supabase.from("group_members").select("users(*)").eq("group_id", id),
        supabase.from("expenses").select("*").eq("group_id", id).order("expense_date", { ascending: false }),
        supabase.from("group_wallet").select("*").eq("group_id", id).single()
      ])
      
      setGroup(gRes.data)
      setMembers((mRes.data || []).map(d => d.users).filter(Boolean))
      setExpenses(eRes.data || [])
      setWallet(wRes.data)
      setLoading(false)
    }
    fetchAll()
  }, [id])

  /**
   * Invite a new member to the group
   * Searches for user by email, then adds them as a member
   */
  const inviteMember = async () => {
    if (!inviteEmail.trim()) return
    
    // Find user by email
    const { data: u } = await supabase.from("users").select("*").eq("email", inviteEmail.trim()).single()
    
    if (!u) {
      setInviteMsg({ text: "User not found with that email.", ok: false })
      return
    }
    
    // Add user to group_members
    const { error } = await supabase.from("group_members").insert([{
      group_id: id,
      user_id: u.user_id,
      role: "member"
    }])
    
    if (error) {
      setInviteMsg({ text: "User is already a member or error occurred.", ok: false })
    } else {
      setInviteMsg({ text: `${u.name} added successfully!`, ok: true })
      setInviteEmail("")
      setMembers(prev => [...prev, u])
    }
  }

  // Calculate total expenses for this group
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

  if (loading) return <div style={{ padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>Loading group...</div>
  if (!group) return <div style={{ padding: "40px", color: "var(--red)", fontSize: "14px" }}>Group not found.</div>

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* Header with back button */}
      <div style={{ marginBottom: "28px" }}>
        <Link to="/groups" style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: "600" }}>← Back to Groups</Link>
        <h1 style={{ fontSize: "30px", fontWeight: "800", letterSpacing: "-0.03em", marginTop: "10px" }}>{group.group_name}</h1>

        {/* Group wallet balance badge */}
        {wallet && (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "10px",
            padding: "6px 14px",
            borderRadius: "100px",
            background: "var(--accent-dim)",
            border: "1px solid rgba(200,246,90,0.2)"
          }}>
            <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: "700" }}>
              Group Wallet: ₹{(parseFloat(wallet.balance) || 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "1px" }}>
        {[
          { key: "expenses", label: "Expenses", path: `/group/${id}` },
          { key: "members", label: "Members", path: `/group/${id}` },
          { key: "settlements", label: "Settlements", path: `/group/${id}/settlements` }
        ].map(tab => {
          const isActive = location.pathname === tab.path || (tab.key === "expenses" && location.pathname === `/group/${id}` && !location.pathname.includes("settlements"))
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              style={{
                padding: "10px 20px",
                borderRadius: "8px 8px 0 0",
                border: "none",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                background: "transparent",
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: isActive ? "700" : "500",
                fontSize: "14px",
                cursor: "pointer",
                marginBottom: "-1px"
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "20px" }}>
        {/* MEMBERS CARD */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
          <div style={{
            fontSize: "13px",
            fontWeight: "700",
            color: "var(--text-secondary)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "16px"
          }}>
            Members ({members.length})
          </div>
          
          {/* Members list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
            {members.map((m) => (
              <div key={m.user_id} style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                borderRadius: "10px",
                background: "var(--bg-tertiary)"
              }}>
                <div style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "800",
                  color: "#000",
                  fontSize: "13px",
                  flexShrink: 0
                }}>
                  {m.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontWeight: "600", fontSize: "13px" }}>{m.name}</div>
                  <div style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {m.email}
                  </div>
                </div>
                {m.user_id === user.user_id && (
                  <div style={{
                    marginLeft: "auto",
                    fontSize: "10px",
                    padding: "3px 8px",
                    borderRadius: "100px",
                    background: "var(--accent-dim)",
                    color: "var(--accent)",
                    fontWeight: "700"
                  }}>
                    You
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Invite member section */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <div style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "var(--text-muted)",
              marginBottom: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.06em"
            }}>
              Invite Member
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && inviteMember()}
                placeholder="friend@example.com"
                style={{
                  flex: 1,
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  padding: "10px 12px",
                  fontSize: "13px"
                }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
              <button
                onClick={inviteMember}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "var(--accent)",
                  color: "#000",
                  fontWeight: "800",
                  fontSize: "13px",
                  border: "none"
                }}
              >
                +
              </button>
            </div>
            {inviteMsg.text && (
              <div style={{
                marginTop: "8px",
                fontSize: "12px",
                color: inviteMsg.ok ? "var(--green)" : "var(--red)"
              }}>
                {inviteMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* EXPENSES CARD */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px"
          }}>
            <div style={{
              fontSize: "13px",
              fontWeight: "700",
              color: "var(--text-secondary)",
              letterSpacing: "0.06em",
              textTransform: "uppercase"
            }}>
              Expenses
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--red)" }}>
                ₹{totalExpenses.toFixed(2)}
              </span>
              <Link to={`/add-expense?group=${id}`}>
                <button style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  background: "var(--accent)",
                  color: "#000",
                  fontWeight: "800",
                  fontSize: "12px",
                  border: "none"
                }}>
                  + Add
                </button>
              </Link>
            </div>
          </div>
          
          {expenses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>🧾</div>
              <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>No expenses yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {expenses.map(ex => (
                <div key={ex.expense_id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)"
                }}>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "13px" }}>
                      {ex.item_name || ex.category || "Expense"}
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "3px", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {ex.expense_date ? new Date(ex.expense_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short"
                        }) : ""}
                      </span>
                      {ex.category && (
                        <span style={{
                          fontSize: "10px",
                          padding: "2px 7px",
                          borderRadius: "100px",
                          background: "var(--blue-dim)",
                          color: "var(--blue)",
                          fontWeight: "600"
                        }}>
                          {ex.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontWeight: "800", fontSize: "15px", color: "var(--red)" }}>
                    ₹{(parseFloat(ex.amount) || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
