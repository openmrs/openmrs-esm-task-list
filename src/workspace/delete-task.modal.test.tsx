import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteTaskModal from './delete-task.modal';
import { deleteTask, taskListSWRKey, type Task } from './task-list.resource';
import { showSnackbar } from '@openmrs/esm-framework';

jest.mock('./task-list.resource', () => ({
  deleteTask: jest.fn(),
  taskListSWRKey: jest.fn((patientUuid: string) => `tasks-${patientUuid}`),
}));

const mockSWRMutate = jest.fn();
jest.mock('swr', () => ({
  useSWRConfig: () => ({ mutate: mockSWRMutate }),
}));

const mockDeleteTask = jest.mocked(deleteTask);
const mockShowSnackbar = jest.mocked(showSnackbar);

describe('DeleteTaskModal', () => {
  const mockCloseModal = jest.fn();
  const mockOnDeleted = jest.fn();
  const patientUuid = 'patient-uuid-123';

  const task: Task = {
    uuid: 'task-uuid-456',
    name: 'Test Task',
    status: 'not-started',
    createdDate: new Date('2024-01-15T10:00:00Z'),
    completed: false,
  };

  beforeEach(() => {
    mockDeleteTask.mockResolvedValue({} as any);
    mockSWRMutate.mockResolvedValue(undefined);
  });

  it('renders the confirmation dialog with a Delete button', () => {
    render(<DeleteTaskModal closeModal={mockCloseModal} task={task} patientUuid={patientUuid} />);

    expect(screen.getByText(/delete task/i)).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to delete this task/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('renders a Cancel button', () => {
    render(<DeleteTaskModal closeModal={mockCloseModal} task={task} patientUuid={patientUuid} />);

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls closeModal when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<DeleteTaskModal closeModal={mockCloseModal} task={task} patientUuid={patientUuid} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockCloseModal).toHaveBeenCalledTimes(1);
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it('calls deleteTask with the correct arguments when Delete is clicked', async () => {
    const user = userEvent.setup();
    render(<DeleteTaskModal closeModal={mockCloseModal} task={task} patientUuid={patientUuid} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockDeleteTask).toHaveBeenCalledWith(patientUuid, task);
    });
  });

  it('closes the modal and shows success snackbar after successful deletion', async () => {
    const user = userEvent.setup();
    render(<DeleteTaskModal closeModal={mockCloseModal} task={task} patientUuid={patientUuid} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockCloseModal).toHaveBeenCalled();
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'success',
          title: expect.stringMatching(/task deleted/i),
        }),
      );
    });
  });

  it('calls onDeleted callback after successful deletion', async () => {
    const user = userEvent.setup();
    render(
      <DeleteTaskModal closeModal={mockCloseModal} task={task} patientUuid={patientUuid} onDeleted={mockOnDeleted} />,
    );

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockOnDeleted).toHaveBeenCalled();
    });
  });

  it('mutates the SWR cache after successful deletion', async () => {
    const user = userEvent.setup();
    render(<DeleteTaskModal closeModal={mockCloseModal} task={task} patientUuid={patientUuid} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockSWRMutate).toHaveBeenCalledWith(`tasks-${patientUuid}`);
    });
  });

  it('shows error snackbar and does not close modal when deletion fails', async () => {
    const user = userEvent.setup();
    mockDeleteTask.mockRejectedValue(new Error('Network failure'));
    render(<DeleteTaskModal closeModal={mockCloseModal} task={task} patientUuid={patientUuid} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'error' }),
      );
    });
    expect(mockCloseModal).not.toHaveBeenCalled();
  });

  it('does not call onDeleted when deletion fails', async () => {
    const user = userEvent.setup();
    mockDeleteTask.mockRejectedValue(new Error('Network failure'));
    render(
      <DeleteTaskModal closeModal={mockCloseModal} task={task} patientUuid={patientUuid} onDeleted={mockOnDeleted} />,
    );

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalled();
    });
    expect(mockOnDeleted).not.toHaveBeenCalled();
  });

  it('shows loading state while deletion is in progress', async () => {
    const user = userEvent.setup();
    // Return a promise that never resolves to keep the loading state visible
    mockDeleteTask.mockReturnValue(new Promise(() => {}));
    render(<DeleteTaskModal closeModal={mockCloseModal} task={task} patientUuid={patientUuid} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByText(/deleting/i)).toBeInTheDocument();
    });
  });

  it('disables the Delete button while deletion is in progress', async () => {
    const user = userEvent.setup();
    mockDeleteTask.mockReturnValue(new Promise(() => {}));
    render(<DeleteTaskModal closeModal={mockCloseModal} task={task} patientUuid={patientUuid} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(deleteButton).toBeDisabled();
    });
  });
});
