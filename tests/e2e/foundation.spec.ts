import { expect, test } from "@playwright/test";
test("foundation renders without credentials", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "KLANG Management" }),
  ).toBeVisible();
  await expect(page.getByText("ระบบจัดการคลัง Clan & Gang")).toBeVisible();
  await expect(page.getByRole("link", { name: "เข้าสู่ระบบ" })).toBeVisible();
  await expect(page.getByRole("link", { name: "สมัครสมาชิก" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("auth pages are responsive and validate before contacting Supabase", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "เข้าสู่ระบบ" }),
  ).toBeVisible();
  await page.getByLabel("ชื่อผู้ใช้").fill("!!!");
  await page.getByLabel("รหัสผ่าน").fill("password123");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(
    page.getByText("กรุณาตรวจสอบข้อมูลที่กรอก", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("ใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข และขีดล่าง"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("protected profile redirects to login without a session", async ({
  page,
}) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login(?:\?next=%2Fprofile)?$/);
  await expect(
    page.getByRole("heading", { name: "เข้าสู่ระบบ" }),
  ).toBeVisible();
});

test("protected Clan pages redirect to login without a session", async ({
  page,
}) => {
  await page.goto("/clans");
  await expect(page).toHaveURL(/\/login\?next=%2Fclans$/);

  await page.goto("/c/private-clan/dashboard");
  await expect(page).toHaveURL(
    /\/login\?next=%2Fc%2Fprivate-clan%2Fdashboard$/,
  );

  await page.goto("/c/private-clan/members");
  await expect(page).toHaveURL(/\/login\?next=%2Fc%2Fprivate-clan%2Fmembers$/);

  await page.goto("/c/private-clan/settings");
  await expect(page).toHaveURL(/\/login\?next=%2Fc%2Fprivate-clan%2Fsettings$/);
});
test("not found has recovery link", async ({ page }) => {
  expect((await page.goto("/does-not-exist"))?.status()).toBe(404);
  await page.getByRole("link", { name: "กลับหน้าหลัก" }).click();
  await expect(
    page.getByRole("heading", { name: "KLANG Management" }),
  ).toBeVisible();
});
