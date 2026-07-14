'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, STATUS_LABEL, formatDateMY, formatDateTimeMY } from '@/lib/api-client'
import type { SafeProfile } from '@/app/page'
import { GlassCard, PageHeader, StatusBadge, EmptyState, LoadingState } from '@/components/ui-bits'
import { useReferenceData } from '@/components/use-reference-data'
import { toast } from 'sonner'
import {
  FileText, Plus, Search, Send, Trash2, Edit, Eye, X, CheckSquare, Square,
  Loader2, AlertCircle, Calendar, MapPin, User, ChevronLeft, History,
} from 'lucide-react'

type Aktiviti = {
  id: string
  tarikhPelaksanaan: string
  namaAktiviti: string
  bengkelId: string
  negeriId: string
  daerahId: string
  namaPengurusAktiviti: string
  status: string
  catatanPenolakan: string | null
  diciptaOleh: string
  disemakOleh: string | null
  disahkanOleh: string | null
  dihantarSemakanPada: string | null
  dihantarPengesahanPada: string | null
  disahkanPada: string | null
  createdAt: string
  updatedAt: string
  bengkel: { id: string; namaBengkel: string }
  negeri: { id: string; namaNegeri: string }
  daerah: { id: string; namaDaerah: string }
  pencipta: { id: string; fullName: string; email: string }
  penyemak?: { id: string; fullName: string } | null
  pengesah?: { id: string; fullName: string } | null
  auditLogs?: any[]
}

const STATUS_TABS = [
  { key: 'draf', label: 'Draf' },
  { key: 'menunggu_semakan', label: 'Menunggu Semakan' },
  { key: 'menunggu_pengesahan', label: 'Menunggu Pengesahan' },
  { key: 'disahkan', label: 'Disahkan' },
  { key: 'ditolak', label: 'Ditolak' },
  { key: '', label: 'Semua' },
]

