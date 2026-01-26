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
  ShoppingBag,
  Store,
  LibraryBig,
  Bell
} from "lucide-react"

import styles from "./Sidebar.module.css"
import { useState, useEffect } from "react"
import NotificationBell from "./NotificationBell"

// Define todas las rutas disponibles
const allNavigation = {
  // Rutas para admin
  admin: [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Empresas", href: "/admin/empresas", icon: Building2 },
    { name: "Admins Empresa", href: "/admin/admins_empresa", icon: UserCheck },
    { name: "Clientes", href: "/admin/clientes", icon: Users },
    { name: "Vendedores", href: "/admin/vendedores", icon: Package },
  ],

  // Rutas para admin_empresa
  admin_empresa: [
    { name: "Mi Empresa", href: "/usuario_empresa", icon: Building2 },
    { name: "Empleados", href: "/usuario_empresa/empleados", icon: Users },
    { name: "Productos", href: "/usuario_empresa/producto-section", icon: Package },
    { name: "Categorias", href: "/usuario_empresa/categorias", icon: Tag },
    { name: "Suscripción", href: "/usuario_empresa/suscripciones", icon: CreditCard },
    { name: "Vendedores", href: "/usuario_empresa/vendedora", icon: UserCheck },
    { name: "Proveedores", href: "/usuario_empresa/proveedores", icon: Users },
    { name: "Historial de Compras", href: "/usuario_empresa/compras", icon: LibraryBig },
  ],

  // Rutas para vendedor
  vendedor: [
    { name: "Productos", href: "/vendedor/productos_vendedor", icon: Package },
    { name: "Ventas", href: "/vendedor/ventas", icon: CreditCard },
    { name: "Historial de Compras", href: "/vendedor/historial", icon: LibraryBig },
    { name: "Mi Empresa", href: "/vendedor/empresa", icon: Building2 },
  ],

  // Rutas para cliente
  cliente: [
    { name: "Catálogo", href: "/cliente", icon: Package },
    { name: "Mis Compras", href: "/cliente/compras", icon: ShoppingBag },
    { name: "Mis Reservas", href: "/cliente/reservas", icon: CreditCard },
  ]
}

// Función para obtener rol del usuario
function getUserRole() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("rol") || "cliente"
  }
  return "cliente"
}

// Función para obtener nombre del panel según el rol
function getPanelTitle(role) {
  switch (role) {
    case "admin":
      return "Panel de Administración"
    case "admin_empresa":
      return "Panel de Empresa"
    case "vendedor":
      return "Panel de Vendedor"
    case "cliente":
      return "Mi Cuenta"
    default:
      return "Panel"
  }
}

// Función para obtener icono según el rol
function getPanelIcon() {
  return <Bell size={20} />
}

// Determina qué rutas mostrar según el rol y path actual
function getNavigation(pathname, userRole) {
  // Priorizar por ruta primero
  if (pathname?.startsWith('/admin')) {
    return allNavigation.admin
  }
  else if (pathname?.startsWith('/usuario_empresa')) {
    return allNavigation.admin_empresa
  }
  else if (pathname?.startsWith('/vendedor')) {
    return allNavigation.vendedor
  }
  else if (pathname?.startsWith('/cliente')) {
    return allNavigation.cliente
  }

  // Si no coincide ninguna ruta, mostrar según rol
  switch (userRole) {
    case "admin":
      return allNavigation.admin
    case "admin_empresa":
      return allNavigation.admin_empresa
    case "vendedor":
      return allNavigation.vendedor
    case "cliente":
      return allNavigation.cliente
    default:
      return []
  }
}

export default function Sidebar({ collapsed, setCollapsed }) {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState("cliente")
  const [panelTitle, setPanelTitle] = useState("Panel")

  // Obtener rol del usuario al cargar
  useEffect(() => {
    const role = getUserRole()
    setUserRole(role)
    setPanelTitle(getPanelTitle(role))
  }, [pathname]) // Actualizar cuando cambie la ruta

  const navigation = getNavigation(pathname, userRole)

  // Función para cerrar sesión
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access")
      localStorage.removeItem("refresh")
      localStorage.removeItem("rol")
      localStorage.removeItem("userEmail")
      localStorage.removeItem("empresaId")
      window.location.href = "/login"
    }
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        {!collapsed && (
          <>
          <div className={styles.notificationBellContainer}>
                <NotificationBell />
          </div>
          <div className={styles.sidebarBrand}>
            {!collapsed && <span>{panelTitle}</span>}
          </div>
          </>
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

      {/* Footer con información del usuario */}
      <div className={styles.sidebarFooter}>
        {!collapsed && (
          <div className={styles.userInfo}>
            <div className={styles.userEmail}>
              {typeof window !== "undefined" && localStorage.getItem("userEmail")}
            </div>
            <div className={styles.userRole}>
              {userRole === "admin" ? "Administrador" :
                userRole === "admin_empresa" ? "Admin Empresa" :
                  userRole === "vendedor" ? "Vendedor" :
                    "Cliente"}
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={styles.navLogOut}
          title="Cerrar sesión"
        >
          <LogOut size={20} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}