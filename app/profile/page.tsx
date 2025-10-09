"use client"
import { useEffect, useState } from "react"
import { motion, fadeInUp, staggerContainer } from "@/components/motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NotificationSettingsManager } from "@/components/notification-settings"
import type { ProfileResponse, SalaryRecord, SalaryType } from "@/lib/types"
import { useCsrfToken } from "@/hooks/use-csrf"
import { useFetchWithCsrf } from "@/hooks/use-fetch-with-csrf"
import { useToast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const { csrfToken, ensureCsrfToken } = useCsrfToken()
  const { toast } = useToast()
  const { fetchWithCsrf } = useFetchWithCsrf()
  const [username, setUsername] = useState("")
  const [phone, setPhone] = useState("")
  const [hoursPerDay, setHoursPerDay] = useState<number>(8)
  const [daysPerMonth, setDaysPerMonth] = useState<number>(22)
  const [otEnabled, setOtEnabled] = useState(false)
  const [otThreshold, setOtThreshold] = useState<number>(8)
  const [otMultiplier, setOtMultiplier] = useState<number>(1.5)

  // Increment form
  const [estimatedHourly, setEstimatedHourly] = useState<number | null>(null)
  const [salaryType, setSalaryType] = useState<SalaryType>("monthly")
  const [salaryAmount, setSalaryAmount] = useState<number>(0)
  const [effectiveFrom, setEffectiveFrom] = useState<string>("")
  const [note, setNote] = useState<string>("")
  // Quick current salary
  const [currentSalary, setCurrentSalary] = useState<number>(0)
  const [currentSalaryType, setCurrentSalaryType] = useState<SalaryType>("monthly")

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithCsrf('/api/profile', { method: 'GET' })
        if (res.ok) {
          const data: ProfileResponse = await res.json()
          setProfile(data)
          setName(data.name)
          setUsername(data.username || '')
          setEmail(data.email)
          setPhone(data.contact?.phone || '')
          setHoursPerDay(data.workingConfig?.hoursPerDay ?? 8)
          setDaysPerMonth(data.workingConfig?.daysPerMonth ?? 22)
          setOtEnabled(!!data.overtime?.enabled)
          setOtThreshold(data.overtime?.thresholdHoursPerDay ?? 8)
          setOtMultiplier(data.overtime?.multiplier ?? 1.5)
          if (data.salaryHistory && data.salaryHistory.length > 0) {
            const latest = data.salaryHistory.slice().sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)).at(-1)!
            setCurrentSalary(latest.amount)
            setCurrentSalaryType(latest.salaryType)
          }
        }
        await ensureCsrfToken()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetchWithCsrf('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          username,
          contact: { phone },
          workingConfig: { hoursPerDay, daysPerMonth },
          overtime: { enabled: otEnabled, thresholdHoursPerDay: otThreshold, multiplier: otMultiplier },
          currentSalary: { amount: currentSalary, salaryType: currentSalaryType },
          defaultHourlyRate: estimatedHourly ?? undefined,
        }),
      })
      if (res.ok) {
        toast({ title: 'Profile saved', description: 'Your profile settings were updated.' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Save failed', description: err.error || 'Server rejected the update.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Save failed', description: 'Network error.', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const addIncrement = async () => {
    if (!effectiveFrom || salaryAmount <= 0) return
    try {
      const res = await fetchWithCsrf('/api/profile/increment', {
        method: 'POST',
        body: JSON.stringify({ salaryType, amount: salaryAmount, effectiveFrom, working: { hoursPerDay, daysPerMonth }, note }),
      })
      if (res.ok) {
        const prof = await (await fetchWithCsrf('/api/profile', { method: 'GET' })).json()
        setProfile(prof)
        setSalaryAmount(0)
        setEffectiveFrom('')
        setNote('')
        toast({ title: 'Increment added', description: 'Salary history updated.' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Increment failed', description: err.error || 'Server rejected the increment.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Increment failed', description: 'Network error.', variant: 'destructive' })
    }
  }

  const computeHourly = () => {
    if (!currentSalary || hoursPerDay <= 0 || daysPerMonth <= 0) {
      setEstimatedHourly(null)
      return
    }

    // Convert annual/monthly to monthly amount
    let monthly = currentSalary
    if (currentSalaryType === "annual") monthly = currentSalary / 12

    // hourly = monthly / (daysPerMonth * hoursPerDay)
    const hourly = monthly / (daysPerMonth * hoursPerDay)
    setEstimatedHourly(Number(hourly.toFixed(2)))
  }

  const applyEstimatedHourly = async () => {
    if (estimatedHourly == null) return
    setSaving(true)
    try {
      const res = await fetchWithCsrf('/api/profile', { method: 'PUT', body: JSON.stringify({ defaultHourlyRate: estimatedHourly }) })
      if (res.ok) {
        toast({ title: 'Default hourly rate set', description: `Now ${estimatedHourly}` })
      } else {
        toast({ title: 'Update failed', description: 'Could not set hourly rate.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Update failed', description: 'Network error.', variant: 'destructive' })
    } finally { setSaving(false) }
  }
  if (loading) return <div className="p-6">Loading profile...</div>

  return (
    <motion.div className="container mx-auto p-6 max-w-4xl space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      <motion.h1 className="text-3xl font-bold" variants={fadeInUp}>Profile</motion.h1>

      <motion.div variants={fadeInUp}>
  <Card className="hover:translate-y-[-1px] transition-transform">
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Optional username" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} disabled />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Hours per Day</Label>
              <Input type="number" min={1} value={hoursPerDay} onChange={(e) => setHoursPerDay(Number(e.target.value))} />
            </div>
            <div>
              <Label>Days per Month</Label>
              <Input type="number" min={1} value={daysPerMonth} onChange={(e) => setDaysPerMonth(Number(e.target.value))} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={saveProfile} disabled={saving} variant="glass">{saving ? "Saving..." : "Save Profile"}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
  <Card className="hover:translate-y-[-1px] transition-transform">
        <CardHeader>
          <CardTitle>Overtime Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Enabled</Label>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={otEnabled} onChange={(e) => setOtEnabled(e.target.checked)} />
              <span>Use overtime for daily threshold</span>
            </div>
          </div>
          <div>
            <Label>Daily Threshold (hours)</Label>
            <Input type="number" min={0} value={otThreshold} onChange={(e) => setOtThreshold(Number(e.target.value))} />
          </div>
          <div>
            <Label>Multiplier</Label>
            <Input type="number" min={1} step={0.1} value={otMultiplier} onChange={(e) => setOtMultiplier(Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
  <Card className="hover:translate-y-[-1px] transition-transform">
        <CardHeader>
          <CardTitle>Salary Increments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Current Salary</Label>
              <Input type="number" min={0} step={0.01} value={currentSalary} onChange={(e) => setCurrentSalary(Number(e.target.value))} />
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
            <div className="flex items-end">
              <Button variant="glass" onClick={async () => {
                if (currentSalary <= 0) return
                // use today's date as effectiveFrom for quick set
                const today = new Date().toISOString().slice(0, 10)
                try {
                  const res = await fetchWithCsrf('/api/profile/increment', { method: 'POST', body: JSON.stringify({ salaryType: currentSalaryType, amount: currentSalary, effectiveFrom: today, working: { hoursPerDay, daysPerMonth }, note: 'Set via Current Salary' }) })
                  if (res.ok) {
                    const prof = await (await fetchWithCsrf('/api/profile', { method: 'GET' })).json()
                    setProfile(prof)
                    toast({ title: 'Current salary recorded', description: 'Added to salary history.' })
                  } else {
                    toast({ title: 'Save failed', description: 'Could not set current salary.', variant: 'destructive' })
                  }
                } catch {
                  toast({ title: 'Save failed', description: 'Network error.', variant: 'destructive' })
                }
              }}>Set Current Salary</Button>
            </div>
            <div>
              <Label>Hours/day</Label>
              <Input type="number" min={1} value={hoursPerDay} onChange={(e) => setHoursPerDay(Number(e.target.value))} />
            </div>
            <div className="flex items-end">
              <div className="w-full">
                <Button onClick={computeHourly} className="w-full" variant="glass">Estimate hourly rate</Button>
              </div>
            </div>
          </div>
          {estimatedHourly != null && (
            <div className="mt-3 flex items-center gap-4">
              <div className="text-sm">Estimated hourly rate: <span className="font-semibold">${estimatedHourly}</span></div>
              <Button size="sm" onClick={applyEstimatedHourly} disabled={saving} variant="glass">{saving ? 'Saving...' : 'Apply as default hourly rate'}</Button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={salaryType} onValueChange={(v) => setSalaryType(v as SalaryType)}>
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
              <Label>Amount</Label>
              <Input type="number" min={0} step={0.01} value={salaryAmount} onChange={(e) => setSalaryAmount(Number(e.target.value))} />
            </div>
            <div>
              <Label>Effective From</Label>
              <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={addIncrement} variant="glass">Add Increment</Button>
            </div>
          </div>
          <div>
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
          </div>

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Salary History</h3>
            <div className="space-y-2">
              {profile?.salaryHistory?.length ? (
                profile.salaryHistory
                  .slice()
                  .sort((a: SalaryRecord, b: SalaryRecord) => a.effectiveFrom.localeCompare(b.effectiveFrom))
                  .map((rec: SalaryRecord, idx: number) => (
                    <div key={idx} className="border rounded p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{rec.salaryType.toUpperCase()} ${rec.amount.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">Effective {rec.effectiveFrom} — {rec.working.hoursPerDay}h/day × {rec.working.daysPerMonth}d/mo</div>
                        {rec.note && <div className="text-sm">{rec.note}</div>}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-muted-foreground">No salary records yet.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Integrations */}
      <motion.div variants={fadeInUp} id="integrations">
        <Card className="hover:translate-y-[-1px] transition-transform">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔗 Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {/* Google Calendar Integration */}
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <span className="text-2xl">📅</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Google Calendar</h3>
                    <p className="text-sm text-muted-foreground">
                      Import meetings as time entries
                    </p>
                  </div>
                </div>
                <Link href="/api/integrations/google/auth">
                  <Button variant="glass" className="gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Connect
                  </Button>
                </Link>
              </div>

              {/* Coming Soon: GitHub */}
              <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <span className="text-2xl">💻</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">GitHub</h3>
                    <p className="text-sm text-muted-foreground">
                      Import commits as work log
                    </p>
                  </div>
                </div>
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>

              {/* Coming Soon: Jira */}
              <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <span className="text-2xl">📋</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Jira</h3>
                    <p className="text-sm text-muted-foreground">
                      Import issue work logs
                    </p>
                  </div>
                </div>
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>
            </div>

            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> Connect Google Calendar to automatically import your meetings as billable time entries. Configure import rules in settings after connecting.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notification Settings */}
      <motion.div variants={fadeInUp} id="notifications">
        <NotificationSettingsManager />
      </motion.div>
    </motion.div>
  )
}
