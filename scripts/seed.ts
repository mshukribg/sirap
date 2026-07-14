/**
 * Seed script — populates the SQLite database with dummy data per PRD Section 14.
 * Run via: `bun run scripts/seed.ts`
 *
 * Includes:
 *  - 10 Bengkel (workshops)
 *  - 16 Negeri + ~40 Daerah
 *  - 7 User profiles (1 admin, 3 pengajar, 2 penyelaras, 1 penolong_pengarah) with hashed passwords
 *  - ~50 Aktiviti records across all 5 statuses, spanning 12 months, multiple states/districts
 */
import { PrismaClient } from '@prisma/client'
import { scryptSync, randomBytes } from 'crypto'

const db = new PrismaClient()

// ---------------------------------------------------------------------------
// Password hashing (scrypt — Node built-in, no extra deps)
// ---------------------------------------------------------------------------

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

// ---------------------------------------------------------------------------
// Bengkel (PRD section 14.2)
// ---------------------------------------------------------------------------

const BENGKEL_LIST = [
  'Tek. Pendawaian Elektrik 3 Fasa',
  'Tek. Penyejukbekuan & Penyamanan Udara',
  'Tek. Komputer (Sistem)',
  'Diploma Tek. Elektrik (Kuasa)',
  'Tek. Penyenggaraan Mekanikal',
  'Tek. Pembuatan (Pemesinan)',
  'Tek. Pem. Paip Minyak & Gas',
  'Tek. Binaan (Berasaskan Kayu)',
  'Tek. Binaan (Paip & Sanitari)',
  'Tek. Binaan (Sivil & Struktur)',
]

// ---------------------------------------------------------------------------
// Negeri + Daerah (PRD section 14.3, expanded)
// ---------------------------------------------------------------------------

const NEGERI_DAERAH: Record<string, string[]> = {
  Johor: ['Kota Tinggi', 'Johor Bahru', 'Kluang', 'Batu Pahat', 'Muar', 'Segamat'],
  Kedah: ['Alor Setar', 'Kubang Pasu', 'Kuala Muda', 'Baling'],
  Kelantan: ['Kota Bharu', 'Pasir Mas', 'Tanah Merah', 'Machang', 'Gua Musang'],
  Melaka: ['Melaka Tengah', 'Alor Gajah', 'Jasin', 'Merlimau'],
  'Negeri Sembilan': ['Seremban', 'Port Dickson', 'Rembau', 'Jempol'],
  Pahang: ['Kuantan', 'Temerloh', 'Bentong', 'Pekan', 'Rompin'],
  Perak: ['Ipoh', 'Taiping', 'Teluk Intan', 'Manjung', 'Kuala Kangsar'],
  Perlis: ['Kangar', 'Arau', 'Padang Besar'],
  'Pulau Pinang': ['Timur Laut', 'Seberang Perai Utara', 'Seberang Perai Tengah', 'Seberang Perai Selatan'],
  Sabah: ['Kota Kinabalu', 'Tawau', 'Sandakan', 'Penampang', 'Kudat'],
  Sarawak: ['Kuching', 'Miri', 'Sibu', 'Bintulu', 'Sri Aman'],
  Selangor: ['Petaling', 'Klang', 'Gombak', 'Hulu Langat', 'Kuala Selangor', 'Sabak Bernam'],
  Terengganu: ['Kuala Terengganu', 'Kemaman', 'Dungun', 'Marang', 'Besut'],
  'W.P. Kuala Lumpur': ['Wilayah Persekutuan Kuala Lumpur'],
  'W.P. Labuan': ['Wilayah Persekutuan Labuan'],
  'W.P. Putrajaya': ['Wilayah Persekutuan Putrajaya'],
}

// ---------------------------------------------------------------------------
// User profiles (PRD section 14.1)
// ---------------------------------------------------------------------------

