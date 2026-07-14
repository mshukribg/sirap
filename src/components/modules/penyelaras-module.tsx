'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, formatDateMY, formatDateTimeMY, STATUS_LABEL } from '@/lib/api-client'
import type { SafeProfile } from '@/app/page'
import { GlassCard, PageHeader, StatusBadge, EmptyState, LoadingState } from '@/components/ui-bits'
import { Modal } from '@/components/modules/pengajar-module'
import { toast } from 'sonner'
import {
  ClipboardCheck, Search, Send, ArrowLeft, Eye, CheckSquare, Square, Loader2,
  RotateCcw, AlertCircle,
} from 'lucide-react'

type Aktiviti = {
  id: string
  tarikhPelaksanaan: string
  namaAktiviti: string
  bengkel: { id: string; namaBengkel: string }
  negeri: { id: string; namaNegeri: string }
  daerah: { id: string; namaDaerah: string }
  namaPengurusAktiviti: string
  status: string
  catatanPenolakan: string | null
  pencipta: { id: string; fullName: string; email: string }
  penyemak?: { id: string; fullName: string } | null
  pengesah?: { id: string; fullName: string } | null
  dihantarSemakanPada: string | null
  dihantarPengesahanPada: string | null
  disahkanPada: string | null
  createdAt: string
  updatedAt: string
  auditLogs?: any[]
}

const TABS = [
  { key: 'menunggu_semakan', label: 'Menunggu Semakan' },
  { key: 'menunggu_pengesahan', label: 'Telah Dihantar ke PP' },
  { key: 'disahkan', label: 'Disahkan' },
  { key: 'ditolak', label: 'Ditolak/Dipulangkan' },
]

