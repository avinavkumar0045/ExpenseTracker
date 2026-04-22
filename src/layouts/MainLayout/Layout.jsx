import { useState } from "react"
import Navbar from "./Navbar"
import Sidebar from "./Sidebar"
import { auth } from "../../supabase/client"

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const user = auth.getUser()

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar user={user} toggleSidebar={() => setSidebarOpen(o => !o)} />
      <Sidebar sidebarOpen={sidebarOpen} user={user} />
      <main style={{ marginLeft: sidebarOpen ? "var(--sidebar-width)" : "0", marginTop: "var(--navbar-height)", padding: "32px", minHeight: "calc(100vh - var(--navbar-height))", transition: "margin-left 0.25s ease" }}>
        {children}
      </main>
    </div>
  )
}
