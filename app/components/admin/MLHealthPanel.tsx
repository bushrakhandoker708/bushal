// ============================================================================
// FILE ADDRESS: app/components/admin/MLHealthPanel.tsx
// ============================================================================
// EXPLANATION:
// This admin-only component visualizes the health of the ML pipelines.
// It displays two critical sections:
//
// 1. MODEL DRIFT ALERTS:
//    Fetches from the `active_drift_alerts` view. If a model's performance 
//    (e.g., Silhouette Score or MAPE) has degraded significantly compared 
//    to its 4-week rolling average, it shows a warning or critical banner.
//
// 2. A/B TESTING (THOMPSON SAMPLING) STATUS:
//    Fetches the `recommendation_models` table. It calculates the expected 
//    conversion rate for each algorithm using the formula: 
//    Expected Rate = alpha / (alpha + beta). 
//    This shows the admin exactly which algorithm the Multi-Armed Bandit 
//    is currently exploiting the most, and how much exploration is happening.
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/app/lib/utils/cn'

// ─── Types ──────────────────────────────────────────────────────────────────

interface DriftAlert {
  id: string
  model_name: string
  metric_name: string
  current_value: number
  rolling_avg_value: number
  percent_change: number
  severity: 'warning' | 'critical'
  status: string
  created_at: string
}

interface RecommendationModel {
  id: string
  name: string
  description: string | null
  alpha: number
  beta: number
  is_active: boolean
}

// ─── Helper: Format Model Names ─────────────────────────────────────────────

const MODEL_LABELS: Record<string, string> = {
  collaborative_filtering: 'Collaborative Filtering (User-based KNN)',
  fp_growth: 'Frequent Pattern Growth (Market Basket)',
  pagerank_rwr: 'Product Graph (PageRank + RWR)',
  trending_ema: 'Trending Items (EMA Cold Start)',
  random_baseline: 'Random Baseline (Control Group)',
}

