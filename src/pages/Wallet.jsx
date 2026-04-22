import { useState, useEffect } from "react"
import { auth, supabase } from "../supabase/client"

/**
 * WALLET PAGE
 * 
 * Displays:
 * - Personal wallet balance (READ-ONLY)
 * - Transaction history
 * 
 * NOTE: Users CANNOT manually add funds to their wallet
 * Balance starts at ₹100,000 (paper trading default) on registration
 * Balance only updates automatically via expenses and contributions
 * 
 * Schema tables used:
 * - personal_wallet (user_id, balance)
 * - transactions (transaction_id, user_id, amount, direction, category, item_name)
 */
export default function Wallet() {
  const user = auth.getUser()
  
  // State management
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch wallet data on component mount
  useEffect(() => {
    if (!user?.user_id) return
    
    const fetchWalletData = async () => {
      setLoading(true)
      
      // Fetch personal wallet balance
      const { data: walletData } = await supabase
        .from("personal_wallet")
        .select("*")
        .eq("user_id", user.user_id)
        .single()
      
      setWallet(walletData)
      
      // Fetch transaction history (last 20 transactions)
      const { data: txData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(20)
      
      setTransactions(txData || [])
      setLoading(false)
    }
    
    fetchWalletData()
  }, [user?.user_id])

  return (
    <div style={{ maxWidth: "800px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.03em" }}>My Wallet</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>
          View your balance and transaction history
        </p>
      </div>

      {/* Balance Card (gradient background like CRED) */}
      <div style={{
        background: "linear-gradient(135deg, #C8F65A 0%, #52E89A 100%)",
        borderRadius: "20px",
        padding: "36px 32px",
        marginBottom: "24px",
        color: "#000",
        boxShadow: "0 8px 32px rgba(200,246,90,0.2)"
      }}>
        <div style={{ fontSize: "13px", opacity: 0.7, marginBottom: "8px", fontWeight: "600" }}>
          Current Balance
        </div>
        <div style={{ fontSize: "44px", fontWeight: "900", letterSpacing: "-0.03em" }}>
          ₹{loading ? "..." : (parseFloat(wallet?.balance) || 0).toFixed(2)}
        </div>
        <div style={{ fontSize: "12px", opacity: 0.6, marginTop: "12px" }}>
          💡 Your balance updates automatically via expenses and contributions
        </div>
      </div>

      {/* Info box - explaining wallet rules */}
      <div style={{
        background: "var(--blue-dim)",
        border: "1px solid rgba(96,165,250,0.2)",
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "24px"
      }}>
        <div style={{ fontSize: "13px", color: "var(--blue)", lineHeight: 1.6 }}>
          <strong>ℹ️ How your wallet works:</strong><br/>
          • Started with ₹1,00,000 (like a paper trading account)<br/>
          • Balance decreases when you add expenses<br/>
          • Balance increases when you receive contributions<br/>
          • You cannot manually add or withdraw funds
        </div>
      </div>

      {/* Transaction History */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "24px"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}>
          <div style={{
            fontSize: "13px",
            fontWeight: "700",
            color: "var(--text-secondary)",
            letterSpacing: "0.06em",
            textTransform: "uppercase"
          }}>
            Transaction History
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Last 20 transactions
          </div>
        </div>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
            <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>No transactions yet</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {transactions.map(tx => {
              const isCredit = tx.direction === "CREDIT"
              
              return (
                <div key={tx.transaction_id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)"
                }}>
                  {/* Transaction icon */}
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: isCredit ? "var(--green-dim)" : "var(--red-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    flexShrink: 0
                  }}>
                    {isCredit ? "↓" : "↑"}
                  </div>
                  
                  {/* Transaction details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>
                      {tx.item_name || tx.category || tx.transaction_type || "Transaction"}
                    </div>
                    <div style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      marginTop: "4px"
                    }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        }) : ""}
                      </span>
                      {tx.category && (
                        <span style={{
                          fontSize: "10px",
                          padding: "2px 8px",
                          borderRadius: "100px",
                          background: "var(--purple-dim)",
                          color: "var(--purple)",
                          fontWeight: "600"
                        }}>
                          {tx.category}
                        </span>
                      )}
                      <span style={{
                        fontSize: "10px",
                        padding: "2px 8px",
                        borderRadius: "100px",
                        background: isCredit ? "var(--green-dim)" : "var(--red-dim)",
                        color: isCredit ? "var(--green)" : "var(--red)",
                        fontWeight: "600"
                      }}>
                        {tx.transaction_type}
                      </span>
                    </div>
                  </div>
                  
                  {/* Transaction amount */}
                  <div style={{
                    fontWeight: "800",
                    fontSize: "16px",
                    color: isCredit ? "var(--green)" : "var(--red)"
                  }}>
                    {isCredit ? "+" : "−"}₹{Math.abs(parseFloat(tx.amount) || 0).toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
