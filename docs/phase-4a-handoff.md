# KLANG Management — ส่งมอบ Phase 4A

รอบนี้เริ่ม **Phase 4 — Multi-Clan** เฉพาะ checkpoint แรก เพื่อให้ผู้ใช้สร้างและเปิดพื้นที่ Clan/Gang ได้ โดยยังไม่ทำ Invite/Join, Member Management หรือ Custom Roles

## สิ่งที่ทำ

- `/clans` แสดงเฉพาะ Clan/Gang ที่ผู้ใช้เป็นสมาชิกสถานะ ACTIVE
- `/clans/new` สร้าง Clan หรือ Gang พร้อมตรวจข้อมูลด้วย Zod
- Server Action ตรวจ session ใหม่และเรียก `create_clan()` ด้วย authenticated client
- `create_clan()` สร้างข้อมูลแบบ atomic: Clan, 5 system roles พร้อม permissions, ผู้สร้างในบทบาท Leader และ Main Warehouse
- `/c/[clanSlug]` ส่งต่อไป `/c/[clanSlug]/dashboard`
- Dashboard แสดง Clan/Gang ปัจจุบัน, ชื่อตัวละคร, บทบาท และ Main Warehouse
- App header เชื่อมหน้า Clan, Profile และ Logout
- Proxy ป้องกัน `/clans` และ `/c/*` และเก็บ path ปลายทางไว้สำหรับกลับมาหลัง login

## Database schema และ migrations

ไม่มี schema หรือ migration ใหม่ใน checkpoint นี้ เพราะใช้ตาราง `clans`, `clan_roles`, `role_permissions`, `clan_members`, `warehouses` และ RPC `create_clan()` จาก migrations Phase 1–2 โดยตรง

## RLS ที่ใช้

- `clans_read`: อ่าน Clan ได้เมื่อ `is_clan_member(id)` เป็นจริง
- `members_read`: สมาชิกอ่าน membership ของตนเองได้ และผู้มี `member.view` อ่านสมาชิกใน Clan ได้
- `roles_read`: อ่านบทบาทได้เฉพาะสมาชิก Clan
- `warehouses_read`: อ่านคลังได้เมื่อมี `warehouse.view`
- `create_clan()` ตรวจ `auth.uid()` และ profile สถานะ ACTIVE ภายในฟังก์ชัน และเปิด execute ให้ `authenticated` เท่านั้น

หน้า UI ไม่ใช้ service-role key และไม่รับ `user_id`, `role_id` หรือ `warehouse_id` จาก browser ตอนสร้าง Clan

## การทดสอบ

- Unit tests ตรวจชื่อ, slug, type และ character name
- Database integration tests เดิมตรวจ atomic creation, default roles/permissions, Main Warehouse, Leader invariant และ tenant isolation
- Playwright ตรวจ redirect ของ `/clans` และ `/c/*` เมื่อไม่มี session
- รัน lint, typecheck, tests และ production build ก่อนส่งมอบ

## ขอบเขตถัดไปที่ต้องตัดสินใจ

1. Invite code จะมีอายุเท่าไร, จำกัดจำนวนครั้งหรือไม่ และ Leader คนอื่นยกเลิก invite ได้หรือไม่
2. ผู้เข้าร่วมกรอก character name ตอนรับ invite หรือผู้เชิญกำหนดให้
3. Clan Switcher ควรจำ Clan ล่าสุดใน cookie หรือเลือกจากรายการทุกครั้ง
4. จะเริ่ม Phase 4B ด้วย Invite/Join ก่อน หรือ Member/Custom Role management ก่อน
