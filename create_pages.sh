#!/bin/bash

# Login Page
cat > src/pages/Login.jsx << 'EOF'
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { auth } from "../supabase/client"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const { user } = await auth.login(email, password)
      auth.setUser(user)
      navigate("/dashboard")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "var(--accent)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "26px", fontWeight: "900", color: "#000" }}>E</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "-0.03em" }}>Welcome back</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>Sign in to your account</p>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "32px" }}>
          {error && <div style={{ background: "var(--red-dim)", border: "1px solid rgba(255,85,85,0.2)", borderRadius: "10px", padding: "12px 16px", color: "var(--red)", fontSize: "13px", marginBottom: "20px" }}>{error}</div>}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text-primary)", padding: "13px 16px", fontSize: "14px" }} onFocus={e => e.target.style.borderColor = "var(--accent)"} onBlur={e => e.target.style.borderColor = "var(--border)"} />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text-primary)", padding: "13px 16px", fontSize: "14px" }} onFocus={e => e.target.style.borderColor = "var(--accent)"} onBlur={e => e.target.style.borderColor = "var(--border)"} />
            </div>

            <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", background: loading ? "rgba(200,246,90,0.5)" : "var(--accent)", color: "#000", fontWeight: "800", fontSize: "15px", border: "none", borderRadius: "12px", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "14px", color: "var(--text-secondary)" }}>
          No account? <Link to="/register" style={{ color: "var(--accent)", fontWeight: "700" }}>Create one →</Link>
        </p>
      </div>
    </div>
  )
}
EOF

# Register Page - SCHEMA CORRECT
cat > src/pages/Register.jsx << 'EOF'
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { auth, supabase } from "../supabase/client"

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", login_password: "", transaction_password: "", dob: "", contact: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleRegister = async e => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      // Register user with correct schema
      const { user } = await auth.register({
        name: form.name,
        email: form.email,
        login_password: form.login_password,
        transaction_password: form.transaction_password,
        dob: form.dob,
        contact: parseFloat(form.contact)
      })

      // Initialize personal wallet
      await supabase.from("personal_wallet").insert([{
        user_id: user.user_id,
        balance: 0
      }])

      auth.setUser(user)
      navigate("/dashboard")
    } catch (err) {
      setError(err.message || "Registration failed.")
    }
    setLoading(false)
  }

  const fields = [
    { label: "Full Name", name: "name", type: "text", placeholder: "John Doe" },
    { label: "Email", name: "email", type: "email", placeholder: "you@example.com" },
    { label: "Login Password", name: "login_password", type: "password", placeholder: "Min. 6 characters" },
    { label: "Transaction Password", name: "transaction_password", type: "password", placeholder: "For financial ops" },
    { label: "Date of Birth", name: "dob", type: "date", placeholder: "" },
    { label: "Contact Number", name: "contact", type: "tel", placeholder: "10-digit number" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "var(--accent)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "26px", fontWeight: "900", color: "#000" }}>E</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "-0.03em" }}>Create account</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>Start managing expenses smarter</p>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "32px" }}>
          {error && <div style={{ background: "var(--red-dim)", border: "1px solid rgba(255,85,85,0.2)", borderRadius: "10px", padding: "12px 16px", color: "var(--red)", fontSize: "13px", marginBottom: "20px" }}>{error}</div>}

          <form onSubmit={handleRegister}>
            {fields.map(field => (
              <div key={field.name} style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{field.label}</label>
                <input type={field.type} name={field.name} value={form[field.name]} onChange={handleChange} placeholder={field.placeholder} required style={{ width: "100%", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text-primary)", padding: "13px 16px", fontSize: "14px" }} onFocus={e => e.target.style.borderColor = "var(--accent)"} onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
            ))}

            <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", marginTop: "8px", background: loading ? "rgba(200,246,90,0.5)" : "var(--accent)", color: "#000", fontWeight: "800", fontSize: "15px", border: "none", borderRadius: "12px", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Creating..." : "Create Account →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "14px", color: "var(--text-secondary)" }}>
          Have an account? <Link to="/login" style={{ color: "var(--accent)", fontWeight: "700" }}>Sign in →</Link>
        </p>
      </div>
    </div>
  )
}
EOF

echo "Auth pages created"
