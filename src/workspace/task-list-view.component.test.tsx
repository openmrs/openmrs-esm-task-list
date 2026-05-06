import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskListView from './task-list-view.component';
import { useTaskList, setTaskStatusCompleted, getPriorityLabel, type Task } from './task-list.resource';
import { showSnackbar, useLayoutType } from '@openmrs/esm-framework';

jest.mock('./task-list.resource', () => ({
  useTaskList: jest.fn(),
  setTaskStatusCompleted: jest.fn(),
  getPriorityLabel: jest.fn((priority) => priority),
}));

jest.mock('../loader/loader.component', () => ({
  __esModule: true,
  default: () => <div>Loading...</div>,
}));

const mockUseTaskList = jest.mocked(useTaskList);
const mockSetTaskStatusCompleted = jest.mocked(setTaskStatusCompleted);
const mockShowSnackbar = jest.mocked(showSnackbar);
const mockUseLayoutType = jest.mocked(useLayoutType);

describe('TaskListView', () => {
  const patientUuid = 'patient-uuid-123';
  const mockOnTaskClick = jest.fn();
  const mockMutate = jest.fn();

  const baseTask: Task = {
    uuid: 'task-uuid-1',
    name: 'Test Task',
    status: 'not-started',
    createdDate: new Date('2024-01-15T10:00:00Z'),
    completed: false,
  };

  beforeEach(() => {
    mockUseLayoutType.mockReturnValue('small-desktop');
    mockMutate.mockResolvedValue(undefined);
    mockSetTaskStatusCompleted.mockResolvedValue({} as any);
  });

  describe('Loading state', () => {
    it('shows loader while tasks are loading', () => {
      mockUseTaskList.mockReturnValue({ tasks: [], isLoading: true, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('shows error message when task list fails to load', () => {
      mockUseTaskList.mockReturnValue({ tasks: [], isLoading: false, error: new Error('Failed'), mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      expect(screen.getByText(/problem loading the task list/i)).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('shows empty state message when there are no tasks', () => {
      mockUseTaskList.mockReturnValue({ tasks: [], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      expect(screen.getByText(/no tasks to display/i)).toBeInTheDocument();
    });
  });

  describe('Task list rendering', () => {
    it('renders all tasks in the list', () => {
      const tasks: Task[] = [
        { ...baseTask, uuid: 'task-1', name: 'First Task' },
        { ...baseTask, uuid: 'task-2', name: 'Second Task' },
      ];
      mockUseTaskList.mockReturnValue({ tasks, isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      expect(screen.getByText('First Task')).toBeInTheDocument();
      expect(screen.getByText('Second Task')).toBeInTheDocument();
    });

    it('shows assignee display name when task has an assignee', () => {
      const task: Task = {
        ...baseTask,
        assignee: { uuid: 'prov-1', display: 'Nurse Johnson', type: 'person' },
      };
      mockUseTaskList.mockReturnValue({ tasks: [task], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      expect(screen.getByText('Nurse Johnson')).toBeInTheDocument();
    });

    it('shows assignee uuid as fallback when display is missing', () => {
      const task: Task = {
        ...baseTask,
        assignee: { uuid: 'prov-uuid-only', display: undefined, type: 'person' },
      };
      mockUseTaskList.mockReturnValue({ tasks: [task], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      expect(screen.getByText('prov-uuid-only')).toBeInTheDocument();
    });

    it('shows "No assignment" when task has no assignee', () => {
      mockUseTaskList.mockReturnValue({ tasks: [baseTask], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      expect(screen.getByText(/no assignment/i)).toBeInTheDocument();
    });

    it('shows priority tag for tasks with a priority', () => {
      const task: Task = { ...baseTask, priority: 'high' };
      mockUseTaskList.mockReturnValue({ tasks: [task], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      expect(screen.getByText('high')).toBeInTheDocument();
    });

    it('does not show priority tag for tasks without a priority', () => {
      mockUseTaskList.mockReturnValue({ tasks: [baseTask], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      expect(screen.queryByText('high')).not.toBeInTheDocument();
      expect(screen.queryByText('medium')).not.toBeInTheDocument();
      expect(screen.queryByText('low')).not.toBeInTheDocument();
    });

    it('shows rationale preview when task has rationale', () => {
      const task: Task = { ...baseTask, rationale: 'Patient needs follow-up care' };
      mockUseTaskList.mockReturnValue({ tasks: [task], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      expect(screen.getByText('Patient needs follow-up care')).toBeInTheDocument();
    });

    it('calls onTaskClick with the task when the task tile button is clicked', async () => {
      const user = userEvent.setup();
      const task: Task = { ...baseTask, name: 'Clickable Task' };
      mockUseTaskList.mockReturnValue({ tasks: [task], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} onTaskClick={mockOnTaskClick} />);

      await user.click(screen.getByText('Clickable Task'));

      expect(mockOnTaskClick).toHaveBeenCalledWith(task);
    });
  });

  describe('Overdue detection', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-02-01T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows "Overdue" tag for past-due incomplete tasks', () => {
      const task: Task = {
        ...baseTask,
        completed: false,
        dueDate: { type: 'DATE', date: new Date('2024-01-20T00:00:00Z') },
      };
      mockUseTaskList.mockReturnValue({ tasks: [task], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      expect(screen.getByText(/overdue/i)).toBeInTheDocument();
    });

    it('does not show "Overdue" for completed tasks even when past due date', () => {
      const task: Task = {
        ...baseTask,
        completed: true,
        dueDate: { type: 'DATE', date: new Date('2024-01-20T00:00:00Z') },
      };
      mockUseTaskList.mockReturnValue({ tasks: [task], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
    });

    it('does not show "Overdue" for tasks with no due date', () => {
      mockUseTaskList.mockReturnValue({ tasks: [baseTask], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
    });

    it('does not show "Overdue" for tasks due today', () => {
      const task: Task = {
        ...baseTask,
        completed: false,
        dueDate: { type: 'DATE', date: new Date('2024-02-01T00:00:00Z') },
      };
      mockUseTaskList.mockReturnValue({ tasks: [task], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
    });
  });

  describe('Task completion toggle', () => {
    it('calls setTaskStatusCompleted when checkbox is toggled', async () => {
      const user = userEvent.setup();
      const task: Task = { ...baseTask };
      mockUseTaskList.mockReturnValue({ tasks: [task], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      await user.click(screen.getByRole('checkbox'));

      await waitFor(() => {
        expect(mockSetTaskStatusCompleted).toHaveBeenCalledWith(patientUuid, task, true);
      });
    });

    it('calls mutate to refresh task list after successful toggle', async () => {
      const user = userEvent.setup();
      const task: Task = { ...baseTask };
      mockUseTaskList.mockReturnValue({ tasks: [task], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      await user.click(screen.getByRole('checkbox'));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });

    it('shows error snackbar when toggle fails', async () => {
      const user = userEvent.setup();
      mockSetTaskStatusCompleted.mockRejectedValue(new Error('Network error'));
      const task: Task = { ...baseTask };
      mockUseTaskList.mockReturnValue({ tasks: [task], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      await user.click(screen.getByRole('checkbox'));

      await waitFor(() => {
        expect(mockShowSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({ kind: 'error' }),
        );
      });
    });

    it('unchecks a completed task when toggled', async () => {
      const user = userEvent.setup();
      const task: Task = { ...baseTask, completed: true };
      mockUseTaskList.mockReturnValue({ tasks: [task], isLoading: false, error: null, mutate: mockMutate });

      render(<TaskListView patientUuid={patientUuid} />);

      await user.click(screen.getByRole('checkbox'));

      await waitFor(() => {
        expect(mockSetTaskStatusCompleted).toHaveBeenCalledWith(patientUuid, task, false);
      });
    });
  });
});
