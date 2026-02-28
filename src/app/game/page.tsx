"use client"

import { useState, useRef, useEffect } from "react"

// =====================================================
// GAME DATA
// =====================================================

const MAX_TOURS = 5
const BUDGET_INIT = 50000
const SLA_INIT = 100.0
const SAT_INIT = 100
const DEBT_INIT = 0

const INCIDENTS_POOL = [
  {
    id: "ais_down",
    nom: "🛰️ AIS Feed Down",
    endpoint: "/vessel/track",
    description: "Le flux AIS tiers est coupé. Les clients reçoivent 503 sur tout vessel tracking.",
    sla_impact: -2.0,
    sat_impact: -15,
    zone: "VESSEL",
  },
  {
    id: "cache_expired",
    nom: "🗄️ Cache Expiré",
    endpoint: "/route/calculate",
    description: "TTL Redis mal configuré. Chaque requête frappe la DB. Latence x10.",
    sla_impact: -0.5,
    sat_impact: -10,
    zone: "ROUTING",
  },
  {
    id: "bad_coords",
    nom: "📍 Coordonnées Corrompues",
    endpoint: "/geocoding/port",
    description: "Bug de parsing lat/lon — retourne des points en plein désert du Sahara.",
    sla_impact: -0.2,
    sat_impact: -20,
    zone: "GEOCODING",
  },
  {
    id: "rate_limit_cascade",
    nom: "🔥 429 en Cascade",
    endpoint: "/* (tous endpoints)",
    description: "Un client en boucle infinie sature le rate limiter. Tout le monde est bloqué.",
    sla_impact: -1.5,
    sat_impact: -25,
    zone: "GATEWAY",
  },
  {
    id: "db_overload",
    nom: "💾 DB Overload",
    endpoint: "/emissions/calculate",
    description: "Index manquant sur la table emissions. Queries à 45s. Timeouts en cascade.",
    sla_impact: -3.0,
    sat_impact: -12,
    zone: "EMISSIONS",
  },
  {
    id: "memory_leak",
    nom: "🧠 Memory Leak",
    endpoint: "/route/optimize",
    description: "Fuite mémoire dans le moteur de routing. Les pods crashent toutes les 20min.",
    sla_impact: -5.0,
    sat_impact: -18,
    zone: "ROUTING",
  },
  {
    id: "ddos",
    nom: "🌊 DDoS Attack",
    endpoint: "/* (API Gateway)",
    description: "15k req/s depuis des IPs roumaines. Infra à genoux. Tout le monde voit 502.",
    sla_impact: -8.0,
    sat_impact: -30,
    zone: "GATEWAY",
  },
  {
    id: "cold_start",
    nom: "⚡ Cold Start Storm",
    endpoint: "/route/calculate",
    description: "Traffic spike matinal. Lambdas en cold start. P99 latence à 12s.",
    sla_impact: -0.3,
    sat_impact: -8,
    zone: "ROUTING",
  },
  {
    id: "ssl_expiry",
    nom: "🔒 Cert SSL Expiré",
    endpoint: "/* (HTTPS)",
    description: "Le certificat est expiré à 03h47. Chrome bloque tous les clients.",
    sla_impact: -4.0,
    sat_impact: -22,
    zone: "INFRA",
  },
  {
    id: "api_version_break",
    nom: "💥 Breaking Change",
    endpoint: "/v2/vessel",
    description: "Déploiement v2 sans backward compat. Clients v1 reçoivent des 400.",
    sla_impact: -1.0,
    sat_impact: -28,
    zone: "VESSEL",
  },
]

const RESPONSES = [
  {
    id: "hotfix",
    label: "🚀 Hotfix",
    description: "Patch rapide en prod. Efficace maintenant, fragile demain.",
    cost: 2000,
    sla_recover: 0.8,
    sat_recover: 0.7,
    debt_add: 10,
    time: "8 min",
  },
  {
    id: "proper_fix",
    label: "🏗️ Fix Propre",
    description: "Solution permanente. Code review + tests. Long mais solide.",
    cost: 8000,
    sla_recover: 1.0,
    sat_recover: 1.0,
    debt_add: 0,
    time: "45 min",
  },
  {
    id: "rollback",
    label: "🔄 Rollback",
    description: "Revenir à la version stable. Perd les features récentes.",
    cost: 1000,
    sla_recover: 0.9,
    sat_recover: 0.6,
    debt_add: 5,
    time: "12 min",
  },
  {
    id: "ignore",
    label: "⏳ Ignorer",
    description: "On verra ça plus tard. Gratuit maintenant, douloureux bientôt.",
    cost: 0,
    sla_recover: 0,
    sat_recover: 0,
    debt_add: 15,
    time: "—",
  },
]

