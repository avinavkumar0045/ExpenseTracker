import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { auth, supabase } from "../supabase/client"
import { getWhoOwesWhom, getRawDebts } from "../utils/debtSimplifier"
import TransactionPasswordModal from "../components/TransactionPasswordModal"

/**
 * Compute bilateral balances between current user and every other member.
 * Positive amount = other member owes current user.
 * Negative amount = current user owes other member.
 */
function computeBilateralDebts(expenses, expenseSplits, members, settlements, currentUserId) {
  const memberMap = {}
  members.forEach(m => { memberMap[m.user_id] = m })

  const bilateral = {}
  members.forEach(m => {
    if (m.user_id !== currentUserId) {
      bilateral[m.user_id] = { user_id: m.user_id, name: m.name, amount: 0 }
    }
  })

  const splitsByExpense = {}
  expenseSplits.forEach(split => {
    if (!splitsByExpense[split.expense_id]) splitsByExpense[split.expense_id] = []
    splitsByExpense[split.expense_id].push(split)
  })

  expenses.forEach(expense => {
    const paidBy = expense.paid_by
    const splitsForExpense = splitsByExpense[expense.expense_id] || []

    if (splitsForExpense.length === 0) {
      const share = parseFloat(expense.amount || 0) / members.length
      members.forEach(m => {
        if (m.user_id === paidBy) return
        if (paidBy === currentUserId && bilateral[m.user_id]) {
          bilateral[m.user_id].amount += share
        } else if (m.user_id === currentUserId && bilateral[paidBy]) {
          bilateral[paidBy].amount -= share
        }
      })
    } else {
      splitsForExpense.forEach(split => {
        if (split.user_id === paidBy || split.payment_status === 'paid') return
        const amt = parseFloat(split.share_amount || 0)
        if (paidBy === currentUserId && bilateral[split.user_id]) {
          bilateral[split.user_id].amount += amt
        } else if (split.user_id === currentUserId && bilateral[paidBy]) {
          bilateral[paidBy].amount -= amt
        }
      })
    }
  })

  settlements.forEach(s => {
    if (s.status !== 'settled') return
    const amt = parseFloat(s.amount || 0)
    if (s.payer_id === currentUserId && bilateral[s.payee_id]) {
      bilateral[s.payee_id].amount += amt
    } else if (s.payee_id === currentUserId && bilateral[s.payer_id]) {
      bilateral[s.payer_id].amount -= amt
    }
  })

  return Object.values(bilateral)
    .filter(b => Math.abs(b.amount) > 0.01)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
}

