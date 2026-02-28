export function formatDistance(km: number): string {
  return `${km.toFixed(0)} km (${(km / 1.852).toFixed(0)} nm)`
}

export function formatDuration(hours: number): string {
  const days = Math.floor(hours / 24)
  const remainingHours = Math.round(hours % 24)
  return `${days}j ${remainingHours}h`
}

export function formatCO2(kg: number): string {
  if (kg > 1000) return `${(kg / 1000).toFixed(2)} t CO₂e`
  return `${kg.toFixed(1)} kg CO₂e`
}

export function formatBudget(val: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val)
}