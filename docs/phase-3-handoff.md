# KLANG Management — ส่งมอบ Phase 3

รอบนี้ทำเฉพาะ **Phase 3 — Authentication** ต่อจากฐานข้อมูล Phase 1–2 และยังไม่เริ่ม Phase 4

## สิ่งที่ทำ

- สมัครสมาชิกด้วย username, email และ password โดย Supabase Auth เป็นผู้จัดเก็บรหัสผ่าน
- ล็อกอินด้วย username/password ผ่าน Server Action ซึ่ง resolve email ด้วย RPC ที่ให้เฉพาะ `service_role`
- ข้อความล็อกอินผิดเป็นข้อความกลาง ไม่เปิดเผยว่า username มีอยู่หรือไม่
- จำกัดการลองล็อกอินแบบ shared ใน PostgreSQL: 5 ครั้งต่อ 15 นาที และ block 15 นาที โดยใช้ HMAC ของ IP + username เป็น key
- รองรับ logout, forgot password, callback และตั้งรหัสผ่านใหม่
- ใช้ Supabase SSR cookies และ `src/proxy.ts` สำหรับ refresh session และป้องกัน `/profile` กับ `/reset-password`
- หน้า Profile แสดง username/email แก้ display name และอัปโหลดรูปพร้อม preview ผ่าน private Storage ของผู้ใช้เอง
- ตรวจ session ใหม่ในทุก Server Action ที่แก้ข้อมูล และไม่รับ user id จาก browser

## Database schema ที่เพิ่ม

`private.login_rate_limits`

| Column              | Type                   | หน้าที่                                       |
| ------------------- | ---------------------- | --------------------------------------------- |
| `key_hash`          | `text` PK              | HMAC SHA-256 ของ IP + username; ไม่เก็บค่าดิบ |
| `attempt_count`     | `integer`              | จำนวนครั้งใน window ปัจจุบัน                  |
| `window_started_at` | `timestamptz`          | เวลาเริ่ม window                              |
| `blocked_until`     | `timestamptz` nullable | เวลาสิ้นสุดการ block                          |
| `updated_at`        | `timestamptz`          | เวลาแก้ไขล่าสุด                               |

ไม่มีคอลัมน์ password ใน `profiles`; password อยู่ใน Supabase Auth เท่านั้น ตารางธุรกิจและ ERD เดิมอยู่ใน [เอกสาร Phase 1–2](phase-1-2-handoff.md)

## Migration

`20260921000400_authentication.sql` เพิ่ม:

- trigger `on_auth_user_created` และ `private.handle_new_user()` เพื่อสร้าง `profiles` จาก `raw_user_meta_data.username`
- `public.resolve_login_email(text)` สำหรับ server แปลง username เป็น email ของ profile สถานะ ACTIVE
- `public.consume_login_rate_limit(...)` และ `public.reset_login_rate_limit(text)` สำหรับ rate limit แบบ atomic รวมถึงคำขอพร้อมกัน
- policy `profiles_update_self` และ column-level grant เฉพาะ `display_name`, `avatar_url`

`20260921000500_auth_user_cleanup.sql` เปลี่ยน foreign key จาก `profiles.id` ไป `auth.users.id` เป็น `on delete cascade` เพื่อให้ลบบัญชีที่ยังไม่มีประวัติธุรกิจและ profile ที่ trigger สร้างไว้ได้อย่างถูกต้อง

`20260921000600_profile_avatars.sql` เพิ่ม private Storage bucket `avatars` จำกัด JPEG/PNG/WebP/GIF ไม่เกิน 5 MB และ policies ให้ผู้ใช้จัดการได้เฉพาะ path ใต้ user ID ของตนเอง

`20260921000700_audit_actor_retention.sql` เอา foreign key ของ `audit_logs.user_id` ออกเพื่อเก็บ actor UUID แบบ immutable แม้ลบบัญชีภายหลัง โดย foreign keys ของข้อมูลธุรกิจยังคงป้องกันการลบบัญชีที่มีประวัติจริง

ฟังก์ชันช่วย login อยู่ใน `public` เพื่อเรียกผ่าน Supabase RPC แต่ revoke จาก `public`, `anon`, `authenticated` และ grant ให้ `service_role` เท่านั้น

## RLS และขอบเขตสิทธิ์

