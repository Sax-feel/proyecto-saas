import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  Users,
  UserCheck,
  Package,
  CreditCard,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import "./Sidebar.module.css"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Mi Empresa", href: "/dashboard/empresa", icon: Building2 },
  { name: "Clientes", href: "/dashboard/clientes", icon: Users },
  { name: "Vendedores", href: "/dashboard/vendedores", icon: UserCheck },
  { name: "Productos", href: "/dashboard/productos", icon: Package },
  { name: "Suscripción", href: "/dashboard/suscripcion", icon: CreditCard },
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
            <div className="sidebar-logo">
              <Building2 size={20} />
            </div>
            <span>Admin Panel</span>
          </div>
        )}
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navegación */}
      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""} ${collapsed ? "center" : ""}`}
              title={collapsed ? item.name : ""}
            >
              <Icon size={20} />
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
          <LogOut size={20} />
          {!collapsed && <span>Cerrar sesión</span>}
        </Link>
      </div>
    </aside>
  )
}
