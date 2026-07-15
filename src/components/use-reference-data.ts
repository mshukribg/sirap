'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'

type Bengkel = { id: string; namaBengkel: string }
type Negeri = { id: string; namaNegeri: string }
type Daerah = { id: string; namaDaerah: string; negeriId: string; negeri?: Negeri }

export function useReferenceData() {
  const [bengkelList, setBengkelList] = useState<Bengkel[]>([])
  const [negeriList, setNegeriList] = useState<Negeri[]>([])
  const [daerahList, setDaerahList] = useState<Daerah[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [b, n, d] = await Promise.all([
          api<{ ok: boolean; data: Bengkel[] }>('/api/bengkel'),
          api<{ ok: boolean; data: Negeri[] }>('/api/negeri'),
          api<{ ok: boolean; data: Daerah[] }>('/api/daerah'),
        ])
        setBengkelList(b.data)
        setNegeriList(n.data)
        setDaerahList(d.data)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return { bengkelList, negeriList, daerahList, loading }
}
