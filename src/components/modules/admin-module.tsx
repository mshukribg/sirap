'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, ROLE_LABEL, formatDateTimeMY, formatDateMY } from '@/lib/api-client'
import type { SafeProfile } from '@/app/page'
import { GlassCard, PageHeader, EmptyState, LoadingState } from '@/components/ui-bits'
import { Modal } from '@/components/modules/pengajar-module'
import { useReferenceData } from '@/components/use-reference-data'
import { toast } from 'sonner'
import {
  Users, Plus, Search, Edit, UserX, UserCheck, ShieldCheck, MapPin, Settings,
  History, Loader2, Trash2, Eye, Building2,
} from 'lucide-react'

type AdminUser = {
  id: string
  email: string
  fullName: string
  role: string
  roleLabel: string
  active: boolean
  bengkel: { id: string; namaBengkel: string } | null
  createdAt: string
}

type AuditLog = {
  id: number
  aktivitiId: string
  tindakan: string
  olehId: string
  catatan: string | null
  diciptaPada: string
  oleh: { id: string; fullName: string; role: string; email: string }
  aktiviti: { id: string; namaAktiviti: string; status: string } | null
}

const TABS = [
  { key: 'users', label: 'Pengguna', icon: Users },
  { key: 'bengkel', label: 'Bengkel', icon: Building2 },
  { key: 'negeri', label: 'Negeri & Daerah', icon: MapPin },
  { key: 'audit', label: 'Log Audit', icon: History },
]

const ROLES = [
  { value: 'pengajar', label: 'Pengajar' },
  { value: 'penyelaras', label: 'Penyelaras' },
  { value: 'penolong_pengarah', label: 'Penolong Pengarah' },
  { value: 'admin', label: 'Admin' },
]

