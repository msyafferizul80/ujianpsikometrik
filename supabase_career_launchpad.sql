-- Tambah tier 'career_launchpad' dalam fungsi activate_subscription
-- (fungsi sedia ada sudah boleh handle tier baru - tiada perubahan diperlukan)
-- Jalankan ini untuk verify kolum subscription_tier dalam profiles boleh terima nilai baru:

-- Semak nilai semasa
SELECT DISTINCT subscription_tier FROM profiles ORDER BY subscription_tier;

-- Jika ada constraint/enum, tambah nilai baru:
-- (biasanya subscription_tier adalah TEXT column - tidak perlu tambah apa-apa)

-- Test: Pastikan RPC activate_subscription berfungsi untuk tier baru
-- SELECT activate_subscription('test-uuid', 'career_launchpad', NOW() + INTERVAL '30 days', ARRAY['full_bank','analytics_pro','ai_coach'], NULL, 0);
