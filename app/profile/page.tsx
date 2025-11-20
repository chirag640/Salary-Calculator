"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, DollarSign, Clock, Save } from "lucide-react"
import type { ProfileResponse, SalaryType } from "@/lib/types"
import { useCsrfToken } from "@/hooks/use-csrf"
import { useFetchWithCsrf } from "@/hooks/use-fetch-with-csrf"
import { useToast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Basic info
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  
  // Work config
  const [hoursPerDay, setHoursPerDay] = useState<number>(8)
  const [daysPerMonth, setDaysPerMonth] = useState<number>(22)
  
  // Current salary
  const [currentSalary, setCurrentSalary] = useState<number>(0)
  const [currentSalaryType, setCurrentSalaryType] = useState<SalaryType>("monthly")
  const [estimatedHourly, setEstimatedHourly] = useState<number>(0)

  const { fetchWithCsrf } = useFetchWithCsrf()
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithCsrf("/api/profile", { method: "GET" })
        if (res.ok) {
          const data: ProfileResponse = await res.json()
          setProfile(data)
          setName(data.name)
          setEmail(data.email)
          setPhone(data.contact?.phone || "")
          setHoursPerDay(data.workingConfig?.hoursPerDay ?? 8)
          setDaysPerMonth(data.workingConfig?.daysPerMonth ?? 22)
          
          if (data.salaryHistory && data.salaryHistory.length > 0) {
            const latest = data.salaryHistory
              .slice()
              .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
              .at(-1)!
            setCurrentSalary(latest.amount)
            setCurrentSalaryType(latest.salaryType)
          }
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Auto-calculate hourly rate
  useEffect(() => {
    if (currentSalary > 0 && hoursPerDay > 0 && daysPerMonth > 0) {
      let monthly = currentSalary
      if (currentSalaryType === "annual") monthly = currentSalary / 12
      const hourly = monthly / (daysPerMonth * hoursPerDay)
      setEstimatedHourly(Number(hourly.toFixed(2)))
    }
  }, [currentSalary, currentSalaryType, hoursPerDay, daysPerMonth])

  const saveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetchWithCsrf("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          name,
          contact: { phone },
          workingConfig: { hoursPerDay, daysPerMonth },
          defaultHourlyRate: estimatedHourly,
        }),
      })
      
      if (res.ok) {
        toast({ title: "Profile saved", description: "Settings updated successfully" })
      } else {
        toast({ title: "Save failed", variant: "destructive" })
      }
    } catch {
      toast({ title: "Save failed", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const updateSalary = async () => {
    if (currentSalary <= 0) return
    
    try {
      const today = new Date().toISOString().slice(0, 10)
      const res = await fetchWithCsrf("/api/profile/increment", {
        method: "POST",
        body: JSON.stringify({
          salaryType: currentSalaryType,
          amount: currentSalary,
          effectiveFrom: today,
          working: { hoursPerDay, daysPerMonth },
        }),
      })
      
      if (res.ok) {
        toast({ title: "Salary updated", description: "Hourly rate recalculated" })
      } else {
        toast({ title: "Update failed", variant: "destructive" })
      }
    } catch {
      toast({ title: "Update failed", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="flex items-center justify-center h-64">
          <Clock className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account and work preferences</p>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} disabled className="bg-muted" />
            </div>
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
          </div>
        </CardContent>
      </Card>

      {/* Work Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Work Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Hours per Day</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Working Days per Month</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={daysPerMonth}
                onChange={(e) => setDaysPerMonth(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary & Hourly Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Salary & Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Current Salary</Label>
              <Input
                type="number"
                min={0}
                step={100}
                value={currentSalary}
                onChange={(e) => setCurrentSalary(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={currentSalaryType} onValueChange={(v) => setCurrentSalaryType(v as SalaryType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hourly Rate</Label>
              <div className="text-2xl font-bold text-green-600 pt-2">
                ${estimatedHourly.toFixed(2)}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={updateSalary} variant="outline" size="sm">
              Update Salary
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveProfile} disabled={saving} size="lg" className="min-w-32">
          {saving ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Salary History */}
      {profile?.salaryHistory && profile.salaryHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Salary History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profile.salaryHistory
                .slice()
                .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
                .slice(0, 5)
                .map((record, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{record.effectiveFrom}</div>
                      <div className="text-sm text-muted-foreground">{record.note || "Salary update"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${record.amount.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground capitalize">{record.salaryType}</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
