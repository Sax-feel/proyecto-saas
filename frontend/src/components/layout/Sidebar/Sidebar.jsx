"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import "./Sidebar.module.css"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "Mi Empresa", href: "/dashboard/empresa", icon: "🏢" },
  { name: "Clientes", href: "/dashboard/clientes", icon: "👥" },
  { name: "Vendedores", href: "/dashboard/vendedores", icon: "🧑‍💼" },
  { name: "Productos", href: "/dashboard/productos", icon: "📦" },
  { name: "Suscripción", href: "/dashboard/suscripcion", icon: "💳" },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-brand">
            <div className="sidebar-logo">🏢</div>
            <span>Admin Panel</span>
          </div>
        )}

        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "➡️" : "⬅️"}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""} ${
                collapsed ? "center" : ""
              }`}
              title={collapsed ? item.name : ""}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <Link
          href="/login"
          className={`nav-item logout ${collapsed ? "center" : ""}`}
        >
          <span className="nav-icon">🚪</span>
          {!collapsed && <span>Cerrar sesión</span>}
        </Link>
      </div>
    </aside>
  )
}
