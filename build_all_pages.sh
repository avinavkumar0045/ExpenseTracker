#!/bin/bash

echo "Building all remaining pages with schema-correct code..."

# ============================================
# GROUP DETAIL PAGE
# ============================================
cat > src/pages/GroupDetail.jsx << 'GDEOF'
import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
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
  const { id } = useParams() // Get group_id from URL
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
GDEOF

echo "✅ GroupDetail page created"

# ============================================
# WALLET PAGE (READ-ONLY - shows balance & history)
# ============================================
cat > src/pages/Wallet.jsx << 'WEOF'
import { useState, useEffect } from "react"
import { auth, supabase } from "../supabase/client"

/**
 * WALLET PAGE
 * 
 * Displays:
 * - Personal wallet balance (READ-ONLY)
 * - Transaction history
 * 
 * NOTE: Users CANNOT manually add funds to their wallet
 * Balance starts at ₹100,000 (paper trading default) on registration
 * Balance only updates automatically via expenses and contributions
 * 
 * Schema tables used:
 * - personal_wallet (user_id, balance)
 * - transactions (transaction_id, user_id, amount, direction, category, item_name)
 */
export default function Wallet() {
  const user = auth.getUser()
  
  // State management
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch wallet data on component mount
  useEffect(() => {
    if (!user?.user_id) return
    
    const fetchWalletData = async () => {
      setLoading(true)
      
      // Fetch personal wallet balance
      const { data: walletData } = await supabase
        .from("personal_wallet")
        .select("*")
        .eq("user_id", user.user_id)
        .single()
      
      setWallet(walletData)
      
      // Fetch transaction history (last 20 transactions)
      const { data: txData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(20)
      
      setTransactions(txData || [])
      setLoading(false)
    }
    
    fetchWalletData()
  }, [user?.user_id])

  return (
    <div style={{ maxWidth: "800px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.03em" }}>My Wallet</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>
          View your balance and transaction history
        </p>
      </div>

      {/* Balance Card (gradient background like CRED) */}
      <div style={{
        background: "linear-gradient(135deg, #C8F65A 0%, #52E89A 100%)",
        borderRadius: "20px",
        padding: "36px 32px",
        marginBottom: "24px",
        color: "#000",
        boxShadow: "0 8px 32px rgba(200,246,90,0.2)"
      }}>
        <div style={{ fontSize: "13px", opacity: 0.7, marginBottom: "8px", fontWeight: "600" }}>
          Current Balance
        </div>
        <div style={{ fontSize: "44px", fontWeight: "900", letterSpacing: "-0.03em" }}>
          ₹{loading ? "..." : (parseFloat(wallet?.balance) || 0).toFixed(2)}
        </div>
        <div style={{ fontSize: "12px", opacity: 0.6, marginTop: "12px" }}>
          💡 Your balance updates automatically via expenses and contributions
        </div>
      </div>

      {/* Info box - explaining wallet rules */}
      <div style={{
        background: "var(--blue-dim)",
        border: "1px solid rgba(96,165,250,0.2)",
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "24px"
      }}>
        <div style={{ fontSize: "13px", color: "var(--blue)", lineHeight: 1.6 }}>
          <strong>ℹ️ How your wallet works:</strong><br/>
          • Started with ₹1,00,000 (like a paper trading account)<br/>
          • Balance decreases when you add expenses<br/>
          • Balance increases when you receive contributions<br/>
          • You cannot manually add or withdraw funds
        </div>
      </div>

      {/* Transaction History */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "24px"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}>
          <div style={{
            fontSize: "13px",
            fontWeight: "700",
            color: "var(--text-secondary)",
            letterSpacing: "0.06em",
            textTransform: "uppercase"
          }}>
            Transaction History
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Last 20 transactions
          </div>
        </div>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
            <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>No transactions yet</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {transactions.map(tx => {
              const isCredit = tx.direction === "CREDIT"
              
              return (
                <div key={tx.transaction_id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)"
                }}>
                  {/* Transaction icon */}
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: isCredit ? "var(--green-dim)" : "var(--red-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    flexShrink: 0
                  }}>
                    {isCredit ? "↓" : "↑"}
                  </div>
                  
                  {/* Transaction details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>
                      {tx.item_name || tx.category || tx.transaction_type || "Transaction"}
                    </div>
                    <div style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      marginTop: "4px"
                    }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        }) : ""}
                      </span>
                      {tx.category && (
                        <span style={{
                          fontSize: "10px",
                          padding: "2px 8px",
                          borderRadius: "100px",
                          background: "var(--purple-dim)",
                          color: "var(--purple)",
                          fontWeight: "600"
                        }}>
                          {tx.category}
                        </span>
                      )}
                      <span style={{
                        fontSize: "10px",
                        padding: "2px 8px",
                        borderRadius: "100px",
                        background: isCredit ? "var(--green-dim)" : "var(--red-dim)",
                        color: isCredit ? "var(--green)" : "var(--red)",
                        fontWeight: "600"
                      }}>
                        {tx.transaction_type}
                      </span>
                    </div>
                  </div>
                  
                  {/* Transaction amount */}
                  <div style={{
                    fontWeight: "800",
                    fontSize: "16px",
                    color: isCredit ? "var(--green)" : "var(--red)"
                  }}>
                    {isCredit ? "+" : "−"}₹{Math.abs(parseFloat(tx.amount) || 0).toFixed(2)}
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
WEOF

echo "✅ Wallet page created"

# ============================================
# CONTRIBUTE PAGE (with transaction password modal)
# ============================================
cat > src/pages/Contribute.jsx << 'CONTRIBEOF'
import { useState, useEffect } from "react"
import { auth, supabase } from "../supabase/client"
import TransactionPasswordModal from "../components/TransactionPasswordModal"

/**
 * CONTRIBUTE PAGE
 * 
 * Allows users to contribute money to a group wallet
 * Requires transaction password verification before submission
 * 
 * Flow:
 * 1. User fills form (group, amount, note)
 * 2. Clicks "Contribute" button
 * 3. Transaction password modal appears
 * 4. After password verification, contribution is processed:
 *    - Deducts amount from personal_wallet
 *    - Adds amount to group_wallet
 *    - Records in contributions table
 *    - Creates transaction record
 *    - Sends notifications to group members
 * 
 * Schema tables used:
 * - contributions (user_id, group_id, amount, entered_transaction_password)
 * - personal_wallet (user_id, balance)
 * - group_wallet (group_id, balance)
 * - transactions (user_id, group_id, amount, direction, transaction_type)
 * - notifications (user_id, message, notification_type, related_group_id)
 */
export default function Contribute() {
  const user = auth.getUser()
  
  // Form state
  const [groups, setGroups] = useState([])
  const [form, setForm] = useState({ group_id: "", amount: "", note: "" })
  const [contributions, setContributions] = useState([])
  
  // UI state
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  // Fetch user's groups and contribution history
  useEffect(() => {
    if (!user?.user_id) return
    
    const fetchData = async () => {
      // Fetch groups the user is a member of
      const { data: groupsData } = await supabase
        .from("group_members")
        .select("groups(*)")
        .eq("user_id", user.user_id)
      
      setGroups((groupsData || []).map(d => d.groups).filter(Boolean))
      
      // Fetch recent contributions
      const { data: contribData } = await supabase
        .from("contributions")
        .select("*, groups(group_name)")
        .eq("user_id", user.user_id)
        .order("contributed_at", { ascending: false })
        .limit(10)
      
      setContributions(contribData || [])
    }
    
    fetchData()
  }, [user?.user_id])

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  // Step 1: Form submission - show password modal
  const handleSubmit = (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    
    // Validate amount
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount greater than 0")
      return
    }
    
    if (!form.group_id) {
      setError("Please select a group")
      return
    }
    
    // Show transaction password modal
    setShowPasswordModal(true)
  }

  // Step 2: Process contribution after password verification
  const processContribution = async (transactionPassword) => {
    setLoading(true)
    setError("")
    
    try {
      const amount = parseFloat(form.amount)
      
      // Verify transaction password
      const isValid = await auth.verifyTransactionPassword(user.user_id, transactionPassword)
      if (!isValid) {
        throw new Error("Invalid transaction password")
      }
      
      // Check if user has sufficient balance
      const { data: wallet } = await supabase
        .from("personal_wallet")
        .select("balance")
        .eq("user_id", user.user_id)
        .single()
      
      if (!wallet || parseFloat(wallet.balance) < amount) {
        throw new Error("Insufficient balance in your wallet")
      }
      
      // Begin transaction (using Supabase RPC would be better, but keeping it simple)
      
      // 1. Insert contribution record
      const { data: contribution, error: contribError } = await supabase
        .from("contributions")
        .insert([{
          user_id: user.user_id,
          group_id: form.group_id,
          amount: amount,
          entered_transaction_password: transactionPassword
        }])
        .select()
        .single()
      
      if (contribError) throw contribError
      
      // 2. Deduct from personal wallet
      await supabase
        .from("personal_wallet")
        .update({ balance: parseFloat(wallet.balance) - amount })
        .eq("user_id", user.user_id)
      
      // 3. Add to group wallet
      const { data: groupWallet } = await supabase
        .from("group_wallet")
        .select("balance")
        .eq("group_id", form.group_id)
        .single()
      
      const newGroupBalance = (parseFloat(groupWallet?.balance) || 0) + amount
      
      await supabase
        .from("group_wallet")
        .update({ balance: newGroupBalance })
        .eq("group_id", form.group_id)
      
      // 4. Record transaction
      await supabase.from("transactions").insert([{
        user_id: user.user_id,
        group_id: form.group_id,
        transaction_type: "CONTRIBUTION",
        amount: amount,
        direction: "DEBIT", // Money leaving personal wallet
        item_name: form.note || "Group contribution",
        category: "contribution"
      }])
      
      // 5. Notify other group members
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", form.group_id)
        .neq("user_id", user.user_id)
      
      if (members && members.length > 0) {
        const notifications = members.map(m => ({
          user_id: m.user_id,
          message: `${user.name} contributed ₹${amount.toFixed(2)} to the group${form.note ? `: ${form.note}` : ""}`,
          notification_type: "GROUP",
          related_group_id: form.group_id,
          is_read: false
        }))
        
        await supabase.from("notifications").insert(notifications)
      }
      
      setSuccess(`₹${amount} contributed successfully!`)
      setForm({ group_id: "", amount: "", note: "" })
      
      // Refresh contribution history
      const { data: contribData } = await supabase
        .from("contributions")
        .select("*, groups(group_name)")
        .eq("user_id", user.user_id)
        .order("contributed_at", { ascending: false })
        .limit(10)
      
      setContributions(contribData || [])
      
    } catch (err) {
      setError(err.message || "Failed to process contribution")
      throw err // Re-throw to show error in modal
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: "900px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.03em" }}>💳 Contribute</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>
          Make a contribution to a group wallet
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* CONTRIBUTION FORM */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "28px"
        }}>
          <h2 style={{
            fontSize: "15px",
            fontWeight: "700",
            color: "var(--text-secondary)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "18px"
          }}>
            New Contribution
          </h2>

          {error && (
            <div style={{
              background: "var(--red-dim)",
              border: "1px solid rgba(255,85,85,0.2)",
              borderRadius: "10px",
              padding: "12px 16px",
              color: "var(--red)",
              fontSize: "13px",
              marginBottom: "14px"
            }}>
              {error}
            </div>
          )}
          
          {success && (
            <div style={{
              background: "var(--green-dim)",
              border: "1px solid rgba(82,232,154,0.2)",
              borderRadius: "10px",
              padding: "12px 16px",
              color: "var(--green)",
              fontSize: "13px",
              marginBottom: "14px"
            }}>
              ✓ {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Group selection */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.06em"
              }}>
                Group
              </label>
              <select
                name="group_id"
                value={form.group_id}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  color: "var(--text-primary)",
                  padding: "13px 16px",
                  fontSize: "14px"
                }}
              >
                <option value="">Select a group</option>
                {groups.map(g => (
                  <option key={g.group_id} value={g.group_id}>{g.group_name}</option>
                ))}
              </select>
            </div>

            {/* Amount input */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.06em"
              }}>
                Amount (₹)
              </label>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                placeholder="0.00"
                required
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  color: "var(--text-primary)",
                  padding: "13px 16px",
                  fontSize: "14px"
                }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Note input */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.06em"
              }}>
                Note (optional)
              </label>
              <input
                name="note"
                value={form.note}
                onChange={handleChange}
                placeholder="e.g. My share for hotel"
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  color: "var(--text-primary)",
                  padding: "13px 16px",
                  fontSize: "14px"
                }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: loading ? "rgba(200,246,90,0.5)" : "var(--accent)",
                color: "#000",
                fontWeight: "800",
                fontSize: "15px",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Processing..." : "Contribute →"}
            </button>
          </form>
        </div>

        {/* CONTRIBUTION HISTORY */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "28px"
        }}>
          <h2 style={{
            fontSize: "15px",
            fontWeight: "700",
            color: "var(--text-secondary)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "14px"
          }}>
            Contribution History
          </h2>
          
          {contributions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px" }}>
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>📭</div>
              <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>No contributions yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {contributions.map(c => (
                <div key={c.contribution_id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)"
                }}>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>
                      {c.groups?.group_name || "Unknown Group"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {c.note || "No note"} · {c.contributed_at ? new Date(c.contributed_at).toLocaleDateString() : ""}
                    </div>
                  </div>
                  <div style={{ fontWeight: "800", color: "var(--purple)", fontSize: "15px" }}>
                    ₹{parseFloat(c.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Password Modal */}
      <TransactionPasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={processContribution}
        title="Authorize Contribution"
        description={`You are about to contribute ₹${form.amount} to this group. Enter your transaction password to confirm.`}
      />
    </div>
  )
}
CONTRIBEOF

echo "✅ Contribute page created"

# ============================================
# ADD EXPENSE PAGE (Complex - handles splits, transaction password, etc.)
# ============================================
cat > src/pages/AddExpense.jsx << 'ADDEXPEOF'
import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { auth, supabase } from "../supabase/client"
import TransactionPasswordModal from "../components/TransactionPasswordModal"

/**
 * ADD EXPENSE PAGE
 * 
 * Most complex page - handles:
 * 1. Expense creation (personal or group)
 * 2. Automatic expense splitting (equal, full, custom)
 * 3. Wallet balance updates (personal and/or group)
 * 4. Transaction password verification
 * 5. Member notifications
 * 
 * Flow:
 * 1. User fills form
 * 2. If group expense with equal split - shows preview of who pays what
 * 3. User clicks "Add Expense"
 * 4. Transaction password modal appears
 * 5. After verification, complex multi-table transaction:
 *    - Insert into expenses table
 *    - Insert expense_splits for each member
 *    - Update personal_wallet (deduct from paid_by user)
 *    - Update group_wallet if payment_source = 'group'
 *    - Insert transaction record
 *    - Send notifications to all group members
 * 
 * Schema tables used:
 * - expenses (expense_id, paid_by, group_id, amount, category, item_name, payment_source, entered_transaction_password)
 * - expense_splits (expense_id, user_id, share_amount, payment_status)
 * - personal_wallet (user_id, balance)
 * - group_wallet (group_id, balance)
 * - transactions (user_id, group_id, amount, direction, transaction_type, category, item_name)
 * - notifications (user_id, message, notification_type, related_group_id)
 */
export default function AddExpense() {
  const user = auth.getUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Form state
  const [form, setForm] = useState({
    item_name: "",
    amount: "",
    group_id: searchParams.get("group") || "",
    category: "general",
    payment_source: "personal" // 'personal' or 'group'
  })
  
  // Data state
  const [groups, setGroups] = useState([])
  const [members, setMembers] = useState([])
  
  // UI state
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  // Fetch user's groups
  useEffect(() => {
    if (user?.user_id) {
      supabase
        .from("group_members")
        .select("groups(*)")
        .eq("user_id", user.user_id)
        .then(({ data }) => setGroups((data || []).map(d => d.groups).filter(Boolean)))
    }
  }, [user?.user_id])

  // Fetch group members when group is selected
  useEffect(() => {
    if (form.group_id) {
      supabase
        .from("group_members")
        .select("users(user_id, name)")
        .eq("group_id", form.group_id)
        .then(({ data }) => setMembers((data || []).map(d => d.users).filter(Boolean)))
    } else {
      setMembers([])
    }
  }, [form.group_id])

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  // Step 1: Form submission - show password modal
  const handleSubmit = (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) {
      setError("Amount must be greater than 0")
      return
    }
    
    // Show transaction password modal
    setShowPasswordModal(true)
  }

  // Step 2: Process expense after password verification
  const processExpense = async (transactionPassword) => {
    setLoading(true)
    setError("")
    
    try {
      const amount = parseFloat(form.amount)
      
      // Verify transaction password
      const isValid = await auth.verifyTransactionPassword(user.user_id, transactionPassword)
      if (!isValid) {
        throw new Error("Invalid transaction password")
      }
      
      // Check wallet balance
      const { data: wallet } = await supabase
        .from("personal_wallet")
        .select("balance")
        .eq("user_id", user.user_id)
        .single()
      
      if (!wallet || parseFloat(wallet.balance) < amount) {
        throw new Error("Insufficient balance in your wallet")
      }
      
      // 1. Insert expense record
      const { data: expense, error: expError } = await supabase
        .from("expenses")
        .insert([{
          paid_by: user.user_id,
          group_id: form.group_id || null,
          amount: amount,
          category: form.category,
          item_name: form.item_name,
          payment_source: form.payment_source,
          entered_transaction_password: transactionPassword,
          expense_date: new Date().toISOString().split('T')[0] // Today's date
        }])
        .select()
        .single()
      
      if (expError) throw expError
      
      // 2. If group expense: create expense splits
      if (form.group_id && members.length > 0) {
        const shareAmount = amount / members.length
        
        const splits = members.map(m => ({
          expense_id: expense.expense_id,
          user_id: m.user_id,
          share_amount: parseFloat(shareAmount.toFixed(2)),
          payment_status: m.user_id === user.user_id ? "paid" : "unpaid"
        }))
        
        await supabase.from("expense_splits").insert(splits)
        
        // Update group wallet if payment source is 'group'
        if (form.payment_source === "group") {
          const { data: gw } = await supabase
            .from("group_wallet")
            .select("balance")
            .eq("group_id", form.group_id)
            .single()
          
          if (gw) {
            const newBalance = Math.max(0, parseFloat(gw.balance) - amount)
            await supabase
              .from("group_wallet")
              .update({ balance: newBalance })
              .eq("group_id", form.group_id)
          }
        }
        
        // Notify other group members
        const otherMembers = members.filter(m => m.user_id !== user.user_id)
        if (otherMembers.length > 0) {
          const notifications = otherMembers.map(m => ({
            user_id: m.user_id,
            message: `New expense "${form.item_name}" of ₹${amount.toFixed(2)} added. Your share: ₹${shareAmount.toFixed(2)}`,
            notification_type: "GROUP",
            related_group_id: form.group_id,
            is_read: false
          }))
          
          await supabase.from("notifications").insert(notifications)
        }
      }
      
      // 3. Update personal wallet (deduct amount from paid_by user)
      const newBalance = parseFloat(wallet.balance) - amount
      await supabase
        .from("personal_wallet")
        .update({ balance: Math.max(0, newBalance) })
        .eq("user_id", user.user_id)
      
      // 4. Insert transaction record
      await supabase.from("transactions").insert([{
        user_id: user.user_id,
        group_id: form.group_id || null,
        transaction_type: "EXPENSE",
        amount: amount,
        direction: "DEBIT",
        category: form.category,
        item_name: form.item_name,
        payment_source: form.payment_source
      }])
      
      setSuccess(`Expense "₹${amount}" added successfully!`)
      setForm({
        item_name: "",
        amount: "",
        group_id: "",
        category: "general",
        payment_source: "personal"
      })
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => navigate("/dashboard"), 2000)
      
    } catch (err) {
      setError(err.message || "Failed to add expense")
      throw err // Re-throw to show error in modal
    } finally {
      setLoading(false)
    }
  }

  // Category options
  const categories = ["general", "food", "travel", "accommodation", "entertainment", "utilities", "shopping", "health"]

  return (
    <div style={{ maxWidth: "700px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.03em" }}>Add Expense</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>
          Record a new expense
        </p>
      </div>

      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "32px"
      }}>
        {error && (
          <div style={{
            background: "var(--red-dim)",
            border: "1px solid rgba(255,85,85,0.2)",
            borderRadius: "10px",
            padding: "12px 16px",
            color: "var(--red)",
            fontSize: "13px",
            marginBottom: "20px"
          }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{
            background: "var(--green-dim)",
            border: "1px solid rgba(82,232,154,0.2)",
            borderRadius: "10px",
            padding: "12px 16px",
            color: "var(--green)",
            fontSize: "13px",
            marginBottom: "20px"
          }}>
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Item Name */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "600",
              color: "var(--text-secondary)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.06em"
            }}>
              Description
            </label>
            <input
              name="item_name"
              value={form.item_name}
              onChange={handleChange}
              placeholder="e.g. Dinner at restaurant"
              required
              style={{
                width: "100%",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                color: "var(--text-primary)",
                padding: "13px 16px",
                fontSize: "14px"
              }}
              onFocus={e => e.target.style.borderColor = "var(--accent)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
          </div>

          {/* Amount */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "600",
              color: "var(--text-secondary)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.06em"
            }}>
              Amount (₹)
            </label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute",
                left: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                fontSize: "16px",
                fontWeight: "700"
              }}>
                ₹
              </span>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                placeholder="0.00"
                required
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  color: "var(--text-primary)",
                  padding: "13px 16px 13px 36px",
                  fontSize: "20px",
                  fontWeight: "700"
                }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
            </div>
          </div>

          {/* Group and Payment Source - Row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "20px"
          }}>
            <div>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.06em"
              }}>
                Group
              </label>
              <select
                name="group_id"
                value={form.group_id}
                onChange={handleChange}
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  color: "var(--text-primary)",
                  padding: "13px 16px",
                  fontSize: "14px"
                }}
              >
                <option value="">Personal (no group)</option>
                {groups.map(g => (
                  <option key={g.group_id} value={g.group_id}>{g.group_name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.06em"
              }}>
                Paid From
              </label>
              <select
                name="payment_source"
                value={form.payment_source}
                onChange={handleChange}
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  color: "var(--text-primary)",
                  padding: "13px 16px",
                  fontSize: "14px"
                }}
              >
                <option value="personal">Personal Wallet</option>
                <option value="group">Group Wallet</option>
              </select>
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom: "28px" }}>
            <label style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "600",
              color: "var(--text-secondary)",
              marginBottom: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.06em"
            }}>
              Category
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat })}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "100px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border: `1px solid ${form.category === cat ? "var(--accent)" : "var(--border)"}`,
                    background: form.category === cat ? "var(--accent-dim)" : "var(--bg-tertiary)",
                    color: form.category === cat ? "var(--accent)" : "var(--text-secondary)",
                    cursor: "pointer",
                    textTransform: "capitalize"
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Split Preview (if group expense) */}
          {form.group_id && members.length > 0 && form.amount && (
            <div style={{
              background: "var(--accent-dim)",
              border: "1px solid rgba(200,246,90,0.15)",
              borderRadius: "10px",
              padding: "14px 16px",
              marginBottom: "20px"
            }}>
              <div style={{
                fontSize: "12px",
                color: "var(--accent)",
                fontWeight: "700",
                marginBottom: "8px"
              }}>
                Split Preview — {members.length} members (equal split)
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {members.map(m => (
                  <div key={m.user_id} style={{
                    fontSize: "12px",
                    padding: "4px 10px",
                    borderRadius: "100px",
                    background: "rgba(200,246,90,0.1)",
                    color: "var(--accent)",
                    fontWeight: "600"
                  }}>
                    {m.name}: ₹{(parseFloat(form.amount || 0) / members.length).toFixed(2)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              background: loading ? "rgba(200,246,90,0.5)" : "var(--accent)",
              color: "#000",
              fontWeight: "800",
              fontSize: "15px",
              border: "none",
              borderRadius: "12px",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Adding expense..." : "Add Expense →"}
          </button>
        </form>
      </div>

      {/* Transaction Password Modal */}
      <TransactionPasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={processExpense}
        title="Authorize Expense"
        description={`You are about to add an expense of ₹${form.amount}. Enter your transaction password to confirm.`}
      />
    </div>
  )
}
ADDEXPEOF

echo "✅ AddExpense page created"

# ============================================
# NOTIFICATIONS PAGE
# ============================================
cat > src/pages/Notifications.jsx << 'NOTIFEOF'
import { useState, useEffect } from "react"
import { auth, supabase } from "../supabase/client"

/**
 * NOTIFICATIONS PAGE
 * 
 * Displays all user notifications with mark as read functionality
 * 
 * Schema tables used:
 * - notifications (notification_id, user_id, message, notification_type, is_read, created_at)
 */
export default function Notifications() {
  const user = auth.getUser()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch notifications on component mount
  useEffect(() => {
    if (!user?.user_id) return
    
    const fetchNotifications = async () => {
      setLoading(true)
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false })
      
      setNotifications(data || [])
      setLoading(false)
    }
    
    fetchNotifications()
  }, [user?.user_id])

  // Mark a single notification as read
  const markRead = async (id) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("notification_id", id)
    
    setNotifications(prev =>
      prev.map(n => (n.notification_id === id ? { ...n, is_read: true } : n))
    )
  }

  // Mark all notifications as read
  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.user_id)
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  // Icon for notification type
  const iconForType = (type) => {
    if (type === "PERSONAL") return "👤"
    if (type === "GROUP") return "👥"
    return "🔔"
  }

  return (
    <div style={{ maxWidth: "800px" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "28px"
      }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.03em" }}>
            🔔 Notifications
            {unreadCount > 0 && (
              <span style={{
                marginLeft: "10px",
                background: "var(--red)",
                color: "#fff",
                borderRadius: "999px",
                padding: "2px 10px",
                fontSize: "14px",
                fontWeight: "700"
              }}>
                {unreadCount}
              </span>
            )}
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>
            Stay updated on your group activity
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "var(--accent-dim)",
              color: "var(--accent)",
              fontWeight: "600",
              fontSize: "13px",
              border: "1px solid rgba(200,246,90,0.2)",
              cursor: "pointer"
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        overflow: "hidden"
      }}>
        {loading ? (
          <div style={{
            textAlign: "center",
            padding: "48px",
            color: "var(--text-muted)",
            fontSize: "14px"
          }}>
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔕</div>
            <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-secondary)" }}>
              You're all caught up!
            </p>
            <p style={{ fontSize: "14px", marginTop: "4px", color: "var(--text-muted)" }}>
              No notifications yet.
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((n, idx) => (
              <div
                key={n.notification_id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "16px 20px",
                  background: n.is_read ? "var(--bg-card)" : "var(--accent-dim)",
                  borderBottom: idx < notifications.length - 1 ? "1px solid var(--border)" : "none",
                  transition: "background 0.2s"
                }}
              >
                <div style={{ fontSize: "24px", marginTop: "2px" }}>
                  {iconForType(n.notification_type)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: n.is_read ? "500" : "700",
                    fontSize: "14px",
                    color: n.is_read ? "var(--text-secondary)" : "var(--text-primary)"
                  }}>
                    {n.message || "You have a new notification"}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    {n.created_at ? new Date(n.created_at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    }) : ""}
                  </div>
                </div>
                
                {!n.is_read && (
                  <button
                    onClick={() => markRead(n.notification_id)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "6px",
                      background: "var(--bg-card)",
                      color: "var(--accent)",
                      fontWeight: "600",
                      fontSize: "12px",
                      border: "1px solid rgba(200,246,90,0.2)",
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}
                  >
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
NOTIFEOF

echo "✅ Notifications page created"
echo ""
echo "🎉 ALL PAGES CREATED SUCCESSFULLY!"
