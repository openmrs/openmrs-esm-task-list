import { type APIRequestContext, type PlaywrightWorkerArgs, type WorkerFixture } from '@playwright/test';

/**
 * A fixture which initializes an {@link APIRequestContext} bound to the configured
 * OpenMRS API server, automatically authenticated using the configured admin account.
 *
 * Usage:
 * ```ts
 * test('your test', async ({ api }) => {
 *   const res = await api.get('patient/1234');
 *   expect(res.ok()).toBeTruthy();
 * });
 * ```
 */
export const api: WorkerFixture<APIRequestContext, PlaywrightWorkerArgs> = async ({ playwright }, use) => {
  const ctx = await playwright.request.newContext({
    baseURL: `${process.env.E2E_BASE_URL}/ws/rest/v1/`,
    httpCredentials: {
      username: process.env.E2E_USER_ADMIN_USERNAME,
      password: process.env.E2E_USER_ADMIN_PASSWORD,
    },
  });

  await use(ctx);
  await ctx.dispose();
};
