import { supabase } from '../supabase/client'

/**
 * Calculate net balance for each member in a group
 * Net = (what they paid) - (what they owe)
 * Positive = they are owed money (creditor)
 * Negative = they owe money (debtor)
 */
export function calculateNetBalances(members, expenseSplits, settlements = []) {
  const balances = {}

  // Initialize all members with 0
  members.forEach(m => {
    balances[m.user_id] = {
      user_id: m.user_id,
      name: m.name,
      email: m.email,
      paid: 0,
      owed: 0,
      net: 0
    }
  })

  // Calculate what each person paid and what they owe from expense splits
  expenseSplits.forEach(split => {
    if (balances[split.user_id]) {
      balances[split.user_id].owed += parseFloat(split.share_amount || 0)
    }
  })

  // Calculate what each person paid (from expenses table data)
  // Note: this should be passed in as a separate parameter or computed differently
  // For now, we handle it via the expenses parameter in getWhoOwesWhom

  // Apply settlements: payer paid money (increases their contribution),
  // payee received money (decreases their contribution)
  settlements.forEach(s => {
    if (s.status === 'settled') {
      if (balances[s.payer_id]) {
        balances[s.payer_id].paid += parseFloat(s.amount || 0)
      }
      if (balances[s.payee_id]) {
        balances[s.payee_id].paid -= parseFloat(s.amount || 0)
      }
    }
  })

  // Calculate net
  Object.values(balances).forEach(b => {
    b.net = b.paid - b.owed
  })

  return balances
}

/**
 * Simplify debts using greedy algorithm
 * Minimizes the number of transactions needed to settle all debts
 *
 * @param {Object} balances - Output from calculateNetBalances
 * @returns {Array} Simplified transactions {from, to, amount}
 */
export function simplifyDebts(balances) {
  const debtors = []
  const creditors = []

  Object.values(balances).forEach(b => {
    if (b.net < -0.01) {
      debtors.push({ ...b, amount: Math.abs(b.net) })
    } else if (b.net > 0.01) {
      creditors.push({ ...b, amount: b.net })
    }
  })

  // Sort by amount descending
  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)

  const transactions = []

  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]

    const settleAmount = Math.min(debtor.amount, creditor.amount)

    if (settleAmount > 0.01) {
      transactions.push({
        from: debtor,
        to: creditor,
        amount: parseFloat(settleAmount.toFixed(2))
      })
    }

    debtor.amount -= settleAmount
    creditor.amount -= settleAmount

    if (debtor.amount < 0.01) i++
    if (creditor.amount < 0.01) j++
  }

  return transactions
}

/**
 * Fetch all data needed and compute who owes whom for a group
 * @param {string} groupId
 * @param {Array} expenses - Group expenses with paid_by info
 * @param {Array} members - Group members
 * @param {Array} expenseSplits - All expense splits for group
 * @param {Array} settlements - Existing settlements
 */
export async function getWhoOwesWhom(groupId, expenses, members, expenseSplits, settlements = []) {
  // First, calculate what each person paid
  const paidMap = {}
  members.forEach(m => { paidMap[m.user_id] = 0 })
  expenses.forEach(e => {
    if (paidMap[e.paid_by] !== undefined) {
      paidMap[e.paid_by] += parseFloat(e.amount || 0)
    }
  })

  // Calculate base balances from splits
  const balances = {}
  members.forEach(m => {
    balances[m.user_id] = {
      user_id: m.user_id,
      name: m.name,
      paid: paidMap[m.user_id] || 0,
      owed: 0,
      net: 0
    }
  })

  // Group splits by expense so we can detect expenses without splits
  const splitsByExpense = {}
  expenseSplits.forEach(split => {
    if (!splitsByExpense[split.expense_id]) splitsByExpense[split.expense_id] = []
    splitsByExpense[split.expense_id].push(split)
  })

  // Process each expense: use existing splits or default to equal split
  expenses.forEach(expense => {
    const splitsForExpense = splitsByExpense[expense.expense_id] || []
    if (splitsForExpense.length > 0) {
      splitsForExpense.forEach(split => {
        if (balances[split.user_id]) {
          balances[split.user_id].owed += parseFloat(split.share_amount || 0)
        }
      })
    } else {
      // Old expenses without splits: assume equal split among current members
      const memberCount = members.length
      if (memberCount > 0) {
        const share = parseFloat(expense.amount || 0) / memberCount
        members.forEach(m => {
          if (balances[m.user_id]) {
            balances[m.user_id].owed += parseFloat(share.toFixed(2))
          }
        })
      }
    }
  })

  // Apply settlements: payer paid money (increases their contribution),
  // payee received money (decreases their contribution)
  settlements.forEach(s => {
    if (s.status === 'settled') {
      if (balances[s.payer_id]) {
        balances[s.payer_id].paid += parseFloat(s.amount || 0)
      }
      if (balances[s.payee_id]) {
        balances[s.payee_id].paid -= parseFloat(s.amount || 0)
      }
    }
  })

  // Calculate net
  Object.values(balances).forEach(b => {
    b.net = b.paid - b.owed
  })

  const simplified = simplifyDebts(balances)

  return {
    balances,
    simplified,
    totalUnsettled: simplified.reduce((sum, t) => sum + t.amount, 0)
  }
}

/**
 * Get raw pairwise debts (non-simplified)
 * Shows exact expense-by-expense who owes whom
 */
export function getRawDebts(expenses, expenseSplits, members) {
  const memberMap = {}
  members.forEach(m => { memberMap[m.user_id] = m })

  const debts = []

  expenses.forEach(expense => {
    const splitsForExpense = expenseSplits.filter(s => s.expense_id === expense.expense_id)
    const paidBy = memberMap[expense.paid_by]

    if (splitsForExpense.length > 0) {
      // Use existing splits
      splitsForExpense.forEach(split => {
        if (split.user_id !== expense.paid_by && split.payment_status !== 'paid') {
          debts.push({
            expense_id: expense.expense_id,
            item_name: expense.item_name,
            amount: parseFloat(split.share_amount || 0),
            owedBy: memberMap[split.user_id],
            owedTo: paidBy,
            expense_date: expense.expense_date,
            category: expense.category
          })
        }
      })
    } else if (paidBy && members.length > 0) {
      // Old expenses without splits: assume equal split among current members
      const share = parseFloat(expense.amount || 0) / members.length
      members.forEach(m => {
        if (m.user_id !== expense.paid_by) {
          debts.push({
            expense_id: expense.expense_id,
            item_name: expense.item_name,
            amount: parseFloat(share.toFixed(2)),
            owedBy: memberMap[m.user_id],
            owedTo: paidBy,
            expense_date: expense.expense_date,
            category: expense.category
          })
        }
      })
    }
  })

  return debts
}
