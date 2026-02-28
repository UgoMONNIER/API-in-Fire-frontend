"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { Vessel } from "@/lib/types"

const VESSELS_EXAMPLES = [
  { imo: "9811000", nom: "Ever Given" },
  { imo: "9454448", nom: "CMA CGM Marco Polo" },
  { imo: "9703291", nom: "MSC Oscar" },
  { imo: "9164263", nom: "Maersk Alabama" },
]

export default function Tracker() {
  const [imo, setImo]       = useState("")
  const [loading, setLoading] = useState(false)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [error, setError]   = useState<string | null>(null)

  async function track(imoToSearch?: string) {
    const target = imoToSearch || imo
    if (!target) return
    setLoading(true)
    setError(null)
    try {
      const v = await api.vessel(target)
      setVessel(v)
      setImo(target)
    } catch (err: any) {
      setError(err.message)
      setVessel(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">
          <a href="/" className="text-slate-500 hover:text-slate-300 text-sm mb-4 inline-block">← Retour</a>
          <h1 className="text-3xl font-bold text-white">📡 Vessel Tracker</h1>
          <p className="text-slate-400 mt-1">Suivre un navire par numéro IMO</p>
        </div>

        {/* FORM */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex gap-3">
            <input
              value={imo}
              onChange={e => setImo(e.target.value)}
              placeholder="Numéro IMO (ex: 9811000)"
              className="flex-1 bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-mono"
            />
            <button
              onClick={() => track()}
              disabled={loading || !imo}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition-all"
            >
              {loading ? "..." : "🔍 Track"}
            </button>
          </div>

          {/* Exemples */}
          <div className="mt-4 flex gap-2 flex-wrap">
            <span className="text-slate-500 text-xs font-mono self-center">Exemples :</span>
            {VESSELS_EXAMPLES.map(v => (
              <button
                key={v.imo}
                onClick={() => track(v.imo)}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded-full transition-all"
              >
                {v.nom}
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

        {/* VESSEL RESULT */}
        {vessel && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{vessel.nom}</h2>
                <div className="text-slate-400 font-mono text-sm mt-1">IMO {vessel.imo}</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-mono px-3 py-1 rounded-full">
                ● {vessel.statut}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-mono text-sm">
              {[
                { label: "🚩 Pavillon",   value: vessel.pavillon },
                { label: "⚡ Vitesse",    value: `${vessel.vitesse.toFixed(1)} kn` },
                { label: "🧭 Cap",        value: `${vessel.cap}°` },
                { label: "📍 Latitude",   value: vessel.latitude.toFixed(4) },
                { label: "📍 Longitude",  value: vessel.longitude.toFixed(4) },
                { label: "📊 Statut",     value: vessel.statut },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-slate-500 text-xs mb-1">{label}</div>
                  <div className="text-white font-semibold">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-slate-900/50 rounded-lg p-3 font-mono text-xs text-slate-500">
              ℹ️ Données simulées — intégration AIS réelle disponible via Searoutes Vessel API
            </div>
          </div>
        )}
      </div>
    </main>
  )
}