const USERS = [
  { fullName: 'Admin Sistem',          email: 'admin@adtec-kt.edu.my',          password: 'Admin@2026',    role: 'admin',              bengkelIdx: null },
  { fullName: 'Ahmad Fauzi',           email: 'ahmad.fauzi@adtec-kt.edu.my',    password: 'Pengajar@123',  role: 'pengajar',           bengkelIdx: 0 }, // Elektrik
  { fullName: 'Siti Nur Aisyah',       email: 'siti.aisyah@adtec-kt.edu.my',    password: 'Pengajar@123',  role: 'pengajar',           bengkelIdx: 2 }, // ICT
  { fullName: 'Rizal Hakim',           email: 'rizal.hakim@adtec-kt.edu.my',    password: 'Pengajar@123',  role: 'pengajar',           bengkelIdx: 4 }, // Mekanikal
  { fullName: 'Noraini Yusof',         email: 'noraini.yusof@adtec-kt.edu.my',  password: 'Penyelaras@123', role: 'penyelaras',         bengkelIdx: null },
  { fullName: 'Zulkifli Omar',         email: 'zulkifli.omar@adtec-kt.edu.my',  password: 'Penyelaras@123', role: 'penyelaras',         bengkelIdx: null },
  { fullName: 'Rosli Ibrahim',         email: 'rosli.ibrahim@adtec-kt.edu.my',  password: 'PPengarah@123', role: 'penolong_pengarah',  bengkelIdx: null },
]

// ---------------------------------------------------------------------------
// Activities — 50 records spanning Aug 2025 – Jul 2026, varied bengkel/negeri/daerah/status
// (PRD 14.4 lists 10 sample activities; we expand to 50 for meaningful statistics)
// ---------------------------------------------------------------------------

type ActivitySeed = {
  tarikh: string
  nama: string
  bengkelIdx: number
  negeri: string
  daerah: string
  pengurus: string
  penciptaEmail: string
  status: 'draf' | 'menunggu_semakan' | 'menunggu_pengesahan' | 'disahkan' | 'ditolak'
  catatan?: string
}

