import { useMemo } from "react"
import { analyzeSpendingTrends, compareCategories, generateSuggestions, getGroupSpendingSummary } from "../utils/insightsEngine"

export default function InsightsPanel({ transactions, expenses, budgets, groups }) {
  const trends = useMemo(() => analyzeSpendingTrends(transactions), [transactions])
  const categoryData = useMemo(() => compareCategories(expenses), [expenses])
  const suggestions = useMemo(() => generateSuggestions(transactions, expenses, budgets), [transactions, expenses, budgets])
  const groupSummary = useMemo(() => getGroupSpendingSummary(expenses, groups), [expenses, groups])

  const trendColor = trends.direction === "up" ? "var(--red)" : trends.direction === "down" ? "var(--green)" : "var(--text-muted)"
  const trendIcon = trends.direction === "up" ? "↑" : trends.direction === "down" ? "↓" : "→"

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "24px" }}>
      {/* Spending Trend Card */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>Spending Trend</div>
        <div style={{ fontSize: "28px", fontWeight: "800", color: trendColor, marginBottom: "6px" }}>
          {trendIcon} {Math.abs(trends.trend || 0).toFixed(0)}%
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{trends.message}</div>
        <div style={{ marginTop: "12px", display: "flex", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>This Month</div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>Rs.{(trends.currentMonthTotal || 0).toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Last Month</div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>Rs.{(trends.prevMonthTotal || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Top Category Card */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>Top Category</div>
        {categoryData.topCategory ? (
          <>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--accent)", textTransform: "capitalize", marginBottom: "6px" }}>
              {categoryData.topCategory.category}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "12px" }}>
              {categoryData.message}
            </div>
            <div style={{ width: "100%", height: "6px", background: "var(--bg-secondary)", borderRadius: "100px", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(categoryData.topCategory.percentage, 100)}%`, height: "100%", background: "var(--accent)", borderRadius: "100px" }} />
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px", textAlign: "right" }}>
              Rs.{categoryData.topCategory.amount.toFixed(2)}
            </div>
          </>
        ) : (
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{categoryData.message}</div>
        )}
      </div>

      {/* Suggestions Card */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>AI Suggestions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {suggestions.slice(0, 3).map((s, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{
                width: "22px", height: "22px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", flexShrink: 0,
                background: s.type === 'warning' ? 'var(--red-dim)' : s.type === 'alert' ? 'var(--amber-dim)' : s.type === 'success' ? 'var(--green-dim)' : 'var(--blue-dim)',
                color: s.type === 'warning' ? 'var(--red)' : s.type === 'alert' ? 'var(--amber)' : s.type === 'success' ? 'var(--green)' : 'var(--blue)'
              }}>
                {s.type === 'warning' ? '!' : s.type === 'alert' ? '⚠' : s.type === 'success' ? '✓' : '💡'}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{s.message}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Group Spending Card */}
      {groupSummary.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>Group Spending</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {groupSummary.slice(0, 4).map((g, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: ["var(--accent)", "var(--blue)", "var(--purple)", "var(--green)"][i % 4] }} />
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{g.groupName}</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>Rs.{g.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
