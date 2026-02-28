"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { Route, Emission } from "@/lib/types"
import { formatDistance, formatDuration, formatCO2 } from "@/lib/utils"

export default function Compare() {
  const [depart, setDepart]       = useState("Shanghai")
  const [arrivee, setArrivee]     = useState("Rotterdam")
  const [cargo, setCargo]         = useState(100)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [routeA, setRouteA]       = useState<Route | null>(null)
  const [routeB, setRouteB]       = useState<Route | null>(null)
  const [emissionA, setEmissionA] = useState<Emission | null>(null)
  const [emissionB, setEmissionB] = useState<Emission | null>(null)

  async function compare() {
    setLoading(true)
    setError(null)
    try {
      const [rA, rB, eA, eB] = await Promise.all([
        api.route({ depart, arrivee, eviter_suez: false }),
        api.route({ depart, arrivee, eviter_suez: true }),
        api.emissions({ depart, arrivee, cargo_tonnes: cargo, eviter_suez: false }),
        api.emissions({ depart, arrivee, cargo_tonnes: cargo, eviter_suez: true }),
      ])
      setRouteA(rA)
      setRouteB(rB)
      setEmissionA(eA)
      setEmissionB(eB)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deltaKm  = routeA && routeB ? routeB.distance_km - routeA.distance_km : 0
  const deltaCO2 = emissionA && emissionB ? emissionB.co2e_kg - emissionA.co2e_kg : 0
  const deltaH   = routeA && routeB ? routeB.duree_heures - routeA.duree_heures : 0

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">
          <a href="/" className="text-slate-500 hover:text-slate-300 text-sm mb-4 inline-block">← Retour</a>
          <h1 className="text-3xl font-bold text-white">⚖️ Comparaison de Routes</h1>
          <p className="text-slate-400 mt-1">Via Suez vs Cap de Bonne Espérance</p>
        </div>

        {/* FORM */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-slate-400 text-xs font-mono uppercase tracking-wider block mb-2">Départ</label>
              <input
                value={depart}
                onChange={e => setDepart(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-mono uppercase tracking-wider block mb-2">Arrivée</label>
              <input
                value={arrivee}
                onChange={e => setArrivee(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-mono uppercase tracking-wider block mb-2">Cargo (t)</label>
              <input
                type="number"
                value={cargo}
                onChange={e => setCargo(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={compare}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-all"
              >
                {loading ? "Calcul..." : "⚖️ Comparer"}
              </button>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-400 rounded-xl p-4 mb-6 font-mono text-sm">
            ❌ {error}
          </div>
        )}

        {/* RESULTS */}
        {routeA && routeB && emissionA && emissionB && (
          <>
            {/* DELTA BANNER */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
              <h2 className="text-white font-semibold mb-4 text-center">
                📊 {depart} → {arrivee}
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-slate-400 text-xs font-mono uppercase mb-1">Distance supplémentaire</div>
                  <div className={`text-2xl font-bold ${deltaKm > 0 ? "text-red-400" : "text-green-400"}`}>
                    {deltaKm > 0 ? "+" : ""}{deltaKm.toFixed(0)} km
                  </div>
                  <div className="text-slate-500 text-xs">via Cap vs via Suez</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs font-mono uppercase mb-1">CO₂ supplémentaire</div>
                  <div className={`text-2xl font-bold ${deltaCO2 > 0 ? "text-red-400" : "text-green-400"}`}>
                    {deltaCO2 > 0 ? "+" : ""}{(deltaCO2 / 1000).toFixed(1)} t
                  </div>
                  <div className="text-slate-500 text-xs">CO₂e supplémentaire</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs font-mono uppercase mb-1">Temps supplémentaire</div>
                  <div className={`text-2xl font-bold ${deltaH > 0 ? "text-red-400" : "text-green-400"}`}>
                    {deltaH > 0 ? "+" : ""}{(deltaH / 24).toFixed(1)} jours
                  </div>
                  <div className="text-slate-500 text-xs">via Cap vs via Suez</div>
                </div>
              </div>
            </div>

            {/* SIDE BY SIDE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "🔵 Route Via Suez", route: routeA, emission: emissionA, color: "blue" },
                { label: "🟠 Route Via Cap", route: routeB, emission: emissionB, color: "orange" },
              ].map(({ label, route, emission, color }) => (
                <div key={label} className={`bg-slate-800/50 border border-slate-700 rounded-xl p-5`}>
                  <h3 className="text-white font-semibold mb-4">{label}</h3>
                  <div className="space-y-3 font-mono text-sm">
                    {[
                      { k: "Distance", v: `${route.distance_km.toFixed(0)} km` },
                      { k: "Distance (nm)", v: `${route.distance_nm.toFixed(0)} nm` },
                      { k: "Durée", v: formatDuration(route.duree_heures) },
                      { k: "CO₂e", v: formatCO2(emission.co2e_kg) },
                      { k: "Intensité", v: `${emission.intensite.toFixed(4)} kg/t·km` },
                    ].map(({ k, v }) => (
                      <div key={k} className="flex justify-between border-b border-slate-700 pb-2">
                        <span className="text-slate-400">{k}</span>
                        <span className="text-white">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}