export function PenyelarasModule({ profile }: { profile: SafeProfile }) {
  const [tab, setTab] = useState('menunggu_semakan')
  const [records, setRecords] = useState<Aktiviti[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [viewing, setViewing] = useState<Aktiviti | null>(null)
  const [returning, setReturning] = useState<Aktiviti | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<{ ok: boolean; data: Aktiviti[] }>('/api/aktiviti', {
        searchParams: { status: tab, q },
      })
      setRecords(r.data)
      setSelected(new Set())
    } catch (e) {
      console.error(e)
      toast.error('Gagal memuatkan data.')
    } finally {
      setLoading(false)
    }
  }, [tab, q])

  useEffect(() => { load() }, [load])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selectAll = () => {
    if (selected.size === records.length) setSelected(new Set())
    else setSelected(new Set(records.map(r => r.id)))
  }

  const handleForward = async (id: string) => {
    try {
      await api(`/api/aktiviti/${id}/review-forward`, { method: 'POST' })
      toast.success('Rekod dihantar kepada Penolong Pengarah.')
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menghantar.')
    }
  }

  const handleBulkForward = async () => {
    if (selected.size === 0) { toast.error('Pilih sekurang-kurangnya satu rekod.'); return }
    if (!confirm(`Hantar ${selected.size} rekod kepada Penolong Pengarah?`)) return
    setBulkLoading(true)
    try {
      const r = await api<{ ok: boolean; count: number }>('/api/aktiviti/bulk-review-forward', {
        method: 'POST', body: { ids: Array.from(selected) },
      })
      toast.success(`${r.count} rekod berjaya dihantar.`)
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menghantar pukal.')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Semakan Aktiviti"
        description="Semak rekod yang dihantar oleh Pengajar, kemudian hantar kepada Penolong Pengarah atau pulangkan jika perlu pembetulan."
      />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-active={tab === t.key}
            className="glass-tab px-3 py-1.5 rounded-md text-xs font-medium"
          >
            {t.label}
          </button>
        ))}
      </div>

      <GlassCard className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Cari nama aktiviti atau pengurus…"
            className="glass-input w-full pl-9 pr-3 py-2 text-sm outline-none"
          />
        </div>
        {tab === 'menunggu_semakan' && records.length > 0 && (
          <>
            <button onClick={selectAll} className="glass-input px-3 py-2 rounded-md text-xs font-medium hover:bg-foreground/5 flex items-center gap-1.5">
              {selected.size === records.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              {selected.size === records.length ? 'Nyahpilih Semua' : 'Pilih Semua'}
            </button>
            <button
              onClick={handleBulkForward}
              disabled={selected.size === 0 || bulkLoading}
              className="btn-brand-gradient px-3 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Hantar Terpilih ke PP ({selected.size})
            </button>
          </>
        )}
      </GlassCard>

      <GlassCard className="overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : records.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Tiada rekod untuk disemak"
            description={tab === 'menunggu_semakan'
              ? 'Semua rekod telah disemak. Rekod baharu dari Pengajar akan muncul di sini.'
              : 'Tiada rekod pada status ini.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-foreground/5 text-xs uppercase tracking-wide text-foreground/70">
                <tr>
                  {tab === 'menunggu_semakan' && <th className="px-3 py-2.5 w-8"></th>}
                  <th className="px-3 py-2.5 text-left">Bil</th>
                  <th className="px-3 py-2.5 text-left">Tarikh</th>
                  <th className="px-3 py-2.5 text-left">Nama Aktiviti</th>
                  <th className="px-3 py-2.5 text-left">Bengkel</th>
                  <th className="px-3 py-2.5 text-left">Lokasi</th>
                  <th className="px-3 py-2.5 text-left">Pengajar</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  <th className="px-3 py-2.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/8">
                {records.map((r, i) => (
                  <tr key={r.id} className="hover:bg-foreground/3 transition">
                    {tab === 'menunggu_semakan' && (
                      <td className="px-3 py-2.5">
                        <button onClick={() => toggleSelect(r.id)} className="p-0.5">
                          {selected.has(r.id) ? <CheckSquare className="w-4 h-4 text-[#12A3A8]" /> : <Square className="w-4 h-4 text-foreground/40" />}
                        </button>
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-foreground/60">{i + 1}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatDateMY(r.tarikhPelaksanaan)}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground line-clamp-1">{r.namaAktiviti}</td>
                    <td className="px-3 py-2.5 text-xs">{r.bengkel.namaBengkel}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <p>{r.daerah.namaDaerah}</p>
                      <p className="text-foreground/60">{r.negeri.namaNegeri}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <p>{r.pencipta.fullName}</p>
                      <p className="text-foreground/60">{r.pencipta.email}</p>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewing(r)} className="p-1.5 rounded hover:bg-foreground/10" title="Lihat Butiran">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {tab === 'menunggu_semakan' && (
                          <>
                            <button onClick={() => handleForward(r.id)} className="p-1.5 rounded hover:bg-[#12A3A8]/15 text-[#12A3A8]" title="Hantar ke Penolong Pengarah">
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setReturning(r)} className="p-1.5 rounded hover:bg-[#E0A800]/15 text-[#E0A800]" title="Pulangkan ke Pengajar">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {viewing && <ViewModal aktiviti={viewing} onClose={() => setViewing(null)} />}
      {returning && (
        <ReturnModal
          aktiviti={returning}
          onClose={() => setReturning(null)}
          onDone={() => { setReturning(null); load() }}
        />
      )}
    </div>
  )
}

function ReturnModal({ aktiviti, onClose, onDone }: { aktiviti: Aktiviti; onClose: () => void; onDone: () => void }) {
  const [catatan, setCatatan] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!catatan.trim()) { setError('Catatan sebab pemulangan adalah wajib.'); return }
    setSaving(true)
    try {
      await api(`/api/aktiviti/${aktiviti.id}/return`, { method: 'POST', body: { catatan } })
      toast.success('Rekod telah dipulangkan kepada Pengajar.')
      onDone()
    } catch (e: any) {
      setError(e.message ?? 'Gagal memulangkan rekod.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Pulangkan Rekod ke Pengajar" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="glass-input p-3 rounded-lg">
          <p className="text-[11px] text-foreground/60">Aktiviti</p>
          <p className="text-sm font-medium text-foreground">{aktiviti.namaAktiviti}</p>
          <p className="text-xs text-foreground/60 mt-0.5">Pengajar: {aktiviti.pencipta.fullName}</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground/80">
            Catatan Sebab Pemulangan <span className="text-[#E4572E]">*</span>
          </label>
          <textarea
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            required
            rows={4}
            maxLength={1000}
            placeholder="Contoh: Maklumat pengurus aktiviti tidak lengkap. Sila kemaskini nama penuh & no. telefon."
            className="glass-input w-full px-3 py-2 text-sm outline-none resize-none"
          />
          <p className="text-[11px] text-foreground/50">{catatan.length}/1000 aksara</p>
        </div>
        {error && (
          <div className="text-xs px-3 py-2 rounded-md bg-[#E4572E]/10 border border-[#E4572E]/30 text-[#b5401f] dark:text-[#f08c6e]">
            {error}
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="glass-input px-4 py-2 rounded-md text-sm font-medium hover:bg-foreground/5">Batal</button>
          <button type="submit" disabled={saving} className="px-5 py-2 rounded-md text-sm font-semibold flex items-center gap-2 bg-[#E0A800] text-white hover:bg-[#c89600] disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Pulangkan
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ViewModal({ aktiviti, onClose }: { aktiviti: Aktiviti; onClose: () => void }) {
  // Reuse the pengajar module's view by fetching full data
  const [full, setFull] = useState<Aktiviti | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ ok: boolean; data: Aktiviti }>(`/api/aktiviti/${aktiviti.id}`)
        setFull(r.data)
      } catch { setFull(aktiviti) }
      finally { setLoading(false) }
    })()
  }, [aktiviti.id])

  if (loading || !full) return <Modal title="Butiran Aktiviti" onClose={onClose}><LoadingState /></Modal>

  return (
    <Modal title="Butiran Aktiviti" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailItem label="Tarikh Pelaksanaan" value={formatDateMY(full.tarikhPelaksanaan)} />
          <DetailItem label="Status" value={<StatusBadge status={full.status} />} />
          <DetailItem label="Bengkel" value={full.bengkel.namaBengkel} />
          <DetailItem label="Negeri" value={full.negeri.namaNegeri} />
          <DetailItem label="Daerah" value={full.daerah.namaDaerah} />
          <DetailItem label="Pengurus Aktiviti" value={full.namaPengurusAktiviti} />
          <DetailItem label="Dicipta Oleh" value={`${full.pencipta.fullName} (${full.pencipta.email})`} />
          <DetailItem label="Dicipta Pada" value={formatDateTimeMY(full.createdAt)} />
          {full.dihantarSemakanPada && <DetailItem label="Dihantar Semakan Pada" value={formatDateTimeMY(full.dihantarSemakanPada)} />}
          {full.penyemak && <DetailItem label="Disemak Oleh" value={full.penyemak.fullName} />}
          {full.dihantarPengesahanPada && <DetailItem label="Dihantar ke PP Pada" value={formatDateTimeMY(full.dihantarPengesahanPada)} />}
          {full.pengesah && <DetailItem label="Disahkan Oleh" value={full.pengesah.fullName} />}
          {full.disahkanPada && <DetailItem label="Disahkan Pada" value={formatDateTimeMY(full.disahkanPada)} />}
        </div>
        <div className="glass-input p-3 rounded-lg">
          <p className="text-xs font-semibold text-foreground/70 mb-1">Nama Aktiviti</p>
          <p className="text-sm text-foreground">{full.namaAktiviti}</p>
        </div>
        {full.catatanPenolakan && (
          <div className="px-3 py-2.5 rounded-lg bg-[#E4572E]/10 border border-[#E4572E]/30">
            <p className="text-xs font-semibold text-[#b5401f] dark:text-[#f08c6e] mb-0.5">Catatan Penolakan / Pemulangan</p>
            <p className="text-sm text-foreground">{full.catatanPenolakan}</p>
          </div>
        )}
        {full.auditLogs && full.auditLogs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-foreground/70 mb-2">Sejarah Audit</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {full.auditLogs.map((l, i) => (
                <div key={l.id ?? i} className="glass-input px-3 py-2 rounded-md text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{l.oleh?.fullName ?? '—'}</span>
                    <span className="text-foreground/50">{formatDateTimeMY(l.diciptaPada)}</span>
                  </div>
                  <p className="text-foreground/70 mt-0.5">
                    <span className="font-mono text-[10px] uppercase bg-foreground/8 px-1.5 py-0.5 rounded">{l.tindakan}</span>
                    {' '}{l.catatan}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={onClose} className="glass-input px-4 py-2 rounded-md text-sm font-medium hover:bg-foreground/5">Tutup</button>
        </div>
      </div>
    </Modal>
  )
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="glass-input px-3 py-2 rounded-lg">
      <p className="text-[11px] text-foreground/60">{label}</p>
      <p className="text-sm text-foreground font-medium mt-0.5">{value}</p>
    </div>
  )
}
