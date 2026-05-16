import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("Authentication", () => {
  test("landing page renders with sign in button", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText("NeuroLearn")).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
    await expect(page.getByText("Study smarter")).toBeVisible();
  });

  test("redirects unauthenticated users from /dashboard to /login", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page shows Google and email options", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.getByText("Continue with Google")).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /magic link/i })).toBeVisible();
  });

  test("invalid email shows error on login page", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByPlaceholder(/email/i).fill("not-an-email");
    await page.getByRole("button", { name: /magic link/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });
});

test.describe("Public pages", () => {
  test("landing page has correct meta title", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/NeuroLearn/);
  });

  test("navigation links work", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole("link", { name: /get started/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});

// Authenticated tests — require a valid session token set via env
test.describe("Dashboard (authenticated)", () => {
  test.use({
    storageState: process.env.PLAYWRIGHT_AUTH_STATE ?? undefined,
  });

  test.skip(!process.env.PLAYWRIGHT_AUTH_STATE, "No auth state provided — skipping authenticated tests");

  test("dashboard loads with stats", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.getByText(/Welcome back/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Study Streak")).toBeVisible();
  });

  test("can navigate to subjects page", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.getByRole("link", { name: "Subjects" }).click();
    await expect(page).toHaveURL(/\/subjects/);
    await expect(page.getByText("Subjects")).toBeVisible();
  });

  test("can navigate to AI tutor", async ({ page }) => {
    await page.goto(`${BASE_URL}/tutor`);
    await expect(page.getByText("AI Tutor")).toBeVisible();
    await expect(page.getByPlaceholder(/Ask your tutor/i)).toBeVisible();
  });

  test("revision page shows due cards or empty state", async ({ page }) => {
    await page.goto(`${BASE_URL}/revision`);
    const hasCards = await page.getByText("Review Session").isVisible().catch(() => false);
    const isEmpty = await page.getByText("All caught up").isVisible().catch(() => false);
    expect(hasCards || isEmpty).toBe(true);
  });
});
