-- Password hashes (scrypt) for profiles table
-- These match the local SQLite database so the existing
-- login code (which uses verifyPassword + scrypt) works on Supabase too.

-- admin@adtec-kt.edu.my (admin)
UPDATE profiles SET password_hash = 'f009f30eb09dceccd8c91de8ec863753:a58d5cdd820ac0a191875a6e5ee99bcb5a8fbc0e5527b29740b12f16a62d03859300a21316df69cf02fbb3e81cff689d345e9e2bffca47415a996cd568ac6792' WHERE email = 'admin@adtec-kt.edu.my';
-- ahmad.fauzi@adtec-kt.edu.my (pengajar)
UPDATE profiles SET password_hash = '6c9b89df06299d017c4f65dd2ca9aa38:6b20425bf82feb37ce585e97d8289120d434e1b20623d1db1ad9c2940b606035d65aa020eedda947a48264a82aa2d28f8f8a24fa2b3aa136d14f8492287d2159' WHERE email = 'ahmad.fauzi@adtec-kt.edu.my';
-- siti.aisyah@adtec-kt.edu.my (pengajar)
UPDATE profiles SET password_hash = '6a4c61279d6597fed08b490eea77688f:7eaf5f9f2635f396b5a8a6afa20a982d02a3a3c659a221cceebb3faa3c9f5437a7864f83c7e5cf42cc632de2abaf1f79efb0763155f372e3a50e7eb12a3db1d3' WHERE email = 'siti.aisyah@adtec-kt.edu.my';
-- rizal.hakim@adtec-kt.edu.my (pengajar)
UPDATE profiles SET password_hash = '329296115e6d9fa9091f5998b211e2d8:f904efbfb38909aa716025baddacb64b11c4f0b87465b2a9455a9eb76af845b54547c689a06b47df06e52071ea1ebd50f990ff63b9a7c22d840780304dd6bc3e' WHERE email = 'rizal.hakim@adtec-kt.edu.my';
-- noraini.yusof@adtec-kt.edu.my (penyelaras)
UPDATE profiles SET password_hash = '66c9010531f595330859743c81200d11:c833e750b6205e6c1f75a0dbd5323dc2562f9f83b4717bef66d8e8e5e209b0e0d53673a30fa830bc4ccb3eac281cce17128a2d59b8ab4ff6493769bf50171bd1' WHERE email = 'noraini.yusof@adtec-kt.edu.my';
-- zulkifli.omar@adtec-kt.edu.my (penyelaras)
UPDATE profiles SET password_hash = '048e7088e5b2f94f80d1750a904e7e7a:d574ce737805d15233b9f1a0e5976d7dc60babd09c0af5f542cf7c821938f9fcbba5ef832bb9cf5e4cc277602bcbd8f75ada400d4be8267f2d6954bc876f4e4c' WHERE email = 'zulkifli.omar@adtec-kt.edu.my';
-- rosli.ibrahim@adtec-kt.edu.my (penolong_pengarah)
UPDATE profiles SET password_hash = 'c0c94963256bb577dd9d3df534c5e669:582ee75b4fccef3e3c1053eb4a0321c53e666ee0cf12758132d7640e2ff99b70f04aa15e7ac7d3e07bad3e73438588b850c566d9c759d867173b3c3fb9238fad' WHERE email = 'rosli.ibrahim@adtec-kt.edu.my';