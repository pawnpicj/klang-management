# KLANG Management — ส่งมอบ Phase 4A

รอบนี้เริ่ม **Phase 4 — Multi-Clan** แบบทีละ checkpoint ผู้ใช้สร้างและเปิดพื้นที่ Clan/Gang รวมถึงเพิ่มสมาชิกที่ยังไม่มีบัญชีได้ โดยเลื่อน Invite/Join, Account Linking, Role Changes และ Custom Roles ออกไปก่อน

## สิ่งที่ทำ

- `/clans` แสดงเฉพาะ Clan/Gang ที่ผู้ใช้เป็นสมาชิกสถานะ ACTIVE
- `/clans/new` สร้าง Clan หรือ Gang พร้อมตรวจข้อมูลด้วย Zod
- Server Action ตรวจ session ใหม่และเรียก `create_clan()` ด้วย authenticated client
- `create_clan()` สร้างข้อมูลแบบ atomic: Clan, 6 system roles พร้อม permissions, ผู้สร้างในบทบาท Manager และ Main Warehouse
- `/c/[clanSlug]` ส่งต่อไป `/c/[clanSlug]/dashboard`
- Dashboard แสดง Clan/Gang ปัจจุบัน, ชื่อตัวละคร, บทบาท และ Main Warehouse
- App header เชื่อมหน้า Clan, Profile และ Logout
- Proxy ป้องกัน `/clans` และ `/c/*` และเก็บ path ปลายทางไว้สำหรับกลับมาหลัง login
- `/c/[clanSlug]/members` แสดง roster และให้ผู้มี `member.manage` เพิ่มสมาชิกจากชื่อตัวละคร
- สมาชิกที่ยังไม่มีบัญชีเก็บด้วย `clan_members.user_id = NULL` และได้รับ system role `Member`
- RPC `add_clan_member()` ตรวจ permission, ป้องกันชื่อซ้ำแบบไม่สนตัวพิมพ์ และสร้าง Audit Log ผ่าน trigger เดิม
- หน้า `/clans` เปิด, แก้ไข และลบแบบ Archive ได้
- หน้า settings แก้ชื่อและประเภท Clan/Gang ได้
- หน้า Members แก้ชื่อตัวละครและนำสมาชิกออกได้ โดยนำ Manager คนสุดท้ายออกไม่ได้

## Database schema และ migrations

`20260922000100_offline_clan_members.sql`:

- เปลี่ยน `clan_members.user_id` เป็น nullable เพื่อรองรับสมาชิกที่ไม่มีบัญชี
- เพิ่ม `add_clan_member(p_clan_id, p_character_name)`
- เปิด execute เฉพาะ `authenticated`; `anon` เรียกไม่ได้

`20260922000200_clan_manager_and_management.sql`:

- เพิ่ม system role `Manager` พร้อมสิทธิ์ทั้งหมด และย้ายสมาชิก system `Leader` เดิมเป็น Manager
- เปลี่ยน invariant จากต้องมี Leader เป็นต้องมี Active Manager อย่างน้อยหนึ่งคน
- ให้ผู้สร้าง Clan/Gang ใหม่เป็น Manager
- เพิ่ม RPC สำหรับแก้ไข/Archive Clan และแก้ชื่อ/นำสมาชิกออก

ตารางอื่นยังใช้ `clans`, `clan_roles`, `role_permissions` และ `warehouses` จาก Phase 1–2

## RLS ที่ใช้

- `clans_read`: อ่าน Clan ได้เมื่อ `is_clan_member(id)` เป็นจริง
- `members_read`: สมาชิกอ่าน membership ของตนเองได้ และผู้มี `member.view` อ่านสมาชิกใน Clan ได้
- `roles_read`: อ่านบทบาทได้เฉพาะสมาชิก Clan
- `warehouses_read`: อ่านคลังได้เมื่อมี `warehouse.view`
- `create_clan()` ตรวจ `auth.uid()` และ profile สถานะ ACTIVE ภายในฟังก์ชัน และเปิด execute ให้ `authenticated` เท่านั้น
- `add_clan_member()` เรียกได้เฉพาะผู้มี `member.manage` ใน Clan เป้าหมาย และเลือก Role `Member` ฝั่งฐานข้อมูล
- RPC แก้ไข/Archive Clan ตรวจ `clan.manage`; RPC แก้ไข/นำสมาชิกออกตรวจ `member.manage`

หน้า UI ไม่ใช้ service-role key และไม่รับ `user_id`, `role_id` หรือ `warehouse_id` จาก browser ตอนสร้าง Clan

## การทดสอบ

- Unit tests ตรวจชื่อ, slug, type และ character name
- Database integration tests ตรวจ atomic creation, default roles/permissions, Main Warehouse, Manager invariant และ tenant isolation
- Database integration tests ตรวจ offline member, duplicate name, cross-Clan denial, permission denial และ Audit Log
- Playwright ตรวจ redirect ของ `/clans` และ `/c/*` เมื่อไม่มี session
- รัน lint, typecheck, tests และ production build ก่อนส่งมอบ

## ขอบเขตถัดไปที่ต้องตัดสินใจ

1. จะผูก offline member เข้ากับบัญชีในอนาคตด้วยวิธีใด โดยต้องป้องกันการยึดชื่อตัวละครของผู้อื่น
2. การลบปัจจุบันเป็น soft delete: Clan ใช้ `ARCHIVED` และสมาชิกใช้ `REMOVED`
3. Clan Switcher ควรจำ Clan ล่าสุดใน cookie หรือเลือกจากรายการทุกครั้ง
4. Invite/Join ถูกเลื่อนไปก่อนตามการตัดสินใจปัจจุบัน
