"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFetchWithCsrf } from "@/hooks/use-fetch-with-csrf"
import type { InAppNotification } from "@/lib/notifications/types"
import { formatDistanceToNow } from "date-fns"

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const { fetchWithCsrf } = useFetchWithCsrf()

  useEffect(() => {
    loadNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      const response = await fetchWithCsrf("/api/notifications")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("Failed to load notifications:", error)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const response = await fetchWithCsrf("/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          action: "markRead",
          notificationId: id,
        }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetchWithCsrf("/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          action: "markAllRead",
        }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetchWithCsrf("/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          action: "delete",
          notificationId: id,
        }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n._id !== id))
        const wasUnread = notifications.find((n) => n._id === id && !n.read)
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error("Failed to delete notification:", error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700"
      case "HIGH":
        return "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700"
      case "NORMAL":
        return "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
      default:
        return "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => {
            if (!open) loadNotifications()
          }}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`border rounded-lg p-4 transition-all ${
                    !notification.read
                      ? "bg-primary/5 border-primary/30"
                      : "bg-card"
                  } ${getPriorityColor(notification.priority)}`}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification._id!)
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {notification.icon && (
                        <span className="text-2xl mb-2 block">{notification.icon}</span>
                      )}
                      <h4 className="font-semibold mb-1">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {!notification.read && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notification._id!)
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </Button>
                  </div>

                  {notification.actionUrl && notification.actionLabel && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.href = notification.actionUrl!
                      }}
                    >
                      {notification.actionLabel}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
