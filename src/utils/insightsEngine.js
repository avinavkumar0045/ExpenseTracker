/**
 * AI-Based Insights Engine
 * All computations are client-side using existing transaction/expense data
 * No external APIs needed
 */

/**
 * Analyze spending trends month-over-month
 * @param {Array} transactions - Array of transaction objects with amount, direction, created_at
 */
export function analyzeSpendingTrends(transactions) {
  if (!transactions || transactions.length === 0) {
    return { trend: 0, message: 'No transaction data available', direction: 'neutral' }
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

  const currentMonthTotal = transactions
    .filter(t => {
      const d = new Date(t.created_at)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.direction === 'DEBIT'
    })
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)

  const prevMonthTotal = transactions
    .filter(t => {
      const d = new Date(t.created_at)
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear && t.direction === 'DEBIT'
    })
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)

  if (prevMonthTotal === 0) {
    return { trend: 0, message: 'Starting your tracking journey', direction: 'neutral' }
  }

  const percentChange = ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100
  const absChange = Math.abs(percentChange).toFixed(0)

  let message, direction
  if (percentChange > 5) {
    message = `Your spending is up ${absChange}% from last month`
    direction = 'up'
  } else if (percentChange < -5) {
    message = `Your spending is down ${absChange}% from last month`
    direction = 'down'
  } else {
    message = 'Your spending is stable compared to last month'
    direction = 'neutral'
  }

  return { trend: percentChange, message, direction, currentMonthTotal, prevMonthTotal }
}

/**
 * Compare categories and find top spending category
 * @param {Array} expenses - Array of expense objects with category and amount
 */
export function compareCategories(expenses) {
  if (!expenses || expenses.length === 0) {
    return { breakdown: [], topCategory: null, message: 'No expense data available' }
  }

  const categoryTotals = {}
  const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)

  expenses.forEach(e => {
    const cat = e.category || 'uncategorized'
    categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(e.amount || 0)
  })

  const breakdown = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.amount - a.amount)

  const topCategory = breakdown[0]

  return {
    breakdown,
    topCategory,
    message: topCategory
      ? `${topCategory.category} is your biggest expense at ${topCategory.percentage}% of total`
      : 'No category data available'
  }
}

/**
 * Generate suggestions based on spending patterns and budgets
 * @param {Array} transactions
 * @param {Array} expenses
 * @param {Array} budgets
 */
export function generateSuggestions(transactions, expenses, budgets) {
  const suggestions = []

  if (!transactions || transactions.length === 0) {
    return [{ type: 'info', message: 'Start adding expenses to get personalized insights' }]
  }

  // 1. Budget exceeded suggestions
  if (budgets && budgets.length > 0 && expenses) {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    budgets.forEach(budget => {
      if (budget.month === currentMonth && budget.year === currentYear) {
        const spent = expenses
          .filter(e => {
            const d = new Date(e.expense_date || e.created_at)
            return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear &&
              (!budget.category || e.category === budget.category)
          })
          .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)

        if (spent > parseFloat(budget.amount)) {
          suggestions.push({
            type: 'warning',
            message: `You exceeded your ${budget.category || 'overall'} budget by Rs.${(spent - budget.amount).toFixed(2)}. Consider setting a stricter limit.`
          })
        } else if (spent > parseFloat(budget.amount) * 0.8) {
          suggestions.push({
            type: 'alert',
            message: `You've used ${((spent / budget.amount) * 100).toFixed(0)}% of your ${budget.category || 'overall'} budget.`
          })
        }
      }
    })
  }

  // 2. Category spike detection
  const categoryTrends = analyzeCategoryTrends(expenses)
  categoryTrends.forEach(t => {
    if (t.changePercent > 50) {
      suggestions.push({
        type: 'trend',
        message: `Your ${t.category} spending increased ${t.changePercent.toFixed(0)}% this month. Review your ${t.category} expenses.`
      })
    }
  })

  // 3. Spending frequency insight
  const dailyAvg = calculateDailyAverage(transactions)
  if (dailyAvg > 500) {
    suggestions.push({
      type: 'tip',
      message: `Your daily spending average is Rs.${dailyAvg.toFixed(0)}. Try to reduce discretionary expenses.`
    })
  }

  // 4. Savings opportunity
  const { currentMonthTotal, prevMonthTotal } = analyzeSpendingTrends(transactions)
  if (currentMonthTotal > prevMonthTotal * 1.3) {
    suggestions.push({
      type: 'savings',
      message: `You could save Rs.${((currentMonthTotal - prevMonthTotal) * 0.3).toFixed(0)} next month by maintaining last month's spending level.`
    })
  }

  if (suggestions.length === 0) {
    suggestions.push({ type: 'success', message: 'Great job! Your spending is well within your budgets.' })
  }

  return suggestions
}

/**
 * Analyze category trends month-over-month
 */
function analyzeCategoryTrends(expenses) {
  if (!expenses || expenses.length === 0) return []

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

  const currentTotals = {}
  const prevTotals = {}

  expenses.forEach(e => {
    const d = new Date(e.expense_date || e.created_at)
    const cat = e.category || 'uncategorized'
    const amount = parseFloat(e.amount || 0)

    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      currentTotals[cat] = (currentTotals[cat] || 0) + amount
    }
    if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
      prevTotals[cat] = (prevTotals[cat] || 0) + amount
    }
  })

  return Object.entries(currentTotals).map(([category, currentAmount]) => {
    const prevAmount = prevTotals[category] || 0
    const changePercent = prevAmount > 0 ? ((currentAmount - prevAmount) / prevAmount) * 100 : 0
    return { category, currentAmount, prevAmount, changePercent }
  }).filter(t => t.changePercent > 20)
}

/**
 * Calculate daily average spending
 */
function calculateDailyAverage(transactions) {
  const debits = transactions.filter(t => t.direction === 'DEBIT')
  if (debits.length === 0) return 0

  const total = debits.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
  const dates = [...new Set(debits.map(t => new Date(t.created_at).toDateString()))]
  const days = Math.max(dates.length, 1)

  return total / days
}

/**
 * Group-wise spending summary
 * @param {Array} expenses
 * @param {Array} groups
 */
export function getGroupSpendingSummary(expenses, groups) {
  if (!expenses || !groups) return []

  const groupMap = {}
  groups.forEach(g => { groupMap[g.group_id] = g.group_name })

  const summary = {}
  expenses.forEach(e => {
    if (e.group_id) {
      const gid = e.group_id
      summary[gid] = (summary[gid] || 0) + parseFloat(e.amount || 0)
    }
  })

  return Object.entries(summary)
    .map(([groupId, amount]) => ({
      groupId: parseInt(groupId),
      groupName: groupMap[groupId] || 'Unknown Group',
      amount
    }))
    .sort((a, b) => b.amount - a.amount)
}
