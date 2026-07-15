'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, ROLE_LABEL } from '@/lib/api-client'
import type { SafeProfile } from '@/app/page'
import { useTheme } from '@/components/theme-provider'
import { NotificationsBell } from '@/components/notifications-bell'
import { DashboardHome } from '@/components/modules/dashboard-home'
import { PengajarModule } from '@/components/modules/pengajar-module'
import { PenyelarasModule } from '@/components/modules/penyelaras-module'
import { PenolongPengarahModule } from '@/components/modules/pp-module'
import { StatistikModule } from '@/components/modules/statistik-module'
import { AdminModule } from '@/components/modules/admin-module'
import { SettingsModule } from '@/components/modules/settings-module'
import { AllActivitiesModule } from '@/components/modules/all-activities-module'
import {
  GraduationCap, LayoutDashboard, FileText, ClipboardCheck, ShieldCheck, BarChart3,
  Settings, LogOut, Menu, X, Moon, Sun, ChevronRight, FolderCog
} from 'lucide-react'

export type NavKey =
  | 'dashboard'
  | 'pengajar'
  | 'penyelaras'
  | 'pp'
  | 'activities'
  | 'statistik'
  | 'admin'
  | 'settings'

type NavItem = { key: NavKey; label: string; icon: any; roles: string[] }

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard',  label: 'Papan Pemuka',         icon: LayoutDashboard, roles: ['pengajar','penyelaras','penolong_pengarah','admin'] },
  { key: 'pengajar',   label: 'Aktiviti Saya (Draf)',  icon: FileText,         roles: ['pengajar'] },
  { key: 'penyelaras', label: 'Semakan Aktiviti',     icon: ClipboardCheck,   roles: ['penyelaras'] },
  { key: 'pp',         label: 'Pengesahan Aktiviti',  icon: ShieldCheck,      roles: ['penolong_pengarah'] },
  { key: 'activities', label: 'Senarai Aktiviti',     icon: FolderCog,        roles: ['penolong_pengarah','penyelaras','admin'] },
  { key: 'statistik',  label: 'Statistik & Laporan',  icon: BarChart3,        roles: ['penolong_pengarah','penyelaras','admin','pengajar'] },
  { key: 'admin',      label: 'Pentadbiran',          icon: Settings,         roles: ['admin'] },
  { key: 'settings',   label: 'Tetapan Akaun',        icon: Settings,         roles: ['pengajar','penyelaras','penolong_pengarah','admin'] },
]

export function AppShell({ profile, onLogout, onProfileChanged }: {
  profile: SafeProfile
  onLogout: () => void
  onProfileChanged: () => Promise<void>
}) {
  const [active, setActive] = useState<NavKey>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggle } = useTheme()

  const allowedItems = NAV_ITEMS.filter(i => i.roles.includes(profile.role))

  // Render the active module
  const renderModule = () => {
    switch (active) {
      case 'dashboard':  return <DashboardHome profile={profile} onNavigate={k => setActive(k as NavKey)} />
      case 'pengajar':   return <PengajarModule profile={profile} />
      case 'penyelaras': return <PenyelarasModule profile={profile} />
      case 'pp':         return <PenolongPengarahModule profile={profile} />
      case 'activities': return <AllActivitiesModule profile={profile} />
      case 'statistik':  return <StatistikModule profile={profile} />
      case 'admin':      return <AdminModule profile={profile} />
      case 'settings':   return <SettingsModule profile={profile} onProfileChanged={onProfileChanged} />
      default:           return <DashboardHome profile={profile} onNavigate={k => setActive(k as NavKey)} />
    }
  }

  const currentLabel = allowedItems.find(i => i.key === active)?.label ?? 'Papan Pemuka'

  return (
    <div className="min-h-screen flex">
      {/* Sidebar (desktop) */}
      <aside className={`fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full glass-card-strong rounded-none lg:rounded-r-2xl flex flex-col border-r border-[var(--glass-border)]">
          {/* Brand */}
          <div className="px-5 pt-5 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl btn-brand-gradient flex items-center justify-center shadow-lg">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground truncate">ADTEC KT</p>
              <p className="text-[11px] text-foreground/60 truncate">Sistem Rekod Aktiviti</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-md hover:bg-foreground/10">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {allowedItems.map(item => {
              const Icon = item.icon
              const isActive = active === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => { setActive(item.key); setSidebarOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'btn-brand-gradient font-semibold'
                      : 'text-foreground/75 hover:bg-foreground/8 hover:text-foreground'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? '' : 'text-foreground/60'}`} />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              )
            })}
          </nav>

          {/* User card */}
          <div className="p-3 border-t border-foreground/10">
            <div className="glass-input px-3 py-2.5 rounded-lg">
              <p className="text-xs font-semibold text-foreground truncate">{profile.fullName}</p>
              <p className="text-[11px] text-foreground/60 truncate">{profile.email}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide font-bold text-[#12A3A8]">{ROLE_LABEL[profile.role]}</span>
                {profile.bengkel && <span className="text-[10px] text-foreground/50 truncate max-w-[110px]">{profile.bengkel.namaBengkel}</span>}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#E4572E] hover:bg-[#E4572E]/10 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 px-4 lg:px-6 py-3">
          <div className="glass-card-strong px-4 py-2.5 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-md hover:bg-foreground/10">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">{currentLabel}</h1>
              <p className="text-[11px] text-foreground/60 hidden sm:block">Sistem Rekod Aktiviti Pelajar — ADTEC KT</p>
            </div>
            <NotificationsBell />
            <button
              onClick={toggle}
              className="p-2 rounded-md hover:bg-foreground/10 transition"
              title={theme === 'light' ? 'Mod Gelap' : 'Mod Terang'}
              aria-label="Tukar tema"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md glass-input">
              <div className="w-7 h-7 rounded-full btn-brand-gradient flex items-center justify-center text-xs font-bold">
                {profile.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground leading-tight">{profile.fullName.split(' ').slice(0,2).join(' ')}</p>
                <p className="text-foreground/60 leading-tight">{ROLE_LABEL[profile.role]}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 lg:px-6 pb-10">
          {renderModule()}
        </main>

        {/* Footer */}
        <footer className="mt-auto px-4 lg:px-6 py-4 text-center text-[11px] text-foreground/50">
          © 2026 Jabatan Tenaga Manusia · ADTEC Kota Tinggi · Sistem Rekod Aktiviti Pelajar v1.0
        </footer>
      </div>
    </div>
  )
}
