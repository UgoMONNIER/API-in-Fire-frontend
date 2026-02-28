const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Erreur API")
  }

  return response.json()
}

export const api = {
  // Health
  health: () =>
    fetchAPI<{ status: string; version: string }>("/api/health"),

  // Geocoding
  geocoding: (q: string) =>
    fetchAPI<{ nom: string; latitude: number; longitude: number }>(
      `/api/geocoding?q=${encodeURIComponent(q)}`
    ),

  // Routing
  route: (body: { depart: string; arrivee: string; eviter_suez?: boolean }) =>
    fetchAPI<import("./types").Route>("/api/route", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Emissions
  emissions: (body: { depart: string; arrivee: string; cargo_tonnes?: number; eviter_suez?: boolean }) =>
    fetchAPI<import("./types").Emission>("/api/emissions", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Vessel
  vessel: (imo: string) =>
    fetchAPI<import("./types").Vessel>(`/api/vessel/${imo}`),
}