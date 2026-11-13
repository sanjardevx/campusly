import { expect, test } from '@playwright/test';

// Every "Live demo" door opens its portal home: /login?demo=<key> signs in at once (no password)
const DOORS = [
  { key: 'student9a', home: '/student', name: 'Aziz', section: /things? due this week|Nothing left to hand in/ },
  { key: 'student11a', home: '/student', name: 'Madina', section: /things? due this week|Nothing left to hand in/ },
  { key: 'parent', home: '/parent', name: 'Farrukh', section: 'Quarter attendance' },
  { key: 'teacher', home: '/teacher', name: 'Nilufar', section: 'Needs grading' },
] as const;

for (const door of DOORS) {
  test(`demo ${door.key} opens ${door.home}`, async ({ page }) => {
    await page.goto(`/login?demo=${door.key}`);
    await expect(page).toHaveURL(new RegExp(`${door.home}$`));
    // The signed-in demo account and one block of its home page
    await expect(page.getByText(door.name).first()).toBeVisible();
    await expect(page.getByText(door.section).first()).toBeVisible();
    // The live-demo bar: this is the shared demo, reset every night
    await expect(page.getByText('Live demo', { exact: false }).first()).toBeVisible();
  });
}
