"use client"

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

import styles from "./Sidebar.module.css"

const navigation = [
  { name: "Mi Empresa", href: "/usuario_empresa", icon: Building2 },
  { name: "Clientes", href: "/usuario_empresa/empleados", icon: Users },
  { name: "Productos", href: "/usuario_empresa/producto-section", icon: Package },
  { name: "Suscripción", href: "/usuario_empresa/suscripciones", icon: CreditCard },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const pathname = usePathname()

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        {!collapsed && (
          <div className={styles.sidebarBrand}>
            <div className={styles.sidebarLogo}>
              <Building2 size={20} />
            </div>
            <span>Admin Panel</span>
          </div>
        )}
        <button 
          className={styles.collapseBtn} 
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navegación */}
      <nav className={styles.sidebarNav}>
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
              title={item.name}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={styles.sidebarFooter}>
        <Link
          href="/login"
          className={`${styles.navItem} ${styles.logout}`}
          title="Cerrar sesión"
        >
          <LogOut size={20} />
          {!collapsed && <span>Cerrar sesión</span>}
        </Link>
      </div>
    </aside>
  )
}