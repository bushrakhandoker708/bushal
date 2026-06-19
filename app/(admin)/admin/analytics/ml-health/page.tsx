// app/(admin)/admin/analytics/ml-health/page.tsx

/**
 * ============================================================================
 * ML HEALTH DASHBOARD — ADMIN PAGE
 * ============================================================================
 *
 * Renders a comprehensive view of the ML pipeline's runtime health, accuracy
 * metrics, job history, and active drift alerts — all sourced from the three
 * tables populated by the Python ml-service:
 *
 *   ml_model_accuracy   → Model quality metrics (silhouette, MAPE, avg lift)
 *   ml_job_metrics      → Per-job execution stats (duration, records, status)
 *   model_drift_alerts  → Active performance degradation warnings
 *
 * WHAT EACH METRIC MEANS (shown inline for admin clarity):
 *
 *   K-Means Silhouette Score
 *     Range: -1 to +1. Measures how well-separated the customer clusters are.
 *     > 0.4 = well-separated (good)   0.2–0.4 = acceptable   < 0.2 = clusters
 *     overlap (potential overfitting — K-Means is forcing 5 clusters on data
 *     that may only support 2-3 meaningful groups).
 *
 *   Holt-Winters MAPE (Mean Absolute Percentage Error)
 *     Range: 0% to ∞. Measures average forecast error as % of actual value.
 *     < 20% = good   20–50% = acceptable   > 50% = model is overfitting to
 *     past history and will produce unreliable forecasts for future periods.
 *
 *   FP-Growth Avg Lift
 *     Range: 0 to ∞. Lift = 1 means the two products are independent (random
 *     co-occurrence). Lift > 1 means they're bought together more than chance.
 *     > 1.5 = strong associations (good)   1.2–1.5 = moderate   < 1.2 = weak
 *     (rules are barely above random — recommendations may not be useful).
 *
 * OVERFITTING SIGNALS:
 *   - Silhouette < 0.15: K too high for data density → artificial segmentation
 *   - MAPE > 50%: model memorized training history, fails on new patterns
 *   - Avg Lift < 1.2: Apriori min_support too low → spurious rules
 *   All three trigger drift alerts in model_drift_alerts when thresholds breach.
 * ============================================================================
 */

import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { Metadata } from 'next'
import Link from 'next/link'
import type { MLAccuracyRecord, MLJobMetric, ModelDriftAlert } from '@/app/api/admin/ml-accuracy/route'