const ACTIVITIES: ActivitySeed[] = [
  // ---- Disahkan (20) — oldest to newest ----
  { tarikh: '2025-08-12', nama: 'Lawatan Industri ke Pabrik Automotif Tanjung Pelepas', bengkelIdx: 4, negeri: 'Johor', daerah: 'Johor Bahru', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2025-08-25', nama: 'Program Khidmat Masyarakat Kg. Bekok', bengkelIdx: 0, negeri: 'Johor', daerah: 'Batu Pahat', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2025-09-05', nama: 'Pertandingan Kemahiran ICT Peringkat Negeri Johor', bengkelIdx: 2, negeri: 'Johor', daerah: 'Johor Bahru', pengurus: 'Siti Nur Aisyah', penciptaEmail: 'siti.aisyah@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2025-09-18', nama: 'Seminar Kerjaya & Kebolehpasaran Graduan', bengkelIdx: 4, negeri: 'Johor', daerah: 'Kota Tinggi', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2025-10-03', nama: 'Bengkel Kemahiran Insaniah Pelajar Tahap 2', bengkelIdx: 2, negeri: 'Selangor', daerah: 'Petaling', pengurus: 'Siti Nur Aisyah', penciptaEmail: 'siti.aisyah@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2025-10-15', nama: 'Gotong-Royong Perdana Kampus ADTEC KT', bengkelIdx: 8, negeri: 'Johor', daerah: 'Kota Tinggi', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2025-10-28', nama: 'Lawatan Penanda Aras ke ADTEC Melaka', bengkelIdx: 4, negeri: 'Melaka', daerah: 'Melaka Tengah', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2025-11-10', nama: 'Program Jejak Kasih Anak Yatim', bengkelIdx: 0, negeri: 'Kelantan', daerah: 'Kota Bharu', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2025-11-22', nama: 'Kem Motivasi Pelajar Tahun Akhir', bengkelIdx: 2, negeri: 'Pahang', daerah: 'Kuantan', pengurus: 'Siti Nur Aisyah', penciptaEmail: 'siti.aisyah@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2025-12-05', nama: 'Karnival Kerjaya & Pameran Industri 2025', bengkelIdx: 4, negeri: 'Johor', daerah: 'Kota Tinggi', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2025-12-18', nama: 'Latihan Industri Bersama Sime Darby', bengkelIdx: 1, negeri: 'Selangor', daerah: 'Klang', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2026-01-08', nama: 'Program Kebajikan Bulan Madani', bengkelIdx: 8, negeri: 'Johor', daerah: 'Kluang', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2026-01-20', nama: 'Seminar Kesedaran Keselamatan Siber', bengkelIdx: 2, negeri: 'Selangor', daerah: 'Gombak', pengurus: 'Siti Nur Aisyah', penciptaEmail: 'siti.aisyah@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2026-02-03', nama: 'Lawatan Industri ke Pabrik Automotif', bengkelIdx: 4, negeri: 'Johor', daerah: 'Kota Tinggi', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2026-02-10', nama: 'Program Khidmat Masyarakat Kg. Bekok', bengkelIdx: 0, negeri: 'Johor', daerah: 'Kluang', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2026-02-18', nama: 'Pertandingan Kemahiran ICT Peringkat Negeri', bengkelIdx: 2, negeri: 'Johor', daerah: 'Johor Bahru', pengurus: 'Siti Nur Aisyah', penciptaEmail: 'siti.aisyah@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2026-03-04', nama: 'Bengkel Kerjaya Kejuruteraan Elektrik', bengkelIdx: 3, negeri: 'Pahang', daerah: 'Kuantan', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2026-03-17', nama: 'Lawatan ke Loji Penjana Elektrik Sultan Iskandar', bengkelIdx: 3, negeri: 'Johor', daerah: 'Pasir Gudang', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2026-04-09', nama: 'Program Pembangunan Sahsiah Pelajar', bengkelIdx: 2, negeri: 'Melaka', daerah: 'Alor Gajah', pengurus: 'Siti Nur Aisyah', penciptaEmail: 'siti.aisyah@adtec-kt.edu.my', status: 'disahkan' },
  { tarikh: '2026-04-22', nama: 'Pertandingan Inovasi Pelajar ADTEC KT', bengkelIdx: 5, negeri: 'Johor', daerah: 'Kota Tinggi', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'disahkan' },

  // ---- Menunggu Pengesahan (5) ----
  { tarikh: '2026-05-05', nama: 'Seminar Kerjaya & Kebolehpasaran Graduan', bengkelIdx: 4, negeri: 'Johor', daerah: 'Kota Tinggi', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'menunggu_pengesahan' },
  { tarikh: '2026-05-12', nama: 'Bengkel Kemahiran Insaniah Pelajar', bengkelIdx: 2, negeri: 'Selangor', daerah: 'Petaling', pengurus: 'Siti Nur Aisyah', penciptaEmail: 'siti.aisyah@adtec-kt.edu.my', status: 'menunggu_pengesahan' },
  { tarikh: '2026-05-20', nama: 'Program Khidmat Masyarakat Kg. Felda Tenggaroh', bengkelIdx: 0, negeri: 'Johor', daerah: 'Mersing', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'menunggu_pengesahan' },
  { tarikh: '2026-05-28', nama: 'Lawatan Industri ke Kilang Pemesinan Precision', bengkelIdx: 5, negeri: 'Selangor', daerah: 'Hulu Langat', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'menunggu_pengesahan' },
  { tarikh: '2026-06-03', nama: 'Pertandingan Robotic & Automation Peringkat Kebangsaan', bengkelIdx: 2, negeri: 'W.P. Kuala Lumpur', daerah: 'Wilayah Persekutuan Kuala Lumpur', pengurus: 'Siti Nur Aisyah', penciptaEmail: 'siti.aisyah@adtec-kt.edu.my', status: 'menunggu_pengesahan' },

  // ---- Menunggu Semakan (8) ----
  { tarikh: '2026-06-09', nama: 'Gotong-Royong Perdana Kampus', bengkelIdx: 8, negeri: 'Johor', daerah: 'Kota Tinggi', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'menunggu_semakan' },
  { tarikh: '2026-06-16', nama: 'Lawatan Penanda Aras ke ADTEC Melaka', bengkelIdx: 4, negeri: 'Melaka', daerah: 'Melaka Tengah', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'menunggu_semakan' },
  { tarikh: '2026-06-22', nama: 'Program Jejak Kasih Anak Yatim', bengkelIdx: 0, negeri: 'Kelantan', daerah: 'Kota Bharu', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'menunggu_semakan' },
  { tarikh: '2026-06-28', nama: 'Kem Motivasi Pelajar Tahun Akhir', bengkelIdx: 2, negeri: 'Pahang', daerah: 'Kuantan', pengurus: 'Siti Nur Aisyah', penciptaEmail: 'siti.aisyah@adtec-kt.edu.my', status: 'menunggu_semakan' },
  { tarikh: '2026-07-02', nama: 'Bengkel Automotif: Servis Enjin Moden', bengkelIdx: 4, negeri: 'Johor', daerah: 'Johor Bahru', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'menunggu_semakan' },
  { tarikh: '2026-07-04', nama: 'Program Kesedaran Penyelenggaraan Penyaman Udara', bengkelIdx: 1, negeri: 'Johor', daerah: 'Batu Pahat', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'menunggu_semakan' },
  { tarikh: '2026-07-06', nama: 'Pertandingan Pemasangan Paip Berkualiti', bengkelIdx: 8, negeri: 'Selangor', daerah: 'Klang', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'menunggu_semakan' },
  { tarikh: '2026-07-08', nama: 'Sesi Latihan Industri Bersama MIDA', bengkelIdx: 3, negeri: 'W.P. Putrajaya', daerah: 'Wilayah Persekutuan Putrajaya', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'menunggu_semakan' },

  // ---- Ditolak (4) ----
  { tarikh: '2026-04-30', nama: 'Karnival Kerjaya & Pameran Industri', bengkelIdx: 4, negeri: 'Johor', daerah: 'Kota Tinggi', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'ditolak', catatan: 'Maklumat pengurus aktiviti tidak lengkap. Sila kemaskini nama penuh & no. telefon sebelum dihantar semula.' },
  { tarikh: '2026-05-15', nama: 'Program Khidmat Masyarakat Kg. Sri Lalang', bengkelIdx: 0, negeri: 'Johor', daerah: 'Kluang', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'ditolak', catatan: 'Tarikh pelaksanaan bertindih dengan program lain. Sila pilih tarikh alternatif.' },
  { tarikh: '2026-06-12', nama: 'Bengkel Motivasi Pelajar Tingkatan 5', bengkelIdx: 2, negeri: 'Selangor', daerah: 'Petaling', pengurus: 'Siti Nur Aisyah', penciptaEmail: 'siti.aisyah@adtec-kt.edu.my', status: 'ditolak', catatan: 'Lokasi daerah tidak sepadan dengan negeri yang dipilih. Sila semak semula.' },
  { tarikh: '2026-06-25', nama: 'Lawatan ke Kompleks Kimpalan Baja', bengkelIdx: 6, negeri: 'Terengganu', daerah: 'Kemaman', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'ditolak', catatan: 'Dokumen sokongan aktiviti tidak diupload. Sila lampirkan surat kebenaran industri.' },

  // ---- Draf (13) — for Pengajar to practice submitting ----
  { tarikh: '2026-07-10', nama: 'Lawatan Industri ke Toyota Malaysia', bengkelIdx: 4, negeri: 'Selangor', daerah: 'Ulu Langat', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'draf' },
  { tarikh: '2026-07-12', nama: 'Bengkel Kerjaya Teknologi Mekanikal', bengkelIdx: 4, negeri: 'Johor', daerah: 'Muar', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'draf' },
  { tarikh: '2026-07-14', nama: 'Program Khidmat Masyarakat Kg. Mawai', bengkelIdx: 0, negeri: 'Johor', daerah: 'Kota Tinggi', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'draf' },
  { tarikh: '2026-07-15', nama: 'Seminar Inovasi ICT Pelajar', bengkelIdx: 2, negeri: 'Selangor', daerah: 'Petaling', pengurus: 'Siti Nur Aisyah', penciptaEmail: 'siti.aisyah@adtec-kt.edu.my', status: 'draf' },
  { tarikh: '2026-07-16', nama: 'Pertandingan Pendawaian Elektrik', bengkelIdx: 0, negeri: 'Johor', daerah: 'Johor Bahru', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'draf' },
  { tarikh: '2026-07-17', nama: 'Lawatan ke Stesen Janakuasa Sultan Ismail', bengkelIdx: 3, negeri: 'Pahang', daerah: 'Pekan', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'draf' },
  { tarikh: '2026-07-18', nama: 'Bengkel Kesedaran Keselamatan Siber', bengkelIdx: 2, negeri: 'W.P. Kuala Lumpur', daerah: 'Wilayah Persekutuan Kuala Lumpur', pengurus: 'Siti Nur Aisyah', penciptaEmail: 'siti.aisyah@adtec-kt.edu.my', status: 'draf' },
  { tarikh: '2026-07-19', nama: 'Program Khidmat Masyarakat Masjid Jamek', bengkelIdx: 8, negeri: 'Johor', daerah: 'Segamat', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'draf' },
  { tarikh: '2026-07-20', nama: 'Kem Bina Insan Pelajar Tahun 1', bengkelIdx: 1, negeri: 'Melaka', daerah: 'Jasin', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'draf' },
  { tarikh: '2026-07-21', nama: 'Lawatan ke Pabrik Penyejukbekuan', bengkelIdx: 1, negeri: 'Selangor', daerah: 'Klang', pengurus: 'Ahmad Fauzi', penciptaEmail: 'ahmad.fauzi@adtec-kt.edu.my', status: 'draf' },
  { tarikh: '2026-07-22', nama: 'Pertandingan Pemesinan CNC', bengkelIdx: 5, negeri: 'Johor', daerah: 'Pasir Gudang', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'draf' },
  { tarikh: '2026-07-23', nama: 'Program Pembangunan Sahsiah Pelajar', bengkelIdx: 9, negeri: 'Pahang', daerah: 'Temerloh', pengurus: 'Rizal Hakim', penciptaEmail: 'rizal.hakim@adtec-kt.edu.my', status: 'draf' },
  { tarikh: '2026-07-24', nama: 'Bengkel Automotif: Servis Enjin Moden', bengkelIdx: 4, negeri: 'Kelantan', daerah: 'Kota Bharu', pengurus: 'Siti Nur Aisyah', penciptaEmail: 'siti.aisyah@adtec-kt.edu.my', status: 'draf' },
]

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seeding database...')

  // Clean slate
  await db.notification.deleteMany()
  await db.auditLog.deleteMany()
  await db.session.deleteMany()
  await db.aktiviti.deleteMany()
  await db.profile.deleteMany()
  await db.daerah.deleteMany()
  await db.negeri.deleteMany()
  await db.bengkel.deleteMany()
  console.log('  ✓ Cleared existing data')

  // 1. Bengkel
  const bengkelIds: string[] = []
  for (const nama of BENGKEL_LIST) {
    const b = await db.bengkel.create({ data: { namaBengkel: nama } })
    bengkelIds.push(b.id)
  }
  console.log(`  ✓ Inserted ${bengkelIds.length} bengkel`)

  // 2. Negeri + Daerah
  const negeriMap = new Map<string, string>() // namaNegeri -> id
  const daerahMap = new Map<string, string>() // `${negeri}|${daerah}` -> id
  for (const [namaNegeri, daerahList] of Object.entries(NEGERI_DAERAH)) {
    const n = await db.negeri.create({ data: { namaNegeri } })
    negeriMap.set(namaNegeri, n.id)
    for (const namaDaerah of daerahList) {
      const d = await db.daerah.create({ data: { namaDaerah, negeriId: n.id } })
      daerahMap.set(`${namaNegeri}|${namaDaerah}`, d.id)
    }
  }
  console.log(`  ✓ Inserted ${negeriMap.size} negeri, ${daerahMap.size} daerah`)

  // 3. Profiles
  const profileMap = new Map<string, { id: string; role: string; fullName: string }>() // email -> {id, role, name}
  for (const u of USERS) {
    const profile = await db.profile.create({
      data: {
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        passwordHash: hashPassword(u.password),
        active: true,
        bengkelId: u.bengkelIdx !== null ? bengkelIds[u.bengkelIdx] : null,
      },
    })
    profileMap.set(u.email, { id: profile.id, role: profile.role, fullName: profile.fullName })
  }
  console.log(`  ✓ Inserted ${profileMap.size} profiles`)

  // Helper to find a daerah id; if missing, fall back to the first daerah of the negeri
  const resolveDaerah = (negeri: string, daerah: string): string => {
    const key = `${negeri}|${daerah}`
    if (daerahMap.has(key)) return daerahMap.get(key)!
    // fallback — first daerah of negeri
    const nId = negeriMap.get(negeri)
    if (nId) {
      // find any daerah of negeri
      // since we don't have an index, return the first matching negeriId in the map
      for (const [k, v] of daerahMap.entries()) {
        if (k.startsWith(`${negeri}|`)) return v
      }
    }
    // ultimate fallback — first daerah overall
    return Array.from(daerahMap.values())[0]
  }

  // 4. Aktiviti + AuditLog entries
  const penyelarasList = Array.from(profileMap.values()).filter(p => p.role === 'penyelaras')
  const pp = Array.from(profileMap.values()).find(p => p.role === 'penolong_pengarah')!

  let insertedAktiviti = 0
  for (const a of ACTIVITIES) {
    const pencipta = profileMap.get(a.penciptaEmail)!
    const bengkelId = bengkelIds[a.bengkelIdx]
    const negeriId = negeriMap.get(a.negeri)!
    const daerahId = resolveDaerah(a.negeri, a.daerah)

    const now = new Date(a.tarikh)
    // Pick a penyelaras deterministically
    const penyemak = penyelarasList[insertedAktiviti % penyelarasList.length]

    const data: any = {
      tarikhPelaksanaan: now,
      namaAktiviti: a.nama,
      bengkelId,
      negeriId,
      daerahId,
      namaPengurusAktiviti: a.pengurus,
      status: a.status,
      catatanPenolakan: a.catatan ?? null,
      diciptaOleh: pencipta.id,
    }

    // Set audit timestamps based on status
    if (a.status !== 'draf') {
      data.dihantarSemakanPada = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
      data.disemakOleh = penyemak.id
    }
    if (a.status === 'menunggu_pengesahan' || a.status === 'disahkan' || a.status === 'ditolak') {
      data.dihantarPengesahanPada = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    }
    if (a.status === 'disahkan') {
      data.disahkanOleh = pp.id
      data.disahkanPada = now
    }

    const akt = await db.aktiviti.create({ data })

    // Audit logs — create, then submit, then review_forward, then approve/reject
    await db.auditLog.create({
      data: {
        aktivitiId: akt.id,
        tindakan: 'create',
        olehId: pencipta.id,
        catatan: `Cipta draf: ${a.nama}`,
        diciptaPada: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
    })
    if (a.status !== 'draf') {
      await db.auditLog.create({
        data: {
          aktivitiId: akt.id,
          tindakan: 'submit',
          olehId: pencipta.id,
          catatan: 'Hantar kepada Penyelaras',
          diciptaPada: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
      })
      await db.auditLog.create({
        data: {
          aktivitiId: akt.id,
          tindakan: 'review_forward',
          olehId: penyemak.id,
          catatan: 'Disemak & dihantar kepada Penolong Pengarah',
          diciptaPada: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        },
      })
    }
    if (a.status === 'disahkan') {
      await db.auditLog.create({
        data: {
          aktivitiId: akt.id,
          tindakan: 'approve',
          olehId: pp.id,
          catatan: 'Disahkan oleh Penolong Pengarah',
          diciptaPada: now,
        },
      })
    } else if (a.status === 'ditolak') {
      await db.auditLog.create({
        data: {
          aktivitiId: akt.id,
          tindakan: a.catatan?.includes('pengurus') ? 'reject' : 'return',
          olehId: a.catatan?.includes('pengurus') ? pp.id : penyemak.id,
          catatan: a.catatan ?? 'Dikembalikan / ditolak',
          diciptaPada: now,
        },
      })
    }

    insertedAktiviti++
  }
  console.log(`  ✓ Inserted ${insertedAktiviti} aktiviti with audit logs`)

  // 5. Some notifications for pengajars (about rejected activities)
  for (const a of ACTIVITIES.filter(x => x.status === 'ditolak')) {
    const pencipta = profileMap.get(a.penciptaEmail)!
    await db.notification.create({
      data: {
        profileId: pencipta.id,
        title: 'Aktiviti Ditolak/Dipulangkan',
        message: `Aktiviti "${a.nama}" telah dikembalikan. Sila semak catatan & kemaskini.`,
        type: 'reject',
        aktivitiId: null, // not linking by id since we'd need a lookup
        read: false,
      },
    })
  }
  console.log(`  ✓ Inserted notifications`)

  console.log('\n✅ Seed complete!\n')
  console.log('Login credentials:')
  console.log('  Admin:              admin@adtec-kt.edu.my          / Admin@2026')
  console.log('  Pengajar (Elektrik): ahmad.fauzi@adtec-kt.edu.my  / Pengajar@123')
  console.log('  Pengajar (ICT):     siti.aisyah@adtec-kt.edu.my   / Pengajar@123')
  console.log('  Pengajar (Mekanikal): rizal.hakim@adtec-kt.edu.my / Pengajar@123')
  console.log('  Penyelaras:         noraini.yusof@adtec-kt.edu.my / Penyelaras@123')
  console.log('  Penyelaras:         zulkifli.omar@adtec-kt.edu.my / Penyelaras@123')
  console.log('  Penolong Pengarah:  rosli.ibrahim@adtec-kt.edu.my / PPengarah@123')
}

main()
  .then(() => db.$disconnect())
  .catch(async e => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
