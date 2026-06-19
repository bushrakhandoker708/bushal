// app/components/admin/analytics/MLPerformancePanel.tsx
'use client'

import { cn } from '@/app/lib/utils/cn'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MLAccuracyRecord {
  id: string
  model_name: 'kmeans_segmentation' | 'holt_winters_forecast' | 'fpgrowth_recommendations'
  metric_name: string // e.g., 'mape_percentage', 'silhouette_score', 'avg_lift'
  metric_value: number
  records_evaluated: number
  evaluated_at: string
}

export interface MLJobMetric {
  id: string
  job_name: string
  execution_time_ms: number
  records_processed: number
  status: 'success' | 'failed' | 'partial'
  error_message: string | null
  created_at: string
}

interface MLPerformancePanelProps {
  data: MLAccuracyRecord[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLatestMetric(data: MLAccuracyRecord[], modelName: string, metricName: string) {
  const records = data
    .filter((r) => r.model_name === modelName && r.metric_name === metricName)
    .sort((a, b) => new Date(b.evaluated_at).getTime() - new Date(a.evaluated_at).getTime())
  
  return records.length > 0 ? records[0] : null
}

function getTrend(data: MLAccuracyRecord[], modelName: string, metricName: string, isHigherBetter: boolean) {
  const records = data
    .filter((r) => r.model_name === modelName && r.metric_name === metricName)
    .sort((a, b) => new Date(b.evaluated_at).getTime() - new Date(a.evaluated_at).getTime())
  
  if (records.length < 2) return null
  
  const current = records[0].metric_value
  const previous = records[1].metric_value
  
  if (current === previous) return { direction: 'stable' as const, value: 0 }
  
  const isImproving = isHigherBetter ? current > previous : current < previous
  const changePercent = previous !== 0 ? Math.abs(((current - previous) / previous) * 100) : 0
  
  return {
    direction: isImproving ? 'improving' as const : 'degrading' as const,
    value: changePercent
  }
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

/**
 * Status badge for pipeline job rows with FIXED duration coloring logic.
 */
function JobStatusBadge({ status, executionTimeMs }: { status: string; executionTimeMs?: number }) {
  // FIX: Reordered conditions to ensure > 60000 is checked BEFORE > 30000.
  // Previously, > 60000 was unreachable because > 30000 caught it first.
  const durationColor = executionTimeMs 
    ? executionTimeMs > 60000 
      ? 'text-red-600 font-bold' 
      : executionTimeMs > 30000 
        ? 'text-amber-600 font-semibold' 
        : 'text-slate-600'
    : 'text-slate-600'

  if (status === 'success') {
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold", durationColor)}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        success
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        failed
      </span>
    )
  }
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold", durationColor)}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
      partial
    </span>
  )
}

function TrustGauge({ 
  label, 
  value, 
  unit, 
  isHigherBetter, 
  description,
  trend 
}: { 
  label: string
  value: number | null
  unit: string
  isHigherBetter: boolean
  description: string
  trend: { direction: 'improving' | 'degrading' | 'stable'; value: number } | null
}) {
  if (value === null) {
    return (
      <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6 flex flex-col items-center justify-center min-h-[160px]">
        <div className="w-10 h-10 rounded-full bg-bushal-ivoryDeep flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-bushal-inkSoft">Awaiting Data</p>
        <p className="text-xs text-bushal-inkSoft/60 mt-1 text-center">{description}</p>
      </div>
    )
  }

  // Determine color based on performance thresholds
  let statusColor = 'text-bushal-success'
  let bgColor = 'bg-bushal-successBg'
  let borderColor = 'border-bushal-success/20'
  let gaugeColor = 'bg-bushal-success'

  if (isHigherBetter) {
    // e.g., Silhouette Score (0 to 1) or Lift (>1)
    if (value < 0.3) { statusColor = 'text-bushal-danger'; bgColor = 'bg-bushal-dangerBg'; borderColor = 'border-bushal-danger/20'; gaugeColor = 'bg-bushal-danger' }
    else if (value < 0.6) { statusColor = 'text-bushal-warning'; bgColor = 'bg-bushal-warningBg'; borderColor = 'border-bushal-warning/20'; gaugeColor = 'bg-bushal-warning' }
  } else {
    // e.g., MAPE (Lower is better, <10% is great, >20% is poor)
    if (value > 20) { statusColor = 'text-bushal-danger'; bgColor = 'bg-bushal-dangerBg'; borderColor = 'border-bushal-danger/20'; gaugeColor = 'bg-bushal-danger' }
    else if (value > 10) { statusColor = 'text-bushal-warning'; bgColor = 'bg-bushal-warningBg'; borderColor = 'border-bushal-warning/20'; gaugeColor = 'bg-bushal-warning' }
  }

  // Calculate gauge width (0-100%)
  let gaugePercent = 50
  if (isHigherBetter) {
    gaugePercent = Math.min(100, Math.max(0, value * 100)) // Assumes 0-1 scale, adjust if needed
    if (label.includes('Lift')) gaugePercent = Math.min(100, Math.max(0, (value - 1) * 50)) // Lift > 1
  } else {
    gaugePercent = Math.min(100, Math.max(0, 100 - (value * 2))) // Invert for MAPE (0% is 100% gauge)
  }

  return (
    <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6 transition-all hover:shadow-cardHover">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-bushal-inkSoft">{label}</p>
          <p className="text-xs text-bushal-inkSoft/60 mt-0.5">{description}</p>
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold",
            trend.direction === 'improving' ? "bg-bushal-successBg text-bushal-success" :
            trend.direction === 'degrading' ? "bg-bushal-dangerBg text-bushal-danger" :
            "bg-bushal-ivoryDeep text-bushal-inkSoft"
          )}>
            {trend.direction === 'improving' && '↑'}
            {trend.direction === 'degrading' && '↓'}
            {trend.direction === 'stable' && '→'}
            {trend.value.toFixed(1)}%
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1 mb-4">
        <span className={cn("text-3xl font-extrabold tabular-nums font-heading", statusColor)}>
          {value.toFixed(2)}
        </span>
        <span className="text-sm font-semibold text-bushal-inkSoft">{unit}</span>
      </div>

