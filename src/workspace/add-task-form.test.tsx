import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddTaskForm from './add-task-form.component';
import {
  useTask,
  saveTask,
  updateTask,
  useFetchProviders,
  useProviderRoles,
  useSystemTasks,
  type Task,
  type SystemTask,
} from './task-list.resource';
import { showSnackbar, useVisit, useConfig, useLayoutType } from '@openmrs/esm-framework';

// Mock ResizeObserver for Carbon components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollIntoView for Carbon ComboBox
Element.prototype.scrollIntoView = jest.fn();

jest.mock('./task-list.resource', () => ({
  useTask: jest.fn(),
  saveTask: jest.fn(),
  updateTask: jest.fn(),
  taskListSWRKey: jest.fn((patientUuid) => `tasks-${patientUuid}`),
  useFetchProviders: jest.fn(),
  useProviderRoles: jest.fn(),
  useSystemTasks: jest.fn(),
}));

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  showSnackbar: jest.fn(),
  useLayoutType: jest.fn(() => 'desktop'),
  restBaseUrl: '/ws/rest/v1',
  openmrsFetch: jest.fn(),
  useConfig: jest.fn(() => ({ allowAssigningProviderRole: false })),
  parseDate: jest.fn((date) => (date ? new Date(date) : undefined)),
  useVisit: jest.fn(() => ({ activeVisit: null, isLoading: false })),
  getCoreTranslation: jest.fn((key) => {
    const translations: Record<string, string> = {
      cancel: 'Cancel',
    };
    return translations[key] || key;
  }),
}));

