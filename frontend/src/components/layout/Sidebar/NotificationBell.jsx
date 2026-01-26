"use client"

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import styles from './NotificationBell.module.css'

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [expandedNotifications, setExpandedNotifications] = useState(new Set())
    const dropdownRef = useRef(null)
    const [shouldAnimate, setShouldAnimate] = useState(false)

    // Fetch notifications - Sin axios
    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('access')
            const response = await fetch(
                `http://localhost:8000/api/notificaciones/mis-notificaciones/`,
                {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            )

            if (response.ok) {
                const data = await response.json()
                if (data.status === 'success') {
                    setNotifications(data.notificaciones)
                    setUnreadCount(data.no_leidas)

                    // Si hay notificaciones no leídas, activar animación
                    if (data.no_leidas > 0) {
                        setShouldAnimate(true)
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching notifications:', error)
        }
    }

    // Marcar notificaciones como leídas - Sin axios
    const markAsRead = async (notificationIds = null) => {
        try {
            setLoading(true)
            const token = localStorage.getItem('access')
            const data = notificationIds
                ? { notificacion_ids: notificationIds }
                : { marcar_todas: true }

            const response = await fetch(
                `http://localhost:8000/api/notificaciones/marcar-leidas/`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                }
            )

            if (response.ok) {
                await fetchNotifications() // Refresh notifications
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error)
        } finally {
            setLoading(false)
        }
    }

    // Marcar una notificación específica como leída
    const markSingleAsRead = async (notificationId) => {
        try {
            const token = localStorage.getItem('access')
            const response = await fetch(
                `http://localhost:8000/api/notificaciones/marcar-leidas/`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ notificacion_ids: [notificationId] })
                }
            )

            if (response.ok) {
                // Actualizar estado local inmediatamente
                setNotifications(prev => prev.map(notif => 
                    notif.id === notificationId ? { ...notif, leido: true } : notif
                ))
                setUnreadCount(prev => Math.max(0, prev - 1))
                
                // Si ya no hay notificaciones no leídas, detener animación
                if (unreadCount <= 1) {
                    setShouldAnimate(false)
                }
            }
        } catch (error) {
            console.error('Error marking single notification as read:', error)
        }
    }

    // Eliminar notificación - Sin axios
    const deleteNotification = async (notificationId) => {
        try {
            const token = localStorage.getItem('access')
            const response = await fetch(
                `http://localhost:8000/api/notificaciones/${notificationId}/eliminar/`,
                {
                    method: 'DELETE',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            )

            if (response.ok) {
                // Remove from local state
                setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
                setUnreadCount(prev => {
                    const deletedNotif = notifications.find(n => n.id === notificationId)
                    return deletedNotif && !deletedNotif.leido ? Math.max(0, prev - 1) : prev
                })
                
                // También remover de expanded si estaba expandida
                setExpandedNotifications(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(notificationId)
                    return newSet
                })
            }
        } catch (error) {
            console.error('Error deleting notification:', error)
        }
    }

    // Marcar todas como leídas
    const markAllAsRead = async () => {
        if (unreadCount > 0) {
            await markAsRead()
            setShouldAnimate(false)
        }
    }

    // Toggle expandir notificación
    const toggleExpandNotification = (notificationId) => {
        setExpandedNotifications(prev => {
            const newSet = new Set(prev)
            if (newSet.has(notificationId)) {
                newSet.delete(notificationId)
            } else {
                newSet.add(notificationId)
            }
            return newSet
        })
    }

    // Fetch notifications on mount and every 30 seconds
    useEffect(() => {
        fetchNotifications()

        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    // Alternar animación cada 5 segundos cuando hay notificaciones no leídas
    useEffect(() => {
        let animationInterval

        if (unreadCount > 0 && shouldAnimate) {
            animationInterval = setInterval(() => {
                setShouldAnimate(prev => !prev)
            }, 5000)
        }

        return () => {
            if (animationInterval) clearInterval(animationInterval)
        }
    }, [unreadCount, shouldAnimate])

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Formatear fecha relativa
    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Ahora mismo'
        if (diffMins < 60) return `Hace ${diffMins} min${diffMins !== 1 ? 's' : ''}`
        if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
        if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`

        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        })
    }

    // Obtener color según tipo de notificación
    const getTypeColor = (type) => {
        switch (type) {
            case 'info': return '#3b82f6'
            case 'success': return '#10b981'
            case 'warning': return '#f59e0b'
            case 'error': return '#ef4444'
            default: return '#6b7280'
        }
    }

    return (
        <div className={styles.notificationContainer} ref={dropdownRef}>
            {/* Botón de campanita */}
            <button
                className={`${styles.bellButton} ${unreadCount > 0 ? styles.hasUnread : ''} ${shouldAnimate ? styles.shaking : ''}`}
                onClick={() => {
                    console.log("Campana click")
                    setShowDropdown(!showDropdown)
                }}
                aria-label={`Notificaciones (${unreadCount} sin leer)`}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount}</span>
                )}
            </button>

            {/* Dropdown de notificaciones */}
            {showDropdown && (
                <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}>
                        <h3>Notificaciones {unreadCount > 0 && `(${unreadCount})`}</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className={styles.markAllButton}
                                disabled={loading}
                            >
                                <span>Marcar todas</span>
                            </button>
                        )}
                    </div>

                    <div className={styles.notificationsList}>
                        {notifications.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Bell size={32} />
                                <p>No hay notificaciones</p>
                            </div>
                        ) : (
                            notifications.map(notification => {
                                const isExpanded = expandedNotifications.has(notification.id)
                                const isUnread = !notification.leido
                                
                                return (
                                    <div
                                        key={notification.id}
                                        className={`${styles.notificationItem} ${isUnread ? styles.unread : ''} ${isExpanded ? styles.expanded : ''}`}
                                    >
                                        {/* Encabezado de la notificación (siempre visible) */}
                                        <div 
                                            className={styles.notificationHeader}
                                            onClick={() => toggleExpandNotification(notification.id)}
                                        >
                                            <span
                                                className={styles.typeIndicator}
                                                style={{ backgroundColor: getTypeColor(notification.notificacion.tipo) }}
                                            />
                                            <div className={styles.headerContent}>
                                                <strong className={styles.notificationTitle}>
                                                    {notification.notificacion.titulo}
                                                </strong>
                                                <span className={styles.timeAgo}>
                                                    {formatTimeAgo(notification.notificacion.fecha_creacion)}
                                                </span>
                                            </div>
                                            <button 
                                                className={styles.expandButton}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    toggleExpandNotification(notification.id)
                                                }}
                                            >
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>

                                        {/* Contenido expandible */}
                                        {isExpanded && (
                                            <div className={styles.expandedContent}>
                                                <p className={styles.notificationMessage}>
                                                    {notification.notificacion.mensaje}
                                                </p>
                                                
                                                <div className={styles.notificationActions}>
                                                    {isUnread && (
                                                        <button
                                                            onClick={() => markSingleAsRead(notification.id)}
                                                            className={styles.markReadButton}
                                                            title="Marcar como leída"
                                                        >
                                                            <Check size={16} />
                                                            <span>Leída</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteNotification(notification.id)}
                                                        className={styles.deleteButton}
                                                        title="Eliminar notificación"
                                                    >
                                                        <Trash2 size={16} />
                                                        <span>Eliminar</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className={styles.dropdownFooter}>
                            <span className={styles.totalCount}>
                                {notifications.length} notificación{notifications.length !== 1 ? 'es' : ''}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}