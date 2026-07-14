'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import type { SafeProfile } from '@/app/page'
import { GraduationCap, Loader2, Lock, Mail, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export function LoginScreen({ onLogin }: { onLogin: (p: SafeProfile) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await api<{ ok: boolean; profile: SafeProfile; error?: string }>(
        '/api/auth/login',
        { method: 'POST', body: { email, password } }
      )
      if (!r.ok) throw new Error(r.error ?? 'Log masuk gagal')
      onLogin(r.profile)
    } catch (e: any) {
      setError(e.message ?? 'Log masuk gagal.')
    } finally {
      setLoading(false)
    }
  }

  const fill = (em: string, pw: string) => {
    setEmail(em)
    setPassword(pw)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl btn-brand-gradient mb-3 shadow-lg">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sistem Rekod Aktiviti Pelajar</h1>
          <p className="text-sm text-foreground/70 mt-1">ADTEC Kota Tinggi · Jabatan Tenaga Manusia (JTM)</p>
        </div>

        {/* Glass login card */}
        <div className="glass-card-strong p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground mb-1">Log Masuk Sistem</h2>
          <p className="text-xs text-foreground/60 mb-5">Sila masukkan e-mel & kata laluan anda.</p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">E-mel</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nama@adtec-kt.edu.my"
                  className="glass-input w-full pl-9 pr-3 py-2.5 text-sm outline-none"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Kata Laluan</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full pl-9 pr-10 py-2.5 text-sm outline-none"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-foreground/10 transition"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4 text-foreground/50" /> : <Eye className="w-4 h-4 text-foreground/50" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs px-3 py-2 rounded-md bg-[#E4572E]/10 border border-[#E4572E]/30 text-[#b5401f] dark:text-[#f08c6e]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-brand-gradient w-full py-2.5 rounded-md font-semibold text-sm flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? 'Mengesahkan…' : 'Log Masuk'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-foreground/10">
            <p className="text-[11px] uppercase tracking-wide text-foreground/60 font-semibold mb-2">Akaun Demo (klik untuk autofill)</p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button onClick={() => fill('admin@adtec-kt.edu.my', 'Admin@2026')}
                className="glass-input px-2 py-1.5 text-left hover:bg-foreground/5 transition">
                <span className="font-semibold">Admin</span><br />
                <span className="text-foreground/60">admin@adtec-kt…</span>
              </button>
              <button onClick={() => fill('ahmad.fauzi@adtec-kt.edu.my', 'Pengajar@123')}
                className="glass-input px-2 py-1.5 text-left hover:bg-foreground/5 transition">
                <span className="font-semibold">Pengajar (Elektrik)</span><br />
                <span className="text-foreground/60">ahmad.fauzi@…</span>
              </button>
              <button onClick={() => fill('siti.aisyah@adtec-kt.edu.my', 'Pengajar@123')}
                className="glass-input px-2 py-1.5 text-left hover:bg-foreground/5 transition">
                <span className="font-semibold">Pengajar (ICT)</span><br />
                <span className="text-foreground/60">siti.aisyah@…</span>
              </button>
              <button onClick={() => fill('rizal.hakim@adtec-kt.edu.my', 'Pengajar@123')}
                className="glass-input px-2 py-1.5 text-left hover:bg-foreground/5 transition">
                <span className="font-semibold">Pengajar (Mekanikal)</span><br />
                <span className="text-foreground/60">rizal.hakim@…</span>
              </button>
              <button onClick={() => fill('noraini.yusof@adtec-kt.edu.my', 'Penyelaras@123')}
                className="glass-input px-2 py-1.5 text-left hover:bg-foreground/5 transition">
                <span className="font-semibold">Penyelaras</span><br />
                <span className="text-foreground/60">noraini.yusof@…</span>
              </button>
              <button onClick={() => fill('rosli.ibrahim@adtec-kt.edu.my', 'PPengarah@123')}
                className="glass-input px-2 py-1.5 text-left hover:bg-foreground/5 transition">
                <span className="font-semibold">Penolong Pengarah</span><br />
                <span className="text-foreground/60">rosli.ibrahim@…</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-center text-foreground/50 mt-4">
          © 2026 Jabatan Tenaga Manusia · ADTEC Kota Tinggi
        </p>
      </div>
    </div>
  )
}
