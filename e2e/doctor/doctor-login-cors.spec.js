import { test, expect } from '@playwright/test';

const doctorEmail = process.env.E2E_DOCTOR_EMAIL;
const doctorPassword = process.env.E2E_DOCTOR_PASSWORD;

async function logIn(page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox').nth(0).fill(doctorEmail);
  await page.getByRole('textbox').nth(1).fill(doctorPassword);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/doctor(?:$|\?)/, { timeout: 15_000 });
}

test('doctor demo can log in from the configured local E2E origin', async ({ page }) => {
  test.skip(!doctorEmail || !doctorPassword, 'Set E2E_DOCTOR_EMAIL and E2E_DOCTOR_PASSWORD for this local smoke test.');

  await logIn(page);
});

test('assigned doctor can open the AI clinical context for appointment 1', async ({ page }) => {
  test.skip(!doctorEmail || !doctorPassword, 'Set E2E_DOCTOR_EMAIL and E2E_DOCTOR_PASSWORD for this local smoke test.');

  await logIn(page);
  await page.goto('/doctor/appointments/1', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Clinical Results' }).click();

  await expect(page.getByLabel('Clinical context')).toBeVisible({ timeout: 15_000 });
});
