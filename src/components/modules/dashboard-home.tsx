'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api-client'
import type { SafeProfile } from '@/app/page'
import { GlassCard, StatCard, LoadingState } from '@/components/ui-bits'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  CheckCircle2, Clock, FileText, TrendingUp, TrendingDown, MapPin, Calendar,
  AlertCircle, ArrowRight, Activity, ClipboardCheck, ShieldCheck, BarChart3,
} from 'lucide-react'
import type { NavKey } from '@/components/app-shell'

const STATUS_COLORS: Record<string, string> = {
  draf: '#0D3B52',
  menunggu_semakan: '#E0A800',
  menunggu_pengesahan: '#7FD6C0',
  disahkan: '#2FBF71',
  ditolak: '#E4572E',
}

type StatistikData = {
  summary: {
    total: number
    thisMonth: number
    lastMonth: number
    percentChange: number
    thisYear: number
    topNegeri: { negeri: string; count: number }[]
    topDaerah: { daerah: string; negeri: string; count: number }[]
  }
  trend: { label: string; count: number }[]
  byStatus: { status: string; label: string; count: number }[]
}

export function DashboardHome({ profile, onNavigate }: { profile: SafeProfile; onNavigate: (k: NavKey) => void }) {
  const [data, setData] = useState<StatistikData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<StatistikData>('/api/statistik', { searchParams: { period: 'monthly' } })
      setData(r)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const firstName = profile.fullName.split(' ')[0]
  const roleLabel = ROLE_LABEL[profile.role]

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <GlassCard strong className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-foreground/60 mb-1">Selamat datang kembali,</p>
            <h2 className="text-2xl font-bold text-foreground">{firstName}!</h2>
            <p className="text-sm text-foreground/70 mt-1">
              Anda log masuk sebagai <span className="font-semibold text-[#12A3A8]">{roleLabel}</span>
              {profile.bengkel && <> · <span className="text-foreground/70">{profile.bengkel.namaBengkel}</span></>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.role === 'pengajar' && (
              <button onClick={() => onNavigate('pengajar')} className="btn-brand-gradient px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" /> Cipta / Hantar Aktiviti
              </button>
            )}
            {profile.role === 'penyelaras' && (
              <button onClick={() => onNavigate('penyelaras')} className="btn-brand-gradient px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" /> Semak Aktiviti
              </button>
            )}
            {profile.role === 'penolong_pengarah' && (
              <button onClick={() => onNavigate('pp')} className="btn-brand-gradient px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Sahkan Aktiviti
              </button>
            )}
            <button onClick={() => onNavigate('statistik')} className="glass-input px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-foreground/5">
              <BarChart3 className="w-4 h-4" /> Statistik Penuh
            </button>
          </div>
        </div>
      </GlassCard>

      {loading ? (
        <LoadingState label="Memuatkan statistik…" />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Jumlah Disahkan (Kesemua)" value={data.summary.total} icon={CheckCircle2} color="#2FBF71" />
            <StatCard label="Disahkan Bulan Ini" value={data.summary.thisMonth} icon={Calendar} color="#12A3A8"
              hint={`${data.summary.lastMonth} bulan lepas`} />
            <StatCard
              label="Perubahan vs Bulan Lepas"
              value={`${data.summary.percentChange > 0 ? '+' : ''}${data.summary.percentChange}%`}
              icon={data.summary.percentChange >= 0 ? TrendingUp : TrendingDown}
              color={data.summary.percentChange >= 0 ? '#2FBF71' : '#E4572E'}
            />
            <StatCard label="Disahkan Tahun Ini" value={data.summary.thisYear} icon={Activity} color="#0D3B52" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <GlassCard className="p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Trend Bulanan (12 Bulan Terkini)</h3>
                  <p className="text-xs text-foreground/60">Bilangan aktiviti yang disahkan setiap bulan</p>
                </div>
                <Calendar className="w-4 h-4 text-foreground/40" />
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.trend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#12A3A8" />
                      <stop offset="100%" stopColor="#0D3B52" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,59,82,0.1)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-foreground/60" />
                  <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-foreground/60" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(13,59,82,0.2)', borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill: 'rgba(18,163,168,0.08)' }}
                  />
                  <Bar dataKey="count" name="Bilangan" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Agihan Status</h3>
                  <p className="text-xs text-foreground/60">{profile.role === 'pengajar' ? 'Rekod anda' : 'Semua rekod'}</p>
                </div>
                <Activity className="w-4 h-4 text-foreground/40" />
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.byStatus}
                    dataKey="count"
                    nameKey="label"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={2}
                  >
                    {data.byStatus.map((s, i) => (
                      <Cell key={i} fill={STATUS_COLORS[s.status] ?? '#999'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(13,59,82,0.2)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">Top 3 Negeri Aktif (Tahun Ini)</h3>
                  <p className="text-xs text-foreground/60">Bilangan aktiviti yang disahkan</p>
                </div>
                <MapPin className="w-4 h-4 text-foreground/40" />
              </div>
              <div className="space-y-2">
                {data.summary.topNegeri.length === 0 && (
                  <p className="text-sm text-foreground/50 py-4 text-center">Tiada data.</p>
                )}
                {data.summary.topNegeri.map((n, i) => {
                  const max = data.summary.topNegeri[0]?.count ?? 1
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#12A3A8]/20 text-[#12A3A8] flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-foreground">{n.negeri}</span>
                          <span className="text-foreground/60">{n.count} aktiviti</span>
                        </div>
                        <div className="h-2 rounded-full bg-foreground/8 overflow-hidden">
                          <div className="h-full btn-brand-gradient rounded-full" style={{ width: `${(n.count / max) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">Top 3 Daerah Aktif (Tahun Ini)</h3>
                  <p className="text-xs text-foreground/60">Bilangan aktiviti yang disahkan</p>
                </div>
                <MapPin className="w-4 h-4 text-foreground/40" />
              </div>
              <div className="space-y-2">
                {data.summary.topDaerah.length === 0 && (
                  <p className="text-sm text-foreground/50 py-4 text-center">Tiada data.</p>
                )}
                {data.summary.topDaerah.map((d, i) => {
                  const max = data.summary.topDaerah[0]?.count ?? 1
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#7FD6C0]/30 text-[#0D3B52] flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-foreground">{d.daerah} <span className="text-foreground/50">· {d.negeri}</span></span>
                          <span className="text-foreground/60">{d.count} aktiviti</span>
                        </div>
                        <div className="h-2 rounded-full bg-foreground/8 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#7FD6C0] to-[#12A3A8] rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-5">
            <h3 className="font-semibold text-foreground mb-3">Tindakan Pantas</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {quickActions(profile.role).map((a, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(a.nav as NavKey)}
                  className="glass-input p-3 rounded-lg text-left hover:bg-foreground/5 transition group"
                >
                  <a.icon className="w-5 h-5 text-[#12A3A8] mb-1.5" />
                  <p className="text-xs font-semibold text-foreground">{a.label}</p>
                  <p className="text-[11px] text-foreground/60 mt-0.5">{a.hint}</p>
                  <ArrowRight className="w-3 h-3 text-foreground/40 mt-1.5 group-hover:translate-x-0.5 transition" />
                </button>
              ))}
            </div>
          </GlassCard>
        </>
      ) : (
        <GlassCard className="p-8 text-center text-foreground/60">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-foreground/40" />
          Gagal memuatkan statistik. Sila muat semula halaman.
        </GlassCard>
      )}
    </div>
  )
}

const ROLE_LABEL: Record<string, string> = {
  pengajar: 'Pengajar',
  penyelaras: 'Penyelaras',
  penolong_pengarah: 'Penolong Pengarah',
  admin: 'Admin',
}

function quickActions(role: string): { label: string; hint: string; icon: any; nav: string }[] {
  if (role === 'pengajar') {
    return [
      { label: 'Cipta Aktiviti', hint: 'Tambah rekod draf baharu', icon: FileText, nav: 'pengajar' },
      { label: 'Hantar Pukal', hint: 'Hantar berbilang draf sekaligus', icon: ArrowRight, nav: 'pengajar' },
      { label: 'Statistik Saya', hint: 'Lihat trend aktiviti anda', icon: BarChart3, nav: 'statistik' },
      { label: 'Tukar Kata Laluan', hint: 'Kemas kini keselamatan akaun', icon: ShieldCheck, nav: 'settings' },
    ]
  }
  if (role === 'penyelaras') {
    return [
      { label: 'Semak Aktiviti', hint: 'Pilih untuk disemak', icon: ClipboardCheck, nav: 'penyelaras' },
      { label: 'Hantar ke PP', hint: 'Forward kepada Penolong Pengarah', icon: ArrowRight, nav: 'penyelaras' },
      { label: 'Statistik', hint: 'Pantau pelaksanaan', icon: BarChart3, nav: 'statistik' },
      { label: 'Tukar Kata Laluan', hint: 'Kemas kini keselamatan akaun', icon: ShieldCheck, nav: 'settings' },
    ]
  }
  if (role === 'penolong_pengarah') {
    return [
      { label: 'Sahkan Aktiviti', hint: 'Lulus atau tolak rekod', icon: ShieldCheck, nav: 'pp' },
      { label: 'Sahkan Pukal', hint: 'Lulus berbilang rekod sekaligus', icon: CheckCircle2, nav: 'pp' },
      { label: 'Statistik & Laporan', hint: 'Carta & eksport CSV', icon: BarChart3, nav: 'statistik' },
      { label: 'Senarai Penuh', hint: 'Semua rekod aktiviti', icon: FileText, nav: 'activities' },
    ]
  }
  return [
    { label: 'Urus Pengguna', hint: 'CRUD akaun pengguna', icon: FileText, nav: 'admin' },
    { label: 'Data Rujukan', hint: 'Bengkel, Negeri, Daerah', icon: MapPin, nav: 'admin' },
    { label: 'Log Audit', hint: 'Jejak semua tindakan', icon: Activity, nav: 'admin' },
    { label: 'Statistik Sistem', hint: 'Pantau seluruh sistem', icon: BarChart3, nav: 'statistik' },
  ]
}
