import { type APIRequestContext, type Page, test as base } from '@playwright/test';
import { api } from '../fixtures';
import { type Patient } from '../types';
import { generateRandomPatient, deletePatient } from '../commands';

// This file sets up our custom test harness using custom fixtures.
// See https://playwright.dev/docs/test-fixtures#creating-a-fixture for details.
// Specs that use a custom fixture must import `test` from this file instead
// of from @playwright/test directly.

export interface CustomTestFixtures {
  loginAsAdmin: Page;
  patient: Patient;
}

export interface CustomWorkerFixtures {
  api: APIRequestContext;
}

export const test = base.extend<CustomTestFixtures, CustomWorkerFixtures>({
  api: [api, { scope: 'worker' }],
  patient: [
    async ({ api }, use) => {
      const patient = await generateRandomPatient(api);
      await use(patient);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test', auto: true },
  ],
});
