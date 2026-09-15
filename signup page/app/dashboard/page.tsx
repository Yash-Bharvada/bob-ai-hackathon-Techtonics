import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { signOut } from "@/auth"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/")
  }

  const user = session.user
  const initial = user.name?.charAt(0).toUpperCase() ?? "?"
  const loginTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    <div className="dashboard-shell">
      {/* Nav */}
      <nav className="dashboard-nav">
        <div className="dashboard-nav-brand">
          <span className="brand-dot" aria-hidden="true" />
          VOLTRA
        </div>
        <form
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/" })
          }}
        >
          <button type="submit" className="dashboard-signout">
            Sign out
          </button>
        </form>
      </nav>

      {/* Body */}
      <div className="dashboard-body">
        <div className="dashboard-welcome">
          <h1>Welcome back, {user.name?.split(" ")[0]} 👋</h1>
          <p>Anand District Grid · Operator Console · Session active</p>
        </div>

        {/* User card */}
        <div className="user-card">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? "User avatar"} referrerPolicy="no-referrer" />
          ) : (
            <div className="user-card-avatar-placeholder" aria-hidden="true">
              {initial}
            </div>
          )}
          <div className="user-card-info">
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
          <span className="user-card-badge">GOOGLE AUTH</span>
        </div>

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card">
            <p className="stat-card-label">SESSION STARTED</p>
            <p className="stat-card-value" style={{ fontSize: "14px" }}>{loginTime}</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">AUTH PROVIDER</p>
            <p className="stat-card-value" style={{ fontSize: "14px" }}>Google OAuth 2.0</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">GRID STATUS</p>
            <p className="stat-card-value" style={{ fontSize: "14px", color: "var(--hero-status)" }}>● LIVE</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">TRANSFORMERS MONITORED</p>
            <p className="stat-card-value">18</p>
          </div>
        </div>
      </div>
    </div>
  )
}
