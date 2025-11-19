import { expect } from '@playwright/test';
import { test } from '../core/test';

test.describe('Task List', () => {
  test('should open task list from patient chart', async ({ page, api }) => {
    // Get a patient - try to fetch the first patient from the API
    // This is a stub test - in a real scenario, you might create a test patient
    const patientResponse = await api.get('patient?limit=1');
    const patientData = await patientResponse.json();

    // Use the provided example patient UUID if no patients exist, or use the first one
    const patientUuid = patientData.results?.[0]?.uuid || 'bc938aa9-8e83-4683-843d-ab11b9b11973';

    // Navigate to the patient chart
    await page.goto(`patient/${patientUuid}/chart/Patient Summary`);

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Find and click the "Tasks" button using aria-label
    // The button is an icon-only button with aria-label="Tasks"
    const tasksButton = page.locator('button[aria-label="Tasks"]');
    await expect(tasksButton).toBeVisible();
    await tasksButton.click();

    // Wait for the task list workspace to open
    await page.waitForLoadState('networkidle');

    // Verify that the task list workspace is visible
    // This is a stub test - adjust selectors based on actual implementation
    const workspace = page.locator('[data-workspace="task-list"]').or(page.locator('text=Task List'));
    await expect(workspace.first()).toBeVisible({ timeout: 10000 });
  });
});
