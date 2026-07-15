-- =============================================================
-- SISTEM REKOD AKTIVITI PELAJAR ADTEC KT
-- Supabase PostgreSQL Migration Script
-- Generated from local SQLite database with full seed data
-- =============================================================
--
-- Project: https://bcmwnhvzwpgrljvsvjdq.supabase.co
-- Target: Supabase SQL Editor (run all at once)
--
-- This script is IDEMPOTENT — safe to re-run (uses DROP IF EXISTS / ON CONFLICT).
-- It will:
--   1. Create ENUM types
--   2. Create all tables with proper foreign keys
--   3. Enable Row Level Security (RLS) with role-based policies
--   4. Create Supabase Auth users (admin, pengajar, penyelaras, penolong_pengarah)
--   5. Link profiles to auth.users
--   6. Insert all reference data (bengkel, negeri, daerah)
--   7. Insert 51 aktiviti records across all 5 statuses
--   8. Insert audit_log entries and notifications
--
-- IMPORTANT: After running this, the system is ready. Dummy passwords
-- match the PRD section 14.1.
--

-- =============================================================
-- 0. CLEANUP — Drop existing objects (idempotent)
-- =============================================================


DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS aktiviti CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS daerah CASCADE;
DROP TABLE IF EXISTS negeri CASCADE;
DROP TABLE IF EXISTS bengkel CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS aktiviti_status CASCADE;


-- =============================================================
-- 1. ENUM TYPES
-- =============================================================


CREATE TYPE user_role AS ENUM
  ('pengajar','penyelaras','penolong_pengarah','admin');

CREATE TYPE aktiviti_status AS ENUM
  ('draf','menunggu_semakan','menunggu_pengesahan','disahkan','ditolak');


-- =============================================================
-- 2. REFERENCE TABLES — bengkel, negeri, daerah
-- =============================================================


