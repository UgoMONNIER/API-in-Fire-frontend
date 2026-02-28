export interface Port {
  nom: string
  latitude: number
  longitude: number
}

export interface Route {
  depart: Port
  arrivee: Port
  distance_km: number
  distance_nm: number
  duree_heures: number
  duree_jours: number
  geojson: {
    type: string
    coordinates: number[][]
  }
  eviter_suez: boolean
}

export interface Emission {
  depart: string
  arrivee: string
  distance_km: number
  cargo_tonnes: number
  co2e_kg: number
  co2e_tonnes: number
  intensite: number
  methode: string
}

export interface Vessel {
  imo: string
  nom: string
  pavillon: string
  vitesse: number
  cap: number
  latitude: number
  longitude: number
  statut: string
}

export interface RouteRequest {
  depart: string
  arrivee: string
  eviter_suez?: boolean
  eviter_hra?: boolean
}

export interface EmissionRequest {
  depart: string
  arrivee: string
  cargo_tonnes?: number
  eviter_suez?: boolean
}