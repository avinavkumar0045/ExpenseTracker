import { useState, useEffect } from "react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { auth, supabase } from "../supabase/client"
import { exportToCSV, exportToPDF, formatCurrency, formatDate } from "../utils/exportHelpers"

function formatInputDate(date) {
  return date.toISOString().split("T")[0]
}

export default function Reports() {
  const user = auth.getUser()
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [reportType, setReportType] = useState("monthly")
  const [fromDate, setFromDate] = useState(startOfMonth)
  const [toDate, setToDate] = useState(today)
  const [groupFilter, setGroupFilter] = useState("all")
  const [userGroups, setUserGroups] = useState([])
  const [previewData, setPreviewData] = useState([])
  const [headers, setHeaders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const reportTypes = [
    { value: "monthly", label: "Monthly Summary", desc: "All expenses you're involved in for selected month" },
    { value: "category", label: "Category Breakdown", desc: "Expenses grouped by category" },
    { value: "group", label: "Group Report", desc: "Group-wise expense summary" }
  ]

  useEffect(() => {
    fetchUserGroups()
  }, [])

  useEffect(() => {
    generatePreview()
  }, [reportType, fromDate, toDate, groupFilter])

  const fromDateStr = formatInputDate(fromDate)
  const toDateStr = formatInputDate(toDate)

  async function fetchUserGroups() {
    const { data } = await supabase
      .from("group_members")
      .select("group_id, groups(group_id, group_name)")
      .eq("user_id", user.user_id)
    const groups = (data || []).map(d => d.groups).filter(Boolean)
    setUserGroups(groups)
  }

  async function getInvolvedExpenseIds(startDate, endDate) {
    // Get expense IDs where user is either payer or has a split
    const [paidRes, splitRes] = await Promise.all([
      supabase
        .from("expenses")
        .select("expense_id")
        .eq("paid_by", user.user_id)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate),
      supabase
        .from("expense_splits")
        .select("expense_id")
        .eq("user_id", user.user_id)
    ])

    const paidIds = new Set((paidRes.data || []).map(e => e.expense_id))
    const splitIds = new Set((splitRes.data || []).map(s => s.expense_id))
    const allIds = Array.from(new Set([...paidIds, ...splitIds]))
    return allIds
  }

  async function generatePreview() {
    setLoading(true)
    setError("")
    try {
      let data = []
      let reportHeaders = []
      // Validate date range
      if (fromDate > toDate) {
        setError("From Date cannot be later than To Date")
        setLoading(false)
        return
      }

      // Get all expense IDs user is involved in
      const involvedIds = await getInvolvedExpenseIds(fromDateStr, toDateStr)
      if (involvedIds.length === 0) {
        setPreviewData([])
        setHeaders([])
        setLoading(false)
        return
      }

      // Fetch full expense details
      let query = supabase
        .from("expenses")
        .select("*, groups(group_name), expense_splits(user_id, share_amount, payment_status)")
        .in("expense_id", involvedIds)
        .gte("expense_date", fromDateStr)
        .lte("expense_date", toDateStr)

      if (groupFilter !== "all") {
        query = query.eq("group_id", parseInt(groupFilter))
      }

      const { data: expenses } = await query.order("expense_date", { ascending: false })
      const expenseList = expenses || []

      switch (reportType) {
        case "monthly": {
          data = expenseList.map(e => {
            const userSplit = e.expense_splits?.find(s => s.user_id === user.user_id)
            const isPayer = e.paid_by === user.user_id
            const yourShare = userSplit ? parseFloat(userSplit.share_amount || 0) : 0
            return {
              date: formatDate(e.expense_date),
              item: e.item_name || "—",
              category: e.category || "—",
              group: e.groups?.group_name || "Personal",
              total: formatCurrency(e.amount),
              yourShare: formatCurrency(yourShare),
              role: isPayer ? "Paid" : "Owes"
            }
          })
          reportHeaders = [
            { key: "date", label: "Date" },
            { key: "item", label: "Item" },
            { key: "category", label: "Category" },
            { key: "group", label: "Group" },
            { key: "total", label: "Total" },
            { key: "yourShare", label: "Your Share" },
            { key: "role", label: "Role" }
          ]
          break
        }

        case "category": {
          const categoryTotals = {}
          let total = 0
          expenseList.forEach(e => {
            const userSplit = e.expense_splits?.find(s => s.user_id === user.user_id)
            const isPayer = e.paid_by === user.user_id
            const amount = isPayer ? parseFloat(e.amount || 0) : parseFloat(userSplit?.share_amount || 0)
            const cat = e.category || "uncategorized"
            categoryTotals[cat] = (categoryTotals[cat] || 0) + amount
            total += amount
          })

          data = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .map(([category, amount]) => ({
              category: category.charAt(0).toUpperCase() + category.slice(1),
              amount: formatCurrency(amount),
              percentage: total > 0 ? `${((amount / total) * 100).toFixed(1)}%` : "0%"
            }))
          reportHeaders = [
            { key: "category", label: "Category" },
            { key: "amount", label: "Amount" },
            { key: "percentage", label: "% of Total" }
          ]
          break
        }

        case "group": {
          const groupTotals = {}
          expenseList.forEach(e => {
            const userSplit = e.expense_splits?.find(s => s.user_id === user.user_id)
            const isPayer = e.paid_by === user.user_id
            const amount = isPayer ? parseFloat(e.amount || 0) : parseFloat(userSplit?.share_amount || 0)
            const name = e.groups?.group_name || "Personal"
            groupTotals[name] = (groupTotals[name] || 0) + amount
          })

          data = Object.entries(groupTotals)
            .sort((a, b) => b[1] - a[1])
            .map(([groupName, amount]) => ({
              group: groupName,
              amount: formatCurrency(amount),
              transactions: expenseList.filter(e => (e.groups?.group_name || "Personal") === groupName).length
            }))
          reportHeaders = [
            { key: "group", label: "Group" },
            { key: "amount", label: "Amount" },
            { key: "transactions", label: "Transactions" }
          ]
          break
        }
      }

      setPreviewData(data)
      setHeaders(reportHeaders)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleExportCSV = () => {
    const filename = `expenseflow_${reportType}_${fromDateStr}_to_${toDateStr}`
    exportToCSV(previewData, headers, filename)
  }

  const handleExportPDF = () => {
    const title = reportTypes.find(t => t.value === reportType)?.label || "Report"
    const subtitle = `${fromDateStr} to ${toDateStr} — ${previewData.length} records`
    const filename = `expenseflow_${reportType}_${fromDateStr}_to_${toDateStr}`
    exportToPDF(title, subtitle, headers, previewData, filename)
  }

  const applyQuickFilter = (preset) => {
    const now = new Date()
    let from, to
    switch (preset) {
      case "last7":
        from = new Date(now); from.setDate(now.getDate() - 6)
        to = new Date(now)
        break
      case "last30":
        from = new Date(now); from.setDate(now.getDate() - 29)
        to = new Date(now)
        break
      case "thisMonth":
        from = new Date(now.getFullYear(), now.getMonth(), 1)
        to = new Date(now)
        break
      default:
        return
    }
    setFromDate(from)
    setToDate(to)
  }

  return (
    <div style={{ maxWidth: "1000px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.03em" }}>Reports</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>Generate and export expense reports</p>
      </div>

      {/* Report Configuration */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", marginBottom: "24px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "20px" }}>Report Configuration</div>

        {error && <div style={{ background: "var(--red-dim)", border: "1px solid rgba(255,85,85,0.2)", borderRadius: "10px", padding: "12px 16px", color: "var(--red)", fontSize: "13px", marginBottom: "14px" }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {/* Report Type */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)} style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px" }}>
              {reportTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{reportTypes.find(t => t.value === reportType)?.desc}</div>
          </div>

          {/* Group Filter */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Group</label>
            <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px" }}>
              <option value="all">All Groups</option>
              {userGroups.map(g => <option key={g.group_id} value={g.group_id}>{g.group_name}</option>)}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>From</label>
            <DatePicker
              selected={fromDate}
              onChange={date => setFromDate(date)}
              maxDate={today}
              placeholderText="Select start date"
              dateFormat="yyyy-MM-dd"
              className="dark-datepicker"
              calendarClassName="dark-calendar"
            />
          </div>

          {/* To Date */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>To</label>
            <DatePicker
              selected={toDate}
              onChange={date => setToDate(date)}
              maxDate={today}
              minDate={fromDate}
              placeholderText="Select end date"
              dateFormat="yyyy-MM-dd"
              className="dark-datepicker"
              calendarClassName="dark-calendar"
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {[
            { key: "last7", label: "Last 7 Days" },
            { key: "last30", label: "Last 30 Days" },
            { key: "thisMonth", label: "This Month" }
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => applyQuickFilter(f.key)}
              style={{ padding: "6px 12px", borderRadius: "6px", background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontWeight: "600", fontSize: "12px", border: "1px solid var(--border)", cursor: "pointer" }}
            >
              {f.label}
            </button>
          ))}
          <div style={{ marginLeft: "auto", fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
            {fromDateStr} → {toDateStr}
          </div>
        </div>

        {/* Export Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleExportCSV}
            disabled={previewData.length === 0 || loading}
            style={{ padding: "10px 20px", borderRadius: "8px", background: "var(--bg-tertiary)", color: "var(--text-primary)", fontWeight: "700", fontSize: "13px", border: "1px solid var(--border)", cursor: previewData.length === 0 ? "not-allowed" : "pointer", opacity: previewData.length === 0 ? 0.5 : 1 }}
          >
            📄 Download CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={previewData.length === 0 || loading}
            style={{ padding: "10px 20px", borderRadius: "8px", background: "var(--accent)", color: "#000", fontWeight: "800", fontSize: "13px", border: "none", cursor: previewData.length === 0 ? "not-allowed" : "pointer", opacity: previewData.length === 0 ? 0.5 : 1 }}
          >
            📑 Download PDF
          </button>
        </div>
      </div>

      {/* Preview Table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Preview ({previewData.length} records)</div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading...</div>
        ) : previewData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
            <div style={{ color: "white", fontSize: "14px", fontWeight: "600" }}>No data available for the selected date range.</div>
            <div style={{ color: "white", fontSize: "12px", marginTop: "6px" }}>Try adjusting your From/To dates or filters.</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {headers.map(h => (
                  <th key={h.key} style={{ textAlign: "left", padding: "10px 12px", color: "var(--accent)", fontWeight: "700", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border)" }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.slice(0, 20).map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  {headers.map(h => (
                    <td key={h.key} style={{ padding: "10px 12px", color: "var(--text-primary)" }}>
                      {row[h.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {previewData.length > 20 && (
          <div style={{ textAlign: "center", padding: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
            Showing 20 of {previewData.length} records. Export to see all.
          </div>
        )}
      </div>
    </div>
  )
}
