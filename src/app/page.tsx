import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">

      {/* HERO */}
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-block bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono px-3 py-1 rounded-full mb-6 tracking-widest">
          SEAROUTES DEVELOPER PLATFORM
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
          Maritime APIs<br />
          <span className="text-blue-400">Built for Developers</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10">
          Routing maritime, calcul CO₂ GLEC v3, vessel tracking AIS —
          le tout exposé via une API REST moderne.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-all"
          >
            🗺️ Essayer le Dashboard
          </Link>
          <Link
            href="/game"
            className="bg-transparent border border-green-500/50 hover:border-green-400 text-green-400 font-semibold px-6 py-3 rounded-lg transition-all font-mono"
          >
            ⚡ API Under Fire
          </Link>
        </div>
      </div>

      {/* FEATURES */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              href: "/dashboard",
              icon: "🗺️",
              title: "Routing",
              desc: "Calcul de routes maritimes optimisées avec distance et durée",
              color: "blue",
            },
            {
              href: "/dashboard",
              icon: "🌍",
              title: "CO₂ Emissions",
              desc: "Calcul des émissions selon le framework GLEC v3 / ISO 14083",
              color: "green",
            },
            {
              href: "/compare",
              icon: "⚖️",
              title: "Comparaison",
              desc: "Comparer routes via Suez vs Cap de Bonne Espérance",
              color: "purple",
            },
            {
              href: "/tracker",
              icon: "📡",
              title: "Vessel Tracker",
              desc: "Suivre un navire en temps réel par numéro IMO",
              color: "orange",
            },
          ].map((f) => (
            <Link
              key={f.href + f.title}
              href={f.href}
              className="group bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 rounded-xl p-5 transition-all hover:bg-slate-800"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-white font-semibold mb-1">{f.title}</h3>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* API ENDPOINTS */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4 text-lg">
            🔌 API Endpoints
          </h2>
          <div className="space-y-2 font-mono text-sm">
            {[
              { method: "GET",  color: "text-green-400",  endpoint: "/api/geocoding?q=Shanghai" },
              { method: "POST", color: "text-blue-400",   endpoint: "/api/route" },
              { method: "POST", color: "text-blue-400",   endpoint: "/api/emissions" },
              { method: "GET",  color: "text-green-400",  endpoint: "/api/vessel/{imo}" },
              { method: "GET",  color: "text-green-400",  endpoint: "/api/health" },
            ].map((e) => (
              <div key={e.endpoint} className="flex gap-3 items-center">
                <span className={`${e.color} w-12 text-xs font-bold`}>{e.method}</span>
                <span className="text-slate-300">{e.endpoint}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GAME CTA */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <Link href="/game">
          <div className="bg-black border border-green-500/30 hover:border-green-400/60 rounded-xl p-8 text-center cursor-pointer transition-all group">
            <div className="font-mono text-green-400 text-xs tracking-widest mb-3">
              // SERIOUS GAME
            </div>
            <h2 className="text-3xl font-bold text-green-400 font-mono mb-2 group-hover:text-green-300">
              ⚡ API UNDER FIRE
            </h2>
            <p className="text-slate-500 font-mono text-sm">
              Tu es SRE chez Searoutes. 5 tours. Des incidents en prod. Survive.
            </p>
          </div>
        </Link>
      </div>

    </main>
  )
}