import { useState, useEffect } from "react"
import { auth, supabase } from "../supabase/client"
import ExpenseFilters from "../components/ExpenseFilters"
import TransactionPasswordModal from "../components/TransactionPasswordModal"
import { isDateInRange } from "../utils/dateFilters"

export default function Wallet() {
  const user = auth.getUser()

  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [expenses, setExpenses] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilters, setActiveFilters] = useState(null)

  const [showRechargeModal, setShowRechargeModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState("")
  const [rechargeError, setRechargeError] = useState("")
  const [recharging, setRecharging] = useState(false)

  const categories = ["general", "food", "travel", "accommodation", "entertainment", "utilities", "shopping", "health", "settlement", "contribution", "recharge"]

  useEffect(() => {
    if (!user?.user_id) return
    fetchWalletData()
  }, [user?.user_id])

  async function fetchWalletData() {
    setLoading(true)
    const [{ data: walletData }, { data: txData }, { data: expData }, { data: groupData }] = await Promise.all([
      supabase.from("personal_wallet").select("*").eq("user_id", user.user_id).single(),
      supabase.from("transactions").select("*").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(100),
      supabase.from("expenses").select("*").eq("paid_by", user.user_id),
      supabase.from("group_members").select("groups(group_id, group_name)").eq("user_id", user.user_id)
    ])

    setWallet(walletData)
    const allTx = txData || []
    setTransactions(allTx)
    setFilteredTransactions(allTx)
    setExpenses(expData || [])
    setGroups((groupData || []).map(d => d.groups).filter(Boolean))
    setLoading(false)
  }

  const handleFilterChange = (filters) => {
    setActiveFilters(filters)

    let result = [...transactions]

    // Date range filter
    if (filters.startDate && filters.endDate) {
      result = result.filter(t => isDateInRange(t.created_at, filters.startDate, filters.endDate))
    }

    // Category filter
    if (filters.category) {
      result = result.filter(t => t.category === filters.category)
    }

    // Group filter (for expenses that have group_id)
    if (filters.groupId) {
      result = result.filter(t => String(t.group_id) === filters.groupId)
    }

    // Search filter
    if (filters.search) {
      const term = filters.search.toLowerCase()
      result = result.filter(t =>
        (t.item_name || "").toLowerCase().includes(term) ||
        (t.category || "").toLowerCase().includes(term)
      )
    }

    // Amount range
    if (filters.minAmount) {
      result = result.filter(t => parseFloat(t.amount || 0) >= parseFloat(filters.minAmount))
    }
    if (filters.maxAmount) {
      result = result.filter(t => parseFloat(t.amount || 0) <= parseFloat(filters.maxAmount))
    }

    // Sort
    switch (filters.sortBy) {
      case "date_asc":
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        break
      case "date_desc":
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        break
      case "amount_asc":
        result.sort((a, b) => parseFloat(a.amount || 0) - parseFloat(b.amount || 0))
        break
      case "amount_desc":
        result.sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0))
        break
      default:
        break
    }

    setFilteredTransactions(result)
  }

  const totalDebit = filteredTransactions.filter(t => t.direction === "DEBIT").reduce((s, t) => s + parseFloat(t.amount || 0), 0)
  const totalCredit = filteredTransactions.filter(t => t.direction === "CREDIT").reduce((s, t) => s + parseFloat(t.amount || 0), 0)

  const handleRecharge = () => {
    const amount = parseFloat(rechargeAmount)
    if (!amount || amount <= 0) {
      setRechargeError("Please enter a valid amount greater than 0")
      return
    }
    if (amount > 100000) {
      setRechargeError("Maximum recharge amount is Rs.1,00,000")
      return
    }
    setRechargeError("")
    setShowRechargeModal(false)
    setShowPasswordModal(true)
  }

  const processRecharge = async (transactionPassword) => {
    const isValid = await auth.verifyTransactionPassword(user.user_id, transactionPassword)
    if (!isValid) {
      throw new Error("Invalid transaction password")
    }

    const amount = parseFloat(rechargeAmount)
    const currentBalance = parseFloat(wallet?.balance || 0)
    const newBalance = currentBalance + amount

    const { error: walletError } = await supabase
      .from("personal_wallet")
      .update({ balance: newBalance })
      .eq("user_id", user.user_id)

    if (walletError) {
      throw new Error("Failed to update wallet: " + walletError.message)
    }

    const { error: txError } = await supabase
      .from("transactions")
      .insert([{
        user_id: user.user_id,
        amount: amount,
        direction: "CREDIT",
        transaction_type: "RECHARGE",
        item_name: "Wallet Recharge",
        category: "recharge"
      }])

    if (txError) {
      throw new Error("Failed to record transaction: " + txError.message)
    }

    setShowPasswordModal(false)
    setRechargeAmount("")
    await fetchWalletData()
  }

  return (
    <div style={{ maxWidth: "1000px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.03em" }}>My Wallet</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>View your balance and transaction history</p>
      </div>

      {/* Balance Card */}
      <div style={{
        background: "linear-gradient(135deg, #C8F65A 0%, #52E89A 100%)",
        borderRadius: "20px",
        padding: "36px 32px",
        marginBottom: "24px",
        color: "#000",
        boxShadow: "0 8px 32px rgba(200,246,90,0.2)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "13px", opacity: 0.7, marginBottom: "8px", fontWeight: "600" }}>Current Balance</div>
            <div style={{ fontSize: "44px", fontWeight: "900", letterSpacing: "-0.03em" }}>
              Rs.{loading ? "..." : (parseFloat(wallet?.balance) || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.6, marginTop: "12px" }}>
              Your balance updates automatically via expenses and contributions
            </div>
          </div>
          <button
            onClick={() => { setShowRechargeModal(true); setRechargeAmount(""); setRechargeError("") }}
            style={{
              padding: "12px 24px",
              borderRadius: "12px",
              background: "#000",
              color: "#C8F65A",
              fontWeight: "800",
              fontSize: "14px",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span style={{ fontSize: "18px" }}>+</span> Add Money
          </button>
        </div>
      </div>

      {/* Recent Wallet Activity */}
      {transactions.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px", marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "14px" }}>
            Recent Wallet Activity
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {transactions.slice(0, 5).map(tx => {
              const isCredit = tx.direction === "CREDIT"
              const isRecharge = tx.transaction_type === "RECHARGE"
              return (
                <div key={tx.transaction_id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "10px", background: isRecharge ? "rgba(200,246,90,0.08)" : "var(--bg-tertiary)", border: isRecharge ? "1px solid rgba(200,246,90,0.2)" : "1px solid var(--border)" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: isRecharge ? "var(--accent-dim)" : (isCredit ? "var(--green-dim)" : "var(--red-dim)"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
                    {isRecharge ? "⚡" : (isCredit ? "↓" : "↑")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "13px" }}>{tx.item_name || tx.category || tx.transaction_type}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                    </div>
                  </div>
                  <div style={{ fontWeight: "800", fontSize: "14px", color: isRecharge ? "var(--accent)" : (isCredit ? "var(--green)" : "var(--red)") }}>
                    {isCredit ? "+" : "−"}Rs.{Math.abs(parseFloat(tx.amount) || 0).toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter Summary */}
      {activeFilters && (
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <div style={{ background: "var(--green-dim)", border: "1px solid rgba(82,232,154,0.2)", borderRadius: "8px", padding: "8px 14px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Income</span>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--green)" }}>+Rs.{totalCredit.toFixed(2)}</div>
          </div>
          <div style={{ background: "var(--red-dim)", border: "1px solid rgba(255,85,85,0.2)", borderRadius: "8px", padding: "8px 14px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Expenses</span>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--red)" }}>-Rs.{totalDebit.toFixed(2)}</div>
          </div>
          <div style={{ background: "var(--accent-dim)", border: "1px solid rgba(200,246,90,0.15)", borderRadius: "8px", padding: "8px 14px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Net</span>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--accent)" }}>{totalCredit >= totalDebit ? "+" : ""}Rs.{(totalCredit - totalDebit).toFixed(2)}</div>
          </div>
          <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 14px", marginLeft: "auto" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Showing</span>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)" }}>{filteredTransactions.length} transactions</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <ExpenseFilters
        onFilterChange={handleFilterChange}
        categories={categories}
        groups={groups}
      />

      {/* Transaction History */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Transaction History
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {filteredTransactions.length} results
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
            <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>No transactions match your filters</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filteredTransactions.map(tx => {
              const isCredit = tx.direction === "CREDIT"
              const isRecharge = tx.transaction_type === "RECHARGE"
              return (
                <div key={tx.transaction_id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", borderRadius: "12px", background: isRecharge ? "rgba(200,246,90,0.06)" : "var(--bg-tertiary)", border: isRecharge ? "1px solid rgba(200,246,90,0.2)" : "1px solid var(--border)" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: isRecharge ? "var(--accent-dim)" : (isCredit ? "var(--green-dim)" : "var(--red-dim)"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                    {isRecharge ? "⚡" : (isCredit ? "↓" : "↑")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>{tx.item_name || tx.category || tx.transaction_type || "Transaction"}</div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                      </span>
                      {tx.category && (
                        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "100px", background: "var(--purple-dim)", color: "var(--purple)", fontWeight: "600" }}>{tx.category}</span>
                      )}
                      <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "100px", background: isRecharge ? "var(--accent-dim)" : (isCredit ? "var(--green-dim)" : "var(--red-dim)"), color: isRecharge ? "var(--accent)" : (isCredit ? "var(--green)" : "var(--red)"), fontWeight: "600" }}>{tx.transaction_type}</span>
                    </div>
                  </div>
                  <div style={{ fontWeight: "800", fontSize: "16px", color: isRecharge ? "var(--accent)" : (isCredit ? "var(--green)" : "var(--red)") }}>
                    {isCredit ? "+" : "−"}Rs.{Math.abs(parseFloat(tx.amount) || 0).toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "400px" }}>
            <div style={{ fontSize: "18px", fontWeight: "800", marginBottom: "4px" }}>Add Money to Wallet</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>Enter the amount you want to recharge</div>

            {rechargeError && (
              <div style={{ background: "var(--red-dim)", border: "1px solid rgba(255,85,85,0.2)", borderRadius: "10px", padding: "10px 14px", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
                {rechargeError}
              </div>
            )}

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>Amount (Rs.)</label>
              <input
                type="number"
                value={rechargeAmount}
                onChange={e => setRechargeAmount(e.target.value)}
                placeholder="e.g. 500"
                autoFocus
                style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text-primary)", padding: "12px 14px", fontSize: "16px", fontWeight: "700", outline: "none" }}
                onKeyDown={e => { if (e.key === "Enter" && !recharging) handleRecharge() }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowRechargeModal(false)}
                style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "var(--bg-tertiary)", color: "var(--text-primary)", fontWeight: "700", fontSize: "14px", border: "1px solid var(--border)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleRecharge}
                style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "var(--accent)", color: "#000", fontWeight: "800", fontSize: "14px", border: "none", cursor: "pointer" }}
              >
                Add Money
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionPasswordModal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setRechargeAmount("") }}
        onSubmit={processRecharge}
        title="Confirm Recharge"
        description={rechargeAmount ? `You are about to add Rs.${parseFloat(rechargeAmount).toFixed(2)} to your wallet. Enter your transaction password to confirm.` : ""}
      />
    </div>
  )
}
