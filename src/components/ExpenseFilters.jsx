import { useState } from "react"
import { getDateRangePreset, formatInputDate } from "../utils/dateFilters"

export default function ExpenseFilters({ onFilterChange, categories, groups }) {
  const [filters, setFilters] = useState({
    datePreset: "this_month",
    startDate: "",
    endDate: "",
    category: "",
    groupId: "",
    search: "",
    minAmount: "",
    maxAmount: "",
    sortBy: "date_desc"
  })

  const handleChange = (field, value) => {
    const updated = { ...filters, [field]: value }

    if (field === "datePreset" && value !== "custom") {
      const range = getDateRangePreset(value)
      updated.startDate = formatInputDate(range.start)
      updated.endDate = formatInputDate(range.end)
    }

    setFilters(updated)
    onFilterChange(updated)
  }

  const clearFilters = () => {
    const reset = {
      datePreset: "this_month",
      startDate: "",
      endDate: "",
      category: "",
      groupId: "",
      search: "",
      minAmount: "",
      maxAmount: "",
      sortBy: "date_desc"
    }
    const range = getDateRangePreset("this_month")
    reset.startDate = formatInputDate(range.start)
    reset.endDate = formatInputDate(range.end)
    setFilters(reset)
    onFilterChange(reset)
  }

  const datePresets = [
    { value: "today", label: "Today" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "last_7_days", label: "Last 7 Days" },
    { value: "last_30_days", label: "Last 30 Days" },
    { value: "custom", label: "Custom" }
  ]

  const sortOptions = [
    { value: "date_desc", label: "Newest First" },
    { value: "date_asc", label: "Oldest First" },
    { value: "amount_desc", label: "Highest Amount" },
    { value: "amount_asc", label: "Lowest Amount" }
  ]

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px", marginBottom: "24px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "end" }}>
        {/* Search */}
        <div style={{ flex: "1 1 200px", minWidth: "180px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={e => handleChange("search", e.target.value)}
            placeholder="Search expenses..."
            style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "9px 12px", fontSize: "13px" }}
          />
        </div>

        {/* Date Preset */}
        <div style={{ flex: "0 0 150px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Period</label>
          <select
            value={filters.datePreset}
            onChange={e => handleChange("datePreset", e.target.value)}
            style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "9px 12px", fontSize: "13px" }}
          >
            {datePresets.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        {/* Custom Date Range */}
        {filters.datePreset === "custom" && (
          <>
            <div style={{ flex: "0 0 140px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>From</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={e => handleChange("startDate", e.target.value)}
                style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "9px 12px", fontSize: "13px" }}
              />
            </div>
            <div style={{ flex: "0 0 140px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>To</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => handleChange("endDate", e.target.value)}
                style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "9px 12px", fontSize: "13px" }}
              />
            </div>
          </>
        )}

        {/* Category */}
        <div style={{ flex: "0 0 140px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Category</label>
          <select
            value={filters.category}
            onChange={e => handleChange("category", e.target.value)}
            style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "9px 12px", fontSize: "13px" }}
          >
            <option value="">All</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Group */}
        {groups && groups.length > 0 && (
          <div style={{ flex: "0 0 160px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Group</label>
            <select
              value={filters.groupId}
              onChange={e => handleChange("groupId", e.target.value)}
              style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "9px 12px", fontSize: "13px" }}
            >
              <option value="">All</option>
              {groups.map(g => <option key={g.group_id} value={g.group_id}>{g.group_name}</option>)}
            </select>
          </div>
        )}

        {/* Amount Range */}
        <div style={{ flex: "0 0 100px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Min Rs.</label>
          <input
            type="number"
            min="0"
            value={filters.minAmount}
            onChange={e => handleChange("minAmount", e.target.value)}
            placeholder="0"
            style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "9px 12px", fontSize: "13px" }}
          />
        </div>
        <div style={{ flex: "0 0 100px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Max Rs.</label>
          <input
            type="number"
            min="0"
            value={filters.maxAmount}
            onChange={e => handleChange("maxAmount", e.target.value)}
            placeholder="∞"
            style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "9px 12px", fontSize: "13px" }}
          />
        </div>

        {/* Sort */}
        <div style={{ flex: "0 0 150px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Sort By</label>
          <select
            value={filters.sortBy}
            onChange={e => handleChange("sortBy", e.target.value)}
            style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", padding: "9px 12px", fontSize: "13px" }}
          >
            {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Clear */}
        <div style={{ flex: "0 0 auto" }}>
          <button
            onClick={clearFilters}
            style={{ padding: "9px 16px", borderRadius: "8px", background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontWeight: "600", fontSize: "12px", border: "1px solid var(--border)", cursor: "pointer" }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
