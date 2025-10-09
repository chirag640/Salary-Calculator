"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Bell, Mail, Smartphone, Clock, Check, AlertCircle } from "lucide-react"
import { useFetchWithCsrf } from "@/hooks/use-fetch-with-csrf"
import type { NotificationSettings, NotificationPreference, NotificationType } from "@/lib/notifications/types"

const NOTIFICATION_LABELS: Record<NotificationType, { title: string; description: string; icon: string }> = {
  IDLE_TIMER: {
    title: "Idle Timer Alert",
    description: "Get notified when timer runs for too long",
    icon: "⏱️",
  },
  TIMER_REMINDER: {
    title: "Daily Timer Reminder",
    description: "Reminder to start tracking time",
    icon: "⏰",
  },
  DAILY_SUMMARY: {
    title: "Daily Summary",
    description: "Daily work summary email",
    icon: "📊",
  },
  WEEKLY_SUMMARY: {
    title: "Weekly Summary",
    description: "Weekly work summary email",
    icon: "📈",
  },
  MONTHLY_SUMMARY: {
    title: "Monthly Summary",
    description: "Monthly work summary email",
    icon: "📅",
  },
  OVERDUE_INVOICE: {
    title: "Overdue Invoice",
    description: "Alert for overdue invoices",
    icon: "💰",
  },
  HOURLY_RATE_REMINDER: {
    title: "Hourly Rate Reminder",
    description: "Reminder to set hourly rate",
    icon: "💵",
  },
}

export function NotificationSettingsManager() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { fetchWithCsrf } = useFetchWithCsrf()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetchWithCsrf("/api/notifications/settings")
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        throw new Error("Failed to load notification settings")
      }
    } catch (err) {
      setError("Failed to load notification settings")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateGlobalSettings = async (updates: Partial<NotificationSettings>) => {
    if (!settings) return

    try {
      setSaving(true)
      const response = await fetchWithCsrf("/api/notifications/settings", {
        method: "PUT",
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updated = await response.json()
        setSettings(updated)
        showSavedIndicator()
      } else {
        throw new Error("Failed to update settings")
      }
    } catch (err) {
      setError("Failed to update settings")
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = async (preference: NotificationPreference) => {
    if (!settings) return

    try {
      setSaving(true)
      const response = await fetchWithCsrf("/api/notifications/settings", {
        method: "POST",
        body: JSON.stringify(preference),
      })

      if (response.ok) {
        const updated = await response.json()
        setSettings(updated)
        showSavedIndicator()
      } else {
        throw new Error("Failed to update preference")
      }
    } catch (err) {
      setError("Failed to update preference")
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const showSavedIndicator = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const togglePreference = (type: NotificationType) => {
    if (!settings) return

    const preference = settings.preferences.find((p) => p.type === type)
    if (preference) {
      updatePreference({ ...preference, enabled: !preference.enabled })
    }
  }

  const toggleChannel = (type: NotificationType, channel: "EMAIL" | "IN_APP" | "PUSH") => {
    if (!settings) return

    const preference = settings.preferences.find((p) => p.type === type)
    if (preference) {
      const channels = preference.channels.includes(channel)
        ? preference.channels.filter((c) => c !== channel)
        : [...preference.channels, channel]
      updatePreference({ ...preference, channels })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="mx-auto h-12 w-12 mb-4" />
            <p>Failed to load notification settings</p>
            <Button onClick={loadSettings} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Channels
              </CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </div>
            {saved && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Check className="h-3 w-3 mr-1" />
                Saved
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email-notifications" className="font-medium">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotificationsEnabled}
              onCheckedChange={(checked) =>
                updateGlobalSettings({ emailNotificationsEnabled: checked })
              }
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="in-app-notifications" className="font-medium">
                  In-App Notifications
                </Label>
                <p className="text-sm text-muted-foreground">Show notifications in the app</p>
              </div>
            </div>
            <Switch
              id="in-app-notifications"
              checked={settings.inAppNotificationsEnabled}
              onCheckedChange={(checked) =>
                updateGlobalSettings({ inAppNotificationsEnabled: checked })
              }
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="push-notifications" className="font-medium">
                  Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">Receive push notifications</p>
              </div>
            </div>
            <Switch
              id="push-notifications"
              checked={settings.pushNotificationsEnabled}
              onCheckedChange={(checked) =>
                updateGlobalSettings({ pushNotificationsEnabled: checked })
              }
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="quiet-hours" className="font-medium">
                  Quiet Hours
                </Label>
                <p className="text-sm text-muted-foreground">Pause notifications during specific times</p>
              </div>
            </div>
            <Switch
              id="quiet-hours"
              checked={settings.quietHoursEnabled}
              onCheckedChange={(checked) => updateGlobalSettings({ quietHoursEnabled: checked })}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Individual Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>Customize individual notification types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {settings.preferences.map((pref) => {
              const label = NOTIFICATION_LABELS[pref.type]
              if (!label) return null

              return (
                <div key={pref.type} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{label.icon}</span>
                      <div>
                        <h4 className="font-medium">{label.title}</h4>
                        <p className="text-sm text-muted-foreground">{label.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={pref.enabled}
                      onCheckedChange={() => togglePreference(pref.type)}
                      disabled={saving}
                    />
                  </div>

                  {pref.enabled && (
                    <div className="pl-11 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Delivery Channels
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {["EMAIL", "IN_APP", "PUSH"].map((channel) => (
                          <Badge
                            key={channel}
                            variant={pref.channels.includes(channel as any) ? "default" : "outline"}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => toggleChannel(pref.type, channel as any)}
                          >
                            {channel === "EMAIL" && <Mail className="h-3 w-3 mr-1" />}
                            {channel === "IN_APP" && <Bell className="h-3 w-3 mr-1" />}
                            {channel === "PUSH" && <Smartphone className="h-3 w-3 mr-1" />}
                            {channel}
                          </Badge>
                        ))}
                      </div>

                      {pref.schedule && (
                        <div className="text-xs text-muted-foreground mt-2">
                          <Clock className="h-3 w-3 inline mr-1" />
                          Scheduled: {pref.schedule.hour.toString().padStart(2, "0")}:
                          {pref.schedule.minute.toString().padStart(2, "0")}
                          {pref.schedule.dayOfWeek !== undefined &&
                            ` on ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][pref.schedule.dayOfWeek]}`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