export const metadata: Metadata = {
  title: 'ML Health Dashboard | Bushal Admin',
  description: 'Monitor ML model accuracy, job history, and drift alerts in real time.',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Metric card for a single model quality indicator.
 * Color-codes itself based on whether the metric is in a good/warn/bad range.
 */
function MetricCard({
  label,
  value,
  unit,
  previousValue,
  status,
  interpretation,
  thresholds,
}: {
  label: string
  value: number | null
  unit: string
  previousValue: number | null
  status: 'good' | 'warn' | 'bad' | 'unknown'
  interpretation: string
  thresholds: string
}) {
  const statusStyles: Record<string, string> = {
    good: 'border-green-200 bg-green-50',
    warn: 'border-amber-200 bg-amber-50',
    bad: 'border-red-200 bg-red-50',
    unknown: 'border-slate-200 bg-slate-50',
  }

  const valueColor: Record<string, string> = {
    good: 'text-green-700',
    warn: 'text-amber-700',
    bad: 'text-red-700',
    unknown: 'text-slate-500',
  }

  const statusDot: Record<string, string> = {
    good: 'bg-green-500',
    warn: 'bg-amber-500',
    bad: 'bg-red-500',
    unknown: 'bg-slate-400',
  }

  let trendIcon: string | null = null
  let trendColor = 'text-slate-400'
  if (value !== null && previousValue !== null) {
    const delta = value - previousValue
    if (Math.abs(delta) < 0.001) {
      trendIcon = '→ stable'
    } else if (delta > 0) {
      trendIcon = `↑ +${Math.abs(delta).toFixed(3)} vs prev`
      trendColor = status === 'good' ? 'text-green-600' : 'text-red-600'
    } else {
      trendIcon = `↓ −${Math.abs(delta).toFixed(3)} vs prev`
      trendColor = status === 'bad' ? 'text-red-600' : 'text-amber-600'
    }
  }

  return (
    <div className={`rounded-2xl border p-5 space-y-3 ${statusStyles[status]}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <span className={`w-2.5 h-2.5 rounded-full inline-block ${statusDot[status]}`} />
      </div>

      {/* Value */}
      <p className={`text-4xl font-bold tabular-nums ${valueColor[status]}`}>
        {value !== null ? `${value.toFixed(4)}${unit}` : '—'}
      </p>

      {/* Trend */}
      {trendIcon && (
        <p className={`text-xs font-medium ${trendColor}`}>{trendIcon}</p>
      )}

      {/* Interpretation */}
      <p className="text-xs text-slate-600 leading-relaxed">{interpretation}</p>

      {/* Thresholds */}
      <p className="text-[10px] text-slate-400 border-t border-slate-200 pt-2">{thresholds}</p>
    </div>
  )
}

/** Status badge for pipeline job rows */
function JobStatusBadge({ status }: { status: string }) {
  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
      partial
    </span>
  )
}

/** Severity badge for drift alert rows */
function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'critical') {
    return (
      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase">
        critical
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase">
      warning
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MLHealthPage() {
  // Auth gate
  const auth = await requireAdmin()
  if (!auth.success) return (auth as any).response

  const supabase = await auth.supabase

  // Fetch all three data streams in parallel
  const [accuracyRes, jobsRes, driftRes] = await Promise.all([
    supabase
      .from('ml_model_accuracy')
      .select('id, model_name, metric_name, metric_value, records_evaluated, evaluated_at')
      .order('evaluated_at', { ascending: false })
      .limit(50),

    supabase
      .from('ml_job_metrics')
      .select('id, job_name, execution_time_ms, records_processed, status, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(30),

    supabase
      .from('model_drift_alerts')
      .select(
        'id, model_name, metric_name, current_value, rolling_avg_value, percent_change, severity, status, created_at'
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ])

  const accuracy: MLAccuracyRecord[] = (accuracyRes.data ?? []) as MLAccuracyRecord[]
  const jobs: MLJobMetric[] = (jobsRes.data ?? []) as MLJobMetric[]
  const driftAlerts: ModelDriftAlert[] = (driftRes.data ?? []) as ModelDriftAlert[]

  // ── Derive latest and previous value per model::metric key ───────────────
  // We walk the sorted-descending array and take the first two occurrences
  // per key (most recent = current, second = previous for trend calculation).
  type MetricSlot = { current: number; prev: number | null; evaluatedAt: string; records: number }
  const latestByKey = new Map<string, MetricSlot>()

  for (const row of accuracy) {
    const key = `${row.model_name}::${row.metric_name}`
    if (!latestByKey.has(key)) {
      latestByKey.set(key, {
        current: row.metric_value,
        prev: null,
        evaluatedAt: row.evaluated_at,
        records: row.records_evaluated,
      })
    } else {
      const slot = latestByKey.get(key)!
      if (slot.prev === null) {
        slot.prev = row.metric_value
      }
    }
  }

  const sil  = latestByKey.get('kmeans_segmentation::silhouette_score')
  const mape = latestByKey.get('holt_winters_forecast::out_of_sample_mape')
  const lift = latestByKey.get('fpgrowth_recommendations::average_lift') ??
               latestByKey.get('fpgrowth_recommendations::strong_rules_generated')

  // ── Classify status for each metric ──────────────────────────────────────
  type Status = 'good' | 'warn' | 'bad' | 'unknown'

  const silStatus: Status = !sil
    ? 'unknown'
    : sil.current > 0.4 ? 'good'
    : sil.current > 0.2 ? 'warn'
    : 'bad'

  const mapeStatus: Status = !mape
    ? 'unknown'
    : mape.current < 20 ? 'good'
    : mape.current < 50 ? 'warn'
    : 'bad'

  // For lift/rules: if it's the strong_rules metric (integer count), classify differently
  const liftMetricName = latestByKey.has('fpgrowth_recommendations::average_lift')
    ? 'average_lift'
    : 'strong_rules_generated'
  const liftStatus: Status = !lift
    ? 'unknown'
    : liftMetricName === 'average_lift'
      ? lift.current > 1.5 ? 'good' : lift.current > 1.2 ? 'warn' : 'bad'
      : lift.current > 10 ? 'good' : lift.current > 3 ? 'warn' : 'bad'

  const criticalDriftCount = driftAlerts.filter((a) => a.severity === 'critical').length
  const warningDriftCount  = driftAlerts.filter((a) => a.severity === 'warning').length

  // ── Last pipeline run timestamp ───────────────────────────────────────────
  const lastRunAt = jobs[0]?.created_at ?? null

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
            Admin · Analytics
          </p>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">🧠 ML Health Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1.5 max-w-xl">
            Real-time accuracy, job status, and drift alerts from the Bushal ML pipeline.
            Data is refreshed on every nightly cron run (2 AM BDT).
          </p>
        </div>
        {lastRunAt && (
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Last pipeline run</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">{formatDate(lastRunAt)}</p>
          </div>
        )}
      </div>

      {/* ── Active drift alerts banner ────────────────────────────────────── */}
      {driftAlerts.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚨</span>
            <h2 className="font-bold text-red-800 text-sm uppercase tracking-wide">
              Active Drift Alerts
            </h2>
            <div className="ml-auto flex gap-2">
              {criticalDriftCount > 0 && (
                <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-xs font-bold">
                  {criticalDriftCount} critical
                </span>
              )}
              {warningDriftCount > 0 && (
                <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-xs font-bold">
                  {warningDriftCount} warning
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {driftAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-wrap items-start gap-x-3 gap-y-1 text-sm text-red-900 bg-white/60 rounded-xl px-4 py-2.5"
              >
                <SeverityBadge severity={alert.severity} />
                <span className="font-semibold font-mono text-xs">{alert.model_name}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-700">{alert.metric_name}</span>
                <span className="text-slate-400">·</span>
                <span>
                  current: <strong>{alert.current_value.toFixed(4)}</strong>
                </span>
                <span>
                  avg: <strong>{alert.rolling_avg_value.toFixed(4)}</strong>
                </span>
                <span>
                  Δ <strong>{(alert.percent_change * 100).toFixed(1)}%</strong>
                </span>
                <span className="text-xs text-slate-400 ml-auto">{formatDate(alert.created_at)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-red-600">
            Resolve alerts in Supabase by setting{' '}
            <code className="bg-red-100 px-1 py-0.5 rounded text-xs">status = 'acknowledged'</code>{' '}
            or{' '}
            <code className="bg-red-100 px-1 py-0.5 rounded text-xs">'resolved'</code>{' '}
            on the <code className="bg-red-100 px-1 py-0.5 rounded text-xs">model_drift_alerts</code> table.
          </p>
        </div>
      )}

      {/* ── Model accuracy cards ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-700">Model Accuracy</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="K-Means Silhouette Score"
            value={sil?.current ?? null}
            unit=""
            previousValue={sil?.prev ?? null}
            status={silStatus}
            interpretation={
              sil
                ? silStatus === 'good'
                  ? 'Customer clusters are well-separated. Segmentation is reliable.'
                  : silStatus === 'warn'
                  ? 'Clusters show some overlap. Segmentation is usable but watch for drift.'
                  : 'Clusters heavily overlap. K-Means may be overfitting — forcing 5 groups on insufficient data. Check customer count and consider lowering K.'
                : 'No silhouette data yet. Run the ML pipeline to generate this metric.'
            }
            thresholds="> 0.4 good · 0.2–0.4 acceptable · < 0.2 overfitting risk"
          />
          <MetricCard
            label="Holt-Winters MAPE"
            value={mape?.current ?? null}
            unit="%"
            previousValue={mape?.prev ?? null}
            status={mapeStatus}
            interpretation={
              mape
                ? mapeStatus === 'good'
                  ? 'Forecast error is low. Revenue predictions are trustworthy.'
                  : mapeStatus === 'warn'
                  ? 'Moderate forecast error. Predictions are directionally correct but imprecise.'
                  : 'High forecast error (> 50%). Model may be overfitting to historical seasonal patterns that are not repeating. Festival boosts or sudden demand shifts can cause this.'
                : 'No MAPE data yet. Run the ML pipeline to generate this metric.'
            }
            thresholds="< 20% good · 20–50% acceptable · > 50% overfitting risk"
          />
          <MetricCard
            label={liftMetricName === 'average_lift' ? 'FP-Growth Avg Lift' : 'FP-Growth Rules Generated'}
            value={lift?.current ?? null}
            unit={liftMetricName === 'average_lift' ? '×' : ''}
            previousValue={lift?.prev ?? null}
            status={liftStatus}
            interpretation={
              lift
                ? liftStatus === 'good'
                  ? liftMetricName === 'average_lift'
                    ? 'Strong product associations found. "Frequently Bought Together" recommendations are meaningful.'
                    : 'Healthy number of association rules generated.'
                  : liftStatus === 'warn'
                  ? 'Moderate associations. Recommendations work but could be stronger.'
                  : liftMetricName === 'average_lift'
                  ? 'Weak associations (lift near 1.0 = random co-occurrence). Consider raising min_support or min_lift thresholds in recommendations.py to reduce spurious rules.'
                  : 'Very few rules generated. Insufficient transaction data or thresholds too strict.'
                : 'No FP-Growth data yet. Run the ML pipeline to generate this metric.'
            }
            thresholds={
              liftMetricName === 'average_lift'
                ? '> 1.5× good · 1.2–1.5× acceptable · < 1.2× weak associations'
                : '> 10 rules good · 3–10 acceptable · < 3 insufficient data'
            }
          />
        </div>

        {/* Accuracy log timestamp */}
        {sil?.evaluatedAt && (
          <p className="text-xs text-slate-400">
            Latest accuracy run: {formatDate(sil.evaluatedAt)}
            {sil.records > 0 && ` · ${sil.records.toLocaleString()} customers evaluated`}
          </p>
        )}
      </section>

      {/* ── Pipeline job history ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-700">Pipeline Job History</h2>
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Job
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Records
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Duration
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Run At (BDT)
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                      No job runs recorded yet. The pipeline logs here after its first execution.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                          {job.job_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                        {job.records_processed.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span
                          className={
                            job.execution_time_ms > 30000
                              ? 'text-amber-600 font-semibold'
                              : job.execution_time_ms > 60000
                              ? 'text-red-600 font-bold'
                              : 'text-slate-600'
                          }
                        >
                          {formatMs(job.execution_time_ms)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-red-500 max-w-xs truncate">
                        {job.error_message ?? (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Accuracy history log ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-700">Accuracy Log (Last 50 Runs)</h2>
        <p className="text-xs text-slate-400">
          Each row is written by the Python ML pipeline after a pipeline execution.
          Compare successive rows of the same metric to monitor model stability over time.
        </p>
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[580px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Model
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Metric
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Value
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Records
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Evaluated At (BDT)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accuracy.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
                      No accuracy data yet. The Python ML pipeline writes here after its first run.
                    </td>
                  </tr>
                ) : (
                  accuracy.map((row, i) => {
                    // Highlight the latest row for each model::metric key
                    const key = `${row.model_name}::${row.metric_name}`
                    const isLatest = accuracy.findIndex(
                      (r) => `${r.model_name}::${r.metric_name}` === key
                    ) === i

                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50 transition-colors ${isLatest ? 'bg-blue-50/40' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {row.model_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{row.metric_name}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-bold tabular-nums text-sm ${
                              isLatest ? 'text-slate-900' : 'text-slate-500'
                            }`}
                          >
                            {row.metric_value.toFixed(4)}
                          </span>
                          {isLatest && (
                            <span className="ml-1.5 text-[10px] text-blue-500 font-bold">LATEST</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 text-xs tabular-nums">
                          {row.records_evaluated.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {formatDate(row.evaluated_at)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Footer nav ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
        <Link
          href="/admin/analytics"
          className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          ← Analytics Overview
        </Link>
        <Link
          href="/admin/analytics/customer-segmentation"
          className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          Customer Segmentation →
        </Link>
        <Link
          href="/admin/analytics/demand-forecasting"
          className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          Demand Forecasting →
        </Link>
      </div>
    </div>
  )
}