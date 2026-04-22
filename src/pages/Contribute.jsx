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
