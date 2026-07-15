'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { api, formatDateTimeMY } from '@/lib/api-client'
import { Bell, Check, X } from 'lucide-react'

type Notif = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const r = await api<{ ok: boolean; data: Notif[]; unreadCount: number }>('/api/notifications')
      setItems(r.data)
      setUnread(r.unreadCount)
    } catch {}
  }, [])

  useEffect(() => {
    // Initial load + periodic refresh — no setState in effect body directly
    let mounted = true
    const doLoad = async () => {
      await load()
    }
    doLoad()
    const t = setInterval(doLoad, 30_000)
    return () => { mounted = false; clearInterval(t) }
  }, [load])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const markRead = async (id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(u => Math.max(0, u - 1))
    try { await api(`/api/notifications/${id}/read`, { method: 'POST' }) } catch {}
  }

  const markAllRead = async () => {
    const unreadIds = items.filter(n => !n.read).map(n => n.id)
    if (!unreadIds.length) return
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
    await Promise.all(unreadIds.map(id => api(`/api/notifications/${id}/read`, { method: 'POST' }).catch(() => {})))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-md hover:bg-foreground/10 transition"
        aria-label="Notifikasi"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#E4572E] text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-card-strong rounded-xl p-3 z-50">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-sm font-semibold text-foreground">Notifikasi</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-[#12A3A8] hover:underline font-medium">
                Tanda Semua Dibaca
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
            {items.length === 0 && (
              <div className="text-center py-8 text-xs text-foreground/50">Tiada notifikasi.</div>
            )}
            {items.map(n => (
              <div
                key={n.id}
                className={`px-3 py-2.5 rounded-lg text-xs transition cursor-pointer ${
                  n.read ? 'bg-foreground/5 opacity-70' : 'glass-input hover:bg-foreground/8'
                }`}
                onClick={() => !n.read && markRead(n.id)}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-foreground/30' : 'bg-[#12A3A8]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{n.title}</p>
                    <p className="text-foreground/70 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-foreground/50 mt-1">{formatDateTimeMY(n.createdAt)}</p>
                  </div>
                  {!n.read && <Check className="w-3.5 h-3.5 text-[#12A3A8] shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
