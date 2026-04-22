import { useState } from "react"

/**
 * TransactionPasswordModal
 * 
 * Modal dialog for entering transaction password to authorize sensitive operations
 * like contributions, payments, etc.
 */
export default function TransactionPasswordModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  title = "Verify Transaction",
  description = "Enter your transaction password to continue",
  loading = false 
}) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    
    if (!password.trim()) {
      setError("Please enter your transaction password")
      return
    }
    
    try {
      await onSubmit(password)
      setPassword("")
      setShowPassword(false)
    } catch (err) {
      setError(err.message || "Transaction failed")
    }
  }

  const handleClose = () => {
    setPassword("")
    setError("")
    setShowPassword(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999
        }}
      >
        {/* Modal Container */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "32px",
            maxWidth: "400px",
            width: "90%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
          }}
        >
          {/* Header */}
          <h2 style={{
            fontSize: "18px",
            fontWeight: "700",
            color: "var(--text-primary)",
            marginBottom: "8px"
          }}>
            🔐 {title}
          </h2>
          
          <p style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
            marginBottom: "24px"
          }}>
            {description}
          </p>

          {/* Error Message */}
          {error && (
            <div style={{
              background: "var(--red-dim)",
              border: "1px solid rgba(255,85,85,0.2)",
              borderRadius: "10px",
              padding: "12px 16px",
              color: "var(--red)",
              fontSize: "13px",
              marginBottom: "16px"
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.06em"
              }}>
                Transaction Password
              </label>
              
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  style={{
                    width: "100%",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    color: "var(--text-primary)",
                    padding: "13px 16px",
                    fontSize: "14px",
                    paddingRight: "44px",
                    fontFamily: "inherit",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                />
                
                {/* Toggle Password Visibility */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    color: "var(--text-secondary)",
                    fontSize: "18px",
                    padding: "4px"
                  }}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px"
            }}>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "var(--text-primary)",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  opacity: loading ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.target.style.background = "var(--bg-secondary)"
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "var(--bg-tertiary)"
                }}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: "var(--accent)",
                  border: "1px solid var(--accent)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "white",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.target.style.opacity = "0.9"
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = loading ? "0.7" : "1"
                }}
              >
                {loading ? "Verifying..." : "Authorize"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