CREATE TABLE bengkel (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_bengkel text NOT NULL UNIQUE,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE negeri (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_negeri text NOT NULL UNIQUE,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE daerah (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_daerah text NOT NULL,
  negeri_id   uuid NOT NULL REFERENCES negeri(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (nama_daerah, negeri_id)
);


-- =============================================================
-- 3. PROFILES — linked to auth.users
-- =============================================================


CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL UNIQUE,
  full_name     text NOT NULL,
  role          user_role NOT NULL,
  bengkel_id    uuid REFERENCES bengkel(id),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_bengkel ON profiles(bengkel_id);


-- =============================================================
-- 4. AKTIVITI — main transactional table
-- =============================================================


CREATE TABLE aktiviti (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarikh_pelaksanaan        date NOT NULL,
  nama_aktiviti             text NOT NULL,
  bengkel_id                uuid NOT NULL REFERENCES bengkel(id),
  negeri_id                 uuid NOT NULL REFERENCES negeri(id),
  daerah_id                 uuid NOT NULL REFERENCES daerah(id),
  nama_pengurus_aktiviti    text NOT NULL,
  status                    aktiviti_status NOT NULL DEFAULT 'draf',
  catatan_penolakan         text,
  dicipta_oleh              uuid NOT NULL REFERENCES profiles(id),
  disemak_oleh              uuid REFERENCES profiles(id),
  disahkan_oleh             uuid REFERENCES profiles(id),
  dihantar_semakan_pada     timestamptz,
  dihantar_pengesahan_pada  timestamptz,
  disahkan_pada             timestamptz,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

CREATE INDEX idx_aktiviti_status ON aktiviti(status);
CREATE INDEX idx_aktiviti_dicipta ON aktiviti(dicipta_oleh);
CREATE INDEX idx_aktiviti_tarikh ON aktiviti(tarikh_pelaksanaan);
CREATE INDEX idx_aktiviti_negeri ON aktiviti(negeri_id);
CREATE INDEX idx_aktiviti_daerah ON aktiviti(daerah_id);
CREATE INDEX idx_aktiviti_bengkel ON aktiviti(bengkel_id);


-- =============================================================
-- 5. AUDIT LOG — append-only
-- =============================================================


CREATE TABLE audit_log (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  aktiviti_id  uuid NOT NULL REFERENCES aktiviti(id) ON DELETE CASCADE,
  tindakan     text NOT NULL,
  oleh_id      uuid NOT NULL REFERENCES profiles(id),
  catatan      text,
  dicipta_pada timestamptz DEFAULT now()
);

CREATE INDEX idx_auditlog_aktiviti ON audit_log(aktiviti_id);
CREATE INDEX idx_auditlog_oleh ON audit_log(oleh_id);


-- =============================================================
-- 6. NOTIFICATIONS — in-app
-- =============================================================


CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  message     text NOT NULL,
  type        text NOT NULL DEFAULT 'system',
  read        boolean NOT NULL DEFAULT false,
  aktiviti_id uuid REFERENCES aktiviti(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_profile_unread ON notifications(profile_id, read);


-- =============================================================
-- 7. SEED — bengkel
-- =============================================================

INSERT INTO bengkel (id, nama_bengkel, created_at) VALUES ('decce39b-0b59-4cf6-8b03-1a22caebbf46', 'Diploma Tek. Elektrik (Kuasa)', '2026-07-14T10:27:42.103Z');
INSERT INTO bengkel (id, nama_bengkel, created_at) VALUES ('f21e995e-8100-4c0c-8ac9-96947bc869f3', 'Tek. Binaan (Berasaskan Kayu)', '2026-07-14T10:27:42.110Z');
INSERT INTO bengkel (id, nama_bengkel, created_at) VALUES ('2269abe7-fda0-40e2-8265-91c114888ae0', 'Tek. Binaan (Paip & Sanitari)', '2026-07-14T10:27:42.111Z');
INSERT INTO bengkel (id, nama_bengkel, created_at) VALUES ('03db58e6-4a59-41bb-860b-a206450b5579', 'Tek. Binaan (Sivil & Struktur)', '2026-07-14T10:27:42.114Z');
INSERT INTO bengkel (id, nama_bengkel, created_at) VALUES ('5e55a3e1-d1b9-404f-88a7-439c38504226', 'Tek. Komputer (Sistem)', '2026-07-14T10:27:42.102Z');
INSERT INTO bengkel (id, nama_bengkel, created_at) VALUES ('e64c61fd-878f-4045-8876-af788e4a80ef', 'Tek. Pem. Paip Minyak & Gas', '2026-07-14T10:27:42.110Z');
INSERT INTO bengkel (id, nama_bengkel, created_at) VALUES ('f10e05bc-4ddd-4067-8cfc-dd3b6bed47ba', 'Tek. Pembuatan (Pemesinan)', '2026-07-14T10:27:42.109Z');
INSERT INTO bengkel (id, nama_bengkel, created_at) VALUES ('1255b17d-a256-4e00-8d7e-8e1408f1298f', 'Tek. Pendawaian Elektrik 3 Fasa', '2026-07-14T10:27:42.099Z');
INSERT INTO bengkel (id, nama_bengkel, created_at) VALUES ('0b6af898-6371-401e-8541-128e8eca2a26', 'Tek. Penyejukbekuan & Penyamanan Udara', '2026-07-14T10:27:42.100Z');
INSERT INTO bengkel (id, nama_bengkel, created_at) VALUES ('ebed6a42-0b8c-4adc-847b-e33eada7c334', 'Tek. Penyenggaraan Mekanikal', '2026-07-14T10:27:42.104Z');

-- =============================================================
-- 8. SEED — negeri (16 Malaysian states)
-- =============================================================

INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('9342e1d6-58aa-403f-8f0d-f95332e505d8', 'Johor', '2026-07-14T10:27:42.114Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('4e221618-2274-43a6-8b26-9de2b16c2e2e', 'Kedah', '2026-07-14T10:27:42.123Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('3dd8a39e-bf52-45ab-800a-efb29c2de3fc', 'Kelantan', '2026-07-14T10:27:42.126Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('677425ff-abd3-48e5-80d5-78a09d98ba5f', 'Melaka', '2026-07-14T10:27:42.136Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('ffec47ed-cfcf-4c44-8be2-0aa4dc3d91d0', 'Negeri Sembilan', '2026-07-14T10:27:42.140Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('2d4caf94-7825-47be-898e-a69c2167ae3a', 'Pahang', '2026-07-14T10:27:42.146Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('227458b1-e2f7-4db6-830b-802198c6d986', 'Perak', '2026-07-14T10:27:42.153Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('964243ec-7bfc-4ab3-8779-470b5e232349', 'Perlis', '2026-07-14T10:27:42.156Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('8c081d9c-5a7a-4b94-8aae-e8bb337f7807', 'Pulau Pinang', '2026-07-14T10:27:42.158Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('3c4f5e0e-4c77-4ee6-8714-7fc0096652ec', 'Sabah', '2026-07-14T10:27:42.160Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('fa51d434-1a34-4295-8ed9-c303cf06c127', 'Sarawak', '2026-07-14T10:27:42.163Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('c4d26d6e-64fd-421b-8d00-bd7f61932894', 'Selangor', '2026-07-14T10:27:42.165Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('4996ef8a-f528-491a-87ed-6e007607839f', 'Terengganu', '2026-07-14T10:27:42.185Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('82365d30-e5f7-4a03-8430-d81dd482d1dc', 'W.P. Kuala Lumpur', '2026-07-14T10:27:42.188Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('e30d1a97-3a6f-49ef-8091-97ccecea755f', 'W.P. Labuan', '2026-07-14T10:27:42.189Z');
INSERT INTO negeri (id, nama_negeri, created_at) VALUES ('ef84f26e-9f69-4bcf-8450-600da7c6712d', 'W.P. Putrajaya', '2026-07-14T10:27:42.191Z');

-- =============================================================
-- 9. SEED — daerah
-- =============================================================

INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('89ac7d51-78e5-4beb-86a6-26c79a42cf1e', 'Alor Gajah', '677425ff-abd3-48e5-80d5-78a09d98ba5f', '2026-07-14T10:27:42.138Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('9b4342fa-f57d-4b96-866e-b003735c9192', 'Alor Setar', '4e221618-2274-43a6-8b26-9de2b16c2e2e', '2026-07-14T10:27:42.124Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('243512a9-9a0a-4152-873b-327ef13e9a1d', 'Arau', '964243ec-7bfc-4ab3-8779-470b5e232349', '2026-07-14T10:27:42.157Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('0f0e37bf-8e1a-4437-8082-6073e16d886d', 'Baling', '4e221618-2274-43a6-8b26-9de2b16c2e2e', '2026-07-14T10:27:42.126Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('6d272e2c-4a7c-43ea-80a9-ae86b5bbfd61', 'Batu Pahat', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '2026-07-14T10:27:42.120Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('03be445c-354f-41c6-898c-8d4434855848', 'Bentong', '2d4caf94-7825-47be-898e-a69c2167ae3a', '2026-07-14T10:27:42.149Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('07f1b616-9df1-4029-85b2-f31506c2b5f4', 'Besut', '4996ef8a-f528-491a-87ed-6e007607839f', '2026-07-14T10:27:42.188Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('ef1d4390-3e20-44bd-81cc-417958848527', 'Bintulu', 'fa51d434-1a34-4295-8ed9-c303cf06c127', '2026-07-14T10:27:42.164Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('7e119688-0beb-4729-8934-3059df9aa9fa', 'Dungun', '4996ef8a-f528-491a-87ed-6e007607839f', '2026-07-14T10:27:42.187Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('af16ac4e-9384-42a5-8022-9e5f40825717', 'Gombak', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', '2026-07-14T10:27:42.166Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('2e010d6a-ae5a-4b75-8137-d01d82b97a85', 'Gua Musang', '3dd8a39e-bf52-45ab-800a-efb29c2de3fc', '2026-07-14T10:27:42.134Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('4ce4dc66-bd42-43ca-8efa-5ca20e482097', 'Hulu Langat', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', '2026-07-14T10:27:42.179Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('3f770c67-3e3f-447d-88c5-91e4559b0606', 'Ipoh', '227458b1-e2f7-4db6-830b-802198c6d986', '2026-07-14T10:27:42.154Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('a9a49fcf-e0d2-4f46-852d-9812a502940b', 'Jasin', '677425ff-abd3-48e5-80d5-78a09d98ba5f', '2026-07-14T10:27:42.139Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('9d27902d-9f6b-4dc2-8f02-6bde69b97e6e', 'Jempol', 'ffec47ed-cfcf-4c44-8be2-0aa4dc3d91d0', '2026-07-14T10:27:42.144Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('9b40daec-f16d-4c33-84b5-c103c3cbc59f', 'Johor Bahru', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '2026-07-14T10:27:42.118Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('2223c894-6c2c-4f99-80b9-2db907bd879c', 'Kangar', '964243ec-7bfc-4ab3-8779-470b5e232349', '2026-07-14T10:27:42.157Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('088b0479-5c54-4feb-84ca-9472889b98a2', 'Kemaman', '4996ef8a-f528-491a-87ed-6e007607839f', '2026-07-14T10:27:42.186Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('e0ff2f51-8369-4454-81a8-588458699752', 'Klang', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', '2026-07-14T10:27:42.165Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('f8b5ca54-4b45-4103-8d60-48ab4151da50', 'Kluang', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '2026-07-14T10:27:42.119Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('ba9aceff-3d4e-4615-89ce-5a8ac9a073c8', 'Kota Bharu', '3dd8a39e-bf52-45ab-800a-efb29c2de3fc', '2026-07-14T10:27:42.128Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('490bd94e-0466-43fd-8ba5-2f5c8ee8b9b6', 'Kota Kinabalu', '3c4f5e0e-4c77-4ee6-8714-7fc0096652ec', '2026-07-14T10:27:42.161Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('4c62458a-d701-4b52-8433-369b2d711227', 'Kota Tinggi', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '2026-07-14T10:27:42.116Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('361a1e29-a1ab-496d-8808-8931f809f95b', 'Kuala Kangsar', '227458b1-e2f7-4db6-830b-802198c6d986', '2026-07-14T10:27:42.156Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('4307e9c8-914d-459f-8f17-59ef73bfc313', 'Kuala Muda', '4e221618-2274-43a6-8b26-9de2b16c2e2e', '2026-07-14T10:27:42.125Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('c509c6e4-55b7-4fa9-83da-b1141bdaf49c', 'Kuala Selangor', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', '2026-07-14T10:27:42.182Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('9cbe15dd-d7e9-4c65-8e2c-378903670c7e', 'Kuala Terengganu', '4996ef8a-f528-491a-87ed-6e007607839f', '2026-07-14T10:27:42.185Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('d36b1539-8bfe-4f45-85eb-dd6472914d17', 'Kuantan', '2d4caf94-7825-47be-898e-a69c2167ae3a', '2026-07-14T10:27:42.147Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('c03bb64b-223f-4724-8c13-f0eae1226f5a', 'Kubang Pasu', '4e221618-2274-43a6-8b26-9de2b16c2e2e', '2026-07-14T10:27:42.124Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('f2b1f34d-2b89-489d-8a2b-4de2fe313b50', 'Kuching', 'fa51d434-1a34-4295-8ed9-c303cf06c127', '2026-07-14T10:27:42.163Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('d48f5648-3433-456e-8a6c-c4ab33175b1b', 'Kudat', '3c4f5e0e-4c77-4ee6-8714-7fc0096652ec', '2026-07-14T10:27:42.162Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('1aaec40a-5c7e-4c8b-8e16-84f0d3a7b11f', 'Machang', '3dd8a39e-bf52-45ab-800a-efb29c2de3fc', '2026-07-14T10:27:42.133Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('a40d4b99-cf1a-4732-841d-0d0e7b8fb1d7', 'Manjung', '227458b1-e2f7-4db6-830b-802198c6d986', '2026-07-14T10:27:42.156Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('5c9cddba-a9fe-43c3-86e6-79c719d67255', 'Marang', '4996ef8a-f528-491a-87ed-6e007607839f', '2026-07-14T10:27:42.187Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('991dfcf4-cdc6-408a-8dc3-7718d2dee641', 'Melaka Tengah', '677425ff-abd3-48e5-80d5-78a09d98ba5f', '2026-07-14T10:27:42.136Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('312ab6bc-d524-4624-8bc1-3452bbd5a5f8', 'Merlimau', '677425ff-abd3-48e5-80d5-78a09d98ba5f', '2026-07-14T10:27:42.140Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('ab931615-1d0f-474f-86e5-d9e9a9ca0738', 'Miri', 'fa51d434-1a34-4295-8ed9-c303cf06c127', '2026-07-14T10:27:42.163Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('a0220ef2-5296-47d0-8abe-1fca1e7ce81e', 'Muar', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '2026-07-14T10:27:42.121Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('d8e73d4f-6df4-4371-84b9-267903599853', 'Padang Besar', '964243ec-7bfc-4ab3-8779-470b5e232349', '2026-07-14T10:27:42.158Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('c306707a-07e5-401e-88e8-ba65de9ce514', 'Pasir Mas', '3dd8a39e-bf52-45ab-800a-efb29c2de3fc', '2026-07-14T10:27:42.129Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('f3562a7b-3458-487f-8c09-824c6ba64635', 'Pekan', '2d4caf94-7825-47be-898e-a69c2167ae3a', '2026-07-14T10:27:42.150Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('5faf3b79-6605-4520-8354-236b0021b746', 'Penampang', '3c4f5e0e-4c77-4ee6-8714-7fc0096652ec', '2026-07-14T10:27:42.162Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('1267e860-4f41-4059-8ff6-e84ed7be48b4', 'Petaling', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', '2026-07-14T10:27:42.165Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('b8c93572-ef42-4cc3-8fbe-97770313ec01', 'Port Dickson', 'ffec47ed-cfcf-4c44-8be2-0aa4dc3d91d0', '2026-07-14T10:27:42.143Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('297d258c-9efd-44e3-8721-61f4a22304f5', 'Rembau', 'ffec47ed-cfcf-4c44-8be2-0aa4dc3d91d0', '2026-07-14T10:27:42.144Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('654d059e-5932-45c0-8fe2-dba92ddf5a9b', 'Rompin', '2d4caf94-7825-47be-898e-a69c2167ae3a', '2026-07-14T10:27:42.152Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('7ae153c6-efb6-4ce6-86be-65c9e78797f5', 'Sabak Bernam', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', '2026-07-14T10:27:42.184Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('4205d40a-a9b4-4d10-8482-7104db16fc93', 'Sandakan', '3c4f5e0e-4c77-4ee6-8714-7fc0096652ec', '2026-07-14T10:27:42.162Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('0111e35c-98cf-4f35-824d-76d77fbd7333', 'Seberang Perai Selatan', '8c081d9c-5a7a-4b94-8aae-e8bb337f7807', '2026-07-14T10:27:42.160Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('065af274-58ed-440c-8992-a873401e9233', 'Seberang Perai Tengah', '8c081d9c-5a7a-4b94-8aae-e8bb337f7807', '2026-07-14T10:27:42.159Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('71556958-a19c-4d49-8cd4-f4b3fb347065', 'Seberang Perai Utara', '8c081d9c-5a7a-4b94-8aae-e8bb337f7807', '2026-07-14T10:27:42.159Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('477b40e4-3d1a-4289-84d9-4b7c1df6cc5a', 'Segamat', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '2026-07-14T10:27:42.122Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('b4d75902-a794-45c8-8097-da5fc214e3c2', 'Seremban', 'ffec47ed-cfcf-4c44-8be2-0aa4dc3d91d0', '2026-07-14T10:27:42.142Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('d2370ba9-b7e2-42dc-8983-2a3e88ae295a', 'Sibu', 'fa51d434-1a34-4295-8ed9-c303cf06c127', '2026-07-14T10:27:42.164Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('83126d79-db19-48cc-864f-f7d66add6e5e', 'Sri Aman', 'fa51d434-1a34-4295-8ed9-c303cf06c127', '2026-07-14T10:27:42.164Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('bd4f1130-9439-472b-8544-15cf9dce066e', 'Taiping', '227458b1-e2f7-4db6-830b-802198c6d986', '2026-07-14T10:27:42.155Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('d9b62ac5-0fe1-4635-82a8-9b01604c73e6', 'Tanah Merah', '3dd8a39e-bf52-45ab-800a-efb29c2de3fc', '2026-07-14T10:27:42.131Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('7cddd769-824b-40e2-8b1e-02f199b6cfc8', 'Tawau', '3c4f5e0e-4c77-4ee6-8714-7fc0096652ec', '2026-07-14T10:27:42.161Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('c74a80dc-3a01-4ff1-8f79-5e906646ff27', 'Teluk Intan', '227458b1-e2f7-4db6-830b-802198c6d986', '2026-07-14T10:27:42.155Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('da451557-3d7a-408f-8984-de725a613cf1', 'Temerloh', '2d4caf94-7825-47be-898e-a69c2167ae3a', '2026-07-14T10:27:42.148Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('65718788-52a0-4bf1-8b0e-8ce8ae73c805', 'Timur Laut', '8c081d9c-5a7a-4b94-8aae-e8bb337f7807', '2026-07-14T10:27:42.158Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('795d2ff2-83fa-4207-8026-8c1ee80bc974', 'Wilayah Persekutuan Kuala Lumpur', '82365d30-e5f7-4a03-8430-d81dd482d1dc', '2026-07-14T10:27:42.189Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('8cbd221b-eb0f-44df-8ea2-d2d600f30313', 'Wilayah Persekutuan Labuan', 'e30d1a97-3a6f-49ef-8091-97ccecea755f', '2026-07-14T10:27:42.190Z');
INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES ('aaa96a67-f538-46f5-8bbf-0a917a6c612d', 'Wilayah Persekutuan Putrajaya', 'ef84f26e-9f69-4bcf-8450-600da7c6712d', '2026-07-14T10:27:42.191Z');

-- =============================================================
-- 10. SEED — Supabase Auth users + profiles

-- Clean up any existing auth.users with our dummy emails (idempotent)
DELETE FROM auth.users WHERE email IN (
  'admin@adtec-kt.edu.my',
  'ahmad.fauzi@adtec-kt.edu.my',
  'siti.aisyah@adtec-kt.edu.my',
  'rizal.hakim@adtec-kt.edu.my',
  'noraini.yusof@adtec-kt.edu.my',
  'zulkifli.omar@adtec-kt.edu.my',
  'rosli.ibrahim@adtec-kt.edu.my'
);
-- =============================================================


-- Create auth.users entries using the admin API-compatible function
-- NOTE: This uses auth.users directly. Passwords are hashed by Supabase.
-- Dummy passwords (PRD §14.1):
--   admin@adtec-kt.edu.my           / Admin@2026
--   ahmad.fauzi@adtec-kt.edu.my     / Pengajar@123
--   siti.aisyah@adtec-kt.edu.my     / Pengajar@123
--   rizal.hakim@adtec-kt.edu.my     / Pengajar@123
--   noraini.yusof@adtec-kt.edu.my   / Penyelaras@123
--   zulkifli.omar@adtec-kt.edu.my   / Penyelaras@123
--   rosli.ibrahim@adtec-kt.edu.my   / PPengarah@123

-- We need to insert into auth.users with encrypted_password.
-- This requires the supabase_admin role which is available in SQL Editor.


-- Auth user: admin@adtec-kt.edu.my
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '863343e8-1662-4a1c-8037-b9220f821ab4',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@adtec-kt.edu.my',
  crypt('Admin@2026', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  '2026-07-14T10:27:42.262Z',
  now(),
  NULL,
  '', '', '', ''
);

-- Profile entry
INSERT INTO profiles (id, email, full_name, role, bengkel_id, active, created_at, updated_at)
VALUES (
  '863343e8-1662-4a1c-8037-b9220f821ab4',
  'admin@adtec-kt.edu.my',
  'Admin Sistem',
  'admin',
  NULL,
  true,
  '2026-07-14T10:27:42.262Z',
  now()
);

-- Auth user: ahmad.fauzi@adtec-kt.edu.my
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  'd1596fc8-7523-4706-873f-3ab8d166d75b',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'ahmad.fauzi@adtec-kt.edu.my',
  crypt('Pengajar@123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  '2026-07-14T10:27:42.314Z',
  now(),
  NULL,
  '', '', '', ''
);

-- Profile entry
INSERT INTO profiles (id, email, full_name, role, bengkel_id, active, created_at, updated_at)
VALUES (
  'd1596fc8-7523-4706-873f-3ab8d166d75b',
  'ahmad.fauzi@adtec-kt.edu.my',
  'Ahmad Fauzi',
  'pengajar',
  '1255b17d-a256-4e00-8d7e-8e1408f1298f',
  true,
  '2026-07-14T10:27:42.314Z',
  now()
);

-- Auth user: siti.aisyah@adtec-kt.edu.my
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  'f66e97cc-3937-42d8-85c3-300f04181824',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'siti.aisyah@adtec-kt.edu.my',
  crypt('Pengajar@123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  '2026-07-14T10:27:42.379Z',
  now(),
  NULL,
  '', '', '', ''
);

-- Profile entry
INSERT INTO profiles (id, email, full_name, role, bengkel_id, active, created_at, updated_at)
VALUES (
  'f66e97cc-3937-42d8-85c3-300f04181824',
  'siti.aisyah@adtec-kt.edu.my',
  'Siti Nur Aisyah',
  'pengajar',
  '5e55a3e1-d1b9-404f-88a7-439c38504226',
  true,
  '2026-07-14T10:27:42.379Z',
  now()
);

-- Auth user: rizal.hakim@adtec-kt.edu.my
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'rizal.hakim@adtec-kt.edu.my',
  crypt('Pengajar@123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  '2026-07-14T10:27:42.470Z',
  now(),
  NULL,
  '', '', '', ''
);

-- Profile entry
INSERT INTO profiles (id, email, full_name, role, bengkel_id, active, created_at, updated_at)
VALUES (
  '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c',
  'rizal.hakim@adtec-kt.edu.my',
  'Rizal Hakim',
  'pengajar',
  'ebed6a42-0b8c-4adc-847b-e33eada7c334',
  true,
  '2026-07-14T10:27:42.470Z',
  now()
);

-- Auth user: noraini.yusof@adtec-kt.edu.my
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  'a6b56cbc-df60-4760-80dc-eeb09eae2956',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'noraini.yusof@adtec-kt.edu.my',
  crypt('Penyelaras@123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  '2026-07-14T10:27:42.552Z',
  now(),
  NULL,
  '', '', '', ''
);

-- Profile entry
INSERT INTO profiles (id, email, full_name, role, bengkel_id, active, created_at, updated_at)
VALUES (
  'a6b56cbc-df60-4760-80dc-eeb09eae2956',
  'noraini.yusof@adtec-kt.edu.my',
  'Noraini Yusof',
  'penyelaras',
  NULL,
  true,
  '2026-07-14T10:27:42.552Z',
  now()
);

-- Auth user: zulkifli.omar@adtec-kt.edu.my
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '5041226e-151d-49e2-8c58-82bad51b2ad7',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'zulkifli.omar@adtec-kt.edu.my',
  crypt('Penyelaras@123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  '2026-07-14T10:27:42.594Z',
  now(),
  NULL,
  '', '', '', ''
);

-- Profile entry
INSERT INTO profiles (id, email, full_name, role, bengkel_id, active, created_at, updated_at)
VALUES (
  '5041226e-151d-49e2-8c58-82bad51b2ad7',
  'zulkifli.omar@adtec-kt.edu.my',
  'Zulkifli Omar',
  'penyelaras',
  NULL,
  true,
  '2026-07-14T10:27:42.594Z',
  now()
);

-- Auth user: rosli.ibrahim@adtec-kt.edu.my
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '64b782ff-4756-4de5-891d-2bd174a6c6b5',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'rosli.ibrahim@adtec-kt.edu.my',
  crypt('PPengarah@123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  '2026-07-14T10:27:42.662Z',
  now(),
  NULL,
  '', '', '', ''
);

-- Profile entry
INSERT INTO profiles (id, email, full_name, role, bengkel_id, active, created_at, updated_at)
VALUES (
  '64b782ff-4756-4de5-891d-2bd174a6c6b5',
  'rosli.ibrahim@adtec-kt.edu.my',
  'Rosli Ibrahim',
  'penolong_pengarah',
  NULL,
  true,
  '2026-07-14T10:27:42.662Z',
  now()
);

-- =============================================================
-- 11. SEED — aktiviti (51 records across all statuses)
-- =============================================================

INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('6d4a9d91-a569-47b0-83bb-a50134408c07', '2025-08-12', 'Lawatan Industri ke Pabrik Automotif Tanjung Pelepas', 'ebed6a42-0b8c-4adc-847b-e33eada7c334', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '9b40daec-f16d-4c33-84b5-c103c3cbc59f', 'Rizal Hakim', 'disahkan', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2025-08-07T00:00:00.000Z', '2025-08-10T00:00:00.000Z', '2025-08-12T00:00:00.000Z', '2026-07-14T10:27:42.665Z', '2026-07-14T10:27:42.665Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('cf16db4b-b981-4557-85ba-0c8b75359e7c', '2025-08-25', 'Program Khidmat Masyarakat Kg. Bekok', '1255b17d-a256-4e00-8d7e-8e1408f1298f', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '6d272e2c-4a7c-43ea-80a9-ae86b5bbfd61', 'Ahmad Fauzi', 'disahkan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', '5041226e-151d-49e2-8c58-82bad51b2ad7', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2025-08-20T00:00:00.000Z', '2025-08-23T00:00:00.000Z', '2025-08-25T00:00:00.000Z', '2026-07-14T10:27:42.670Z', '2026-07-14T10:27:42.670Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('8af962b3-2cce-40e8-86b3-323b02abd56c', '2025-09-05', 'Pertandingan Kemahiran ICT Peringkat Negeri Johor', '5e55a3e1-d1b9-404f-88a7-439c38504226', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '9b40daec-f16d-4c33-84b5-c103c3cbc59f', 'Siti Nur Aisyah', 'disahkan', NULL, 'f66e97cc-3937-42d8-85c3-300f04181824', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2025-08-31T00:00:00.000Z', '2025-09-03T00:00:00.000Z', '2025-09-05T00:00:00.000Z', '2026-07-14T10:27:42.672Z', '2026-07-14T10:27:42.672Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('bdd6564d-958d-49c4-8dde-b6a47a9c04dc', '2025-09-18', 'Seminar Kerjaya & Kebolehpasaran Graduan', 'ebed6a42-0b8c-4adc-847b-e33eada7c334', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '4c62458a-d701-4b52-8433-369b2d711227', 'Rizal Hakim', 'disahkan', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', '5041226e-151d-49e2-8c58-82bad51b2ad7', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2025-09-13T00:00:00.000Z', '2025-09-16T00:00:00.000Z', '2025-09-18T00:00:00.000Z', '2026-07-14T10:27:42.674Z', '2026-07-14T10:27:42.674Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('626ee4db-717c-4a6c-87e2-88ae644c1040', '2025-10-03', 'Bengkel Kemahiran Insaniah Pelajar Tahap 2', '5e55a3e1-d1b9-404f-88a7-439c38504226', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', '1267e860-4f41-4059-8ff6-e84ed7be48b4', 'Siti Nur Aisyah', 'disahkan', NULL, 'f66e97cc-3937-42d8-85c3-300f04181824', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2025-09-28T00:00:00.000Z', '2025-10-01T00:00:00.000Z', '2025-10-03T00:00:00.000Z', '2026-07-14T10:27:42.676Z', '2026-07-14T10:27:42.676Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('54c0d244-02b4-4f31-81fc-5e55262a9321', '2025-10-15', 'Gotong-Royong Perdana Kampus ADTEC KT', '2269abe7-fda0-40e2-8265-91c114888ae0', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '4c62458a-d701-4b52-8433-369b2d711227', 'Rizal Hakim', 'disahkan', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', '5041226e-151d-49e2-8c58-82bad51b2ad7', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2025-10-10T00:00:00.000Z', '2025-10-13T00:00:00.000Z', '2025-10-15T00:00:00.000Z', '2026-07-14T10:27:42.682Z', '2026-07-14T10:27:42.682Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('a768d1e8-341a-4f53-8f22-76d58e1a5ba0', '2025-10-28', 'Lawatan Penanda Aras ke ADTEC Melaka', 'ebed6a42-0b8c-4adc-847b-e33eada7c334', '677425ff-abd3-48e5-80d5-78a09d98ba5f', '991dfcf4-cdc6-408a-8dc3-7718d2dee641', 'Rizal Hakim', 'disahkan', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2025-10-23T00:00:00.000Z', '2025-10-26T00:00:00.000Z', '2025-10-28T00:00:00.000Z', '2026-07-14T10:27:42.701Z', '2026-07-14T10:27:42.701Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('623d027e-427b-45cd-8480-0d36bc52d337', '2025-11-10', 'Program Jejak Kasih Anak Yatim', '1255b17d-a256-4e00-8d7e-8e1408f1298f', '3dd8a39e-bf52-45ab-800a-efb29c2de3fc', 'ba9aceff-3d4e-4615-89ce-5a8ac9a073c8', 'Ahmad Fauzi', 'disahkan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', '5041226e-151d-49e2-8c58-82bad51b2ad7', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2025-11-05T00:00:00.000Z', '2025-11-08T00:00:00.000Z', '2025-11-10T00:00:00.000Z', '2026-07-14T10:27:42.711Z', '2026-07-14T10:27:42.711Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('72241517-ebdb-4ac0-80f5-1e99ab0c648f', '2025-11-22', 'Kem Motivasi Pelajar Tahun Akhir', '5e55a3e1-d1b9-404f-88a7-439c38504226', '2d4caf94-7825-47be-898e-a69c2167ae3a', 'd36b1539-8bfe-4f45-85eb-dd6472914d17', 'Siti Nur Aisyah', 'disahkan', NULL, 'f66e97cc-3937-42d8-85c3-300f04181824', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2025-11-17T00:00:00.000Z', '2025-11-20T00:00:00.000Z', '2025-11-22T00:00:00.000Z', '2026-07-14T10:27:42.719Z', '2026-07-14T10:27:42.719Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('689384b1-728f-4b49-8922-f5ec9bbadd93', '2025-12-05', 'Karnival Kerjaya & Pameran Industri 2025', 'ebed6a42-0b8c-4adc-847b-e33eada7c334', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '4c62458a-d701-4b52-8433-369b2d711227', 'Rizal Hakim', 'disahkan', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', '5041226e-151d-49e2-8c58-82bad51b2ad7', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2025-11-30T00:00:00.000Z', '2025-12-03T00:00:00.000Z', '2025-12-05T00:00:00.000Z', '2026-07-14T10:27:42.729Z', '2026-07-14T10:27:42.729Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('d1b0d34b-05ef-44df-8e03-c5d656c941dc', '2025-12-18', 'Latihan Industri Bersama Sime Darby', '0b6af898-6371-401e-8541-128e8eca2a26', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', 'e0ff2f51-8369-4454-81a8-588458699752', 'Ahmad Fauzi', 'disahkan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2025-12-13T00:00:00.000Z', '2025-12-16T00:00:00.000Z', '2025-12-18T00:00:00.000Z', '2026-07-14T10:27:42.738Z', '2026-07-14T10:27:42.738Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('011c7097-5bb3-40e9-8cd5-36acbe306ab3', '2026-01-08', 'Program Kebajikan Bulan Madani', '2269abe7-fda0-40e2-8265-91c114888ae0', '9342e1d6-58aa-403f-8f0d-f95332e505d8', 'f8b5ca54-4b45-4103-8d60-48ab4151da50', 'Rizal Hakim', 'disahkan', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', '5041226e-151d-49e2-8c58-82bad51b2ad7', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2026-01-03T00:00:00.000Z', '2026-01-06T00:00:00.000Z', '2026-01-08T00:00:00.000Z', '2026-07-14T10:27:42.745Z', '2026-07-14T10:27:42.745Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('fa6cb26e-1c34-4f3b-864f-d5534e298acf', '2026-01-20', 'Seminar Kesedaran Keselamatan Siber', '5e55a3e1-d1b9-404f-88a7-439c38504226', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', 'af16ac4e-9384-42a5-8022-9e5f40825717', 'Siti Nur Aisyah', 'disahkan', NULL, 'f66e97cc-3937-42d8-85c3-300f04181824', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2026-01-15T00:00:00.000Z', '2026-01-18T00:00:00.000Z', '2026-01-20T00:00:00.000Z', '2026-07-14T10:27:42.750Z', '2026-07-14T10:27:42.750Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('ffbbab3b-f812-4ac6-8279-dc99ea7b38db', '2026-02-03', 'Lawatan Industri ke Pabrik Automotif', 'ebed6a42-0b8c-4adc-847b-e33eada7c334', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '4c62458a-d701-4b52-8433-369b2d711227', 'Rizal Hakim', 'disahkan', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', '5041226e-151d-49e2-8c58-82bad51b2ad7', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2026-01-29T00:00:00.000Z', '2026-02-01T00:00:00.000Z', '2026-02-03T00:00:00.000Z', '2026-07-14T10:27:42.755Z', '2026-07-14T10:27:42.755Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('68f049e1-7dcc-48a4-856b-5d21d5b84ea8', '2026-02-10', 'Program Khidmat Masyarakat Kg. Bekok', '1255b17d-a256-4e00-8d7e-8e1408f1298f', '9342e1d6-58aa-403f-8f0d-f95332e505d8', 'f8b5ca54-4b45-4103-8d60-48ab4151da50', 'Ahmad Fauzi', 'disahkan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2026-02-05T00:00:00.000Z', '2026-02-08T00:00:00.000Z', '2026-02-10T00:00:00.000Z', '2026-07-14T10:27:42.758Z', '2026-07-14T10:27:42.758Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('18d88a78-fe75-4522-89c7-f0ef5ee5c9b3', '2026-02-18', 'Pertandingan Kemahiran ICT Peringkat Negeri', '5e55a3e1-d1b9-404f-88a7-439c38504226', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '9b40daec-f16d-4c33-84b5-c103c3cbc59f', 'Siti Nur Aisyah', 'disahkan', NULL, 'f66e97cc-3937-42d8-85c3-300f04181824', '5041226e-151d-49e2-8c58-82bad51b2ad7', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2026-02-13T00:00:00.000Z', '2026-02-16T00:00:00.000Z', '2026-02-18T00:00:00.000Z', '2026-07-14T10:27:42.762Z', '2026-07-14T10:27:42.762Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('e8aa18af-d630-454a-8e5f-038be499e20c', '2026-03-04', 'Bengkel Kerjaya Kejuruteraan Elektrik', 'decce39b-0b59-4cf6-8b03-1a22caebbf46', '2d4caf94-7825-47be-898e-a69c2167ae3a', 'd36b1539-8bfe-4f45-85eb-dd6472914d17', 'Ahmad Fauzi', 'disahkan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2026-02-27T00:00:00.000Z', '2026-03-02T00:00:00.000Z', '2026-03-04T00:00:00.000Z', '2026-07-14T10:27:42.765Z', '2026-07-14T10:27:42.765Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('82ee1ede-df42-423b-83fd-6ab7caddb522', '2026-03-17', 'Lawatan ke Loji Penjana Elektrik Sultan Iskandar', 'decce39b-0b59-4cf6-8b03-1a22caebbf46', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '4c62458a-d701-4b52-8433-369b2d711227', 'Ahmad Fauzi', 'disahkan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', '5041226e-151d-49e2-8c58-82bad51b2ad7', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2026-03-12T00:00:00.000Z', '2026-03-15T00:00:00.000Z', '2026-03-17T00:00:00.000Z', '2026-07-14T10:27:42.767Z', '2026-07-14T10:27:42.767Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('5b37ec7f-59eb-48f1-8d33-f94bc45b2b34', '2026-04-09', 'Program Pembangunan Sahsiah Pelajar', '5e55a3e1-d1b9-404f-88a7-439c38504226', '677425ff-abd3-48e5-80d5-78a09d98ba5f', '89ac7d51-78e5-4beb-86a6-26c79a42cf1e', 'Siti Nur Aisyah', 'disahkan', NULL, 'f66e97cc-3937-42d8-85c3-300f04181824', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2026-04-04T00:00:00.000Z', '2026-04-07T00:00:00.000Z', '2026-04-09T00:00:00.000Z', '2026-07-14T10:27:42.769Z', '2026-07-14T10:27:42.769Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('ca85ddd3-7d8c-4a47-8198-725882ed6f70', '2026-04-22', 'Pertandingan Inovasi Pelajar ADTEC KT', 'f10e05bc-4ddd-4067-8cfc-dd3b6bed47ba', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '4c62458a-d701-4b52-8433-369b2d711227', 'Rizal Hakim', 'disahkan', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', '5041226e-151d-49e2-8c58-82bad51b2ad7', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2026-04-17T00:00:00.000Z', '2026-04-20T00:00:00.000Z', '2026-04-22T00:00:00.000Z', '2026-07-14T10:27:42.772Z', '2026-07-14T10:27:42.772Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('15771b2c-990f-419c-8002-5be4a3100d54', '2026-05-05', 'Seminar Kerjaya & Kebolehpasaran Graduan', 'ebed6a42-0b8c-4adc-847b-e33eada7c334', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '4c62458a-d701-4b52-8433-369b2d711227', 'Ahmad Fauzi', 'menunggu_pengesahan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', NULL, '2026-04-30T00:00:00.000Z', '2026-05-03T00:00:00.000Z', NULL, '2026-07-14T10:27:42.775Z', '2026-07-14T10:27:42.775Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('7170d057-3180-40a1-8f5e-dde3a2c2daa1', '2026-05-12', 'Bengkel Kemahiran Insaniah Pelajar', '5e55a3e1-d1b9-404f-88a7-439c38504226', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', '1267e860-4f41-4059-8ff6-e84ed7be48b4', 'Siti Nur Aisyah', 'menunggu_pengesahan', NULL, 'f66e97cc-3937-42d8-85c3-300f04181824', '5041226e-151d-49e2-8c58-82bad51b2ad7', NULL, '2026-05-07T00:00:00.000Z', '2026-05-10T00:00:00.000Z', NULL, '2026-07-14T10:27:42.780Z', '2026-07-14T10:27:42.780Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('b5c1b6f8-4e9f-46d2-8663-051e76275e88', '2026-05-20', 'Program Khidmat Masyarakat Kg. Felda Tenggaroh', '1255b17d-a256-4e00-8d7e-8e1408f1298f', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '4c62458a-d701-4b52-8433-369b2d711227', 'Ahmad Fauzi', 'draf', 'Catatan ujian: Dokumen sokongan tidak lengkap. Sila lampirkan surat kebenaran industri.', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2026-05-15T00:00:00.000Z', '2026-05-18T00:00:00.000Z', NULL, '2026-07-14T10:27:42.783Z', '2026-07-14T12:18:29.774Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('2f8c5fd3-8003-4006-8b5a-a6d3410efd42', '2026-05-28', 'Lawatan Industri ke Kilang Pemesinan Precision', 'f10e05bc-4ddd-4067-8cfc-dd3b6bed47ba', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', '4ce4dc66-bd42-43ca-8efa-5ca20e482097', 'Rizal Hakim', 'disahkan', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', '5041226e-151d-49e2-8c58-82bad51b2ad7', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2026-05-23T00:00:00.000Z', '2026-05-26T00:00:00.000Z', '2026-07-14T12:18:06.400Z', '2026-07-14T10:27:42.786Z', '2026-07-14T12:18:06.402Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('82225c53-bd0f-45b3-895b-62f196aeb567', '2026-06-03', 'Pertandingan Robotic & Automation Peringkat Kebangsaan', '5e55a3e1-d1b9-404f-88a7-439c38504226', '82365d30-e5f7-4a03-8430-d81dd482d1dc', '795d2ff2-83fa-4207-8026-8c1ee80bc974', 'Siti Nur Aisyah', 'disahkan', NULL, 'f66e97cc-3937-42d8-85c3-300f04181824', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', '64b782ff-4756-4de5-891d-2bd174a6c6b5', '2026-05-29T00:00:00.000Z', '2026-06-01T00:00:00.000Z', '2026-07-14T10:47:27.537Z', '2026-07-14T10:27:42.789Z', '2026-07-14T10:47:27.539Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('9f5292a8-a85c-4663-8e09-2d5dee64da1c', '2026-06-09', 'Gotong-Royong Perdana Kampus', '2269abe7-fda0-40e2-8265-91c114888ae0', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '4c62458a-d701-4b52-8433-369b2d711227', 'Rizal Hakim', 'menunggu_semakan', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', '5041226e-151d-49e2-8c58-82bad51b2ad7', NULL, '2026-06-04T00:00:00.000Z', NULL, NULL, '2026-07-14T10:27:42.795Z', '2026-07-14T10:27:42.795Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('0a8d78d6-4be6-4018-8d85-60cdeb5b1e18', '2026-06-16', 'Lawatan Penanda Aras ke ADTEC Melaka', 'ebed6a42-0b8c-4adc-847b-e33eada7c334', '677425ff-abd3-48e5-80d5-78a09d98ba5f', '991dfcf4-cdc6-408a-8dc3-7718d2dee641', 'Rizal Hakim', 'menunggu_semakan', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', NULL, '2026-06-11T00:00:00.000Z', NULL, NULL, '2026-07-14T10:27:42.799Z', '2026-07-14T10:27:42.799Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('0311c4dd-62cf-47b4-855a-c07b40042baa', '2026-06-22', 'Program Jejak Kasih Anak Yatim', '1255b17d-a256-4e00-8d7e-8e1408f1298f', '3dd8a39e-bf52-45ab-800a-efb29c2de3fc', 'ba9aceff-3d4e-4615-89ce-5a8ac9a073c8', 'Ahmad Fauzi', 'menunggu_semakan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', '5041226e-151d-49e2-8c58-82bad51b2ad7', NULL, '2026-06-17T00:00:00.000Z', NULL, NULL, '2026-07-14T10:27:42.802Z', '2026-07-14T10:27:42.802Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('2dedc368-a37e-4690-8037-d2208b2f339b', '2026-06-28', 'Kem Motivasi Pelajar Tahun Akhir', '5e55a3e1-d1b9-404f-88a7-439c38504226', '2d4caf94-7825-47be-898e-a69c2167ae3a', 'd36b1539-8bfe-4f45-85eb-dd6472914d17', 'Siti Nur Aisyah', 'menunggu_semakan', NULL, 'f66e97cc-3937-42d8-85c3-300f04181824', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', NULL, '2026-06-23T00:00:00.000Z', NULL, NULL, '2026-07-14T10:27:42.805Z', '2026-07-14T10:27:42.805Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('7c764618-98df-4dd7-89e1-628254176e04', '2026-07-02', 'Bengkel Automotif: Servis Enjin Moden', 'ebed6a42-0b8c-4adc-847b-e33eada7c334', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '9b40daec-f16d-4c33-84b5-c103c3cbc59f', 'Rizal Hakim', 'menunggu_semakan', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', '5041226e-151d-49e2-8c58-82bad51b2ad7', NULL, '2026-06-27T00:00:00.000Z', NULL, NULL, '2026-07-14T10:27:42.808Z', '2026-07-14T10:27:42.808Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('fcbc3175-4878-4e2c-8a97-dc339ed742ee', '2026-07-04', 'Program Kesedaran Penyelenggaraan Penyaman Udara', '0b6af898-6371-401e-8541-128e8eca2a26', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '6d272e2c-4a7c-43ea-80a9-ae86b5bbfd61', 'Ahmad Fauzi', 'menunggu_semakan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', NULL, '2026-06-29T00:00:00.000Z', NULL, NULL, '2026-07-14T10:27:42.812Z', '2026-07-14T10:27:42.812Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('f65a358d-c941-4e57-8b41-1730b0b0feaf', '2026-07-06', 'Pertandingan Pemasangan Paip Berkualiti', '2269abe7-fda0-40e2-8265-91c114888ae0', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', 'e0ff2f51-8369-4454-81a8-588458699752', 'Rizal Hakim', 'menunggu_semakan', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', '5041226e-151d-49e2-8c58-82bad51b2ad7', NULL, '2026-07-01T00:00:00.000Z', NULL, NULL, '2026-07-14T10:27:42.815Z', '2026-07-14T10:27:42.815Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('99d3ad60-21a1-4c37-8aa9-777b87019791', '2026-07-08', 'Sesi Latihan Industri Bersama MIDA', 'decce39b-0b59-4cf6-8b03-1a22caebbf46', 'ef84f26e-9f69-4bcf-8450-600da7c6712d', 'aaa96a67-f538-46f5-8bbf-0a917a6c612d', 'Ahmad Fauzi', 'menunggu_semakan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', NULL, '2026-07-03T00:00:00.000Z', NULL, NULL, '2026-07-14T10:27:42.819Z', '2026-07-14T10:27:42.819Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('9d67bf92-aab3-4cd6-85b3-c6d3c26f3149', '2026-04-30', 'Karnival Kerjaya & Pameran Industri', 'ebed6a42-0b8c-4adc-847b-e33eada7c334', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '4c62458a-d701-4b52-8433-369b2d711227', 'Rizal Hakim', 'ditolak', 'Maklumat pengurus aktiviti tidak lengkap. Sila kemaskini nama penuh & no. telefon sebelum dihantar semula.', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', '5041226e-151d-49e2-8c58-82bad51b2ad7', NULL, '2026-04-25T00:00:00.000Z', '2026-04-28T00:00:00.000Z', NULL, '2026-07-14T10:27:42.823Z', '2026-07-14T10:27:42.823Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('1d637380-553e-4e07-8e2b-ecfd41a3f0c2', '2026-05-15', 'Program Khidmat Masyarakat Kg. Sri Lalang', '1255b17d-a256-4e00-8d7e-8e1408f1298f', '9342e1d6-58aa-403f-8f0d-f95332e505d8', 'f8b5ca54-4b45-4103-8d60-48ab4151da50', 'Ahmad Fauzi', 'ditolak', 'Tarikh pelaksanaan bertindih dengan program lain. Sila pilih tarikh alternatif.', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', NULL, '2026-05-10T00:00:00.000Z', '2026-05-13T00:00:00.000Z', NULL, '2026-07-14T10:27:42.829Z', '2026-07-14T10:27:42.829Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('f8bb71e4-cf74-4b93-871a-5f844a5501cf', '2026-06-12', 'Bengkel Motivasi Pelajar Tingkatan 5', '5e55a3e1-d1b9-404f-88a7-439c38504226', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', '1267e860-4f41-4059-8ff6-e84ed7be48b4', 'Siti Nur Aisyah', 'ditolak', 'Lokasi daerah tidak sepadan dengan negeri yang dipilih. Sila semak semula.', 'f66e97cc-3937-42d8-85c3-300f04181824', '5041226e-151d-49e2-8c58-82bad51b2ad7', NULL, '2026-06-07T00:00:00.000Z', '2026-06-10T00:00:00.000Z', NULL, '2026-07-14T10:27:42.833Z', '2026-07-14T10:27:42.833Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('546f8e3c-4dc1-4497-82d3-0ec2b1077cf7', '2026-06-25', 'Lawatan ke Kompleks Kimpalan Baja', 'e64c61fd-878f-4045-8876-af788e4a80ef', '4996ef8a-f528-491a-87ed-6e007607839f', '088b0479-5c54-4feb-84ca-9472889b98a2', 'Rizal Hakim', 'ditolak', 'Dokumen sokongan aktiviti tidak diupload. Sila lampirkan surat kebenaran industri.', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', NULL, '2026-06-20T00:00:00.000Z', '2026-06-23T00:00:00.000Z', NULL, '2026-07-14T10:27:42.837Z', '2026-07-14T10:27:42.837Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('08e8f762-77de-44f6-845b-227ea3b5e59e', '2026-07-10', 'Lawatan Industri ke Toyota Malaysia', 'ebed6a42-0b8c-4adc-847b-e33eada7c334', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', '1267e860-4f41-4059-8ff6-e84ed7be48b4', 'Rizal Hakim', 'draf', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', NULL, NULL, NULL, NULL, NULL, '2026-07-14T10:27:42.841Z', '2026-07-14T10:27:42.841Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('8c8c43f6-cee8-431c-8135-e7bb0d022f21', '2026-07-12', 'Bengkel Kerjaya Teknologi Mekanikal', 'ebed6a42-0b8c-4adc-847b-e33eada7c334', '9342e1d6-58aa-403f-8f0d-f95332e505d8', 'a0220ef2-5296-47d0-8abe-1fca1e7ce81e', 'Rizal Hakim', 'draf', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', NULL, NULL, NULL, NULL, NULL, '2026-07-14T10:27:42.845Z', '2026-07-14T10:27:42.845Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('fba513c6-7195-46b6-88b9-f451b1e6f58f', '2026-07-14', 'Program Khidmat Masyarakat Kg. Mawai', '1255b17d-a256-4e00-8d7e-8e1408f1298f', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '4c62458a-d701-4b52-8433-369b2d711227', 'Ahmad Fauzi', 'menunggu_semakan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', NULL, NULL, '2026-07-14T12:17:39.876Z', NULL, NULL, '2026-07-14T10:27:42.848Z', '2026-07-14T12:17:39.876Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('abe2fa5e-036d-479a-8aeb-365ed7bcadb1', '2026-07-15', 'Seminar Inovasi ICT Pelajar', '5e55a3e1-d1b9-404f-88a7-439c38504226', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', '1267e860-4f41-4059-8ff6-e84ed7be48b4', 'Siti Nur Aisyah', 'menunggu_semakan', NULL, 'f66e97cc-3937-42d8-85c3-300f04181824', NULL, NULL, '2026-07-14T10:49:09.866Z', NULL, NULL, '2026-07-14T10:27:42.854Z', '2026-07-14T10:49:09.866Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('c92884c3-e1c7-4e4d-85a1-61e20180f1f2', '2026-07-16', 'Pertandingan Pendawaian Elektrik', '1255b17d-a256-4e00-8d7e-8e1408f1298f', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '9b40daec-f16d-4c33-84b5-c103c3cbc59f', 'Ahmad Fauzi', 'menunggu_semakan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', NULL, NULL, '2026-07-14T12:17:39.876Z', NULL, NULL, '2026-07-14T10:27:42.855Z', '2026-07-14T12:17:39.876Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('b00a5770-a888-44d0-8ff5-6314251b1bf0', '2026-07-17', 'Lawatan ke Stesen Janakuasa Sultan Ismail', 'decce39b-0b59-4cf6-8b03-1a22caebbf46', '2d4caf94-7825-47be-898e-a69c2167ae3a', 'f3562a7b-3458-487f-8c09-824c6ba64635', 'Ahmad Fauzi', 'menunggu_semakan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', NULL, NULL, '2026-07-14T12:17:39.876Z', NULL, NULL, '2026-07-14T10:27:42.856Z', '2026-07-14T12:17:39.876Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('feeaff79-580d-4d6f-8f22-77476e8dbbe7', '2026-07-18', 'Bengkel Kesedaran Keselamatan Siber', '5e55a3e1-d1b9-404f-88a7-439c38504226', '82365d30-e5f7-4a03-8430-d81dd482d1dc', '795d2ff2-83fa-4207-8026-8c1ee80bc974', 'Siti Nur Aisyah', 'menunggu_semakan', NULL, 'f66e97cc-3937-42d8-85c3-300f04181824', NULL, NULL, '2026-07-14T10:49:09.866Z', NULL, NULL, '2026-07-14T10:27:42.857Z', '2026-07-14T10:49:09.866Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('1c62708f-6508-4920-8eb2-ef2dbe26d584', '2026-07-19', 'Program Khidmat Masyarakat Masjid Jamek', '2269abe7-fda0-40e2-8265-91c114888ae0', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '477b40e4-3d1a-4289-84d9-4b7c1df6cc5a', 'Rizal Hakim', 'draf', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', NULL, NULL, NULL, NULL, NULL, '2026-07-14T10:27:42.858Z', '2026-07-14T10:27:42.858Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('228715ae-9b61-4212-8c7f-9934615821a8', '2026-07-20', 'Kem Bina Insan Pelajar Tahun 1', '0b6af898-6371-401e-8541-128e8eca2a26', '677425ff-abd3-48e5-80d5-78a09d98ba5f', 'a9a49fcf-e0d2-4f46-852d-9812a502940b', 'Ahmad Fauzi', 'menunggu_semakan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', NULL, NULL, '2026-07-14T12:17:39.876Z', NULL, NULL, '2026-07-14T10:27:42.880Z', '2026-07-14T12:17:39.876Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('05af133d-fe64-44d8-84b0-ec70ad9d03cd', '2026-07-21', 'Lawatan ke Pabrik Penyejukbekuan', '0b6af898-6371-401e-8541-128e8eca2a26', 'c4d26d6e-64fd-421b-8d00-bd7f61932894', 'e0ff2f51-8369-4454-81a8-588458699752', 'Ahmad Fauzi', 'menunggu_semakan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', NULL, NULL, '2026-07-14T12:17:39.876Z', NULL, NULL, '2026-07-14T10:27:42.882Z', '2026-07-14T12:17:39.876Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('bf219d80-5160-4b9a-8627-3db99ac70e31', '2026-07-22', 'Pertandingan Pemesinan CNC', 'f10e05bc-4ddd-4067-8cfc-dd3b6bed47ba', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '4c62458a-d701-4b52-8433-369b2d711227', 'Rizal Hakim', 'draf', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', NULL, NULL, NULL, NULL, NULL, '2026-07-14T10:27:42.884Z', '2026-07-14T10:27:42.884Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('3bd5037e-8f2b-40b0-8053-ad7ee05b0d86', '2026-07-23', 'Program Pembangunan Sahsiah Pelajar', '03db58e6-4a59-41bb-860b-a206450b5579', '2d4caf94-7825-47be-898e-a69c2167ae3a', 'da451557-3d7a-408f-8984-de725a613cf1', 'Rizal Hakim', 'draf', NULL, '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', NULL, NULL, NULL, NULL, NULL, '2026-07-14T10:27:42.885Z', '2026-07-14T10:27:42.885Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('760e1ba6-4671-4f6a-8340-fe2fc9e6c055', '2026-07-24', 'Bengkel Automotif: Servis Enjin Moden', 'ebed6a42-0b8c-4adc-847b-e33eada7c334', '3dd8a39e-bf52-45ab-800a-efb29c2de3fc', 'ba9aceff-3d4e-4615-89ce-5a8ac9a073c8', 'Siti Nur Aisyah', 'draf', 'Sila kemaskini tarikh aktiviti - tarikh terlalu dekat dengan tarikh semasa.', 'f66e97cc-3937-42d8-85c3-300f04181824', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', NULL, '2026-07-14T10:49:09.866Z', NULL, NULL, '2026-07-14T10:27:42.887Z', '2026-07-14T10:49:55.546Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('9dd8fda7-7187-44f6-85b0-e4b543e65f74', '2026-07-14', 'Ujian Aktiviti Baharu oleh Siti', '5e55a3e1-d1b9-404f-88a7-439c38504226', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '4c62458a-d701-4b52-8433-369b2d711227', 'Siti Nur Aisyah', 'menunggu_semakan', NULL, 'f66e97cc-3937-42d8-85c3-300f04181824', NULL, NULL, '2026-07-14T10:49:09.866Z', NULL, NULL, '2026-07-14T10:48:45.867Z', '2026-07-14T10:49:09.866Z');
INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES ('7ac40ac8-e998-43d9-876f-65fbbb0f6a0d', '2026-07-14', 'Ujian Browser - Lawatan Industri ke Pabrik Bateri', '1255b17d-a256-4e00-8d7e-8e1408f1298f', '9342e1d6-58aa-403f-8f0d-f95332e505d8', '4c62458a-d701-4b52-8433-369b2d711227', 'Ahmad Fauzi', 'menunggu_semakan', NULL, 'd1596fc8-7523-4706-873f-3ab8d166d75b', NULL, NULL, '2026-07-14T12:17:39.876Z', NULL, NULL, '2026-07-14T12:16:49.233Z', '2026-07-14T12:17:39.876Z');

-- =============================================================
-- 12. SEED — audit_log (164 entries)
-- =============================================================

INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('6d4a9d91-a569-47b0-83bb-a50134408c07', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Lawatan Industri ke Pabrik Automotif Tanjung Pelepas', '2025-08-05T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('6d4a9d91-a569-47b0-83bb-a50134408c07', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2025-08-07T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('6d4a9d91-a569-47b0-83bb-a50134408c07', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2025-08-10T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('6d4a9d91-a569-47b0-83bb-a50134408c07', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2025-08-12T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('cf16db4b-b981-4557-85ba-0c8b75359e7c', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Program Khidmat Masyarakat Kg. Bekok', '2025-08-18T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('cf16db4b-b981-4557-85ba-0c8b75359e7c', 'submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar kepada Penyelaras', '2025-08-20T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('cf16db4b-b981-4557-85ba-0c8b75359e7c', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2025-08-23T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('cf16db4b-b981-4557-85ba-0c8b75359e7c', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2025-08-25T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('8af962b3-2cce-40e8-86b3-323b02abd56c', 'create', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Cipta draf: Pertandingan Kemahiran ICT Peringkat Negeri Johor', '2025-08-29T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('8af962b3-2cce-40e8-86b3-323b02abd56c', 'submit', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Hantar kepada Penyelaras', '2025-08-31T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('8af962b3-2cce-40e8-86b3-323b02abd56c', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2025-09-03T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('8af962b3-2cce-40e8-86b3-323b02abd56c', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2025-09-05T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('bdd6564d-958d-49c4-8dde-b6a47a9c04dc', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Seminar Kerjaya & Kebolehpasaran Graduan', '2025-09-11T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('bdd6564d-958d-49c4-8dde-b6a47a9c04dc', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2025-09-13T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('bdd6564d-958d-49c4-8dde-b6a47a9c04dc', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2025-09-16T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('bdd6564d-958d-49c4-8dde-b6a47a9c04dc', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2025-09-18T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('626ee4db-717c-4a6c-87e2-88ae644c1040', 'create', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Cipta draf: Bengkel Kemahiran Insaniah Pelajar Tahap 2', '2025-09-26T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('626ee4db-717c-4a6c-87e2-88ae644c1040', 'submit', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Hantar kepada Penyelaras', '2025-09-28T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('626ee4db-717c-4a6c-87e2-88ae644c1040', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2025-10-01T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('626ee4db-717c-4a6c-87e2-88ae644c1040', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2025-10-03T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('54c0d244-02b4-4f31-81fc-5e55262a9321', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Gotong-Royong Perdana Kampus ADTEC KT', '2025-10-08T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('54c0d244-02b4-4f31-81fc-5e55262a9321', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2025-10-10T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('54c0d244-02b4-4f31-81fc-5e55262a9321', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2025-10-13T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('54c0d244-02b4-4f31-81fc-5e55262a9321', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2025-10-15T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('a768d1e8-341a-4f53-8f22-76d58e1a5ba0', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Lawatan Penanda Aras ke ADTEC Melaka', '2025-10-21T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('a768d1e8-341a-4f53-8f22-76d58e1a5ba0', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2025-10-23T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('a768d1e8-341a-4f53-8f22-76d58e1a5ba0', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2025-10-26T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('a768d1e8-341a-4f53-8f22-76d58e1a5ba0', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2025-10-28T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('623d027e-427b-45cd-8480-0d36bc52d337', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Program Jejak Kasih Anak Yatim', '2025-11-03T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('623d027e-427b-45cd-8480-0d36bc52d337', 'submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar kepada Penyelaras', '2025-11-05T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('623d027e-427b-45cd-8480-0d36bc52d337', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2025-11-08T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('623d027e-427b-45cd-8480-0d36bc52d337', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2025-11-10T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('72241517-ebdb-4ac0-80f5-1e99ab0c648f', 'create', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Cipta draf: Kem Motivasi Pelajar Tahun Akhir', '2025-11-15T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('72241517-ebdb-4ac0-80f5-1e99ab0c648f', 'submit', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Hantar kepada Penyelaras', '2025-11-17T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('72241517-ebdb-4ac0-80f5-1e99ab0c648f', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2025-11-20T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('72241517-ebdb-4ac0-80f5-1e99ab0c648f', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2025-11-22T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('689384b1-728f-4b49-8922-f5ec9bbadd93', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Karnival Kerjaya & Pameran Industri 2025', '2025-11-28T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('689384b1-728f-4b49-8922-f5ec9bbadd93', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2025-11-30T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('689384b1-728f-4b49-8922-f5ec9bbadd93', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2025-12-03T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('689384b1-728f-4b49-8922-f5ec9bbadd93', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2025-12-05T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('d1b0d34b-05ef-44df-8e03-c5d656c941dc', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Latihan Industri Bersama Sime Darby', '2025-12-11T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('d1b0d34b-05ef-44df-8e03-c5d656c941dc', 'submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar kepada Penyelaras', '2025-12-13T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('d1b0d34b-05ef-44df-8e03-c5d656c941dc', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2025-12-16T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('d1b0d34b-05ef-44df-8e03-c5d656c941dc', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2025-12-18T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('011c7097-5bb3-40e9-8cd5-36acbe306ab3', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Program Kebajikan Bulan Madani', '2026-01-01T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('011c7097-5bb3-40e9-8cd5-36acbe306ab3', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2026-01-03T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('011c7097-5bb3-40e9-8cd5-36acbe306ab3', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2026-01-06T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('011c7097-5bb3-40e9-8cd5-36acbe306ab3', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2026-01-08T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('fa6cb26e-1c34-4f3b-864f-d5534e298acf', 'create', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Cipta draf: Seminar Kesedaran Keselamatan Siber', '2026-01-13T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('fa6cb26e-1c34-4f3b-864f-d5534e298acf', 'submit', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Hantar kepada Penyelaras', '2026-01-15T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('fa6cb26e-1c34-4f3b-864f-d5534e298acf', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2026-01-18T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('fa6cb26e-1c34-4f3b-864f-d5534e298acf', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2026-01-20T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('ffbbab3b-f812-4ac6-8279-dc99ea7b38db', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Lawatan Industri ke Pabrik Automotif', '2026-01-27T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('ffbbab3b-f812-4ac6-8279-dc99ea7b38db', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2026-01-29T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('ffbbab3b-f812-4ac6-8279-dc99ea7b38db', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2026-02-01T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('ffbbab3b-f812-4ac6-8279-dc99ea7b38db', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2026-02-03T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('68f049e1-7dcc-48a4-856b-5d21d5b84ea8', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Program Khidmat Masyarakat Kg. Bekok', '2026-02-03T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('68f049e1-7dcc-48a4-856b-5d21d5b84ea8', 'submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar kepada Penyelaras', '2026-02-05T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('68f049e1-7dcc-48a4-856b-5d21d5b84ea8', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2026-02-08T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('68f049e1-7dcc-48a4-856b-5d21d5b84ea8', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2026-02-10T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('18d88a78-fe75-4522-89c7-f0ef5ee5c9b3', 'create', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Cipta draf: Pertandingan Kemahiran ICT Peringkat Negeri', '2026-02-11T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('18d88a78-fe75-4522-89c7-f0ef5ee5c9b3', 'submit', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Hantar kepada Penyelaras', '2026-02-13T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('18d88a78-fe75-4522-89c7-f0ef5ee5c9b3', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2026-02-16T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('18d88a78-fe75-4522-89c7-f0ef5ee5c9b3', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2026-02-18T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('e8aa18af-d630-454a-8e5f-038be499e20c', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Bengkel Kerjaya Kejuruteraan Elektrik', '2026-02-25T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('e8aa18af-d630-454a-8e5f-038be499e20c', 'submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar kepada Penyelaras', '2026-02-27T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('e8aa18af-d630-454a-8e5f-038be499e20c', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2026-03-02T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('e8aa18af-d630-454a-8e5f-038be499e20c', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2026-03-04T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('82ee1ede-df42-423b-83fd-6ab7caddb522', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Lawatan ke Loji Penjana Elektrik Sultan Iskandar', '2026-03-10T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('82ee1ede-df42-423b-83fd-6ab7caddb522', 'submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar kepada Penyelaras', '2026-03-12T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('82ee1ede-df42-423b-83fd-6ab7caddb522', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2026-03-15T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('82ee1ede-df42-423b-83fd-6ab7caddb522', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2026-03-17T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('5b37ec7f-59eb-48f1-8d33-f94bc45b2b34', 'create', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Cipta draf: Program Pembangunan Sahsiah Pelajar', '2026-04-02T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('5b37ec7f-59eb-48f1-8d33-f94bc45b2b34', 'submit', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Hantar kepada Penyelaras', '2026-04-04T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('5b37ec7f-59eb-48f1-8d33-f94bc45b2b34', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2026-04-07T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('5b37ec7f-59eb-48f1-8d33-f94bc45b2b34', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2026-04-09T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('ca85ddd3-7d8c-4a47-8198-725882ed6f70', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Pertandingan Inovasi Pelajar ADTEC KT', '2026-04-15T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('ca85ddd3-7d8c-4a47-8198-725882ed6f70', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2026-04-17T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('ca85ddd3-7d8c-4a47-8198-725882ed6f70', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2026-04-20T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('ca85ddd3-7d8c-4a47-8198-725882ed6f70', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan oleh Penolong Pengarah', '2026-04-22T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('9d67bf92-aab3-4cd6-85b3-c6d3c26f3149', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Karnival Kerjaya & Pameran Industri', '2026-04-23T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('9d67bf92-aab3-4cd6-85b3-c6d3c26f3149', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2026-04-25T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('15771b2c-990f-419c-8002-5be4a3100d54', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Seminar Kerjaya & Kebolehpasaran Graduan', '2026-04-28T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('9d67bf92-aab3-4cd6-85b3-c6d3c26f3149', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2026-04-28T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('15771b2c-990f-419c-8002-5be4a3100d54', 'submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar kepada Penyelaras', '2026-04-30T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('9d67bf92-aab3-4cd6-85b3-c6d3c26f3149', 'reject', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Maklumat pengurus aktiviti tidak lengkap. Sila kemaskini nama penuh & no. telefon sebelum dihantar semula.', '2026-04-30T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('15771b2c-990f-419c-8002-5be4a3100d54', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2026-05-03T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('7170d057-3180-40a1-8f5e-dde3a2c2daa1', 'create', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Cipta draf: Bengkel Kemahiran Insaniah Pelajar', '2026-05-05T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('7170d057-3180-40a1-8f5e-dde3a2c2daa1', 'submit', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Hantar kepada Penyelaras', '2026-05-07T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('1d637380-553e-4e07-8e2b-ecfd41a3f0c2', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Program Khidmat Masyarakat Kg. Sri Lalang', '2026-05-08T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('7170d057-3180-40a1-8f5e-dde3a2c2daa1', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2026-05-10T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('1d637380-553e-4e07-8e2b-ecfd41a3f0c2', 'submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar kepada Penyelaras', '2026-05-10T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('b5c1b6f8-4e9f-46d2-8663-051e76275e88', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Program Khidmat Masyarakat Kg. Felda Tenggaroh', '2026-05-13T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('1d637380-553e-4e07-8e2b-ecfd41a3f0c2', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2026-05-13T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('b5c1b6f8-4e9f-46d2-8663-051e76275e88', 'submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar kepada Penyelaras', '2026-05-15T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('1d637380-553e-4e07-8e2b-ecfd41a3f0c2', 'return', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Tarikh pelaksanaan bertindih dengan program lain. Sila pilih tarikh alternatif.', '2026-05-15T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('b5c1b6f8-4e9f-46d2-8663-051e76275e88', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2026-05-18T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('2f8c5fd3-8003-4006-8b5a-a6d3410efd42', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Lawatan Industri ke Kilang Pemesinan Precision', '2026-05-21T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('2f8c5fd3-8003-4006-8b5a-a6d3410efd42', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2026-05-23T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('2f8c5fd3-8003-4006-8b5a-a6d3410efd42', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2026-05-26T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('82225c53-bd0f-45b3-895b-62f196aeb567', 'create', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Cipta draf: Pertandingan Robotic & Automation Peringkat Kebangsaan', '2026-05-27T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('82225c53-bd0f-45b3-895b-62f196aeb567', 'submit', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Hantar kepada Penyelaras', '2026-05-29T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('82225c53-bd0f-45b3-895b-62f196aeb567', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2026-06-01T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('9f5292a8-a85c-4663-8e09-2d5dee64da1c', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Gotong-Royong Perdana Kampus', '2026-06-02T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('9f5292a8-a85c-4663-8e09-2d5dee64da1c', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2026-06-04T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('f8bb71e4-cf74-4b93-871a-5f844a5501cf', 'create', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Cipta draf: Bengkel Motivasi Pelajar Tingkatan 5', '2026-06-05T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('9f5292a8-a85c-4663-8e09-2d5dee64da1c', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2026-06-07T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('f8bb71e4-cf74-4b93-871a-5f844a5501cf', 'submit', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Hantar kepada Penyelaras', '2026-06-07T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('0a8d78d6-4be6-4018-8d85-60cdeb5b1e18', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Lawatan Penanda Aras ke ADTEC Melaka', '2026-06-09T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('f8bb71e4-cf74-4b93-871a-5f844a5501cf', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2026-06-10T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('0a8d78d6-4be6-4018-8d85-60cdeb5b1e18', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2026-06-11T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('f8bb71e4-cf74-4b93-871a-5f844a5501cf', 'return', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Lokasi daerah tidak sepadan dengan negeri yang dipilih. Sila semak semula.', '2026-06-12T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('0a8d78d6-4be6-4018-8d85-60cdeb5b1e18', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2026-06-14T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('0311c4dd-62cf-47b4-855a-c07b40042baa', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Program Jejak Kasih Anak Yatim', '2026-06-15T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('0311c4dd-62cf-47b4-855a-c07b40042baa', 'submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar kepada Penyelaras', '2026-06-17T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('546f8e3c-4dc1-4497-82d3-0ec2b1077cf7', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Lawatan ke Kompleks Kimpalan Baja', '2026-06-18T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('0311c4dd-62cf-47b4-855a-c07b40042baa', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2026-06-20T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('546f8e3c-4dc1-4497-82d3-0ec2b1077cf7', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2026-06-20T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('2dedc368-a37e-4690-8037-d2208b2f339b', 'create', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Cipta draf: Kem Motivasi Pelajar Tahun Akhir', '2026-06-21T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('2dedc368-a37e-4690-8037-d2208b2f339b', 'submit', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Hantar kepada Penyelaras', '2026-06-23T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('546f8e3c-4dc1-4497-82d3-0ec2b1077cf7', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2026-06-23T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('7c764618-98df-4dd7-89e1-628254176e04', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Bengkel Automotif: Servis Enjin Moden', '2026-06-25T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('546f8e3c-4dc1-4497-82d3-0ec2b1077cf7', 'return', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Dokumen sokongan aktiviti tidak diupload. Sila lampirkan surat kebenaran industri.', '2026-06-25T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('2dedc368-a37e-4690-8037-d2208b2f339b', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2026-06-26T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('7c764618-98df-4dd7-89e1-628254176e04', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2026-06-27T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('fcbc3175-4878-4e2c-8a97-dc339ed742ee', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Program Kesedaran Penyelenggaraan Penyaman Udara', '2026-06-27T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('fcbc3175-4878-4e2c-8a97-dc339ed742ee', 'submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar kepada Penyelaras', '2026-06-29T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('f65a358d-c941-4e57-8b41-1730b0b0feaf', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Pertandingan Pemasangan Paip Berkualiti', '2026-06-29T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('7c764618-98df-4dd7-89e1-628254176e04', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2026-06-30T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('f65a358d-c941-4e57-8b41-1730b0b0feaf', 'submit', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Hantar kepada Penyelaras', '2026-07-01T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('99d3ad60-21a1-4c37-8aa9-777b87019791', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Sesi Latihan Industri Bersama MIDA', '2026-07-01T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('fcbc3175-4878-4e2c-8a97-dc339ed742ee', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2026-07-02T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('99d3ad60-21a1-4c37-8aa9-777b87019791', 'submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar kepada Penyelaras', '2026-07-03T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('08e8f762-77de-44f6-845b-227ea3b5e59e', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Lawatan Industri ke Toyota Malaysia', '2026-07-03T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('f65a358d-c941-4e57-8b41-1730b0b0feaf', 'review_forward', '5041226e-151d-49e2-8c58-82bad51b2ad7', 'Disemak & dihantar kepada Penolong Pengarah', '2026-07-04T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('8c8c43f6-cee8-431c-8135-e7bb0d022f21', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Bengkel Kerjaya Teknologi Mekanikal', '2026-07-05T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('99d3ad60-21a1-4c37-8aa9-777b87019791', 'review_forward', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Disemak & dihantar kepada Penolong Pengarah', '2026-07-06T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('fba513c6-7195-46b6-88b9-f451b1e6f58f', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Program Khidmat Masyarakat Kg. Mawai', '2026-07-07T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('abe2fa5e-036d-479a-8aeb-365ed7bcadb1', 'create', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Cipta draf: Seminar Inovasi ICT Pelajar', '2026-07-08T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('c92884c3-e1c7-4e4d-85a1-61e20180f1f2', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Pertandingan Pendawaian Elektrik', '2026-07-09T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('b00a5770-a888-44d0-8ff5-6314251b1bf0', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Lawatan ke Stesen Janakuasa Sultan Ismail', '2026-07-10T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('feeaff79-580d-4d6f-8f22-77476e8dbbe7', 'create', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Cipta draf: Bengkel Kesedaran Keselamatan Siber', '2026-07-11T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('1c62708f-6508-4920-8eb2-ef2dbe26d584', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Program Khidmat Masyarakat Masjid Jamek', '2026-07-12T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('228715ae-9b61-4212-8c7f-9934615821a8', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Kem Bina Insan Pelajar Tahun 1', '2026-07-13T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('05af133d-fe64-44d8-84b0-ec70ad9d03cd', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Lawatan ke Pabrik Penyejukbekuan', '2026-07-14T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('82225c53-bd0f-45b3-895b-62f196aeb567', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan: Pertandingan Robotic & Automation Peringkat Kebangsaan', '2026-07-14T10:47:27.542Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('9dd8fda7-7187-44f6-85b0-e4b543e65f74', 'create', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Cipta draf: Ujian Aktiviti Baharu oleh Siti', '2026-07-14T10:48:45.869Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('760e1ba6-4671-4f6a-8340-fe2fc9e6c055', 'bulk_submit', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Hantar pukal kepada Penyelaras', '2026-07-14T10:49:09.868Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('feeaff79-580d-4d6f-8f22-77476e8dbbe7', 'bulk_submit', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Hantar pukal kepada Penyelaras', '2026-07-14T10:49:09.868Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('abe2fa5e-036d-479a-8aeb-365ed7bcadb1', 'bulk_submit', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Hantar pukal kepada Penyelaras', '2026-07-14T10:49:09.868Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('9dd8fda7-7187-44f6-85b0-e4b543e65f74', 'bulk_submit', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Hantar pukal kepada Penyelaras', '2026-07-14T10:49:09.868Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('760e1ba6-4671-4f6a-8340-fe2fc9e6c055', 'return', 'a6b56cbc-df60-4760-80dc-eeb09eae2956', 'Dipulangkan kepada Pengajar: Sila kemaskini tarikh aktiviti - tarikh terlalu dekat dengan tarikh semasa.', '2026-07-14T10:49:55.549Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('7ac40ac8-e998-43d9-876f-65fbbb0f6a0d', 'create', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Cipta draf: Ujian Browser - Lawatan Industri ke Pabrik Bateri', '2026-07-14T12:16:49.236Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('05af133d-fe64-44d8-84b0-ec70ad9d03cd', 'bulk_submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar pukal kepada Penyelaras', '2026-07-14T12:17:39.879Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('228715ae-9b61-4212-8c7f-9934615821a8', 'bulk_submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar pukal kepada Penyelaras', '2026-07-14T12:17:39.879Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('b00a5770-a888-44d0-8ff5-6314251b1bf0', 'bulk_submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar pukal kepada Penyelaras', '2026-07-14T12:17:39.879Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('c92884c3-e1c7-4e4d-85a1-61e20180f1f2', 'bulk_submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar pukal kepada Penyelaras', '2026-07-14T12:17:39.879Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('fba513c6-7195-46b6-88b9-f451b1e6f58f', 'bulk_submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar pukal kepada Penyelaras', '2026-07-14T12:17:39.879Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('7ac40ac8-e998-43d9-876f-65fbbb0f6a0d', 'bulk_submit', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Hantar pukal kepada Penyelaras', '2026-07-14T12:17:39.879Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('2f8c5fd3-8003-4006-8b5a-a6d3410efd42', 'approve', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Disahkan: Lawatan Industri ke Kilang Pemesinan Precision', '2026-07-14T12:18:06.405Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('b5c1b6f8-4e9f-46d2-8663-051e76275e88', 'reject', '64b782ff-4756-4de5-891d-2bd174a6c6b5', 'Ditolak: Catatan ujian: Dokumen sokongan tidak lengkap. Sila lampirkan surat kebenaran industri.', '2026-07-14T12:18:29.777Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('bf219d80-5160-4b9a-8627-3db99ac70e31', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Pertandingan Pemesinan CNC', '2026-07-15T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('3bd5037e-8f2b-40b0-8053-ad7ee05b0d86', 'create', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Cipta draf: Program Pembangunan Sahsiah Pelajar', '2026-07-16T00:00:00.000Z');
INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES ('760e1ba6-4671-4f6a-8340-fe2fc9e6c055', 'create', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Cipta draf: Bengkel Automotif: Servis Enjin Moden', '2026-07-17T00:00:00.000Z');

-- =============================================================
-- 13. SEED — notifications
-- =============================================================

INSERT INTO notifications (id, profile_id, title, message, type, read, aktiviti_id, created_at) VALUES ('cb6b9088-ca6a-4489-834f-3bb319ef0166', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Aktiviti Ditolak/Dipulangkan', 'Aktiviti "Karnival Kerjaya & Pameran Industri" telah dikembalikan. Sila semak catatan & kemaskini.', 'reject', false, NULL, '2026-07-14T10:27:42.894Z');
INSERT INTO notifications (id, profile_id, title, message, type, read, aktiviti_id, created_at) VALUES ('529d0b5b-28e9-4eb2-84ff-239cddae2fe8', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Aktiviti Ditolak/Dipulangkan', 'Aktiviti "Program Khidmat Masyarakat Kg. Sri Lalang" telah dikembalikan. Sila semak catatan & kemaskini.', 'reject', false, NULL, '2026-07-14T10:27:42.895Z');
INSERT INTO notifications (id, profile_id, title, message, type, read, aktiviti_id, created_at) VALUES ('8423991d-e1f3-418d-812b-0cc3e74019b4', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Aktiviti Ditolak/Dipulangkan', 'Aktiviti "Bengkel Motivasi Pelajar Tingkatan 5" telah dikembalikan. Sila semak catatan & kemaskini.', 'reject', true, NULL, '2026-07-14T10:27:42.896Z');
INSERT INTO notifications (id, profile_id, title, message, type, read, aktiviti_id, created_at) VALUES ('d4a0271e-4f78-4307-8f03-ac90574ec75c', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Aktiviti Ditolak/Dipulangkan', 'Aktiviti "Lawatan ke Kompleks Kimpalan Baja" telah dikembalikan. Sila semak catatan & kemaskini.', 'reject', false, NULL, '2026-07-14T10:27:42.897Z');
INSERT INTO notifications (id, profile_id, title, message, type, read, aktiviti_id, created_at) VALUES ('53451dd6-e3c2-446f-8dc6-280b9db94a5c', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Aktiviti Disahkan', '"Pertandingan Robotic & Automation Peringkat Kebangsaan" telah disahkan oleh Penolong Pengarah.', 'approve', true, NULL, '2026-07-14T10:47:27.546Z');
INSERT INTO notifications (id, profile_id, title, message, type, read, aktiviti_id, created_at) VALUES ('5bba8f8f-2433-4887-8551-fbc37f302f44', 'f66e97cc-3937-42d8-85c3-300f04181824', 'Aktiviti Dipulangkan oleh Penyelaras', '"Bengkel Automotif: Servis Enjin Moden" telah dipulangkan untuk pembetulan. Sebab: Sila kemaskini tarikh aktiviti - tarikh terlalu dekat dengan tarikh semasa.', 'return', true, NULL, '2026-07-14T10:49:55.551Z');
INSERT INTO notifications (id, profile_id, title, message, type, read, aktiviti_id, created_at) VALUES ('616489de-ab4b-45a2-8369-15e0bcf6c437', '524d7ca6-0c4b-496f-8f63-8d83b5dbec4c', 'Aktiviti Disahkan', '"Lawatan Industri ke Kilang Pemesinan Precision" telah disahkan oleh Penolong Pengarah.', 'approve', false, NULL, '2026-07-14T12:18:06.411Z');
INSERT INTO notifications (id, profile_id, title, message, type, read, aktiviti_id, created_at) VALUES ('53292d72-a97a-4da1-8f88-cb2bded07bbc', 'd1596fc8-7523-4706-873f-3ab8d166d75b', 'Aktiviti Ditolak oleh Penolong Pengarah', '"Program Khidmat Masyarakat Kg. Felda Tenggaroh" telah ditolak. Sebab: Catatan ujian: Dokumen sokongan tidak lengkap. Sila lampirkan surat kebenaran industri.', 'reject', false, NULL, '2026-07-14T12:18:29.787Z');

-- =============================================================
-- 14. ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================================


ALTER TABLE bengkel ENABLE ROW LEVEL SECURITY;
ALTER TABLE negeri ENABLE ROW LEVEL SECURITY;
ALTER TABLE daerah ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE aktiviti ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- 15. RLS POLICIES — role-based access control
-- =============================================================


-- Helper function: get current user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ========== BENGKEL (reference, readable by all authenticated) ==========
CREATE POLICY "bengkel_select_authenticated"
  ON bengkel FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "bengkel_modify_admin"
  ON bengkel FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ========== NEGERI (reference, readable by all authenticated) ==========
CREATE POLICY "negeri_select_authenticated"
  ON negeri FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "negeri_modify_admin"
  ON negeri FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ========== DAERAH (reference, readable by all authenticated) ==========
CREATE POLICY "daerah_select_authenticated"
  ON daerah FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "daerah_modify_admin"
  ON daerah FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ========== PROFILES ==========
-- Each user can see their own profile
-- Penyelaras/PP/Admin can see all profiles (for assignments)
CREATE POLICY "profiles_select_self_or_staff"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.current_user_role() IN ('penyelaras','penolong_pengarah','admin')
  );

-- Users can update their own profile (limited fields — handled by app)
CREATE POLICY "profiles_update_self"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Only admin can insert/delete profiles
CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- ========== AKTIVITI ==========
-- SELECT: Pengajar sees own; Penyelaras sees menunggu_semakan + disahkan;
--         PP sees menunggu_pengesahan + disahkan; Admin sees all
CREATE POLICY "aktiviti_select_role_based"
  ON aktiviti FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR dicipta_oleh = auth.uid()
    OR (
      public.current_user_role() = 'penyelaras'
      AND status IN ('menunggu_semakan','menunggu_pengesahan','disahkan','ditolak')
    )
    OR (
      public.current_user_role() = 'penolong_pengarah'
      AND status IN ('menunggu_pengesahan','disahkan')
    )
  );

-- INSERT: Pengajar creates own drafts; Admin can create any
CREATE POLICY "aktiviti_insert_pengajar_or_admin"
  ON aktiviti FOR INSERT
  TO authenticated
  WITH CHECK (
    dicipta_oleh = auth.uid()
    AND status = 'draf'
    AND public.current_user_role() IN ('pengajar','admin')
  );

-- UPDATE: depends on role + status
-- Pengajar: only own drafts
-- Penyelaras: only menunggu_semakan
-- PP: only menunggu_pengesahan
-- Admin: all
CREATE POLICY "aktiviti_update_role_based"
  ON aktiviti FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR (dicipta_oleh = auth.uid() AND status = 'draf')
    OR (public.current_user_role() = 'penyelaras' AND status = 'menunggu_semakan')
    OR (public.current_user_role() = 'penolong_pengarah' AND status = 'menunggu_pengesahan')
  )
  WITH CHECK (
    public.current_user_role() = 'admin'
    OR (dicipta_oleh = auth.uid() AND status IN ('draf','menunggu_semakan'))
    OR (public.current_user_role() = 'penyelaras' AND status IN ('menunggu_semakan','menunggu_pengesahan','draf'))
    OR (public.current_user_role() = 'penolong_pengarah' AND status IN ('menunggu_pengesahan','disahkan','draf'))
  );

-- DELETE: only own drafts (Pengajar) or admin
CREATE POLICY "aktiviti_delete_role_based"
  ON aktiviti FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR (dicipta_oleh = auth.uid() AND status = 'draf')
  );

-- ========== AUDIT LOG ==========
-- All authenticated can read (for transparency); only system/app can insert
CREATE POLICY "auditlog_select_authenticated"
  ON audit_log FOR SELECT
  TO authenticated
  USING (true);

-- INSERT allowed for all authenticated (the app writes audit logs)
CREATE POLICY "auditlog_insert_authenticated"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No UPDATE or DELETE (append-only) — by omitting policies

-- ========== NOTIFICATIONS ==========
-- Users see only their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "notifications_insert_authenticated"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());


-- =============================================================
-- 16. TRIGGERS — auto-update updated_at
-- =============================================================


CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_aktiviti_updated_at
  BEFORE UPDATE ON aktiviti
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- =============================================================
-- 17. VERIFICATION — counts
-- =============================================================


SELECT 'bengkel' AS table_name, count(*) AS count FROM bengkel
UNION ALL SELECT 'negeri', count(*) FROM negeri
UNION ALL SELECT 'daerah', count(*) FROM daerah
UNION ALL SELECT 'profiles', count(*) FROM profiles
UNION ALL SELECT 'aktiviti', count(*) FROM aktiviti
UNION ALL SELECT 'audit_log', count(*) FROM audit_log
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'auth_users', count(*) FROM auth.users;
