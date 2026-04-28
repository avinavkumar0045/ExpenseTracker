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
    transaction_password: "",
    split_type: "equal"
  })
  const [groups, setGroups] = useState([])
  const [members, setMembers] = useState([])
  const [splitConfig, setSplitConfig] = useState({})
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
        .then(({ data }) => {
          const fetchedMembers = (data || []).map(d => d.users).filter(Boolean)
          setMembers(fetchedMembers)
          // Initialize equal split config
          const initialConfig = {}
          fetchedMembers.forEach(m => {
            initialConfig[m.user_id] = { percentage: Math.round(100 / fetchedMembers.length), customAmount: "" }
          })
          setSplitConfig(initialConfig)
        })
    } else {
      setMembers([])
      setSplitConfig({})
    }
  }, [form.group_id])

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSplitConfigChange = (userId, field, value) => {
    setSplitConfig(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value }
    }))
  }

  const validateSplits = () => {
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) return { valid: false, message: "Amount must be greater than 0" }

    if (form.split_type === "percentage") {
      const totalPct = Object.values(splitConfig).reduce((sum, cfg) => sum + parseFloat(cfg.percentage || 0), 0)
      if (Math.abs(totalPct - 100) > 0.1) {
        return { valid: false, message: `Percentages must sum to 100%. Current: ${totalPct.toFixed(1)}%` }
      }
    }

    if (form.split_type === "custom") {
      const totalCustom = Object.values(splitConfig).reduce((sum, cfg) => sum + parseFloat(cfg.customAmount || 0), 0)
      if (Math.abs(totalCustom - amount) > 0.01) {
        return { valid: false, message: `Custom amounts must sum to Rs.${amount.toFixed(2)}. Current: Rs.${totalCustom.toFixed(2)}` }
      }
    }

    return { valid: true }
  }

  const calculateSplits = (memberList = members) => {
    const amount = parseFloat(form.amount)
    const memberCount = memberList.length
    if (memberCount === 0) return []

    if (form.split_type === "equal") {
      const share = amount / memberCount
      return memberList.map(m => ({
        user_id: m.user_id,
        share_amount: parseFloat(share.toFixed(2)),
        payment_status: m.user_id === user.user_id ? "paid" : "unpaid"
      }))
    }

    if (form.split_type === "percentage") {
      return memberList.map(m => {
        const pct = parseFloat(splitConfig[m.user_id]?.percentage || 0)
        return {
          user_id: m.user_id,
          share_amount: parseFloat(((amount * pct) / 100).toFixed(2)),
          payment_status: m.user_id === user.user_id ? "paid" : "unpaid"
        }
      })
    }

    if (form.split_type === "custom") {
      return memberList.map(m => ({
        user_id: m.user_id,
        share_amount: parseFloat(parseFloat(splitConfig[m.user_id]?.customAmount || 0).toFixed(2)),
        payment_status: m.user_id === user.user_id ? "paid" : "unpaid"
      }))
    }

    return []
  }

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

    const splitValidation = validateSplits()
    if (!splitValidation.valid) {
      setError(splitValidation.message)
      setLoading(false)
      return
    }

    try {
      // Insert expense with split_type
      const { data: expense, error: expErr } = await supabase.from("expenses").insert([{
        item_name: form.item_name,
        amount,
        group_id: form.group_id || null,
        paid_by: user.user_id,
        category: form.category,
        payment_source: form.payment_source,
        entered_transaction_password: form.transaction_password,
        split_type: form.group_id ? form.split_type : "equal"
      }]).select().single()
      if (expErr) throw expErr

      // If group: fetch fresh members and insert splits for ALL members
      if (form.group_id) {
        const { data: gmData } = await supabase.from("group_members").select("users(user_id, name)").eq("group_id", form.group_id)
        const freshMembers = (gmData || []).map(d => d.users).filter(Boolean)

        if (freshMembers.length > 0) {
          const splits = calculateSplits(freshMembers).map(s => ({
            expense_id: expense.expense_id,
            user_id: s.user_id,
            share_amount: s.share_amount,
            payment_status: s.payment_status
          }))
          await supabase.from("expense_splits").insert(splits)
        }

        // Update group wallet
        const { data: gw } = await supabase.from("group_wallet").select("*").eq("group_id", form.group_id).single()
        if (gw) {
          await supabase.from("group_wallet").update({ balance: Math.max(0, (gw.balance || 0) - amount) }).eq("group_id", form.group_id)
        }

        // Notify other members
        const notifs = members.filter(m => m.user_id !== user.user_id).map(m => ({
          user_id: m.user_id,
          message: `New expense "${form.item_name}" of Rs.${amount} added to your group (${form.split_type} split).`,
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

      setSuccess(`Expense "Rs.${amount}" added successfully!`)
      setForm({ item_name: "", amount: "", group_id: "", category: "general", payment_source: "personal", transaction_password: "", split_type: "equal" })
      setSplitConfig({})
      setTimeout(() => navigate("/dashboard"), 2000)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const categories = ["general", "food", "travel", "accommodation", "entertainment", "utilities", "shopping", "health"]
  const splitTypes = [
    { value: "equal", label: "Equal", desc: "Split equally among all members" },
    { value: "percentage", label: "Percentage", desc: "Assign percentage to each member" },
    { value: "custom", label: "Custom", desc: "Enter exact amount for each member" }
  ]

  const renderSplitConfig = () => {
    if (!form.group_id || members.length === 0) return null

    return (
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Split Configuration
        </label>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {splitTypes.map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => setForm({ ...form, split_type: type.value })}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "10px",
                border: `1px solid ${form.split_type === type.value ? "var(--accent)" : "var(--border)"}`,
                background: form.split_type === type.value ? "var(--accent-dim)" : "var(--bg-tertiary)",
                color: form.split_type === type.value ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: form.split_type === type.value ? "700" : "500",
                fontSize: "13px",
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <div style={{ fontWeight: "700" }}>{type.label}</div>
              <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "2px" }}>{type.desc}</div>
            </button>
          ))}
        </div>

        {form.split_type === "equal" && form.amount && (
          <div style={{ background: "var(--accent-dim)", border: "1px solid rgba(200,246,90,0.15)", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "12px", color: "var(--accent)", fontWeight: "700", marginBottom: "8px" }}>
              Equal Split — {members.length} members
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {members.map(m => (
                <div key={m.user_id} style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "100px", background: "rgba(200,246,90,0.1)", color: "var(--accent)", fontWeight: "600" }}>
                  {m.name}: Rs.{(parseFloat(form.amount || 0) / members.length).toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        )}

        {form.split_type === "percentage" && (
          <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "700", marginBottom: "12px" }}>
              Assign Percentages (Total: {Object.values(splitConfig).reduce((s, c) => s + parseFloat(c.percentage || 0), 0)}%)
            </div>
            {members.map(m => (
              <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                <div style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)" }}>{m.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={splitConfig[m.user_id]?.percentage || ""}
                    onChange={e => handleSplitConfigChange(m.user_id, "percentage", e.target.value)}
                    style={{ width: "70px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 10px", fontSize: "14px", textAlign: "right" }}
                  />
                  <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>%</span>
                </div>
                {form.amount && (
                  <div style={{ width: "80px", textAlign: "right", fontSize: "13px", color: "var(--accent)", fontWeight: "600" }}>
                    Rs.{((parseFloat(form.amount || 0) * parseFloat(splitConfig[m.user_id]?.percentage || 0)) / 100).toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {form.split_type === "custom" && (
          <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "700", marginBottom: "12px" }}>
              Enter Custom Amounts (Total: Rs.{Object.values(splitConfig).reduce((s, c) => s + parseFloat(c.customAmount || 0), 0).toFixed(2)} / Rs.{parseFloat(form.amount || 0).toFixed(2)})
            </div>
            {members.map(m => (
              <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                <div style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)" }}>{m.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>Rs.</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={splitConfig[m.user_id]?.customAmount || ""}
                    onChange={e => handleSplitConfigChange(m.user_id, "customAmount", e.target.value)}
                    style={{ width: "90px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 10px", fontSize: "14px", textAlign: "right" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

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
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Amount (Rs.)</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "16px", fontWeight: "700" }}>Rs.</span>
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

          {renderSplitConfig()}

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Transaction Password</label>
            <input name="transaction_password" type="password" value={form.transaction_password} onChange={handleChange} placeholder="••••••••" required style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text-primary)", padding: "13px 16px", fontSize: "14px" }} onFocus={e => e.target.style.borderColor = "var(--accent)"} onBlur={e => e.target.style.borderColor = "var(--border)"} />
          </div>

          <button type="submit" disabled={loading} style={{ width: "100%", padding: "15px", background: loading ? "rgba(200,246,90,0.5)" : "var(--accent)", color: "#000", fontWeight: "800", fontSize: "15px", border: "none", borderRadius: "12px", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Adding expense..." : "Add Expense →"}
          </button>
        </form>
      </div>
    </div>
  )
}
