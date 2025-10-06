"use client"
import { useEffect, useState } from "react"
import { motion, fadeInUp, staggerContainer } from "@/components/motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ProfileResponse, SalaryRecord, SalaryType } from "@/lib/types"

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [csrfToken, setCsrfToken] = useState<string | null>(null)

  // CSRF helpers
  function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie.split(/; */).find(c => c.startsWith(name + '='))
    return match ? decodeURIComponent(match.split('=')[1]) : null
  }
  const ensureCsrfToken = async (): Promise<string | null> => {
    const existing = readCookie('csrf-token')
    if (existing) { setCsrfToken(existing); return existing }
    try {
      const res = await fetch('/api/csrf', { method: 'GET', cache: 'no-store', credentials: 'same-origin' })
      if (res.ok) {
        const data = await res.json()
        setCsrfToken(data.csrfToken)
        return data.csrfToken
      }
    } catch {}
    return null
  }
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
        const res = await fetch('/api/profile', { credentials: 'same-origin' })
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
      const token = csrfToken || await ensureCsrfToken()
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-csrf-token': token } : {}) },
        credentials: 'same-origin',
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
    } finally {
      setSaving(false)
    }
  }

  const addIncrement = async () => {
    if (!effectiveFrom || salaryAmount <= 0) return
    const token = csrfToken || await ensureCsrfToken()
    const res = await fetch('/api/profile/increment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-csrf-token': token } : {}) },
      credentials: 'same-origin',
      body: JSON.stringify({ salaryType, amount: salaryAmount, effectiveFrom, working: { hoursPerDay, daysPerMonth }, note }),
    })
    if (res.ok) {
      const prof = await (await fetch('/api/profile', { credentials: 'same-origin' })).json()
      setProfile(prof)
      setSalaryAmount(0)
      setEffectiveFrom('')
      setNote('')
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
      const token = csrfToken || await ensureCsrfToken()
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-csrf-token': token } : {}) },
        credentials: 'same-origin',
        body: JSON.stringify({ defaultHourlyRate: estimatedHourly }),
      })
    } finally {
      setSaving(false)
    }
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
                const token = csrfToken || await ensureCsrfToken()
                const res = await fetch('/api/profile/increment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...(token ? { 'x-csrf-token': token } : {}) },
                  credentials: 'same-origin',
                  body: JSON.stringify({ salaryType: currentSalaryType, amount: currentSalary, effectiveFrom: today, working: { hoursPerDay, daysPerMonth }, note: 'Set via Current Salary' }),
                })
                if (res.ok) {
                  const prof = await (await fetch('/api/profile', { credentials: 'same-origin' })).json()
                  setProfile(prof)
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
    </motion.div>
  )
}
