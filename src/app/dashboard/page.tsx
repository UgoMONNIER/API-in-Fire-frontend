"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { Route, Emission } from "@/lib/types"
import { formatDistance, formatDuration, formatCO2 } from "@/lib/utils"

export default function Dashboard() {
  const [depart, setDepart]   = useState("Shanghai")
  const [arrivee, setArrivee] = useState("Rotterdam")
  const [cargo, setCargo]     = useState(100)
  const [loading, setLoading] = useState(false)
  const [route, setRoute]     = useState<Route | null>(null)
  const [emission, setEmission] = useState<Emission | null>(null)
  const [error, setError]     = useState<string | null>(null)

  async function calculate() {
    setLoading(true)
    setError(null)
    try {
      const [r, e] = await Promise.all([
        api.route({ depart, arrivee }),
        api.emissions({ depart, arrivee, cargo_tonnes: cargo }),
      ])
      setRoute(r)
      setEmission(e)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">
          <a href="/" className="text-slate-500 hover:text-slate-300 text-sm mb-4 inline-block">
            ← Retour
          </a>
          <h1 className="text-3xl font-bold text-white">🗺️ Maritime Dashboard</h1>
          <p className="text-slate-400 mt-1">Calcul de routes maritimes et émissions CO₂</p>
        </div>

        {/* FORM */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-slate-400 text-xs font-mono uppercase tracking-wider block mb-2">
                Port de départ
              </label>
              <input
                value={depart}
                onChange={e => setDepart(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="Shanghai"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-mono uppercase tracking-wider block mb-2">
                Port d'arrivée
              </label>
              <input
                value={arrivee}
                onChange={e => setArrivee(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="Rotterdam"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-mono uppercase tracking-wider block mb-2">
                Cargo (tonnes)
              </label>
              <input
                type="number"
                value={cargo}
                onChange={e => setCargo(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={calculate}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-all"
              >
                {loading ? "Calcul..." : "🚀 Calculer"}
              </button>
            </div>
          </div>

          {/* Routes rapides */}
          <div className="mt-4 flex gap-2 flex-wrap">
            <span className="text-slate-500 text-xs font-mono self-center">Routes rapides :</span>
            {[
              ["Shanghai", "Rotterdam"],
              ["Tokyo", "Los Angeles"],
              ["Dubai", "New York"],
              ["Marseille", "Singapore"],
            ].map(([d, a]) => (
              <button
                key={d + a}
                onClick={() => { setDepart(d); setArrivee(a) }}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded-full transition-all"
              >
                {d} → {a}
              </button>
            ))}
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-400 rounded-xl p-4 mb-6 font-mono text-sm">
            ❌ {error}
          </div>
        )}

        {/* RESULTS */}
        {route && emission && (
          <>
            {/* METRICS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Distance",  value: `${route.distance_km.toFixed(0)} km`,        sub: `${route.distance_nm.toFixed(0)} nm` },
                { label: "Durée",     value: formatDuration(route.duree_heures),           sub: `${route.duree_jours.toFixed(1)} jours` },
                { label: "CO₂",       value: formatCO2(emission.co2e_kg),                 sub: emission.methode },
                { label: "Cargo",     value: `${emission.cargo_tonnes} t`,                sub: `Intensité: ${emission.intensite.toFixed(4)}` },
              ].map(m => (
                <div key={m.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <div className="text-slate-400 text-xs font-mono uppercase tracking-wider mb-1">{m.label}</div>
                  <div className="text-white font-bold text-xl">{m.value}</div>
                  <div className="text-slate-500 text-xs mt-1">{m.sub}</div>
                </div>
              ))}
            </div>

            {/* ROUTE DETAILS */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
              <h2 className="text-white font-semibold mb-4">📍 Détails de la route</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-mono text-sm">
                <div>
                  <span className="text-slate-400">Départ</span>
                  <div className="text-white">{route.depart.nom}</div>
                  <div className="text-slate-500 text-xs">{route.depart.latitude.toFixed(4)}, {route.depart.longitude.toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Arrivée</span>
                  <div className="text-white">{route.arrivee.nom}</div>
                  <div className="text-slate-500 text-xs">{route.arrivee.latitude.toFixed(4)}, {route.arrivee.longitude.toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Via Suez</span>
                  <div className={route.eviter_suez ? "text-red-400" : "text-green-400"}>
                    {route.eviter_suez ? "❌ Évité" : "✅ Via Suez"}
                  </div>
                </div>
              </div>
            </div>

            {/* EXPORT */}
            <button
              onClick={() => {
                const csv = `Port départ,Port arrivée,Distance (km),Distance (nm),Durée (h),CO₂e (kg),Cargo (t),Méthode\n${route.depart.nom},${route.arrivee.nom},${route.distance_km.toFixed(2)},${route.distance_nm.toFixed(2)},${route.duree_heures.toFixed(2)},${emission.co2e_kg.toFixed(2)},${emission.cargo_tonnes},${emission.methode}`
                const blob = new Blob([csv], { type: "text/csv" })
                const url  = URL.createObjectURL(blob)
                const a    = document.createElement("a")
                a.href     = url
                a.download = `route_${route.depart.nom}_${route.arrivee.nom}.csv`
                a.click()
              }}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-3 rounded-xl transition-all"
            >
              📥 Exporter en CSV
            </button>
          </>
        )}
      </div>
    </main>
  )
}