"use client"
import { useEffect, useState } from "react"
import { MotionProvider, Motion, LazyAnimatePresence, fadeInUp, staggerContainer } from "@/components/motion"
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
import MaskedValue from "@/components/ui/masked-value"

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
  // PIN management
  const [currentPinInput, setCurrentPinInput] = useState<string>("")
  const [newPinInput, setNewPinInput] = useState<string>("")

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
        // Refresh profile so masked/default values are consistent in the UI
        try {
          const profRes = await fetchWithCsrf('/api/profile', { method: 'GET' })
          if (profRes.ok) {
            const prof = await profRes.json()
            setProfile(prof)
          }
        } catch (e) {
          // ignore refresh errors
        }
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
    <MotionProvider>
    <Motion>
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">Profile</h1>

      <div>
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
    </div>

    <div>
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
    </div>

    <div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div>
              <Label>Default hourly rate</Label>
              <div className="pt-2">
                {typeof profile?.defaultHourlyRate === 'number' ? (
                  <MaskedValue value={profile!.defaultHourlyRate!} format={(v) => `$${Number(v).toFixed(2)}`} />
                ) : (
                  <div className="text-muted-foreground">Not set</div>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-muted-foreground">You can estimate an hourly rate above and apply it as your default hourly rate. Values are masked until you reveal them with your PIN.</div>
            </div>
          </div>
          {estimatedHourly != null && (
            <div className="mt-3 flex items-center gap-4">
              <div className="text-sm">Estimated hourly rate: <span className="font-semibold"><MaskedValue value={estimatedHourly} format={(v) => `$${Number(v).toFixed(2)}`} /></span></div>
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
                        <div className="font-medium">{rec.salaryType.toUpperCase()} <MaskedValue value={rec.amount} format={(v) => `$${Number(v).toFixed(2)}`} /></div>
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
  </div>

  <div>
  <Card className="hover:translate-y-[-1px] transition-transform">
        <CardHeader>
          <CardTitle>PIN (privacy)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Current PIN (if changing)</Label>
              <Input type="password" value={currentPinInput} onChange={(e) => setCurrentPinInput(e.target.value)} placeholder="Enter current PIN" />
            </div>
            <div>
              <Label>New PIN</Label>
              <Input type="password" value={newPinInput} onChange={(e) => setNewPinInput(e.target.value)} placeholder="New PIN (min 4 digits)" />
            </div>
              <div className="flex items-end gap-2">
              <Button onClick={async () => {
                if (!newPinInput || newPinInput.length < 4) {
                  toast({ title: 'PIN error', description: 'New PIN must be at least 4 digits', variant: 'destructive' })
                  return
                }
                try {
                  const res = await fetchWithCsrf('/api/profile/pin', { method: 'POST', body: JSON.stringify({ currentPin: currentPinInput || undefined, newPin: newPinInput }) })
                  if (res.ok) {
                    setCurrentPinInput('')
                    // attempt to auto-verify new PIN so user can immediately reveal values
                    try {
                      const verifyRes = await fetch('/api/auth/pin/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ pin: newPinInput }),
                      })
                      if (verifyRes.ok) {
                        // refresh profile to show revealed values
                        try {
                          const profRes = await fetchWithCsrf('/api/profile', { method: 'GET' })
                          if (profRes.ok) {
                            const prof = await profRes.json()
                            setProfile(prof)
                          }
                        } catch (e) {}
                        setNewPinInput('')
                        toast({ title: 'PIN set', description: 'Your PIN has been set and revealed.' })
                      } else {
                        setNewPinInput('')
                        toast({ title: 'PIN set', description: 'Your PIN has been updated. Reveal it using the Reveal button.' })
                      }
                    } catch (e) {
                      setNewPinInput('')
                      toast({ title: 'PIN set', description: 'Your PIN has been updated.' })
                    }
                  } else {
                    const err = await res.json().catch(() => ({}))
                    toast({ title: 'Failed', description: err.error || err.message || 'Could not set PIN', variant: 'destructive' })
                  }
                } catch (e) {
                  toast({ title: 'Failed', description: 'Network error', variant: 'destructive' })
                }
              }} variant="glass">Set / Change PIN</Button>
              <Button onClick={async () => {
                // remove PIN
                try {
                  const res = await fetchWithCsrf('/api/profile/pin', { method: 'DELETE' })
                  if (res.ok) {
                    toast({ title: 'PIN removed', description: 'PIN disabled for your account.' })
                  } else {
                    const err = await res.json().catch(() => ({}))
                    toast({ title: 'Failed', description: err.error || 'Could not remove PIN', variant: 'destructive' })
                  }
                } catch {
                  toast({ title: 'Failed', description: 'Network error', variant: 'destructive' })
                }
              }} variant="destructive">Remove PIN</Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">Setting a PIN lets you reveal masked salary and hourly rate values for a short time. Keep it secret and don’t share it.</div>
        </CardContent>
      </Card>
  </div>

      {/* Integrations - Placeholder for future integrations */}
  <div id="integrations">
        <Card className="hover:translate-y-[-1px] transition-transform">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔗 Integrations
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Connect external services to automatically import time entries
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-8 text-center border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">
                No integrations available at the moment.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later for calendar sync and other integrations.
              </p>
            </div>
          </CardContent>
        </Card>
  </div>

      {/* Notification Settings */}
      <div id="notifications">
        <NotificationSettingsManager />
      </div>
    </div>
    </Motion>
    </MotionProvider>
  )
}
