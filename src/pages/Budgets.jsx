import { useState, useEffect } from "react"
import { auth, supabase } from "../supabase/client"
import { getMonthOptions, getYearOptions } from "../utils/dateFilters"

export default function Budgets() {
  const user = auth.getUser()
  const [budgets, setBudgets] = useState([])
  const [expenses, setExpenses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: "", category: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const categories = ["", "general", "food", "travel", "accommodation", "entertainment", "utilities", "shopping", "health"]

  useEffect(() => {
    if (user?.user_id) fetchData()
  }, [user?.user_id])

  async function fetchData() {
    setLoading(true)
    const [{ data: budgetData }, { data: expenseData }] = await Promise.all([
      supabase.from("budgets").select("*").eq("user_id", user.user_id).order("year", { ascending: false }).order("month", { ascending: false }),
      supabase.from("expenses").select("*").eq("paid_by", user.user_id)
    ])
    setBudgets(budgetData || [])
    setExpenses(expenseData || [])
    setLoading(false)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError("")
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) {
      setError("Budget amount must be greater than 0")
      return
    }

    const { error: insertErr } = await supabase.from("budgets").insert([{
      user_id: user.user_id,
      month: parseInt(form.month),
      year: parseInt(form.year),
      amount: amount,
      category: form.category || null
    }])

    if (insertErr) {
      setError(insertErr.message.includes("unique") ? "A budget for this month/year/category already exists." : insertErr.message)
      return
    }

    setForm({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: "", category: "" })
    setShowForm(false)
    fetchData()
  }

  const deleteBudget = async budgetId => {
    if (!confirm("Delete this budget?")) return
    await supabase.from("budgets").delete().eq("budget_id", budgetId)
    fetchData()
  }

  const getSpentForBudget = budget => {
    return expenses
      .filter(e => {
        const d = new Date(e.expense_date || e.created_at)
        return d.getMonth() + 1 === budget.month &&
          d.getFullYear() === budget.year &&
          (!budget.category || e.category === budget.category)
      })
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
  }

  const getStatusColor = pct => {
    if (pct >= 100) return "var(--red)"
    if (pct >= 80) return "var(--amber)"
    return "var(--green)"
  }

  return (
    <div style={{ maxWidth: "900px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.03em" }}>Budgets</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>Set monthly spending limits and track your progress</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: "10px 20px", borderRadius: "10px", background: "var(--accent)", color: "#000", fontWeight: "800", fontSize: "13px", border: "none", cursor: "pointer" }}
        >
          {showForm ? "Cancel" : "+ New Budget"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "16px" }}>Create Budget</div>
          {error && <div style={{ background: "var(--red-dim)", border: "1px solid rgba(255,85,85,0.2)", borderRadius: "10px", padding: "12px 16px", color: "var(--red)", fontSize: "13px", marginBottom: "14px" }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", alignItems: "end" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Month</label>
                <select value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px" }}>
                  {getMonthOptions().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Year</label>
                <select value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px" }}>
                  {getYearOptions().map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Amount (Rs.)</label>
                <input type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Category (optional)</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px" }}>
                  <option value="">All Categories</option>
                  {categories.filter(c => c).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" style={{ marginTop: "16px", padding: "10px 24px", borderRadius: "8px", background: "var(--accent)", color: "#000", fontWeight: "800", fontSize: "13px", border: "none", cursor: "pointer" }}>
              Create Budget
            </button>
          </form>
        </div>
      )}

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "16px" }}>Your Budgets ({budgets.length})</div>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>Loading...</div>
        ) : budgets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📊</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "15px", fontWeight: "600" }}>No budgets yet</div>
            <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "6px" }}>Create your first budget to track spending limits</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {budgets.map(b => {
              const spent = getSpentForBudget(b)
              const pct = Math.min((spent / parseFloat(b.amount)) * 100, 100)
              const statusColor = getStatusColor((spent / parseFloat(b.amount)) * 100)
              const monthName = getMonthOptions().find(m => m.value === b.month)?.label

              return (
                <div key={b.budget_id} style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "15px" }}>
                        {monthName} {b.year}
                        {b.category && <span style={{ marginLeft: "8px", fontSize: "11px", padding: "2px 8px", borderRadius: "100px", background: "var(--blue-dim)", color: "var(--blue)", fontWeight: "600", textTransform: "capitalize" }}>{b.category}</span>}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                        Rs.{spent.toFixed(2)} spent of Rs.{parseFloat(b.amount).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ fontWeight: "800", fontSize: "18px", color: statusColor }}>
                        {((spent / parseFloat(b.amount)) * 100).toFixed(0)}%
                      </div>
                      <button onClick={() => deleteBudget(b.budget_id)} style={{ padding: "6px 12px", borderRadius: "6px", background: "var(--red-dim)", color: "var(--red)", fontWeight: "700", fontSize: "11px", border: "1px solid rgba(255,85,85,0.2)", cursor: "pointer" }}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: "100%", height: "8px", background: "var(--bg-secondary)", borderRadius: "100px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: statusColor, borderRadius: "100px", transition: "width 0.5s ease" }} />
                  </div>

                  {spent > parseFloat(b.amount) && (
                    <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--red)", fontWeight: "600" }}>
                      ⚠ Budget exceeded by Rs.{(spent - parseFloat(b.amount)).toFixed(2)}
                    </div>
                  )}
                  {spent > parseFloat(b.amount) * 0.8 && spent <= parseFloat(b.amount) && (
                    <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--amber)", fontWeight: "600" }}>
                      ⚠ You've used {((spent / parseFloat(b.amount)) * 100).toFixed(0)}% of your budget
                    </div>
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
