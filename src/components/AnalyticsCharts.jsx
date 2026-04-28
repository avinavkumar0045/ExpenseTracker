import { useMemo } from "react"
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"

const COLORS = ["#C8F65A", "#60A5FA", "#A78BFA", "#52E89A", "#FBBF24", "#FF5555", "#F472B6", "#22D3EE"]

const darkTooltipStyle = {
  backgroundColor: "#1A1A1A",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "8px",
  color: "#FFFFFF",
  fontSize: "12px"
}

export function CategoryPieChart({ expenses }) {
  const data = useMemo(() => {
    const totals = {}
    expenses.forEach(e => {
      const cat = e.category || "uncategorized"
      totals[cat] = (totals[cat] || 0) + parseFloat(e.amount || 0)
    })
    return Object.entries(totals)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  if (data.length === 0) {
    return <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "13px" }}>No expense data</div>
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={darkTooltipStyle} formatter={value => `Rs.${value.toFixed(2)}`} />
          <Legend wrapperStyle={{ fontSize: "11px", color: "var(--text-secondary)" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MonthlyBarChart({ transactions }) {
  const data = useMemo(() => {
    const monthTotals = {}
    const now = new Date()

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleString("en-IN", { month: "short" })
      monthTotals[key] = 0
    }

    transactions.forEach(t => {
      if (t.direction === "DEBIT") {
        const d = new Date(t.created_at)
        const monthKey = d.toLocaleString("en-IN", { month: "short" })
        if (monthTotals.hasOwnProperty(monthKey)) {
          monthTotals[monthKey] += parseFloat(t.amount || 0)
        }
      }
    })

    return Object.entries(monthTotals).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
  }, [transactions])

  if (data.every(d => d.value === 0)) {
    return <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "13px" }}>No monthly data</div>
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} />
          <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickFormatter={v => `Rs.${v}`} />
          <Tooltip contentStyle={darkTooltipStyle} formatter={value => `Rs.${value.toFixed(2)}`} />
          <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GroupSpendingChart({ groupSummary }) {
  const data = useMemo(() => {
    return groupSummary.map(g => ({
      name: g.groupName.length > 12 ? g.groupName.slice(0, 12) + "..." : g.groupName,
      value: Math.round(g.amount * 100) / 100
    }))
  }, [groupSummary])

  if (data.length === 0) {
    return <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "13px" }}>No group spending data</div>
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickFormatter={v => `Rs.${v}`} />
          <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} width={80} />
          <Tooltip contentStyle={darkTooltipStyle} formatter={value => `Rs.${value.toFixed(2)}`} />
          <Bar dataKey="value" fill="var(--blue)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
