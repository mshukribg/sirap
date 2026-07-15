/**
 * Lightweight API client for browser. All fetch calls go through this.
 * Throws { error: string, status: number } on failure.
 */
export async function api<T = any>(
  url: string,
  opts: { method?: string; body?: any; searchParams?: Record<string, string | undefined> } = {}
): Promise<T> {
  let finalUrl = url
  if (opts.searchParams) {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(opts.searchParams)) {
      if (v !== undefined && v !== null && v !== '') sp.set(k, v)
    }
    const qs = sp.toString()
    if (qs) finalUrl += (url.includes('?') ? '&' : '?') + qs
  }

  const res = await fetch(finalUrl, {
    method: opts.method ?? 'GET',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  })

  let data: any = null
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    data = await res.json().catch(() => null)
  } else if (ct.includes('text/')) {
    data = await res.text()
  }

  if (!res.ok) {
    const msg = (data && typeof data === 'object' && 'error' in data) ? data.error : `Ralat ${res.status}`
    const err: any = new Error(msg)
    err.status = res.status
    err.payload = data
    throw err
  }
  return data as T
}

/** Status helpers (BM labels) */
export const STATUS_LABEL: Record<string, string> = {
  draf: 'Draf',
  menunggu_semakan: 'Menunggu Semakan',
  menunggu_pengesahan: 'Menunggu Pengesahan',
  disahkan: 'Disahkan',
  ditolak: 'Ditolak',
}

export const STATUS_ORDER: string[] = ['draf', 'menunggu_semakan', 'menunggu_pengesahan', 'disahkan', 'ditolak']

export const ROLE_LABEL: Record<string, string> = {
  pengajar: 'Pengajar',
  penyelaras: 'Penyelaras',
  penolong_pengarah: 'Penolong Pengarah',
  admin: 'Admin',
}

export function formatDateMY(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '—'
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

export function formatDateTimeMY(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '—'
  return `${formatDateMY(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
