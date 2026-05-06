import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page object representing the patient chart and the embedded Task List workspace.
 *
 * The task list is a workspace opened from the patient chart's action menu.
 * Navigate with `goTo(patientUuid)`, then open the workspace with `openTaskListWorkspace()`.
 */
export class PatientChartPage {
  readonly page: Page;

  // The workspace panel that slides in from the right
  readonly workspaceContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.workspaceContainer = page.getByRole('complementary', { name: /workspace/i });
  }

  async goTo(patientUuid: string) {
    await this.page.goto(`patient/${patientUuid}/chart`);
    await this.page.waitForLoadState('load');
  }

  /** Click the "Task list" button in the action menu to open the workspace. */
  async openTaskListWorkspace() {
    // Extensions are loaded asynchronously; wait for the button to be in the DOM before clicking
    const taskListBtn = this.page.getByRole('button', { name: /task list/i });
    await taskListBtn.waitFor({ state: 'visible' });
    await taskListBtn.click();
    await expect(this.page.getByRole('button', { name: /add task/i })).toBeVisible();
  }

  /** Click "Add Task" inside the workspace. */
  async clickAddTask() {
    await this.page.getByRole('button', { name: /add task/i }).click();
  }

  /**
   * Fill and submit the Add Task form.
   * Only `name` is required; all other fields are optional.
   *
   * The task name field renders as a ComboBox (when system tasks are configured) or a
   * plain TextInput. We use `pressSequentially` to trigger the ComboBox's onInputChange
   * handler reliably in both cases.
   */
  async fillAddTaskForm({
    name,
    rationale,
    priority,
  }: {
    name: string;
    rationale?: string;
    priority?: 'High' | 'Medium' | 'Low';
  }) {
    const taskNameInput = this.page.getByLabel(/task name/i);
    await taskNameInput.click();
    await taskNameInput.pressSequentially(name);

    if (priority) {
      await this.page.getByRole('combobox', { name: /priority/i }).click();
      await this.page.getByRole('option', { name: priority }).click();
    }

    if (rationale) {
      await this.page.getByPlaceholder(/add a note here/i).fill(rationale);
    }

    // When the form is open (view==='form'), the workspace "Add Task" launcher is not rendered,
    // so this selector uniquely targets the form submit button.
    await this.page.getByRole('button', { name: /add task/i }).click();
  }

  /** Toggle the completion checkbox for the task with the given name. */
  async toggleTaskCompletion(taskName: string) {
    const taskRow = this.page.getByText(taskName).first().locator('../../..');
    await taskRow.getByRole('checkbox').click();
  }

  /** Click on a task tile to open the details view. */
  async openTaskDetails(taskName: string) {
    // The task name is inside a <span> within the clickable tile button; click the containing button
    await this.page.getByText(taskName, { exact: true }).first().click();
  }

  /** Click the Delete button in the task details view. */
  async clickDeleteTask() {
    await this.page.getByRole('button', { name: /delete/i }).click();
  }

  /** Confirm deletion in the confirmation modal. */
  async confirmDeleteTask() {
    await this.page.getByRole('dialog').getByRole('button', { name: /^delete$/i }).click();
  }
}