export function AdminModule({ profile }: { profile: SafeProfile }) {
  const [tab, setTab] = useState('users')

  return (
    <div className="space-y-4">
      <PageHeader title="Pentadbiran Sistem" description="Urus akaun pengguna, data rujukan, dan lihat log audit." />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)} data-active={tab === t.key}
              className="glass-tab px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'bengkel' && <BengkelTab />}
      {tab === 'negeri' && <NegeriTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------

function UsersTab() {
  const { bengkelList, loading: refLoading } = useReferenceData()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<{ ok: boolean; data: AdminUser[] }>('/api/admin/users', {
        searchParams: { q, role: roleFilter },
      })
      setUsers(r.data)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan pengguna.')
    } finally {
      setLoading(false)
    }
  }, [q, roleFilter])

  useEffect(() => { load() }, [load])

  const handleToggleActive = async (u: AdminUser) => {
    const action = u.active ? 'Nyahaktif' : 'Aktifkan'
    if (!confirm(`${action} akaun "${u.fullName}"?`)) return
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'PUT', body: { active: !u.active } })
      toast.success(`Akaun telah ${u.active ? 'dinyahaktifkan' : 'diaktifkan'}.`)
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal.')
    }
  }

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`Padam akaun "${u.fullName}"? Akaun akan dinyahaktifkan & semua sesi akan ditamatkan.`)) return
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'DELETE' })
      toast.success('Akaun telah dinyahaktifkan.')
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal.')
    }
  }

  return (
    <div className="space-y-3">
      <GlassCard className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
          <input
            type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari nama atau e-mel…"
            className="glass-input w-full pl-9 pr-3 py-2 text-sm outline-none"
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="glass-input px-3 py-2 text-sm outline-none">
          <option value="">Semua Peranan</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button onClick={() => setCreating(true)} className="btn-brand-gradient px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Pengguna Baharu
        </button>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="Tiada pengguna" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-foreground/5 text-xs uppercase text-foreground/70">
                <tr>
                  <th className="px-3 py-2.5 text-left">Nama</th>
                  <th className="px-3 py-2.5 text-left">E-mel</th>
                  <th className="px-3 py-2.5 text-left">Peranan</th>
                  <th className="px-3 py-2.5 text-left">Bengkel</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  <th className="px-3 py-2.5 text-left">Dicipta</th>
                  <th className="px-3 py-2.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/8">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-foreground/3">
                    <td className="px-3 py-2.5 font-medium">{u.fullName}</td>
                    <td className="px-3 py-2.5 text-xs">{u.email}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#12A3A8]/15 text-[#12A3A8]">
                        {u.roleLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{u.bengkel?.namaBengkel ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${u.active ? 'bg-[#2FBF71]/15 text-[#2FBF71]' : 'bg-[#E4572E]/15 text-[#E4572E]'}`}>
                        {u.active ? 'Aktif' : 'Nyahaktif'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-foreground/60">{formatDateMY(u.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(u)} className="p-1.5 rounded hover:bg-foreground/10" title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleToggleActive(u)} className={`p-1.5 rounded hover:bg-foreground/10 ${u.active ? 'text-[#E0A800]' : 'text-[#2FBF71]'}`} title={u.active ? 'Nyahaktif' : 'Aktifkan'}>
                          {u.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => handleDelete(u)} className="p-1.5 rounded hover:bg-[#E4572E]/15 text-[#E4572E]" title="Padam">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {(creating || editing) && (
        <UserFormModal
          user={editing}
          bengkelList={bengkelList}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function UserFormModal({ user, bengkelList, onClose, onSaved }: {
  user: AdminUser | null
  bengkelList: { id: string; namaBengkel: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(user?.role ?? 'pengajar')
  const [bengkelId, setBengkelId] = useState(user?.bengkel?.id ?? '')
  const [active, setActive] = useState(user?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!fullName.trim() || !email.trim()) { setError('Nama & e-mel diperlukan.'); return }
    if (!user && !password) { setError('Kata laluan diperlukan untuk pengguna baharu.'); return }
    setSaving(true)
    try {
      const body: any = { fullName, email, role, bengkelId: role === 'pengajar' ? (bengkelId || null) : null, active }
      if (password) body.password = password
      if (user) {
        await api(`/api/admin/users/${user.id}`, { method: 'PUT', body })
        toast.success('Pengguna berjaya dikemaskini.')
      } else {
        await api('/api/admin/users', { method: 'POST', body })
        toast.success('Pengguna baharu berjaya dicipta.')
      }
      onSaved()
    } catch (e: any) {
      setError(e.message ?? 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={user ? 'Edit Pengguna' : 'Pengguna Baharu'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">Nama Penuh <span className="text-[#E4572E]">*</span></label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required maxLength={200}
              className="glass-input w-full px-3 py-2 text-sm outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">E-mel <span className="text-[#E4572E]">*</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value.toLowerCase())} required maxLength={254}
              className="glass-input w-full px-3 py-2 text-sm outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">
              Kata Laluan {!user && <span className="text-[#E4572E]">*</span>}
              {user && <span className="text-foreground/50 font-normal"> (kosongkan jika tidak diubah)</span>}
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} maxLength={128}
              placeholder="Min 8 aksara, huruf & nombor"
              className="glass-input w-full px-3 py-2 text-sm outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">Peranan</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="glass-input w-full px-3 py-2 text-sm outline-none">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {role === 'pengajar' && (
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-foreground/80">Bengkel</label>
              <select value={bengkelId} onChange={e => setBengkelId(e.target.value)}
                className="glass-input w-full px-3 py-2 text-sm outline-none">
                <option value="">— Tiada —</option>
                {bengkelList.map(b => <option key={b.id} value={b.id}>{b.namaBengkel}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2 flex items-center gap-2">
            <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)}
              className="w-4 h-4 rounded" />
            <label htmlFor="active" className="text-sm font-medium text-foreground/80">Akaun Aktif</label>
          </div>
        </div>

        {error && (
          <div className="text-xs px-3 py-2 rounded-md bg-[#E4572E]/10 border border-[#E4572E]/30 text-[#b5401f] dark:text-[#f08c6e]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="glass-input px-4 py-2 rounded-md text-sm font-medium hover:bg-foreground/5">Batal</button>
          <button type="submit" disabled={saving} className="btn-brand-gradient px-5 py-2 rounded-md text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {user ? 'Simpan' : 'Cipta'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Bengkel tab
// ---------------------------------------------------------------------------

function BengkelTab() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<{ ok: boolean; data: any[] }>('/api/admin/bengkel')
      setList(r.data)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    try {
      await api('/api/admin/bengkel', { method: 'POST', body: { namaBengkel: newName } })
      toast.success('Bengkel berjaya ditambah.')
      setNewName('')
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menambah.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <GlassCard className="p-5">
      <h3 className="font-semibold text-foreground mb-3">Senarai Bengkel</h3>
      <form onSubmit={add} className="flex gap-2 mb-4">
        <input
          type="text" value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="Nama bengkel baharu…"
          className="glass-input flex-1 px-3 py-2 text-sm outline-none"
        />
        <button type="submit" disabled={adding} className="btn-brand-gradient px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Tambah
        </button>
      </form>

      {loading ? <LoadingState /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-xs uppercase text-foreground/70">
              <tr>
                <th className="px-3 py-2 text-left">Bil</th>
                <th className="px-3 py-2 text-left">Nama Bengkel</th>
                <th className="px-3 py-2 text-right">Bil. Pengguna</th>
                <th className="px-3 py-2 text-right">Bil. Aktiviti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/8">
              {list.map((b, i) => (
                <tr key={b.id} className="hover:bg-foreground/3">
                  <td className="px-3 py-2 text-foreground/60">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{b.namaBengkel}</td>
                  <td className="px-3 py-2 text-right">{b._count?.profiles ?? 0}</td>
                  <td className="px-3 py-2 text-right">{b._count?.aktiviti ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  )
}

// ---------------------------------------------------------------------------
// Negeri & Daerah tab
// ---------------------------------------------------------------------------

function NegeriTab() {
  const [negeri, setNegeri] = useState<any[]>([])
  const [daerah, setDaerah] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newNegeri, setNewNegeri] = useState('')
  const [newDaerah, setNewDaerah] = useState('')
  const [newDaerahNegeriId, setNewDaerahNegeriId] = useState('')
  const [adding, setAdding] = useState<'negeri' | 'daerah' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [n, d] = await Promise.all([
        api<{ ok: boolean; data: any[] }>('/api/admin/negeri'),
        api<{ ok: boolean; data: any[] }>('/api/admin/daerah'),
      ])
      setNegeri(n.data)
      setDaerah(d.data)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addNegeri = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNegeri.trim()) return
    setAdding('negeri')
    try {
      await api('/api/admin/negeri', { method: 'POST', body: { namaNegeri: newNegeri } })
      toast.success('Negeri berjaya ditambah.')
      setNewNegeri('')
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal.')
    } finally {
      setAdding(null)
    }
  }
  const addDaerah = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDaerah.trim() || !newDaerahNegeriId) return
    setAdding('daerah')
    try {
      await api('/api/admin/daerah', { method: 'POST', body: { namaDaerah: newDaerah, negeriId: newDaerahNegeriId } })
      toast.success('Daerah berjaya ditambah.')
      setNewDaerah('')
      setNewDaerahNegeriId('')
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal.')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <GlassCard className="p-5">
        <h3 className="font-semibold text-foreground mb-3">Senarai Negeri ({negeri.length})</h3>
        <form onSubmit={addNegeri} className="flex gap-2 mb-3">
          <input
            type="text" value={newNegeri} onChange={e => setNewNegeri(e.target.value)}
            placeholder="Nama negeri baharu…"
            className="glass-input flex-1 px-3 py-2 text-sm outline-none"
          />
          <button type="submit" disabled={adding === 'negeri'} className="btn-brand-gradient px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5">
            {adding === 'negeri' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Tambah
          </button>
        </form>
        {loading ? <LoadingState /> : (
          <div className="max-h-96 overflow-y-auto pr-1 space-y-1">
            {negeri.map(n => (
              <div key={n.id} className="glass-input px-3 py-2 rounded-md text-sm flex items-center justify-between">
                <span className="font-medium">{n.namaNegeri}</span>
                <span className="text-xs text-foreground/50">{n._count?.daerah ?? 0} daerah · {n._count?.aktiviti ?? 0} aktiviti</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-5">
        <h3 className="font-semibold text-foreground mb-3">Senarai Daerah ({daerah.length})</h3>
        <form onSubmit={addDaerah} className="space-y-2 mb-3">
          <select value={newDaerahNegeriId} onChange={e => setNewDaerahNegeriId(e.target.value)}
            className="glass-input w-full px-3 py-2 text-sm outline-none">
            <option value="">— Pilih Negeri —</option>
            {negeri.map(n => <option key={n.id} value={n.id}>{n.namaNegeri}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              type="text" value={newDaerah} onChange={e => setNewDaerah(e.target.value)}
              placeholder="Nama daerah baharu…"
              className="glass-input flex-1 px-3 py-2 text-sm outline-none"
            />
            <button type="submit" disabled={adding === 'daerah' || !newDaerahNegeriId} className="btn-brand-gradient px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50">
              {adding === 'daerah' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Tambah
            </button>
          </div>
        </form>
        {loading ? <LoadingState /> : (
          <div className="max-h-96 overflow-y-auto pr-1 space-y-1">
            {daerah.map(d => (
              <div key={d.id} className="glass-input px-3 py-2 rounded-md text-sm flex items-center justify-between">
                <div>
                  <span className="font-medium">{d.namaDaerah}</span>
                  <span className="text-xs text-foreground/50 ml-2">· {d.negeri?.namaNegeri}</span>
                </div>
                <span className="text-xs text-foreground/50">{d._count?.aktiviti ?? 0} aktiviti</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Audit tab
// ---------------------------------------------------------------------------

function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [tindakanFilter, setTindakanFilter] = useState('')
  const [viewing, setViewing] = useState<AuditLog | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<{ ok: boolean; data: AuditLog[]; pagination: any }>('/api/admin/audit-log', {
        searchParams: { tindakan: tindakanFilter, page: String(page), pageSize: '25' },
      })
      setLogs(r.data)
      setTotalPages(r.pagination.totalPages)
      setTotal(r.pagination.total)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan log.')
    } finally {
      setLoading(false)
    }
  }, [tindakanFilter, page])

  useEffect(() => { load() }, [load])

  const TINDAKAN_OPTIONS = ['create', 'update', 'delete', 'submit', 'review_forward', 'return', 'approve', 'reject', 'bulk_submit', 'bulk_review_forward', 'bulk_approve']

  return (
    <div className="space-y-3">
      <GlassCard className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <select value={tindakanFilter} onChange={e => { setTindakanFilter(e.target.value); setPage(1) }}
          className="glass-input px-3 py-2 text-sm outline-none">
          <option value="">Semua Tindakan</option>
          {TINDAKAN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="text-xs text-foreground/60 sm:ml-auto">
          {total} rekod · Halaman {page} / {totalPages}
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : logs.length === 0 ? (
          <EmptyState icon={History} title="Tiada log" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-foreground/5 text-xs uppercase text-foreground/70">
                <tr>
                  <th className="px-3 py-2.5 text-left">Tarikh/Masa</th>
                  <th className="px-3 py-2.5 text-left">Pengguna</th>
                  <th className="px-3 py-2.5 text-left">Peranan</th>
                  <th className="px-3 py-2.5 text-left">Tindakan</th>
                  <th className="px-3 py-2.5 text-left">Aktiviti</th>
                  <th className="px-3 py-2.5 text-left">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/8">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-foreground/3">
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatDateTimeMY(l.diciptaPada)}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <p className="font-medium">{l.oleh?.fullName ?? '—'}</p>
                      <p className="text-foreground/60">{l.oleh?.email}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#12A3A8]/15 text-[#12A3A8]">
                        {ROLE_LABEL[l.oleh?.role] ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[10px] uppercase bg-foreground/8 px-1.5 py-0.5 rounded">{l.tindakan}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {l.aktiviti ? (
                        <span className="line-clamp-1 max-w-xs">{l.aktiviti.namaAktiviti}</span>
                      ) : <span className="text-foreground/40">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <span className="line-clamp-2 max-w-md">{l.catatan ?? '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="glass-input px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50">
            ← Sebelum
          </button>
          <span className="text-xs text-foreground/60 px-2">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="glass-input px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50">
            Seterus →
          </button>
        </div>
      )}
    </div>
  )
}