export default function Settlements() {
  const { id } = useParams()
  const user = auth.getUser()

  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [expenseSplits, setExpenseSplits] = useState([])
  const [settlements, setSettlements] = useState([])
  const [simplifiedDebts, setSimplifiedDebts] = useState([])
  const [rawDebts, setRawDebts] = useState([])
  const [bilateralDebts, setBilateralDebts] = useState([])
  const [balances, setBalances] = useState({})
  const [viewMode, setViewMode] = useState("balances")
  const [loading, setLoading] = useState(true)
  const [settlingWith, setSettlingWith] = useState(null)
  const [settleAmount, setSettleAmount] = useState("")
  const [showAmountModal, setShowAmountModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchAllData()
  }, [id])

  async function fetchAllData() {
    setLoading(true)
    const [gRes, mRes, eRes, sRes] = await Promise.all([
      supabase.from("groups").select("*").eq("group_id", id).single(),
      supabase.from("group_members").select("users(*)").eq("group_id", id),
      supabase.from("expenses").select("*").eq("group_id", id).order("expense_date", { ascending: false }),
      supabase.from("settlements").select("*").eq("group_id", id)
    ])

    const fetchedMembers = (mRes.data || []).map(d => d.users).filter(Boolean)
    const fetchedExpenses = eRes.data || []
    const fetchedSettlements = sRes.data || []

    // Fetch all expense splits for these expenses
    const expenseIds = fetchedExpenses.map(e => e.expense_id)
    let fetchedSplits = []
    if (expenseIds.length > 0) {
      const { data: splitsData } = await supabase.from("expense_splits").select("*").in("expense_id", expenseIds)
      fetchedSplits = splitsData || []
    }

    setGroup(gRes.data)
    setMembers(fetchedMembers)
    setExpenses(fetchedExpenses)
    setExpenseSplits(fetchedSplits)
    setSettlements(fetchedSettlements)

    // Compute debts
    const result = await getWhoOwesWhom(id, fetchedExpenses, fetchedMembers, fetchedSplits, fetchedSettlements)
    setSimplifiedDebts(result.simplified)
    setBalances(result.balances)
    setRawDebts(getRawDebts(fetchedExpenses, fetchedSplits, fetchedMembers))
    setBilateralDebts(computeBilateralDebts(fetchedExpenses, fetchedSplits, fetchedMembers, fetchedSettlements, user.user_id))

    setLoading(false)
  }

  const handleSettleUp = (debt) => {
    setSettlingWith(debt)
    setSettleAmount(debt.amount.toFixed(2))
    setShowAmountModal(true)
  }

  const confirmAmount = () => {
    const amt = parseFloat(settleAmount)
    if (!amt || amt <= 0) {
      setSuccess("Amount must be greater than 0")
      setTimeout(() => setSuccess(""), 2000)
      return
    }
    if (amt > settlingWith.amount) {
      setSuccess(`Cannot settle more than Rs.${settlingWith.amount.toFixed(2)}`)
      setTimeout(() => setSuccess(""), 2000)
      return
    }
    setShowAmountModal(false)
    setShowPasswordModal(true)
  }

  const handleRemind = async (debt) => {
    try {
      await supabase.from("notifications").insert([{
        user_id: debt.from.user_id,
        message: `${debt.to.name} reminded you to settle Rs.${debt.amount.toFixed(2)} in ${group?.group_name || 'the group'}`,
        notification_type: "GROUP",
        related_group_id: id,
        is_read: false
      }])
      setSuccess(`Reminder sent to ${debt.from.name}`)
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setSuccess("Failed to send reminder")
    }
  }

  const processSettlement = async (transactionPassword) => {
    if (!settlingWith) return

    const isValid = await auth.verifyTransactionPassword(user.user_id, transactionPassword)
    if (!isValid) {
      throw new Error("Invalid transaction password")
    }

    const amount = parseFloat(settleAmount)
    if (!amount || amount <= 0) throw new Error("Invalid settlement amount")

    // Check payer balance
    const { data: payerWallet } = await supabase.from("personal_wallet").select("balance").eq("user_id", settlingWith.from.user_id).single()
    if (!payerWallet || parseFloat(payerWallet.balance) < amount) {
      throw new Error("Insufficient balance to settle")
    }

    // 1. Insert settlement record
    await supabase.from("settlements").insert([{
      payer_id: settlingWith.from.user_id,
      payee_id: settlingWith.to.user_id,
      group_id: id,
      amount: amount,
      status: "settled",
      settled_at: new Date().toISOString()
    }])

    // 2. Update payer wallet (debit)
    await supabase.from("personal_wallet").update({
      balance: parseFloat(payerWallet.balance) - amount
    }).eq("user_id", settlingWith.from.user_id)

    // 3. Update payee wallet (credit)
    const { data: payeeWallet } = await supabase.from("personal_wallet").select("balance").eq("user_id", settlingWith.to.user_id).single()
    await supabase.from("personal_wallet").update({
      balance: (parseFloat(payeeWallet?.balance) || 0) + amount
    }).eq("user_id", settlingWith.to.user_id)

    // 4. Record transactions for both
    await supabase.from("transactions").insert([
      {
        user_id: settlingWith.from.user_id,
        group_id: id,
        transaction_type: "EXPENSE",
        amount: amount,
        direction: "DEBIT",
        item_name: `Settlement to ${settlingWith.to.name}`,
        category: "settlement"
      },
      {
        user_id: settlingWith.to.user_id,
        group_id: id,
        transaction_type: "CONTRIBUTION",
        amount: amount,
        direction: "CREDIT",
        item_name: `Settlement from ${settlingWith.from.name}`,
        category: "settlement"
      }
    ])

    // 5. Send notifications to both parties
    await supabase.from("notifications").insert([
      {
        user_id: settlingWith.to.user_id,
        message: `${settlingWith.from.name} settled Rs.${amount.toFixed(2)} with you in ${group?.group_name}`,
        notification_type: "GROUP",
        related_group_id: id,
        is_read: false
      },
      {
        user_id: settlingWith.from.user_id,
        message: `You settled Rs.${amount.toFixed(2)} with ${settlingWith.to.name} in ${group?.group_name}`,
        notification_type: "GROUP",
        related_group_id: id,
        is_read: false
      }
    ])

    setSuccess(`Settlement of Rs.${amount.toFixed(2)} completed!`)
    setSettlingWith(null)
    setShowPasswordModal(false)
    fetchAllData()
  }

  if (loading) return <div style={{ padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>Loading settlements...</div>
  if (!group) return <div style={{ padding: "40px", color: "var(--red)", fontSize: "14px" }}>Group not found.</div>

  const totalUnsettled = simplifiedDebts.reduce((sum, d) => sum + d.amount, 0)

  return (
    <div style={{ maxWidth: "1000px" }}>
      <div style={{ marginBottom: "28px" }}>
        <Link to={`/group/${id}`} style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: "600" }}>← Back to Group</Link>
        <h1 style={{ fontSize: "30px", fontWeight: "800", letterSpacing: "-0.03em", marginTop: "10px" }}>{group.group_name} — Settlements</h1>
        {totalUnsettled > 0 && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "10px", padding: "6px 14px", borderRadius: "100px", background: "var(--red-dim)", border: "1px solid rgba(255,85,85,0.2)" }}>
            <span style={{ fontSize: "12px", color: "var(--red)", fontWeight: "700" }}>
              Total Unsettled: Rs.{totalUnsettled.toFixed(2)}
            </span>
          </div>
        )}
        {totalUnsettled === 0 && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "10px", padding: "6px 14px", borderRadius: "100px", background: "var(--green-dim)", border: "1px solid rgba(82,232,154,0.2)" }}>
            <span style={{ fontSize: "12px", color: "var(--green)", fontWeight: "700" }}>All settled up!</span>
          </div>
        )}
      </div>

      {success && (
        <div style={{ background: "var(--green-dim)", border: "1px solid rgba(82,232,154,0.2)", borderRadius: "10px", padding: "12px 16px", color: "var(--green)", fontSize: "13px", marginBottom: "20px" }}>
          ✓ {success}
        </div>
      )}

      {/* Balance Summary */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", marginBottom: "24px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "16px" }}>Member Balances</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          {Object.values(balances).map(b => {
            const isPositive = b.net > 0.01
            const isNegative = b.net < -0.01
            return (
              <div key={b.user_id} style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", color: "#000", fontSize: "12px" }}>{b.name?.[0]?.toUpperCase()}</div>
                  <div style={{ fontWeight: "600", fontSize: "13px" }}>{b.name}</div>
                </div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: isPositive ? "var(--green)" : isNegative ? "var(--red)" : "var(--text-muted)" }}>
                  {isPositive ? "+" : isNegative ? "" : ""}Rs.{Math.abs(b.net).toFixed(2)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  {isPositive ? "is owed" : isNegative ? "owes" : "settled"}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* View Toggle */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {[
          { key: "balances", label: "Balances" },
          { key: "simplified", label: "Simplified" },
          { key: "detailed", label: "Detailed" }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: `1px solid ${viewMode === tab.key ? "var(--accent)" : "var(--border)"}`,
              background: viewMode === tab.key ? "var(--accent-dim)" : "var(--bg-tertiary)",
              color: viewMode === tab.key ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: viewMode === tab.key ? "700" : "500",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Balances View — per-person bilateral balances like Splitkro */}
      {viewMode === "balances" && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "16px" }}>
            Your Balances
          </div>
          {bilateralDebts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>✅</div>
              <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>You are all settled up with everyone!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {bilateralDebts.map((debt) => {
                const isOwedToMe = debt.amount > 0
                const displayAmount = Math.abs(debt.amount)
                const debtObj = {
                  from: isOwedToMe ? debt : { user_id: user.user_id, name: user.name },
                  to: isOwedToMe ? { user_id: user.user_id, name: user.name } : debt,
                  amount: displayAmount
                }
                return (
                  <div key={debt.user_id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px", borderRadius: "14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: isOwedToMe ? "var(--green-dim)" : "var(--red-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", color: isOwedToMe ? "var(--green)" : "var(--red)", fontSize: "14px", flexShrink: 0 }}>
                      {debt.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "700", fontSize: "15px" }}>{debt.name}</div>
                      <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "3px" }}>
                        {isOwedToMe ? (
                          <span>owes you <span style={{ color: "var(--green)", fontWeight: "700" }}>Rs.{displayAmount.toFixed(2)}</span></span>
                        ) : (
                          <span>you owe <span style={{ color: "var(--red)", fontWeight: "700" }}>Rs.{displayAmount.toFixed(2)}</span></span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      {isOwedToMe ? (
                        <button
                          onClick={() => handleRemind(debtObj)}
                          style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--blue-dim)", color: "var(--blue)", fontWeight: "800", fontSize: "12px", border: "1px solid var(--blue)", cursor: "pointer" }}
                        >
                          Remind
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSettleUp(debtObj)}
                          style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--accent)", color: "#000", fontWeight: "800", fontSize: "12px", border: "none", cursor: "pointer" }}
                        >
                          Settle Up
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Simplified View */}
      {viewMode === "simplified" && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "16px" }}>
            Simplified Debts (Minimized Transactions)
          </div>
          {simplifiedDebts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>✅</div>
              <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>All debts are settled!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {simplifiedDebts.map((debt, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", borderRadius: "12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--red-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>↗</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>
                      <span style={{ color: "var(--red)" }}>{debt.from.name}</span>
                      <span style={{ color: "var(--text-secondary)", margin: "0 6px" }}>pays</span>
                      <span style={{ color: "var(--green)" }}>{debt.to.name}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Optimized settlement</div>
                  </div>
                  <div style={{ fontWeight: "800", fontSize: "16px", color: "var(--accent)", whiteSpace: "nowrap" }}>Rs.{debt.amount.toFixed(2)}</div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    {debt.from.user_id === user.user_id ? (
                      <button
                        onClick={() => handleSettleUp(debt)}
                        style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--accent)", color: "#000", fontWeight: "800", fontSize: "12px", border: "none", cursor: "pointer" }}
                      >
                        Settle Up
                      </button>
                    ) : debt.to.user_id === user.user_id ? (
                      <button
                        onClick={() => handleRemind(debt)}
                        style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--blue-dim)", color: "var(--blue)", fontWeight: "800", fontSize: "12px", border: "1px solid var(--blue)", cursor: "pointer" }}
                      >
                        Remind
                      </button>
                    ) : (
                      <div style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--bg-secondary)", color: "var(--text-muted)", fontWeight: "700", fontSize: "12px", border: "1px solid var(--border)" }}>
                        Pending
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detailed View */}
      {viewMode === "detailed" && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "16px" }}>
            Detailed Breakdown (Per Expense)
          </div>
          {rawDebts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>✅</div>
              <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>No pending debts</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {rawDebts.map((debt, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "10px", background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "13px" }}>{debt.item_name}</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "3px", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {debt.expense_date ? new Date(debt.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                      </span>
                      {debt.category && (
                        <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "100px", background: "var(--blue-dim)", color: "var(--blue)", fontWeight: "600" }}>{debt.category}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--red)" }}>{debt.owedBy?.name}</span> owes <span style={{ color: "var(--green)" }}>{debt.owedTo?.name}</span>
                  </div>
                  <div style={{ fontWeight: "800", fontSize: "14px", color: "var(--red)" }}>Rs.{debt.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Amount Selection Modal */}
      {showAmountModal && settlingWith && (
        <>
          <div onClick={() => { setShowAmountModal(false); setSettlingWith(null) }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "32px", maxWidth: "400px", width: "90%" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Settle Up</h2>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
                You owe <strong>{settlingWith.to.name}</strong>. Enter the amount you want to settle.
              </p>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase" }}>Amount (Rs.)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={settlingWith.amount}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text-primary)", padding: "13px 16px", fontSize: "16px", fontWeight: "700" }}
                />
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                  Full debt: Rs.{settlingWith.amount.toFixed(2)}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <button
                  onClick={() => { setShowAmountModal(false); setSettlingWith(null) }}
                  style={{ padding: "12px", borderRadius: "10px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontWeight: "600", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAmount}
                  style={{ padding: "12px", borderRadius: "10px", background: "var(--accent)", border: "1px solid var(--accent)", color: "#000", fontWeight: "700", cursor: "pointer" }}
                >
                  Continue
                </button>
              </div>
              <button
                onClick={() => { setSettleAmount(settlingWith.amount.toFixed(2)); setShowAmountModal(false); setShowPasswordModal(true); }}
                style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--accent)", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
              >
                Settle Full Amount (Rs.{settlingWith.amount.toFixed(2)})
              </button>
            </div>
          </div>
        </>
      )}

      <TransactionPasswordModal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setSettlingWith(null); setSettleAmount(""); }}
        onSubmit={processSettlement}
        title="Confirm Settlement"
        description={settlingWith ? `You are about to pay Rs.${parseFloat(settleAmount || 0).toFixed(2)} to ${settlingWith.to.name}. Enter your transaction password to confirm.` : ""}
      />
    </div>
  )
}
