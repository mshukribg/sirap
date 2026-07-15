'use client'

import { useState, useEffect } from 'react'
import { api, ROLE_LABEL } from '@/lib/api-client'
import type { SafeProfile } from '@/app/page'
import { GlassCard, PageHeader } from '@/components/ui-bits'
import { toast } from 'sonner'
import { Loader2, Lock, User, Mail, ShieldCheck, Building2 } from 'lucide-react'

export function SettingsModule({ profile, onProfileChanged }: {
  profile: SafeProfile
  onProfileChanged: () => Promise<void>
}) {
  const [fullName, setFullName] = useState(profile.fullName)
  const [savingProfile, setSavingProfile] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)
  const [error, setError] = useState('')

  // We don't have an API to update own profile, so disable the field unless admin
  // For now: profile editing disabled (the admin can update via admin module)
  // But we keep the password change functional

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPwd !== confirmPwd) { setError('Kata laluan baharu & pengesahan tidak sepadan.'); return }
    if (newPwd.length < 8) { setError('Kata laluan baharu mesti sekurang-kurangnya 8 aksara.'); return }
    if (!/[A-Za-z]/.test(newPwd) || !/[0-9]/.test(newPwd)) { setError('Kata laluan mesti mengandungi huruf dan nombor.'); return }
    setSavingPwd(true)
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: currentPwd, newPassword: newPwd },
      })
      toast.success('Kata laluan berjaya ditukar.')
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (e: any) {
      setError(e.message ?? 'Gagal menukar kata laluan.')
    } finally {
      setSavingPwd(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader title="Tetapan Akaun" description="Lihat profil akaun & tukar kata laluan." />

      {/* Profile info */}
      <GlassCard className="p-5">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <User className="w-4 h-4" /> Maklumat Profil
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoItem icon={User} label="Nama Penuh" value={profile.fullName} />
          <InfoItem icon={Mail} label="E-mel" value={profile.email} />
          <InfoItem icon={ShieldCheck} label="Peranan" value={ROLE_LABEL[profile.role]} />
          <InfoItem icon={Building2} label="Bengkel" value={profile.bengkel?.namaBengkel ?? '— Tiada —'} />
        </div>
        <p className="text-[11px] text-foreground/50 mt-3">
          Untuk mengemaskini nama, e-mel atau peranan, sila hubungi pentadbir sistem.
        </p>
      </GlassCard>

      {/* Change password */}
      <GlassCard className="p-5">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Tukar Kata Laluan
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">Kata Laluan Semasa <span className="text-[#E4572E]">*</span></label>
            <input
              type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} required
              className="glass-input w-full px-3 py-2 text-sm outline-none"
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Kata Laluan Baharu <span className="text-[#E4572E]">*</span></label>
              <input
                type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required minLength={8}
                className="glass-input w-full px-3 py-2 text-sm outline-none"
                placeholder="Min 8 aksara, huruf & nombor"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Sahkan Kata Laluan Baharu <span className="text-[#E4572E]">*</span></label>
              <input
                type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required minLength={8}
                className="glass-input w-full px-3 py-2 text-sm outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="text-[11px] text-foreground/60 px-1">
            Pastikan kata laluan kuat: minimum 8 aksara, mengandungi sekurang-kurangnya satu huruf dan satu nombor.
          </div>
          {error && (
            <div className="text-xs px-3 py-2 rounded-md bg-[#E4572E]/10 border border-[#E4572E]/30 text-[#b5401f] dark:text-[#f08c6e]">
              {error}
            </div>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={savingPwd} className="btn-brand-gradient px-5 py-2 rounded-md text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
              {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Tukar Kata Laluan
            </button>
          </div>
        </form>
      </GlassCard>

      {/* Security tips */}
      <GlassCard className="p-5">
        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Amalan Keselamatan
        </h3>
        <ul className="text-sm text-foreground/70 space-y-1.5 list-disc list-inside">
          <li>Guna kata laluan yang unik &mdash; jangan gunakan semula kata laluan dari sistem lain.</li>
          <li>Tukar kata laluan secara berkala (setiap 90 hari disyorkan).</li>
          <li>Jangan kongsi akaun anda dengan pengguna lain &mdash; setiap tindakan direkod dalam log audit.</li>
          <li>Log keluar selepas menggunakan komputer kongsi.</li>
          <li>Hubungi pentadbir sistem jika anda mengesyaki akaun telah dikompromi.</li>
        </ul>
      </GlassCard>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="glass-input px-3 py-2.5 rounded-lg">
      <p className="text-[11px] text-foreground/60 flex items-center gap-1.5">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className="text-sm text-foreground font-medium mt-0.5 break-words">{value}</p>
    </div>
  )
}