      {/* Progress Bar / Gauge */}
      <div className="h-2 w-full bg-bushal-ivoryDeep rounded-full overflow-hidden mb-3">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000 ease-out", gaugeColor)}
          style={{ width: `${gaugePercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-bushal-inkSoft/50 font-medium">
        <span>Poor</span>
        <span>Optimal</span>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MLPerformancePanel({ data }: MLPerformancePanelProps) {
  const [jobs, setJobs] = useState<MLJobMetric[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)

  // Fetch job metrics separately since they aren't in the accuracy data prop
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const supabase = createBrowserClient()
        const { data: jobData } = await supabase
          .from('ml_job_metrics')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (jobData) setJobs(jobData as MLJobMetric[])
      } catch (error) {
        console.error('Failed to fetch ML jobs:', error)
      } finally {
        setLoadingJobs(false)
      }
    }
    fetchJobs()
  }, [])

  // 1. Demand Forecasting (MAPE - Lower is better)
  const mapeRecord = getLatestMetric(data, 'holt_winters_forecast', 'mape_percentage')
  const mapeTrend = getTrend(data, 'holt_winters_forecast', 'mape_percentage', false)

  // 2. Customer Segmentation (Silhouette Score - Higher is better, 0 to 1)
  const silhouetteRecord = getLatestMetric(data, 'kmeans_segmentation', 'silhouette_score')
  const silhouetteTrend = getTrend(data, 'kmeans_segmentation', 'silhouette_score', true)

  // 3. Recommendations (Average Lift - Higher is better, >1 is good)
  const liftRecord = getLatestMetric(data, 'fpgrowth_recommendations', 'avg_lift')
  const liftTrend = getTrend(data, 'fpgrowth_recommendations', 'avg_lift', true)

  const lastEvaluated = data.length > 0 
    ? new Date(Math.max(...data.map(d => new Date(d.evaluated_at).getTime()))).toLocaleString('en-BD', { 
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      })
    : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bushal-copper to-bushal-copperLight flex items-center justify-center shadow-lg shadow-bushal-copper/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-bushal-forest font-heading">AI Model Trust Score</h2>
            <p className="text-xs text-bushal-inkSoft">
              {lastEvaluated ? `Last evaluated: ${lastEvaluated}` : 'No evaluations recorded yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrustGauge
          label="Forecast Accuracy (MAPE)"
          value={mapeRecord?.metric_value ?? null}
          unit="%"
          isHigherBetter={false}
          description="Mean Absolute Percentage Error for demand predictions. Lower is better."
          trend={mapeTrend}
        />
        <TrustGauge
          label="Segmentation Quality"
          value={silhouetteRecord?.metric_value ?? null}
          unit="score"
          isHigherBetter={true}
          description="Silhouette Score for K-Means clusters. Measures how distinct customer groups are."
          trend={silhouetteTrend}
        />
        <TrustGauge
          label="Recommendation Strength"
          value={liftRecord?.metric_value ?? null}
          unit="lift"
          isHigherBetter={true}
          description="Average Lift for FP-Growth associations. How much more likely items are bought together."
          trend={liftTrend}
        />
      </div>

      {/* Pipeline Job History */}
      <div className="bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden">
        <div className="px-6 py-4 border-b border-bushal-border">
          <h3 className="text-sm font-bold text-bushal-forest">Recent Pipeline Jobs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bushal-ivoryDeep/50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-bold text-bushal-inkSoft uppercase">Job</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-bushal-inkSoft uppercase">Status</th>
                <th className="text-right px-6 py-3 text-xs font-bold text-bushal-inkSoft uppercase">Duration</th>
                <th className="text-right px-6 py-3 text-xs font-bold text-bushal-inkSoft uppercase">Records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bushal-border">
              {loadingJobs ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-bushal-inkSoft">Loading...</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-bushal-inkSoft">No jobs recorded yet.</td></tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-bushal-ivoryDeep/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-bushal-ink">{job.job_name}</td>
                    <td className="px-6 py-3">
                      <JobStatusBadge status={job.status} executionTimeMs={job.execution_time_ms} />
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums">
                      <span className={
                        job.execution_time_ms > 60000 ? 'text-red-600 font-bold' :
                        job.execution_time_ms > 30000 ? 'text-amber-600 font-semibold' :
                        'text-slate-600'
                      }>
                        {formatMs(job.execution_time_ms)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-bushal-inkSoft">
                      {job.records_processed.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Playbook / Insights */}
      <div className="bg-gradient-to-br from-bushal-forest to-bushal-forestMid rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-bushal-copperGlow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-bushal-copperGlow mb-2">
              Admin Playbook
            </h3>
            <ul className="text-xs text-white/80 space-y-1.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-bushal-copperGlow mt-0.5">•</span>
                <span><strong className="text-white">MAPE &gt; 20%?</strong> Your Holt-Winters smoothing factors (α, β, γ) may need grid-search optimization in the Python service.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-bushal-copperGlow mt-0.5">•</span>
                <span><strong className="text-white">Silhouette &lt; 0.3?</strong> Your customer base might naturally form fewer than 5 clusters. Check the Elbow Method logs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-bushal-copperGlow mt-0.5">•</span>
                <span><strong className="text-white">Lift &lt; 1.2?</strong> FP-Growth minimum support threshold is too low. Increase it to filter out random noise.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}