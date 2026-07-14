'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { api, ROLE_LABEL, STATUS_LABEL } from '@/lib/api-client'
import { LoginScreen } from '@/components/login-screen'
import { AppShell } from '@/components/app-shell'

export type SafeProfile = {
  id: string
  email: string
  fullName: string
  role: 'pengajar' | 'penyelaras' | 'penolong_pengarah' | 'admin'
  bengkel: { id: string; namaBengkel: string } | null
}

export default function Home() {
  const [profile, setProfile] = useState<SafeProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    try {
      const r = await api<{ ok: boolean; profile: SafeProfile | null }>('/api/auth/me')
      setProfile(r.profile)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card-strong p-8 flex items-center gap-4">
          <div className="w-6 h-6 border-2 border-[#12A3A8] border-t-transparent rounded-full animate-spin" />
          <span className="text-foreground/80">Memuatkan sistem…</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      {profile ? (
        <AppShell profile={profile} onLogout={async () => {
          try { await api('/api/auth/logout', { method: 'POST' }) } catch {}
          setProfile(null)
          toast.success('Anda telah log keluar.')
        }} onProfileChanged={refreshProfile} />
      ) : (
        <LoginScreen onLogin={p => {
          setProfile(p)
          toast.success(`Selamat datang, ${p.fullName}!`)
        }} />
      )}
    </>
  )
}
