# KLANG Management — ส่งมอบ Custom Roles และ Phase 5

## สิ่งที่ทำ

- `/c/[clanSlug]/roles` แสดง System/Custom Roles, permissions และให้ผู้มี `member.manage` สร้าง แก้ไข หรือลบ Custom Role
- System Role แก้ไขไม่ได้ และ Custom Role ที่มีสมาชิกหรือ Invite อ้างอยู่ลบไม่ได้
- `/c/[clanSlug]/assets` สร้าง Asset พร้อม Code, Type, Unit, Decimal Places, Allow Negative และแก้ชื่อ/รูปภาพหรือปิดใช้งาน
- `/c/[clanSlug]/warehouses` สร้างและแก้ Warehouse, เปลี่ยน Default และปิดใช้งานแบบ soft state
- `/c/[clanSlug]/warehouses/[warehouseId]` แสดงยอดคงเหลือแยก Asset จาก `warehouse_asset_balances`
- Dashboard เชื่อมไป Roles, Assets และ Warehouses

## Migrations

- `20260922000400_custom_role_management.sql`: atomic RPCs สำหรับ Create/Update/Delete Custom Role และ Permission mappings
- `20260922000500_asset_warehouse_management.sql`: RPCs สำหรับ Asset/Warehouse lifecycle และ atomic default switch

## Business rules

- ทุก RPC ตรวจ permission และ Active Clan ภายในฐานข้อมูล
- Role, Asset และ Warehouse ต้องอยู่ใน Clan เดียวกับคำสั่ง
- Default Warehouse ต้อง Active และมีหนึ่งแห่งเสมอ
- ปิด Default Warehouse ไม่ได้
- ปิด Asset หรือ Warehouse ที่มียอดคงเหลือไม่ได้
- ข้อมูลที่มีประวัติไม่ถูก hard delete; Asset/Warehouse ใช้ `is_active=false`
- ยอดคงเหลือยังคำนวณจาก POSTED transactions เท่านั้น

## ขอบเขตถัดไป

Phase 6: Deposit, Withdraw, Transfer, Transaction detail/filter, evidence และ Void/Reversal UI บน ledger functions ที่มีอยู่