jest.mock('swr', () => {
  const mockUseSWR = jest.fn(() => ({ data: null, isLoading: false, error: null }));
  return {
    __esModule: true,
    default: mockUseSWR,
    useSWRConfig: () => ({ mutate: jest.fn() }),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

const mockUseTask = useTask as jest.MockedFunction<typeof useTask>;
const mockSaveTask = saveTask as jest.MockedFunction<typeof saveTask>;
const mockUpdateTask = updateTask as jest.MockedFunction<typeof updateTask>;
const mockUseFetchProviders = useFetchProviders as jest.MockedFunction<typeof useFetchProviders>;
const mockUseProviderRoles = useProviderRoles as jest.MockedFunction<typeof useProviderRoles>;
const mockUseSystemTasks = useSystemTasks as jest.MockedFunction<typeof useSystemTasks>;
const mockShowSnackbar = showSnackbar as jest.MockedFunction<typeof showSnackbar>;

describe('AddTaskForm', () => {
  const patientUuid = 'patient-uuid-123';
  const mockOnBack = jest.fn();

  const baseTask: Task = {
    uuid: 'task-uuid-456',
    name: 'Existing Task',
    status: 'not-started',
    createdDate: new Date('2024-01-15T10:00:00Z'),
    completed: false,
    createdBy: 'Test User',
    rationale: 'Test rationale',
    priority: 'high',
    dueDate: {
      type: 'DATE',
      date: new Date('2024-01-20T10:00:00Z'),
    },
    assignee: {
      uuid: 'provider-uuid-789',
      display: 'Dr. Test Provider',
      type: 'person',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseTask.mockReturnValue({
      task: null,
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    mockUseFetchProviders.mockReturnValue({
      providers: [],
      setProviderQuery: jest.fn(),
      isLoading: false,
      error: null,
    });

    mockUseProviderRoles.mockReturnValue([]);

    mockUseSystemTasks.mockReturnValue({
      systemTasks: [],
      isLoading: false,
      error: null,
    });

    mockSaveTask.mockResolvedValue({} as any);
    mockUpdateTask.mockResolvedValue({} as any);
  });

  describe('Create mode (no editTaskUuid)', () => {
    it('should render the form with empty fields', () => {
      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} />);

      expect(screen.getByLabelText(/task name/i)).toHaveValue('');
      expect(screen.getByText(/add task/i)).toBeInTheDocument();
      expect(screen.getByText(/discard/i)).toBeInTheDocument();
    });

    it('should call saveTask when submitting in create mode', async () => {
      const user = userEvent.setup();

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} />);

      const taskNameInput = screen.getByLabelText(/task name/i);
      await user.type(taskNameInput, 'New Task');

      const addButton = screen.getByRole('button', { name: /add task/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockSaveTask).toHaveBeenCalledWith(
          patientUuid,
          expect.objectContaining({
            name: 'New Task',
          }),
        );
      });

      expect(mockUpdateTask).not.toHaveBeenCalled();
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Task added',
          kind: 'success',
        }),
      );
      expect(mockOnBack).toHaveBeenCalled();
    });

    it('should show error snackbar when saveTask fails', async () => {
      const user = userEvent.setup();
      mockSaveTask.mockRejectedValue(new Error('Network error'));

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} />);

      const taskNameInput = screen.getByLabelText(/task name/i);
      await user.type(taskNameInput, 'New Task');

      const addButton = screen.getByRole('button', { name: /add task/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockShowSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Task add failed',
            kind: 'error',
          }),
        );
      });

      expect(mockOnBack).not.toHaveBeenCalled();
    });
  });

  describe('Edit mode (with editTaskUuid)', () => {
    const editTaskUuid = 'task-uuid-456';

    beforeEach(() => {
      mockUseTask.mockReturnValue({
        task: baseTask,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });
    });

    it('should render the form with "Save task" and "Cancel" buttons', async () => {
      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} editTaskUuid={editTaskUuid} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save task/i })).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.queryByText(/add task/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/discard/i)).not.toBeInTheDocument();
    });

    it('should pre-populate form fields with existing task data', async () => {
      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} editTaskUuid={editTaskUuid} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/task name/i)).toHaveValue('Existing Task');
      });

      // Check rationale is populated
      const rationaleTextarea = screen.getByPlaceholderText(/add a note here/i);
      expect(rationaleTextarea).toHaveValue('Test rationale');

      // Check due date is populated (DATE type shows the date input)
      const dueDateInput = screen.getByDisplayValue('2024-01-20');
      expect(dueDateInput).toBeInTheDocument();

      // Check priority is shown in the combobox input
      const priorityInput = screen.getByRole('combobox', { name: /priority/i });
      expect(priorityInput).toHaveValue('high');

      // Check assignee is shown in the combobox input
      const assigneeInput = screen.getByRole('combobox', { name: /assign to provider/i });
      expect(assigneeInput).toHaveValue('Dr. Test Provider');
    });

    it('should call updateTask when submitting in edit mode', async () => {
      const user = userEvent.setup();

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} editTaskUuid={editTaskUuid} />);

      // Wait for form to be populated
      await waitFor(() => {
        expect(screen.getByLabelText(/task name/i)).toHaveValue('Existing Task');
      });

      // Modify the task name
      const taskNameInput = screen.getByLabelText(/task name/i);
      await user.clear(taskNameInput);
      await user.type(taskNameInput, 'Updated Task Name');

      const saveButton = screen.getByRole('button', { name: /save task/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(
          patientUuid,
          expect.objectContaining({
            uuid: editTaskUuid,
            name: 'Updated Task Name',
          }),
        );
      });

      expect(mockSaveTask).not.toHaveBeenCalled();
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Task updated',
          kind: 'success',
        }),
      );
      expect(mockOnBack).toHaveBeenCalled();
    });

    it('should show error snackbar when updateTask fails', async () => {
      const user = userEvent.setup();
      mockUpdateTask.mockRejectedValue(new Error('Network error'));

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} editTaskUuid={editTaskUuid} />);

      // Wait for form to be populated
      await waitFor(() => {
        expect(screen.getByLabelText(/task name/i)).toHaveValue('Existing Task');
      });

      const saveButton = screen.getByRole('button', { name: /save task/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Unable to update task',
            kind: 'error',
          }),
        );
      });

      expect(mockOnBack).not.toHaveBeenCalled();
    });

    it('should preserve existing task properties when updating', async () => {
      const user = userEvent.setup();

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} editTaskUuid={editTaskUuid} />);

      // Wait for form to be populated
      await waitFor(() => {
        expect(screen.getByLabelText(/task name/i)).toHaveValue('Existing Task');
      });

      const saveButton = screen.getByRole('button', { name: /save task/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(
          patientUuid,
          expect.objectContaining({
            uuid: baseTask.uuid,
            status: baseTask.status,
            createdDate: baseTask.createdDate,
            completed: baseTask.completed,
            createdBy: baseTask.createdBy,
            priority: baseTask.priority,
            assignee: expect.objectContaining({
              uuid: baseTask.assignee.uuid,
              type: 'person',
            }),
            dueDate: expect.objectContaining({
              type: 'DATE',
            }),
          }),
        );
      });
    });
  });

  describe('Create mode with system tasks', () => {
    const mockSystemTasks: SystemTask[] = [
      {
        uuid: 'system-task-1',
        name: 'med-rec',
        title: 'Medication Reconciliation',
        priority: 'high',
        rationale: 'Ensure medication safety',
      },
      {
        uuid: 'system-task-2',
        name: 'lab-followup',
        title: 'Lab Result Follow-up',
        priority: 'medium',
      },
    ];

    it('should show ComboBox with system tasks when system tasks are available', async () => {
      mockUseSystemTasks.mockReturnValue({
        systemTasks: mockSystemTasks,
        isLoading: false,
        error: null,
      });

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} />);

      // Should show a combobox instead of text input
      const combobox = screen.getByRole('combobox', { name: /task name/i });
      expect(combobox).toBeInTheDocument();
    });

    it('should apply system task defaults when selecting a system task', async () => {
      const user = userEvent.setup();

      mockUseSystemTasks.mockReturnValue({
        systemTasks: mockSystemTasks,
        isLoading: false,
        error: null,
      });

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} />);

      // Open the combobox and select a system task
      const combobox = screen.getByRole('combobox', { name: /task name/i });
      await user.click(combobox);

      // Select "Medication Reconciliation" from dropdown
      const option = await screen.findByText('Medication Reconciliation');
      await user.click(option);

      // Check that the system task title is now in the combobox
      expect(combobox).toHaveValue('Medication Reconciliation');

      // Check that priority was auto-filled from system task defaults
      const priorityInput = screen.getByRole('combobox', { name: /priority/i });
      expect(priorityInput).toHaveValue('high');

      // Check that rationale was auto-filled from system task defaults
      const rationaleTextarea = screen.getByPlaceholderText(/add a note here/i);
      expect(rationaleTextarea).toHaveValue('Ensure medication safety');
    });

    it('should submit task with system task title when system task is selected', async () => {
      const user = userEvent.setup();

      mockUseSystemTasks.mockReturnValue({
        systemTasks: mockSystemTasks,
        isLoading: false,
        error: null,
      });

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} />);

      // Open the combobox and select a system task
      const combobox = screen.getByRole('combobox', { name: /task name/i });
      await user.click(combobox);

      const option = await screen.findByText('Medication Reconciliation');
      await user.click(option);

      // Submit the form
      const addButton = screen.getByRole('button', { name: /add task/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockSaveTask).toHaveBeenCalledWith(
          patientUuid,
          expect.objectContaining({
            name: 'Medication Reconciliation',
            priority: 'high',
            rationale: 'Ensure medication safety',
          }),
        );
      });

      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Task added',
          kind: 'success',
        }),
      );
    });

    it('should show TextInput instead of ComboBox when no system tasks are available', async () => {
      mockUseSystemTasks.mockReturnValue({
        systemTasks: [],
        isLoading: false,
        error: null,
      });

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} />);

      // Should show a text input for task name (not a combobox)
      const textInput = screen.getByLabelText(/task name/i);
      expect(textInput).toBeInTheDocument();
      expect(textInput.tagName).toBe('INPUT');

      // The task name input should NOT have the combobox role
      expect(textInput).not.toHaveAttribute('role', 'combobox');
    });
  });

  describe('Edit mode with system tasks', () => {
    const editTaskUuid = 'task-uuid-456';

    const mockSystemTasks: SystemTask[] = [
      {
        uuid: 'system-task-1',
        name: 'med-rec',
        title: 'Medication Reconciliation',
        priority: 'high',
      },
      {
        uuid: 'system-task-2',
        name: 'lab-followup',
        title: 'Lab Result Follow-up',
        priority: 'medium',
      },
    ];

    it('should pre-populate task name when editing a custom task (not matching any system task)', async () => {
      const customTask: Task = {
        ...baseTask,
        name: 'My Custom Task',
      };

      mockUseTask.mockReturnValue({
        task: customTask,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      mockUseSystemTasks.mockReturnValue({
        systemTasks: mockSystemTasks,
        isLoading: false,
        error: null,
      });

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} editTaskUuid={editTaskUuid} />);

      await waitFor(() => {
        // The task name should be pre-populated with the custom task name
        const combobox = screen.getByRole('combobox', { name: /task name/i });
        expect(combobox).toHaveValue('My Custom Task');
      });

      // Should show the custom task notification since it doesn't match a system task
      expect(screen.getByText(/custom task/i)).toBeInTheDocument();
    });

    it('should pre-populate and disable task name when editing a system task', async () => {
      const systemTaskInstance: Task = {
        ...baseTask,
        name: 'Medication Reconciliation', // Matches a system task title
      };

      mockUseTask.mockReturnValue({
        task: systemTaskInstance,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      mockUseSystemTasks.mockReturnValue({
        systemTasks: mockSystemTasks,
        isLoading: false,
        error: null,
      });

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} editTaskUuid={editTaskUuid} />);

      await waitFor(() => {
        const combobox = screen.getByRole('combobox', { name: /task name/i });
        expect(combobox).toHaveValue('Medication Reconciliation');
        expect(combobox).toBeDisabled();
      });

      // Should show the system task info banner
      expect(screen.getByText(/task name cannot be changed/i)).toBeInTheDocument();
    });

    it('should allow updating other fields when editing a custom task', async () => {
      const user = userEvent.setup();
      const customTask: Task = {
        ...baseTask,
        name: 'My Custom Task',
        rationale: 'Original rationale',
      };

      mockUseTask.mockReturnValue({
        task: customTask,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      mockUseSystemTasks.mockReturnValue({
        systemTasks: mockSystemTasks,
        isLoading: false,
        error: null,
      });

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} editTaskUuid={editTaskUuid} />);

      await waitFor(() => {
        const combobox = screen.getByRole('combobox', { name: /task name/i });
        expect(combobox).toHaveValue('My Custom Task');
      });

      // Update the rationale
      const rationaleTextarea = screen.getByPlaceholderText(/add a note here/i);
      await user.clear(rationaleTextarea);
      await user.type(rationaleTextarea, 'Updated rationale');

      const saveButton = screen.getByRole('button', { name: /save task/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(
          patientUuid,
          expect.objectContaining({
            name: 'My Custom Task',
            rationale: 'Updated rationale',
          }),
        );
      });
    });
  });

  describe('Edit mode with different due date types', () => {
    it('should select DATE tab and show date picker when editing task with DATE due date', async () => {
      mockUseTask.mockReturnValue({
        task: baseTask, // baseTask has dueDate.type = 'DATE'
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} editTaskUuid="task-uuid-456" />);

      await waitFor(() => {
        expect(screen.getByLabelText(/task name/i)).toHaveValue('Existing Task');
      });

      // Verify DATE tab is selected
      const dateTab = screen.getByRole('tab', { name: /^date$/i });
      expect(dateTab).toHaveAttribute('aria-selected', 'true');

      // Verify other tabs are not selected
      const thisVisitTab = screen.getByRole('tab', { name: /this visit/i });
      const nextVisitTab = screen.getByRole('tab', { name: /next visit/i });
      expect(thisVisitTab).toHaveAttribute('aria-selected', 'false');
      expect(nextVisitTab).toHaveAttribute('aria-selected', 'false');

      // Verify date input is shown with correct value
      const dueDateInput = screen.getByDisplayValue('2024-01-20');
      expect(dueDateInput).toBeInTheDocument();
    });

    it('should select THIS_VISIT tab when editing task with THIS_VISIT due date', async () => {
      const taskWithThisVisit: Task = {
        ...baseTask,
        dueDate: {
          type: 'THIS_VISIT',
          referenceVisitUuid: 'visit-uuid-123',
        },
      };

      mockUseTask.mockReturnValue({
        task: taskWithThisVisit,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} editTaskUuid="task-uuid-456" />);

      await waitFor(() => {
        expect(screen.getByLabelText(/task name/i)).toHaveValue('Existing Task');
      });

      // Verify THIS_VISIT tab is selected
      const thisVisitTab = screen.getByRole('tab', { name: /this visit/i });
      expect(thisVisitTab).toHaveAttribute('aria-selected', 'true');

      // Verify other tabs are not selected
      const dateTab = screen.getByRole('tab', { name: /^date$/i });
      const nextVisitTab = screen.getByRole('tab', { name: /next visit/i });
      expect(dateTab).toHaveAttribute('aria-selected', 'false');
      expect(nextVisitTab).toHaveAttribute('aria-selected', 'false');

      // Verify date input is NOT shown (visit-based due dates don't show date picker)
      expect(screen.queryByDisplayValue('2024-01-20')).not.toBeInTheDocument();
    });

    it('should select NEXT_VISIT tab when editing task with NEXT_VISIT due date', async () => {
      const taskWithNextVisit: Task = {
        ...baseTask,
        dueDate: {
          type: 'NEXT_VISIT',
          referenceVisitUuid: 'visit-uuid-456',
        },
      };

      mockUseTask.mockReturnValue({
        task: taskWithNextVisit,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} editTaskUuid="task-uuid-456" />);

      await waitFor(() => {
        expect(screen.getByLabelText(/task name/i)).toHaveValue('Existing Task');
      });

      // Verify NEXT_VISIT tab is selected
      const nextVisitTab = screen.getByRole('tab', { name: /next visit/i });
      expect(nextVisitTab).toHaveAttribute('aria-selected', 'true');

      // Verify other tabs are not selected
      const dateTab = screen.getByRole('tab', { name: /^date$/i });
      const thisVisitTab = screen.getByRole('tab', { name: /this visit/i });
      expect(dateTab).toHaveAttribute('aria-selected', 'false');
      expect(thisVisitTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should send provider role assignee when updating task with role assignment', async () => {
      const user = userEvent.setup();
      const taskWithRoleAssignee: Task = {
        ...baseTask,
        assignee: {
          uuid: 'role-uuid-123',
          display: 'Nurse Role',
          type: 'role',
        },
      };

      mockUseTask.mockReturnValue({
        task: taskWithRoleAssignee,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      (useConfig as jest.Mock).mockReturnValue({ allowAssigningProviderRole: true });

      render(<AddTaskForm patientUuid={patientUuid} onBack={mockOnBack} editTaskUuid="task-uuid-456" />);

      await waitFor(() => {
        expect(screen.getByLabelText(/task name/i)).toHaveValue('Existing Task');
      });

      // Verify the role is displayed in the provider role combobox
      const roleInput = screen.getByRole('combobox', { name: /assign to provider role/i });
      expect(roleInput).toHaveValue('Nurse Role');

      const saveButton = screen.getByRole('button', { name: /save task/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(
          patientUuid,
          expect.objectContaining({
            assignee: expect.objectContaining({
              uuid: 'role-uuid-123',
              type: 'role',
            }),
          }),
        );
      });
    });
  });
});
