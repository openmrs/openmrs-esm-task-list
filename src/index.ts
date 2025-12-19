import { getAsyncLifecycle, defineConfigSchema } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';

const moduleName = '@openmrs/esm-task-list';

const options = {
  featureName: 'task-list',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const taskListLaunchButton = getAsyncLifecycle(
  () => import('./launch-button/task-list-launch-button.extension'),
  options,
);

export const taskListWorkspace = getAsyncLifecycle(() => import('./workspace/task-list.workspace'), options);

export const deleteTaskConfirmationModal = getAsyncLifecycle(() => import('./workspace/delete-task.modal'), options);