const EVENTS_DEF = [
  {
    id: "client_churn",
    condition: "sat_low",
    threshold: 60,
    nom: "📉 Churn Client",
    message: "MegaCorp annule son contrat. Satisfaction trop basse.",
    budget_delta: -5000,
    sat_delta: -10,
  },
  {
    id: "postmortem_reward",
    condition: "debt_low",
    threshold: 20,
    nom: "🏆 Postmortem exemplaire",
    message: "RCA publié en 24h. Nouveau client conquis par ta transparence.",
    budget_delta: 3000,
    sat_delta: 8,
  },
  {
    id: "debt_crisis",
    condition: "debt_high",
    threshold: 50,
    nom: "💣 Dette Technique Critique",
    message: "Accumulation de hotfixes. Un incident mineur déclenche une cascade.",
    budget_delta: -4000,
    sat_delta: -15,
    extra_sla: -1.5,
  },
  {
    id: "on_call_burnout",
    condition: "incidents_many",
    threshold: 3,
    nom: "😵 On-Call Burnout",
    message: "Ton équipe est épuisée. Temps de résolution x2 pour le prochain tour.",
    budget_delta: -2000,
    sat_delta: -5,
  },
  {
    id: "sla_bonus",
    condition: "sla_high",
    threshold: 99.5,
    nom: "💎 SLA Excellence",
    message: "99.5%+ uptime ce mois. Bonus contractuel activé.",
    budget_delta: 5000,
    sat_delta: 5,
  },
]

// =====================================================
// TYPES
// =====================================================

interface Incident {
  id: string
  nom: string
  endpoint: string
  description: string
  sla_impact: number
  sat_impact: number
  zone: string
}

interface Response {
  id: string
  label: string
  description: string
  cost: number
  sla_recover: number
  sat_recover: number
  debt_add: number
  time: string
}

interface GameState {
  tour: number
  sla: number
  sat: number
  budget: number
  debt: number
  incidents: Incident[]
  choices: Record<string, string>
  resultats: Array<{ incident: Incident; response: Response; slaImpact: number; satImpact: number }>
  events: typeof EVENTS_DEF
  log: string[]
  gameover: boolean
  victoire: boolean
}

// =====================================================
// HELPERS
// =====================================================

function pickIncidents(tour: number, debt: number): Incident[] {
  const count = debt > 50 ? 3 : tour <= 2 ? 2 : 3
  return [...INCIDENTS_POOL].sort(() => Math.random() - 0.5).slice(0, count)
}

function evaluateEvents(sla: number, sat: number, debt: number, incidentCount: number) {
  return EVENTS_DEF.filter(ev => {
    if (ev.condition === "sat_low"       && sat  < ev.threshold)                        return true
    if (ev.condition === "debt_low"      && debt < ev.threshold && Math.random() < 0.6) return true
    if (ev.condition === "debt_high"     && debt >= ev.threshold)                       return true
    if (ev.condition === "incidents_many"&& incidentCount >= ev.threshold && Math.random() < 0.4) return true
    if (ev.condition === "sla_high"      && sla  >= ev.threshold && Math.random() < 0.7) return true
    return false
  })
}

function getRank(sla: number, sat: number, budget: number) {
  const score = sla * 0.4 + sat * 0.3 + (budget / BUDGET_INIT) * 100 * 0.3
  if (score > 85) return { label: "🏆 SRE LEGEND",       color: "#FFD700" }
  if (score > 70) return { label: "⚡ SENIOR SRE",        color: "#00FF88" }
  if (score > 55) return { label: "🔧 ENGINEER",          color: "#00AAFF" }
  return           { label: "🔥 BURNOUT SURVIVOR",        color: "#FF4444" }
}

// =====================================================
// STYLES
// =====================================================

const TERMINAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

  .game-root * { box-sizing: border-box; }

  .game-root {
    background: #0a1628;
    min-height: 100vh;
    font-family: 'Inter', sans-serif;
    color: #ffffff;
    padding: 24px;
    font-size: 15px;
  }

  .t-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    background: #112240;
    border: 2px solid #1d4ed8;
    border-radius: 12px;
    margin-bottom: 24px;
  }

  .t-header h1 { font-size: 22px; font-weight: 800; color: #ffffff; }
  .t-subtitle { font-size: 13px; color: #ffffff; font-family: 'JetBrains Mono', monospace; margin-top: 4px; opacity: 0.7; }

  .t-live-badge {
    display: flex; align-items: center; gap: 8px;
    background: #7f1d1d; border: 2px solid #ef4444;
    color: #ffffff; font-size: 14px; font-weight: 700;
    padding: 6px 16px; border-radius: 20px;
  }

  .t-live-dot { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

  .t-metrics { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }

  .t-metric {
    background: #112240; border: 2px solid #1d4ed8;
    border-radius: 10px; padding: 16px;
    position: relative; overflow: hidden;
  }

  .t-metric::after {
    content: ''; position: absolute; bottom: 0; left: 0;
    height: 4px; width: var(--fill-width, 100%);
    background: var(--accent, #00b4a0);
  }

  .t-metric-label { font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; opacity: 0.7; }
  .t-metric-value { font-size: 28px; font-weight: 800; color: var(--accent, #ffffff); font-family: 'JetBrains Mono', monospace; line-height: 1; }
  .t-metric-sub { font-size: 13px; color: #ffffff; margin-top: 6px; font-weight: 600; opacity: 0.7; }

  .t-section-title {
    font-size: 13px; font-weight: 700; color: #ffffff;
    text-transform: uppercase; letter-spacing: 2px;
    font-family: 'JetBrains Mono', monospace;
    margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
  }
  .t-section-title::after { content: ''; flex: 1; height: 1px; background: #1d4ed8; }

  .t-incident {
    background: #1a0a0a; border: 2px solid #ef4444;
    border-radius: 10px; padding: 18px; margin-bottom: 14px;
    border-left: 5px solid #ef4444;
  }
  .t-incident.resolved { background: #0a1a16; border-color: #00b4a0; border-left-color: #00b4a0; }

  .t-incident-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 12px; }
  .t-incident-title { font-size: 18px; font-weight: 800; color: #ff6b6b; }
  .t-incident.resolved .t-incident-title { color: #00e5cc; }

  .t-endpoint {
    font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700;
    color: #ffffff; background: #92400e; border: 2px solid #f59e0b;
    padding: 4px 10px; border-radius: 4px; white-space: nowrap;
  }

  .t-desc { font-size: 15px; color: #ffffff; line-height: 1.7; margin-bottom: 14px; font-weight: 500; }

  .t-impacts { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .t-badge { font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px; border: 2px solid; color: #ffffff; }
  .t-badge-sla { background: #7c2d12; border-color: #f97316; }
  .t-badge-sat { background: #831843; border-color: #ec4899; }
  .t-badge-zone { background: #4c1d95; border-color: #8b5cf6; }

  .t-responses { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }

  .t-resp-btn {
    padding: 14px; background: #112240; border: 2px solid #1d4ed8;
    border-radius: 8px; color: #ffffff; font-family: 'Inter', sans-serif;
    font-size: 13px; cursor: pointer; text-align: left; transition: all 0.15s;
  }
  .t-resp-btn:hover { background: #1e3a8a; border-color: #60a5fa; }
  .t-resp-btn.selected { background: #0d3d30; border: 3px solid #00b4a0; color: #ffffff; }
  .t-resp-btn.ignore { background: #1a0a0a; border-color: #ef4444; color: #ffffff; }
  .t-resp-btn.ignore:hover, .t-resp-btn.ignore.selected { background: #450a0a; border-color: #ef4444; }

  .t-resp-name { font-size: 15px; font-weight: 800; margin-bottom: 4px; color: #ffffff; }
  .t-resp-desc { font-size: 13px; color: #ffffff; margin-bottom: 6px; line-height: 1.5; opacity: 0.8; }
  .t-resp-meta { display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
  .t-resp-meta .cost { color: #fcd34d; font-weight: 700; }
  .t-resp-meta .time { color: #93c5fd; font-weight: 600; }
  .t-resp-meta .debt { color: #f97316; font-weight: 700; }

  .t-btn-primary {
    width: 100%; padding: 16px;
    background: linear-gradient(135deg, #00b4a0, #1d4ed8);
    border: none; border-radius: 10px;
    color: #ffffff; font-size: 17px; font-weight: 800;
    cursor: pointer; margin-top: 20px; transition: all 0.2s;
    box-shadow: 0 4px 20px rgba(0,180,160,0.4);
  }
  .t-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,180,160,0.6); }
  .t-btn-primary:disabled { background: #112240; color: #ffffff; opacity: 0.3; cursor: not-allowed; transform: none; box-shadow: none; }

  .t-two-col { display: grid; grid-template-columns: 1fr 300px; gap: 20px; }

  .t-log {
    background: #050d1a; border: 2px solid #1d4ed8;
    border-radius: 8px; padding: 14px;
    max-height: 320px; overflow-y: auto;
    font-family: 'JetBrains Mono', monospace;
  }
  .t-log-line { font-size: 13px; color: #ffffff; padding: 4px 0; border-bottom: 1px solid #112240; opacity: 0.7; }
  .t-log-line span { color: #00e5cc; font-weight: 700; opacity: 1; }

  .t-debt-bar { height: 8px; background: #112240; border-radius: 4px; margin-top: 8px; overflow: hidden; }
  .t-debt-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }

  .t-tour-dots { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; }
  .t-dot { width: 32px; height: 32px; border-radius: 50%; border: 2px solid #1d4ed8; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; transition: all 0.3s; color: #ffffff; }
  .t-dot.done    { background: #0d3d30; border-color: #00b4a0; color: #00e5cc; }
  .t-dot.current { background: #450a0a; border-color: #ef4444; color: #ff6b6b; }
  .t-dot.future  { opacity: 0.3; }

  .t-recap-card { background: #112240; border: 2px solid #1d4ed8; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; }

  .t-event { padding: 12px 16px; border-left: 5px solid; border-radius: 0 8px 8px 0; margin-bottom: 10px; }
  .t-event.bad  { border-color: #ef4444; background: #1a0a0a; color: #ffffff; }
  .t-event.good { border-color: #00b4a0; background: #0a1a16; color: #ffffff; }
  .t-event-name { font-weight: 800; font-size: 16px; margin-bottom: 4px; color: #ffffff; }

  .t-phase-title { font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 16px; font-family: 'JetBrains Mono', monospace; }

  .t-gameover { text-align: center; padding: 60px 20px; max-width: 600px; margin: 0 auto; }
  .t-gameover-title { font-size: 52px; font-weight: 800; letter-spacing: 3px; line-height: 1.1; margin-bottom: 16px; }
  .t-rank { font-size: 22px; font-weight: 800; letter-spacing: 3px; margin: 24px auto; padding: 16px 32px; border: 3px solid; border-radius: 12px; display: inline-block; font-family: 'JetBrains Mono', monospace; }
  .t-final-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin: 24px 0; }

  .t-start { max-width: 720px; margin: 0 auto; padding: 20px 0; }
  .t-start h1 { font-size: 52px; font-weight: 800; color: #ffffff; line-height: 1.1; margin-bottom: 6px; }
  .t-start h1 span { color: #00e5cc; }
  .t-start-tag { font-size: 14px; color: #ffffff; font-family: 'JetBrains Mono', monospace; margin-bottom: 32px; opacity: 0.7; }

  .t-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px; }
  .t-info-block { background: #112240; border: 2px solid #1d4ed8; border-radius: 10px; padding: 18px; }
  .t-info-block h3 { font-size: 13px; font-weight: 800; letter-spacing: 1.5px; color: #ffffff; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #1d4ed8; }
  .t-info-row { display: flex; justify-content: space-between; font-size: 14px; color: #ffffff; padding: 6px 0; border-bottom: 1px solid #0d1f35; }
  .t-info-row span:last-child { font-weight: 700; color: #00e5cc; }

  .t-crit-warning { background: #450a0a; border: 2px solid #ef4444; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; font-size: 15px; font-weight: 700; color: #ffffff; }
  .t-resolved-badge { font-size: 12px; font-weight: 700; color: #ffffff; background: #0d3d30; border: 2px solid #00b4a0; padding: 3px 10px; border-radius: 20px; }
  .t-back { color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 8px; opacity: 0.7; transition: opacity 0.2s; }
  .t-back:hover { opacity: 1; }

  .t-log::-webkit-scrollbar { width: 4px; }
  .t-log::-webkit-scrollbar-track { background: transparent; }
  .t-log::-webkit-scrollbar-thumb { background: #1d4ed8; border-radius: 2px; }
`
// =====================================================
// MAIN COMPONENT
// =====================================================

export default function GamePage() {
  const [phase, setPhase] = useState<"start" | "assign" | "recap" | "gameover">("start")
  const [game, setGame]   = useState<GameState | null>(null)
  const logRef            = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  })

  function initGame(): GameState {
    return {
      tour: 1, sla: SLA_INIT, sat: SAT_INIT,
      budget: BUDGET_INIT, debt: DEBT_INIT,
      incidents: pickIncidents(1, 0),
      choices: {}, resultats: [], events: [], log: [],
      gameover: false, victoire: false,
    }
  }

  function setChoice(incidentId: string, responseId: string) {
    setGame(prev => prev ? ({ ...prev, choices: { ...prev.choices, [incidentId]: responseId } }) : prev)
  }

  function launchTour() {
    if (!game) return
    const g = { ...game }
    let deltaSla = 0, deltaSat = 0, deltaBudget = 0, deltaDebt = 0
    const results: GameState["resultats"] = []

    for (const inc of g.incidents) {
      const choiceId = g.choices[inc.id] || "ignore"
      const resp     = RESPONSES.find(r => r.id === choiceId)!
      const slaImpact = inc.sla_impact * (1 - resp.sla_recover)
      const satImpact = inc.sat_impact * (1 - resp.sat_recover)
      deltaSla    += slaImpact
      deltaSat    += satImpact
      deltaBudget -= resp.cost
      deltaDebt   += resp.debt_add
      results.push({ incident: inc, response: resp, slaImpact, satImpact })
    }

    if (g.debt > 50) { deltaSla *= 1.3; deltaSat *= 1.2 }

    const newSla    = Math.max(0, Math.min(100, g.sla + deltaSla))
    const newSat    = Math.max(0, Math.min(100, g.sat + deltaSat))
    const newBudget = g.budget + deltaBudget
    const newDebt   = Math.min(100, Math.max(0, g.debt + deltaDebt))

    const events    = evaluateEvents(newSla, newSat, newDebt, g.incidents.length)
    let finalSla    = newSla, finalSat = newSat, finalBudget = newBudget

    for (const ev of events) {
      finalBudget += ev.budget_delta
      finalSat     = Math.max(0, Math.min(100, finalSat + ev.sat_delta))
      if ("extra_sla" in ev && ev.extra_sla) finalSla = Math.max(0, finalSla + ev.extra_sla)
    }

    const logLines = [
      `[TOUR ${g.tour}] SLA: ${g.sla.toFixed(2)}% → ${finalSla.toFixed(2)}%`,
      `[TOUR ${g.tour}] SAT: ${g.sat} → ${Math.round(finalSat)}  BUDGET: $${(finalBudget / 1000).toFixed(1)}K`,
    ]

    const gameover = finalSla < 99.0 || finalSat <= 0 || finalBudget < 0 || g.tour >= MAX_TOURS
    const victoire = g.tour >= MAX_TOURS && finalSla >= 99.0 && finalSat > 0 && finalBudget >= 0

    setGame({ ...g, sla: finalSla, sat: Math.round(finalSat), budget: finalBudget, debt: newDebt, resultats: results, events, log: [...g.log, ...logLines], gameover, victoire })
    setPhase("recap")
  }

  function nextTour() {
    if (!game) return
    if (game.gameover) { setPhase("gameover"); return }
    setGame({ ...game, tour: game.tour + 1, incidents: pickIncidents(game.tour + 1, game.debt), choices: {}, resultats: [], events: [] })
    setPhase("assign")
  }

  if (!game && phase !== "start") return null

  const slaColor  = !game ? "#00ff88" : game.sla >= 99.5 ? "#00ff88" : game.sla >= 99.0 ? "#ffaa00" : "#ff4444"
  const satColor  = !game ? "#00ff88" : game.sat >= 70   ? "#00ff88" : game.sat >= 40   ? "#ffaa00" : "#ff4444"
  const debtColor = !game ? "#00ff88" : game.debt < 30   ? "#00ff88" : game.debt < 60   ? "#ffaa00" : "#ff4444"
  const allDone   = game ? game.incidents.every(i => game.choices[i.id]) : false

  return (
    <>
      <style>{TERMINAL_CSS}</style>
      <div className="game-root">

        {/* HEADER */}
        <div className="t-header">
        <div>
            <a href="/" className="t-back">← Dashboard</a>
            <h1>⚓ API Under Fire</h1>
            <div className="t-subtitle">// SEAROUTES SRE SIMULATOR — INCIDENT MANAGEMENT v1.0</div>
        </div>
        <div className="t-live-badge">
            <div className="t-live-dot" />
            PROD LIVE
        </div>
        </div>

        {/* ── START ── */}
        {phase === "start" && (
          <div className="t-start">
            <h1>API<br />UNDER<br />FIRE</h1>
            <div className="t-start-tag">// SEAROUTES — PRODUCTION INCIDENT SIMULATOR</div>

            <div className="t-info-grid">
              <div className="t-info-block">
                <h3>📊 Métriques</h3>
                {[["SLA Initial","100.00%"],["SLA Minimum","99.00%"],["Satisfaction","100/100"],["Budget Infra","$50K"],["Nombre de tours","5"]].map(([k,v]) => (
                  <div key={k} className="t-info-row"><span>{k}</span><span>{v}</span></div>
                ))}
              </div>
              <div className="t-info-block">
                <h3>⚡ Options</h3>
                {[["🚀 Hotfix","$2K · rapide · +debt"],["🏗️ Fix Propre","$8K · permanent"],["🔄 Rollback","$1K · perd features"],["⏳ Ignorer","$0 · +dette ++"]].map(([k,v]) => (
                  <div key={k} className="t-info-row"><span>{k}</span><span>{v}</span></div>
                ))}
              </div>
              <div className="t-info-block">
                <h3>💣 Game Over si</h3>
                {[["SLA < 99%","❌"],["Budget épuisé","❌"],["SAT = 0","❌"],["Dette > 50","⚠️ ×1.3"]].map(([k,v]) => (
                  <div key={k} className="t-info-row"><span>{k}</span><span>{v}</span></div>
                ))}
              </div>
              <div className="t-info-block">
                <h3>🏆 Bonus</h3>
                {[["SLA ≥ 99.5%","💎 Excellence"],["Dette < 20","🏆 RCA Award"],["SAT ≥ 80","👥 Rétention"],["Budget final","📈 Rang"]].map(([k,v]) => (
                  <div key={k} className="t-info-row"><span>{k}</span><span>{v}</span></div>
                ))}
              </div>
            </div>

            <button className="t-btn-primary" onClick={() => { setGame(initGame()); setPhase("assign") }}>
              ▶ DÉMARRER — ACCEPTER LA PROD
            </button>
          </div>
        )}

        {/* ── ASSIGN ── */}
        {phase === "assign" && game && (
          <>
            <div className="t-tour-dots">
              {Array.from({ length: MAX_TOURS }, (_, i) => {
                const t   = i + 1
                const cls = t < game.tour ? "done" : t === game.tour ? "current" : "future"
                return <div key={t} className={`t-dot ${cls}`}>{t < game.tour ? "✓" : t}</div>
              })}
              <span style={{ fontSize: 11, color: "#006633", marginLeft: 8 }}>TOUR {game.tour}/{MAX_TOURS}</span>
            </div>

            <div className="t-metrics">
              {[
                { label: "SLA UPTIME",      value: `${game.sla.toFixed(2)}%`,               sub: "Min: 99.00%",        accent: slaColor,  fill: game.sla },
                { label: "CLIENT SAT",      value: `${game.sat}/100`,                        sub: "Satisfaction",       accent: satColor,  fill: game.sat },
                { label: "BUDGET INFRA",    value: `$${(game.budget/1000).toFixed(1)}K`,     sub: `Dépensé: $${((BUDGET_INIT-game.budget)/1000).toFixed(1)}K`, accent: "#ffaa00", fill: (game.budget/BUDGET_INIT)*100 },
                { label: "DETTE TECH",      value: `${game.debt.toFixed(0)}/100`,            sub: game.debt > 50 ? "⚠️ CRITIQUE" : "✓ OK", accent: debtColor, fill: 100-game.debt },
              ].map(m => (
                <div key={m.label} className="t-metric" style={{ "--accent": m.accent, "--fill": m.fill / 100 } as React.CSSProperties}>
                  <div className="t-metric-label">{m.label}</div>
                  <div className="t-metric-value">{m.value}</div>
                  <div className="t-metric-sub">{m.sub}</div>
                </div>
              ))}
            </div>

            {game.debt > 50 && (
              <div className="t-crit-warning">⚠️ DETTE TECHNIQUE CRITIQUE — Incidents amplifiés de 30% ce tour</div>
            )}

            <div className="t-two-col">
              <div>
                <div className="t-section-title">// {game.incidents.length} INCIDENTS ACTIFS — TOUR {game.tour}</div>
                {game.incidents.map(inc => {
                  const chosen = game.choices[inc.id]
                  return (
                    <div key={inc.id} className={`t-incident ${chosen ? "resolved" : ""}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div className="t-incident-title">{inc.nom}</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <div className="t-endpoint">{inc.endpoint}</div>
                          {chosen && <div className="t-resolved-badge">QUEUED</div>}
                        </div>
                      </div>
                      <div className="t-desc">{inc.description}</div>
                      <div className="t-impacts">
                        <div className="t-badge t-badge-sla">SLA {inc.sla_impact}%</div>
                        <div className="t-badge t-badge-sat">SAT {inc.sat_impact} pts</div>
                        <div className="t-badge t-badge-zone">{inc.zone}</div>
                      </div>
                      <div className="t-responses">
                        {RESPONSES.map(resp => (
                          <button
                            key={resp.id}
                            className={`t-resp-btn ${resp.id === "ignore" ? "ignore" : ""} ${chosen === resp.id ? "selected" : ""}`}
                            onClick={() => setChoice(inc.id, resp.id)}
                          >
                            <div className="t-resp-name">{resp.label}</div>
                            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 3 }}>{resp.description}</div>
                            <div className="t-resp-meta">
                              <span style={{ color: "#ffaa00" }}>${resp.cost.toLocaleString()}</span>
                              <span style={{ color: "#006699" }}>⏱ {resp.time}</span>
                              {resp.debt_add > 0 && <span style={{ color: "#ff6600" }}>+{resp.debt_add} debt</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}

                <button className="t-btn-primary" disabled={!allDone} onClick={launchTour}>
                  {allDone ? `⚡ EXÉCUTER — TOUR ${game.tour}` : "ASSIGNE UNE RÉPONSE À CHAQUE INCIDENT"}
                </button>
              </div>

              <div>
                <div className="t-section-title">// SYSTEM LOG</div>
                <div className="t-log" ref={logRef}>
                  {game.log.length === 0
                    ? <div className="t-log-line">{">"} Système prêt...</div>
                    : game.log.map((l, i) => <div key={i} className="t-log-line">{">"} <span>{l}</span></div>)
                  }
                </div>
                <div style={{ marginTop: 16 }}>
                  <div className="t-section-title">// DETTE TECHNIQUE</div>
                  <div style={{ fontSize: 12, color: "#446644", marginBottom: 6 }}>
                    Niveau : <span style={{ color: debtColor }}>{game.debt.toFixed(0)}/100</span>
                  </div>
                  <div className="t-debt-bar">
                    <div className="t-debt-fill" style={{ width: `${game.debt}%`, background: debtColor }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#003322", marginTop: 5, lineHeight: 1.6 }}>
                    {game.debt < 30 && "✓ Code base sain."}
                    {game.debt >= 30 && game.debt < 50 && "⚠ Attention. Corners cuts."}
                    {game.debt >= 50 && "🔴 CRITIQUE. Incidents ×1.3."}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── RECAP ── */}
        {phase === "recap" && game && (
          <>
            <div className="t-tour-dots">
              {Array.from({ length: MAX_TOURS }, (_, i) => {
                const t   = i + 1
                const cls = t < game.tour ? "done" : t === game.tour ? "current" : "future"
                return <div key={t} className={`t-dot ${cls}`}>{t < game.tour ? "✓" : t}</div>
              })}
            </div>
            <div className="t-phase-title">// TOUR {game.tour} — POST-INCIDENT REVIEW</div>

            <div className="t-metrics">
              {[
                { label: "SLA UPTIME",   value: `${game.sla.toFixed(2)}%`,           accent: slaColor,  fill: game.sla },
                { label: "CLIENT SAT",   value: `${game.sat}/100`,                    accent: satColor,  fill: game.sat },
                { label: "BUDGET INFRA", value: `$${(game.budget/1000).toFixed(1)}K`, accent: "#ffaa00", fill: (game.budget/BUDGET_INIT)*100 },
                { label: "DETTE TECH",   value: `${game.debt.toFixed(0)}/100`,        accent: debtColor, fill: 100-game.debt },
              ].map(m => (
                <div key={m.label} className="t-metric" style={{ "--accent": m.accent, "--fill": m.fill / 100 } as React.CSSProperties}>
                  <div className="t-metric-label">{m.label}</div>
                  <div className="t-metric-value">{m.value}</div>
                </div>
              ))}
            </div>

            <div className="t-two-col">
              <div>
                <div className="t-section-title">// RÉSULTATS INCIDENTS</div>
                {game.resultats.map((res, i) => (
                  <div key={i} className="t-recap-card">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 15, color: "#00cc66" }}>{res.incident.nom}</span>
                      <span style={{ fontSize: 11, color: "#446644" }}>{res.response.label}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 11, flexWrap: "wrap" }}>
                      <span style={{ color: res.slaImpact < -0.5 ? "#ff6666" : "#446644" }}>SLA: {res.slaImpact.toFixed(2)}%</span>
                      <span style={{ color: res.satImpact < -10  ? "#ff4488" : "#446644" }}>SAT: {res.satImpact.toFixed(0)} pts</span>
                      <span style={{ color: "#ffaa00" }}>Coût: -${res.response.cost.toLocaleString()}</span>
                      {res.response.debt_add > 0 && <span style={{ color: debtColor }}>Dette: +{res.response.debt_add}</span>}
                    </div>
                  </div>
                ))}

                {game.events.length > 0 && (
                  <>
                    <div className="t-section-title" style={{ marginTop: 16 }}>// ÉVÉNEMENTS</div>
                    {game.events.map((ev, i) => {
                      const good = ev.budget_delta > 0 || ev.sat_delta > 0
                      return (
                        <div key={i} className={`t-event ${good ? "good" : "bad"}`}>
                          <div className="t-event-name">{ev.nom}</div>
                          <div style={{ fontSize: 11 }}>{ev.message}</div>
                          <div style={{ fontSize: 10, marginTop: 3, opacity: 0.7 }}>
                            Budget: {ev.budget_delta > 0 ? "+" : ""}{(ev.budget_delta/1000).toFixed(1)}K
                            {ev.sat_delta !== 0 && `  |  SAT: ${ev.sat_delta > 0 ? "+" : ""}${ev.sat_delta}`}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>

              <div>
                <div className="t-section-title">// SYSTEM LOG</div>
                <div className="t-log" ref={logRef}>
                  {game.log.map((l, i) => <div key={i} className="t-log-line">{">"} <span>{l}</span></div>)}
                </div>
              </div>
            </div>

            <button className="t-btn-primary" onClick={nextTour}>
              {game.gameover ? "📊 VOIR RÉSULTATS FINAUX" : `➡ TOUR ${game.tour + 1} — NEXT INCIDENT WINDOW`}
            </button>
          </>
        )}

        {/* ── GAME OVER ── */}
        {phase === "gameover" && game && (() => {
          const rank  = getRank(game.sla, game.sat, game.budget)
          const isWin = game.victoire
          return (
            <div className="t-gameover">
              <div className="t-gameover-title" style={{ color: isWin ? "#00ff88" : "#ff4444" }}>
                {isWin ? "MISSION\nACCOMPLIE" : "SYSTÈME\nEN FAILLITE"}
              </div>
              <div style={{ fontSize: 13, color: "#446644", letterSpacing: 2 }}>
                {isWin
                  ? "L'API est stable. Les clients sont satisfaits. Tu as survécu."
                  : game.sla < 99.0 ? `SLA tombé à ${game.sla.toFixed(2)}% — en dessous du seuil critique.`
                  : game.budget < 0 ? "Budget épuisé."
                  : "Satisfaction clients à zéro."}
              </div>
              <div className="t-rank" style={{ borderColor: rank.color, color: rank.color }}>{rank.label}</div>
              <div className="t-final-stats">
                {[
                  { label: "SLA FINAL",      value: `${game.sla.toFixed(2)}%`,           accent: slaColor },
                  { label: "SAT CLIENT",     value: `${game.sat}/100`,                    accent: satColor },
                  { label: "BUDGET RESTANT", value: `$${(game.budget/1000).toFixed(1)}K`, accent: "#ffaa00" },
                ].map(m => (
                  <div key={m.label} className="t-metric" style={{ "--accent": m.accent } as React.CSSProperties}>
                    <div className="t-metric-label">{m.label}</div>
                    <div className="t-metric-value">{m.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 20 }}>
                <div className="t-section-title">// HISTORIQUE</div>
                <div className="t-log" style={{ maxHeight: 180, textAlign: "left" }}>
                  {game.log.map((l, i) => <div key={i} className="t-log-line">{">"} <span>{l}</span></div>)}
                </div>
              </div>
              <button className="t-btn-primary" onClick={() => { setGame(null); setPhase("start") }}>
                ↺ NOUVELLE SESSION — REPRENDRE LA PROD
              </button>
            </div>
          )
        })()}
            <div className="t-wave" />
      </div>
    </>
  )
}