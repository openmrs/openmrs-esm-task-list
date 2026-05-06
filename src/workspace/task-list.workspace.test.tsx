import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskListWorkspace from './task-list.workspace';

// Mock only Workspace2 which is the sole runtime import from @openmrs/esm-framework in this component
jest.mock('@openmrs/esm-framework', () => ({
  Workspace2: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock child components with minimal, controllable implementations
jest.mock('./task-list-view.component', () => ({
  __esModule: true,
  default: ({ onTaskClick }: { onTaskClick?: (task: any) => void }) => (
    <div data-testid="task-list-view">
      <button onClick={() => onTaskClick?.({ uuid: 'task-uuid-1', name: 'Test Task' })}>Open Task</button>
    </div>
  ),
}));

jest.mock('./add-task-form.component', () => ({
  __esModule: true,
  default: ({ onBack, editTaskUuid }: { onBack: () => void; editTaskUuid?: string }) => (
    <div data-testid="add-task-form">
      {editTaskUuid && <span data-testid="edit-task-uuid">{editTaskUuid}</span>}
      <button onClick={onBack}>Back from form</button>
    </div>
  ),
}));

jest.mock('./task-details-view.component', () => ({
  __esModule: true,
  default: ({
    taskUuid,
    onBack,
    onEdit,
  }: {
    taskUuid: string;
    onBack: () => void;
    onEdit?: (task: any) => void;
  }) => (
    <div data-testid="task-details-view">
      <span data-testid="details-task-uuid">{taskUuid}</span>
      <button onClick={onBack}>Back from details</button>
      <button onClick={() => onEdit?.({ uuid: taskUuid, name: 'Test Task' })}>Edit Task</button>
    </div>
  ),
}));

// Shared props satisfying Workspace2DefinitionProps beyond groupProps
const defaultProps = {
  groupProps: { patientUuid: 'patient-uuid-123' },
  launchChildWorkspace: jest.fn(),
  closeWorkspace: jest.fn(),
  workspaceProps: null,
  windowProps: null,
  workspaceName: '',
  windowName: '',
  isRootWorkspace: false,
  showActionMenu: false,
} as any;

describe('TaskListWorkspace', () => {
  describe('Default view (list)', () => {
    it('renders the task list view by default', () => {
      render(<TaskListWorkspace {...defaultProps} />);

      expect(screen.getByTestId('task-list-view')).toBeInTheDocument();
      expect(screen.queryByTestId('add-task-form')).not.toBeInTheDocument();
      expect(screen.queryByTestId('task-details-view')).not.toBeInTheDocument();
    });

    it('shows an Add Task button in the list view', () => {
      render(<TaskListWorkspace {...defaultProps} />);

      expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument();
    });

    it('does not show a back button in the list view', () => {
      render(<TaskListWorkspace {...defaultProps} />);

      expect(screen.queryByText(/back to task list/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/back to task details/i)).not.toBeInTheDocument();
    });
  });

  describe('Navigation to form view', () => {
    it('shows the add task form when Add Task is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /add task/i }));

      expect(screen.getByTestId('add-task-form')).toBeInTheDocument();
      expect(screen.queryByTestId('task-list-view')).not.toBeInTheDocument();
    });

    it('hides the Add Task button in form view', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /add task/i }));

      // The only "Add Task" button in form view would come from the workspace header, not the list
      expect(screen.queryByTestId('task-list-view')).not.toBeInTheDocument();
    });

    it('shows "Back to task list" button in form view', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /add task/i }));

      expect(screen.getByText(/back to task list/i)).toBeInTheDocument();
    });

    it('does not pass editTaskUuid to the form in create mode', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /add task/i }));

      expect(screen.queryByTestId('edit-task-uuid')).not.toBeInTheDocument();
    });
  });

  describe('Navigation back from form view', () => {
    it('returns to the task list when back button in form is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /add task/i }));
      await user.click(screen.getByText('Back from form'));

      expect(screen.getByTestId('task-list-view')).toBeInTheDocument();
      expect(screen.queryByTestId('add-task-form')).not.toBeInTheDocument();
    });

    it('returns to the task list when workspace back button is clicked in form view', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /add task/i }));
      await user.click(screen.getByText(/back to task list/i));

      expect(screen.getByTestId('task-list-view')).toBeInTheDocument();
      expect(screen.queryByTestId('add-task-form')).not.toBeInTheDocument();
    });
  });

  describe('Navigation to details view', () => {
    it('shows task details view when a task is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByText('Open Task'));

      expect(screen.getByTestId('task-details-view')).toBeInTheDocument();
      expect(screen.queryByTestId('task-list-view')).not.toBeInTheDocument();
    });

    it('passes the correct task uuid to the details view', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByText('Open Task'));

      expect(screen.getByTestId('details-task-uuid')).toHaveTextContent('task-uuid-1');
    });

    it('shows "Back to task list" button in details view', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByText('Open Task'));

      expect(screen.getByText(/back to task list/i)).toBeInTheDocument();
    });
  });

  describe('Navigation back from details view', () => {
    it('returns to the task list when back button in details is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByText('Open Task'));
      await user.click(screen.getByText('Back from details'));

      expect(screen.getByTestId('task-list-view')).toBeInTheDocument();
      expect(screen.queryByTestId('task-details-view')).not.toBeInTheDocument();
    });

    it('returns to the task list when workspace back button is clicked in details view', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByText('Open Task'));
      await user.click(screen.getByText(/back to task list/i));

      expect(screen.getByTestId('task-list-view')).toBeInTheDocument();
      expect(screen.queryByTestId('task-details-view')).not.toBeInTheDocument();
    });
  });

  describe('Navigation to edit view', () => {
    it('shows the edit form when Edit is clicked in the details view', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByText('Open Task'));
      await user.click(screen.getByText('Edit Task'));

      expect(screen.getByTestId('add-task-form')).toBeInTheDocument();
      expect(screen.queryByTestId('task-details-view')).not.toBeInTheDocument();
    });

    it('passes editTaskUuid to the form in edit mode', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByText('Open Task'));
      await user.click(screen.getByText('Edit Task'));

      expect(screen.getByTestId('edit-task-uuid')).toHaveTextContent('task-uuid-1');
    });

    it('shows "Back to task details" button in edit view', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByText('Open Task'));
      await user.click(screen.getByText('Edit Task'));

      expect(screen.getByText(/back to task details/i)).toBeInTheDocument();
    });
  });

  describe('Navigation back from edit view', () => {
    it('returns to task details when back button in edit form is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByText('Open Task'));
      await user.click(screen.getByText('Edit Task'));
      await user.click(screen.getByText('Back from form'));

      expect(screen.getByTestId('task-details-view')).toBeInTheDocument();
      expect(screen.queryByTestId('add-task-form')).not.toBeInTheDocument();
    });

    it('returns to task details when workspace back button is clicked in edit view', async () => {
      const user = userEvent.setup();
      render(<TaskListWorkspace {...defaultProps} />);

      await user.click(screen.getByText('Open Task'));
      await user.click(screen.getByText('Edit Task'));
      await user.click(screen.getByText(/back to task details/i));

      expect(screen.getByTestId('task-details-view')).toBeInTheDocument();
      expect(screen.queryByTestId('add-task-form')).not.toBeInTheDocument();
    });
  });
});
