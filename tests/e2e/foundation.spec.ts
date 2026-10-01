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

  for (const route of [
    "roles",
    "assets",
    "warehouses",
    "transactions",
    "craft-item",
  ]) {
    await page.goto(`/c/private-clan/${route}`);
    await expect(page).toHaveURL(
      new RegExp(`/login\\?next=%2Fc%2Fprivate-clan%2F${route}$`),
    );
  }
});
test("not found has recovery link", async ({ page }) => {
  expect((await page.goto("/does-not-exist"))?.status()).toBe(404);
  await page.getByRole("link", { name: "กลับหน้าหลัก" }).click();
  await expect(
    page.getByRole("heading", { name: "KLANG Management" }),
  ).toBeVisible();
});

test("Light and Dark themes persist across pages and reloads", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#theme_dark_button").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#theme_dark_button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    await page
      .locator("body")
      .evaluate((body) => getComputedStyle(body).backgroundColor),
  ).toBe("rgb(11, 18, 32)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("#theme_light_button").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page
      .locator("body")
      .evaluate((body) => getComputedStyle(body).backgroundColor),
  ).toBe("rgb(248, 250, 252)");
});

test("public pages expose semantic unique IDs for headings and form controls", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/does-not-exist",
  ]) {
    await page.goto(route);
    expect(
      await page
        .locator(
          'h1:not([id]),input:not([id]):not([name^="$ACTION"]),select:not([id]),textarea:not([id]),form:not([id]),p:not([id])',
        )
        .count(),
    ).toBe(0);
    const duplicates = await page.locator("[id]").evaluateAll((elements) => {
      const ids = elements.map((element) => element.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    expect(duplicates).toEqual([]);
  }
});