export function PengajarModule({ profile }: { profile: SafeProfile }) {
  const { bengkelList, negeriList, daerahList, loading: refLoading } = useReferenceData()
  const [tab, setTab] = useState('draf')
  const [records, setRecords] = useState<Aktiviti[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Aktiviti | null>(null)
  const [viewing, setViewing] = useState<Aktiviti | null>(null)
  const [submittingBulk, setSubmittingBulk] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<{ ok: boolean; data: Aktiviti[] }>('/api/aktiviti', {
        searchParams: { status: tab || undefined, q },
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Padam draf "${name}"? Tindakan ini tidak boleh diundur.`)) return
    try {
      await api(`/api/aktiviti/${id}`, { method: 'DELETE' })
      toast.success('Draf berjaya dipadam.')
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memadam.')
    }
  }

  const handleSubmit = async (id: string) => {
    try {
      await api(`/api/aktiviti/${id}/submit`, { method: 'POST' })
      toast.success('Rekod berjaya dihantar kepada Penyelaras.')
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menghantar.')
    }
  }

  const handleBulkSubmit = async () => {
    if (selected.size === 0) {
      toast.error('Pilih sekurang-kurangnya satu rekod.')
      return
    }
    if (!confirm(`Hantar ${selected.size} rekod kepada Penyelaras?`)) return
    setSubmittingBulk(true)
    try {
      const r = await api<{ ok: boolean; count: number }>('/api/aktiviti/bulk-submit', {
        method: 'POST', body: { ids: Array.from(selected) },
      })
      toast.success(`${r.count} rekod berjaya dihantar.`)
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menghantar pukal.')
    } finally {
      setSubmittingBulk(false)
    }
  }

  const counts = records.length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Aktiviti Saya"
        description="Cipta, edit, padam & hantar rekod aktiviti pelajar kepada Penyelaras."
        actions={
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="btn-brand-gradient px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Cipta Aktiviti Baharu
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map(t => (
          <button
            key={t.key || 'all'}
            onClick={() => setTab(t.key)}
            data-active={tab === t.key}
            className="glass-tab px-3 py-1.5 rounded-md text-xs font-medium"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + bulk actions */}
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
        {tab === 'draf' && records.length > 0 && (
          <>
            <button
              onClick={selectAll}
              className="glass-input px-3 py-2 rounded-md text-xs font-medium hover:bg-foreground/5 transition flex items-center gap-1.5"
            >
              {selected.size === records.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              {selected.size === records.length ? 'Nyahpilih Semua' : 'Pilih Semua'}
            </button>
            <button
              onClick={handleBulkSubmit}
              disabled={selected.size === 0 || submittingBulk}
              className="btn-brand-gradient px-3 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {submittingBulk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Hantar Terpilih ({selected.size})
            </button>
          </>
        )}
      </GlassCard>

      {/* Records table */}
      <GlassCard className="overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : records.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Tiada rekod"
            description={tab === 'draf'
              ? 'Klik "Cipta Aktiviti Baharu" untuk menambah rekod draf.'
              : 'Tiada rekod pada status ini buat masa kini.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-foreground/5 text-xs uppercase tracking-wide text-foreground/70">
                <tr>
                  {tab === 'draf' && <th className="px-3 py-2.5 w-8"></th>}
                  <th className="px-3 py-2.5 text-left">Bil</th>
                  <th className="px-3 py-2.5 text-left">Tarikh</th>
                  <th className="px-3 py-2.5 text-left">Nama Aktiviti</th>
                  <th className="px-3 py-2.5 text-left">Bengkel</th>
                  <th className="px-3 py-2.5 text-left">Lokasi</th>
                  <th className="px-3 py-2.5 text-left">Pengurus</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  <th className="px-3 py-2.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/8">
                {records.map((r, i) => (
                  <tr key={r.id} className="hover:bg-foreground/3 transition">
                    {tab === 'draf' && (
                      <td className="px-3 py-2.5">
                        <button onClick={() => toggleSelect(r.id)} className="p-0.5">
                          {selected.has(r.id)
                            ? <CheckSquare className="w-4 h-4 text-[#12A3A8]" />
                            : <Square className="w-4 h-4 text-foreground/40" />}
                        </button>
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-foreground/60">{i + 1}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatDateMY(r.tarikhPelaksanaan)}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-foreground line-clamp-1">{r.namaAktiviti}</p>
                      {r.catatanPenolakan && (
                        <p className="text-[11px] text-[#b5401f] dark:text-[#f08c6e] line-clamp-1 mt-0.5">
                          ⚠ {r.catatanPenolakan}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{r.bengkel.namaBengkel}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <p>{r.daerah.namaDaerah}</p>
                      <p className="text-foreground/60">{r.negeri.namaNegeri}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{r.namaPengurusAktiviti}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewing(r)} className="p-1.5 rounded hover:bg-foreground/10" title="Lihat Butiran">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {r.status === 'draf' && (
                          <>
                            <button onClick={() => { setEditing(r); setShowForm(true) }} className="p-1.5 rounded hover:bg-foreground/10" title="Edit">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleSubmit(r.id)} className="p-1.5 rounded hover:bg-[#12A3A8]/15 text-[#12A3A8]" title="Hantar">
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(r.id, r.namaAktiviti)} className="p-1.5 rounded hover:bg-[#E4572E]/15 text-[#E4572E]" title="Padam">
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Create/Edit Form Modal */}
      {showForm && (
        <AktivitiForm
          profile={profile}
          editing={editing}
          bengkelList={bengkelList}
          negeriList={negeriList}
          daerahList={daerahList}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); load() }}
        />
      )}

      {/* View Modal */}
      {viewing && (
        <ViewModal aktiviti={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AktivitiForm (create or edit a draft)
// ---------------------------------------------------------------------------

function AktivitiForm({ profile, editing, bengkelList, negeriList, daerahList, onClose, onSaved }: {
  profile: SafeProfile
  editing: Aktiviti | null
  bengkelList: { id: string; namaBengkel: string }[]
  negeriList: { id: string; namaNegeri: string }[]
  daerahList: { id: string; namaDaerah: string; negeriId: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [tarikh, setTarikh] = useState(editing?.tarikhPelaksanaan.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [nama, setNama] = useState(editing?.namaAktiviti ?? '')
  const [bengkelId, setBengkelId] = useState(editing?.bengkelId ?? profile.bengkel?.id ?? '')
  const [negeriId, setNegeriId] = useState(editing?.negeriId ?? '')
  const [daerahId, setDaerahId] = useState(editing?.daerahId ?? '')
  const [pengurus, setPengurus] = useState(editing?.namaPengurusAktiviti ?? profile.fullName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const filteredDaerah = daerahList.filter(d => d.negeriId === negeriId)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!nama.trim() || !bengkelId || !negeriId || !daerahId || !pengurus.trim() || !tarikh) {
      setError('Sila lengkapkan semua medan.')
      return
    }
    setSaving(true)
    try {
      const body = {
        tarikhPelaksanaan: tarikh,
        namaAktiviti: nama,
        bengkelId, negeriId, daerahId,
        namaPengurusAktiviti: pengurus,
      }
      if (editing) {
        await api(`/api/aktiviti/${editing.id}`, { method: 'PUT', body })
        toast.success('Draf berjaya dikemaskini.')
      } else {
        await api('/api/aktiviti', { method: 'POST', body })
        toast.success('Draf berjaya dicipta.')
      }
      onSaved()
    } catch (e: any) {
      setError(e.message ?? 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={editing ? 'Edit Draf Aktiviti' : 'Cipta Aktiviti Baharu'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tarikh Pelaksanaan" icon={Calendar} required>
            <input type="date" value={tarikh} onChange={e => setTarikh(e.target.value)} required
              className="glass-input w-full px-3 py-2 text-sm outline-none" />
          </Field>
          <Field label="Nama Pengurus Aktiviti" icon={User} required>
            <input type="text" value={pengurus} onChange={e => setPengurus(e.target.value)} required maxLength={200}
              className="glass-input w-full px-3 py-2 text-sm outline-none" />
          </Field>
        </div>
        <Field label="Nama Aktiviti" required>
          <input type="text" value={nama} onChange={e => setNama(e.target.value)} required maxLength={300}
            placeholder="Contoh: Lawatan Industri ke Pabrik Automotif"
            className="glass-input w-full px-3 py-2 text-sm outline-none" />
        </Field>
        <Field label="Bengkel Terlibat" required>
          <select value={bengkelId} onChange={e => setBengkelId(e.target.value)} required
            className="glass-input w-full px-3 py-2 text-sm outline-none">
            <option value="">— Pilih Bengkel —</option>
            {bengkelList.map(b => <option key={b.id} value={b.id}>{b.namaBengkel}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Negeri" icon={MapPin} required>
            <select value={negeriId} onChange={e => { setNegeriId(e.target.value); setDaerahId('') }} required
              className="glass-input w-full px-3 py-2 text-sm outline-none">
              <option value="">— Pilih Negeri —</option>
              {negeriList.map(n => <option key={n.id} value={n.id}>{n.namaNegeri}</option>)}
            </select>
          </Field>
          <Field label="Daerah" required>
            <select value={daerahId} onChange={e => setDaerahId(e.target.value)} required disabled={!negeriId}
              className="glass-input w-full px-3 py-2 text-sm outline-none disabled:opacity-50">
              <option value="">— Pilih Daerah —</option>
              {filteredDaerah.map(d => <option key={d.id} value={d.id}>{d.namaDaerah}</option>)}
            </select>
          </Field>
        </div>

        {error && (
          <div className="text-xs px-3 py-2 rounded-md bg-[#E4572E]/10 border border-[#E4572E]/30 text-[#b5401f] dark:text-[#f08c6e]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="glass-input px-4 py-2 rounded-md text-sm font-medium hover:bg-foreground/5">
            Batal
          </button>
          <button type="submit" disabled={saving} className="btn-brand-gradient px-5 py-2 rounded-md text-sm font-semibold flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
            {editing ? 'Simpan Kemaskini' : 'Simpan Draf'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, icon: Icon, required, children }: { label: string; icon?: any; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-foreground/60" />}
        {label}{required && <span className="text-[#E4572E]">*</span>}
      </label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className={`glass-card-strong w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto p-5 sm:p-6`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-foreground/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// View Modal — full details + audit history
// ---------------------------------------------------------------------------

function ViewModal({ aktiviti, onClose }: { aktiviti: Aktiviti; onClose: () => void }) {
  const [full, setFull] = useState<Aktiviti | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ ok: boolean; data: Aktiviti }>(`/api/aktiviti/${aktiviti.id}`)
        setFull(r.data)
      } catch (e) {
        setFull(aktiviti) // fallback to passed data
      } finally {
        setLoading(false)
      }
    })()
  }, [aktiviti.id])

  if (loading || !full) {
    return <Modal title="Butiran Aktiviti" onClose={onClose}><LoadingState /></Modal>
  }

  return (
    <Modal title="Butiran Aktiviti" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailItem label="Tarikh Pelaksanaan" value={formatDateMY(full.tarikhPelaksanaan)} icon={Calendar} />
          <DetailItem label="Status" value={<StatusBadge status={full.status} />} />
          <DetailItem label="Bengkel" value={full.bengkel.namaBengkel} />
          <DetailItem label="Negeri" value={full.negeri.namaNegeri} icon={MapPin} />
          <DetailItem label="Daerah" value={full.daerah.namaDaerah} icon={MapPin} />
          <DetailItem label="Pengurus Aktiviti" value={full.namaPengurusAktiviti} icon={User} />
          <DetailItem label="Dicipta Oleh" value={full.pencipta.fullName} />
          <DetailItem label="Dicipta Pada" value={formatDateTimeMY(full.createdAt)} />
          {full.penyemak && <DetailItem label="Disemak Oleh" value={full.penyemak.fullName} />}
          {full.dihantarSemakanPada && <DetailItem label="Dihantar Semakan Pada" value={formatDateTimeMY(full.dihantarSemakanPada)} />}
          {full.pengesah && <DetailItem label="Disahkan Oleh" value={full.pengesah.fullName} />}
          {full.disahkanPada && <DetailItem label="Disahkan Pada" value={formatDateTimeMY(full.disahkanPada)} />}
        </div>

        <div className="glass-input p-3 rounded-lg">
          <p className="text-xs font-semibold text-foreground/70 mb-1">Nama Aktiviti</p>
          <p className="text-sm text-foreground">{full.namaAktiviti}</p>
        </div>

        {full.catatanPenolakan && (
          <div className="px-3 py-2.5 rounded-lg bg-[#E4572E]/10 border border-[#E4572E]/30">
            <p className="text-xs font-semibold text-[#b5401f] dark:text-[#f08c6e] mb-0.5">⚠ Catatan Penolakan / Pemulangan</p>
            <p className="text-sm text-foreground">{full.catatanPenolakan}</p>
          </div>
        )}

        {full.auditLogs && full.auditLogs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Sejarah Audit
            </p>
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
          <button onClick={onClose} className="glass-input px-4 py-2 rounded-md text-sm font-medium hover:bg-foreground/5">
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  )
}

function DetailItem({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) {
  return (
    <div className="glass-input px-3 py-2 rounded-lg">
      <p className="text-[11px] text-foreground/60 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </p>
      <p className="text-sm text-foreground font-medium mt-0.5">{value}</p>
    </div>
  )
}