| การทำงาน                  | สิทธิ์                                               |
| ------------------------- | ---------------------------------------------------- |
| อ่าน profile              | เจ้าของบัญชี ACTIVE เท่านั้น ตาม policy เดิม         |
| แก้ display name/avatar   | เจ้าของบัญชี ACTIVE เท่านั้น                         |
| แก้ username/status/id    | ไม่มี column grant สำหรับ authenticated              |
| resolve username          | `service_role` เท่านั้น                              |
| consume/reset login limit | `service_role` เท่านั้น                              |
| tenant/business writes    | authenticated client ภายใต้ RLS; ไม่ใช้ admin client |

## ปัญหาที่พบและการแก้ไข

1. Next.js 16 ใช้ `proxy.ts` และโปรเจกต์นี้ใช้ `src` directory จึงต้องวางไฟล์ที่ `src/proxy.ts`; E2E ตรวจว่าหน้า profile redirect ได้จริง
2. Server Component เขียน cookie ไม่ได้ทุกบริบท จึงให้ proxy ทำ session refresh และ cookie adapter ฝั่ง server เพิกเฉยเฉพาะข้อจำกัดการเขียนใน Server Component
3. ตัวจำกัด login รุ่นแรกมี race ตอน key ถูกสร้างพร้อมกัน แก้เป็น `insert ... on conflict do nothing` ก่อน lock row และเพิ่ม concurrent regression test
4. Docker บนเครื่องนี้ใช้งานไม่ได้ จึงทดสอบ migration/RLS ด้วย PostgreSQL 17 แบบ embedded และตรวจ integration สำคัญซ้ำกับ Supabase cloud
5. เชื่อม Supabase cloud และยืนยัน signup/login/logout/forgot/recovery/reset กับ Auth service จริงแล้ว; email delivery ผ่าน provider จริงยังต้องตั้งค่า SMTP production
6. หลังเชื่อม cloud แล้ว Auth endpoint ปฏิเสธ key แบบ `sb_secret_` กับ SDK รุ่นปัจจุบัน จึงใช้ legacy anon/service-role keys ใน `.env.local`; ไฟล์นี้ถูก ignore และไม่มี secret อยู่ใน source control
7. Cloud smoke test พบว่า `profiles.id -> auth.users.id` แบบ `on delete restrict` ทำให้ลบบัญชีที่ไม่มีประวัติไม่ได้ จึงเพิ่ม migration `005` เป็น `on delete cascade`; ทดสอบสร้างผู้ใช้, profile trigger, username resolver, login, profile, logout และลบบัญชีชั่วคราวผ่านทั้งหมด
8. Recovery link แบบ implicit ส่ง token ใน URL fragment ซึ่ง Route Handler ฝั่ง Server อ่านไม่ได้ จึงเปลี่ยน `/auth/callback` เป็น Client Page ที่รองรับ fragment, PKCE code และ token hash พร้อมล้าง credential ออกจาก address bar ก่อนตั้ง session

## สิ่งที่ต้องตัดสินใจก่อนทำต่อ

1. Supabase Project `KlangManagement` ถูกสร้างที่ Sydney และเชื่อมกับเครื่องแล้ว; ก่อน production ต้องตัดสินใจว่าจะคง region นี้หรือย้ายไป region ที่ต้องการ
2. ยืนยันว่าจะคง username เป็น ASCII letters/numbers/underscore ความยาว 3–32 ตัว และไม่อนุญาตเปลี่ยนหลังสมัครตาม implementation ปัจจุบัน หรือจะรองรับภาษาไทย/การเปลี่ยนชื่อ
3. ปัจจุบันเปิด email confirmation และตั้ง localhost callback allow-list แล้ว; ก่อน production ต้องกำหนด production site URL และ SMTP provider สำหรับอีเมลยืนยัน/รีเซ็ตรหัสผ่าน
4. ยืนยันค่าจำกัด login ปัจจุบัน 5 ครั้งต่อ 15 นาทีและ block 15 นาที หรือระบุค่าใหม่
5. ก่อนเฟสธุรกรรมภายหลัง ยังต้องสรุป approval threshold, void/reversal, เงื่อนไขปิด asset/warehouse, attachment retention และขอบเขต decimal ตาม [รายการเดิม](phase-1-2-handoff.md#สิ่งที่ต้องตัดสินใจก่อนทำต่อ)

## วิธีเปิด

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

จากนั้นเปิด `http://localhost:3000` และเข้า `/register` เพื่อเริ่ม flow จริงหลังตั้งค่า Supabase แล้ว
