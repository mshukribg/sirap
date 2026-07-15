# Sistem Rekod Aktiviti Pelajar — ADTEC KT

> Sistem rekod aktiviti pelajar berpusat untuk **ADTEC Kota Tinggi** di bawah **Jabatan Tenaga Manusia (JTM), Kementerian Sumber Manusia Malaysia**.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)

Sistem web berpusat untuk merekod aktiviti pelajar ADTEC KT dengan aliran kerja tiga peringkat (Pengajar → Penyelaras → Penolong Pengarah), papan pemuka statistik automatik, dan reka bentuk UI/UX glassmorphism moden.

---

## 📋 Kandungan

- [Pengenalan](#pengenalan)
- [Ciri Utama](#ciri-utama)
- [Seni Bina Sistem](#seni-bina-sistem)
- [Keperluan Sistem](#keperluan-sistem)
- [Pemasangan Tempatan](#pemasangan-tempatan)
- [Akaun Demo](#akaun-demo)
- [Skema Pangkalan Data](#skema-pangkalan-data)
- [Keselamatan](#keselamatan)
- [Deployment ke Netlify](#deployment-ke-netlify)
- [Struktur Projek](#struktur-projek)
- [Lisens](#lisens)

---

## Pengenalan

Sistem ini menggantikan proses manual (borang kertas / Excel) untuk merekod aktiviti pelajar dengan aplikasi web berpusat yang menyokong:

- **Aliran kerja 3 peringkat** dengan pengesahan berperingkat
- **Papan pemuka statistik** masa nyata mengikut tempoh dan lokasi
- **Reka bentuk glassmorphism** moden dan responsif
- **Keselamatan menyeluruh** dengan RBAC dan audit log
- **Bahasa Melayu** sepenuhnya sebagai bahasa utama

---

## Ciri Utama

### 👤 Peranan & Akses (RBAC)

| Peranan | Fungsi Utama |
|---------|--------------|
| **Pengajar** | Cipta, edit, padam draf; hantar individu/pukal ke Penyelaras |
| **Penyelaras** | Semak rekod; hantar ke PP atau pulangkan ke Pengajar dengan catatan |
| **Penolong Pengarah** | Sahkan/tolak rekod (individu/pukal); akses statistik penuh |
| **Admin** | Urus pengguna, data rujukan (bengkel/negeri/daerah), log audit |

### 🔄 Aliran Kerja 5 Status

```
DRAF → MENUNGGU_SEMAKAN → MENUNGGU_PENGESAHAN → DISAHKAN
                ↑                   ↑                   ↓
              DITOLAK (Penyelaras) DITOLAK (PP)    Statistik
                ↓                   ↓
              Kembali ke DRAF (dengan catatan sebab)
```

### 📊 Modul Statistik & Papan Pemuka

- Statistik mengikut **tempoh**: Harian, Mingguan, Bulanan, Tahunan
- Statistik mengikut **lokasi**: Daerah dan Negeri
- Carta bar/line interaktif
- Kad ringkasan dengan trend bulanan
- Top 3 negeri/daerah paling aktif
- Eksport CSV untuk rekod disahkan

### 🎨 Reka Bentuk Glassmorphism

- Kad separa lutsinar dengan `backdrop-filter: blur()`
- Sempadan nipis bercahaya dan bayang lembut
- Mod terang/gelap (light/dark mode)
- Responsif (mobile/tablet/desktop)
- Palet warna: Deep Teal `#0D3B52`, Aqua `#12A3A8`, Mint `#7FD6C0`

---

## Seni Bina Sistem

### Tindanan Teknologi

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui (New York style) |
| Komponen | Radix UI, Lucide icons, Framer Motion |
| Carta | Recharts |
| Backend | Next.js API Routes (Server-side) |
| Database ORM | Prisma 6 |
| Database | SQLite (dev) / Supabase PostgreSQL (production) |
| Auth | Custom session-based (scrypt hashing) — siap untuk migrasi ke Supabase Auth |
| State | TanStack Query, Zustand |
| Validation | Zod, react-hook-form |

### Seni Bina Tinggi

```
┌─────────────────────────────────────────────────┐
│                   Pengguna                       │
│   (Pengajar / Penyelaras / PP / Admin)           │
└────────────────────┬────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────┐
│          Next.js 16 (App Router)                 │
│   Glassmorphism UI + shadcn/ui Components        │
│   - Server Components for data fetching          │
│   - API Routes for mutations                     │
│   - middleware.ts for route protection           │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              Prisma ORM (TypeScript)             │
│   - Type-safe queries                            │
│   - Schema migrations                            │
│   - Connection pooling                           │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│      SQLite (dev) / Supabase Postgres (prod)     │
│   - Row Level Security (RLS) ready               │
│   - 7 tables with FK relationships               │
│   - Audit log (append-only)                      │
└─────────────────────────────────────────────────┘
```

---

## Keperluan Sistem

- **Node.js** 18.17+ atau **Bun** 1.0+
- **npm**, **yarn**, **pnpm**, atau **bun** (disyorkan: bun)
- Sistem operasi: Linux, macOS, atau Windows (WSL2 disyorkan)

---

## Pemasangan Tempatan

### 1. Klon Repositori

```bash
git clone https://github.com/mshukribg/sirap.git
cd sirap
```

### 2. Pasang Kebergantungan

```bash
# Disyorkan: bun (paling pantas)
bun install

# Atau: npm
npm install

# Atau: pnpm
pnpm install
```

### 3. Konfigurasi Environment

```bash
# Salin template env
cp .env.example .env

# Untuk development tempatan (SQLite), gunakan:
DATABASE_URL="file:./db/custom.db"
```

### 4. Sediakan Pangkalan Data

```bash
# Cipta skema database
bun run db:push

# (Pilihan) Generate Prisma client
bun run db:generate
```

Database SQLite akan dicipta secara automatik di `db/custom.db` dengan skema penuh.

### 5. Masukkan Data Dummy

Database sudah termasuk data dummy dalam commit ini. Jika anda mahu reset dan reseed:

```bash
# Lihat skrip seed di: scripts/seed-data.ts (jika ada)
# Atau gunakan skrip SQL Supabase di: download/supabase_setup.sql
```

### 6. Jalankan Pelayan Pembangunan

```bash
bun run dev
```

Buka **http://localhost:3000** dalam pelayar anda.

---

## Akaun Demo

Sistem ini dipecahkan dengan **7 akaun dummy** merentasi semua peranan. Gunakan butang pantas di skrin log masuk atau masukkan kredensial berikut:

| Peranan | E-mel | Kata Laluan | Bengkel |
|---------|-------|-------------|---------|
| Admin | `admin@adtec-kt.edu.my` | `Admin@2026` | — |
| Pengajar | `ahmad.fauzi@adtec-kt.edu.my` | `Pengajar@123` | Tek. Pendawaian Elektrik 3 Fasa |
| Pengajar | `siti.aisyah@adtec-kt.edu.my` | `Pengajar@123` | Tek. Komputer (Sistem) |
| Pengajar | `rizal.hakim@adtec-kt.edu.my` | `Pengajar@123` | Tek. Penyenggaraan Mekanikal |
| Penyelaras | `noraini.yusof@adtec-kt.edu.my` | `Penyelaras@123` | — |
| Penyelaras | `zulkifli.omar@adtec-kt.edu.my` | `Penyelaras@123` | — |
| Penolong Pengarah | `rosli.ibrahim@adtec-kt.edu.my` | `PPengarah@123` | — |

### Statistik Data Dummy

- **10 bengkel** (Pendawaian, Automotif, ICT, dll.)
- **16 negeri** (semua negeri Malaysia + W.P.)
- **64 daerah** merentasi semua negeri
- **52 aktiviti** merentasi 5 status (disahkan, menunggu semakan, draf, dll.)
- **164 audit log** entries
- **8 notifikasi** dalam-sistem

---

## Skema Pangkalan Data

### Jadual Utama

| Jadual | Penerangan |
|--------|-----------|
| `bengkel` | Senarai rujukan 10 bengkel teknikal |
| `negeri` | 16 negeri/wilayah Malaysia |
| `daerah` | 64 daerah di bawah negeri (FK → negeri) |
| `profiles` | Pengguna dengan peranan & bengkel (FK → bengkel) |
| `aktiviti` | Jadual transaksi utama (FK → bengkel, negeri, daerah, profiles) |
| `audit_log` | Log append-only untuk semua tindakan |
| `notifications` | Notifikasi dalam-sistem untuk Pengajar |

### Skema Prisma

Skema penuh tersedia di `prisma/schema.prisma`. Untuk migrasi ke Supabase PostgreSQL, gunakan skrip SQL di `download/supabase_setup.sql` yang termasuk:

- Skema penuh PostgreSQL
- Row Level Security (RLS) policies
- 22 role-based policies mengikut PRD §13
- Data dummy lengkap
- Trigger auto-update `updated_at`

---

## Keselamatan

Sistem ini dilengkapi dengan langkah keselamatan menyeluruh:

### Autentikasi & Pengurusan Sesi

- ✅ **Password hashing**: scrypt (Node.js crypto) dengan salt unik per pengguna
- ✅ **Session tokens**: 32-byte random hex, 7-day expiry
- ✅ **HTTP-only cookies**: Mencegah akses JavaScript ke token
- ✅ **SameSite=lax**: Perlindungan CSRF
- ✅ **Secure flag** (production): HTTPS-only cookies

### Kawalan Akses (RBAC)

- ✅ **Role-based access** pada setiap API endpoint (server-side)
- ✅ **Route protection**: Tiada akses tanpa sesi sah
- ✅ **Input validation & sanitization**: Zod + custom validators
- ✅ **Password complexity**: Min 8 aksara, huruf + nombor

### Audit & Logging

- ✅ **Append-only audit log**: Setiap tindakan (create/submit/review/approve/reject) direkod
- ✅ **User attribution**: Setiap log mengandungi ID pengguna & timestamp
- ✅ **Admin-only access** untuk audit log penuh

### Pertahanan terhadap Serangan

| Ancaman | Mitigasi |
|---------|----------|
| SQL Injection | Prisma ORM dengan parameterized queries |
| XSS | React auto-escaping + input sanitization |
| CSRF | SameSite cookies + custom CSRF tokens |
| Brute Force | Rate limiting pada endpoint login |
| Session Hijacking | HTTP-only + Secure cookies, token rotation |
| Privilege Escalation | Server-side RBAC on every API call |

---

## Deployment ke Netlify

### 1. Sediakan Supabase Database

1. Buka `download/supabase_setup.sql` dari repositori ini
2. Pergi ke **Supabase Dashboard** → **SQL Editor** → **New query**
3. Paste kandungan skrip → **Run**
4. Tunggu 10-20 saat sehingga selesai
5. Salin **Project URL** dan **anon key** dari **Project Settings → API**

### 2. Connect ke Netlify

1. Pergi ke **https://app.netlify.com**
2. Klik **"Add new site"** → **"Import an existing project"**
3. Pilih **GitHub** → authorize Netlify
4. Pilih repositori **`mshukribg/sirap`**
5. Konfigurasi build:
   - **Base directory**: `(root)`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
6. Tambah **environment variables**:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | `postgresql://postgres:PASSWORD@db.bcmwnhvzwpgrljvsvjdq.supabase.co:5432/postgres` |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://bcmwnhvzwpgrljvsvjdq.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` |
   | `NODE_ENV` | `production` |

7. Klik **"Deploy site"**
8. Tunggu build selesai (~2-3 minit)
9. Akses aplikasi di URL Netlify (cth: `https://sirap.netlify.app`)

### 3. Custom Domain (Pilihan)

1. Pergi ke **Site settings → Domain management**
2. Klik **"Add custom domain"**
3. Ikut arahan DNS

---

## Struktur Projek

```
sirap/
├── prisma/
│   └── schema.prisma              # Skema database (7 models)
├── db/
│   └── custom.db                  # SQLite database (dev)
├── src/
│   ├── app/
│   │   ├── api/                   # 27 API routes
│   │   │   ├── auth/              # login, logout, me, change-password
│   │   │   ├── aktiviti/          # CRUD + bulk operations
│   │   │   ├── statistik/         # Statistics endpoint
│   │   │   ├── admin/             # User management, audit log
│   │   │   ├── bengkel/ negeri/ daerah/
│   │   │   └── notifications/
│   │   ├── globals.css            # Tailwind + glassmorphism styles
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Main app entry
│   ├── components/
│   │   ├── modules/               # 7 role-specific modules
│   │   │   ├── dashboard-home.tsx
│   │   │   ├── pengajar-module.tsx
│   │   │   ├── penyelaras-module.tsx
│   │   │   ├── pp-module.tsx
│   │   │   ├── admin-module.tsx
│   │   │   ├── statistik-module.tsx
│   │   │   ├── all-activities-module.tsx
│   │   │   └── settings-module.tsx
│   │   ├── ui/                    # shadcn/ui components (47)
│   │   ├── login-screen.tsx       # Login + quick-login buttons
│   │   ├── app-shell.tsx          # Main app shell with sidebar
│   │   ├── notifications-bell.tsx
│   │   └── theme-provider.tsx     # Light/dark mode
│   └── lib/
│       ├── auth.ts                # Password hashing, sessions, RBAC
│       ├── api-client.ts          # Frontend API client
│       ├── db.ts                  # Prisma client
│       └── utils.ts               # Helpers
├── download/
│   └── supabase_setup.sql         # Full SQL migration for Supabase
├── scripts/                       # Generation & utility scripts
├── .env.example                   # Environment template
├── package.json
└── README.md
```

---

## Pengembangan

### Menambah Bengkel/Negeri/Daerah Baharu

Log masuk sebagai **Admin** → **Pentadbiran** → tab **Bengkel** / **Negeri & Daerah** → klik **"Tambah Baharu"**.

### Menambah Pengguna Baharu

Log masuk sebagai **Admin** → **Pentadbiran** → **Pengguna** → **"Pengguna Baharu"**. Tetapkan peranan dan bengkel (jika Pengajar).

### Skrip Available

```bash
bun run dev         # Pelayan pembangunan (port 3000)
bun run build       # Build production
bun run lint        # ESLint
bun run db:push     # Push skema Prisma ke database
bun run db:generate # Generate Prisma client
bun run db:migrate  # Cipta migrasi baru
bun run db:reset    # Reset database (HATI-HATI!)
```

---

## Penyelesaian Masalah

### Lupa kata laluan admin

Reset melalui database secara langsung:

```bash
# Development (SQLite)
bunx prisma studio
# Cari profile admin → kemaskini passwordHash
```

### Database corruption (SQLite)

```bash
rm db/custom.db
bun run db:push
# Kemudian reseed dengan data dummy
```

### Build gagal di Netlify

1. Pastikan `DATABASE_URL` ditetapkan di Netlify env vars
2. Pastikan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` ditetapkan
3. Semak build logs di Netlify dashboard

---

## Lisens

© 2026 Jabatan Tenaga Manusia (JTM), Kementerian Sumber Manusia Malaysia. Hak cipta terpelihara.

 Projek ini dibangunkan untuk ADTEC Kota Tinggi sebagai sebahagian daripada inisiatif transformasi digital pengurusan rekod aktiviti pelajar.

---

## Hubungi

Untuk pertanyaan atau sokongan teknikal:

- **Institusi**: ADTEC Kota Tinggi, Jabatan Tenaga Manusia
- **Email**: admin@adtec-kt.edu.my
- **Repositori**: https://github.com/mshukribg/sirap

---

**Disediakan oleh**: Jurutera Perisian, Jabatan Tenaga Manusia (JTM)
**Versi**: 1.0
**Tarikh**: Julai 2026