const METRIC_LABELS: Record<string, string> = {
  silhouette_score: 'Silhouette Score (Clustering Quality)',
  out_of_sample_mape: 'MAPE (Forecast Error %)',
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function MLHealthPanel() {
  const supabase = createBrowserClient()
  
  const [alerts, setAlerts] = useState<DriftAlert[]>([])
  const [models, setModels] = useState<RecommendationModel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      
      // Fetch active drift alerts
      const { data: alertsData } = await supabase
        .from('active_drift_alerts')
        .select('*')
        .limit(10)
      
      // Fetch recommendation models for A/B testing stats
      const { data: modelsData } = await supabase
        .from('recommendation_models')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      setAlerts(alertsData ?? [])
      setModels(modelsData ?? [])
      setLoading(false)
    }

    fetchData()
  }, [supabase])

  // Calculate expected conversion rate for Thompson Sampling
  const getExpectedConversion = (alpha: number, beta: number) => {
    return (alpha / (alpha + beta)) * 100
  }

  if (loading) {
    return (
      <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6 animate-pulse">
        <div className="h-6 bg-bushal-ivoryDeep rounded w-1/3 mb-4" />
        <div className="h-20 bg-bushal-ivoryDeep rounded mb-2" />
        <div className="h-20 bg-bushal-ivoryDeep rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ─── SECTION 1: MODEL DRIFT ALERTS ─────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-bushal-danger/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-bushal-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="font-heading text-xl text-bushal-forest">Model Drift Alerts</h2>
        </div>

        {alerts.length === 0 ? (
          <div className="bg-bushal-successBg border border-bushal-success/20 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-bushal-success/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-bushal-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-bushal-success">All Models Stable</p>
              <p className="text-xs text-bushal-inkSoft mt-0.5">
                No performance degradation detected in the last 4 weeks.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const isCritical = alert.severity === 'critical'
              const changePercent = (alert.percent_change * 100).toFixed(1)
              
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                    isCritical 
                      ? "bg-bushal-dangerBg border-bushal-danger/30" 
                      : "bg-bushal-warningBg border-bushal-warning/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                      isCritical ? "bg-bushal-danger/20" : "bg-bushal-warning/20"
                    )}>
                      <svg className={cn("w-4 h-4", isCritical ? "text-bushal-danger" : "text-bushal-warning")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className={cn(
                        "text-sm font-bold uppercase tracking-wide",
                        isCritical ? "text-bushal-danger" : "text-bushal-warning"
                      )}>
                        {isCritical ? 'Critical Degradation' : 'Warning: Performance Drop'}
                      </p>
                      <p className="text-sm text-bushal-ink mt-1">
                        <span className="font-semibold">{MODEL_LABELS[alert.model_name] || alert.model_name}</span>
                        {' '}has degraded. {METRIC_LABELS[alert.metric_name] || alert.metric_name} changed by{' '}
                        <span className="font-bold">{changePercent}%</span> compared to the 4-week rolling average.
                      </p>
                      <p className="text-xs text-bushal-inkSoft mt-1.5">
                        Current: {alert.current_value.toFixed(4)} · Rolling Avg: {alert.rolling_avg_value.toFixed(4)} · Triggered: {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={async () => {
                      // Mark alert as acknowledged
                      await supabase
                        .from('model_drift_alerts')
                        .update({ status: 'acknowledged' })
                        .eq('id', alert.id)
                      
                      setAlerts(prev => prev.filter(a => a.id !== alert.id))
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all flex-shrink-0",
                      isCritical
                        ? "bg-bushal-danger text-white hover:bg-bushal-danger/90"
                        : "bg-bushal-warning text-white hover:bg-bushal-warning/90"
                    )}
                  >
                    Acknowledge
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ─── SECTION 2: A/B TESTING (THOMPSON SAMPLING) ────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-bushal-copper/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="font-heading text-xl text-bushal-forest">Recommendation A/B Testing</h2>
        </div>

        <p className="text-sm text-bushal-inkSoft mb-4">
          Live status of the Multi-Armed Bandit (Thompson Sampling). The algorithm with the highest expected conversion rate is selected most frequently.
        </p>

        <div className="bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bushal-ivoryDeep/50 border-b border-bushal-border">
                <th className="text-left px-5 py-3 font-semibold text-bushal-inkSoft text-xs uppercase tracking-wider">Algorithm</th>
                <th className="text-center px-5 py-3 font-semibold text-bushal-inkSoft text-xs uppercase tracking-wider">Successes (α)</th>
                <th className="text-center px-5 py-3 font-semibold text-bushal-inkSoft text-xs uppercase tracking-wider">Failures (β)</th>
                <th className="text-center px-5 py-3 font-semibold text-bushal-inkSoft text-xs uppercase tracking-wider">Expected Conv. Rate</th>
                <th className="text-left px-5 py-3 font-semibold text-bushal-inkSoft text-xs uppercase tracking-wider">Traffic Allocation</th>
              </tr>
            </thead>
            <tbody>
              {models.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-bushal-inkSoft">
                    No active models found.
                  </td>
                </tr>
              ) : (
                // Sort by expected conversion rate descending to show the "winner" at the top
                [...models]
                  .sort((a, b) => getExpectedConversion(b.alpha, b.beta) - getExpectedConversion(a.alpha, a.beta))
                  .map((model, index) => {
                    const convRate = getExpectedConversion(model.alpha, model.beta)
                    const isLeader = index === 0 && models.length > 1
                    
                    return (
                      <tr key={model.id} className="border-b border-bushal-border/50 last:border-0 hover:bg-bushal-ivoryDeep/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {isLeader && (
                              <span className="w-5 h-5 rounded-full bg-bushal-copper/10 flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-bushal-copper" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </span>
                            )}
                            <div>
                              <p className={cn("font-semibold text-bushal-forest", isLeader && "text-bushal-copper")}>
                                {MODEL_LABELS[model.name] || model.name}
                              </p>
                              {isLeader && (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-bushal-copper/70 mt-0.5">
                                  Current Leader
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center font-mono text-bushal-success font-semibold">
                          {Math.round(model.alpha)}
                        </td>
                        <td className="px-5 py-4 text-center font-mono text-bushal-danger/70 font-semibold">
                          {Math.round(model.beta)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={cn(
                            "font-mono font-bold text-lg",
                            isLeader ? "text-bushal-copper" : "text-bushal-ink"
                          )}>
                            {convRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-5 py-4 w-1/3">
                          <div className="w-full h-2 bg-bushal-ivoryDeep rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                isLeader ? "bg-bushal-copper" : "bg-bushal-forest/40"
                              )}
                              style={{ width: `${Math.min(100, convRate * 2)}%` }} // Scale for visual effect
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })
              )}
            </tbody>
          </table>
        </div>
        
        <p className="text-xs text-bushal-inkSoft mt-3 italic">
          * Successes (α) increment when a user purchases a recommended item. Failures (β) increment when an impression does not lead to a click/purchase.
        </p>
      </section>
    </div>
  )
}