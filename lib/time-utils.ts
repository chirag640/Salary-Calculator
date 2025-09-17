import type { TimeCalculation } from "./types"

export function calculateTimeWorked(
  timeIn: string,
  timeOut: string,
  breakMinutes = 0,
  hourlyRate: number,
): TimeCalculation {
  // Parse time strings (HH:mm format)
  const [inHours, inMinutes] = timeIn.split(":").map(Number)
  const [outHours, outMinutes] = timeOut.split(":").map(Number)

  // Convert to minutes since midnight
  const startMinutes = inHours * 60 + inMinutes
  const endMinutes = outHours * 60 + outMinutes

  // Calculate total minutes worked (handle overnight shifts)
  let totalMinutes = endMinutes - startMinutes
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60 // Add 24 hours for overnight shifts
  }

  // Subtract break time
  totalMinutes -= breakMinutes

  // Convert to hours
  const totalHours = Math.max(0, totalMinutes / 60)

  // Calculate earnings
  const totalEarnings = totalHours * hourlyRate

  return {
    totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
    totalEarnings: Math.round(totalEarnings * 100) / 100,
  }
}

export function formatTime(hours: number): string {
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  return `${wholeHours}h ${minutes}m`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}
