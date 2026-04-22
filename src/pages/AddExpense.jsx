import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { auth, supabase } from "../supabase/client"

export default function AddExpense() {
  const user = auth.getUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({
    item_name: "",
    amount: "",
    group_id: searchParams.get("group") || "",
    category: "general",
    payment_source: "personal",
    transaction_password: ""
  })
  const [groups, setGroups] = useState([])
  const [members, setMembers] = useState([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.user_id) {
      supabase.from("group_members").select("groups(*)").eq("user_id", user.user_id)
        .then(({ data }) => setGroups((data || []).map(d => d.groups).filter(Boolean)))
    }
  }, [user?.user_id])

  useEffect(() => {
    if (form.group_id) {
      supabase.from("group_members").select("users(user_id, name)").eq("group_id", form.group_id)
        .then(({ data }) => setMembers((data || []).map(d => d.users).filter(Boolean)))
    } else {
      setMembers([])
    }
  }, [form.group_id])

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) {
      setError("Amount must be greater than 0.")
      setLoading(false)
      return
    }

    if (form.transaction_password !== user.transaction_password) {
      setError("Incorrect transaction password")
      setLoading(false)
      return
    }

    try {
      // Insert expense
      const { data: expense, error: expErr } = await supabase.from("expenses").insert([{
        item_name: form.item_name,
        amount,
        group_id: form.group_id || null,
        paid_by: user.user_id,
        category: form.category,
        payment_source: form.payment_source,
        entered_transaction_password: form.transaction_password
      }]).select().single()
      if (expErr) throw expErr

      // If group: split among members
      if (form.group_id && members.length > 0) {
        const share = amount / members.length
        const splits = members.map(m => ({
          expense_id: expense.expense_id,
          user_id: m.user_id,
          share_amount: parseFloat(share.toFixed(2)),
          payment_status: m.user_id === user.user_id ? "paid" : "unpaid"
        }))
        await supabase.from("expense_splits").insert(splits)

        // Update group wallet
        const { data: gw } = await supabase.from("group_wallet").select("*").eq("group_id", form.group_id).single()
        if (gw) {
          await supabase.from("group_wallet").update({ balance: Math.max(0, (gw.balance || 0) - amount) }).eq("group_id", form.group_id)
        }

        // Notify other members
        const notifs = members.filter(m => m.user_id !== user.user_id).map(m => ({
          user_id: m.user_id,
          message: `New expense "${form.item_name}" of ₹${amount} added to your group. Your share: ₹${share.toFixed(2)}`,
          notification_type: "GROUP",
          related_group_id: form.group_id,
          is_read: false
        }))
        if (notifs.length > 0) await supabase.from("notifications").insert(notifs)
      }

      // Insert transaction record
      await supabase.from("transactions").insert([{
        user_id: user.user_id,
        group_id: form.group_id || null,
        transaction_type: "EXPENSE",
        amount,
        direction: "DEBIT",
        category: form.category,
        item_name: form.item_name,
        payment_source: form.payment_source
      }])

      // Update personal wallet
      const { data: pw } = await supabase.from("personal_wallet").select("*").eq("user_id", user.user_id).single()
      if (pw) {
        await supabase.from("personal_wallet").update({ balance: Math.max(0, (pw.balance || 0) - amount) }).eq("user_id", user.user_id)
      }

      setSuccess(`Expense "₹${amount}" added successfully!`)
      setForm({ item_name: "", amount: "", group_id: "", category: "general", payment_source: "personal", transaction_password: "" })
      setTimeout(() => navigate("/dashboard"), 2000)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const categories = ["general", "food", "travel", "accommodation", "entertainment", "utilities", "shopping", "health"]

  return (
    <div style={{ maxWidth: "700px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.03em" }}>Add Expense</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>Record a new expense</p>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "32px" }}>
        {error && <div style={{ background: "var(--red-dim)", border: "1px solid rgba(255,85,85,0.2)", borderRadius: "10px", padding: "12px 16px", color: "var(--red)", fontSize: "13px", marginBottom: "20px" }}>{error}</div>}
        {success && <div style={{ background: "var(--green-dim)", border: "1px solid rgba(82,232,154,0.2)", borderRadius: "10px", padding: "12px 16px", color: "var(--green)", fontSize: "13px", marginBottom: "20px" }}>✓ {success}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Description</label>
            <input name="item_name" value={form.item_name} onChange={handleChange} placeholder="e.g. Dinner at restaurant" required style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text-primary)", padding: "13px 16px", fontSize: "14px" }} onFocus={e => e.target.style.borderColor = "var(--accent)"} onBlur={e => e.target.style.borderColor = "var(--border)"} />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Amount (₹)</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "16px", fontWeight: "700" }}>₹</span>
              <input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={handleChange} placeholder="0.00" required style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text-primary)", padding: "13px 16px 13px 36px", fontSize: "20px", fontWeight: "700" }} onFocus={e => e.target.style.borderColor = "var(--accent)"} onBlur={e => e.target.style.borderColor = "var(--border)"} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Group</label>
              <select name="group_id" value={form.group_id} onChange={handleChange} style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text-primary)", padding: "13px 16px", fontSize: "14px" }}>
                <option value="">Personal (no group)</option>
                {groups.map(g => <option key={g.group_id} value={g.group_id}>{g.group_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Payment Source</label>
              <select name="payment_source" value={form.payment_source} onChange={handleChange} style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text-primary)", padding: "13px 16px", fontSize: "14px" }}>
                <option value="personal">Personal</option>
                <option value="group">Group</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Category</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {categories.map(cat => (
                <button key={cat} type="button" onClick={() => setForm({ ...form, category: cat })} style={{ padding: "7px 14px", borderRadius: "100px", fontSize: "12px", fontWeight: "600", border: `1px solid ${form.category === cat ? "var(--accent)" : "var(--border)"}`, background: form.category === cat ? "var(--accent-dim)" : "var(--bg-tertiary)", color: form.category === cat ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", textTransform: "capitalize" }}>{cat}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Transaction Password</label>
            <input name="transaction_password" type="password" value={form.transaction_password} onChange={handleChange} placeholder="••••••••" required style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text-primary)", padding: "13px 16px", fontSize: "14px" }} onFocus={e => e.target.style.borderColor = "var(--accent)"} onBlur={e => e.target.style.borderColor = "var(--border)"} />
          </div>

          {form.group_id && members.length > 0 && form.amount && (
            <div style={{ background: "var(--accent-dim)", border: "1px solid rgba(200,246,90,0.15)", borderRadius: "10px", padding: "14px 16px", marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", color: "var(--accent)", fontWeight: "700", marginBottom: "8px" }}>Split Preview — {members.length} members</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {members.map(m => (
                  <div key={m.user_id} style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "100px", background: "rgba(200,246,90,0.1)", color: "var(--accent)", fontWeight: "600" }}>
                    {m.name}: ₹{(parseFloat(form.amount || 0) / members.length).toFixed(2)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: "100%", padding: "15px", background: loading ? "rgba(200,246,90,0.5)" : "var(--accent)", color: "#000", fontWeight: "800", fontSize: "15px", border: "none", borderRadius: "12px", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Adding expense..." : "Add Expense →"}
          </button>
        </form>
      </div>
    </div>
  )
}
