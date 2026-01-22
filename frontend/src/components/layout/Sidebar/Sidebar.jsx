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
  UserStar,
  Tag,
} from "lucide-react"

import styles from "./Sidebar.module.css"

// Define todas las rutas disponibles
const allNavigation = {
  // Rutas para admin general
  admin: [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Empresas", href: "/admin/empresas", icon: Building2 },
    { name: "Admins Empresa", href: "/admin/admins_empresa", icon: UserCheck },
    { name: "Clientes", href: "/admin/clientes", icon: Users },
    { name: "Vendedores", href: "/admin/vendedores", icon: Package },
  ],
  
  // Rutas para usuario empresa
  empresa: [
    { name: "Mi Empresa", href: "/usuario_empresa", icon: Building2 },
    { name: "Empleados", href: "/usuario_empresa/empleados", icon: Users },
    { name: "Productos", href: "/usuario_empresa/producto-section", icon: Package },
    { name: "Categorias", href: "/usuario_empresa/categorias", icon: Tag},
    { name: "Suscripción", href: "/usuario_empresa/suscripciones", icon: CreditCard },
    { name: "Vendedores", href: "usuario_empresa/vendedor", icon:Users }
  ],

  vendedor: [
    { name: "Productos", href: "/vendedor/productos_vendedor", icon: Package },
    { name: "Ventas", href: "/vendedor/ventas", icon: CreditCard },
  ]
}

// Determina qué rutas mostrar según el path actual
function getNavigation(pathname) {
  // Si está en rutas de admin, mostrar esas
  if (pathname?.startsWith('/admin')) {
    return allNavigation.admin
  }
  // Si está en rutas de usuario_empresa, mostrar esas
  else if (pathname?.startsWith('/usuario_empresa')) {
    return allNavigation.empresa
  }
  // Si está en rutas de Vendedores, mostrar esas
  else if (pathname?.startsWith('/vendedor')) {
    return allNavigation.vendedor
  }
  // Por defecto, mostrar admin
  return allNavigation.admin
}

export default function Sidebar({ collapsed, setCollapsed }) {
  const pathname = usePathname()
  const navigation = getNavigation(pathname)

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