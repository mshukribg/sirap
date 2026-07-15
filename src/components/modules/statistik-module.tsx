'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { api } from '@/lib/api-client'
import type { SafeProfile } from '@/app/page'
import { GlassCard, PageHeader, LoadingState, EmptyState } from '@/components/ui-bits'
import { useReferenceData } from '@/components/use-reference-data'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { BarChart3, Download, MapPin, Calendar, TrendingUp } from 'lucide-react'

const PERIODS = [
  { key: 'daily', label: 'Harian' },
  { key: 'weekly', label: 'Mingguan' },
  { key: 'monthly', label: 'Bulanan' },
  { key: 'yearly', label: 'Tahunan' },
]

const CHART_COLORS = ['#0D3B52', '#12A3A8', '#7FD6C0', '#2FBF71', '#E0A800', '#E4572E', '#5a6c78', '#94a3b8', '#0284c7', '#0ea5e9']

type StatistikData = {
  summary: any
  trend: { label: string; count: number }[]
  byNegeri: { negeri: string; count: number }[]
  byDaerah: { daerah: string; negeri: string; count: number }[]
  byBengkel: { bengkel: string; count: number }[]
  byStatus: { status: string; label: string; count: number }[]
}

export function StatistikModule({ profile }: { profile: SafeProfile }) {
  const { bengkelList, negeriList, daerahList, loading: refLoading } = useReferenceData()
  const [period, setPeriod] = useState('monthly')
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')
  const [negeriId, setNegeriId] = useState('')
  const [daerahId, setDaerahId] = useState('')
  const [bengkelId, setBengkelId] = useState('')
  const [data, setData] = useState<StatistikData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<StatistikData>('/api/statistik', {
        searchParams: { period, negeriId, daerahId, bengkelId },
      })
      setData(r)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [period, negeriId, daerahId, bengkelId])

  useEffect(() => { load() }, [load])

  const filteredDaerah = daerahList.filter(d => d.negeriId === negeriId)

  const handleExport = () => {
    const params = new URLSearchParams({ format: 'excel' })
    if (negeriId) params.set('negeriId', negeriId)
    if (daerahId) params.set('daerahId', daerahId)
    if (bengkelId) params.set('bengkelId', bengkelId)
    window.open(`/api/aktiviti/export?${params.toString()}`, '_blank')
  }

  const canSeeAll = ['penolong_pengarah', 'penyelaras', 'admin'].includes(profile.role)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Statistik & Laporan"
        description="Analisis pelaksanaan aktiviti yang telah disahkan mengikut tempoh dan lokasi."
        actions={
          <button onClick={handleExport} className="glass-input px-4 py-2 rounded-md text-sm font-medium hover:bg-foreground/5 flex items-center gap-2">
            <Download className="w-4 h-4" /> Eksport CSV (Disahkan)
          </button>
        }
      />

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Tempoh
            </label>
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="glass-input w-full px-3 py-2 text-sm outline-none">
              {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          {canSeeAll && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Negeri
              </label>
              <select value={negeriId} onChange={e => { setNegeriId(e.target.value); setDaerahId('') }}
                className="glass-input w-full px-3 py-2 text-sm outline-none">
                <option value="">Semua Negeri</option>
                {negeriList.map(n => <option key={n.id} value={n.id}>{n.namaNegeri}</option>)}
              </select>
            </div>
          )}
          {canSeeAll && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Daerah</label>
              <select value={daerahId} onChange={e => setDaerahId(e.target.value)} disabled={!negeriId}
                className="glass-input w-full px-3 py-2 text-sm outline-none disabled:opacity-50">
                <option value="">Semua Daerah</option>
                {filteredDaerah.map(d => <option key={d.id} value={d.id}>{d.namaDaerah}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">Bengkel</label>
            <select value={bengkelId} onChange={e => setBengkelId(e.target.value)}
              className="glass-input w-full px-3 py-2 text-sm outline-none">
              <option value="">Semua Bengkel</option>
              {bengkelList.map(b => <option key={b.id} value={b.id}>{b.namaBengkel}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">Jenis Carta</label>
            <div className="flex gap-1">
              <button onClick={() => setChartType('bar')} data-active={chartType === 'bar'}
                className="glass-tab flex-1 px-2 py-2 rounded-md text-xs font-medium">Bar</button>
              <button onClick={() => setChartType('line')} data-active={chartType === 'line'}
                className="glass-tab flex-1 px-2 py-2 rounded-md text-xs font-medium">Line</button>
            </div>
          </div>
        </div>
      </GlassCard>

      {loading ? (
        <LoadingState label="Memuatkan statistik…" />
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryBox label="Jumlah Disahkan" value={data.summary.total} color="#2FBF71" />
            <SummaryBox label="Bulan Ini" value={data.summary.thisMonth} color="#12A3A8" />
            <SummaryBox label="Perubahan" value={`${data.summary.percentChange > 0 ? '+' : ''}${data.summary.percentChange}%`} color={data.summary.percentChange >= 0 ? '#2FBF71' : '#E4572E'} />
            <SummaryBox label="Tahun Ini" value={data.summary.thisYear} color="#0D3B52" />
          </div>

          {/* Trend chart */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Trend Pelaksanaan ({PERIODS.find(p => p.key === period)?.label})</h3>
                <p className="text-xs text-foreground/60">Bilangan aktiviti disahkan mengikut tempoh</p>
              </div>
              <TrendingUp className="w-4 h-4 text-foreground/40" />
            </div>
            {data.trend.length === 0 || data.trend.every(t => t.count === 0) ? (
              <EmptyState icon={BarChart3} title="Tiada data untuk tempoh ini" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                {chartType === 'bar' ? (
                  <BarChart data={data.trend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#12A3A8" />
                        <stop offset="100%" stopColor="#0D3B52" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,59,82,0.1)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-foreground/60" />
                    <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-foreground/60" allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(13,59,82,0.2)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" name="Bilangan" fill="url(#trendGrad)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={data.trend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,59,82,0.1)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-foreground/60" />
                    <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-foreground/60" allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(13,59,82,0.2)', borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="count" name="Bilangan" stroke="#12A3A8" strokeWidth={3} dot={{ fill: '#0D3B52', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* By Negeri */}
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Mengikut Negeri</h3>
                  <p className="text-xs text-foreground/60">Tahun ini (disahkan)</p>
                </div>
                <MapPin className="w-4 h-4 text-foreground/40" />
              </div>
              {data.byNegeri.length === 0 ? (
                <EmptyState icon={MapPin} title="Tiada data" />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, data.byNegeri.length * 28)}>
                  <BarChart data={data.byNegeri} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,59,82,0.1)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-foreground/60" allowDecimals={false} />
                    <YAxis type="category" dataKey="negeri" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-foreground/60" width={110} />
                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(13,59,82,0.2)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" name="Bilangan" radius={[0, 6, 6, 0]}>
                      {data.byNegeri.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GlassCard>

            {/* By Daerah */}
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Mengikut Daerah (Top 10)</h3>
                  <p className="text-xs text-foreground/60">Tahun ini (disahkan)</p>
                </div>
                <MapPin className="w-4 h-4 text-foreground/40" />
              </div>
              {data.byDaerah.length === 0 ? (
                <EmptyState icon={MapPin} title="Tiada data" />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, data.byDaerah.length * 28)}>
                  <BarChart data={data.byDaerah} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,59,82,0.1)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-foreground/60" allowDecimals={false} />
                    <YAxis type="category" dataKey="daerah" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-foreground/60" width={100} />
                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(13,59,82,0.2)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" name="Bilangan" radius={[0, 6, 6, 0]}>
                      {data.byDaerah.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* By Bengkel (pie) */}
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Agihan Mengikut Bengkel</h3>
                  <p className="text-xs text-foreground/60">Kesemua (disahkan)</p>
                </div>
              </div>
              {data.byBengkel.length === 0 ? (
                <EmptyState icon={BarChart3} title="Tiada data" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.byBengkel}
                      dataKey="count"
                      nameKey="bengkel"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                    >
                      {data.byBengkel.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(13,59,82,0.2)', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </GlassCard>

            {/* Status distribution */}
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Agihan Status Semasa</h3>
                  <p className="text-xs text-foreground/60">{profile.role === 'pengajar' ? 'Rekod anda' : 'Semua rekod'}</p>
                </div>
              </div>
              {data.byStatus.length === 0 ? (
                <EmptyState icon={BarChart3} title="Tiada data" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data.byStatus} dataKey="count" nameKey="label" outerRadius={80} innerRadius={45} paddingAngle={2}>
                        {data.byStatus.map((s, i) => {
                          const colors: Record<string, string> = { draf: '#0D3B52', menunggu_semakan: '#E0A800', menunggu_pengesahan: '#7FD6C0', disahkan: '#2FBF71', ditolak: '#E4572E' }
                          return <Cell key={i} fill={colors[s.status] ?? '#999'} />
                        })}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(13,59,82,0.2)', borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 space-y-1.5">
                    {data.byStatus.map(s => {
                      const total = data.byStatus.reduce((sum, x) => sum + x.count, 0)
                      const pct = total === 0 ? 0 : Math.round((s.count / total) * 100)
                      return (
                        <div key={s.status} className="flex items-center justify-between text-xs">
                          <span className="text-foreground/70">{s.label}</span>
                          <span className="font-semibold text-foreground">{s.count} ({pct}%)</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </GlassCard>
          </div>

          {/* Tables */}
          <GlassCard className="p-5">
            <h3 className="font-semibold text-foreground mb-3">Jadual Ringkasan Mengikut Negeri</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-foreground/5 text-xs uppercase text-foreground/70">
                  <tr>
                    <th className="px-3 py-2 text-left">Bil</th>
                    <th className="px-3 py-2 text-left">Negeri</th>
                    <th className="px-3 py-2 text-right">Bilangan Aktiviti</th>
                    <th className="px-3 py-2 text-right">Peratus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/8">
                  {data.byNegeri.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-foreground/50">Tiada data</td></tr>
                  )}
                  {data.byNegeri.map((n, i) => {
                    const total = data.byNegeri.reduce((s, x) => s + x.count, 0)
                    const pct = total === 0 ? 0 : ((n.count / total) * 100).toFixed(1)
                    return (
                      <tr key={i} className="hover:bg-foreground/3">
                        <td className="px-3 py-2 text-foreground/60">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{n.negeri}</td>
                        <td className="px-3 py-2 text-right">{n.count}</td>
                        <td className="px-3 py-2 text-right text-foreground/60">{pct}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      ) : (
        <GlassCard className="p-8 text-center text-foreground/60">Gagal memuatkan statistik.</GlassCard>
      )}
    </div>
  )
}

function SummaryBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="glass-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-foreground/60 font-medium">{label}</p>
      <p className="text-2xl font-bold mt-0.5" style={{ color }}>{value}</p>
    </div>
  )
}
