'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, STATUS_LABEL, formatDateMY, formatDateTimeMY } from '@/lib/api-client'
import type { SafeProfile } from '@/app/page'
import { GlassCard, PageHeader, StatusBadge, EmptyState, LoadingState } from '@/components/ui-bits'
import { Modal } from '@/components/modules/pengajar-module'
import { useReferenceData } from '@/components/use-reference-data'
import { toast } from 'sonner'
import {
  FolderCog, Search, Download, Eye, ChevronLeft, ChevronRight,
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

const PAGE_SIZE = 10

export function AllActivitiesModule({ profile }: { profile: SafeProfile }) {
  const { bengkelList, negeriList, daerahList } = useReferenceData()
  const [records, setRecords] = useState<Aktiviti[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('disahkan')
  const [bengkelFilter, setBengkelFilter] = useState('')
  const [negeriFilter, setNegeriFilter] = useState('')
  const [daerahFilter, setDaerahFilter] = useState('')
  const [sort, setSort] = useState('tarikhPelaksanaan')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [viewing, setViewing] = useState<Aktiviti | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<{ ok: boolean; data: Aktiviti[]; pagination: any }>('/api/aktiviti', {
        searchParams: {
          status: statusFilter, q,
          bengkelId: bengkelFilter, negeriId: negeriFilter, daerahId: daerahFilter,
          sort, order,
          page: String(page), pageSize: String(PAGE_SIZE),
        },
      })
      setRecords(r.data)
      setTotal(r.pagination.total)
      setTotalPages(r.pagination.totalPages)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, q, bengkelFilter, negeriFilter, daerahFilter, sort, order, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [statusFilter, q, bengkelFilter, negeriFilter, daerahFilter, sort, order])

  const handleExport = () => {
    const params = new URLSearchParams({ format: 'excel' })
    if (negeriFilter) params.set('negeriId', negeriFilter)
    if (daerahFilter) params.set('daerahId', daerahFilter)
    if (bengkelFilter) params.set('bengkelId', bengkelFilter)
    window.open(`/api/aktiviti/export?${params.toString()}`, '_blank')
  }

  const filteredDaerah = daerahList.filter(d => d.negeriId === negeriFilter)

  const toggleSort = (col: string) => {
    if (sort === col) setOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSort(col); setOrder('asc') }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Senarai Aktiviti"
        description="Paparan jadual penuh semua rekod aktiviti dengan carian, penapisan, penyusunan & penomboran."
        actions={
          <button onClick={handleExport} className="glass-input px-4 py-2 rounded-md text-sm font-medium hover:bg-foreground/5 flex items-center gap-2">
            <Download className="w-4 h-4" /> Eksport CSV (Disahkan)
          </button>
        }
      />

      <GlassCard className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input
              type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Cari nama aktiviti / pengurus…"
              className="glass-input w-full pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="glass-input px-3 py-2 text-sm outline-none">
            <option value="">Semua Status</option>
            <option value="draf">Draf</option>
            <option value="menunggu_semakan">Menunggu Semakan</option>
            <option value="menunggu_pengesahan">Menunggu Pengesahan</option>
            <option value="disahkan">Disahkan</option>
            <option value="ditolak">Ditolak</option>
          </select>
          <select value={bengkelFilter} onChange={e => setBengkelFilter(e.target.value)}
            className="glass-input px-3 py-2 text-sm outline-none">
            <option value="">Semua Bengkel</option>
            {bengkelList.map(b => <option key={b.id} value={b.id}>{b.namaBengkel}</option>)}
          </select>
          <select value={negeriFilter} onChange={e => { setNegeriFilter(e.target.value); setDaerahFilter('') }}
            className="glass-input px-3 py-2 text-sm outline-none">
            <option value="">Semua Negeri</option>
            {negeriList.map(n => <option key={n.id} value={n.id}>{n.namaNegeri}</option>)}
          </select>
          {negeriFilter && (
            <select value={daerahFilter} onChange={e => setDaerahFilter(e.target.value)}
              className="glass-input px-3 py-2 text-sm outline-none">
              <option value="">Semua Daerah</option>
              {filteredDaerah.map(d => <option key={d.id} value={d.id}>{d.namaDaerah}</option>)}
            </select>
          )}
          <div className="flex items-center gap-2 text-xs text-foreground/60">
            <select value={`${sort}:${order}`} onChange={e => { const [s, o] = e.target.value.split(':'); setSort(s); setOrder(o as any) }}
              className="glass-input px-3 py-2 text-sm outline-none">
              <option value="tarikhPelaksanaan:desc">Tarikh (Terbaru)</option>
              <option value="tarikhPelaksanaan:asc">Tarikh (Terlama)</option>
              <option value="namaAktiviti:asc">Nama (A→Z)</option>
              <option value="namaAktiviti:desc">Nama (Z→A)</option>
              <option value="createdAt:desc">Dicipta (Terbaru)</option>
              <option value="updatedAt:desc">Dikemaskini (Terbaru)</option>
            </select>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : records.length === 0 ? (
          <EmptyState icon={FolderCog} title="Tiada rekod" description="Tukar penapis atau kata carian." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-foreground/5 text-xs uppercase text-foreground/70">
                <tr>
                  <th className="px-3 py-2.5 text-left cursor-pointer hover:bg-foreground/8" onClick={() => toggleSort('tarikhPelaksanaan')}>Bil</th>
                  <th className="px-3 py-2.5 text-left cursor-pointer hover:bg-foreground/8" onClick={() => toggleSort('tarikhPelaksanaan')}>
                    Tarikh {sort === 'tarikhPelaksanaan' && (order === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-3 py-2.5 text-left cursor-pointer hover:bg-foreground/8" onClick={() => toggleSort('namaAktiviti')}>
                    Nama Aktiviti {sort === 'namaAktiviti' && (order === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-3 py-2.5 text-left">Bengkel</th>
                  <th className="px-3 py-2.5 text-left">Daerah</th>
                  <th className="px-3 py-2.5 text-left">Negeri</th>
                  <th className="px-3 py-2.5 text-left">Pengurus</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  <th className="px-3 py-2.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/8">
                {records.map((r, i) => (
                  <tr key={r.id} className="hover:bg-foreground/3">
                    <td className="px-3 py-2.5 text-foreground/60">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatDateMY(r.tarikhPelaksanaan)}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground line-clamp-1">{r.namaAktiviti}</td>
                    <td className="px-3 py-2.5 text-xs">{r.bengkel.namaBengkel}</td>
                    <td className="px-3 py-2.5 text-xs">{r.daerah.namaDaerah}</td>
                    <td className="px-3 py-2.5 text-xs">{r.negeri.namaNegeri}</td>
                    <td className="px-3 py-2.5 text-xs">{r.namaPengurusAktiviti}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => setViewing(r)} className="p-1.5 rounded hover:bg-foreground/10" title="Lihat">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="text-foreground/60">
            Menunjukkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} daripada {total} rekod
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="glass-input px-2.5 py-1.5 rounded-md font-medium disabled:opacity-50 flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Sebelum
            </button>
            <span className="text-foreground/70 px-2">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="glass-input px-2.5 py-1.5 rounded-md font-medium disabled:opacity-50 flex items-center gap-1">
              Seterus <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {viewing && <ViewModal aktiviti={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

function ViewModal({ aktiviti, onClose }: { aktiviti: Aktiviti; onClose: () => void }) {
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
          <DetailItem label="Pengajar" value={`${full.pencipta.fullName} (${full.pencipta.email})`} />
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
