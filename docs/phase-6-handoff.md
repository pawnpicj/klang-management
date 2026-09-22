# KLANG Management — ส่งมอบ Phase 6 Transactions

## สิ่งที่ทำ

- `/c/[clanSlug]/transactions` แสดงรายการและกรองตามประเภท สถานะ และช่วงวันที่
- ฟอร์ม Deposit, Withdraw และ Transfer รองรับหลาย Asset ต่อ Transaction
- Deposit เข้าสู่ Default Warehouse เท่านั้น
- Transaction Detail แสดงรายการ Asset, ต้นทาง/ปลายทาง, สมาชิก, สถานะ และหลักฐาน
- แนบ JPG, PNG, WebP หรือ PDF ได้ไม่เกิน 10 MiB ใน private Storage bucket
- ผู้มี `transaction.void` สามารถ Void รายการ POSTED ได้ โดยระบบสร้าง Reversal ที่เชื่อมโยงกัน

## Database และ Security

Migration `20260922000600_transaction_workflows.sql` เพิ่ม:

- `create_and_post_transaction(...)`: สร้าง header/items และ Post ใน transaction เดียว
- `void_transaction(...)`: ล็อก Clan, ตรวจ balance, สร้าง reversal audit record และเปลี่ยน lifecycle อย่าง privileged
- `can_manage_transaction_evidence(...)` และ Storage RLS สำหรับหลักฐาน
- `register_transaction_attachment(...)` ตรวจ path, MIME, size, tenant และ actor
- Bucket `transaction-evidence` เป็น private และจำกัดไฟล์ 10 MiB

ทุกคำสั่งใช้ `client_request_id` ป้องกัน submit ซ้ำ และยอดคงเหลือยังมาจาก `warehouse_asset_balances` เท่านั้น

## ขอบเขตถัดไป

Phase 7: Dashboard balances, recent transactions, contribution summary และ date-range reports
